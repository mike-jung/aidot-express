/**
 * consoleAccess.js — 관리 콘솔을 이 기기에서만 열도록 제한한다.
 *
 *   .env 의 CONSOLE_ACCESS (config.security.consoleAccess)
 *     all   (기본) 어디서나 연다 — 지금까지의 동작
 *     local 서버가 도는 기기에서 온 요청에만 연다
 *
 * 무엇이 "콘솔" 인가
 *   - /api/admin/*        콘솔 API (lib/admin 컨트롤러)
 *   - 그 외 SPA 경로       콘솔 화면 (admin-client/dist)
 *
 *   업무 API(/api/...), /health, /public, /uploads 는 콘솔이 아니므로 제한하지
 *   않는다. 구분 기준은 server.js 의 SPA 폴백과 같게 맞춰 두었다 — 한쪽만 바뀌면
 *   화면은 뜨는데 API 가 막히는 식으로 어긋난다.
 *
 * 막을 때는 403 이 아니라 404 로 답한다. 콘솔이 거기 있다는 사실 자체를
 * 알려 줄 이유가 없다.
 */

const LOOPBACK_V4 = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

/** 'x.x.x.x' 또는 IPv6 주소가 루프백인지. */
export function isLoopbackAddress(value) {
  const raw = String(value || '');
  const address = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
  return address === '::1' || LOOPBACK_V4.test(address);
}

/**
 * 요청이 이 기기 안에서 온 것인지.
 *
 *  trustProxy 가 켜져 있으면 프록시가 붙인 전달 헤더를 믿어도 되는 구성이므로
 *  express 가 계산한 req.ip 를 본다. 꺼져 있는데 전달 헤더가 붙어 있으면 프록시를
 *  거쳐 온 요청이라는 뜻이니 로컬로 보지 않는다 — 리버스 프록시 뒤에서는 모든
 *  요청의 소켓 주소가 127.0.0.1 로 보이기 때문에, 그것만 믿으면 "로컬 전용" 이
 *  아무도 막지 못하는 설정이 되어 버린다.
 */
export function isLocalRequest(req, trustProxy) {
  if (trustProxy) return isLoopbackAddress(req.ip);
  if (req.headers?.['x-forwarded-for'] || req.headers?.['forwarded']) return false;
  return isLoopbackAddress(req.socket?.remoteAddress);
}

/** 관리 콘솔에 속한 경로인지. server.js 의 SPA 폴백 분기와 같은 기준이다. */
export function isConsolePath(pathname) {
  const p = String(pathname || '');
  if (p === '/api/admin' || p.startsWith('/api/admin/')) return true;   // 콘솔 API
  if (p.startsWith('/api/')) return false;                              // 업무 API
  if (p === '/health' || p.startsWith('/health/')) return false;
  if (p.startsWith('/public/')) return false;
  if (p.startsWith('/uploads/')) return false;
  return true;                                                          // 콘솔 화면(SPA)
}

/**
 * express 미들웨어. 라우트와 정적 파일보다 앞에 붙여야 한다.
 * @param {object} config
 */
export function consoleAccessGuard(config) {
  const mode = String(config?.security?.consoleAccess ?? 'all');
  if (!['all', 'local'].includes(mode)) {
    throw new Error(`CONSOLE_ACCESS must be 'all' or 'local' (got '${mode}')`);
  }
  const trustProxy = Boolean(config?.server?.trustProxy);

  // 기본값이면 아무것도 하지 않는다 — 요청마다 도는 코드를 늘리지 않으려는 것이다.
  if (mode === 'all') return (_req, _res, next) => next();

  return (req, res, next) => {
    if (!isConsolePath(req.path) || isLocalRequest(req, trustProxy)) return next();
    res.status(404).json({ code: 404, message: 'Not Found' });
  };
}

export default consoleAccessGuard;
