/**
 * 보안 유틸리티 모음.
 *
 * 1) Prototype Pollution 가드
 *    - JSON body 에 '__proto__', 'constructor', 'prototype' 같은 키가 있으면
 *      Node 객체의 prototype 체인을 오염시킬 수 있음.
 *    - `req.body`, `req.query` 를 재귀적으로 검사해 해당 키가 발견되면 400.
 *
 * 2) 안전한 JSON reviver (express.json 에 주입)
 *    - JSON.parse 단계에서 '__proto__' 키를 제거.
 *
 * 참고: OWASP ASVS V5.1.3, CWE-1321
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** 위험한 키가 포함된 객체인지 재귀 검사 */
export function hasPollutionKey(obj, depth = 0) {
  const stack = [[obj, depth]];
  const seen = new WeakSet();
  let keys = 0;
  while (stack.length) {
    const [value, level] = stack.pop();
    if (value === null || typeof value !== 'object') continue;
    if (level > 20 || seen.has(value)) return true;
    seen.add(value);
    for (const key of Object.keys(value)) {
      if (++keys > 100000 || DANGEROUS_KEYS.has(key)) return true;
      if (value[key] && typeof value[key] === 'object') stack.push([value[key], level + 1]);
    }
  }
  return false;
}

/** express.json({ reviver }) 에 넘길 reviver. __proto__ 키를 원천 제거. */
export function safeJsonReviver(key, value) {
  if (DANGEROUS_KEYS.has(key)) return undefined;
  return value;
}

/**
 * 미들웨어: query / body 에 prototype pollution 키가 있으면 400.
 * JSON reviver 로 1차 방어되지만, body-parser 외 경로(query 등)를 위한 2차 방어.
 */
export function pollutionGuard() {
  return (req, res, next) => {
    if (hasPollutionKey(req.body) || hasPollutionKey(req.query) || hasPollutionKey(req.params)) {
      return res.status(400).json({ ok: false, message: 'Invalid keys in request' });
    }
    next();
  };
}

/**
 * path-traversal 방어: express.static 은 이미 경로 탈출을 막지만,
 * 수동으로 파일을 다룰 때 `basename` 만 쓰도록 강제하는 헬퍼.
 */
export function safeBasename(name) {
  if (typeof name !== 'string') return '';
  // 디렉토리 구분자와 상위 경로 탈출 시도 제거
  return name.replace(/[/\\]/g, '').replace(/\.{2,}/g, '.');
}

/**
 * HTTP Parameter Pollution 방어 (hpp 대체).
 *  - hpp 0.2.x 는 `req.query = ...` 로 재할당하는데 Express 5 에서 req.query 는 getter 전용이라 TypeError 가 난다.
 *  - 같은 키가 여러 번 오면(?role=user&role=admin) 마지막 값만 남긴다 (hpp 기본 동작과 동일).
 *  - 화이트리스트 키는 배열을 유지한다 (예: ?ids=1&ids=2 를 의도적으로 쓰는 API).
 */
export function parameterPollutionGuard(opts = {}) {
  const whitelist = new Set(opts.whitelist || []);
  const dedupe = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    let changed = false;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v) && !whitelist.has(k)) { out[k] = v[v.length - 1]; changed = true; }
      else out[k] = v;
    }
    return changed ? out : obj;
  };
  return (req, _res, next) => {
    const q = dedupe(req.query);
    if (q !== req.query) {
      // Express 5: req.query 는 prototype getter → 인스턴스 속성으로 덮어쓴다 (재할당 불가)
      Object.defineProperty(req, 'query', { value: q, writable: true, configurable: true, enumerable: true });
    }
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      // urlencoded 본문도 동일 규칙 (JSON 본문의 배열은 정상 데이터이므로 건드리지 않음)
      if (req.is && req.is('application/x-www-form-urlencoded')) req.body = dedupe(req.body);
    }
    next();
  };
}

/**
 * 관리자 콘솔 API 의 :id (파일명) 파라미터 검증 — 경로 탈출(../) 방지.
 *  컨트롤러/서비스/SQL 메타 서비스는 `${id}.js` 로 파일을 찾으므로 식별자 문자만 허용한다.
 */
const SAFE_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{0,120}$/;
export function assertSafeId(id, label = 'id') {
  const v = String(id ?? '');
  if (!SAFE_ID_RE.test(v)) {
    throw Object.assign(new Error(`${label} 형식이 잘못되었습니다 (영문/숫자/_/- 만 허용): ${v.slice(0, 40)}`), { status: 400 });
  }
  return v;
}
