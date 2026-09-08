/**
 * 시나리오 테스트용 유틸리티.
 *
 *  1) substituteVars(str, vars)        — ${var} placeholder 치환
 *  2) substituteInObject(obj, vars)    — 객체/배열 안의 모든 문자열 치환
 *  3) extractByPath(obj, path)         — 'data.accessToken' / 'data[0].id' 형태 jsonpath 추출
 */

/** "Bearer ${token}" + { token: 'abc' } → "Bearer abc" */
export function substituteVars(str, vars) {
  if (typeof str !== 'string') return str;
  return str.replace(/\$\{([a-zA-Z_$][\w$.]*)\}/g, (_, key) => {
    const v = extractByPath(vars, key);
    if (v === undefined || v === null) return '';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  });
}

/** 객체 안의 모든 string 값에 substituteVars 재귀 적용 */
export function substituteInObject(obj, vars) {
  if (Array.isArray(obj)) return obj.map((x) => substituteInObject(x, vars));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = substituteInObject(v, vars);
    return out;
  }
  return substituteVars(obj, vars);
}

/**
 * 단순 jsonpath 추출. 외부 라이브러리 없이 구현.
 *  지원: 'a.b.c', 'a[0].b', 'a.b[2].c'
 */
export function extractByPath(obj, path) {
  if (obj == null) return undefined;
  if (!path) return obj;

  // 'a.b[0].c' → ['a', 'b', 0, 'c']
  const tokens = [];
  const re = /([a-zA-Z_$][\w$]*)|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) tokens.push(m[1]);
    else tokens.push(Number(m[2]));
  }

  let cur = obj;
  for (const t of tokens) {
    if (cur == null) return undefined;
    cur = cur[t];
  }
  return cur;
}
