/**
 * tests/logs-trace.test.mjs — 콘솔 [로그 탐색]·[요청 추적] 실행 검증에서 잡은 결함의 단위 시험 (v1.11.3)
 *   ① parseLogLine — 소수점 ms (1201.2ms 가 2ms 로 읽히던 것)
 *   ② assertSafeRegex — 폭주 패턴 거절, 보통 패턴 통과
 *   ③ queryLogs — 비동기·최신 파일부터·limit 에 닿으면 멈춤·바이트 상한(partial)·이어지는 줄 묶기·본문 검색이 스택도 봄
 *   ④ logFacets — 상한 안에서 표본(sampled)
 *   ⑤ traceStore.describe — 하위 행위 동사 (POST …/test 가 "만들었습니다" 로 서술되던 것)
 *   ⑥ traceWriter.status — 상태 값 모양
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLogLine, assertSafeRegex, queryLogs, logFacets } from '../lib/admin/service/LogsService.js';
import traceStore from '../src/core/traceStore.js';
import traceWriter from '../src/core/traceWriter.js';

const line = (ts, level, req, kind, msg) => `${ts} [${level}] [${req}] kind=${kind} [x.js:1:1] ${msg}`;

test('① parseLogLine: 소수점 ms 와 괄호 ms', () => {
  assert.equal(parseLogLine(line('2026-08-27 12:00:00.000', 'INFO', 'r1', 'sql', '[DB:mariadb] SELECT SLEEP(1.2) | 1건 | 1201.2ms')).ms, 1201.2);
  assert.equal(parseLogLine(line('2026-08-27 12:00:00.000', 'INFO', 'r1', 'sql', 'x | 0건 | 3.0ms')).ms, 3);
  assert.equal(parseLogLine(line('2026-08-27 12:00:00.000', 'WARN', 'r1', 'app', 'slow (812ms) done')).ms, 812);
  assert.equal(parseLogLine(line('2026-08-27 12:00:00.000', 'INFO', 'r1', 'app', 'no timing here')).ms, null);
  assert.equal(parseLogLine('garbage line'), null);
  const p = parseLogLine('2026-08-27 12:00:00.000 [ERROR] kind=app [-] boom');
  assert.equal(p.requestId, null); assert.equal(p.level, 'ERROR'); assert.equal(p.kind, 'app');
});

test('② assertSafeRegex: 폭주 패턴은 400, 보통 패턴은 통과', () => {
  for (const bad of ['(a+)+b', '(x*)*', '(\\w+\\s?)+$', '(a{2,}){3,}', '(a|aa)+', '(a|a)*', '(ab|abc)+x', 'x'.repeat(201)]) {
    assert.throws(() => assertSafeRegex(bad), (e) => e.status === 400, bad);
  }
  for (const ok of ['tut-books-000\\d', 'ER_\\w+', '\\[ERROR\\].*(timeout|refused)', '(foo|bar)+', '(?:ab|cd)+', '^2026-08-2[67]', 'SnackService']) {
    assert.ok(assertSafeRegex(ok) instanceof RegExp, ok);
  }
  assert.throws(() => assertSafeRegex('('), /정규식 오류/);
});

function makeLogs() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-logq-'));
  const dir = path.join(root, 'general', '2026-08'); fs.mkdirSync(dir, { recursive: true });
  const older = path.join(dir, '2026-08-26.log'); const newer = path.join(dir, '2026-08-27.log');
  const oldLines = [];
  for (let i = 0; i < 300; i++) oldLines.push(line(`2026-08-26 10:00:${String(i % 60).padStart(2, '0')}.000`, i % 50 === 0 ? 'ERROR' : 'INFO', `o${i}`, i % 2 ? 'sql' : 'app', i % 50 === 0 ? 'old error' : 'old line'));
  fs.writeFileSync(older, oldLines.join('\n') + '\n');
  const newLines = [];
  for (let i = 0; i < 200; i++) newLines.push(line(`2026-08-27 10:00:${String(i % 60).padStart(2, '0')}.000`, 'INFO', `n${i}`, i % 2 ? 'sql' : 'app', i % 2 ? `[DB] SELECT ${i} | 1건 | ${i % 5 === 0 ? '900.5' : '2.2'}ms` : `new line ${i}`));
  newLines.push(line('2026-08-27 11:00:00.000', 'ERROR', 'nerr', 'app', 'TypeError: boom'));
  newLines.push('    at Object.<anonymous> (x.js:1:1)');
  newLines.push('    at Module._compile (node:internal/modules/cjs/loader:1)');
  fs.writeFileSync(newer, newLines.join('\n') + '\n');
  const t = Date.now() / 1000;
  fs.utimesSync(older, t - 86400, t - 86400); fs.utimesSync(newer, t, t);
  return { root, older, newer };
}

test('③ queryLogs: 최신 파일부터, 이어지는 줄을 묶고, limit 에 닿으면 멈춘다', async () => {
  const { root } = makeLogs();
  const all = await queryLogs(root, { limit: 300 });
  assert.equal(all.rows.length, 300);
  assert.equal(all.rows[all.rows.length - 1].requestId, 'nerr', '가장 최신 줄이 마지막');
  assert.ok(all.rows.every((r, i, a) => i === 0 || a[i - 1].at <= r.at), '시간순');
  const err = await queryLogs(root, { levels: ['ERROR'], limit: 50 });
  const stack = err.rows.find((r) => r.requestId === 'nerr');
  assert.ok(stack && stack.raw.split('\n').length === 3, '스택 3줄이 한 항목');
  assert.ok(err.rows.some((r) => r.requestId === 'o0'), 'limit 안이면 오래된 파일도 읽는다');
  const grep = await queryLogs(root, { q: 'Module._compile', limit: 10 });
  assert.equal(grep.rows.length, 1, '본문 검색이 스택 안의 낱말도 잡는다');
  const slow = await queryLogs(root, { kinds: ['sql'], slowerThan: 500, limit: 100 });
  assert.equal(slow.rows.length, 20); assert.ok(slow.rows.every((r) => r.ms >= 500 && r.kind === 'sql'));
  const tiny = await queryLogs(root, { limit: 5 });
  assert.equal(tiny.rows.length, 5); assert.equal(tiny.partial, true, 'limit 에 닿아 오래된 파일은 열지 않았다');
  assert.equal(tiny.files, 1);
  const byReq = await queryLogs(root, { requestId: 'o25', limit: 10 });
  assert.equal(byReq.rows.length, 1); assert.equal(byReq.files, 2);
  fs.rmSync(root, { recursive: true, force: true });
});

test('③ queryLogs: 바이트 상한 — 큰 파일은 끝에서부터 상한만큼만 읽고 partial 을 표시한다', async () => {
  const { root, newer } = makeLogs();
  const big = []; for (let i = 0; i < 20000; i++) big.push(line('2026-08-27 09:00:00.000', 'INFO', `b${i}`, 'app', 'filler line to make the file large enough for the budget test'));
  fs.writeFileSync(newer, big.join('\n') + '\n' + fs.readFileSync(newer, 'utf8'));
  const r = await queryLogs(root, { limit: 2000, maxBytes: 1024 * 1024 });   // 1MB 상한
  assert.equal(r.partial, true); assert.ok(r.bytesRead <= 1024 * 1024 + 1024);
  assert.ok(r.rows.length > 0 && r.rows.some((x) => x.requestId === 'nerr'), '파일 끝(최신)쪽은 읽혔다');
  assert.ok(r.note && /MB/.test(r.note));
  fs.rmSync(root, { recursive: true, force: true });
});

test('④ logFacets: 상한 안에서 표본으로 센다', async () => {
  const { root } = makeLogs();
  const f = await logFacets(root, { files: 20, maxBytes: 64 * 1024 * 1024 });
  assert.equal(f.sampled, false); assert.ok(f.total >= 500);
  assert.ok(f.kinds.some((k) => k.value === 'sql') && f.levels.some((l) => l.value === 'ERROR'));
  const f2 = await logFacets(root, { files: 20, maxBytes: 8 * 1024 });
  assert.equal(f2.sampled, true); assert.ok(f2.total < f.total);
  fs.rmSync(root, { recursive: true, force: true });
});

test('⑤ describe: 하위 행위 동사', () => {
  const base = { username: 'admin', status: 200, durationMs: 12, steps: [] };
  assert.match(traceStore.describe({ ...base, method: 'POST', path: '/api/admin/sqls/test' }).ko, /시험 실행했습니다/);
  assert.match(traceStore.describe({ ...base, method: 'POST', path: '/api/admin/sqls' }).ko, /만들었습니다/);
  assert.match(traceStore.describe({ ...base, method: 'POST', path: '/api/admin/logs/download' }).ko, /내려받았습니다/);
  assert.match(traceStore.describe({ ...base, method: 'DELETE', path: '/api/admin/controllers/:id' }).ko, /삭제했습니다/);
});

test('⑥ traceWriter.status: 모양', () => {
  const s = traceWriter.status();
  for (const k of ['level', 'queue', 'enqueued', 'written', 'droppedTotal', 'skippedByPressure', 'thresholds']) assert.ok(k in s, k);
  assert.equal(s.level, 'normal');
});

/* ══ v1.11.4 ══ */
import { runScan, scanStats } from '../src/util/logScanRunner.js';

