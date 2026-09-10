import { sameOriginApiUrl } from './apiUrl.js';
/**
 * 시나리오 실행 엔진.
 *
 *  runScenario(scenario, { onStepStart, onStepEnd })
 *    - scenario.steps 를 순차 실행
 *    - 각 단계의 url/headers/body 에 ${var} 치환
 *    - 응답에서 extractions 정의대로 변수 추출 → 누적
 *    - stopOnFailure 단계가 실패하면 중단
 *
 *  반환: { vars, stepResults, aborted }
 */
import { substituteVars, substituteInObject, extractByPath } from './scenarioUtils.js';

/** 단일 단계 호출 — fetch 래핑, 변수 치환, 추출 */
export async function runStep(step, vars, defaultHeaders) {
  // URL / 헤더 / body 변수 치환
  const url = substituteVars(step.fullPath, vars);

  // path 파라미터는 step.fullPath 안의 :name 을 substituteVars 로 치환 못함
  // (placeholder 형식이 다름) — 시나리오에서는 ${} 형태로 직접 작성하도록 함.
  // 즉 시나리오 step 의 fullPath 는 '/api/students/${id}' 형태로 작성

  // 쿼리 파라미터 추가
  const qs = (step.queryParams || [])
    .filter((p) => p.key)
    .map((p) => {
      const k = substituteVars(p.key, vars);
      const v = substituteVars(p.value, vars);
      return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    })
    .join('&');
  const finalUrl = qs ? url + (url.includes('?') ? '&' : '?') + qs : url;

  // 헤더
  const h = { ...(defaultHeaders || {}) };
  for (const { key, value } of (step.headers || [])) {
    if (key) h[substituteVars(key, vars)] = substituteVars(value, vars);
  }

  // body
  let body = undefined;
  const supportsBody = ['POST', 'PUT', 'PATCH'].includes((step.method || '').toUpperCase());
  if (supportsBody && step.body && step.body.trim()) {
    body = substituteVars(step.body, vars);
    try {
      JSON.parse(body);  // 검증
    } catch (e) {
      return {
        ok: false,
        error: `Body JSON 파싱 실패: ${e.message}`,
        finalUrl,
      };
    }
    if (!h['Content-Type']) h['Content-Type'] = 'application/json';
  }

  const t0 = performance.now();
  let res, text;
  try {
    res = await fetch(sameOriginApiUrl(finalUrl), {
      method: step.method,
      headers: h,
      body,
      credentials: 'include',
      redirect: 'error',
    });
    text = await res.text();
  } catch (e) {
    return {
      ok: false,
      error: `네트워크 오류: ${e.message}`,
      finalUrl,
      timeMs: Math.round(performance.now() - t0),
    };
  }

  const ct = res.headers.get('content-type') || '';
  let parsed = null;
  let prettyBody = text;
  if (ct.includes('application/json')) {
    try {
      parsed = JSON.parse(text);
      prettyBody = JSON.stringify(parsed, null, 2);
    } catch { /* leave as text */ }
  }

  // 추출
  const extracted = {};
  for (const ex of (step.extractions || [])) {
    if (!ex.varName || !ex.jsonPath) continue;
    const val = extractByPath(parsed, ex.jsonPath);
    extracted[ex.varName] = val;
  }

  /* ★ v1.11.6 — 검증. 예전에는 HTTP 상태 2xx 면 "성공" 이라 200 OK 에 data 가 비어도 통과였다.
       expectStatus: 201 · '2xx' · '4xx' · '200,201'   (비우면 res.ok)
       assertions:  [{ path, op, value }]  op = exists | eq | ne | contains | gt | lt | matches | empty | notEmpty */
  const statusOk = matchStatus(res.status, step.expectStatus, res.ok);
  const assertionResults = evaluateAssertions(step.assertions, parsed, { ...vars, ...extracted });
  const allAssertOk = assertionResults.every((a) => a.ok);
  return {
    ok: statusOk && allAssertOk,
    httpOk: res.ok,
    statusOk,
    status: res.status,
    statusText: res.statusText,
    timeMs: Math.round(performance.now() - t0),
    finalUrl,
    requestBody: body,
    responseBody: prettyBody,
    parsed,
    extracted,
    assertionResults,
    error: !statusOk ? `기대한 상태 ${step.expectStatus || '2xx'} 가 아니라 ${res.status}` : (!allAssertOk ? `검증 실패 ${assertionResults.filter((a) => !a.ok).length}건` : undefined),
  };
}

