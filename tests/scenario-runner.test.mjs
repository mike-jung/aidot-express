/**
 * tests/scenario-runner.test.mjs — 시나리오 실행 엔진 (콘솔 [시나리오 테스트]) 단위 시험 (v1.11.6)
 *   fetch 를 가짜로 바꿔 순수하게 돌린다. 변수 치환 · 추출 · 검증(expectStatus/assertions) · stopOnFailure · 단계 대기
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { runScenario, runStep, matchStatus, evaluateAssertions } from '../admin-client/src/utils/scenarioRunner.js';
import { substituteVars, extractByPath } from '../admin-client/src/utils/scenarioUtils.js';

const calls = [];
function fakeFetch(map) {
  return async (url, init) => {
    calls.push({ url, init });
    const key = `${(init?.method || 'GET').toUpperCase()} ${url.split('?')[0]}`;
    const hit = map[key] || map[url] || { status: 404, body: { code: 404, message: 'not found' } };
    const text = typeof hit.body === 'string' ? hit.body : JSON.stringify(hit.body);
    return { ok: hit.status >= 200 && hit.status < 300, status: hit.status, statusText: '', headers: { get: () => hit.ct ?? 'application/json' }, text: async () => text };
  };
}
globalThis.performance ??= { now: () => Date.now() };

test('변수 치환과 경로 추출', () => {
  assert.equal(substituteVars('/api/books/${id}?q=${user.name}', { id: 7, user: { name: 'mike' } }), '/api/books/7?q=mike');
  assert.equal(substituteVars('${missing}', {}), '', '없는 변수는 빈 문자열');
  assert.equal(extractByPath({ data: [{ id: 3 }] }, 'data[0].id'), 3);
  assert.equal(extractByPath(null, 'a'), undefined);
});

test('matchStatus: 비우면 res.ok · 2xx · 목록', () => {
  assert.equal(matchStatus(200, '', true), true);
  assert.equal(matchStatus(500, '', false), false);
  assert.equal(matchStatus(201, '2xx', true), true);
  assert.equal(matchStatus(404, '4xx', false), true, '404 를 기대하면 통과');
  assert.equal(matchStatus(200, '201', true), false);
  assert.equal(matchStatus(201, '200, 201', true), true);
});

test('evaluateAssertions: 연산자들', () => {
  const parsed = { code: 200, data: { id: 5, name: '초코파이', tags: ['a', 'b'], list: [] } };
  const r = evaluateAssertions([
    { path: 'data.id', op: 'eq', value: '5' }, { path: 'data.name', op: 'contains', value: '초코' }, { path: 'data.id', op: 'gt', value: '3' },
    { path: 'data.tags', op: 'contains', value: 'b' }, { path: 'data.list', op: 'empty' }, { path: 'data.nope', op: 'exists' }, { path: 'data.name', op: 'matches', value: '^초.+이$' },
    { path: 'data.id', op: 'eq', value: '${want}' },
  ], parsed, { want: 5 });
  assert.deepEqual(r.map((x) => x.ok), [true, true, true, true, true, false, true, true]);
});

test('★ runScenario: 추출 → 다음 단계 치환, 검증 실패면 stopOnFailure, 4xx 기대는 통과', async () => {
  calls.length = 0;
  globalThis.fetch = fakeFetch({
    'POST /api/books': { status: 201, body: { code: 201, data: { insertId: 42 } } },
    'GET /api/books/42': { status: 200, body: { code: 200, data: { id: 42, title: 'x' } } },
    'GET /api/books/999': { status: 404, body: { code: 404, message: 'not found' } },
    'GET /api/empty': { status: 200, body: { code: 200, data: [] } },
  });
  const scenario = { inputVars: {}, defaultHeaders: { Authorization: 'Bearer t' }, steps: [
    { name: '만들기', method: 'POST', fullPath: '/api/books', body: '{"title":"x"}', extractions: [{ varName: 'id', jsonPath: 'data.insertId' }], expectStatus: '201' },
    { name: '읽기', method: 'GET', fullPath: '/api/books/${id}', assertions: [{ path: 'data.id', op: 'eq', value: '${id}' }, { path: 'data.title', op: 'exists' }] },
    { name: '없는 것', method: 'GET', fullPath: '/api/books/999', expectStatus: '404' },
    { name: '빈 목록은 실패', method: 'GET', fullPath: '/api/empty', assertions: [{ path: 'data', op: 'notEmpty' }] },
    { name: '여기는 안 옴', method: 'GET', fullPath: '/api/books/42' },
  ] };
  const r = await runScenario(scenario);
  assert.equal(r.vars.id, 42);
  assert.equal(r.stepResults[0].ok, true);
  assert.equal(r.stepResults[1].ok, true); assert.equal(r.stepResults[1].finalUrl, '/api/books/42');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer t', '기본 헤더가 붙는다');
  assert.equal(r.stepResults[2].ok, true, '404 를 기대했으니 통과');
  assert.equal(r.stepResults[3].ok, false); assert.equal(r.stepResults[3].httpOk, true, 'HTTP 는 200 이지만 검증 실패');
  assert.match(r.stepResults[3].error, /검증 실패 1건/);
  assert.equal(r.aborted, true); assert.equal(r.stepResults.length, 4, '검증 실패에서 멈춘다');
});

test('runStep: body JSON 오류 · JSON 이 아닌 응답 · 네트워크 오류', async () => {
  globalThis.fetch = fakeFetch({ 'GET /txt': { status: 200, body: 'plain text', ct: 'text/plain' } });
  const bad = await runStep({ method: 'POST', fullPath: '/x', body: '{not json' }, {}, {});
  assert.equal(bad.ok, false); assert.match(bad.error, /JSON 파싱 실패/);
  const txt = await runStep({ method: 'GET', fullPath: '/txt', extractions: [{ varName: 'v', jsonPath: 'a' }] }, {}, {});
  assert.equal(txt.ok, true); assert.equal(txt.extracted.v, undefined, 'JSON 이 아니면 추출값은 undefined');
  globalThis.fetch = async () => { throw new Error('ECONNREFUSED'); };
  const net = await runStep({ method: 'GET', fullPath: '/x' }, {}, {});
  assert.equal(net.ok, false); assert.match(net.error, /네트워크 오류/);
});
