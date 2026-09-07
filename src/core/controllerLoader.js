import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import express from 'express';
import config from '../config/index.js';
import { existingDirs } from './appPaths.js';
import { META } from './decorators.js';
import { mergeParams } from './paramParser.js';
/* ★ v1.10.35 — 요청 추적에 단계를 남긴다.
   `addStep()` 을 부르는 곳이 db.js 하나뿐이라, [요청 추적] 상세를 열면
   **SQL 만** 보였다. 어느 핸들러가 받았는지도, 응답이 뭐였는지도 없으니
   결국 로그 파일을 뒤지게 된다. 요청이 지나는 길목마다 한 단계씩 남긴다. */
import { addStep, setUser } from './requestContext.js';

/**
 * ★ v1.10.35 — 4xx/5xx 응답을 **한 곳에서** 단계로 남긴다.
 *
 *  인증·권한·검증 거부 지점이 여덟 곳이 넘는다. 하나씩 addStep 을 붙이면
 *  반드시 하나를 빠뜨린다(v1.10.29 에서 생성 경로 하나를 놓친 것과 같은 함정).
 *  그래서 `res` 를 한 번 감싸, 실패 응답이 나갈 때 자동으로 기록되게 한다.
 */
function traceFailures(res) {
  if (res.__traced) return res;
  res.__traced = true;
  const origStatus = res.status.bind(res);
  res.status = (code) => {
    if (code >= 400) res.__failCode = code;
    return origStatus(code);
  };
  const origJson = res.json.bind(res);
  res.json = (body) => {
    const code = res.__failCode ?? (body && body.code >= 400 ? body.code : null);
    if (code) {
      const why = body?.message || body?.errorCode || '';
      addStep('error', `${code}`, { ok: false, detail: String(why).slice(0, 200) });
    }
    return origJson(body);
  };
  return res;
}
import { verifyAccessToken, REALMS } from './tokens.js';
import { isBlocked, blockInfo } from './blocklist.js';   // ★ v1.13.0
import { isRevoked } from './revokedUsers.js';
import sseHub from './sse.js';
import { consumeTicket } from './sseTicket.js';
import logger, { isAdminService } from '../util/logger.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..');

/* 등록된 컨트롤러 추적 (동적 재로딩 지원) */
const registeredControllers = new Map(); // basePath → {router, ctor, file}

/**
 * 동적으로 추가되는 컨트롤러를 위한 전용 라우터.
 *  server.js 에서 404 핸들러 이전에 등록되므로,
 *  런타임에 추가된 라우트도 정상 접근 가능.
 */
export const dynamicRouter = express.Router();

/** 응답 포맷 통일 헬퍼 */
function buildHeader(requestCode) {
  return {
    requestCode: requestCode || null,
    timestamp: new Date()
      .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false })
      .replace('T', ' '),
  };
}

function buildErrorResponse(status, message, requestCode, extra = {}) {
  return {
    code: status,
    message,
    header: buildHeader(requestCode),
    ...extra,
  };
}

