/**
 * 요청 추적 단계 확장. (v1.10.35)
 *
 * ## 문제
 * `addStep()` 을 부르는 곳이 **`db.js` 하나뿐**이었다. 그래서 [요청 추적]
 * 상세를 열어도 SQL 한 줄만 보였고, 어느 핸들러가 받았는지·응답이 뭐였는지·
 * 어디서 막혔는지가 없어 결국 로그 파일을 뒤지게 됐다.
 *
 * 화면이 없는 게 아니라 **담긴 내용이 반쪽**이었다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('★ 요청이 지나는 길목마다 단계를 남긴다', () => {
  const loader = read('src/core/controllerLoader.js');
  const deco = read('src/core/decorators.js');
  const db = read('src/database/db.js');
  assert.match(loader, /addStep\('controller'/, '컨트롤러 진입이 없다');
  assert.match(loader, /addStep\('error'/, '실패 응답이 없다');
  assert.match(loader, /addStep\('note', `응답/, '응답 모양이 없다');
  assert.match(deco, /addStep\('service'/, '서비스 호출이 없다');
  assert.match(db, /addStep\('sql'/, 'SQL 이 없다');
});

test('★ 실패 응답은 한 곳에서 잡는다', () => {
  // 거부 지점이 여덟 곳이 넘는다 — 하나씩 붙이면 반드시 빠뜨린다
  const loader = read('src/core/controllerLoader.js');
  assert.match(loader, /function traceFailures\(res\)/);
  assert.match(loader, /traceFailures\(res\);/, '라우트에서 감싸지 않았다');
  // res.status(4xx) 와 body.code 둘 다 본다
  assert.match(loader, /code >= 400/);
});

test('★ 서비스는 주입 지점에서 감싼다 — 기존 파일을 안 고친다', () => {
  const deco = read('src/core/decorators.js');
  // 생성 코드에 넣으면 이미 만들어 둔 서비스는 그대로다 (v1.10.31 교훈)
  assert.match(deco, /function traceService\(/);
  assert.match(deco, /container\.resolve\(resolved\)/);
  assert.match(deco, /traceService\(svc, resolved\)/);
});

test('비동기 서비스는 끝난 뒤에 시간을 잰다', () => {
  const deco = read('src/core/decorators.js');
  // 프라미스를 그냥 반환하면 항상 0ms 로 찍힌다
  assert.match(deco, /typeof out\.then === 'function'/);
});

test('추적이 실패해도 원래 호출은 진행된다', () => {
  const deco = read('src/core/decorators.js');
  // 추적이 기능을 깨면 안 된다
  assert.match(deco, /try \{ return traceService\(svc, resolved\); \} catch \{ return svc; \}/);
});

test('★ 자기 자신을 기록하지 않는다 — 되먹임', () => {
  const db = read('src/database/db.js');
  /* 요청 추적이 단계를 DB 에 적으면(admin_trace:insertStep) 그 INSERT 가 다시
     단계가 되고, 그게 또 INSERT 를 부른다. 실제로 로그인 한 번에 단계가
     191개까지 불어났다. */
  assert.match(db, /if \(framework\) return;/, '프레임워크 SQL 을 걸러야 한다');
  // 걸러내는 판정은 v1.10.26 의 것을 그대로 쓴다
  assert.match(db, /const framework = isAdminSql\(sql\)/);
});

