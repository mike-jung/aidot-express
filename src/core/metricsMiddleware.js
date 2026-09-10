/**
 * metricsMiddleware.js — 모든 HTTP 요청의 응답시간/상태를 metrics 에 기록.
 *
 *  핵심:
 *   - res 완료(finish/close) 직후 한 번만 기록
 *   - 헬스체크 등 노이즈 경로는 skipPaths 로 제외 가능
 *   - static 파일은 skip (확장자 기반 판별)
 *   - 라우트별 집계:
 *      · req._metricsRoute 에 { controller, handler } 가 있으면 그것을 사용
 *        (controllerLoader 가 라우트 매칭 시 세팅)
 *      · 없으면 req.route?.path + req.baseUrl 조합으로 path key 생성
 *   - admin 엔드포인트(/api/admin/*)는 컨트롤러별 통계에 포함하지 않음
 *     → 사용자 로직 모니터링이 admin UI 폴링에 의해 왜곡되는 것 방지
 *   - access_logs 적재:
 *      · AccessLogService (lazy resolve) 의 enqueueAccess() 로 비동기 배치 insert
 *      · req.user (JWT 해석 후 라우트 핸들러가 세팅) 로 user_id / username 추출
 */
import metrics from './metrics.js';
import { verifyAccessToken } from './tokens.js';   // ★ v1.13.2 기록용 사용자 식별
import container from './container.js';

const STATIC_EXT_RE = /\.(?:css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot)$/i;
const ADMIN_PREFIX_RE = /^\/api\/admin\//;

/**
 * access_logs 에 반드시 기록해야 하는 "감사 대상" 요청 판별.
 * admin 요청은 기본적으로 access_logs 에 쌓지 않지만, 아래 경로는 예외로 기록한다:
 *   - 로그인 / 로그아웃 / 전체 로그아웃 / refresh
 *   - 서버 Start / Stop / Restart (control API)
 */
const AUDITED_ADMIN_RE = /^(?:\/api\/auth\/(?:login|logout|logout-all|refresh)|\/api\/auth2\/(?:login|logout|logout-all|refresh)|\/api\/admin\/auth\/(?:login|logout|logout-all|refresh)|\/api\/control\/(?:start|stop|restart))(?:[/?]|$)/;

/* ★ v1.13.2 — 접속 통계에 남기지 않을 "기반 시설" 요청.
     헬스체크·브라우저가 알아서 부르는 것·콘솔 화면(SPA) 이동·정적 파일은
     "누가 어떤 기능을 썼나" 와 아무 관계가 없다. 예전에는 /health/live 만 781건이
     [경로별] 맨 위를 차지했다(실제 화면 캡처). 쌓이지 않게 처음부터 걸러 낸다. */
const INFRA_PREFIXES = ['/health', '/favicon', '/.well-known/', '/assets/', '/public/', '/vendor/', '/robots.txt', '/manifest.json'];
function isInfraPath(path) {
  if (INFRA_PREFIXES.some((p) => path === p || path.startsWith(p))) return true;
  if (STATIC_EXT_RE.test(path) && !path.startsWith("/api/")) return true;   // 정적 파일
  return false;
}

function shouldLogAccess(originalUrl, req) {
  // path + query 에서 path 부분만 추출
  const path = originalUrl.split('?')[0];
  if (isInfraPath(path)) return false;
  /* 콘솔 화면 자체를 여는 요청(/controllers · /access-stats …) — 브라우저가 HTML 을 받아 가는 것이라
     API 호출이 아니다. 컨트롤러에 걸리지 않은 HTML 요청이면 기록하지 않는다. */
  /* ★ v1.15.2 — 이중화 하트비트는 **기계끼리 1초마다 주고받는 내부 통신**이다.
     업무 통계에 섞이면 다른 요청이 전부 묻힌다(상세 보기를 열었더니 50건이 전부 이것이었다).
     이중화가 켜져 있을 때만 생기는 것이라 놓치기도 쉽다. */
  if (path.startsWith('/api/ha/')) return false;
  if (!path.startsWith('/api/') && !req?._metricsRouteInfo
      && /text\/html/i.test(String(req?.headers?.accept || ''))) return false;
  if (!ADMIN_PREFIX_RE.test(path) && !path.startsWith('/api/auth') && !path.startsWith('/api/auth2') && !path.startsWith('/api/control')) {
    // 비 admin 일반 API — 전부 기록
    return true;
  }
  // admin/auth/control 권역 — 감사 대상 경로만 기록
  return AUDITED_ADMIN_RE.test(path);
}

// AccessLogService 는 lazy 로 한 번만 resolve (부팅 순서 이슈 회피)
let _accessSvc = null;
let _accessTried = false;
function getAccessService() {
  if (_accessSvc) return _accessSvc;
  if (_accessTried) return null;
  _accessTried = true;
  try {
    if (container.has('AccessLogService')) {
      _accessSvc = container.resolve('AccessLogService');
    }
  } catch { /* noop */ }
  return _accessSvc;
}

/** req 에서 클라이언트 IP 추출 (trust proxy 고려) */
function extractIp(req) {
  // express 가 trust proxy 설정에 따라 계산한 값이 req.ip 에 들어있음
  return req.ip || req.socket?.remoteAddress || null;
}

function extractUserAgent(req) {
  const ua = req.headers?.['user-agent'];
  if (!ua) return null;
  return String(ua).slice(0, 255);
}