function bustImport(filePath) {
  return `${pathToFileURL(filePath).href}?t=${Date.now()}`;
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // 사이드카 메타 폴더는 스캔하지 않음 (lib/admin/service/metaStorage.js 참조)
    if (entry.isDirectory() && entry.name === 'meta') continue;
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && /\.(m?js|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function joinPath(base, sub) {
  const a = (base || '').replace(/\/+$/, '');
  const b = (sub || '').replace(/^\/+/, '');
  const joined = [a, b].filter(Boolean).join('/');
  return '/' + joined.replace(/^\/+/, '');
}

/* 단일 컨트롤러 클래스 → router 생성.
 * sourceFile 은 admin 여부 판단용 (admin 컨트롤러면 Response 디버그 로그를 config.log.admin 에 따라 억제) */
function _buildRouter(Ctor, sourceFile = null) {
  const basePath = Ctor[META.BASE_PATH] || '';
  const routes = Ctor[META.ROUTES] || [];
  if (routes.length === 0) return null;

  // admin 컨트롤러이며 log.admin=false 면 Response 디버그 로그 스킵
  const isAdminController = isAdminService(sourceFile || '');
  const suppressResponseLog = !config.log.admin && isAdminController;
  // ★ 보안 (v1.2.0): lib/admin 아래 컨트롤러는 관리자 콘솔 계정(admin_users, realm='admin') 토큰만 허용.
  //   일반 사용자(users, realm='user') 토큰으로 콘솔 API(컨트롤러 생성·SQL 실행·.env 편집 등)를
  //   호출하던 권한 상승 경로를 차단한다. 컨트롤러가 @Auth({ realm: 'any' }) 로 명시하면 예외.
  //   반대로 일반(src/controller) 컨트롤러의 @Auth() 는 두 realm 을 모두 받는다 — 개발자가 콘솔의 [API 테스트]
  //   에서 관리자 토큰으로 앱 API 를 호출해 볼 수 있어야 하므로. 앱 사용자 전용으로 엄격히 제한하려면
  //   @Auth({ realm: 'user' }) 를 명시한다.
  const defaultRealm = isAdminController ? REALMS.ADMIN : 'any';

  const instance = new Ctor();
  const router = express.Router();

  for (const r of routes) {
    const fullPath = joinPath(basePath, r.path);
    const methodFn = router[r.method];
    if (!methodFn) {
      logger.error(`[Controller] 알 수 없는 HTTP method: ${r.method} (${Ctor.name}.${r.handler})`);
      continue;
    }
    const handler = instance[r.handler].bind(instance);

    methodFn.call(router, r.path || '/', async (req, res, next) => {

      traceFailures(res);   // ★ v1.10.35 — 실패 응답을 한 곳에서 단계로 남긴다
      // ★ 모니터링: 요청에 라우트/컨트롤러 정보 기록 → metricsMiddleware 가 라우트별 집계에 사용
      req._metricsRouteInfo = {
        controller: Ctor.name,
        handler: r.handler,
        method: r.method.toUpperCase(),
        path: fullPath,
      };

      try {
        // 1) @Auth 가드
        const guard = Ctor.__guards?.[r.handler];
        const isSse = !!Ctor.__sse?.[r.handler];
        if (guard?.type === 'auth') {
          const auth = req.headers.authorization || '';
          const m = /^Bearer\s+(.+)$/i.exec(auth);

          // EventSource 는 커스텀 헤더를 보낼 수 없다 → SSE 라우트만 두 가지 대안을 인정한다.
          //   1순위) ?ticket=   — 30초짜리 1회용 티켓 (POST /api/admin/sse/ticket 으로 발급). 권장.
          //   2순위) ?access_token= — 하위 호환. 장기 토큰이 URL 에 남으므로 새 코드에서는 쓰지 말 것.
          //   (두 경우 모두 metricsMiddleware 가 access_logs 기록 시 값을 마스킹한다)
          if (!m && isSse && typeof req.query?.ticket === 'string' && req.query.ticket) {
            const ticketUser = consumeTicket(req.query.ticket, { ip: req.ip });
            if (!ticketUser) {
              return res.status(401).json(buildErrorResponse(401, 'SSE 티켓이 유효하지 않거나 이미 사용되었습니다',
                mergeParams(req).requestCode, { errorCode: 'TICKET_INVALID' }));
            }
            req.user = { ...ticketUser, realm: ticketUser.realm || REALMS.USER, viaTicket: true };
            const wantRealmT = guard.realm ?? defaultRealm;
            if (wantRealmT !== 'any' && req.user.realm !== wantRealmT) {
              return res.status(403).json(buildErrorResponse(403, 'Forbidden', mergeParams(req).requestCode, { errorCode: 'REALM_MISMATCH' }));
            }
            if (guard.roles?.length && !guard.roles.includes(req.user.role)) {
              return res.status(403).json(buildErrorResponse(403, 'Forbidden', mergeParams(req).requestCode));
            }
            // 티켓 검증 통과 → 아래 토큰 검증 단계는 건너뛴다
          } else {
          const token = m ? m[1] : (isSse ? (typeof req.query?.access_token === 'string' ? req.query.access_token : null) : null);
          if (!token) {
            return res.status(401).json(buildErrorResponse(401, 'Authorization header required', mergeParams(req).requestCode));
          }
          try {
            const payload = verifyAccessToken(token);
            req.user = {
              id: Number(payload.sub),
              sub: payload.sub,
              role: payload.role,
              username: payload.username,
              realm: payload.realm || REALMS.USER,
              iat: payload.iat,
              exp: payload.exp,
            };
          } catch (e) {
            const expired = e.name === 'TokenExpiredError';
            return res.status(401).json(buildErrorResponse(401,
              expired ? 'Token expired' : 'Invalid token',
              mergeParams(req).requestCode,
              { errorCode: expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN' }
            ));
          }
          /* ★ v1.11.8 — 비활성/삭제된 계정의 토큰은 만료를 기다리지 않고 즉시 막는다 */
          if (isRevoked(req.user.id, req.user.iat)) {
            return res.status(401).json(buildErrorResponse(401, 'Account disabled. Please sign in again.',
              mergeParams(req).requestCode, { errorCode: 'ACCOUNT_REVOKED' }));
          }
          // realm 검사 — 토큰이 어느 계정 체계에서 발급됐는지
          const wantRealm = guard.realm ?? defaultRealm;
          const tokenRealm = req.user.realm;
          if (wantRealm !== 'any' && tokenRealm !== wantRealm) {
            return res.status(403).json(buildErrorResponse(403,
              wantRealm === REALMS.ADMIN ? 'Admin console account required' : 'Forbidden',
              mergeParams(req).requestCode,
              { errorCode: 'REALM_MISMATCH' }));
          }
          if (guard.roles?.length && !guard.roles.includes(req.user.role)) {
            return res.status(403).json(buildErrorResponse(403, 'Forbidden', mergeParams(req).requestCode));
          }
          }   // ← 티켓 분기의 else 끝
        }

        // 2) params 병합
        let params = mergeParams(req);

        // 3) @Validate 스키마 검증
        const schema = Ctor.__validators?.[r.handler];
        if (schema) {
          const parsed = schema.safeParse(params);
          if (!parsed.success) {
            return res.status(400).json(buildErrorResponse(400, 'Validation failed', params.requestCode, {
              errors: parsed.error.issues.map((e) => ({
                field: e.path.join('.'),
                code: e.code,
                message: e.message,
              })),
            }));
          }
          params = parsed.data;
        }

        // 3-b) SSE 라우트라면 응답을 스트림으로 전환하고, 핸들러가 고른 채널에 구독시킨다.
        if (isSse) {
          req._sseStream = true;             // metricsMiddleware 가 응답시간 집계에서 제외
          const client = sseHub.attach(req, res, {});
          if (!client) return;               // 동시 접속 한도 초과 (503 이미 응답됨)
          req.sse = client;
          const picked = await handler(params, req, res, next);
          if (client.closed) return;
          if (picked === false) { client.close('handler-reject'); return; }
          const channel = typeof picked === 'string' ? picked : (picked?.channel ?? params.channel ?? 'default');
          sseHub.subscribe(client, channel, { lastEventId: picked?.lastEventId });
          return;                            // 스트림은 열린 채로 유지 — 응답을 감싸지 않는다
        }

        // 4) 실제 핸들러
        /* ★ v1.10.36 — 요청 추적에 **누가 보냈는지** 붙인다.
           `setUser()` 를 부르는 곳이 아예 없어 추적 기록의 username 이 전부
           null 이었다. "내 요청만" 이 성립하려면 이게 있어야 한다.
           ⚠ 인증 통과 지점이 둘(티켓·헤더)이라 거기서 각각 부르면 빠뜨린다.
             핸들러 직전 **한 곳**에서 req.user 를 보고 붙인다. */
        /* 인증이 **꺼진** 라우트라도 토큰이 있으면 누군지 기록한다.
           `@Auth` 가드 안에서만 토큰을 읽고 있어, /api/books 처럼 인증을
           끈 라우트는 토큰을 보내도 username 이 null 이었다.
           → "내 요청만" 이 앱 API 에서 동작하지 않았다.
           ⚠ 여기서 읽은 결과로 **권한을 주지는 않는다.** req.user 를 덮어쓰지
             않고 추적에만 쓴다 — 인증 판단은 위의 가드가 그대로 맡는다. */
        if (req.user) {
          setUser(req.user);
        } else {
          const raw = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
          if (raw) {
            try { setUser(verifyAccessToken(raw)); } catch { /* 추적용이므로 조용히 무시 */ }
          }
        }
        addStep('controller', `${Ctor.name}.${r.handler}`, {
          detail: `${(r.method || 'get').toUpperCase()} ${r.path || '/'}`,
        });
        const __handlerStart = Date.now();
        const result = await handler(params, req, res, next);
        addStep('controller', `${Ctor.name}.${r.handler} 완료`, {
          ms: Date.now() - __handlerStart,
        });
        if (!res.headersSent && result !== undefined) {
          let output;

          // null / 원시값(문자열·숫자·불리언) 반환은 그대로 data 로 감싼다 (기존엔 null 에서 TypeError → 500)
          if (result === null || typeof result !== 'object') {
            return res.json({
              code: 200, message: 'OK',
              header: buildHeader(params.requestCode),
              data: result,
            });
          }

          /* ★ v1.10.34 — 핸들러가 무엇을 돌려줬는지 **한 줄**로.
             예전에는 최대 3줄이었는데, 그중 `hasRows/hasData/hasHeader` 는
             로더가 응답을 어떻게 감쌀지 정하는 **내부 판단 재료**이고,
             `array length` 는 바로 위 SQL 줄의 건수와 겹쳤다.
             개발자가 묻는 것은 "내 핸들러가 뭘 돌려줬나" 하나뿐이다. */
          if (!suppressResponseLog) {
            let shape;
            if (Array.isArray(result)) shape = `array(${result.length})`;
            else if (Array.isArray(result?.rows)) shape = `rows(${result.rows.length})`;
            else if (result === null || result === undefined) shape = String(result);
            else shape = typeof result;
            logger.debug(`[Response] ${Ctor.name}.${r.handler} → ${shape}`);
            addStep('note', `응답 ${shape}`, { detail: `${Ctor.name}.${r.handler}` });
          }

          if (
            Array.isArray(result.rows) &&
            result.header &&
            typeof result.header === 'object'
          ) {
            output = {
              code: 200,
              message: 'OK',
              header: result.header,
              data: result.rows,
            };
            output.header.requestCode = params.requestCode || null;
            if (!output.header.timestamp) {
              output.header.timestamp = new Date()
                .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false })
                .replace('T', ' ');
            }
          } else {
            let data = result.rows ? result.rows : result;
            data = result.data ? result.data : data;
            output = {
              code: 200,
              message: 'OK',
              header: {
                requestCode: params.requestCode || null,
                timestamp: new Date()
                  .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false })
                  .replace('T', ' '),
              },
              data: data,
            };
            /* ★ v1.11.2 — MCI 컨트롤러가 돌려주는 { data, mciMessage, meta } 에서 data 만 살아남고
               나머지는 버려지고 있었다. MCI 메시지 코드·처리 시간·건수(afiReptNtm)는 header 로 올린다. */
            if (result && typeof result === 'object' && result.data !== undefined) {
              if (result.mciMessage && typeof result.mciMessage === 'object') output.header.mci = result.mciMessage;
              if (result.meta && typeof result.meta === 'object') output.header.meta = result.meta;
            }
          }
          res.json(output);
        }
      } catch (err) {
        next(err);
      }
    });

    logger.info(`[Route] ${r.method.toUpperCase().padEnd(6)} ${fullPath}  →  ${Ctor.name}.${r.handler}`);
  }

  return { router, basePath, routes };
}

