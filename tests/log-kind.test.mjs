/**
 * 로그 유형 분리 시험. (v1.9.4)
 *
 *  설계 결론: **나누되 원본은 쪼개지 않는다.**
 *   ① 모든 줄에 `kind=` — 도구 없이 grep 으로도 뽑힌다 (logfmt 관행)
 *   ② SQL 을 원본에서 빼지 않는다 — 빼면 장애 때 "그 시각에 무슨 쿼리가" 를 알 수 없다
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loggerSrc = fs.readFileSync(path.join(ROOT, 'src/util/logger.js'), 'utf8');
const dbSrc = fs.readFileSync(path.join(ROOT, 'src/database/db.js'), 'utf8');

test('★ 파일 형식에 kind= 가 들어간다 — 도구 없이 grep 으로 뽑히는 것이 바닥이다', () => {
  assert.match(loggerSrc, /kind=\$\{k\}/, '텍스트에 kind= 가 새겨져야 한다');
  assert.match(loggerSrc, /export const LOG_KINDS/);
});

test('★ SQL 을 원본 로그에서 빼지 않는다 — 이것이 이번 판의 핵심', () => {
  // 예전: const dbLog = sqlLogger || logger  → LOG_SQL=true 면 원본에서 사라졌다
  assert.equal(/const dbLog = sqlLogger \|\| logger/.test(dbSrc), false,
    '배타적 분기가 남아 있으면 SQL 이 원본에서 사라진다');
  /* ★ v1.10.26 — kind 가 sql / internal 로 갈렸다(프레임워크 배관 분리).
     의도는 그대로다: SQL 을 **원본 로그에서 빼지 않는다.** */
  assert.ok(dbSrc.includes("logger[ok ? 'debug' : 'warn'](line, { kind: sqlKind })"),
    '원본에 항상 남긴다');
  assert.match(dbSrc, /const sqlKind = framework \? 'internal' : 'sql'/, 'kind 를 갈라야 한다');
  assert.ok(dbSrc.includes("if (sqlLogger) sqlLogger[ok ? 'debug' : 'warn'](line)"),
    '전용 파일에는 추가로 쓴다');
});

test('유형은 실제로 따로 보게 되는 것만 둔다', () => {
  const m = /export const LOG_KINDS = \[([^\]]*)\]/.exec(loggerSrc);
  const kinds = m[1].split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean);
  for (const k of ['sql', 'http', 'auth']) assert.ok(kinds.includes(k), `${k} 가 빠졌다`);
  assert.ok(kinds.includes('app'), '분류 못 한 줄이 갈 곳이 있어야 한다 — 빈 값이면 grep 이 어긋난다');
  assert.ok(kinds.length <= 8, '잘게 쪼개면 그것대로 못 쓴다');
});

/* ── 질의 도구 ────────────────────────────────────────────────────────── */
const SAMPLE = [
  '2026-08-25 14:29:51.440 [INFO ] [c91f77aa] kind=http [server.js:129] GET /api/notes/8 → 200 (595ms)',
  '2026-08-25 14:29:52.160 [DEBUG] [c91f77aa] kind=sql [db.js:120] [DB:mariadb] execute: SELECT 1 (1200ms)',
  '2026-08-25 14:29:52.700 [ERROR] [c91f77aa] kind=http [server.js:129] GET /api/notes/15 → 500 (66ms)',
  '2026-08-25 14:30:10.000 [INFO ] [-] kind=migration [m.js:52] [migration] 적용 001_x.sql (3ms)',
];
const LINE_RE = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \[(\w+)\s*\](?:\s*\[([0-9a-zA-Z_-]+)\])?\s*kind=(\w+)\s*(.*)$/;
const parse = (raw) => {
  const m = LINE_RE.exec(raw);
  if (!m) return null;
  const ms = /\((\d+)ms\)/.exec(m[5]);
  return { ts: m[1], at: Date.parse(m[1].replace(' ', 'T')), level: m[2],
    requestId: m[3] === '-' ? null : m[3], kind: m[4], ms: ms ? Number(ms[1]) : null };
};

test('로그 줄에서 필드를 모두 뽑아낸다', () => {
  const p = parse(SAMPLE[1]);
  assert.equal(p.kind, 'sql');
  assert.equal(p.level, 'DEBUG');
  assert.equal(p.requestId, 'c91f77aa');
  assert.equal(p.ms, 1200);
  assert.ok(Number.isFinite(p.at));
});

test('요청 ID 가 없는 줄도 깨지지 않는다', () => {
  const p = parse(SAMPLE[3]);
  assert.equal(p.kind, 'migration');
  assert.equal(p.requestId, null);
});