test('⑦ 워커 러너: 워커에서 같은 결과, 시간 초과는 408, 메인 실행과 결과가 같다', async () => {
  const { root } = makeLogs();
  const viaWorker = await runScan('queryLogs', [root, { levels: ['ERROR'], limit: 50 }], { useWorker: true, timeoutMs: 15_000 });
  const inline = await runScan('queryLogs', [root, { levels: ['ERROR'], limit: 50 }], { useWorker: false });
  assert.deepEqual(viaWorker.rows.map((r) => r.requestId), inline.rows.map((r) => r.requestId));
  await assert.rejects(() => runScan('queryLogs', [root, { limit: 100 }], { useWorker: true, timeoutMs: 1 }), (e) => e.status === 408);
  await assert.rejects(() => runScan('nope', [root], { useWorker: true }), (e) => e.status === 500);
  const st = scanStats();
  assert.ok(st.runs >= 2 && st.timeouts >= 1 && st.active === 0, JSON.stringify(st));
  // 정규식 내용 보기도 워커에서
  const f = path.join(root, 'general', '2026-08', '2026-08-27.log');
  const c = await runScan('readFileLines', [{ fullPath: f, maxBytes: 32 * 1024 * 1024, q: 'boom', isRegex: true, onlyMatches: true, perPage: 10, useCache: false }], { useWorker: true, timeoutMs: 15_000 });
  assert.equal(c.matchedLines, 1);
  fs.rmSync(root, { recursive: true, force: true });
});

test('⑧ maskSqlLiterals: 값만 지우고 자리표시자·식별자는 남긴다', () => {
  assert.equal(traceWriter.maskSqlLiterals("SELECT * FROM p WHERE ptno = '99108208' AND age > 65"), "SELECT * FROM p WHERE ptno = '?' AND age > ?");
  assert.equal(traceWriter.maskSqlLiterals('UPDATE t SET a = :a, b = "x" WHERE id2 = :id LIMIT 5'), 'UPDATE t SET a = :a, b = "?" WHERE id2 = :id LIMIT ?');
  assert.equal(traceWriter.maskSqlLiterals(null), null);
});

test('⑨ 로그 API 역할 제한 — 기본 admin, LOG_VIEW_ROLES 로 넓힘', async () => {
  const src = fs.readFileSync(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'lib/admin/controller/LogsController.js'), 'utf8');
  assert.match(src, /function requireLogRole/);
  for (const h of ['kinds', 'facets', 'query', 'folders', 'files', 'content', 'download']) {
    assert.match(src, new RegExp(`async ${h}\\([^)]*\\) \\{\\n\\s*requireLogRole\\(`), `${h} 가 역할을 확인해야 한다`);
  }
});