/** 기대 상태 문자열과 실제 상태 비교. '' → res.ok, '2xx' → 200~299, '200,201' → 둘 중 하나 */
export function matchStatus(status, expect, resOk) {
  const e = String(expect ?? '').trim();
  if (!e) return !!resOk;
  return e.split(',').map((x) => x.trim()).filter(Boolean).some((x) => {
    const m = /^(\d)xx$/i.exec(x);
    if (m) return Math.floor(status / 100) === Number(m[1]);
    return Number(x) === status;
  });
}

/** 검증 규칙 평가 — 각 규칙의 결과를 돌려준다 (화면에 하나씩 보여 주기 위해) */
export function evaluateAssertions(assertions, parsed, vars) {
  const out = [];
  for (const a of (assertions || [])) {
    if (!a || !a.path) continue;
    const actual = extractByPath(parsed, a.path);
    const expected = typeof a.value === 'string' ? substituteVars(a.value, vars) : a.value;
    const op = a.op || 'exists';
    let ok = false;
    const num = (v) => (typeof v === 'number' ? v : Number(v));
    switch (op) {
      case 'exists':   ok = actual !== undefined && actual !== null; break;
      case 'empty':    ok = actual === undefined || actual === null || actual === '' || (Array.isArray(actual) && actual.length === 0); break;
      case 'notEmpty': ok = !(actual === undefined || actual === null || actual === '' || (Array.isArray(actual) && actual.length === 0)); break;
      case 'eq':       ok = String(actual) === String(expected); break;
      case 'ne':       ok = String(actual) !== String(expected); break;
      case 'contains': ok = Array.isArray(actual) ? actual.some((x) => String(x) === String(expected)) : String(actual ?? '').includes(String(expected ?? '')); break;
      case 'gt':       ok = Number.isFinite(num(actual)) && num(actual) > num(expected); break;
      case 'lt':       ok = Number.isFinite(num(actual)) && num(actual) < num(expected); break;
      case 'matches':  try { ok = new RegExp(String(expected)).test(String(actual ?? '')); } catch { ok = false; } break;
      default:         ok = false;
    }
    out.push({ path: a.path, op, expected, actual: typeof actual === 'object' && actual !== null ? JSON.stringify(actual).slice(0, 200) : actual, ok });
  }
  return out;
}

/**
 * 시나리오 전체 실행.
 *
 *  scenario:
 *    inputVars: 시작 시 변수 (object)
 *    defaultHeaders: 모든 단계에 기본 적용할 헤더
 *    steps: [{ name, method, fullPath, queryParams, headers, body, extractions, stopOnFailure }]
 *
 *  callbacks:
 *    onStepStart(idx, step)
 *    onStepEnd(idx, step, result, varsAfter)
 */
export async function runScenario(scenario, callbacks = {}) {
  const vars = { ...(scenario.inputVars || {}) };
  const stepResults = [];
  let aborted = false;

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    callbacks.onStepStart?.(i, step);

    const result = await runStep(step, vars, scenario.defaultHeaders);
    stepResults.push(result);

    // 추출된 변수 vars 에 머지
    if (result.extracted) {
      Object.assign(vars, result.extracted);
    }

    callbacks.onStepEnd?.(i, step, result, { ...vars });

    if (!result.ok && step.stopOnFailure !== false) {
      aborted = true;
      break;
    }
    if (step.delayMs > 0) await new Promise((r) => setTimeout(r, Math.min(Number(step.delayMs) || 0, 60_000)));   // ★ v1.11.6 단계 사이 대기
  }

  return { vars, stepResults, aborted };
}