test('★ 시간 창은 유형을 넘나든다 — 파일을 쪼갰다면 만들 수 없는 기능', () => {
  const rows = SAMPLE.map(parse);
  const t = Date.parse('2026-08-25T14:29:52.000');
  const win = rows.filter((r) => Math.abs(r.at - t) <= 1000);
  assert.equal(win.length, 3, '앞뒤 1초');
  // 오류 직전에 1200ms 쿼리가 있었다는 것이 한 눈에 보여야 한다
  assert.deepEqual(win.map((r) => r.kind), ['http', 'sql', 'http']);
  assert.equal(win[1].ms, 1200);
});

test('kind 로 거르는 것이 grep 과 같은 결과를 낸다', () => {
  // 도구가 없어도 되는 것이 설계의 바닥이다
  const byTool = SAMPLE.map(parse).filter((r) => r.kind === 'sql').length;
  const byGrep = SAMPLE.filter((l) => l.includes('kind=sql')).length;
  assert.equal(byTool, byGrep);
  assert.equal(byTool, 1);
});

test('질의 도구가 문법 없이 낱말을 받는다', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/logs.mjs'), 'utf8');
  for (const w of ['queries', 'errors', '오류', 'today', 'slow']) {
    assert.ok(src.includes(`${w}:`) || src.includes(`'${w}'`) || src.includes(`${w} `),
      `'${w}' 를 못 받는다`);
  }
  assert.match(src, /--around/, '시간 창이 1급이어야 한다');
  assert.match(src, /--fields/, '필드 이름을 외우게 하지 않는다');
  assert.match(src, /grepEquivalent/, '동등한 grep 을 보여 줘야 사용자가 도구에 갇히지 않는다');
});