/* 등록된 라우터를 app 또는 Router 의 스택에서 제거 */
function _unregisterRouter(target, router) {
  // Express 5: app.router.stack / Express 4: app._router.stack / Router: stack
  const stack = target.router?.stack || target._router?.stack || target.stack;
  if (!stack) return false;
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].handle === router) {
      stack.splice(i, 1);
      return true;
    }
  }
  return false;
}

/* 임의 디렉토리에서 서비스 파일 로드 */
/**
 * ★ v1.28.0 — **서비스 파일 하나만** 올린다.
 *
 *  `loadServices()` 는 폴더 전체를 다시 읽는다. 고치지 않은 서비스까지 새 인스턴스가 되므로,
 *  "이것 하나만" 을 원할 때는 쓸 수 없었다.
 *
 *  ⚠ 같은 파일을 다시 올릴 때 — ESM 은 한 번 import 한 모듈을 캐시한다.
 *    그래서 URL 뒤에 타임스탬프를 붙여 **새로 읽게** 한다(콘솔의 hot-reload 와 같은 수법).
 * @param {string} file  서비스 파일의 절대 경로
 */
export async function loadSingleServiceFile(file) {
  const baseName = path.basename(file).replace(/\.(m?js|ts)$/i, '');
  if (isBlocked('services', baseName)) {
    throw Object.assign(new Error(`${baseName} 은 막혀 있어 올릴 수 없습니다`), { status: 409 });
  }
  const url = `${pathToFileURL(file).href}?t=${Date.now()}`;
  await import(url);
  logger.info(`[Service] 개별 로드: ${baseName}`);
  return { name: baseName };
}