/** URL 쿼리에 실린 토큰/키를 로그 저장 전에 가린다 (SSE 의 ?access_token= 등) */
const SECRET_QS_RE = /([?&](?:access_token|token|ticket|api_?key|secret|password|passphrase|HTTPS_KEY_PASSPHRASE)=)[^&#]*/gi;
function redactSecrets(url) {
  return String(url || '').replace(SECRET_QS_RE, '$1***');
}

export function metricsMiddleware(opts = {}) {
  const skipPaths = new Set(opts.skipPaths || ['/health', '/favicon.ico']);
  const skipStatic = opts.skipStatic !== false;

  return function metricsMw(req, res, next) {
    // 빠른 제외 (기록 오버헤드 줄이기)
    if (skipPaths.has(req.path)) return next();
    if (skipStatic && STATIC_EXT_RE.test(req.path)) return next();

    const start = process.hrtime.bigint();
    let recorded = false;

    const onDone = () => {
      if (recorded) return;
      recorded = true;
      // SSE 스트림은 "연결이 끊길 때" finish/close 가 발생한다. 그대로 기록하면 응답시간이
      // 수 분~수 시간으로 집계돼 라우트 평균이 망가지므로 집계에서 제외한다.
      if (req._sseStream) return;
      try {
        const endNs = process.hrtime.bigint();
        const ms = Number(endNs - start) / 1_000_000;
        const status = res.statusCode || 0;

        const originalUrl = req.originalUrl || req.url || '';
        const isAdmin = ADMIN_PREFIX_RE.test(originalUrl);

        // --- 1) metrics (인메모리 원형버퍼) ---
        let routeInfo = null;
        if (!isAdmin) {
          const tagged = req._metricsRouteInfo; // controllerLoader 가 세팅
          const matched = req.route?.path;
          const base = req.baseUrl || '';
          const path = tagged?.path || (matched ? base + matched : req.path);
          routeInfo = {
            controller: tagged?.controller || null,
            handler:    tagged?.handler    || null,
            method:     req.method,
            path,
          };
        }
        metrics.recordHttp(ms, status, routeInfo);

        // --- 2) access_logs (DB 저장, 배치 큐) ---
        // admin/auth/control 경로 중 감사 대상(로그인/로그아웃/서버 control) 만 기록.
        // 나머지 admin 조회성 API(모니터링/통계 폴링 등)는 access_logs 테이블에 쌓지 않음 —
        // DB 비대화 방지. (인메모리 metrics 에는 여전히 집계됨.)
        if (shouldLogAccess(originalUrl, req)) {
          const access = getAccessService();
          /* ★ v1.18.0 — 이 사람이 "아직 쓰고 있다" 를 세션에 남긴다.
             브라우저 종료는 서버가 알 수 없으므로, 이 흔적이 나중에
             "언제까지 썼나"(= 세션이 언제 끝났나)의 근거가 된다.
             자주 부르지만 서비스 쪽에서 1분에 한 번만 실제로 DB 를 건드린다. */
          const uid = req.user?.id ?? req.user?.userId ?? (req.user?.sub != null ? Number(req.user.sub) : null) ?? null;
          if (uid) access?.touchSession(uid, req.user?.username || null);
          if (access) {
            /* ★ v1.13.2 — 인증이 꺼진 라우트라도 **토큰이 있으면 누구인지 남긴다.**
               예전에는 @Auth 가드가 채운 req.user 만 봐서, 인증을 켜지 않은 업무 API 는
               [사용자별] 탭이 늘 비어 있었다(실제 화면 캡처). 요청 추적은 이미 같은 방식으로
               사용자를 붙이고 있었는데 접속 통계만 빠져 있었다.
               ⚠ 여기서 읽은 것으로 **권한을 주지는 않는다** — 기록에만 쓴다. */
            let user = req.user || null;
            if (!user) {
              const raw = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
              if (raw) { try { user = verifyAccessToken(raw); } catch { /* 기록용이라 조용히 */ } }
            }
            /* ★ v1.15.0 — 로그인 요청은 **인증되기 전**이라 토큰도 req.user 도 없다.
               그래서 [사용자별] 탭에는 "이름 없음" 으로 쌓였고, [로그인/세션] 탭의 로그인 5회와
               숫자가 맞지 않았다(실제로 5 vs 1 로 어긋난 사례).
               로그인에 성공한 경우에 한해 본문의 아이디를 기록에 쓴다. 성공(2xx)일 때만이라
               실패한 시도로 남의 이름을 남기지 않는다. */
            if (!user && status >= 200 && status < 300 && /\/auth\/login$/.test(originalUrl.split('?')[0])) {
              const name = req.body?.username;
              if (typeof name === 'string' && name.trim()) user = { username: name.trim().slice(0, 64) };
            }
            const tagged = req._metricsRouteInfo;
            const entry = {
              ts: new Date(),
              user_id:      user?.userId || user?.id || null,
              username:     user?.username || null,
              /* ★ v1.17.0 — 접속 통계의 한 줄에서 그 요청의 처리 과정으로 건너뛰기 위한 열쇠 */
              request_id: res.getHeader('X-Request-Id') || null,
              session_kind: isAdmin ? 'admin' : (user ? 'user' : null),
              method:       req.method,
              path:         redactSecrets(originalUrl),  // originalUrl 이 path+query (토큰류는 마스킹)
              route_key:    (tagged?.controller && tagged?.handler) ? `${tagged.controller}.${tagged.handler}` : null,
              controller:   tagged?.controller || null,
              handler:      tagged?.handler    || null,
              status,
              duration_ms:  Math.round(ms),
              ip:           extractIp(req),
              user_agent:   extractUserAgent(req),
            };
            access.enqueueAccess(entry);
          }
        }
      } catch { /* 메트릭 기록 실패로 실제 요청 처리 영향 없게 */ }
    };

    res.on('finish', onDone);
    res.on('close', onDone);
    next();
  };
}

export default metricsMiddleware;
