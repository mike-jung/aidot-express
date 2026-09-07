/**
 * tests/blocklist.test.mjs — 컨트롤러·서비스·SQL 막기 (v1.13.0)
 *   "구멍이 뚫린 컨트롤러를 지금 내려야 하는데 서버 전체를 내릴 수는 없다"
 *   ① 막기/풀기 파일 조작 ② 기동할 때 건너뛴다 ③ 런타임에 라우트를 내린다 ④ API 권한
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import blocklist from '../src/core/blocklist.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function withCleanFile(fn) {
  const f = blocklist.BLOCKLIST_FILE;
  const before = fs.existsSync(f) ? fs.readFileSync(f) : null;
  try { return fn(); }
  finally { if (before) fs.writeFileSync(f, before); else fs.rmSync(f, { force: true }); blocklist.load({ force: true }); }
}

test('① 막기·풀기 — 파일에 남고 이름 규칙을 지킨다', () => {
  withCleanFile(() => {
    assert.equal(blocklist.isBlocked('controllers', 'XController'), false);
    const info = blocklist.block('controllers', 'XController', { reason: '구멍', by: 'admin' });
    assert.equal(info.reason, '구멍');
    assert.equal(blocklist.isBlocked('controllers', 'XController'), true);
    assert.equal(blocklist.isBlocked('controllers', 'XController.js'), true, '확장자가 붙어도 같은 것으로 본다');
    assert.equal(blocklist.isBlocked('services', 'XController'), false, '종류가 다르면 영향 없음');
    // 파일에 남는다 (재기동해도 유지되는 근거)
    const saved = JSON.parse(fs.readFileSync(blocklist.BLOCKLIST_FILE, 'utf8'));
    assert.equal(saved.controllers[0].name, 'XController');
    assert.equal(blocklist.unblock('controllers', 'XController'), true);
    assert.equal(blocklist.isBlocked('controllers', 'XController'), false);
    assert.throws(() => blocklist.block('controllers', '../../etc/passwd'), (e) => e.status === 400);
    assert.throws(() => blocklist.block('nope', 'X'), (e) => e.status === 400);
  });
});

test('② 깨진 blocklist 파일이 서버를 막지 않는다', () => {
  withCleanFile(() => {
    fs.writeFileSync(blocklist.BLOCKLIST_FILE, '{ not json');
    assert.deepEqual(blocklist.load({ force: true }), { controllers: [], services: [], sqls: [] },
      '막는 파일이 깨졌다고 기동이 실패하면 안 된다');
  });
});

test('③ 기동 로더가 막힌 것을 건너뛴다', () => {
  const loader = read('src/core/controllerLoader.js');
  assert.match(loader, /isBlocked\('controllers', baseName\)/);
  assert.match(loader, /isBlocked\('services', baseName\)/);
  assert.match(loader, /blockedAtBoot/);
  const sqlLoader = read('src/core/sqlLoader.js');
  assert.match(sqlLoader, /isBlocked\('sqls'/);
});

test('④ API — 조회는 로그인, 막기·풀기는 admin', () => {
  const ctrl = read('lib/admin/controller/BlocklistController.js');
  assert.match(ctrl, /@GetMapping\('\/'\)[\s\S]{0,40}@Auth\(\)/);
  assert.match(ctrl, /@PostMapping\('\/:kind\/:name'\)[\s\S]{0,40}@Roles\('admin'\)/);
  assert.match(ctrl, /@DeleteMapping\('\/:kind\/:name'\)[\s\S]{0,40}@Roles\('admin'\)/);
  assert.match(ctrl, /unregisterControllerByBasePath/, '지금 바로 라우트를 내린다');
  assert.match(ctrl, /this\.log\.warn\(`\[blocklist\]/, '누가 언제 막았는지 로그에 남는다');
});

test('⑤ 화면 — 세 목록에 잠금 버튼', () => {
  for (const f of ['admin-client/src/views/ControllerList.vue', 'admin-client/src/views/ServiceList.vue', 'admin-client/src/views/SqlList.vue']) {
    const ui = read(f);
    assert.match(ui, /useBlocklist/, f);
    assert.match(ui, /onToggleBlock/, f);
    assert.match(ui, /bi-lock-fill/, f);
  }
});

test('⑥ 접속 통계 — 컨트롤러별 · 엑셀', () => {
  const sql = read('lib/admin/database/sql/admin_access.sql');
  assert.match(sql, /-- @name: summaryByController/);
  assert.match(sql, /COUNT\(DISTINCT username\)\s+AS distinct_users/);
  const svc = read('lib/admin/service/AccessLogService.js');
  assert.match(svc, /async getSummaryByController/);
  assert.match(svc, /async exportXlsx/);
  assert.match(svc, /case 'byController'/);
  const ctrl = read('lib/admin/controller/AccessStatsController.js');
  assert.match(ctrl, /@GetMapping\('\/summary\/by-controller'\)/);
  assert.match(ctrl, /format \|\| ''\)\.toLowerCase\(\) === 'xlsx'/);
  const ui = read('admin-client/src/views/AccessStatsPage.vue');
  assert.match(ui, /by-controller/);
  assert.match(ui, /downloadXlsx/);
});

/* ══ v1.13.2 — 접속 통계에서 시스템 요청 걸러내기 · 사용자 남기기 ══ */
test('⑦ 기반 시설 요청은 접속 통계에 기록하지 않는다', () => {
  const mw = read('src/core/metricsMiddleware.js');
  assert.match(mw, /const INFRA_PREFIXES = \[/);
  for (const p of ["'/health'", "'/favicon'", "'/\\.well-known/'", "'/assets/'"]) {
    assert.ok(new RegExp(p).test(mw), `${p} 가 목록에 있어야 한다`);
  }
  assert.match(mw, /function isInfraPath/);
  assert.match(mw, /text\\\/html/, '콘솔 화면(SPA) 이동은 기록하지 않는다');
});

test('⑧ 인증이 꺼진 API 도 토큰이 있으면 누가 불렀는지 남긴다', () => {
  const mw = read('src/core/metricsMiddleware.js');
  assert.match(mw, /let user = req\.user \|\| null;/);
  assert.match(mw, /verifyAccessToken\(raw\)/);
  assert.match(mw, /권한을 주지는 않는다/, '기록용이라는 것이 코드에 적혀 있어야 한다');
});

test('⑨ "시스템 요청 제외" 는 관리 API 뿐 아니라 업무 API 가 아닌 것 전부', () => {
  const sql = read('lib/admin/database/sql/admin_access.sql');
  const cond = "(path LIKE '/api/%' AND path NOT LIKE '/api/admin/%')";
  assert.ok(sql.split(cond).length - 1 >= 3, `조건이 세 곳 이상 (지금 ${sql.split(cond).length - 1})`);
  assert.equal(/AND path NOT LIKE '\/api\/admin\/%'\s*$/m.test(sql), false, '옛 조건이 남아 있으면 안 된다');
  const ko = read('admin-client/src/locales/ko.js');
  assert.match(ko, /includeAdmin: '시스템 요청 포함 \(콘솔·헬스체크 등\)'/);
});

/* ══ v1.13.3 — EAI 메뉴 기본 숨김 · 용어 ══ */
test('⑩ EAI 메뉴는 기본으로 숨는다 (옛 이름도 받는다)', () => {
  const idx = read('src/config/index.js');
  /* ★ v1.17.2 — `??` 는 앞의 false 가 뒤를 가려서 옛 이름이 죽었다. 이제 OR 로 본다. */
  assert.match(idx, /process\.env\.MCI_GENERATOR_ENABLED/, '옛 이름도 여전히 읽는다');
  assert.match(idx, /return on\(a\) \|\| on\(b\);/, '둘 중 하나라도 켜면 켜진다');
  assert.match(read('src/config/default.js'), /generatorEnabled: false/, '코드 기본값은 꺼짐');
  assert.match(read('.env.example'), /^EAI_ENABLED=false$/m);
  assert.equal(/^MCI_GENERATOR_ENABLED=/m.test(read('.env.example')), false, '새 설치본에는 옛 키를 쓰지 않는다');
  const svc = read('lib/admin/service/ConfigService.js');
  assert.match(svc, /async setEaiFlag/);
  assert.match(svc, /MCI_GENERATOR_ENABLED\\s\*=/, '옛 키가 남아 있으면 같이 맞춘다');
  const ctrl = read('lib/admin/controller/ConfigController.js');
  assert.match(ctrl, /@PutMapping\('\/eai'\)[\s\S]{0,60}@Roles\('admin'\)/);
});

test('⑪ 화면에 보이는 말은 EAI (저장 값 MCI 는 그대로)', () => {
  const ko = read('admin-client/src/locales/ko.js');
  assert.match(ko, /mciController: 'EAI 컨트롤러 생성'/);
  assert.match(ko, /sectionMci: 'EAI 채널'/);
  assert.match(ko, /mciTitle: 'EAI 서버 연결'/);
  assert.equal(/MCI (?=[가-힣])/.test(ko), false, '한글 앞의 MCI 표기가 남아 있으면 안 된다');
  const ed = read('admin-client/src/views/ControllerEditor.vue');
  assert.match(ed, /<option value="MCI">EAI<\/option>/, '값은 MCI, 보이는 말은 EAI');
  assert.match(read('admin-client/src/components/SettingsDialog.vue'), /config\/eai/, '설정에서 켜고 끈다');
});


test('⑫ 이중화 하트비트는 접속 통계에 쌓이지 않는다', () => {
  /* 1초마다 오가는 기계끼리의 통신이라, 남기면 업무 요청이 전부 묻힌다.
     (상세 보기를 열었더니 원본 50건이 전부 /api/ha/heartbeat 였다) */
  const mw = read('src/core/metricsMiddleware.js');
  assert.match(mw, /if \(path\.startsWith\('\/api\/ha\/'\)\) return false;/);
});

test('⑬ 화면 코드 검사기가 Vue 조합형 API 를 전부 본다', () => {
  /* ref 를 빠뜨렸다가 MetricChart 가 통째로 사라졌다(ref is not defined).
     목록에서 하나라도 빠지면 그 하나가 그대로 사고가 된다. */
  const chk = read('scripts/check-vue-refs.mjs');
  for (const api of ['ref', 'reactive', 'computed', 'watch', 'onMounted', 'provide', 'inject']) {
    assert.ok(new RegExp(`\\\\b${api}\\\\|`).test(chk) || new RegExp(`\\\\(${api}\\\\|`).test(chk),
      `${api} 가 검사 목록에 있어야 한다`);
  }
  assert.match(chk, /stripCommentsAndStrings/, '주석·문자열 속 예시 코드는 보지 않는다');
});

test('⑭ "최근 N" 기간은 시간이 흐르면 같이 흘러야 한다', () => {
  /* 끝시각이 화면을 연 순간에 굳어 있으면, 그 뒤 요청은 조회 창 밖이라
     SSE 신호를 받아 다시 읽어도 숫자가 그대로다(실시간이 고장난 것처럼 보인다). */
  const ui = read('admin-client/src/views/AccessStatsPage.vue');
  assert.match(ui, /function slideGlobalRange\(\)/);
  assert.match(ui, /function reloadCurrentTab\(\) \{\s*\n\s*slideGlobalRange\(\);/);
  assert.match(ui, /globalQuickHours\.value = null;/, '직접 넣은 구간은 흐르지 않는다');
});

test('⑮ API 테스트 대화상자의 버튼은 submit 이 되지 않는다', () => {
  /* type 이 없으면 브라우저가 submit 으로 보고, 폼 안에 놓이는 순간 페이지가 새로고침된다. */
  for (const f of ['admin-client/src/components/ApiCallForm.vue', 'admin-client/src/components/ApiTester.vue']) {
    /* 주석 안의 <button> 은 설명이지 코드가 아니다 — 지우고 나서 센다
       (검사기에서 똑같은 오탐을 겪었다) */
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
    const noType = (src.match(/<button(?![^>]*type=)[^>]*>/g) || []);
    assert.equal(noType.length, 0, `${f} 에 type 없는 button 이 ${noType.length}개 남아 있다: ${noType[0] || ''}`);
  }
});

test('⑯ 라우트별 인증 — 화면 손잡이와 코드 생성이 이어져 있다', () => {
  /* 생성기는 진작부터 r.auth·r.roles 를 지원했는데 화면에 손잡이가 없어
     "코드에서 직접 붙일 수밖에 없나" 가 됐다. */
  const gen = read('lib/admin/service/codeGenerator.js');
  assert.match(gen, /if \(r\.roles && r\.roles\.length > 0\)/);
  assert.match(gen, /guardLines\.push\(`  @Auth\(\)`\)/);
  const ed = read('admin-client/src/views/ControllerEditor.vue');
  assert.match(ed, /function toggleRouteAuth\(r\)/);
  /* ★ v1.19.2 — 문구가 사전으로 옮겨졌다. 화면에는 키가, 사전에 원문이 있다. */
  assert.match(ed, /t\('controllerEditor\.k11'\)/, '라우트별 인증 스위치가 있다');
  assert.match(read('admin-client/src/locales/ko.js'), /이 라우트만 인증 필요/);
  assert.match(ed, /AuthHelpDialog/, '인증 도움말을 열 수 있어야 한다');
  /* ★ v1.19.6 — 문구가 사전으로 옮겨졌다. 화면에는 코드 예시가, 사전에 설명이 있다. */
  const help = read('admin-client/src/components/AuthHelpDialog.vue');
  assert.ok(help.includes('Authorization: Bearer'), '헤더 붙이는 예시가 화면에 있어야 한다');
  const ko = read('admin-client/src/locales/ko.js');
  for (const k of ['401', '403', '토큰 자동 첨부']) {
    assert.ok(ko.includes(k), `도움말 사전에 ${k} 설명이 있어야 한다`);
  }
});

test('⑰ 클래스 안에서 없는 내부 메서드를 부르지 않는다', () => {
  /* `this._flush()` 라고 썼는데 진짜 이름은 `_flushQueue` 였다.
     문법 검사도 시험도 통과하고, 타이머 안이라 화면에는 아무 표시가 없었다 —
     서버 로그에만 TypeError 가 조용히 쌓이고 "빨라졌겠지" 하고 넘어갔다. */
  const svc = read('lib/admin/service/AccessLogService.js');
  assert.match(svc, /this\._flushQueue\(\)\.catch/, '빠른 flush 는 _flushQueue 를 불러야 한다');
  assert.equal(/this\._flush\(\)/.test(svc), false, '_flush 라는 이름은 존재하지 않는다');
  const chk = read('scripts/check-self-calls.mjs');
  assert.match(chk, /self-calls/);
  assert.match(chk, /정의부는 \*\*원문에서\*\* 모은다/, '정규식 리터럴 때문에 정의를 놓치지 않아야 한다');
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.check, /check:self/, 'npm run check 에 포함되어야 한다');
});

test('⑱ 변경 알림을 합쳐 보낸다 (요청이 몰려도 화면이 과하게 다시 읽지 않게)', () => {
  /* 신호 하나에 콘솔은 집계 쿼리를 여러 개 돌린다. 배치마다 알리면
     "화면 수 × 쿼리 수" 만큼 DB 부하가 는다. 사람 눈에는 1.5초에 한 번이면 충분하다.
     실측: 300건 요청 → 알림 4건 (180건·100건씩 묶임) */
  const svc = read('lib/admin/service/AccessLogService.js');
  assert.match(svc, /const NOTIFY_MIN_GAP_MS = Number\(process\.env\.ACCESS_NOTIFY_MIN_MS\) \|\| 1_500;/,
    '기본 1.5초, .env 로 조절 가능');
  assert.match(svc, /_notifyChanged\(inserted\)/);
  assert.match(svc, /_pendingInserted/, '보내지 못한 건수는 모아 둔다');
  assert.match(svc, /if \(this\._notifyTimer\) \{ clearTimeout/, '종료할 때 타이머를 정리한다');
  const ui = read('admin-client/src/views/AccessStatsPage.vue');
  assert.match(ui, /if \(document\.hidden\) return;/, '안 보이는 화면은 읽지 않는다');
  assert.match(ui, /addEventListener\('visibilitychange', onVisibility\)/);
  assert.match(ui, /removeEventListener\('visibilitychange', onVisibility\)/, '떠날 때 정리한다');
});

test('⑲ 살아있음 확인·화면 이동은 로그에 남기지 않는다', () => {
  const db = read('src/database/db.js');
  assert.match(db, /isLivenessPing/, "SELECT 1 AS ok 는 로그에서 뺀다");
  const server = read('src/server.js');
  assert.match(server, /req\.method === 'GET' && !req\.path\.startsWith\('\/api\/'\)/,
    '확장자 없는 GET(SPA 화면 이동)은 HTTP 로그에서 뺀다');
});

test('⑳ 알림 간격은 바쁠수록 늘어난다 (고정값이 아니다)', () => {
  /* 조용할 때는 1.5초로 "바로" 반영되고, 몰려 들어오면 최대 10초까지 늘려
     화면이 돌리는 집계 쿼리를 줄인다. 실측: 600건 몰림 → 간격 5.8초로 자동 확장. */
  const svc = read('lib/admin/service/AccessLogService.js');
  assert.match(svc, /ACCESS_NOTIFY_MIN_MS/);
  assert.match(svc, /ACCESS_NOTIFY_MAX_MS/);
  assert.match(svc, /_notifyGapMs\(\)/);
  assert.match(svc, /NOTIFY_MIN_GAP_MS \+ \(NOTIFY_MAX_GAP_MS - NOTIFY_MIN_GAP_MS\) \* ratio/);
  assert.match(read('.env.example'), /ACCESS_NOTIFY_MAX_MS=10000/);
});

test('㉑ [요청 추적] 화면 정리 — KPI 카드 · 검색 단추 · 보관 정리', () => {
  const ui = read('admin-client/src/views/TraceExplorer.vue');
  assert.match(ui, /class="kpi-row/, 'KPI 는 카드로');
  assert.match(ui, /kpi-bad/, '실패가 있으면 그 카드만 붉게');
  assert.equal(/col-12 col-md-1 d-grid/.test(ui), false, '세로로 늘어나던 검색 단추 자리는 없어졌다');
  assert.match(ui, /function confirmRetention\(\)/, '지우기 전에 물어본다');
  assert.match(ui, /modeHintProblem/, '고른 진입 카드가 무엇을 여는지 알려 준다');
});

test('㉒ 화면이 부르는 함수가 스크립트에 있는지 검사한다', () => {
  /* `@click="openSteps(x)"` 를 붙였는데 선언이 통째로 빠져 있었다(치환이 조용히 실패).
     빌드도 SFC 검사도 통과하고 화면도 멀쩡히 뜬다 — 그 단추를 누를 때서야
     "openSteps is not a function" 이 난다. */
  const chk = read('scripts/check-vue-refs.mjs');
  assert.match(chk, /templateHandlerCalls/);
  assert.match(chk, /화면에서 부름/);
  assert.match(chk, /'if', 'for', 'while'/, '문법 키워드는 함수로 보지 않는다');
  const ui = read('admin-client/src/views/AccessStatsPage.vue');
  assert.match(ui, /function openSteps\(x\)/, '선언이 실제로 있어야 한다');
  assert.match(ui, /<TraceStepsDialog/);
});

test('㉓ 처리 과정 창은 원본 기록 창 위에 뜬다 (z-index)', () => {
  const dlg = read('admin-client/src/components/TraceStepsDialog.vue');
  assert.match(dlg, /\.ts-backdrop \{[^}]*z-index: 1100/s, '단계 창 1100');
  const page = read('admin-client/src/views/AccessStatsPage.vue');
  assert.match(page, /\.modal-backdrop-custom \{[^}]*z-index: 1080/s, '원본 기록 창 1080');
});

test('㉔ 옛 이름(MCI_GENERATOR_ENABLED)으로도 EAI 생성기를 켤 수 있다', () => {
  /* `EAI_ENABLED ?? MCI_GENERATOR_ENABLED` 로 이어 놓았더니,
     v1.13.3 에서 기본값으로 넣은 EAI_ENABLED=false 한 줄 때문에 옛 이름이 죽었다.
     그 이름으로 켜는 검사 스크립트(npm run mci:gen-check)가 404 로 실패했다. */
  const cfg = read('src/config/index.js');
  assert.match(cfg, /return on\(a\) \|\| on\(b\);/, '둘 중 하나라도 켜면 켜진다');
  assert.equal(/process\.env\.EAI_ENABLED \?\? process\.env\.MCI_GENERATOR_ENABLED/.test(cfg), false,
    '?? 로 이으면 앞의 false 가 뒤를 가린다');
});

test('㉕ [사용자별] 상세는 그 사람의 기록만 본다', () => {
  /* 경로만 걸면 다른 사람이 부른 것까지 섞여 "이 사람이 한 일" 이 아니게 된다. */
  const ui = read('admin-client/src/views/AccessStatsPage.vue');
  assert.match(ui, /openDetail\(`\$\{selectedUser\} · \$\{r\.method\} \$\{r\.path\}`, \{ path: r\.path, username: selectedUser \}\)/);
});

test('㉖ 처리 과정 창 — 필드 이름과 읽는 순서', () => {
  /* 서버가 주는 단계는 {at, ms, name, rows, detail, ok} 인데
     화면이 {ts, durationMs, label} 로 읽고 있었다 → 시간 칸이 전부 '—' 였고 막대 위치도 어긋났다.
     또 at 은 **끝난 시각**이라 그대로 줄 세우면 SQL 이 그것을 부른 서비스보다 앞에 왔다. */
  const d = read('admin-client/src/components/TraceStepsDialog.vue');
  assert.match(d, /Number\(s\.ms\)/, 'ms 로 걸린 시간을 읽는다');
  assert.match(d, /start: Math\.max\(0, end - ms\)/, '시작 = 끝 - 걸린시간');
  assert.match(d, /KIND_ORDER = \{ controller: 0, service: 1, sql: 2/, '같은 시각이면 부르는 쪽이 위');
  assert.match(d, /완료\$\/\.exec/, '들어감/끝남 두 줄을 하나로 합친다');
  assert.equal(/s\.durationMs/.test(d), false, '없는 필드를 읽지 않는다');
});

test('㉗ 세션 종료 — 브라우저 신호는 참고, 무활동 청소가 기준', () => {
  /* 조사 결과(MDN·Chrome Page Lifecycle·Firefox bug 1609653):
     beforeunload/unload 는 못 쓰고, pagehide+sendBeacon 도 브라우저를 끄면 실패할 수 있으며,
     visibilitychange(hidden) 은 탭 전환에서도 온다. 그래서 신호는 힌트로만 쓴다. */
  const svc = read('lib/admin/service/AccessLogService.js');
  assert.match(svc, /SESSION_IDLE_MS/, '무활동 기준이 있다');
  assert.match(svc, /LEAVE_HINT_GRACE_MS/, '힌트 뒤 유예가 있다');
  assert.match(svc, /sweepIdleSessions/);
  const sql = read('lib/admin/database/sql/admin_access.sql');
  assert.match(sql, /SET ended_at = COALESCE\(last_seen_at, started_at\)/,
    '끝난 시각은 NOW() 가 아니라 마지막 활동 시각이어야 체류시간이 부풀지 않는다');
  assert.match(svc, /session_kind: 'resumed'/, '돌아오면 연장이 아니라 새 방문');
  /* 주석에는 "beforeunload 를 쓰면 안 된다" 는 설명이 있으므로 주석을 지운 뒤 본다
     (검사기에서 똑같은 오탐을 겪었다) */
  const cli = read('admin-client/src/utils/leaveHint.js')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.equal(/addEventListener\(\s*['"](?:beforeunload|unload)['"]/.test(cli), false,
    'unload 계열 이벤트는 걸지 않는다 (bfcache 를 깨뜨린다)');
  assert.match(cli, /visibilitychange/);
  assert.match(cli, /keepalive: true/);
});

test('㉘ 무활동 청소가 인덱스를 타야 한다', () => {
  /* 조건에 COALESCE 를 쓰면 인덱스를 못 타 전체 스캔이 된다.
     열린 세션 5만 건으로 재 보니 10.02ms → 0.40ms (25배). 열린 세션이 많을수록 더 벌어진다. */
  const sql = read('lib/admin/database/sql/admin_access.sql');
  const sweep = sql.slice(sql.indexOf('-- @name: sweepIdleSessions'), sql.indexOf('-- @name: sweepLeaveHinted'));
  assert.match(sweep, /AND last_seen_at < :idle_before/, '컬럼을 그대로 비교해야 인덱스를 탄다');
  assert.equal(/WHERE[\s\S]*COALESCE/.test(sweep), false, 'WHERE 에 COALESCE 를 쓰지 않는다');
  assert.match(sweep, /LIMIT :lim/, '한 번에 닫는 양을 묶는다');
  assert.match(sql, /-- @name: sweepLeaveHinted/);
  assert.match(sql, /-- @name: sweepIdleLegacy/);
  const mig = read('lib/admin/database/migrations/013_user_sessions_idx.sql');
  assert.match(mig, /idx_user_sessions_touch ON user_sessions \(user_id, ended_at\)/);
});

test('㉙ 처리 과정 — "N건" 오해와 들쭉날쭉한 막대', () => {
  /* ① 단계의 rows 는 **그 쿼리가 가져온 행 수**인데 그냥 "3건" 이라 적어
        "SQL 이 3번 돌았나" 로 읽혔다. → "결과 3행" + 설명 툴팁.
     ② 막대가 시작 위치까지 반영한 폭포수였는데 기록이 1ms 단위라
        시작이 죄다 같거나 튀어 들쭉날쭉해 보였다. → 전체 대비 **비율**만 그린다. */
  const d = read('admin-client/src/components/TraceStepsDialog.vue');
  assert.match(d, /traceSteps\.rows/, '행 수는 전용 문구로');
  assert.match(d, /traceSteps\.rowsHint/, '실행 횟수가 아니라는 설명이 붙는다');
  assert.match(d, /left: 0,/, '막대는 왼쪽에서 시작한다');
  assert.match(d, /pct: Math\.round\(\(s\.ms \/ total\) \* 100\)/, '길이는 전체 대비 비율');
  const ko = read('admin-client/src/locales/ko.js');
  assert.match(ko, /rowsHint: '이 쿼리가 가져온 행 수입니다 \(실행 횟수가 아닙니다\)'/);
});

test('㉚ 같은 이름의 SQL 이 두 번 정의되지 않는다', () => {
  /* 청소 쿼리를 세 갈래로 나누면서 옛 정의를 지우지 못해 sweepIdleSessions 가 두 번 남았다.
     뒤엣것이 앞엣것을 **조용히 덮어써서** 1분마다
     "SQL 이 요구하는 값이 안 넘어와 null 로 채웠습니다: hint_before" 가 쌓였다. */
  const chk = read('scripts/check-sql-names.mjs');
  assert.match(chk, /@name:\\s\*\(\\w\+\)/);
  const sql = read('lib/admin/database/sql/admin_access.sql');
  const names = [...sql.matchAll(/^--\s*@name:\s*(\w+)/gm)].map((m) => m[1]);
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepEqual([...new Set(dup)], [], `중복 정의: ${[...new Set(dup)].join(', ')}`);
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.check, /check:sqlnames/);
});

test('㉛ t() 를 쓰면 선언이 있어야 하고, import 사이에 끼면 안 된다', () => {
  /* 화면 디자이너가 통째로 죽어 있었다 — 목록에서 [신규 프로젝트] 를 눌러도 아무 일이 없었다.
     원인 두 가지:
       ① `const { t } = useI18n();` 가 **import 들 사이**에 있었다.
          import 만 끌어올려져 그 줄보다 먼저 실행되는 코드가 생긴다 → "t is not defined".
       ② 다국어 작업 중 t() 만 넣고 **선언을 빠뜨린** 파일이 11개 있었다.
     둘 다 빌드는 통과하고 화면도 뜬다 — 그 화면 안이 조용히 비어 보일 뿐이다. */
  const chk = read('scripts/check-vue-refs.mjs');
  assert.match(chk, /import 사이에 낀 선언/);
  assert.match(chk, /선언\(const \{ t \} = useI18n\(\)\)이 없음/);
  /* 실제 파일도 확인 — 선언이 마지막 import 뒤에 있어야 한다 */
  const files = ['views/screen-designer/ProjectListView.vue',
                 'components/screen-designer/ProjectNameModal.vue',
                 'views/screen-designer/ProjectEditorView.vue'];
  for (const f of files) {
    const src = read(`admin-client/src/${f}`);
    assert.match(src, /const \{ t \} = useI18n\(\);/, `${f} 에 선언이 있어야 한다`);
    const body = /<script[^>]*>([\s\S]*?)<\/script>/.exec(src)[1];
    const at = body.indexOf('const { t } = useI18n();');
    assert.equal(/^\s*import /m.test(body.slice(at)), false, `${f}: 선언 뒤에 import 가 오면 안 된다`);
  }
});

test('㉜ 생성된 화면 이름은 사람이 읽을 수 있어야 한다', () => {
  /* 제목이 한글이면 이름을 못 만들어 `ScreenC3z02lView.vue` 같은 것이 나왔다.
     열어 봐도 어느 화면인지 알 수 없고 라우트 name 으로도 쓸 수 없다.
     → 경로를 먼저 쓴다: /book-list → BookListView */
  const gen = read('admin-client/src/generator/screens/compositeGen.js');
  assert.match(gen, /const fromPath = fileSafe\(pascal\(/, '경로에서 이름을 만든다');
  assert.match(gen, /replace\(\/:\/g, ''\)/, '경로의 :param 을 걷어낸다');
  const at = gen.indexOf('const fromPath');
  const tailAt = gen.indexOf("const tail = String(spec.id", at);
  assert.ok(at > 0 && tailAt > at, 'id 꼬리는 마지막 수단이어야 한다');
});

test('㉝ 화면 편집기에 실행 취소가 있다', () => {
  /* 조사해 보면 빌더 UX 에서 가장 기본으로 꼽히는 것이 "되돌릴 수 있다는 안심" 이다.
     Row 를 지우거나 분할을 바꿨을 때 돌아갈 방법이 없으면 사용자는 조심조심 쓰게 된다.
     실측: Row 추가(2→3 rows) → 되돌리기(3→2) → 다시 실행(2→3) → Ctrl+Z(3→2) */
  const v = read('admin-client/src/views/screen-designer/ScreenStudioView.vue');
  assert.match(v, /const undoStack = ref\(\[\]\)/);
  assert.match(v, /function undo\(\)/);
  assert.match(v, /function redo\(\)/);
  assert.match(v, /HISTORY_MAX/, '기록 개수를 제한한다');
  assert.match(v, /applyingHistory/, '되돌리는 중의 변경은 다시 쌓지 않는다');
  /* 입력칸 안에서는 브라우저 기본 동작을 막지 않는다 */
  assert.match(v, /tag === 'input' \|\| tag === 'textarea'/);
  assert.match(v, /bi-arrow-counterclockwise/, '단축키만 있으면 있는 줄 모른다 — 버튼도 있어야 한다');
});

test('㉞ 위젯 종류를 캔버스에서 바로 바꾼다', () => {
  /* 예전에는 위젯을 고르고 → 오른쪽 속성 패널로 가서 → 거기서 팔레트를 여는 3단계였다.
     빌더에서는 "보고 있는 자리에서 바꾸는" 것이 자연스럽다(팔레트/라이브뷰/설정 3분할의 취지).
     실측: 캔버스의 종류 배지 클릭 → 팔레트 → Progress 선택 → 배지가 바뀜 */
  const b = read('admin-client/src/components/screen-designer/CompositeBuilder.vue');
  assert.match(b, /function openKindPalette\(rowId, widgetId\)/);
  assert.match(b, /function applyKind\(kindId\)/);
  assert.match(b, /<WidgetKindPalette v-if="kindPaletteOpen"/);
  assert.match(b, /class="badge bg-light text-dark border small kind-btn"/, '배지가 눌리는 단추여야 한다');
  assert.match(b, /@click\.stop="openKindPalette/, '위젯 선택 이벤트와 겹치지 않게 stop');
  /* 종류 변경도 되돌릴 수 있어야 한다 — rows 를 갈아끼우므로 history 가 잡는다 */
  assert.match(b, /emitRows\(\(props\.spec\.rows \|\| \[\]\)\.map/);
});

test('㉟ 캔버스는 자기 안에서 스크롤하고, 선택한 Row 에만 [+ widget] 이 뜬다', () => {
  /* 캔버스: Row 가 늘면 페이지 전체가 길어져 [Row 추가] 와 속성 패널이 시야에서 밀려났다.
     실측 — Row 8개: 캔버스 580px 안에 내용 1404px, 페이지 높이는 1467 그대로,
     [Row 추가] 버튼은 화면 안(top 788).
     [+ widget]: 모든 Row 에 늘 띄우면 캔버스가 복잡해지므로 고른 Row 에만 띄운다.
     실측 — 선택 전 0개 · 선택 후 1개 · 눌러서 2→3 widgets · Ctrl+Z 로 3→2. */
  const b = read('admin-client/src/components/screen-designer/CompositeBuilder.vue');
  assert.match(b, /\.canvas-rows \{[^}]*max-height: 58vh;[^}]*overflow-y: auto;/s);
  assert.match(b, /v-if="isRowSelected\(row\.id\) && row\.widgets\.length < 6"/);
  assert.match(b, /\$emit\('add-widget', row\.id\)/);
  assert.match(b, /defineEmits\(\[[^\]]*'add-widget'/);
  const v = read('admin-client/src/views/screen-designer/ScreenStudioView.vue');
  assert.match(v, /@add-widget="actions\.addWidgetToRow"/);
});

test('㊱ 선언이 주석 안에 갇히면 안 된다', () => {
  /* 선언을 옮기는 스크립트가 주석 블록 **한가운데**에 넣어, 세 화면이 조용히 죽어 있었다
     (대시보드·요청 추적·컨트롤러 요청 대화상자 — `fmtInterval is not a function`).
     화면은 뜨는데 그 안이 비어 보여서, 전 화면을 훑어보고서야 발견했다. */
  const chk = read('scripts/check-vue-refs.mjs');
  assert.match(chk, /주석 안에 갇힌 선언/);
  for (const f of ['views/DashboardPage.vue', 'views/TraceExplorer.vue',
                   'components/ControllerRequestsDialog.vue']) {
    const src = read(`admin-client/src/${f}`);
    const body = /<script[^>]*>([\s\S]*?)<\/script>/.exec(src)[1];
    for (const cm of body.matchAll(/\/\*[\s\S]*?\*\//g)) {
      assert.equal(/^\s*const \{[^}]*\} = use[A-Z]\w*\(\);\s*$/m.test(cm[0]), false,
        `${f}: 주석 안에 선언이 있으면 안 된다`);
    }
    assert.match(body, /const \{[^}]*\} = useDuration\(\);/, `${f}: 선언이 살아 있어야 한다`);
  }
});

test('㊲ npm run smoke — 모든 화면을 실제로 열어 보는 검사가 있다', () => {
  /* 자동 수정 스크립트를 두 번 돌렸고 두 번 다 새 결함을 만들었다.
     문법 검사도 단위 시험도 통과하는데 화면을 열면 죽는 종류라,
     전 화면을 열어 보는 것만이 그물이었다. 그 훑기를 프로젝트 안으로 들였다. */
  const sm = read('scripts/smoke-screens.mjs');
  assert.match(sm, /const SCREENS = \[/);
  assert.match(sm, /pageerror/, '콘솔 오류를 본다');
  assert.match(sm, /MIN_BODY/, '껍데기만 남은 화면도 걸러야 한다');
  assert.match(sm, /playwright 가 없어 건너뜁니다/, '없는 환경에서는 조용히 넘어간다');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts.smoke, 'node scripts/smoke-screens.mjs');
});

test('㊳ 생성 코드가 없는 store 를 부르지 않는다', () => {
  /* 데이터 소스가 없는 위젯의 store 를 `'resource'` 로 떨어뜨리고 있었다.
     그런 이름의 store 는 만들어지지 않으므로, 생성된 화면이
     `resourceStore.fetchOne(...)` 을 부르고 그 폼을 제출하면 죽는다.
     문법은 멀쩡해 빌드도 통과한다 — 눌러 봐야 드러나는 종류다.
     → 그 화면이 이미 쓰는 store 로 떨어지고, 하나도 없으면 핸들러를 만들지 않는다. */
  const g = read('admin-client/src/generator/screens/compositeGen.js');
  assert.match(g, /function fallbackStorePrefix\(spec\)/);
  assert.equal(/\|\| 'resource';/.test(g), false, "존재하지 않는 'resource' 로 떨어뜨리면 안 된다");
  assert.match(g, /const onSubmit = storePrefix \?/, 'store 가 없으면 핸들러를 만들지 않는다');
});

test('㊴ 컨트롤러 목록에도 설명 열이 있다', () => {
  /* 서버는 description 을 주고 있었는데 화면에만 열이 없었다. */
  const c = read('admin-client/src/views/ControllerList.vue');
  assert.match(c, /t\('controllerList\.colDescription'\)/);
  assert.match(c, /class="small text-secondary desc-cell"/);
  /* 열이 늘 때마다 colspan 도 따라가야 한다 — v1.29.0 에서 [파일 경로] 가 늘어 10 이 됐다 */
  assert.equal(/colspan="[1-9]"/.test(c), false, '옛 colspan 이 남아 있으면 안 된다');
  assert.match(c, /colspan="10"/);
});

test('㊵ 데이터 소스 딱지를 눌러 바로 설정할 수 있다', () => {
  /* 캔버스의 "데이터 소스 미설정" 은 알려만 주고 고치는 길이 없는 회색 딱지였다.
     처음 쓰는 사람은 여기서 막힌다 — 오른쪽 패널에 [Data Source] 탭이 있다는 것을 알아야만 했다.
     이제 딱지를 누르면 그 위젯이 선택되고 [Data Source] 탭이 열린다.
     실측: 딱지 클릭 → 탭 상태 {Properties: false, Data Source: true} */
  const b = read('admin-client/src/components/screen-designer/CompositeBuilder.vue');
  assert.match(b, /class="widget-source small mt-2 src-btn"/);
  assert.match(b, /\$emit\('pick-source', \{ rowId: row\.id, widgetId: w\.id \}\)/);
  const v = read('admin-client/src/views/screen-designer/ScreenStudioView.vue');
  assert.match(v, /@pick-source="onPickSource"/);
  assert.match(v, /openSourceTick\.value \+= 1;/);
  const pp = read('admin-client/src/components/screen-designer/PropertiesPanel.vue');
  /* 선택 변경 감시자가 애써 연 탭을 되돌리지 않아야 한다 (실행 순서에 기대지 않는다) */
  assert.match(pp, /if \(props\.openSourceTick > handledTick\) return;/);
  assert.match(pp, /immediate: true, flush: 'post'/);
});

test('㊶ 단건 화면은 경로에 :id 를 제안한다', () => {
  /* 목록 → 수정 화면으로 값을 넘기는 통로가 **경로 파라미터**다.
     경로에 :id 가 없으면 [눌렀을 때 → 화면 이동] 에서 이어 줄 파라미터가 하나도 안 나오고,
     넘어간 화면은 props 로 아무것도 못 받아 빈 화면이 된다.
     실측 — effectiveParams: '/snack-edit' → [] · '/snack-edit/:id' → [{name:'id',required:true}]
     그래서 상세·수정 유형은 만들 때부터 :id 를 붙여 준다. */
  const m = read('admin-client/src/components/screen-designer/ScreenCreateModal.vue');
  assert.match(m, /const NEEDS_ID = new Set\(\['detail', 'form-edit'\]\)/,
    '유형 키는 PALETTE 와 같아야 한다 (edit 이 아니라 form-edit)');
  assert.match(m, /NEEDS_ID\.has\(kind\) \? `\/\$\{s\}\/:id` : `\/\$\{s\}`/);
  assert.match(m, /if \(!pathManuallyEdited\.value\) path\.value = suggestPath\(title\.value, kind\)/,
    '유형을 바꾸면 제안도 따라간다');
  /* 왜 필요한지 그 자리에서 알려 준다 */
  assert.match(m, /screenCreate\.idParamHint/);
  assert.match(m, /screenCreate\.noIdWarn/);
  const ko = read('admin-client/src/locales/ko.js');
  assert.match(ko, /목록에서 값을 넘길 수 없어 <b>|목록에서 값을 넘길 수 없어/);
});

test('㊷ 화면 이동 대상을 고르면 params 가 자동으로 이어진다', () => {
  /* 대상 화면의 파라미터 이름과 행 필드 이름이 같으면(`id` ↔ `row.id`) 자동으로 채운다.
     — 이 자동 채우기는 원래 있었다. 다만 **대상 경로에 :id 가 없으면**
       채울 파라미터 자체가 없어서 "넘길 값이 없습니다" 만 떴다(v1.22.2 에서 해결).
     실측: 대상을 고르는 순간 바인딩 select 가 `row.id` 로 선택된 상태로 나온다. */
  const pp = read('admin-client/src/components/screen-designer/PropertiesPanel.vue');
  const fn = pp.slice(pp.indexOf('function onNavTargetChange'), pp.indexOf('function onActionChange'));
  assert.match(fn, /for \(const prm of \(t \? effectiveParams\(t\) : \[\]\)\)/);
  assert.match(fn, /fieldOptions\.value\.includes\(prm\.name\)/, '이름이 같으면 잇는다');
  assert.match(fn, /params\[prm\.name\] = `row\.\$\{hit\}`/);
  /* id 는 columns 에 없어도 후보에 들어가야 한다 — 목록 위젯이 컬럼을 안 적어 둔 경우가 많다 */
  const sch = read('admin-client/src/generator/screens/compositeSchema.js');
  assert.match(sch, /return \[\.\.\.new Set\(\['id', \.\.\.names\]\)\]/);
});

test('㊸ 수정 화면에 데이터 소스를 붙이면 입력란이 채워진다', () => {
  /* "수정 템플릿을 골랐는데 입력란이 없다" 의 원인.
     자동 채우기 조건이 "필드가 하나도 없을 때" 였는데, 수정·삭제 템플릿은
     처음부터 id 하나를 넣어 둔다 → 조건이 영영 참이 되지 않아 입력란이 id 하나로 남았다.
     실측: PUT /api/books/:id 를 붙이니 id·title·author·price 4개로 채워졌다. */
  const pp = read('admin-client/src/components/screen-designer/PropertiesPanel.vue');
  assert.match(pp, /const SCAFFOLD_FIELDS = new Set\(\['id'\]\)/);
  assert.match(pp, /function hasUserFields\(cfg\)/);
  assert.match(pp, /&& !hasUserFields\(cfg\)\) \{/, '틀에서 넣은 id 만 있으면 아직 비어 있는 것으로 본다');
  assert.equal(/!\(Array\.isArray\(cfg\.fields\) && cfg\.fields\.length\)\)/.test(pp), false,
    '예전의 "하나도 없을 때" 조건은 남아 있으면 안 된다');
});

test('㊹ 화면이 왜 비어 보이는지 스스로 알려 준다', () => {
  /* "넘어가면 화면은 뜨는데 아무것도 안 보인다" 가 반복됐다.
     원인은 늘 셋 중 하나인데 화면은 아무 말도 하지 않아 사람이 찾아내야 했다:
       ① 데이터 소스 없음  ② 단건 화면인데 경로에 :id 없음  ③ 입력 폼인데 필드 없음
     실측: 데이터 소스가 없는 화면을 열면
           "'회원 목록' 에 데이터 소스가 없습니다..." 가 캔버스 위에 뜬다.
           제대로 설정된 화면에서는 아무것도 뜨지 않는다(조용하다). */
  const sch = read('admin-client/src/generator/screens/compositeSchema.js');
  assert.match(sch, /export function diagnoseScreen\(spec\)/);
  assert.match(sch, /경로에 :id 같은 파라미터가 없습니다/);
  assert.match(sch, /데이터 소스가 없습니다/);
  assert.match(sch, /입력란이 없습니다/);
  /* 기준은 HTTP 메서드가 아니라 그 API 가 받는 입력이다 — POST 를 쓰라고 하지 않는다 */
  assert.equal(/입력이 있는 API\(POST·PUT 등\)/.test(sch), false);
  /* 틀에서 넣어 준 id 하나는 "필드 있음" 으로 치지 않는다 */
  assert.match(sch, /f\.filter\(\(x\) => x\?\.name && x\.name !== 'id'\)/);
  const v = read('admin-client/src/views/screen-designer/ScreenStudioView.vue');
  assert.match(v, /const screenIssues = computed\(\(\) => diagnoseScreen\(localScreen\.value\)\)/);
  assert.match(v, /v-if="screenIssues\.length"/);
});

test('㊺ 입력란 분석은 HTTP 메서드가 아니라 API 의 입력을 본다', () => {
  /* "GET 은 조회용이라 입력란이 안 생긴다" 는 설명은 틀렸다.
     분석기는 method 로 자르지 않는다 — 경로의 :param 과 **SQL 의 :param** 에서 유도한다.
     실측(BookController): get→[id] · list→[keyword] · update→[id,title,author,price]
       → 차이는 메서드가 아니라 각 핸들러가 쓰는 SQL 파라미터였다.
     그래서 `GET /api/snack-insert` 로 등록·수정하는 서버도 그대로 쓸 수 있어야 한다. */
  const svc = read('lib/admin/service/ScreenWizardService.js');
  assert.match(svc, /GET 도 SQL 에 :param 이 있으면 query 로 추가/);
  const sqlBlock = svc.slice(svc.indexOf('// 3) SQL :param'), svc.indexOf('return inputs;'));
  assert.equal(/method === 'GET'/.test(sqlBlock), false, 'SQL 유도는 메서드로 가르지 않는다');
  /* 생성 코드도 method 를 그대로 따른다 (GET 이면 query, 아니면 body) */
  const gen = read('admin-client/src/generator/screens/resourceStoreGen.js');
  assert.match(gen, /method\.toUpperCase\(\) === 'GET' \? '\{ params: opts \}' : 'opts'/);
});

test('㊻ 수정 화면은 현재 값을 보여 준다', () => {
  /* "목록에서 눌러 넘어가도 선택한 항목이 안 보인다" 의 진짜 원인.
     form-edit 템플릿이 [수정][삭제] **버튼 두 개만** 만들고 있었다.
     무엇을 고치는 중인지 모르는 채 수정 버튼을 누르는 셈이었다.
     상세 화면은 이미 조회+표시를 갖췄으니 수정 화면도 같아야 한다:
     위에 현재 값(detail), 아래에 [수정][삭제]. */
  const sch = read('admin-client/src/generator/screens/compositeSchema.js');
  const blk = sch.slice(sch.indexOf("case 'form-edit'"), sch.indexOf("case 'dashboard'"));
  assert.match(blk, /const current = createWidget\(\{ kind: 'detail' \}\)/);
  assert.match(blk, /현재 값/);
  /* 안내는 실제로 할 수 있는 것만 가리켜야 한다 — 직접 추가하는 UI 는 없다 */
  /* 주석에는 옛 문구가 인용돼 있으므로 **실제 메시지 문자열**만 본다 */
  assert.equal(/\+ '.*아래에서 직접 추가하세요/.test(sch), false);
  assert.match(sch, /API 를 다시 고르면 입력란을 다시 분석합니다/);
  /* 입력이 없을 때 그 까닭을 서버가 알려 준다 */
  const svc = read('lib/admin/service/ScreenWizardService.js');
  assert.match(svc, /inputsNote: inputs\.length \? null :/);
  assert.match(svc, /SQL 파라미터를 따라가지 못했습니다/);
});

test('㊼ 미리보기에도 부트스트랩 CSS 가 들어간다', () => {
  /* 위젯은 `btn btn-primary` 를 제대로 쓰고 있는데 미리보기에서는 밋밋한 기본 단추로 보였다.
     iframe 문서에 **부트스트랩 스타일시트를 넣지 않았기** 때문이다 (Vue 만 넣고 있었다).
     생성된 앱에서는 정상이었으므로, 미리보기만의 문제였다.
     실측: 적용 후 버튼 배경이 rgb(13, 110, 253) — 부트스트랩 기본 primary 색.
     인터넷이 없는 병원망을 생각해 CDN 이 아니라 이 서버(public/vendor)에서 가져온다. */
  const wp = read('admin-client/src/generator/screens/wholeAppPreviewBuilder.js');
  assert.match(wp, /const BOOTSTRAP_CSS = '\/public\/vendor\/bootstrap\.min\.css'/);
  assert.match(wp, /<link rel="stylesheet" href="\$\{BOOTSTRAP_CSS\}" \/>/);
  const cp = read('admin-client/src/generator/screens/compositePreviewBuilder.js');
  assert.match(cp, /bootstrap\.min\.css/, '한 화면 미리보기에도 넣는다');
  /* 생성 코드 쪽은 원래부터 부트스트랩 클래스를 쓰고 있었다 */
  const tpl = read('admin-client/src/generator/widget-templates/widgetSfcTemplates.js');
  assert.match(tpl, /'btn btn-' \+ \(buttonVariant \|\| 'primary'\)/);
});

test('㊽ 신호로 죽은 메인 서버를 supervisor 가 되살린다', () => {
  /* 실측: 메인을 kill -9 → "자동 재기동 #1 실패: not running" → 서버가 돌아오지 않았다.
     restart() 가 exitCode === null 만 보고 "살아 있다" 고 오판해 stop() 을 불렀기 때문이다.
     신호로 죽은 프로세스는 exitCode 가 null 이고 signalCode 에 값이 있다.
     고친 뒤 실측: kill -9 → 3.5초 뒤 새 pid 로 복구. */
  const sup = read('src/supervisor.js');
  assert.match(sup, /const alive = this\.child && this\.child\.exitCode === null && this\.child\.signalCode === null;/);
  assert.match(sup, /if \(alive\) \{\s*await this\.stop/);
});

test('㊾ Windows 서비스 구성과 Electron 의 서비스 감지', () => {
  /* 서버는 서비스로, Electron 은 보는 창으로. */
  const xml = read('scripts/windows/aidot-express.xml');
  assert.match(xml, /<id>aidot-express<\/id>/);
  assert.match(xml, /<arguments>src\\supervisor\.js<\/arguments>/, '서비스도 supervisor 를 띄운다 (안쪽 감시 유지)');
  assert.ok((xml.match(/<onfailure action="restart" delay="1 min"\/>/g) || []).length >= 3, '실패 시 1분 후 다시 시작');
  assert.match(xml, /<startmode>Automatic<\/startmode>/);
  const ps = read('scripts/windows/install-service.ps1');
  assert.match(ps, /sc\.exe failure aidot-express reset= 86400 actions= restart\/60000/, 'OS 복구 옵션도 건다');
  assert.match(ps, /IsInRole.*Administrator/, '관리자 확인');
  assert.match(ps, /<depend>MariaDB<\/depend>/, '없는 서비스에 의존하지 않도록 뺀다');
  const el = read('electron/main.cjs');
  assert.match(el, /function probeExternalServer\(port\)/);
  assert.match(el, /if \(serverExternal \|\| !serverProc\) \{ app\.quit\(\); return; \}/, '서비스 서버는 창을 닫아도 내리지 않는다');
});

test('㊿ 엔터프라이즈 메뉴는 기본 감춤, 켜면 보인다', () => {
  /* 백업/복원 · DB 컬럼 암호화 · 이중화는 모든 설치에 필요한 것이 아니다.
     MCI 코드 생성기와 같은 방식(서버 플래그 → ui-flags → 사이드바 requiresFlag)으로 묶었다.
     실측: FEATURE 없음 → 메뉴 없음 · FEATURE_*=true → /backup /secure-columns /ha 와 홈 카드 보임 */
  const cfg = read('src/config/index.js');
  assert.match(cfg, /features: \{[\s\S]*?backup:[\s\S]*?secureColumns:[\s\S]*?ha:/);
  assert.match(cfg, /process\.env\.FEATURE_BACKUP === 'true'/);
  const ctl = read('lib/admin/controller/SystemInfoController.js');
  for (const k of ['backupEnabled', 'secureColumnsEnabled', 'haEnabled']) assert.match(ctl, new RegExp(k));
  const side = read('admin-client/src/layouts/MainLayout.vue');
  assert.match(side, /name: 'backup'[\s\S]{0,200}requiresFlag: 'backupEnabled'/);
  assert.match(side, /name: 'secure-columns'[\s\S]{0,200}requiresFlag: 'secureColumnsEnabled'/);
  assert.match(side, /name: 'ha'[\s\S]{0,200}requiresFlag: 'haEnabled'/);
  assert.match(read('admin-client/src/views/Home.vue'), /flags\.backupEnabled \?/);
  assert.match(read('.env.enterprise.example'), /FEATURE_BACKUP/);
});

test('(51) 설정 화면에서 엔터프라이즈 기능을 켜고 끈다', () => {
  /* v1.25.0 은 .env 를 손으로 고쳐야 켤 수 있었다 — 그러려면 서버 파일에 접근해야 한다.
     콘솔에서 켤 수 있게 했다(EAI 토글과 같은 방식: .env 에 쓰고 재기동하면 적용).
     실측: 토글 → .env 에 FEATURE_BACKUP=true 기록 → 재기동 후 /backup 만 나타남
           (/secure-columns · /ha 는 false 이므로 그대로 감춰짐) */
  const svc = read('lib/admin/service/ConfigService.js');
  assert.match(svc, /getFeatures\(\) \{/);
  assert.match(svc, /async setFeatures\(input = \{\}\)/);
  assert.match(svc, /FEATURE_BACKUP: next\.backup \? 'true' : 'false'/);
  assert.match(svc, /_writeEnvPairs\(pairs\) \{/, '.env 쓰기는 공통 헬퍼로');
  const ctl = read('lib/admin/controller/SystemInfoController.js');
  assert.match(ctl, /@GetMapping\('\/features'\)/);
  assert.match(ctl, /@PutMapping\('\/features'\)/);
  assert.match(ctl, /@Roles\('admin'\)[\s\S]{0,80}async setFeatures/, '관리자만 바꿀 수 있어야 한다');
  const dlg = read('admin-client/src/components/SettingsDialog.vue');
  assert.match(dlg, /async function toggleFeature\(key, on\)/);
  assert.match(dlg, /set3\.entSaved/, '재기동이 필요하다는 사실을 알려 준다');
});

test('(52) 업로드 — 멀티파트와 base64 가 같은 저장 규칙을 쓴다', () => {
  /* 기존 base64(JSON) 방식은 그대로 두고 multipart 를 하나 더 열었다.
     base64 는 본문이 33% 커진다(3.0MB → 3.8MB) — 상한에 더 빨리 닿는다.
     실측: 멀티파트 3MB 업로드 0.04s · 내려받은 파일이 원본과 바이트 일치,
           덮어쓰기 방지(사진-2, 사진-3), 경로 탈출 차단(../../etc/passwd → passwd),
           파일 두 개 동시, 파일 없음 400, 형식 오류 400. */
  const c = read('src/controller/UploadController.js');
  assert.match(c, /@PostMapping\('\/multipart'\)/);
  assert.match(c, /function parseMultipart\(body, boundary\)/);
  assert.match(c, /function readRawBody\(req\)/);
  /* 두 방식이 같은 저장 규칙(이름 걸러내기 · 덮어쓰지 않기)을 쓰도록 공통 메서드로 뺐다 */
  assert.match(c, /_save\(safeName, buffer\) \{/);
  assert.match(c, /_safeName\(name\) \{/);
  assert.match(c, /while \(fs\.existsSync\(target\)\) target = path\.join\(this\.dir, `\$\{base\}-\$\{\+\+n\}\$\{ext\}`\)/);
  /* 상한이 있어야 한다 — 통째로 메모리에 올리므로 */
  assert.match(c, /const MULTIPART_MAX = Number\(process\.env\.UPLOAD_MAX_BYTES\)/);
  assert.match(c, /status: 413/);
});

test('(53) 직접 넣은 파일 — 상태 표시와 개별 올리기', () => {
  /* 개발자가 편집기로 workspace/ 에 넣은 파일은 목록에 보이지만 **라우팅이 안 됐다**
     (실측: registered false · GET 404 · 재기동해야 200).
     한꺼번에 올리는 것만으로는 부족하다 — 여러 개 중 하나만 올리고 싶을 때가 있다.
     실측: G·H 를 넣고 G 만 개별 올리기 → /api/pickG 200 · /api/pickH 404 (H 는 그대로). */
  const svc = read('lib/admin/service/WorkspaceLoadService.js');
  assert.match(svc, /  list\(\) \{/, '셋 다 상태(loaded)와 함께 준다');
  assert.match(svc, /async loadOne\(kind, name\)/);
  assert.match(svc, /loaded: regNames\.has\(f\.name\)/, '컨트롤러 상태');
  /* ★ v1.32.0 — 이름만 보면 안 된다(지워도 레지스트리에 남는다). 파일 기준으로 본다. */
  assert.match(svc, /loaded: this\._isFileLoaded\('service', f\.file\) && !!container/, '서비스 상태');
  assert.match(svc, /loaded: this\._isFileLoaded\('sql', f\.file\) && !!sqlRegistry/, 'SQL 상태');
  /* 올린 뒤 실제로 올라왔는지 확인해서 돌려준다 — 말만 하고 안 올라오면 안 된다 */
  assert.match(svc, /const after = this\.list\(\);/);

  /* 개별 올리기가 되려면 서비스·SQL 에도 파일 단위 로더가 있어야 한다 */
  const cl = read('src/core/controllerLoader.js');
  assert.match(cl, /export async function loadSingleServiceFile\(file\)/);
  assert.match(cl, /\?t=\$\{Date\.now\(\)\}/, 'ESM 캐시를 우회해야 다시 읽힌다');
  assert.match(cl, /export function unregisterControllerByBasePath/);
  const sl = read('src/core/sqlLoader.js');
  assert.match(sl, /export async function loadSingleSqlFile\(file, logger\)/);

  const ctl = read('lib/admin/controller/WorkspaceLoadController.js');
  assert.match(ctl, /@GetMapping\('\/files'\)/);
  assert.match(ctl, /@PostMapping\('\/load-one'\)/);
  assert.match(ctl, /@Roles\('admin'\)/);
});

test('(54) 목록 세 곳에 로딩 상태와 개별 올리기가 붙어 있다', () => {
  /* API 만 있으면 개발자가 화면에서 알 수 없다. 컨트롤러·서비스·SQL 세 목록 모두에
     ⓐ 줄마다 올라옴/안 올라옴 ⓑ 그 줄만 올리는 단추 ⓒ "안 올라온 것만" 필터를 붙였다.
     실측: PickX·PickY 를 넣으면 2줄이 "안 올라옴" · 필터를 켜면 그 2줄만 남고
           X 의 단추를 누르면 1줄로 줄며 /api/pickX 200 · /api/pickY 404(그대로). */
  const cell = read('admin-client/src/components/LoadStateCell.vue');
  assert.match(cell, /\/api\/admin\/workspace\/load-one/);
  assert.match(cell, /emit\('loaded', props\.name\)/, '올린 뒤 목록이 상태를 다시 읽어야 한다');
  assert.match(cell, /loadState\.stillUnloaded/, '올렸는데 반영이 안 되면 그렇게 말해야 한다');

  const comp = read('admin-client/src/composables/useLoadState.js');
  assert.match(comp, /const isLoaded = \(name\) => !knownNames\.value\.has\(name\)/,
    '상태를 모르는 줄을 "안 올라옴" 으로 표시하면 겁을 준다');
  /* ★ v1.31.0 — 401 은 토큰이 붙기 전일 수 있어 한 번 더 시도한다.
     그래도 안 되면(관리자가 아닌 경우 등) 조용히 넘어가고 목록 자체는 보여야 한다. */
  assert.match(comp, /if \(e\?\.response\?\.status === 401 && !retried\)/);
  assert.match(comp, /knownNames\.value = new Set\(\);/);

  for (const f of ['ControllerList.vue', 'ServiceList.vue', 'SqlList.vue']) {
    const v = read(`admin-client/src/views/${f}`);
    assert.match(v, /<LoadStateCell/, `${f}: 상태 셀`);
    assert.match(v, /loadState\.onlyUnloaded\.value/, `${f}: 필터 스위치`);
    assert.match(v, /loadState\.refresh\(\)/, `${f}: 목록을 읽을 때 상태도 갱신`);
  }
});

test('(55) smoke — 감춰진 화면과 사라진 화면을 구분한다', () => {
  /* v1.25.0 에서 엔터프라이즈 메뉴를 기본 감춤으로 바꾸자 smoke 가 17 → 14 로 줄었다.
     예전 smoke 는 "메뉴에 없음 → 건너뜀" 으로 조용히 넘어가, **감춰진 것인지 진짜 사라진 것인지
     구분할 수 없었다.** 그러면 라우트가 깨져 화면이 사라져도 통과한다.
     실측: '요청 추적'(감춤 대상 아님) 메뉴를 지우니 12/13 으로 실패 · 복구하니 14/14 통과.
           기능을 켜면 17/17, 끄면 14/14 + "설정으로 꺼진 화면 3개" 로 표시. */
  const sm = read('scripts/smoke-screens.mjs');
  assert.match(sm, /\['백업\/복원', '\/backup', true\]/, '감춰질 수 있는 화면만 표시한다');
  assert.match(sm, /\['이중화', '\/ha', true\]/);
  assert.match(sm, /for \(const \[name, href, optional\] of SCREENS\)/);
  assert.match(sm, /감춤 대상이 아닌데 사라졌습니다/, '그 외가 없으면 실패로 잡아야 한다');
  assert.match(sm, /설정으로 꺼진 화면/, '몇 개가 왜 빠졌는지 끝에 적는다');
  /* 감춤 대상이 아닌 화면은 optional 표시가 없어야 한다 */
  assert.match(sm, /\['요청 추적', '\/trace'\]/);
});

test('(56) 세 목록의 열 구성을 맞춘다', () => {
  /* 컨트롤러·서비스·SQL 목록의 열이 제각각이었다.
     · 컨트롤러는 [라우트] 에 개수를 보여 주는데, 서비스는 메서드 **이름을 다 나열**했다
       (메서드가 많은 서비스에서 줄이 터진다) → 개수 배지로 통일, 이름은 툴팁
     · SQL 목록에는 그 파일에 든 SQL 이름 개수가 없었다 → [SQL] 열 추가
     · 'SQL' 의 '경로' → '파일 경로' 로 이름을 맞추고, 컨트롤러·서비스에도 같은 열 추가
     실측 — 열 구성:
       컨트롤러: 이름 | 유형 | 기본 경로 | 설명 | 파일 경로 | 라우트 | 올라옴 | 생성일
       서비스  : # | 이름 | 참조 SQL | 메서드 | 설명 | 파일 경로 | 올라옴 | 생성일
       SQL     : # | 파일명 | 테이블 | SQL | 설명 | 파일 경로 | 올라옴 | 생성일 */
  const sv = read('admin-client/src/views/ServiceList.vue');
  assert.match(sv, /\{\{ r\.methods\?\.length \?\? 0 \}\}/, '메서드는 개수로');
  assert.match(sv, /:title="\(r\.methods \|\| \[\]\)\.join\(', '\)"/, '이름은 툴팁으로');
  const sq = read('admin-client/src/views/SqlList.vue');
  assert.match(sq, /\{\{ r\.query_count \?\? \(r\.queries\?\.length \?\? 0\) \}\}/);
  assert.match(sq, /sqlList\.colQueries/);
  for (const f of ['ControllerList.vue', 'ServiceList.vue']) {
    const v = read(`admin-client/src/views/${f}`);
    assert.match(v, /common\.colFilePath/, `${f}: 파일 경로 열`);
    assert.match(v, /class="path-cell"|path-cell"/, `${f}: 긴 경로가 표를 밀지 않아야 한다`);
  }
  /* 'SQL' 의 경로 열 이름이 '파일 경로' 여야 한다 (셋이 같은 말을 쓴다) */
  const ko = read('admin-client/src/locales/ko.js');
  assert.match(ko, /colPath: '파일 경로'/);
  assert.match(ko, /colFilePath: '파일 경로'/);
  /* 빈 상태 행의 colspan 은 헤더의 <th> 개수와 같아야 한다.
     ★ v1.29.1 에서 서비스·SQL 의 [#] 열이 빠져 10 → 9 가 됐다. */
  for (const [f, n] of [['ControllerList.vue', 10], ['ServiceList.vue', 9], ['SqlList.vue', 9]]) {
    const v = read(`admin-client/src/views/${f}`);
    const ths = (/<thead[\s\S]*?<\/thead>/.exec(v)[0].match(/<th/g) || []).length;
    assert.equal(ths, n, `${f}: 헤더 열 개수`);
    assert.match(v, new RegExp(`colspan="${n}"`), `${f}: colspan`);
  }
});

test('(57) 목록 열 정리 — 중복 경로 제거 · # 열 제거 · 배지 자리', () => {
  /* · 컨트롤러 [이름] 아래에 파일 경로가 또 있었다 — 전용 [파일 경로] 열이 생겼으니 중복이다
     · 서비스·SQL 의 [#] 열은 이름과 같은 값이라 자리만 차지했다
     · [내 것] 배지는 셋 다 이름(파일명) 옆에 둔다 — SQL 만 파일 경로 열에 있었다
     실측 열 구성:
       컨트롤러: 이름 | 유형 | 기본 경로 | 설명 | 파일 경로 | 라우트 | 올라옴 | 생성일
       서비스  : 이름 | 참조 SQL | 메서드 | 설명 | 파일 경로 | 올라옴 | 생성일
       SQL     : 파일명 | 테이블 | SQL | 설명 | 파일 경로 | 올라옴 | 생성일 */
  const c = read('admin-client/src/views/ControllerList.vue');
  assert.equal(/class="cell-sub" :title="r\.file_path">\{\{ r\.file_path \}\}/.test(c), false,
    '이름 아래의 경로는 없어야 한다');
  assert.match(c, /<div class="fw-semibold">\s*\{\{ r\.name \}\}\s*<span v-if="r\.origin === 'workspace'"/,
    '배지는 이름 옆에');
  for (const f of ['ServiceList.vue', 'SqlList.vue']) {
    const v = read(`admin-client/src/views/${f}`);
    assert.equal(/<th style="width:60px">#<\/th>/.test(v), false, `${f}: # 헤더가 남아 있다`);
    assert.equal(/<td>\{\{ r\.id \}\}<\/td>/.test(v), false, `${f}: # 셀이 남아 있다`);
    assert.match(v, /colspan="9"/, `${f}: 열이 줄었으니 colspan 도 9`);
  }
  /* SQL 의 [내 것] 배지가 파일명 열로 옮겨졌는가 */
  const sq = read('admin-client/src/views/SqlList.vue');
  const nameCell = sq.slice(sq.indexOf('{{ r.name }}.sql'), sq.indexOf('{{ r.name }}.sql') + 400);
  assert.match(nameCell, /r\.origin === 'workspace'/, '배지가 파일명 열에 있어야 한다');
});

test('(58) 방명록 실습 페이지 — 기본 경로를 바꾸면 안내 문구도 바뀐다', () => {
  /* 실제 호출만 basePath() 를 따르고 안내 문구는 /api/guestbook 으로 박혀 있었다.
     `/api/snack` 으로 바꿔 놓고도 "GET /api/guestbook/" 이 보여, 어디로 가는지 화면이 거짓말을 했다.
     실측: 기본 경로를 /api/snack 으로 → 안내 5줄 모두 /api/snack · 실제 요청도 GET /api/snack/ */
  const h = read('public/demo/guestbook-lab.html');
  assert.match(h, /function syncEndpointHints\(\)/);
  assert.match(h, /el\('basePath'\)\.addEventListener\('input', syncEndpointHints\)/);
  assert.ok((h.match(/class="ep" data-tail=/g) || []).length >= 5, '다섯 안내 문구 모두');
  assert.match(h, /class="ep-base"/, '설명 문단의 굵은 글씨도 따라가야 한다');
  /* HTML 의 경로는 **입력칸 기본값과 같은 초기값**이므로 남아 있어도 된다.
     중요한 것은 그 자리가 `.ep` 로 감싸여 스크립트가 바꿀 수 있느냐다. */
  for (const l of h.split('\n').filter((x) => x.includes('class="hint"') && x.includes('/api/guestbook'))) {
    assert.match(l, /class="ep" data-tail=/, `이 안내 문구는 바뀌지 않는다: ${l.trim().slice(0, 60)}`);
  }
});

test('(59) 방명록 실습 — 요청 파라미터를 넣을 수 있다', () => {
  /* GET·DELETE 는 본문을 못 싣는다. requestCode 처럼 서버가 요구하는 값을 넣을 자리가 없어
     그 API 들을 시험해 볼 수 없었다. 주소 뒤에 붙는 입력칸을 두어 모든 요청에 적용한다.
     실측 — 'requestCode=ABC&lang=ko' 를 적으면:
       안내  GET /api/guestbook/?requestCode=ABC&lang=ko
       실제  GET /api/guestbook/?requestCode=ABC&lang=ko   (표시와 같다)
       POST  POST /api/guestbook/?requestCode=Z9           (본문이 있는 요청에도 붙는다)
     까다로운 입력도 견딘다:
       '?requestCode=ABC' → ?requestCode=ABC     (앞의 ? 를 지운다)
       '  lang=ko  '      → ?lang=ko             (공백 정리)
       'q=한글 검색'      → ?q=%ED%95%9C...      (인코딩)
       'a=1&&b=2'         → ?a=1&b=2             (빈 조각 무시)
       'flag'             → ?flag=               (값 없는 것도 허용) */
  const h = read('public/demo/guestbook-lab.html');
  assert.match(h, /<input id="queryParams"/);
  assert.match(h, /function queryString\(\)/);
  assert.match(h, /\.replace\(\/\^\[\?&\]\+\/, ''\)/, '앞의 ? 나 & 는 지운다');
  assert.match(h, /encodeURIComponent\(k\) \+ '=' \+ encodeURIComponent\(v\)/, '한글·공백도 안전하게');
  /* 경로에 이미 ? 가 있으면 & 로 이어야 한다 */
  assert.match(h, /p\.includes\('\?'\) \? '&' : '\?'/);
  /* 적은 값이 안내 문구에도 보여야 한다 — 표시와 실제가 어긋나면 안 된다 */
  assert.match(h, /const suffix = qs \? '\?' \+ qs : '';/);
  assert.match(h, /el\('queryParams'\)\.addEventListener\('input', syncEndpointHints\)/);
});

test('(60) 직접 넣은 파일을 올리면 meta 를 만들어 준다', () => {
  /* 콘솔이 만든 컨트롤러·서비스에는 meta/이름.meta.json 이 함께 생기고, 콘솔의 편집·삭제가
     그것을 근거로 움직인다. 편집기로 직접 넣은 파일에는 meta 가 없어
     목록에서 기본 경로가 "미등록" 으로 보이고 편집도 매끄럽지 않았다.
     파일에 이미 @Controller('/api/theta') 라고 적혀 있으니 읽어서 만들어 주면 된다 —
     사람이 같은 것을 두 번 적을 이유가 없다.
     실측: Theta 3종을 직접 넣고 개별 올리기 →
       ThetaController.meta.json (basePath /api/theta · routes 2 · serviceName ThetaService)
       ThetaService.meta.json    (sqlFile theta · methods list·count)
       목록: base_path=/api/theta · hasMeta=true · routes=2 · /api/theta/list 200 */
  const svc = read('lib/admin/service/WorkspaceLoadService.js');
  assert.match(svc, /_ensureMeta\(kind, name, file\) \{/);
  assert.match(svc, /if \(fs\.existsSync\(metaPathFor\(file\)\)\) return null;/,
    '이미 meta 가 있으면 덮지 않는다 — 콘솔에서 손댄 내용을 잃으면 안 된다');
  assert.match(svc, /_metaFromController\(name, src\)/);
  assert.match(svc, /_metaFromService\(name, src\)/);
  assert.match(svc, /generatedFrom: 'source-scan'/, '어디서 온 값인지 남긴다');
  assert.match(svc, /meta 자동 생성 실패/, 'meta 를 못 만들어도 올리기 자체는 성공이다 — 조용히 넘어가지 않는다');
  assert.match(svc, /if \(kind === 'sql'\) return null;/, 'SQL 은 meta 를 쓰지 않는다');

  /* meta 가 없어도 목록이 기본 경로를 알아야 한다 (파일에서 읽는다) */
  const meta = read('lib/admin/service/ControllerMetaService.js');
  assert.match(meta, /const basePathFromSource = /);
  assert.match(meta, /base_path: meta\?\.basePath \?\? registered\?\.basePath \?\? basePathFromSource/);
});

test('(61) 안 올라온 것만 보고, 한꺼번에 올린다', () => {
  /* 하나씩 올리는 것만으로는 여러 개가 대기 중일 때 번거롭다.
     실측: Zeta·Eta 를 넣고 → "안 올라옴" 2건 · 필터를 켜면 그 2줄만 →
           [안 올라온 것 모두 올리기] → 2 → 0 · "미등록" 표시도 0 · 두 라우트 모두 200 */
  const comp = read('admin-client/src/composables/useLoadState.js');
  assert.match(comp, /async function loadAllOfKind\(\)/);
  assert.match(comp, /failed\.push\(/, '실패한 것은 따로 알려 준다');
  assert.match(comp, /const targets = \(r\.data\?\.data\?\.\[KEY\] \|\| \[\]\)\.filter\(\(x\) => !x\.loaded\)/,
    '이 화면의 안 올라온 것만 돈다');
  for (const f of ['ControllerList.vue', 'ServiceList.vue', 'SqlList.vue']) {
    const v = read(`admin-client/src/views/${f}`);
    assert.match(v, /loadState\.loadAllOfKind\(\)\.then\(\(\) => load\(\)\)/,
      `${f}: 올린 뒤 목록도 다시 읽어야 registered 가 갱신된다`);
    assert.match(v, /loadState\.onlyUnloaded\.value/, `${f}: 안 올라온 것만 보기`);
  }
});

test('(62) 컨트롤러·서비스도 파일 첫 주석을 [설명] 로 읽는다', () => {
  /* SQL 은 `-- 설명` 을 읽어 [설명] 열에 보여 주는데 컨트롤러·서비스는 그러지 않아,
     파일 맨 위에 이렇게 적어도 목록의 [설명] 이 비어 있었다:
         ///
         ///  내 준비물 API
         ///
     실측 — 세 형태 모두 인식:
       컨트롤러 /// → '내 준비물 API'
       서비스   //  → '준비물 목록을 읽어 오는 서비스'
       SQL      --  → '준비물 목록 조회' */
  for (const f of ['ControllerMetaService.js', 'ServiceMetaService.js']) {
    const s = read(`lib/admin/service/${f}`);
    assert.match(s, /_descriptionFromSource\(content, name = ''\)/, `${f}: 추출기`);
    assert.match(s, /\/\^\\\/\\\/\\\/\\s\*\(\.\*\)\$\//, `${f}: /// 형태`);
    assert.match(s, /auto-generated/i, `${f}: 자동 생성 문구는 건너뛴다`);
    assert.match(s, /if \(\/\^\(import\|export\|@\|const\|let\|class\)\\b\/\.test\(ln\)\) break;/,
      `${f}: 코드가 시작되면 그만 본다`);
  }
  const c = read('lib/admin/service/ControllerMetaService.js');
  assert.match(c, /description: meta\?\.description \|\| this\._descriptionFromSource\(content, name\)/);
});

test('(63) 일괄 올리기 — 진행률을 보여 주고 빈 화면을 만들지 않는다', () => {
  /* "안 올라온 것만" 을 켠 채로 일괄 올리기를 누르면, 다 올린 뒤 남는 것이 없어
     **빈 화면**이 됐다. 목록이 사라진 것으로 오해하기 쉽다.
     → 진행률을 보여 주고, 끝나서 남는 것이 없으면 필터를 스스로 끄고 그 사실을 알린다. */
  const comp = read('admin-client/src/composables/useLoadState.js');
  assert.match(comp, /const progress = reactive\(\{ done: 0, total: 0, current: '' \}\)/);
  assert.match(comp, /progress\.current = t\.name;/, '지금 무엇을 올리는지 보여 준다');
  assert.match(comp, /if \(onlyUnloaded\.value && unloadedCount\.value === 0\) \{/);
  assert.match(comp, /onlyUnloaded\.value = false;/, '남는 것이 없으면 필터를 끈다');
  assert.match(comp, /전체 목록으로 돌아갑니다/, '왜 화면이 바뀌었는지 말해 준다');
  for (const f of ['ControllerList.vue', 'ServiceList.vue', 'SqlList.vue']) {
    const v = read(`admin-client/src/views/${f}`);
    assert.match(v, /loadState\.progress\.done/, `${f}: 진행률`);
    assert.match(v, /loadState\.notice\.value/, `${f}: 안내`);
  }
});

test('(64) 일괄 올리기 — 브라우저에서 끝까지 확인했다', () => {
  /* 지난 판에서 "화면 동작은 확인 못 했다" 고 남긴 것을 실제로 검증했다.
     검증이 안 됐던 이유는 기능 문제가 아니라 **검증 순서**였다 —
     서버를 재기동하면 부팅이 workspace 를 읽어 올리므로(설계 그대로),
     재기동 뒤에 파일을 만들면 이미 "올라옴" 이 되어 조건이 만들어지지 않았다.
     → 서버를 먼저 띄우고, 그 뒤에 파일을 만들어야 미로딩 상태가 된다.

     실측 (컨트롤러 · 서비스 · SQL 세 화면 모두):
       필터 켬 → 4줄 → [모두 올리기]
       진행률   올리는 중 0/4 → 1/4 → 4/4 (지금 올리는 이름까지)
       끝난 뒤  10줄 (빈 화면 아님) · 스위치 사라짐 · "전체 목록으로 돌아갑니다"
       설명 열  주석에서 읽은 값이 그대로 (Alpha 검증용 API 등) */
  const comp = read('admin-client/src/composables/useLoadState.js');
  assert.match(comp, /progress\.done \+= 1;/);
  assert.match(comp, /if \(onlyUnloaded\.value && unloadedCount\.value === 0\)/);
  const v = read('admin-client/src/views/ControllerList.vue');
  assert.match(v, /loadState\.progress\.done \/ loadState\.progress\.total \* 100/, '진행률 막대');
});

test('(65) "올라옴" 은 그 파일이 올라와 있다는 뜻이어야 한다', () => {
  /* 겪은 일: SupplyService.js 를 지우고 같은 이름으로 새 파일을 넣었는데
     meta 도 없고 올린 적도 없는데 목록에는 "올라옴" — 올리기 단추가 없으니 영영 못 올린다.

     원인은 판정 근거였다. 서비스는 DI 컨테이너에, SQL 은 레지스트리에 **이름이 있는지**만 봤는데
     둘 다 한 번 담기면 빠지지 않는다(컨테이너에는 unregister 자체가 없고,
     SQL 의 unregisterFile 은 아무도 부르지 않는다). 컨트롤러는 listRegisteredControllers() 를
     보기 때문에 멀쩡했다 — 그래서 컨트롤러만 잘 동작했던 것이다.

     → 그 **파일**을 올렸는지를 수정 시각으로 기억한다. 지웠다 새로 넣으면 mtime 이 달라져
       다시 "안 올라옴" 이 된다. 실측으로 확인했다. */
  const svc = read('lib/admin/service/WorkspaceLoadService.js');
  assert.match(svc, /_mark\(kind, file\) \{/);
  assert.match(svc, /_isFileLoaded\(kind, file\) \{/);
  assert.match(svc, /fs\.statSync\(file\)\.mtimeMs === known/, '내용이 바뀌면 다시 올려야 한다');
  assert.match(svc, /loaded: this\._isFileLoaded\('service', f\.file\) && !!container/);
  assert.match(svc, /loaded: this\._isFileLoaded\('sql', f\.file\) && !!sqlRegistry/);

  /* 부팅이 올린 것에도 meta 를 만들어야 한다 — 그렇지 않으면
     "올라옴 인데 meta 없음" 상태로 남고, 올리기 단추가 없어 고칠 길이 없다 */
  assert.match(svc, /seedLoadedAtBoot\(\) \{/);
  assert.match(svc, /if \(this\._ensureMeta\(kind, f\.name, f\.file\)\) meta \+= 1;/);
  assert.match(read('src/server.js'), /seedLoadedAtBoot\?\.\(\)/);
});

test('(66) GitHub 올리기 — 비밀번호를 쓰지 않는다', () => {
  /* GitHub 는 2021-08-13 부터 비밀번호로는 push 를 받지 않는다.
     .env 에 계정/비밀번호를 적어도 인증이 안 되고, 무엇보다 비밀번호가 파일에 남는 것이 위험하다.
     → Personal Access Token 을 쓴다. 권한을 좁힐 수 있고 언제든 취소된다. */
  const s = read('scripts/git-push.mjs');
  assert.match(s, /GITHUB_TOKEN/);
  assert.match(s, /GITHUB_PASSWORD 는 쓰지 않습니다/, '비밀번호를 넣어 두면 알려 준다');
  /* 토큰이 .git/config 에 평문으로 남으면 안 된다 */
  assert.match(s, /const cleanUrl = `https:\/\/github\.com\/\$\{repo\}\.git`/);
  assert.match(s, /git', \['remote', 'set-url', 'origin', cleanUrl\]/,
    '리모트에는 토큰 없는 주소를 둔다');
  /* ★ v1.34.5 — 예전에는 토큰을 push 인자로 넘겼는데, 실패 시 명령이 그대로 출력되어
     토큰이 로그에 남았다. 이제 환경변수로만 넘긴다(시험 79 참고). */
  assert.match(s, /GIT_TOKEN: token/, '토큰은 환경변수로만');
  assert.equal(/\['push', pushUrl/.test(s), false, '명령줄에 토큰이 있으면 안 된다');
  /* .env 가 커밋에 섞이면 멈춘다 — 다만 .env.example 은 올려도 된다 */
  assert.match(s, /base === '\.env' \|\| \/\^\\\.env\\\.\(local\|production\|development\)\$\//);
  assert.match(s, /--dry-run/, '무엇이 올라갈지 먼저 볼 수 있어야 한다');

  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts.push, 'node scripts/git-push.mjs');
  assert.equal(pkg.scripts['release:github'], 'node scripts/git-release.mjs');
  /* 빌드는 두 OS 모두 */
  assert.match(pkg.scripts['dist:win'], /build-edition\.mjs/);
  /* ★ v1.33.3 — Linux 는 스크립트에 맡긴다 (Windows 에서는 AppImage 를 못 만든다) */
  assert.match(pkg.scripts['dist:linux'], /build-edition\.mjs --linux/);
  assert.match(pkg.scripts['dist:all'], /dist:win/);

  /* 릴리스는 다시 돌려도 안전해야 한다 (같은 이름 자산은 지우고 다시 올린다) */
  const r = read('scripts/git-release.mjs');
  assert.match(r, /releases\/tags\/\$\{tag\}/, '이미 있으면 그것을 쓴다');
  assert.match(r, /method: 'DELETE'/, '같은 이름 자산은 지우고 다시 올린다');
});

test('(67) 라이선스 — Apache-2.0 (넓은 채택 우선)', () => {
  /* 처음에는 AGPL-3.0 + 상용을 넣었다. "권한을 가장 크게" 라는 기준에는 맞지만
     AGPL 의존성을 금지하는 회사가 많아 **넓은 채택과 충돌한다.**
     채택이 필수라는 결정에 따라 Apache-2.0 으로 바꿨다.

     ⚠ 흔한 오해 하나: "팔 수 있는가" 는 라이선스가 아니라 **저작권**이 정한다.
     저작권자는 우리이므로 Apache-2.0 으로 공개해도 같은 코드를 상용으로 팔 수 있다.
     달라지는 것은 파는 것의 성격이다 — 허락(AGPL 회피)이 아니라 가치(지원·호스팅·모듈).
     대신 경쟁사도 가져다 닫힌 제품으로 팔 수 있다. 그것이 채택의 대가다. */
  const lic = read('LICENSE');
  assert.match(lic, /Apache License\n\s+Version 2\.0, January 2004/);
  assert.match(lic, /3\. Grant of Patent License/, '특허 조항이 Apache 를 고른 이유다');
  assert.match(lic, /Copyright 2026 Aidot Link Co\., Ltd\./, '부록 자리표시자를 채워야 한다');
  assert.equal(/\[yyyy\]|\[name of copyright owner\]/.test(lic), false, '자리표시자가 남으면 안 된다');

  /* NOTICE 는 Apache-2.0 관례이고, 상표를 지키는 자리이기도 하다 */
  const notice = read('NOTICE');
  assert.match(notice, /TRADEMARKS/);
  assert.match(notice, /grants rights to the code, not to the name/);

  const doc = read('docs/LICENSING.md');
  assert.match(doc, /The licence does not decide this; copyright does/, '오해를 먼저 푼다');
  assert.match(doc, /a competitor may also take this code/, '대가를 숨기지 않는다');
  assert.match(doc, /AGPL-3\.0\*\* gives the copyright holder the most leverage/,
    '왜 안 골랐는지도 남긴다');

  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.license, 'Apache-2.0');
  assert.match(read('admin-client/src/layouts/MainLayout.vue'), /라이선스: Apache-2\.0/);
  /* 공개용 문서에 옛 라이선스가 남아 있으면 안 된다 */
  for (const f of ['README.md', 'docs/articles/01-introducing-aidot-express.md',
                   'docs/articles/02-build-a-rest-api-in-10-minutes.md']) {
    assert.equal(/AGPL/.test(read(f)), false, `${f}: AGPL 잔여`);
  }
});

test('(68) README 와 소개 글', () => {
  const r = read('README.md');
  assert.equal(/Spring-like Node Server/.test(r), false, '옛 개발 문서가 남아 있으면 안 된다');
  assert.match(r, /## Quick start/);
  assert.match(r, /npm run dist:linux/, '두 OS 빌드 모두 적는다');
  assert.match(r, /Apache License 2\.0/);
  assert.equal(/[가-힣]/.test(r), false, 'README 는 영문이다');
  for (const f of ['docs/articles/01-introducing-aidot-express.md',
                   'docs/articles/02-build-a-rest-api-in-10-minutes.md']) {
    const a = read(f);
    assert.equal(/[가-힣]/.test(a), false, `${f}: 영문이어야 한다`);
    assert.match(a, /## /, `${f}: 소제목이 있어야 읽힌다`);
  }
  /* 튜토리얼 글은 우리가 실제로 검증한 것만 적는다 */
  const t = read('docs/articles/02-build-a-rest-api-in-10-minutes.md');
  assert.match(t, /Do \*\*not\*\* write `--typescript false`/, '실제로 겪은 함정을 적었다');
  assert.match(t, /workspace\/` is yours/, '업그레이드 시 잃기 쉬운 것을 미리 알린다');
});

test('(69) 빌드 — 루트 의존성이 없으면 미리 잡는다', () => {
  /* 겪은 일: Windows 에서 `npm run dist:win` 이 콘솔 빌드까지 잘 끝나고
     마지막 줄에서만 죽었다 —
       'electron-builder'은(는) 내부 또는 외부 명령ㆍ실행할 수 있는 프로그램이 아닙니다.

     원인은 의존성 선언이 아니라 **어디에 설치하느냐**였다.
     `build:admin` 은 `cd admin-client && npm install` 이라 **admin-client 폴더만** 설치한다.
     electron-builder 는 루트 devDependencies 에 있는데 루트에는 아무도 install 을 하지 않았다.
     3~4분을 기다린 뒤에야 알게 되는 데다, 메시지만 봐서는 무엇을 해야 할지 알기 어렵다.

     → 빌드 **시작 전에** 확인하고 없으면 설치한다. 확인은 package.json 이 아니라
       node_modules 에 실제로 있는지를 본다. */
  const s = read('scripts/ensure-build-deps.mjs');
  assert.match(s, /function needsInstall\(dir, probes\)/);
  assert.match(s, /fs\.existsSync\(path\.join\(dir, 'node_modules'\)\)/, '선언이 아니라 실물을 본다');
  assert.match(s, /electron-builder\.cmd' : 'electron-builder'/, 'Windows 는 .cmd 다');
  assert.match(s, /프록시 설정이 필요할 수 있습니다/, '실패하면 무엇을 할지 알려 준다');

  const pkg = JSON.parse(read('package.json'));
  for (const k of ['dist:win', 'dist:linux', 'build:electron']) {
    assert.match(pkg.scripts[k], /^npm run ensure:deps &&/, `${k}: 먼저 확인해야 한다`);
  }
  /* dist:all 은 dist:win 을 거치므로 그 안에서 확인된다 */
  assert.match(pkg.scripts['dist:all'], /^npm run dist:win &&/);
  /* build:admin 의 중복 install 은 뺀다 — ensure:deps 가 이미 한다 */
  assert.equal(pkg.scripts['build:admin'], 'cd admin-client && npm run build');
  assert.match(pkg.devDependencies['electron-builder'], /^\^?\d+/, '루트 devDependencies 에 있어야 한다');
});

test('(70) Windows 에서 Linux AppImage 를 만드는 길', () => {
  /* ⨯ ...appimage-12.0.1-qkv17\darwin\mksquashfs process failed ENOENT
     Windows 인데 darwin(macOS) 경로의 도구를 찾다가 죽었다.
     고칠 수 있는 버그가 아니라 도구의 제약이다 — 공식 문서가 못 박고 있다:
       "AppImages must be built on Linux (or via Docker).
        They cannot be cross-compiled from macOS or Windows."
     → 지금 환경에서 가능한 방법을 골라 대신 해 준다. */
  const s = read('scripts/build-linux.mjs');
  assert.match(s, /function buildWsl\(\)/);
  assert.match(s, /function buildDocker\(\)/);
  assert.match(s, /function buildTarGz\(\)/, 'WSL·Docker 가 없어도 뭔가는 만들어야 한다');
  /* WSL 은 Windows 용 네이티브 모듈을 덮어쓰면 안 된다 */
  assert.match(s, /--exclude node_modules/, '소스만 복사해 WSL 안에서 새로 설치한다');
  assert.match(s, /\$HOME\/\.cache\/aidot-express-linux-build/, '/mnt/d 위에서 빌드하면 느리다');
  /* Docker 도 같은 이유로 이름 있는 볼륨을 쓴다 */
  assert.match(s, /aidot-express-node-modules:\/project\/node_modules/);
  /* 없는 도구를 강요하지 말고, 무엇을 설치하면 되는지 알려 준다 */
  assert.match(s, /wsl --install -d Ubuntu/);

  const pkg = JSON.parse(read('package.json'));
  /* ★ v1.34.0 — 판(공개/full)을 가르느라 build-edition 을 거친다 */
  assert.match(pkg.scripts['dist:linux'], /build-edition\.mjs --linux$/);
  assert.match(read('scripts/build-edition.mjs'), /build-linux\.mjs/, 'Linux 는 그쪽에 맡긴다');
  /* ⚠ dist:all 은 Windows 를 **먼저** 만든다.
     지난 로그에서는 AppImage 가 먼저 죽는 바람에 exe 도 못 받았다. */
  assert.match(pkg.scripts['dist:all'],
    /^npm run dist:win && node scripts\/build-edition\.mjs --linux$/, 'Windows 를 먼저 끝내야 한다');

  /* tar.gz 도 릴리스에 올라가야 한다 (Windows 사용자의 보조 수단) */
  assert.match(read('scripts/git-release.mjs'), /\\\.tar\\\.gz\$/i);
});

test('(71) 릴리스 설명은 파일에서 만들고, 초안으로 올린다', () => {
  /* 예전에는 본문이 "aidot-express v1.33.3" 한 줄뿐이라 받는 사람이 무엇이 바뀌었는지
     알 수 없었다. CHANGELOG 에 이미 이번 판 이야기가 있으니 그 절을 잘라 쓴다.

     그리고 **초안(draft)** 으로 만든다 — 잘못 올린 릴리스를 되돌리는 것보다
     한 번 보고 내보내는 편이 안전하다. 사이트에서 고친 뒤 Publish 를 누르면 된다.

     실측: v1.33.3 절만 1,566자 잘라내고 다음 판(v1.33.2)은 섞이지 않았다. */
  const s = read('scripts/git-release.mjs');
  assert.match(s, /function releaseNotes\(version\)/);
  assert.match(s, /const next = md\.indexOf\('\\n## ', start \+ head\.length\)/, '다음 판 전까지만');
  assert.match(s, /draft: true/, '초안으로 만든다');
  assert.match(s, /Publish release\] 를 누르면 공개됩니다/, '무엇을 더 해야 하는지 알려 준다');
  /* 받는 사람이 파일을 어떻게 쓰는지도 본문에 넣는다.
     ★ v1.35.4 — 릴리스 화면에 그대로 보이므로 영문이다 (시험 84 참고) */
  assert.match(s, /### Downloads/);
  assert.match(s, /chmod \+x/);
  /* GitHub 이 거절하면 이유를 풀어서 말해 준다 */
  assert.match(s, /function explain\(e\)/);
  for (const code of ['401', '403', '404', '422']) {
    assert.ok(s.includes(`startsWith('${code}')`), `${code} 안내가 있어야 한다`);
  }
});

test('(72) WSL 빌드 — 스크립트를 인자로 넘기지 않는다', () => {
  /* 실측 로그:
       ▶ WSL(Ubuntu) 안에서 만듭니다
       BASH_EXECUTION_STRING=set          ← bash 가 받은 명령이 "set" 하나뿐
       DEP0190 DeprecationWarning: Passing args to a child process with shell option true

     `shell: true` 면 Node 가 인자를 **이스케이프 없이 이어 붙여** cmd.exe 에 넘긴다.
     여러 줄짜리 bash 스크립트를 인자로 주니 첫 단어만 살아남았다. Node 도 경고하고 있었다.
     → 스크립트를 파일로 쓰고 **경로만** 넘긴다. shell 은 .cmd 인 npm·npx 에만 쓴다. */
  const s = read('scripts/build-linux.mjs');
  assert.match(s, /const needsShell = \(cmd\) => isWin && \/\^\(npm\|npx\|yarn\|pnpm\)\$\/\.test\(cmd\)/);
  /* 주석에는 "예전에 shell: isWin 을 썼다" 는 설명이 남아 있으므로 코드 줄만 본다 */
  const codeLines = s.split('\n').filter((l) => !/^\s*(\*|\/\*|\/\/)/.test(l));
  assert.equal(codeLines.some((l) => /shell: isWin/.test(l)), false,
    'wsl.exe·docker 에 shell 을 쓰면 안 된다');
  assert.match(s, /fs\.writeFileSync\(tmpWin, script/, '스크립트는 파일로');
  assert.match(s, /run\('wsl\.exe', \['-d', distro, '--', 'bash', '-l', tmpWsl\]\)/, '경로만 넘긴다');
  assert.match(s, /fs\.rmSync\(tmpWin, \{ force: true \}\)/, '임시 파일은 지운다');
  /* rsync 가 없는 배포판도 있다 */
  assert.match(s, /if command -v rsync >\/dev\/null; then/);
  assert.match(s, /tar --exclude=node_modules/, 'rsync 이 없으면 tar 로');
});

test('(73) WSL 안에서 Windows 의 Node 를 쓰지 않는다', () => {
  /* 실측 로그 — WSL 로 들어가긴 했는데 Windows npm 이 돌았다:
       npm error command C:\Windows\system32\cmd.exe /d /s /c node ./script/select-7z-arch.js
       npm error UNC 경로는 지원되지 않습니다
       npm error Node.js v24.15.0                  ← Windows 쪽 Node
     Linux 빌드인데 electron-winstaller(Windows 전용)까지 설치하려 했다.

     원인: WSL 은 Windows 의 PATH 를 그대로 물려받는다(/mnt/c/Program Files/nodejs 등).
     그래서 `command -v node` 가 Windows 의 node.exe 를 찾아 **검사를 통과해 버렸다.**

     → PATH 에서 /mnt/<드라이브>/ 를 걷어낸 뒤 검사하고, 그래도 /mnt 로 시작하면 막는다. */
  const s = read('scripts/build-linux.mjs');
  assert.match(s, /grep -v "\^\/mnt\/\[a-z\]\/"/, 'Windows 경로를 PATH 에서 걷어낸다');
  assert.match(s, /case "\$\(command -v node\)" in \/mnt\/\*\)/, '그래도 남아 있으면 막는다');
  assert.match(s, /Windows 의 Node 는 Linux 빌드에 쓸 수 없습니다/, '왜 안 되는지 말해 준다');
  assert.match(s, /deb\.nodesource\.com\/setup_22\.x/, '무엇을 설치하면 되는지 알려 준다');
  /* nvm 처럼 프로필에서 PATH 를 잡는 경우가 있어 로그인 셸로 실행한다 */
  assert.match(s, /'bash', '-l', tmpWsl/);
});

test('(74) 공개판 걸러내기 — 사람이 기억하지 않아도 되게', () => {
  /* 실제 환자 데이터(232KB JSON)가 공개 저장소에 올라갔다. 원인은 기술이 아니라 절차였다 —
     "이 파일은 공개하면 안 된다" 를 사람이 매번 기억해야 했다.
     → 규칙을 파일에 적고 스크립트가 강제한다. 셋 중 하나라도 걸리면 push 하지 않는다. */
  const cfg = JSON.parse(read('scripts/publish/public-filter.json'));
  for (const p of ['mci-server/**', 'src/core/ha/**', 'src/secure/**', '**/.env']) {
    assert.ok(cfg.deny.includes(p), `deny 에 ${p} 가 있어야 한다`);
  }
  /* 크기 검사 — 유출된 파일이 232KB 였다 */
  assert.ok(cfg.maxDataFileBytes <= 102400, '큰 데이터 파일은 사람이 봐야 한다');

  const s = read('scripts/publish/sync-public.mjs');
  assert.match(s, /const denied = all\.filter\(isDenied\)/, '① 경로 차단');
  assert.match(s, /민감한 흔적 없음/, '② 내용 검사');
  assert.match(s, /데이터 파일이 큽니다/, '③ 크기 검사');
  assert.match(s, /if \(problems\.length\)/);
  assert.match(s, /process\.exit\(1\)/, '걸리면 올리지 않는다');
  /* 공개판은 생성물이므로 이력을 남기지 않는다 */
  assert.match(s, /'push', '--force'/);
  /* 커밋 메시지는 영문 — 저장소는 세계 어디서나 읽힌다 */
  assert.match(s, /`Release v\$\{version\}`/);
  /* git commit -m 에 넘기는 문자열만 본다 (주석의 한글 설명은 남아 있어도 된다) */
  const commitArgs = [...s.matchAll(/'commit'[^\]]*\]/g)].map((m) => m[0]).join(' ');
  assert.equal(/[가-힣]/.test(commitArgs), false, '커밋 메시지에 한글이 없어야 한다');
  assert.equal(/chore: 업데이트/.test(read('scripts/git-push.mjs')), false);
  assert.match(read('scripts/git-push.mjs'), /chore: update/);

  /* README 는 Enterprise 를 명시하고 문의처를 준다 */
  const r = read('README.md');
  assert.match(r, /## Enterprise edition/);
  for (const f of ['Middleware integration', 'High availability', 'Backup and restore', 'Column encryption']) {
    assert.ok(r.includes(f), `README 에 ${f} 가 있어야 한다`);
  }
  assert.match(r, /mike\.jung\.global@gmail\.com/);
});

test('(75) 공개 범위 — 개발 흔적과 엔터프라이즈 설정을 함께 뺀다', () => {
  /* 요구가 늘었다: 엔터프라이즈 코드뿐 아니라 **개발 과정에서 생긴 것**도 빼야 한다.
     docs 의 설계 메모, 리뷰 문서, CHANGELOG, 훈련 스크립트, 예제 프로젝트 등.

     docs 는 차단 목록이 아니라 **남길 목록**으로 뒤집었다. 차단 목록이면
     설계 메모가 하나 늘 때마다 규칙을 고쳐야 하고, 깜빡한 그 하나가 새어 나간다. */
  const cfg = JSON.parse(read('scripts/publish/public-filter.json'));
  assert.ok(cfg.allowOnly?.['docs/**'], 'docs 는 남길 것만 지정한다');
  assert.deepEqual(cfg.allowOnly['docs/**'],
    ['docs/aidot-express-tutorial-*.pdf', 'docs/LICENSING.md'],
    '완성된 읽을거리만 나간다 (pptx 원본·설계 메모는 제외)');
  for (const p of ['CHANGELOG.md', 'docs/tutorial-src/**', 'examples/**', 'scripts/publish/**',
                   '.env.enterprise.example', '.electron-builder.*.json']) {
    assert.ok(cfg.deny.includes(p), `deny 에 ${p} 가 있어야 한다`);
  }

  /* .env 는 두 개로 나눈다 — 공개용에는 엔터프라이즈 설정이 없어야 한다 */
  const pub = read('.env.example');
  assert.equal(/^\s*#?\s*(MCI_|HA_|SECURE_|FEATURE_(BACKUP|SECURE_COLUMNS|HA))/m.test(pub), false,
    '공개용 .env.example 에 엔터프라이즈 설정이 남으면 안 된다');
  const ent = read('.env.enterprise.example');
  assert.match(ent, /공개 저장소·공개 설치 파일에 포함되지 않습니다/);
  assert.match(ent, /MCI_/);

  /* 설치 파일도 같은 규칙을 쓴다 — 저장소와 설치 파일이 어긋나면 안 된다 */
  const be = read('scripts/build-edition.mjs');
  assert.match(be, /public-filter\.json/, '설치 파일도 같은 파일을 본다');
  assert.match(be, /excludes\.push\(`!\$\{scope\}`\)/, 'allowOnly 를 electron-builder 규칙으로');
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['dist:win'], /build-edition\.mjs$/, '기본은 공개판');
  assert.match(pkg.scripts['dist:win:full'], /--full/);

  /* 한글 주석은 막지 않되 알려 준다 — 번역은 한 번에 끝나지 않는다 */
  const sp = read('scripts/publish/sync-public.mjs');
  assert.match(sp, /막지는 않습니다/);
});

test('(76) 공개판 — 콘솔은 그대로, 엔터프라이즈 메뉴만 안 보인다', () => {
  /* 공개판에도 콘솔은 다 들어간다(컨트롤러·서비스·SQL·화면 디자이너·요청 추적 …).
     빠지는 것은 엔터프라이즈 화면뿐이다.

     ⚠ 그런데 화면 파일만 빼면 위험하다. 사이드바가 여전히 /ha 를 가리키면
     눌렀을 때 빈 화면이 나온다. `.env` 로 켤 수도 있고 — 화면이 없는데 켜진다.

     → "설정이 켜졌는가" 와 "그 화면이 번들에 있는가" 를 **둘 다** 본다.
     실측: 개발 빌드는 넷 다 true, 공개판 빌드는 넷 다 false. */
  const s = read('lib/admin/controller/SystemInfoController.js');
  assert.match(s, /function hasScreen\(name\)/);
  assert.match(s, /f\.startsWith\(`\$\{name\}-`\) && f\.endsWith\('\.js'\)/, '번들 파일 이름으로 확인');
  for (const [flag, screen] of [
    ['mciGeneratorEnabled', 'MciControllerNew'],
    ['backupEnabled', 'BackupPage'],
    ['secureColumnsEnabled', 'SecureColumnsPage'],
    ['haEnabled', 'HaPage'],
  ]) {
    assert.match(s, new RegExp(`${flag}:[^\\n]*hasScreen\\('${screen}'\\)`), `${flag} 는 화면 존재도 봐야 한다`);
  }
  /* 요청마다 폴더를 읽지 않는다 */
  assert.match(s, /_screenCache/);

  /* 공개용 .env.example 은 그 기능을 꺼 둔 채 이유를 적는다 */
  const env = read('.env.example');
  assert.match(env, /EAI_ENABLED=false/);
  assert.match(env, /enterprise feature/i);
  assert.match(env, /shows menus whose screens are not bundled/,
    '왜 켜면 안 되는지 적어 둔다');
});

test('(77) .env.example 은 전부 영문 · 빌드 문서가 있다', () => {
  /* 공개용 .env.example 에 한글 주석 74줄이 남아 있었다. 내부에서는 문제가 없지만
     공개 저장소에서는 읽을 사람을 좁힌다. 값 줄은 건드리지 않고 주석만 옮겼다. */
  const env = read('.env.example');
  assert.equal(/[가-힣]/.test(env), false, '공개용 .env.example 에 한글이 남으면 안 된다');
  /* 값은 그대로여야 한다 — 번역하다 설정을 망가뜨리면 안 된다 */
  for (const k of ['DB_TYPE', 'DB_DATABASE', 'AUTH_ACCESS_SECRET', 'PORT', 'EAI_ENABLED']) {
    assert.ok(env.includes(`${k}=`), `${k} 항목이 남아 있어야 한다`);
  }
  /* 엔터프라이즈용은 한글 그대로 둔다 — 사내 문서다 */
  assert.match(read('.env.enterprise.example'), /[가-힣]/);

  const doc = read('docs/BUILD_AND_RELEASE.md');
  for (const cmd of ['npm run dist:win', 'npm run dist:linux', 'npm run push',
                     'npm run sync:public', 'npm run release:github']) {
    assert.ok(doc.includes(cmd), `문서에 ${cmd} 가 있어야 한다`);
  }
  assert.match(doc, /Publish release/, '공개하는 마지막 단계까지 적는다');
  assert.match(doc, /자주 겪는 것/, '겪은 오류와 대처를 남긴다');
  assert.match(doc, /mksquashfs ENOENT/);
});

test('(78) push 실패 뒤 다시 돌리면 커밋만 올린다', () => {
  /* 겪은 일: 토큰이 만료돼 push 가 실패했다. 그런데 **커밋은 이미 되어 있었다.**
     새 토큰으로 다시 돌리니 스테이징할 것이 없어 "바뀐 것이 없습니다" 로 끝났다 —
     올라가지 않았는데도 할 일이 없다고 말한 것이다.

     원인: `git diff --cached` 만 보고 "아직 올리지 않은 커밋" 은 보지 않았다.
     커밋과 push 는 두 단계인데 앞의 것만 확인한 셈이다.

     실측: 커밋만 있고 push 안 된 상태에서 → "올리지 않은 커밋이 있습니다 — 그것만 올립니다" */
  const s = read('scripts/git-push.mjs');
  assert.match(s, /function unpushedCount\(\)/);
  assert.match(s, /rev-list', '--count', `origin\/\$\{branch\}\.\.HEAD`/);
  assert.match(s, /올릴 커밋도 없습니다/, '정말 할 일이 없을 때만 그렇게 말한다');
  assert.match(s, /그것만 올립니다/);
  /* 원격을 아직 모르는 경우(첫 push)도 구분한다 */
  assert.match(s, /아직 아무것도 올린 적이 없어/);
});

test('(79) 토큰을 명령줄에 두지 않는다', () => {
  /* ⚠ 실제로 새어 나갔다. push 가 실패하자 Node 가 실패한 명령을 그대로 출력했다:
       Error: Command failed: git push --force https://github_pat_11AD5...@github.com/...
     그 순간 토큰이 터미널 로그에 남았다. 평소에는 보이지 않아 알아채기 어렵다.

     → 자격 증명은 환경변수로만 넘기고, git 이 임시 credential helper 로 읽게 한다.
       명령줄에는 평범한 주소만 남는다.
     실측: 일부러 실패시켜도 출력에 토큰 흔적 0건. */
  for (const f of ['scripts/git-push.mjs', 'scripts/publish/sync-public.mjs']) {
    const s = read(f);
    assert.equal(/https:\/\/\$\{token\}@/.test(s), false, `${f}: 토큰이 든 주소를 만들면 안 된다`);
    assert.match(s, /credential\.helper=/, `${f}: helper 로 넘긴다`);
    assert.match(s, /GIT_TOKEN: token/, `${f}: 환경변수로만`);
    assert.match(s, /GIT_TERMINAL_PROMPT: '0'/, `${f}: 멈춰 서서 묻지 않는다`);
  }
  /* 403 은 대부분 토큰 범위 문제다 — 무엇을 하면 되는지 알려 준다 */
  assert.match(read('scripts/publish/sync-public.mjs'), /fine-grained 토큰은 저장소를 하나씩 고릅니다/);

  /* CRLF 경고가 로그를 덮어 정작 볼 것을 가린다 */
  assert.match(read('.gitattributes'), /\* text=auto eol=lf/);
});

test('(80) 자격 증명 helper 목록을 비우고 우리 것만 쓴다', () => {
  /* 겪은 일: 토큰 유출은 막았는데 이번엔 인증이 실패했다.
       remote: Invalid username or token. Password authentication is not supported.

     원인: `-c credential.helper=X` 는 기존 helper 에 **덧붙을 뿐 대체하지 않는다.**
     Windows Git 은 전역에 manager 를 설정해 두는데, 그쪽이 먼저 답하면
     예전에 저장해 둔(이미 폐기된) 토큰이 쓰인다.

     실측으로 재현했다 — 전역에 옛 토큰을 주는 helper 를 두고:
       덧붙이기만:        password=OLD_REVOKED_TOKEN  (옛 것이 이긴다)
       빈 값으로 비운 뒤:  password=NEW_GOOD_TOKEN     (우리 것이 쓰인다) */
  for (const f of ['scripts/git-push.mjs', 'scripts/publish/sync-public.mjs']) {
    const s = read(f);
    assert.match(s, /'-c', 'credential\.helper=', '-c'/,
      `${f}: 빈 값으로 목록을 먼저 비워야 한다`);
    assert.match(s, /Invalid username or token/, `${f}: 그 오류가 무엇인지 알려 준다`);
    assert.match(s, /자격 증명 관리자/, `${f}: 어디서 지우는지 알려 준다`);
  }
});

test('(81) npm run all — 빌드부터 공개판까지 한 번에', () => {
  /* 매번 다섯 명령을 순서대로 치는 것은 잊기 쉽고, 순서를 틀리면 문제가 생긴다.
     특히 릴리스는 push **뒤**여야 한다 — 태그는 그 소스를 가리키는데,
     올리지 않은 코드로 릴리스를 만들면 태그가 가리키는 커밋이 GitHub 에 없다. */
  const s = read('scripts/release-all.mjs');
  const order = ['dist:win', 'dist:linux', 'push', 'release:github', 'sync:public']
    .map((k) => s.indexOf(`'${k}'`));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), '단계 순서가 어긋났다');
  assert.ok(order.every((i) => i > 0), '다섯 단계가 모두 있어야 한다');

  /* ⚠ 중간이 실패해도 앞 단계 결과는 남아야 한다.
     예전에 AppImage 가 먼저 죽어 exe 까지 못 받은 적이 있다. */
  assert.match(s, /앞 단계 결과물은 그대로 남아 있습니다/);
  /* Linux 와 릴리스는 없어도 전체를 멈추지 않는다 */
  assert.match(s, /step\('Linux 설치 파일 \(공개판\)', \['run', 'dist:linux'\], \{ optional: true \}\)/);
  assert.match(s, /step\('설치 파일 릴리스 \(초안\)', \['run', 'release:github'\], \{ optional: true \}\)/);
  /* 무엇이 되고 무엇이 안 됐는지 끝에 요약한다 */
  assert.match(s, /function report\(\)/);
  for (const flag of ['--dry-run', '--no-build', '--no-publish', '--no-release']) {
    assert.ok(s.includes(flag), `${flag} 를 받아야 한다`);
  }
  assert.equal(JSON.parse(read('package.json')).scripts.all, 'node scripts/release-all.mjs');
});

test('(82) full 판 설치 파일은 공개 릴리스에 올라가지 않는다', () => {
  /* 구멍이 있었다: `npm run dist:win:full` 을 한 번이라도 돌리면 `-full` 설치 파일이
     dist-electron 에 남는데, release:github 은 **확장자만 보고** 골랐다.
     그 다음 릴리스를 돌리면 MCI·이중화가 든 설치 파일이 공개로 나갔을 것이다.

     실측: 공개판 2개 + full 판 1개를 두고 돌려 →
       "⚠ full 판 1개는 올리지 않습니다" · "릴리스 v1.35.1 — 파일 2개" */
  const s = read('scripts/git-release.mjs');
  assert.match(s, /const isFull = \(f\) => \/-full\[-\.\]\/i\.test\(f\)/);
  /* ★ v1.35.3 — 버전 필터가 먼저 오고, 그 뒤에 full 판을 거른다 */
  assert.match(s, /\.filter\(\(f\) => allowFull \|\| !isFull\(f\)\)/);
  assert.match(s, /공개 릴리스이므로/);
  /* --allow-full 은 있지만 그냥 지나가지 않는다 */
  assert.match(s, /setTimeout\(r, 5000\)/, '실수를 되돌릴 수 없으므로 확인 시간을 준다');

  /* 기본 빌드는 공개판이어야 한다 */
  const pkg = JSON.parse(read('package.json'));
  assert.equal(/--full/.test(pkg.scripts['dist:win']), false, 'dist:win 기본은 공개판');
  assert.equal(/--full/.test(pkg.scripts['dist:linux']), false, 'dist:linux 기본은 공개판');
  assert.match(pkg.scripts['dist:win:full'], /--full/);
  assert.equal(/--full/.test(pkg.scripts['dist:all']), false, 'dist:all 도 공개판');

  /* 문서는 영문 */
  const doc = read('docs/RELEASING.md');
  assert.match(doc, /## Editions/);
  assert.match(doc, /Full-edition installers are never released/);
  assert.match(doc, /public-filter\.json/, '기준이 한 곳임을 적는다');
  assert.match(doc, /## When something fails/, '겪은 오류와 대처를 남긴다');
});

test('(83) 릴리스에 옛 버전 설치 파일이 섞이지 않는다', () => {
  /* dist-electron 은 빌드할 때마다 비워지지 않는다. 여러 번 빌드하면 옛 버전이 쌓이고,
     확장자만 보고 고르면 그것들도 함께 올라간다.
     실측: v1.30.0 · v1.31.0 을 섞어 두었더니 v1.35.2 릴리스에 3개가 올라갔다.
           고친 뒤 다시 돌려 1개로 줄었다. */
  const s = read('scripts/git-release.mjs');
  assert.match(s, /const forThisVersion = \(f\) => f\.includes\(version\)/);
  assert.match(s, /const stale = all\.filter\(\(f\) => !forThisVersion\(f\)\)/);
  assert.match(s, /다른 버전 \$\{stale\.length\}개는 건너뜁니다/, '무엇을 건너뛰었는지 보여 준다');

  /* 애초에 쌓이지 않게 빌드 전에 지운다 */
  const b = read('scripts/build-edition.mjs');
  assert.match(b, /지난 \$\{isFull \? 'full' : '공개'\}판 산출물/);
  /* ⚠ 다른 판의 것은 건드리면 안 된다 — 둘을 따로 만들어 두고 쓸 수 있어야 한다 */
  assert.match(b, /return isFull \? \/-full\[-\.\]\/i\.test\(f\) : !\/-full\[-\.\]\/i\.test\(f\);/);
});

test('(84) 릴리스는 공개 저장소로, 설명은 영문으로', () => {
  /* 두 가지가 어긋나 있었다.

     ① 대상: GITHUB_REPO(= full, private)로 올리고 있었다. 그쪽은 개발용이라
        사용자가 볼 수 없다. 릴리스는 사람들이 설치 파일을 받는 자리다.
     ② 설명: CHANGELOG.md 에서 가져왔는데 그것은 한글 사내 기록이다.
        공개 저장소에는 나가지 않는 파일인데 그 내용만 릴리스로 새어 나갔다.

     실측: 기본 → mike-jung/aidot-express (공개), --to-full → ...-full (사내) */
  const s = read('scripts/git-release.mjs');
  assert.match(s, /const repo = toFull \? env\.GITHUB_REPO : \(env\.PUBLIC_REPO \|\| env\.GITHUB_REPO\)/);
  assert.match(s, /릴리스 대상: \$\{repo\}/, '어디로 가는지 매번 보여 준다');
  assert.match(s, /PUBLIC_REPO 가 없어 GITHUB_REPO 로 올립니다/, '없을 때 알려 준다');

  /* 설명은 RELEASE_NOTES.md 에서 */
  assert.match(s, /'RELEASE_NOTES\.md' : 'CHANGELOG\.md'/);
  const notes = read('RELEASE_NOTES.md');
  assert.equal(/[\uAC00-\uD7A3]/.test(notes), false, 'RELEASE_NOTES 는 영문이어야 한다');
  assert.match(notes, /^## v\d+\.\d+\.\d+ — /m, '스크립트가 찾는 제목 형식');

  /* 스크립트가 덧붙이는 안내도 릴리스 화면에 보인다 — 그것도 영문 */
  assert.match(s, /### Downloads/);
  assert.equal(/설치 파일은 아래 Assets/.test(s), false, '덧붙이는 안내에 한글이 남으면 안 된다');
});