export async function loadServicesFromDir(dir) {
  const files = walk(dir);
  for (const file of files) {
    const baseName = path.basename(file).replace(/\.(m?js|ts)$/i, '');
    if (isBlocked('services', baseName)) {   // ★ v1.13.0
      const info = blockInfo('services', baseName);
      logger.warn(`[Service] ⛔ ${baseName} 은 막혀 있어 로드하지 않습니다${info?.reason ? ` — ${info.reason}` : ''}`);
      blockedAtBoot.push({ kind: 'service', name: baseName, reason: info?.reason || '' });
      continue;
    }
    try {
      await import(pathToFileURL(file).href);
      logger.debug(`[Service] import: ${path.relative(projectRoot, file).replace(/\\/g, '/')}`);
    } catch (e) {
      /* ★ v1.11.1 — 사용자가 만든 파일 하나가 깨졌다고 서버가 통째로 안 뜨면 안 된다.
         예전에는 작업 폴더의 서비스 하나가 import 에 실패하면 "서버 부팅 실패" 로 끝났다.
         이제 그 파일만 건너뛰고 이유를 남긴다 — 그 서비스를 쓰는 컨트롤러는 호출 때 [DI] 오류가 난다. */
      logger.error(`[Service] import 실패 — 이 파일을 건너뜁니다: ${path.relative(projectRoot, file).replace(/\\/g, '/')}: ${e.message}`);
      bootProblems.push({ kind: 'service', file, message: e.message });
    }
  }
}