test('단계 수에 상한이 있다', () => {
  const ctx = read('src/core/requestContext.js');
  // 되먹임을 막아도, 반복문 안에서 쿼리를 돌리면 여전히 커질 수 있다
  assert.match(ctx, /MAX_STEPS/);
  assert.match(ctx, /ctx\.truncated = true/);
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.36 — "내 요청만" 이 성립하려면 세 가지가 다 되어야 한다.
   하나라도 빠지면 토글을 켰을 때 목록이 빈다 — 실제로 셋 다 빠져 있었다.
   ══════════════════════════════════════════════════════════════════════════ */

test('★ ① 요청에 누가 보냈는지 붙는다', () => {
  const loader = read('src/core/controllerLoader.js');
  // setUser() 를 부르는 곳이 아예 없어 username 이 전부 null 이었다
  assert.match(loader, /setUser\(req\.user\)/);
  assert.match(loader, /import \{ addStep, setUser \}/);
});

test('★ ② 인증이 꺼진 라우트도 사용자를 기록한다', () => {
  const loader = read('src/core/controllerLoader.js');
  /* @Auth 가드 안에서만 토큰을 읽어, /api/books 처럼 인증을 끈 라우트는
     토큰을 보내도 username 이 null 이었다. */
  assert.match(loader, /setUser\(verifyAccessToken\(raw\)\)/);
  // ⚠ 추적용일 뿐 권한을 주지 않는다 — req.user 를 덮어쓰면 인증이 뚫린다
  assert.equal(/req\.user = verifyAccessToken/.test(loader), false,
    '추적용 해석이 req.user 를 덮어쓰면 안 된다');
});

test('★ ③ 로그인한 사람의 빠른 GET 도 저장한다', () => {
  const store = read('src/core/traceStore.js');
  /* 빠른 GET 을 전부 거르면(표가 잡음으로 차니 타당하다) "방금 내가 보낸
     요청" 이 목록에 없다. 개발자가 이 화면을 쓰는 가장 흔한 이유가 그것이다. */
  assert.match(store, /if \(rec\.username\) return true;/);
  // 익명 요청은 그대로 걸러져야 한다 — 잡음의 대부분이다
  assert.match(store, /return \(t\.sampleGet \?\? false\);/);
});

test('목록 기본값이 내 요청만이다', () => {
  const ui = read('admin-client/src/views/TraceExplorer.vue');
  assert.match(ui, /const filters = ref\(\{ username: myName\.value/);
  assert.match(ui, /const onlyMine = computed\(\{/);
  assert.match(ui, /useAuthStore/, 'auth 스토어를 import 해야 한다');
});

test('실패 이유를 목록에 보여 준다', () => {
  const ui = read('admin-client/src/views/TraceExplorer.vue');
  // 클릭하지 않고도 무엇이 잘못됐는지 알아야 목록이 쓸모 있다
  assert.match(ui, /function failReason\(r\)/);
  assert.match(ui, /r\.status >= 400/);
});

test('상세에서 로그 탐색으로 넘어갈 수 있다', () => {
  const ui = read('admin-client/src/views/TraceExplorer.vue');
  assert.match(ui, /function openInLogs\(requestId\)/);
  // ★ v1.11.3 — 본문 검색(q)이 아니라 요청 ID 조건으로 넘긴다. 로그 탐색은 route.query.requestId 를 읽는다.
  assert.match(ui, /router\.push\(\{ name: 'logs', query: \{ requestId \} \}\)/);
  const logs = read('admin-client/src/views/LogExplorer.vue');
  assert.match(logs, /route\.query\.requestId/, '로그 탐색이 넘어온 요청 ID 를 읽어야 한다');
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.37 — 상세를 읽을 수 있게
   ══════════════════════════════════════════════════════════════════════════ */

test('★ 처음 열면 내 요청이 보인다', () => {
  const ui = read('admin-client/src/views/TraceExplorer.vue');
  /* 진입하자마자 preset('server-errors') 가 걸려 `상태 ≥ 500` 으로 좁혀졌다.
     그래서 "내 요청만" 토글을 켜 놔도 목록이 늘 비어 보였다. */
  assert.equal(/else preset\('server-errors'\);/.test(ui), false,
    '진입 시 오류 필터가 걸리면 내 요청이 안 보인다');
  assert.match(ui, /else search\(\);/);
});

test('★ 없는 함수를 부르지 않는다', () => {
  const ui = read('admin-client/src/views/TraceExplorer.vue');
  const script = /<script setup>([\s\S]*?)<\/script>/.exec(ui)[1];
  // load() 는 이 화면에 없다 — 부르면 조용히 아무 일도 안 일어난다
  const calls = [...script.matchAll(/(?<![.\w])(\w+)\(\)/g)].map((m) => m[1]);
  const declared = new Set([
    ...[...script.matchAll(/function (\w+)/g)].map((m) => m[1]),
    ...[...script.matchAll(/const (\w+) = (?:async )?\(/g)].map((m) => m[1]),
  ]);
  const known = new Set(['search', 'loadUsers', 'reset', 'lookup', 'preset', 'copyId']);
  for (const c of calls) {
    if (known.has(c)) assert.ok(declared.has(c) || known.has(c), `${c}() 가 선언되지 않았다`);
  }
  assert.equal(script.includes('load();'), false, 'load() 는 없는 함수다');
});

test('★ 완료 단계를 어색하게 서술하지 않는다', () => {
  const store = read('src/core/traceStore.js');
  /* 완료 단계를 `이름 완료` 로 넣었더니
     "…완료가 요청을 받았습니다" 라는 말이 안 되는 문장이 나왔다. */
  assert.match(store, /const done = \/완료\$\/\.test\(s\.name\)/);
  assert.match(store, /처리를 마쳤습니다/);
});

test('★ 영문 이름의 조사가 읽히게 붙는다', async () => {
  const { josa } = await import(path.join(ROOT, 'src/core/traceStore.js'));
  // 한글이 아니면 무조건 받침 있는 쪽을 써 `BookService을` 처럼 읽히지 않았다
  assert.equal(josa('BookService', '을/를'), '를', 'e 로 끝나면 받침 없음');
  assert.equal(josa('listPaged', '이/가'), '이', 'd 로 끝나면 받침 있음');
  // 한글은 그대로 정확해야 한다
  assert.equal(josa('조회', '을/를'), '를');
  assert.equal(josa('목록', '이/가'), '이');
});
