/**
 * 요청 상관 ID · 추적 수집 · 서술 복원 실행 검증. (v1.8.0)
 *   npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createContext, runWith, getContext, currentRequestId,
  setUser, setRoute, addStep, outboundHeaders,
} from '../src/core/requestContext.js';
import traceStore from '../src/core/traceStore.js';

/** 최소 Express Request 대역 */
function fakeReq(headers = {}, over = {}) {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    method: 'GET', originalUrl: '/api/admin/users/42', ip: '10.0.0.9',
    socket: { remoteAddress: '10.0.0.9' },
    get: (k) => h[String(k).toLowerCase()],
    ...over,
  };
}

/* ── 컨텍스트 생성 ──────────────────────────────────────────────────────── */

test('requestId 는 짧고, traceId 는 W3C 규격(32 hex)이다', () => {
  const ctx = createContext(fakeReq());
  assert.match(ctx.requestId, /^[0-9a-f]{8}$/, '사람이 전화로 불러 줄 수 있어야 한다');
  assert.match(ctx.traceId, /^[0-9a-f]{32}$/);
  assert.match(ctx.spanId, /^[0-9a-f]{16}$/);
});

test('앞단이 보낸 W3C traceparent 를 이어받는다', () => {
  const traceId = 'a'.repeat(32);
  const parent = 'b'.repeat(16);
  const ctx = createContext(fakeReq({ traceparent: `00-${traceId}-${parent}-01` }));
  assert.equal(ctx.traceId, traceId, '외부 게이트웨이와 같은 추적으로 묶여야 한다');
  assert.equal(ctx.parentSpanId, parent);
  assert.notEqual(ctx.spanId, parent, 'span 은 이 홉에서 새로 만든다');
});

test('망가진 traceparent 는 무시하고 새로 만든다', () => {
  for (const bad of ['garbage', '00-zzz-000-01', `00-${'0'.repeat(32)}-${'1'.repeat(16)}-01`]) {
    const ctx = createContext(fakeReq({ traceparent: bad }));
    assert.match(ctx.traceId, /^[0-9a-f]{32}$/);
    assert.notEqual(ctx.traceId, '0'.repeat(32), '전부 0 인 traceId 는 규격상 무효다');
  }
});

test('클라이언트가 준 X-Request-Id 는 존중하되 형식을 검사한다', () => {
  assert.equal(createContext(fakeReq({ 'x-request-id': 'my-retry-001' })).requestId, 'my-retry-001');
  const injected = createContext(fakeReq({ 'x-request-id': 'a; DROP TABLE x--' }));
  assert.match(injected.requestId, /^[0-9a-f]{8}$/, '이상한 값은 버리고 새로 만들어야 한다');
});

/* ── 컨텍스트 전파 ──────────────────────────────────────────────────────── */

test('await 를 건너도 컨텍스트가 유지된다', async () => {
  const ctx = createContext(fakeReq());
  await runWith(ctx, async () => {
    assert.equal(currentRequestId(), ctx.requestId);
    await new Promise((r) => setTimeout(r, 1));
    assert.equal(currentRequestId(), ctx.requestId, 'setTimeout 을 건너도 유지돼야 한다');
    await Promise.all([
      (async () => { await null; assert.equal(currentRequestId(), ctx.requestId); })(),
      (async () => { await null; assert.equal(currentRequestId(), ctx.requestId); })(),
    ]);
  });
});

test('동시에 흐르는 두 요청이 서로 섞이지 않는다', async () => {
  const a = createContext(fakeReq());
  const b = createContext(fakeReq());
  const seen = await Promise.all([
    runWith(a, async () => { await new Promise((r) => setTimeout(r, 5)); return currentRequestId(); }),
    runWith(b, async () => { await new Promise((r) => setTimeout(r, 1)); return currentRequestId(); }),
  ]);
  assert.deepEqual(seen, [a.requestId, b.requestId]);
});

test('컨텍스트 밖에서는 조용히 null — 던지지 않는다', () => {
  assert.equal(currentRequestId(), null, '부팅·스케줄러 로그가 여기서 깨지면 안 된다');
  assert.equal(getContext(), null);
  assert.doesNotThrow(() => addStep('sql', 'x'));   // 무시돼야 한다
  assert.deepEqual(outboundHeaders(), {});
});

/* ── 단계 기록 ──────────────────────────────────────────────────────────── */

test('단계가 순서대로 쌓이고 상대시간이 붙는다', () => {
  const ctx = createContext(fakeReq());
  runWith(ctx, () => {
    addStep('auth', 'admin');
    addStep('sql', 'book:findAll', { ms: 12, rows: 3 });
    addStep('sql', 'book:count', { ms: 2, rows: 1 });
  });
  assert.equal(ctx.steps.length, 3);
  assert.equal(ctx.steps[1].name, 'book:findAll');
  assert.equal(ctx.steps[1].rows, 3);
  assert.ok(ctx.steps.every((s) => typeof s.at === 'number' && s.at >= 0));
});

test('단계 수에 상한이 있어 폭주하는 반복문이 메모리를 먹지 않는다', () => {
  const ctx = createContext(fakeReq());
  runWith(ctx, () => { for (let i = 0; i < 500; i++) addStep('sql', `q${i}`); });
  assert.equal(ctx.steps.length, 200);
  assert.equal(ctx.truncated, true, '잘렸다는 사실이 화면에 표시돼야 한다');
});