/** ★ v1.11.1 — 기동 때 건너뛴 파일들 (기동 요약·/health/ready 에 보여 준다) */
export const bootProblems = [];

/**
 * ★ v1.10.42 — 설정된 **모든 폴더**에서 서비스를 읽는다.
 *  작업 폴더(APP_WORKSPACE)가 있으면 그것도 함께. 순서는 기본 → 작업 폴더라,
 *  같은 이름이면 **내가 만든 것이 이긴다**.
 */
export async function loadServices() {
  for (const dir of existingDirs('services')) {
    await loadServicesFromDir(dir);
  }
}

/** 기동할 때 막혀 있어 건너뛴 것들 — 대시보드·헬스에서 보여 준다 */
export const blockedAtBoot = [];

/* 임의 디렉토리에서 컨트롤러 파일 로드 */
export async function loadControllersFromDir(app, dir) {
  const files = walk(dir);
  for (const file of files) {
    /* ★ v1.13.0 — 막아 둔 컨트롤러는 **읽지 않는다**. 운영 중에 내린 것이 재기동으로 되살아나면
       막은 의미가 없다(감시가 새벽에 재기동하는 순간 구멍이 다시 열린다). */
    const baseName = path.basename(file).replace(/\.(m?js|ts)$/i, '');
    if (isBlocked('controllers', baseName)) {
      const info = blockInfo('controllers', baseName);
      logger.warn(`[Controller] ⛔ ${baseName} 은 막혀 있어 로드하지 않습니다${info?.reason ? ` — ${info.reason}` : ''}`);
      blockedAtBoot.push({ kind: 'controller', name: baseName, reason: info?.reason || '' });
      continue;
    }
    try {
      await loadSingleControllerFile(app, file);
    } catch (e) {
      // ★ v1.11.1 — 컨트롤러 파일 하나가 깨져도 나머지는 뜬다 (loadSingleControllerFile 이 이미 로그를 남겼다)
      bootProblems.push({ kind: 'controller', file, message: e.message });
    }
  }
}