test('표현할 수 없는 질의는 grep 을 보여 주지 않는다', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/logs.mjs'), 'utf8');
  // 시간 창은 grep 으로 못 한다 — 틀린 명령을 주는 것보다 안 주는 게 낫다
  assert.match(src, /if \(qq\.around \|\| qq\.slower != null \|\| qq\.since\) return null/);
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.9.5 — 회전으로 쪼개진 파일 · 콘솔 질의
   ══════════════════════════════════════════════════════════════════════════ */

test('★ 파일 정렬은 경로가 아니라 수정 시각 기준이다', () => {
  // 크기 상한에 걸려 회전하면 `2026-08-25.1.log` 가 생기는데, 경로 정렬에서는
  // '1'(0x31) < 'l'(0x6C) 이라 `.1` 이 본체보다 앞에 온다.
  // 그 상태로 "최근 N개" 를 자르면 가장 최신 파일이 잘린다.
  const names = ['2026-08-25.log', '2026-08-25.1.log', '2026-08-25.2.log'];
  const byPath = [...names].sort();
  assert.equal(byPath[byPath.length - 1], '2026-08-25.log',
    '경로 정렬에서는 본체가 맨 뒤 — 회전본이 앞선다');

  for (const src of [
    fs.readFileSync(path.join(ROOT, 'scripts/logs.mjs'), 'utf8'),
    fs.readFileSync(path.join(ROOT, 'src/util/logScan.js'), 'utf8'),   // ★ v1.11.4 — 훑는 코드는 여기로 옮겨졌다
  ]) {
    assert.match(src, /mtimeMs/, '수정 시각으로 정렬해야 한다');
    assert.match(src, /a\.mtime - b\.mtime/);
  }
});

test('★ 이어진 줄이 파일 경계를 넘지 않는다', () => {
  // SQL 전문처럼 여러 줄인 로그가, 앞 파일의 마지막 줄에 붙으면
  // 다른 시각의 다른 사건이 한 덩어리가 된다.
  for (const src of [
    fs.readFileSync(path.join(ROOT, 'scripts/logs.mjs'), 'utf8'),
    fs.readFileSync(path.join(ROOT, 'src/util/logScan.js'), 'utf8'),
  ]) {
    assert.equal(/lines\[lines\.length - 1\]\.raw \+=/.test(src), false,
      '전역 마지막 줄에 붙이면 파일 경계를 넘는다');
    assert.match(src, /let last = null/, '파일마다 last 를 초기화해야 한다');
  }
});

test('쪼개진 파일에서도 시간순으로 병합된다', () => {
  // 회전본 두 개가 시간이 이어지는 상황
  const a = ['2026-08-25 14:13:53.303 [INFO ] [r1] kind=auth [x:1] 끝'];
  const b = ['2026-08-25 14:14:00.440 [INFO ] [r1] kind=auth [x:1] 시작'];
  const merged = [...a, ...b].map(parse).sort((x, y) => x.at - y.at);
  assert.equal(merged.length, 2);
  assert.ok(merged[0].at < merged[1].at, '병합 후 시간순이어야 한다');
  const t = Date.parse('2026-08-25T14:13:56');
  const win = merged.filter((r) => Math.abs(r.at - t) <= 5000);
  assert.equal(win.length, 2, '시간 창이 파일 경계를 넘어야 한다');
});

test('콘솔 화면이 CLI 와 같은 규칙을 쓴다', () => {
  const svc = fs.readFileSync(path.join(ROOT, 'lib/admin/service/LogsService.js'), 'utf8');
  const scanSrc = fs.readFileSync(path.join(ROOT, 'src/util/logScan.js'), 'utf8');
  const cli = fs.readFileSync(path.join(ROOT, 'scripts/logs.mjs'), 'utf8');
  const shared = fs.readFileSync(path.join(ROOT, 'src/util/logLine.js'), 'utf8');
  /* ★ v1.11.3 — "같은 규칙" 은 정규식을 둘이 베껴 쓰는 게 아니라 **한 함수**를 쓰는 것이다.
     예전에는 둘 다 1201.2ms 를 2ms 로 읽는 같은 결함을 따로 갖고 있었다. */
  assert.match(shared, /kind=\(\\w\+\)/, '줄 문법은 src/util/logLine.js 에');
  assert.match(scanSrc, /from '\.\/logLine\.js'/, '훑기 코드는 공유 파서를 쓴다');
  assert.match(cli, /from '\.\.\/src\/util\/logLine\.js'/, 'CLI 도 공유 파서를 쓴다');
  assert.equal(/const LINE_RE\s*=/.test(cli), false, 'CLI 에 복사본 정규식이 남아 있으면 안 된다');
  assert.match(scanSrc, /export async function queryLogs/);
  assert.match(scanSrc, /export async function logFacets/);
  assert.match(svc, /runScan\('queryLogs'/, '콘솔은 워커 러너를 통해 훑는다');
});

test('★ facets 가 비어도 화면이 깨지지 않는다', () => {
  // 실제로 렌더 검사에서 `facets.total.toLocaleString()` 이 터졌다
  const view = fs.readFileSync(path.join(ROOT, 'admin-client/src/views/LogExplorer.vue'), 'utf8');
  assert.match(view, /EMPTY_FACETS/, '기본 모양을 항상 채워야 한다');
  assert.equal(/\{\{ facets\.total\.toLocaleString\(\) \}\}/.test(view), false,
    '방어 없는 호출이 남아 있다');
});

test('콘솔에 대표 질의가 버튼으로 있다', () => {
  const view = fs.readFileSync(path.join(ROOT, 'admin-client/src/views/LogExplorer.vue'), 'utf8');
  // ★ v1.10.5 — computed 로 감쌌다 (언어 전환에 따라오게 하려고)
  const m = /const QUICK = computed\(\(\) => \(\[([\s\S]*?)\n\]\)\);/.exec(view);
  assert.ok(m, '빠른 질의 목록이 있어야 한다');
  assert.match(view, /const QUICK = computed\(/,
    '그냥 배열이면 t() 가 한 번만 평가되어 언어를 바꿔도 그대로 남는다');
  for (const key of ['errors', 'slow', 'sql', 'slowsql', 'http', 'auth', 'recent']) {
    assert.ok(m[1].includes(`'${key}'`), `'${key}' 빠른 질의가 없다`);
  }
  assert.match(view, /openAround/, '어떤 줄이든 눌러 그 시각 앞뒤를 펼 수 있어야 한다');
  assert.match(view, /cliCommand/, '같은 결과를 내는 CLI 를 보여 줘야 한다');
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.7 — 실행 검증이 잡은 500 오류
   `/api/admin/logs/facets` 가 실제 호출에서 500 이 났다.
   이 컨트롤러의 핸들러는 첫 인자로 **쿼리 객체**를 받는데(`req` 가 아니다),
   v1.9.5 에서 `req.query` 로 썼기 때문이다. 브라우저로 띄워 보고서야 발견했다.
   ══════════════════════════════════════════════════════════════════════════ */

test('★ LogsController 핸들러가 파일 내 다른 핸들러와 같은 인자 규약을 쓴다', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/admin/controller/LogsController.js'), 'utf8');
  // files/content 가 `params` 를 받으므로 facets/query 도 같아야 한다
  assert.match(src, /async files\(params\)/, '기준 규약 확인');
  assert.match(src, /async facets\(params = \{\}\)/, 'facets 가 req 를 받으면 500 이 난다');
  assert.match(src, /async query\(params = \{\}\)/);
  assert.equal(/async (facets|query)\(req\)/.test(src), false,
    'req.query 규약이 남아 있다 — 이 컨트롤러는 req 를 받지 않는다');
});

test('핸들러가 인자 없이 불려도 던지지 않는다', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/admin/controller/LogsController.js'), 'utf8');
  // 기본값이 없으면 `params.files` 에서 바로 터진다
  assert.match(src, /facets\(params = \{\}\)/);
  assert.match(src, /query\(params = \{\}\)/);
});