test('outboundHeaders 는 W3C 형식으로 나간다', () => {
  const ctx = createContext(fakeReq());
  runWith(ctx, () => {
    const h = outboundHeaders();
    assert.match(h.traceparent, /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    assert.equal(h['X-Request-Id'], ctx.requestId);
  });
});

/* ── 개인정보 보호 ──────────────────────────────────────────────────────── */

test('경로의 식별자는 마스킹된다 — 추적 테이블이 유출 경로가 되면 안 된다', () => {
  assert.equal(traceStore.maskPath('/api/admin/users/42/unlock'), '/api/admin/users/:id/unlock');
  assert.equal(traceStore.maskPath('/api/patients/1234567'), '/api/patients/:id');
  assert.equal(traceStore.maskPath('/api/x/550e8400-e29b-41d4-a716-446655440000'), '/api/x/:uuid');
  assert.equal(traceStore.maskPath('/api/books?q=secret'), '/api/books', '질의 문자열은 통째로 버린다');
});

/* ── 서술 복원 ──────────────────────────────────────────────────────────── */

function recOf(over = {}) {
  const ctx = createContext(fakeReq({}, { method: over.method || 'GET', originalUrl: over.path || '/api/admin/controllers' }));
  runWith(ctx, () => {
    // anonymous: true 면 인증 단계 자체가 없는 요청을 재현한다 (setUser 를 부르지 않는다)
    if (!over.anonymous) setUser({ id: 1, username: 'admin', role: 'admin', kind: 'admin' });
    setRoute('/api/admin/controllers');
    addStep('auth', 'admin');
    addStep('sql', 'admin_meta:findPaged', { ms: 8, rows: over.rows ?? 18 });
  });
  return traceStore.finish(ctx, { status: over.status ?? 200 });
}

test('요청 한 건이 사람이 읽는 한 문장으로 요약된다', () => {
  const s = traceStore.describe(recOf()).ko;
  assert.match(s, /admin 님이/);
  assert.match(s, /컨트롤러/);
  assert.match(s, /조회했습니다/);
  assert.match(s, /성공/);
  assert.match(s, /SQL 1회/);
  assert.match(s, /18건/);
});

test('상태코드가 결과 문구로 번역된다', () => {
  assert.match(traceStore.describe(recOf({ status: 500 })).ko, /서버 오류 \(500\)/);
  assert.match(traceStore.describe(recOf({ status: 401 })).ko, /인증 실패/);
  assert.match(traceStore.describe(recOf({ status: 403 })).ko, /권한 없음/);
  assert.match(traceStore.describe(recOf({ status: 404 })).ko, /대상 없음/);
});

test('메서드가 동사로 번역된다 — DELETE 는 "삭제했습니다"', () => {
  assert.match(traceStore.describe(recOf({ method: 'DELETE' })).ko, /삭제했습니다/);
  assert.match(traceStore.describe(recOf({ method: 'POST' })).ko, /만들었습니다/);
  assert.match(traceStore.describe(recOf({ method: 'PUT' })).ko, /수정했습니다/);
});

test('로그인하지 않은 요청은 "익명 사용자" 로 표현된다', () => {
  assert.match(traceStore.describe(recOf({ anonymous: true })).ko, /익명 사용자가/);
});

test('narrate 는 시작과 끝을 포함한 줄 목록을 만든다', () => {
  const rec = recOf({ status: 200 });
  const lines = traceStore.narrate(rec);
  assert.ok(lines.length >= 4);
  assert.match(lines[0].text, /요청이 들어왔습니다/);
  assert.match(lines.at(-1).text, /200 응답으로 끝났습니다/);
  assert.equal(lines.at(-1).tone, 'ok');
  assert.ok(lines.some((l) => /SQL admin_meta:findPaged 실행 \(8ms\) → 18건/.test(l.text)));
  assert.ok(lines.every((l) => typeof l.at === 'number'), '폭포수와 같은 상대시간 축을 쓴다');
});

test('실패한 요청의 마지막 줄은 나쁜 톤으로 표시된다', () => {
  const lines = traceStore.narrate(recOf({ status: 500 }));
  assert.equal(lines.at(-1).tone, 'bad');
});

test('단계가 잘린 요청은 그 사실을 이야기에 남긴다', () => {
  const ctx = createContext(fakeReq());
  runWith(ctx, () => { for (let i = 0; i < 300; i++) addStep('sql', `q${i}`); });
  const rec = traceStore.finish(ctx, { status: 200 });
  assert.ok(traceStore.narrate(rec).some((l) => /상한 200/.test(l.text)));
});

/* ── 메모리 링버퍼 ──────────────────────────────────────────────────────── */

test('최근 요청은 DB 없이도 조회된다 (장애 순간이 정확히 필요하다)', () => {
  const rec = recOf();
  assert.equal(traceStore.findInMemory(rec.requestId)?.requestId, rec.requestId);
  assert.ok(traceStore.recentFromMemory(5).length > 0);
});

/* ── 한글 조사 ──────────────────────────────────────────────────────────── */

test('조사가 받침에 맞춰 선택된다 — "컨트롤러을(를)" 같은 기계 티를 없앤다', async () => {
  const { josa } = await import('../src/core/traceStore.js');
  assert.equal(josa('컨트롤러', '을/를'), '를');     // 받침 없음
  assert.equal(josa('사용자 관리', '을/를'), '를');   // '리' 받침 없음
  assert.equal(josa('로그인', '을/를'), '을');       // '인' 받침 있음
  assert.equal(josa('백업', '이/가'), '이');
  assert.equal(josa('서비스', '이/가'), '가');
  assert.equal(josa('/api/x', '을/를'), '을', '한글이 아니면 안전한 쪽');
});

test('요약 문장에 "을(를)" 같은 표기가 남지 않는다', () => {
  for (const p of ['/api/admin/controllers', '/api/admin/users', '/api/auth/login']) {
    const s = traceStore.describe(recOf({ path: p })).ko;
    assert.equal(/\(를\)|\(가\)|\(과\)/.test(s), false, `조사 미처리: ${s}`);
  }
});