/** ★ v1.10.42 — 설정된 모든 폴더에서 컨트롤러를 읽는다 (작업 폴더 포함) */
export async function loadControllers(app) {
  for (const dir of existingDirs('controllers')) {
    await loadControllersFromDir(app, dir);
  }
}

/* 단일 파일을 (재)로딩하고 라우터에 등록 */
export async function loadSingleControllerFile(app, file) {
  let mod;
  try {
    mod = await import(bustImport(file));
  } catch (e) {
    logger.error(`[Controller] import 실패: ${file}: ${e.message}`);
    throw e;
  }
  const Ctor = mod.default;
  if (!Ctor || typeof Ctor !== 'function') {
    logger.warn(`[Controller] default export 가 클래스가 아님: ${file}`);
    return null;
  }
  if (!Ctor[META.IS_CONTROLLER]) {
    logger.warn(`[Controller] @Controller 가 붙지 않음: ${Ctor.name}`);
    return null;
  }

  const basePath = Ctor[META.BASE_PATH] || '';

  // 같은 basePath 의 기존 라우터가 있으면 제거 (hot-reload)
  const prev = registeredControllers.get(basePath);
  if (prev) {
    // dynamicRouter 와 app 양쪽에서 제거 시도
    _unregisterRouter(dynamicRouter, prev.router);
    _unregisterRouter(app, prev.router);
    logger.info(`[Controller] hot-reload: ${prev.ctor.name} 제거 (basePath=${basePath})`);
  }

  const built = _buildRouter(Ctor, file);
  if (!built) {
    logger.warn(`[Controller] 라우트가 없음: ${Ctor.name}`);
    return null;
  }

  // ★ dynamicRouter 에 등록 (404 핸들러 이전에 위치하므로 동적 추가도 정상 접근 가능)
  dynamicRouter.use(built.basePath || '/', built.router);
  registeredControllers.set(basePath, { router: built.router, ctor: Ctor, file });
  return { Ctor, basePath, file };
}

/** 등록된 모든 컨트롤러 정보 조회 (admin UI 용) */
/**
 * 등록된 컨트롤러를 basePath 로 찾아 라우터에서 뺀다.
 * (콘솔에서 컨트롤러를 지우거나 다시 올릴 때 쓴다)
 */
export function unregisterControllerByBasePath(app, basePath) {
  const prev = registeredControllers.get(basePath);
  if (!prev) return false;
  _unregisterRouter(dynamicRouter, prev.router);
  if (app) _unregisterRouter(app, prev.router);
  registeredControllers.delete(basePath);
  logger.info(`[Controller] 등록 해제: ${prev.ctor?.name || '?'} (basePath=${basePath})`);
  return true;
}

export function listRegisteredControllers() {
  const out = [];
  for (const [basePath, info] of registeredControllers.entries()) {
    out.push({
      name: info.ctor.name,
      basePath,
      file: info.file,
      routes: (info.ctor[META.ROUTES] || []).map((r) => ({
        method: r.method,
        path: r.path,
        handler: r.handler,
        sse: !!info.ctor.__sse?.[r.handler],
        guard: info.ctor.__guards?.[r.handler] || null,
      })),
    });
  }
  return out;
}

