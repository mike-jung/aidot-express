/**
 * controlServer.js — supervisor 프로세스 안에서 동작하는 별도 Express 앱.
 *
 *  목적: 메인 서버 프로세스(포트 7901 등)를 감시/제어.
 *        - 메인이 죽어도 supervisor (이 프로세스) 는 살아 있어야 하므로,
 *          메인에 의존하는 코드는 import 하지 않는다.
 *        - 단, JWT 비밀키와 토큰 검증 로직은 메인과 동일한 것을 사용해야
 *          기존 로그인 세션을 그대로 control API 에 쓸 수 있다.
 *
 *  엔드포인트:
 *   GET  /api/control/status                   서버 상태 (running, pid, startedAt, uptime, lastExit, watchdog, restartCount)
 *   POST /api/control/start                    메인 프로세스 시작 (이미 실행중이면 409)
 *   POST /api/control/stop                     메인 프로세스 중지 (SIGTERM → timeout → SIGKILL)
 *   POST /api/control/restart                  중지 후 시작
 *   GET  /api/control/health                   control 서버 자체 헬스체크 (인증 불필요)
 */
import express from './core/httpApp.js';
import { requireHttps } from './core/requireHttps.js';
import { originPolicy } from './core/originPolicy.js';
import { assertCurrentAccount } from './core/accountState.js';
import { verifyAccessToken } from './core/tokens.js';
import db from './database/db.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './util/logger.js';
import config, { activeTransport } from './config/index.js';
import transport from './core/transport.cjs';

let controlDbReady = null;
const AUTH_HEADER_RE = /^Bearer\s+(.+)$/i;

/** JWT 검증 미들웨어 — admin 역할만 허용 */
async function authMiddleware(req, res, next) {
  const h = req.headers.authorization || '';
  const m = AUTH_HEADER_RE.exec(h);
  if (!m) return res.status(401).json({ code: 401, message: 'Authorization header required' });
  try {
    const payload = verifyAccessToken(m[1]);
    // 관리자 콘솔 계정(realm='admin') 의 admin 역할만 — 일반 사용자 토큰(realm='user') 은 role 이 admin 이어도 거부
    if (payload.role !== 'admin' || (payload.realm && payload.realm !== 'admin')) {
      return res.status(403).json({ code: 403, message: 'Admin console account with admin role required' });
    }
    if (!payload.realm) {
      // v1.2.0 이전 토큰(realm 없음) 은 user 로 간주 → 재로그인 필요
      return res.status(401).json({ code: 401, message: 'Token issued by older version. Please sign in again.' });
    }
    if (db.getDbStatus().available !== true) {
      controlDbReady ||= db.initDb().catch((error) => { controlDbReady = null; throw error; });
      await controlDbReady;
    }
    await assertCurrentAccount(payload, { method: req.method, path: req.path });
    req.user = { id: Number(payload.sub), role: payload.role, username: payload.username };
    return next();
  } catch (e) {
    const status = [401, 403, 503].includes(e.status) ? e.status : 401;
    return res.status(status).json({
      code: status,
      message: e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
    });
  }
}

/** control 서버 Express 앱 생성. supervisor 의 상태/조작 함수를 주입받음. */
export function createControlApp(sup) {
  const app = express();
  app.set('bodyLimit', '1mb');

  app.disable('x-powered-by');
  app.set('trust proxy', config.server.trustProxy ?? false);
  app.use(requireHttps(config));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(originPolicy(config, { additionalOrigins: transport.certificateHosts(activeTransport).map(host => new URL(transport.urlFor(activeTransport.protocol, host, config.server.port)).origin) }));
  app.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, skip: (req) => req.path === '/api/control/health' }));
  app.use(express.json({ limit: '1mb' }));

  // 헬스 체크 — 인증 불필요
  app.get('/api/control/health', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  // 상태 조회
  app.get('/api/control/status', authMiddleware, (_req, res) => {
    res.json({ data: sup.getStatus() });
  });

  // 시작
  app.post('/api/control/start', authMiddleware, async (req, res) => {
    try {
      sup.watchdog?.resetAfterManualStart();
      const result = await sup.start();
      logger.info(`[control] START by ${req.user?.username || '(unknown)'} → pid=${result.pid}`);
      res.json({ data: result });
    } catch (e) {
      logger.warn(`[control] START failed: ${e.message}`);
      res.status(e.status || 500).json({ code: e.status || 500, message: config.env === 'production' && (!e.status || e.status >= 500) ? 'Internal Server Error' : e.message });
    }
  });

  // 중지
  app.post('/api/control/stop', authMiddleware, async (req, res) => {
    try {
      const result = await sup.stop();
      logger.info(`[control] STOP by ${req.user?.username || '(unknown)'}`);
      res.json({ data: result });
    } catch (e) {
      logger.warn(`[control] STOP failed: ${e.message}`);
      res.status(e.status || 500).json({ code: e.status || 500, message: config.env === 'production' && (!e.status || e.status >= 500) ? 'Internal Server Error' : e.message });
    }
  });

  // 재시작
  app.post('/api/control/restart', authMiddleware, async (req, res) => {
    try {
      sup.watchdog?.resetAfterManualStart();
      const result = await sup.restart();
      logger.info(`[control] RESTART by ${req.user?.username || '(unknown)'} → pid=${result.pid}`);
      res.json({ data: result });
    } catch (e) {
      logger.warn(`[control] RESTART failed: ${e.message}`);
      res.status(e.status || 500).json({ code: e.status || 500, message: config.env === 'production' && (!e.status || e.status >= 500) ? 'Internal Server Error' : e.message });
    }
  });

  // 404
  app.use((_req, res) => {
    res.status(404).json({ code: 404, message: 'Not Found' });
  });

  // 전역 에러 핸들러
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (res.headersSent) return _next(err);
    logger.error(`[control] internal error: ${err.message}`);
    res.status(err.status || 500).json({ code: err.status || 500, message: config.env === 'production' && (!err.status || err.status >= 500) ? 'Internal Server Error' : err.message });
  });

  return app;
}
