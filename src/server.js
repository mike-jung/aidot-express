import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import config from './config/index.js';
import { getVersionInfo } from './util/version.js';
import { createContext, runWith, setUser, setRoute, addStep } from './core/requestContext.js';
import traceStore from './core/traceStore.js';
import logger from './util/logger.js';
import { loadSqlFiles, loadSqlFilesFromDir } from './core/sqlLoader.js';
import {
  loadServices, loadControllers,
  loadServicesFromDir, loadControllersFromDir,
  bootProblems,
} from './core/controllerLoader.js';
import { pollutionGuard, parameterPollutionGuard } from './core/security.js';
import metrics from './core/metrics.js';
import metricsMiddleware from './core/metricsMiddleware.js';
import { startLoopLagMonitor, loopLagStats } from './core/loopLag.js';
import container from './core/container.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import db from './database/db.js';
import { getAgent as getHaAgent } from './core/ha/index.js';   // ★ v1.14.1

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

export { db };

/**
 * 부팅 상태 — 마지막에 "기동 요약" 을 찍기 위해 각 단계 결과를 모아 둔다.
 *   app.js 가 listen 직후 printBootSummary() 로 출력한다.
 */
/**
 * v1.8.0 — 준비 상태(readiness).
 *  · liveness  = 프로세스가 살아 있는가       → DB 를 보지 않는다
 *  · readiness = 트래픽을 받을 수 있는가       → DB · 마이그레이션 · 종료 중 여부
 *
 *  liveness 에서 DB 를 확인하면 **DB 가 잠깐 흔들릴 때 프로세스가 재시작되어 상황이 악화된다.**
 *  흔한 실수라 여기 못 박아 둔다.
 */
export const readiness = {
  draining: false,          // 종료 절차 시작 — 즉시 트래픽을 끊어야 한다
  markDraining() { this.draining = true; },
};

export const bootStatus = {
  migration: { ok: null },
  adminSeeded: null,
  // v1.7.4: 관리자 계정 상태 — 기동 요약이 '로그인 가능' 을 거짓으로 찍지 않도록
  admin: null,
};

/** ★ v1.11.0 — MCI 풀 요약 (헬스/모니터링용). 서비스가 아직 없으면 null */
export function summarizeMci() {
  if (!config.mci?.enabled) return { enabled: false };
  if (!container.has('MciService')) return { enabled: true, state: 'not-loaded' };
  const st = container.resolve('MciService').stats?.();
  if (!st) return { enabled: true, state: 'idle', note: '아직 MCI 호출이 없었습니다' };
  return {
    enabled: true,
    host: st.host, port: st.port,
    state: st.breaker?.state || 'closed',
    pool: st.pool,
    breaker: st.breaker,
    counters: st.counters,
    lastError: st.lastError,
    lastSuccessAt: st.lastSuccessAt,
    txGuardWarnings: st.txGuardWarnings || 0,
  };
}

export async function createServer() {
  const app = express();
  startLoopLagMonitor();

  // === 기본 보안 헤더 ===
  app.disable('x-powered-by');

  // 리버스 프록시 뒤에 있을 때만 실제 client IP 를 신뢰 (.env TRUST_PROXY). 기본 false — 위조 X-Forwarded-For 차단.
  app.set('trust proxy', config.server.trustProxy ?? false);

  // helmet: CSP, HSTS, X-Frame-Options, X-Content-Type-Options 등
  // - API 서버이면 CSP 는 제한적으로 사용. 정적 페이지도 서빙하므로 기본값 사용.
  app.use(
    helmet({
      contentSecurityPolicy: config.security.csp ? undefined : false,
      crossOriginEmbedderPolicy: false,
      // HSTS 는 HTTPS 종단(프록시/Electron 로컬)에서만 의미가 있으므로 cookieSecure 설정을 따른다
      strictTransportSecurity: config.auth.cookieSecure ? { maxAge: 15552000, includeSubDomains: true } : false,
    }),
  );
  // API 응답은 캐시/스니핑 대상이 아님 — 추가 헤더
  app.use((_req, res, next) => {
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // === v1.8.0: 요청 상관 ID ===
  //  가능한 한 앞에 둔다 — 여기보다 뒤에서 나는 로그는 ID 가 붙지 않는다.
  //  helmet 뒤인 이유는, 보안 헤더는 어떤 경우에도 먼저 나가야 하기 때문이다.
  app.use((req, res, next) => {
    const ctx = createContext(req);
    // 사용자가 화면에서 본 오류 번호를 그대로 말해 줄 수 있도록 응답에 실어 보낸다
    res.set('X-Request-Id', ctx.requestId);
    res.set('traceparent', `00-${ctx.traceId}-${ctx.spanId}-01`);

    runWith(ctx, () => {
      // ⚠ 'finish' 리스너는 요청 컨텍스트 안에서 등록해야 한다.
      //   AsyncLocalStorage 의 대표적인 함정이 바로 이것 — 밖에서 등록하면 getStore() 가 비어 있다.
      res.on('finish', () => {
        try {
          if (req.route?.path) setRoute((req.baseUrl || '') + req.route.path);
          const rec = traceStore.finish(ctx, {
            status: res.statusCode,
            bytes: Number(res.getHeader('content-length')) || null,
          });
          // 저장은 응답을 붙잡지 않는다 (await 하지 않는다)
          traceStore.persist(rec).catch(() => {});
        } catch { /* 추적 실패가 요청을 깨뜨리면 안 된다 */ }
      });
      next();
    });
  });

  // === CORS ===
  app.use(cors(config.cors));

  // === 압축 ===
  //  ⚠ compressible('text/event-stream') === true 라서, 기본 설정이면 SSE 스트림도 gzip 대상이 된다.
  //    gzip 은 블록이 찰 때까지 내보내지 않으므로 이벤트가 즉시 전달되지 않고 몰아서 도착한다.
  //    → SSE 응답은 압축에서 제외한다. (그 외에는 compression 기본 필터를 그대로 사용)
  app.use(compression({
    filter(req, res) {
      const ct = String(res.getHeader('Content-Type') || '');
      if (ct.includes('text/event-stream')) return false;
      if (req.headers.accept && String(req.headers.accept).includes('text/event-stream')) return false;
      return compression.filter(req, res);
    },
  }));

  // === Body 파싱 ===
  app.use(
    express.json({
      limit: config.server.bodyLimit,
    }),
  );
  app.use(
    express.urlencoded({
      extended: false,
      limit: config.server.bodyLimit,
    }),
  );
  // 쿠키 파싱 (refresh token 쿠키용)
  app.use(cookieParser());

  // === API 응답 캐시 무력화 (patch-17) ===
  //  문제: Express 는 기본적으로 res.json() 응답에 ETag 를 붙이고 Cache-Control 을 비워둔다.
  //        그 결과 브라우저가 GET /api/admin/services/:id 같은 동적 응답을 HTTP 캐시에 보관할 수 있어,
  //        콘솔에서 코드를 저장(디스크 반영 OK)한 뒤 같은 화면을 다시 열면 *예전* 응답이 보였다.
  //  해결: 모든 /api 응답에 no-store 를 강제하여 브라우저가 절대 캐시하지 않게 한다.
  //        (정적 파일 캐시에는 영향 없음 — /api 경로에만 적용)
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
  });

  // === 추가 보안 가드 ===
  // Prototype pollution: body 파싱 직후에 배치하여 __proto__ / constructor /
  // prototype 키가 포함된 요청을 명시적으로 400 으로 거절
  app.use(pollutionGuard());
  // HTTP Parameter Pollution (?a=1&a=2 같은 중복 파라미터 공격) — Express 5 호환 내장 구현
  app.use(parameterPollutionGuard());

  // === 모니터링용 메트릭 수집 미들웨어 ===
  // - 모든 요청의 응답시간/상태를 메모리에 기록
  // - /health, 정적 파일은 자동 skip
  // - 라우팅 이전에 등록하여 404/500 도 포함
  app.use(metricsMiddleware());

  // === Rate Limiting (전역) ===
  if (config.security.rateLimit.enabled) {
    app.use(
      rateLimit({
        windowMs: config.security.rateLimit.windowMs,
        limit: config.security.rateLimit.max,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { ok: false, message: 'Too Many Requests' },
      }),
    );

    // 인증 엔드포인트는 더 강하게 (brute-force 방어)
    const authLimiter = rateLimit({
      windowMs: config.security.authRateLimit.windowMs,
      limit: config.security.authRateLimit.max,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skipSuccessfulRequests: true, // 성공 요청은 카운트 안 함 (정상 유저 보호)
      message: { ok: false, message: 'Too many authentication attempts' },
    });
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/signup', authLimiter);
    app.use('/api/auth/refresh', authLimiter);
    app.use('/api/admin/auth/login', authLimiter);
    app.use('/api/admin/auth/signup', authLimiter);
    app.use('/api/admin/auth/refresh', authLimiter);
  }

  // === 접근 로그 ===
  // 포맷: <IP> user=<username> "METHOD URL HTTP/ver" status bytes "referrer" "UA"
  //  - IP  : trust proxy 가 반영된 req.ip 우선
  //  - user: @Auth 가드가 세팅한 req.user.username (없으면 '-')
  morgan.token('httpLine', (req) => {
    const method = req.method;
    const url = req.originalUrl || req.url || '';
    const version = req.httpVersion || '1.1';
    return `"${method} ${url} HTTP/${version}"`;
  });
  morgan.token('clientIp', (req) => {
    return req.ip || req.socket?.remoteAddress || '-';
  });
  morgan.token('authUser', (req) => {
    const u = req.user;
    if (!u) return '-';
    // username 우선, 없으면 id 기반 "u:123" 형태
    return String(u.username ?? (u.id ? `u:${u.id}` : '-'));
  });
  const httpLogFormat =
    ':clientIp user=:authUser :httpLine :status :res[content-length] ":referrer" ":user-agent"';
  // ★ v1.11.0 — supervisor 의 생존 감시가 10초마다 /health/live 를 친다. 그 줄까지 로그에 남기면
  //   하루 8,640줄이 감시 잡음이다. 실패하면 supervisor 쪽 로그([watchdog])에 남으므로 여기서는 뺀다.
  /* ★ v1.15.0 — 로그에 남길 이유가 없는 요청은 아예 찍지 않는다.
       예전에는 화면을 한 번 열 때마다 /assets/*.js · *.css · favicon · .well-known 이
       수십 줄씩 쌓여, 정작 봐야 할 줄이 그 사이에 묻혔다.
       (접속 통계에서 걸러내는 목록과 같은 기준이다) */
  const HTTP_LOG_SKIP = [/^\/health/, /^\/favicon/, /^\/\.well-known\//, /^\/assets\//, /^\/vendor\//];
  const HTTP_LOG_SKIP_EXT = /\.(?:js|mjs|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot)$/i;
  app.use(morgan(httpLogFormat, {
    stream: logger.stream,
    skip: (req) => HTTP_LOG_SKIP.some((re) => re.test(req.path))
      || (HTTP_LOG_SKIP_EXT.test(req.path) && !req.path.startsWith('/api/'))
      /* ★ v1.16.4 — 콘솔 화면을 여는 것(/login · /controllers …)은 API 호출이 아니라
         브라우저가 index.html 을 받아 가는 것이다. 새로 고칠 때마다 한 줄씩 쌓여
         정작 봐야 할 API 호출이 묻힌다. 확장자 없는 GET 이면 화면 이동으로 본다. */
      || (req.method === 'GET' && !req.path.startsWith('/api/') && !/\.[a-z0-9]+$/i.test(req.path)),
  }));

  // === 정적 파일 ===
  // 우선순위: admin-client/dist  >  public
  //   admin-client/dist 가 있으면 그게 UI 진짜 진입점.
  //   public/ 은 주로 개발자용 랜딩/demo 리소스이므로 '/public' 경로로 분리해서 제공.
  //   이렇게 해야 Electron 창이 루트(/) 로 loadURL 했을 때 admin-client SPA 가 뜬다.
  //
  // express.static 은 내부적으로 경로 정규화로 ../ 탈출을 막음.
  // dotfiles 'deny' 로 .env 같은 숨김파일 요청 자체를 차단.
  const adminDistDir = path.resolve(projectRoot, 'admin-client', 'dist');
  const hasAdminDist = fs.existsSync(path.join(adminDistDir, 'index.html'));
  const publicDir = path.resolve(projectRoot, config.paths.publicDir);

  if (hasAdminDist) {
    // admin-client/dist 를 루트 '/' 에 바인드
    app.use(
      express.static(adminDistDir, {
        dotfiles: 'deny',
        index: ['index.html'],
        fallthrough: true,
      }),
    );
    logger.info(`[server] admin-client 정적 서빙 활성: ${adminDistDir}`);
    // 레거시 public 은 '/public' 경로로 별도 제공 (index 없이 파일만 접근 가능)
    app.use('/public',
      express.static(publicDir, {
        dotfiles: 'deny',
        index: false,
        fallthrough: true,
      }),
    );
    /* ★ v1.11.2 — 올린 파일. UploadController 가 public/uploads/ 에 저장하고 `/uploads/<이름>` 을 돌려주는데,
       콘솔 빌드(dist)가 있을 때는 public 이 /public 에만 붙어 그 주소가 SPA 의 index.html 로 떨어졌다. */
    app.use('/uploads',
      express.static(path.join(publicDir, 'uploads'), { dotfiles: 'deny', index: false, fallthrough: true }),
    );
  } else {
    // dist 가 없으면 기존처럼 public 만 루트에 서빙
    app.use(
      express.static(publicDir, {
        dotfiles: 'deny',
        index: ['index.html'],
        fallthrough: true,
      }),
    );
    logger.warn(`[server] admin-client/dist 를 찾지 못함 — public 폴더를 루트에 서빙. ` +
      `'cd admin-client && npm run build' 로 SPA 를 빌드하거나 Vite dev 서버를 직접 사용하세요.`);
  }

  // === 헬스체크 ===
  //  /health       기존 호환 (콘솔이 버전 표시에 쓴다)
  //  /health/live  프로세스만 — DB 를 보지 않는다
  //  /health/ready 트래픽 수용 가능 여부 — DB · 마이그레이션 · 종료 중 여부
  app.get('/health', (_req, res) => {
    const v = getVersionInfo();
    res.json({ ok: true, ts: Date.now(), version: v.version, channel: v.channel, builtAt: v.builtAt });
  });

  app.get('/health/live', (_req, res) => {
    // 이 응답이 나온다는 것 자체가 이벤트 루프가 돌고 있다는 뜻이다.
    res.json({ ok: true, status: 'alive', pid: process.pid, uptimeSec: Math.round(process.uptime()) });
  });

  app.get('/health/ready', (_req, res) => {
    const checks = {
      draining: !readiness.draining,
      db: !db.isDbUnavailable(),
      migration: bootStatus.migration?.ok !== false,
      admin: bootStatus.admin?.exists !== false,
    };
    /* ★ v1.14.1 — 이중화: **스탠바이는 일부러 503 을 준다.**
         진입 장치(NLB·프록시·LB)가 헬스체크만 보고 액티브로만 보내게 하기 위한 표준 규약이다.
         단 `?role=any` 로 물으면 200 을 준다 — "이 서버가 살아 있나" 를 따로 보고 싶을 때 쓴다. */
    const ha = getHaAgent().status();
    const roleOk = !ha.enabled || ha.role === 'active' || String(_req.query?.role || '') === 'any';
    checks.haRole = roleOk;
    const ok = Object.values(checks).every(Boolean);
    /* ★ v1.11.0 — 판정에는 넣지 않고 **보여 주기만** 하는 것들.
         mci      MCI 가 죽었다고 이 서버를 앞단에서 빼면 안 된다 — MCI 와 무관한 API 는 멀쩡하다.
                  대신 차단기 상태·연결 수·마지막 오류를 실어 "왜 MCI 만 503 인가" 를 바로 알 수 있게.
         loopLag  이벤트 루프 지연. 이것이 커지면 전체가 느려지기 직전이다. */
    let mci = null;
    try { mci = summarizeMci(); } catch { /* 진단이 헬스를 깨뜨리면 안 된다 */ }
    res.status(ok ? 200 : 503).json({
      ok,
      status: readiness.draining ? 'draining' : (ok ? 'ready' : 'not-ready'),
      checks,
      ha: ha.enabled ? { role: ha.role, reason: ha.reason, nodeId: ha.nodeId, fenceToken: ha.fenceToken } : { enabled: false },
      details: { mci, loopLag: loopLagStats(), skippedFiles: bootProblems.map((b) => ({ kind: b.kind, file: b.file, message: b.message })) },
      ts: Date.now(),
    });
  });

  // === 라우팅 자동 등록 ===
  await loadSqlFiles(logger);

  // lib/admin 영역 SQL 도 같은 레지스트리에 로딩
  const adminSqlDir = path.resolve(projectRoot, 'lib/admin/database/sql');
  await loadSqlFilesFromDir(adminSqlDir, logger);

  await db.initDb();

  // 마이그레이션 자동 적용 (mock/oracle 모드에서는 자동 skip)
  //  ⚠ v1.7.2: 예전에는 실패해도 warn 한 줄만 남기고 그대로 부팅했다. 그러면 스키마가 반쯤 적용된
  //    상태로 서버가 떠서 로그인 같은 기본 기능이 500(Unknown column …)으로 깨진다.
  //    수백 줄 로그 사이에 묻히지 않도록 배너로 알리고, 마지막 기동 요약에도 남긴다.
  /* ★ v1.14.3 — **복제 대기(replica) DB 에는 쓰지 않는다.**
       실제 2대 구성 검증에서 발견: 대기 서버의 앱이 기동하면서 마이그레이션·예제 데이터·관리자 계정을
       자기 로컬 DB 에 만들었고, 그 쓰기가 replica 자신의 GTID 를 만들어
       `gtid_strict_mode` 에서 복제가 통째로 멈췄다
       (An attempt was made to binlog GTID 0-1-100 which would create an out-of-order sequence number…).
       replica 의 스키마는 **복제로 따라오는 것**이지 앱이 만들 것이 아니다.
       ⚠ MariaDB 에서 read_only 는 SUPER 권한 사용자를 막지 못한다. 그래서 앱이 스스로 확인해야 한다. */
  let dbIsReplica = false;
  if (!db.isDbUnavailable()) {
    try {
      const r = await db.execute('SELECT @@read_only AS ro', {});
      dbIsReplica = Number(r.rows?.[0]?.ro ?? 0) === 1;
    } catch { /* 확인 못 하면 평소대로 진행 */ }
  }
  if (dbIsReplica) {
    logger.warn('[migration] 이 서버의 DB 는 읽기 전용(replica)입니다 — 마이그레이션·예제·초기 계정을 건너뜁니다. '
      + '스키마는 복제로 따라옵니다.');
    bootStatus.migration = { ok: true, skipped: true, reason: 'replica(read_only)' };
  } else if (db.isDbUnavailable()) {
    logger.warn('[migration] DB 에 연결되지 않아 마이그레이션을 건너뜁니다 (DB 연결 후 서버를 다시 시작하세요)');
    bootStatus.migration = { ok: false, skipped: true, error: 'DB 미연결' };
  } else {
    try {
      const { runMigrations } = await import('./database/migrationRunner.js');
      const r = await runMigrations({
        dirs: ['src/database/migrations', 'lib/admin/database/migrations'],
        projectRoot,
      });
      // ★ v1.7.3: non-blocking 으로 표시된 샘플 파일은 실패해도 체인을 끊지 않는다.
      //   대신 조용히 넘어가지도 않는다 — 어떤 파일이 왜 실패했는지 기동 요약까지 끌고 간다.
      const soft = r?.failed ?? [];
      if (soft.length) {
        bootStatus.migration = { ok: true, partial: true, failed: soft };
        process.stderr.write([
          '',
          '  ⚠ 샘플 데이터 마이그레이션 ' + soft.length + '건이 실패했습니다 (핵심 스키마는 정상 적용됨)',
          ...soft.map((f) => '    · ' + f.file + ' — ' + f.error + (f.hint ? '\n      ↳ ' + f.hint : '')),
          '    샘플 화면만 비어 보일 뿐 로그인·콘솔은 정상 동작합니다.',
          '',
        ].join('\n') + '\n');
      } else {
        bootStatus.migration = { ok: true };
      }
    } catch (e) {
      bootStatus.migration = { ok: false, error: e.message };
      logger.error(`[migration] 실패 — ${e.message}`);
      process.stderr.write([
        '',
        '╔══════════════════════════════════════════════════════════════════════════════╗',
        '║  DB 마이그레이션이 실패했습니다 — 스키마가 최신이 아니라 기능이 깨질 수 있습니다  ║',
        '╚══════════════════════════════════════════════════════════════════════════════╝',
        `  원인: ${e.message}`,
        '',
        '  이 상태로는 로그인 등 기본 기능이 "Unknown column …" 오류를 낼 수 있습니다.',
        '  · 위 SQL 을 DB 도구(HeidiSQL 등)에서 직접 실행하거나',
        '  · 원인을 고친 뒤 서버를 다시 시작하세요 (이미 성공한 파일은 다시 실행되지 않습니다).',
        '',
      ].join('\n') + '\n');
    }
  }

  // 서비스 로딩 (일반 + admin)
  await loadServices();
  const adminServiceDir = path.resolve(projectRoot, 'lib/admin/service');
  await loadServicesFromDir(adminServiceDir);

  // === 최초 관리자 생성 + 보안 사전점검 (v1.2.0) ===
  //  - admin_users 가 비어 있으면 환경별 규칙으로 초기 계정 생성 (lib/admin/service/AdminBootstrap.js)
  //  - 시크릿/CORS/기본 비밀번호 점검. production 에서 치명 항목이 있으면 여기서 throw → 기동 중단
  if (db.isDbUnavailable()) {
    logger.warn('[admin] DB 미연결 — 최초 관리자 생성과 보안 점검을 건너뜁니다');
    bootStatus.adminSeeded = false;
    bootStatus.admin = { exists: false, error: 'DB 미연결' };
  } else if (dbIsReplica) {
    /* ★ v1.14.3 — replica 에는 계정도 만들지 않는다. 액티브에서 만든 계정이 복제로 따라온다.
       여기서 만들면 replica 자신의 GTID 가 생겨 복제가 멈춘다(실제 2대 검증에서 확인). */
    logger.warn('[admin] DB 가 읽기 전용(replica) — 초기 관리자 계정 생성을 건너뜁니다 (복제로 따라옵니다).');
    bootStatus.admin = { exists: true, skipped: 'replica' };
  } else {
    const { ensureInitialAdmin, ensureDefaultAdminPassword, securityPreflight } =
      await import('../lib/admin/service/AdminBootstrap.js');
    let created = false;
    let bootstrapError = null;
    try {
      const r = await ensureInitialAdmin(logger);
      created = r?.created ?? false;
      bootStatus.adminSeeded = r?.created ?? true;
    } catch (e) {
      // ⚠ v1.7.4 이전에는 이 warn 한 줄이 전부라서, 관리자 계정이 없는데도 기동 요약이
      //   '로그인 가능' 이라고 찍혔다. 이제 bootStatus.admin 으로 요약까지 끌고 간다.
      logger.warn(`[admin] 최초 관리자 생성 건너뜀: ${e.message}`);
      bootStatus.adminSeeded = false;
      bootstrapError = e.message;
    }
    // 옛 DB(v1.1.x 시드 admin123)를 문서상 기본값으로 정렬 + 기본 비밀번호 사용 여부 확인
    let pw = { exists: false, username: 'admin', defaultPassword: null, normalized: false };
    try {
      pw = await ensureDefaultAdminPassword(logger);
    } catch (e) {
      logger.warn(`[admin] 기본 계정 비밀번호 점검 실패(무시): ${e.message}`);
    }
    bootStatus.admin = { ...pw, created, error: bootstrapError };
    await securityPreflight(logger, pw);   // production 실패 시 throw
  }

  // 컨트롤러 로딩 (일반 + admin)
  /* ★ v1.14.1 — 스탠바이에서는 조회만. 컨트롤러보다 앞에 둬야 업무 API 에 걸린다. */
  const { readOnlyGuard } = await import('./core/ha/readOnlyGuard.js');
  app.use(readOnlyGuard);

  await loadControllers(app);
  // ★ v1.11.1 — 깨진 사용자 파일은 건너뛰고 떴다는 것을 한 줄로 (기동 로그 200줄 사이에 묻히지 않게)
  if (bootProblems.length) {
    logger.warn(`[boot] ⚠ import 에 실패해 건너뛴 파일 ${bootProblems.length}개 — ` + bootProblems.map((b) => `${path.relative(projectRoot, b.file).replace(/\\/g, '/')} (${b.message.split('\n')[0].slice(0, 120)})`).join(' · '));
  }
  const adminControllerDir = path.resolve(projectRoot, 'lib/admin/controller');
  await loadControllersFromDir(app, adminControllerDir);

  // ControllerMetaService 에 app 인스턴스 주입 (동적 컨트롤러 로딩용)
  try {
    const { setApp } = await import('../lib/admin/service/ControllerMetaService.js');
    setApp(app);
    /* ★ v1.28.0 — 직접 넣은 파일을 올리는 서비스에도 같은 app 을 준다 */
    const { setApp: setAppForWorkspaceLoad } = await import('../lib/admin/service/WorkspaceLoadService.js');
    setAppForWorkspaceLoad(app);
    /* 모듈 인스턴스가 갈라져도 찾을 수 있게 전역에도 둔다 (읽기 전용으로만 쓴다) */
    globalThis.__aidotExpressApp = app;
    /* ★ v1.32.0 — 부팅이 읽어 올린 서비스·SQL 을 "올라옴" 으로 기록해 둔다.
       이 기록이 없으면 부팅 직후 전부 "안 올라옴" 으로 보인다. */
    try {
      const { default: container } = await import('./core/container.js');
      container.resolve('WorkspaceLoadService')?.seedLoadedAtBoot?.();
    } catch (e) {
      logger.debug?.(`[workspace] 부팅 기록 건너뜀: ${e.message}`);
    }
    /* ★ v1.32.0 — 부팅이 읽어 올린 서비스·SQL 을 "올라옴" 으로 기록한다.
       이 기록이 없으면 부팅 직후 전부 "안 올라옴" 으로 보인다. */
    try {
      const container = (await import('./core/container.js')).default;
      container.resolve('WorkspaceLoadService')?.seedLoadedAtBoot?.();
    } catch (e) {
      logger.debug?.(`[workspace] 부팅 기록 건너뜀: ${e.message}`);
    }
    logger.info('[admin] ControllerMetaService 에 app 주입 완료');
  } catch (e) {
    logger.warn(`[admin] ControllerMetaService 로드 실패 (lib/admin 미사용?): ${e.message}`);
  }

  // BackupService 에도 app 인스턴스 주입 (복원 후 컨트롤러 hot-reload 용)
  try {
    const { setAppForBackup } = await import('../lib/admin/service/BackupService.js');
    setAppForBackup(app);
    logger.info('[admin] BackupService 에 app 주입 완료');
  } catch (e) {
    logger.warn(`[admin] BackupService 로드 실패: ${e.message}`);
  }

  // ★ 동적으로 추가되는 컨트롤러 전용 라우터 (404 핸들러 이전에 등록)
  try {
    const { dynamicRouter } = await import('./core/controllerLoader.js');

    // ─────────────────────────────────────────────────────────────────
    // legacy (ubiaccess) 컨트롤러 로딩 — app.use(dynamicRouter) 이전에 실행
    //   legacy/controller/*.js 를 JSDoc annotation 기반으로 파싱해서 dynamicRouter 에 등록.
    //   실패해도 서버 기동은 계속 (legacy 디렉토리가 없을 수도 있음).
    // ─────────────────────────────────────────────────────────────────
    try {
      const legacyLoaderPath = path.resolve(projectRoot, 'legacy', 'loader.mjs');
      if (fs.existsSync(legacyLoaderPath)) {
        const { loadLegacyControllers } = await import(pathToFileURL(legacyLoaderPath).href);
        const dbMod = await import('./database/db.js');
        const metas = await loadLegacyControllers({
          dynamicRouter,
          logger,
          db: dbMod.default,
          container,
        });
        // admin-client 가 참조할 수 있도록 container/globalThis 에 노출
        globalThis.__legacyControllers = metas;
      } else {
        logger.info('[legacy] legacy/loader.mjs 없음 — 레거시 컨트롤러 로딩 스킵');
      }
    } catch (e) {
      logger.warn(`[legacy] 로딩 중 에러: ${e.message}`);
    }

    app.use(dynamicRouter);
    logger.info('[admin] dynamicRouter 등록 완료 (동적 컨트롤러용)');
  } catch (e) {
    logger.warn(`[admin] dynamicRouter 등록 실패: ${e.message}`);
  }

  // === 모니터링: OS 샘플러 + MetricsService 시작 ===
  //  - OS 샘플러: 1초마다 CPU/메모리/프로세스 메트릭을 인메모리 버킷에 기록
  //  - MetricsService: 10초마다 DB flush, 1초마다 임계값 평가, 초과 시 알림 생성
  try {
    metrics.startOsSampler();
    if (db.isDbUnavailable()) {
      logger.warn('[admin] DB 미연결 — 지표 DB 적재는 건너뜁니다 (화면의 실시간 지표는 메모리 값으로 동작)');
    } else if (container.has('MetricsService')) {
      const metricsService = container.resolve('MetricsService');
      await metricsService.start();
      logger.info('[admin] MetricsService 시작 완료 (모니터링 활성)');
    } else {
      logger.warn('[admin] MetricsService 미등록 — 수집만 수행, DB 저장/알림 비활성');
    }
  } catch (e) {
    logger.warn(`[admin] 모니터링 시작 실패 (서비스는 계속 동작): ${e.message}`);
  }

  // === 접속 통계: AccessLogService 시작 ===
  //  - metricsMiddleware 가 매 요청마다 enqueue, 서비스가 5초마다 배치 INSERT
  //  - login/logout/logoutAll 훅이 AuthService 및 AdminAuthService 에 연결돼 있음
  try {
    if (container.has('AccessLogService')) {
      const accessSvc = container.resolve('AccessLogService');
      accessSvc.start();
      // 종료 시 큐 flush 를 위해 app 에 보관
      app.set('accessLogService', accessSvc);
    } else {
      logger.warn('[admin] AccessLogService 미등록 — 접속 통계가 비활성');
    }
  } catch (e) {
    logger.warn(`[admin] AccessLogService 시작 실패: ${e.message}`);
  }

  /* ★ v1.14.0 — 이중화 에이전트. HA_ENABLED=false(기본)면 아무것도 하지 않는다.
       DB 관측은 여기서 주입한다 — 에이전트가 DB 구현을 몰라도 되게. */
  try {
    const { initHa } = await import('./core/ha/index.js');
    initHa({
      logger,
      db: {
        ping: async () => { try { await db.execute('SELECT 1 AS ok', {}); return true; } catch { return false; } },
        isWritable: async () => {
          try {
            const r = await db.execute('SELECT @@read_only AS ro', {});
            return Number(r.rows?.[0]?.ro ?? 1) === 0;
          } catch { return false; }
        },
        replicationStatus: async () => {
          /* 복제가 살아 있으면 상대 primary 가 살아 있다는 뜻 —
             이 신호 하나가 "방화벽 분단" 에서 스플릿브레인을 막는다. */
          try {
            const r = await db.execute('SHOW SLAVE STATUS', {});
            const row = r.rows?.[0];
            if (!row) return { ioRunning: false, lagSec: null };
            return {
              ioRunning: String(row.Slave_IO_Running || '').toLowerCase() === 'yes',
              sqlRunning: String(row.Slave_SQL_Running || '').toLowerCase() === 'yes',
              lagSec: row.Seconds_Behind_Master == null ? null : Number(row.Seconds_Behind_Master),
            };
          } catch { return { ioRunning: false, lagSec: null }; }
        },
        setReadOnly: async (on) => { await db.execute(`SET GLOBAL read_only = ${on ? 'ON' : 'OFF'}`, {}); },
      },
      onRoleChange: (ev) => {
        logger.warn(`[ha] 역할 ${ev.from} → ${ev.to} (${ev.reason}) token=${ev.fenceToken}`);
        /* ★ v1.14.1 — 진입 장치(Windows NLB 등)를 함께 돌린다.
           NLB 는 앱 장애를 감지하지 못하므로, 앱이 스스로 판단한 결과를 이렇게 전달해야 한다.
           훅이 없거나 실패해도 서비스는 계속된다 — 로그만 남긴다. */
        const hook = config.ha?.roleHook;
        if (!hook) return;
        try {
          const { spawn } = require('node:child_process');
          const isPs = /\.ps1$/i.test(hook);
          const cmd = isPs ? 'powershell' : hook;
          const args = isPs
            ? ['-ExecutionPolicy', 'Bypass', '-File', hook, '-Role', ev.to, '-Port', String(config.port)]
            : [ev.to];
          const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
          child.stdout.on('data', (d) => logger.info(`[ha-hook] ${String(d).trim()}`));
          child.stderr.on('data', (d) => logger.warn(`[ha-hook] ${String(d).trim()}`));
          child.on('error', (e) => logger.error(`[ha-hook] 실행 실패: ${e.message}`));
        } catch (e) {
          logger.error(`[ha-hook] 실행 실패: ${e.message}`);
        }
      },
    });
  } catch (e) {
    logger.error(`[ha] 에이전트 시작 실패 — 이중화 없이 계속합니다: ${e.message}`);
  }

  // ★ v1.11.0 — MCI keep-alive 예열 (minIdle > 0 일 때만 실제로 연결한다). 실패해도 기동을 막지 않는다.
  try {
    if (config.mci?.enabled && container.has('MciService')) {
      container.resolve('MciService').warmup?.().catch(() => {});
    }
  } catch { /* noop */ }

  // === SPA history fallback (patch-17) ===
  //  Vue Router 가 history 모드라서 /login, /dashboard 같은 클라이언트 라우트를 브라우저에서
  //  직접 열거나 새로고침하면 서버로 GET /login 이 도달한다. 서버엔 그런 라우트가 없으므로
  //  기존엔 404 JSON 이 떴다. 여기서 admin SPA 의 index.html 을 돌려주어 Vue Router 가
  //  클라이언트 라우팅을 이어받게 한다.
  //    - GET 요청만 (POST 등 API 오타는 그대로 404)
  //    - /api, /public, /health 는 제외 (백엔드 응답 유지)
  //    - 확장자가 있는 경로(/assets/app.js, /x.png 등)는 제외 → 진짜 정적파일 404
  //    - HTML 을 받을 수 있는(브라우저 문서) 요청만
  if (hasAdminDist) {
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      const p = req.path || '';
      if (p.startsWith('/api/') || p === '/health' || p.startsWith('/health/') || p.startsWith('/public/') || p.startsWith('/uploads/')) return next();
      if (p.includes('.')) return next();          // 정적 리소스류는 fallback 안 함
      if (!req.accepts('html')) return next();      // fetch/XHR(JSON) 요청 제외
      res.sendFile(path.join(adminDistDir, 'index.html'));
    });
    logger.info('[server] SPA history fallback 활성 (admin-client/dist/index.html)');
  }

  // === 404 ===
  app.use((req, res) => {
    const requestCode = req.body?.requestCode || req.query?.requestCode || null;
    res.status(404).json({
      code: 404,
      message: `Not Found: ${req.method} ${req.originalUrl}`,
      header: {
        requestCode,
        timestamp: new Date()
          .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false })
          .replace('T', ' '),
      },
    });
  });

  // === 전역 에러 핸들러 ===
  // production 에서는 스택 / 내부 에러 메시지를 절대 노출하지 않음 (정보 누설 방지)
  app.use((err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    // ★ v1.11.0 — "잠깐 뒤 다시" 를 앞단이 알 수 있게 (MCI 차단기·대기열 초과 → 503 + Retry-After 초)
    if (err.retryAfterMs && !res.headersSent) {
      res.set('Retry-After', String(Math.max(1, Math.ceil(err.retryAfterMs / 1000))));
    }
    // 4xx(검증 실패/인증 실패 등)는 스택 없이 warn, 5xx 만 error+스택 — 로그 노이즈/민감정보 축소
    // ★ v1.11.0 — 외부 시스템(MCI) 장애로 **예상되는** 5xx 는 스택 없이 한 줄. 장애 중에는 초당
    //   수백 건이 될 수 있고, 스택을 붙여 찍는 것이 그 자체로 CPU 를 먹는다. 원인은 [mci] 상태 전이
    //   로그에 이미 있다.
    if (err.expectedOutage) logger.warn(`[${status}] ${req.method} ${req.originalUrl} — ${err.message} (${err.mciPhase || 'mci'})`);
    else if (status >= 500) logger.error(err);
    else logger.warn(`[${status}] ${req.method} ${req.originalUrl} — ${err.message}`);
    const requestCode = req.body?.requestCode || req.query?.requestCode || null;
    const header = {
      requestCode,
      timestamp: new Date()
        .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false })
        .replace('T', ' '),
    };

    if (config.env === 'production') {
      const safeMessage = status < 500 ? (err.message || 'Bad Request') : 'Internal Server Error';
      return res.status(status).json({ code: status, message: safeMessage, header });
    }
    // 개발 환경: 디버깅을 위해 stack 포함
    res.status(status).json({
      code: status,
      message: err.message || 'Internal Server Error',
      header,
      stack: err.stack,
    });
  });

  return app;
}
