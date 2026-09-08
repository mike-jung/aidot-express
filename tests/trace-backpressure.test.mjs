/**
 * 추적 쓰기 — 묶음 + 자동 물러남. (v1.10.45)
 *
 * ## 왜 "비동기" 만으로 부족했나
 * 기존에도 `res.on('finish')` 에서 await 없이 불렀다. 그런데도 처리량이
 * 44% 차이났다(168 → 241 rps).
 *
 *     요청 A 응답 완료 → INSERT 6번 (커넥션 풀·CPU 점유)
 *     요청 B 도착      → 남은 커넥션을 두고 경쟁
 *
 * **응답을 안 기다리는 것과 자원을 안 쓰는 것은 다르다.**
 * 미루는 것으로는 총량이 안 줄어든다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const W = read('src/core/traceWriter.js');

test('★ 쓰기를 묶는다', () => {
  // 요청 20건 × 5단계 → INSERT 120번이 2번이 된다
  assert.match(W, /function buildBulk\(baseSql, rows, cols\)/);
  assert.match(W, /VALUES \$\{tuples\.join\(', '\)\}/);
});

test('한 문장이 너무 커지지 않게 끊는다', () => {
  // max_allowed_packet 에 걸리면 통째로 실패한다
  assert.match(W, /i \+= 200/);
});

test('★ persist 가 큐에 넣고 즉시 반환한다', () => {
  const store = read('src/core/traceStore.js');
  assert.match(store, /traceWriter\.enqueue\(rec\);/);
  // 예전처럼 여기서 직접 INSERT 하면 안 된다
  assert.equal(/insertStep/.test(store), false, 'persist 가 아직 직접 쓴다');
});

/* ── 부하 대응 ─────────────────────────────────────────────────────── */

test('★ 큐 깊이를 신호로 쓴다', () => {
  /* rps 는 신호로 못 쓴다 — 초당 500건이 문제인지는 서버마다 다르다.
     큐 깊이는 "이 서버에서 실제로 밀리고 있는가" 를 직접 말한다. */
  assert.match(W, /function updateLevel\(\)/);
  assert.match(W, /const n = queue\.length;/);
});

test('★ 값어치 낮은 것부터 버린다', () => {
  const levels = ['NORMAL', 'EASE', 'HEAVY', 'SHED'];
  for (const l of levels) assert.match(W, new RegExp(`${l}:`), `${l} 단계가 없다`);
  // EASE 에서는 GET 만 뺀다 — 변경 행위는 감사 목적으로 남긴다
  assert.match(W, /level === LEVEL\.EASE\) return rec\.method !== 'GET'/);
});

test('★ 오류와 느린 요청은 끝까지 지킨다', () => {
  /* 부하 상황에서 정작 보고 싶은 것이 그것이다. */
  assert.match(W, /if \(failed \|\| slow\) return true;/);
  // SHED 에서만 전부 끈다
  assert.match(W, /if \(level === LEVEL\.SHED\) return false;/);
});

test('★ 큐에 넣기 전에 거른다', () => {
  /* 넣고 나서 버리면 메모리와 CPU 를 이미 쓴 뒤다.
     head 방식의 핵심은 "안 고른 요청은 비용이 0" 이다. */
  const i = W.indexOf('export function enqueue');
  const seg = W.slice(i, i + 400);
  const guard = seg.indexOf('if (!shouldRecord(rec)) return;');
  const push = seg.indexOf('queue.push(rec)');
  assert.ok(guard > 0 && guard < push, 'push 보다 앞에서 걸러야 한다');
});

test('★ 스스로 돌아온다 — 이력 현상', () => {
  /* 올라가는 기준과 내려오는 기준이 같으면 경계에서 떨거린다. */
  assert.match(W, /const UP\s+= \{ ease: 200/);
  assert.match(W, /const DOWN = \{ ease: 100/);
  assert.match(W, /calmStreak >= 3/, '한 번 튄 값으로 복귀하면 안 된다');
});

test('★ 큐가 비어도 복귀 판정이 돈다', () => {
  /* `!queue.length` 로 먼저 빠져나가면, 부하가 가셔서 큐가 비었을 때
     복귀 판정이 아예 안 돌아 **물러난 상태에 갇힌다.** 실제로 겪었다. */
  const i = W.indexOf('export async function flush()');
  const seg = W.slice(i, i + 700);
  const upd = seg.indexOf('updateLevel();');
  const empty = seg.indexOf('if (!queue.length)');
  assert.ok(upd > 0 && upd < empty, '빈 큐 검사보다 먼저 판정해야 한다');
  // 물러난 상태면 타이머를 계속 돌린다
  assert.match(W, /level !== LEVEL\.NORMAL\) && !timer/);
});

test('큐가 무한정 자라지 않는다', () => {
  // 추적을 지키려다 메모리로 서버를 죽이면 우선순위가 뒤바뀐 것이다
  assert.match(W, /const HARD_LIMIT = 5000;/);
  assert.match(W, /queue\.splice\(0, cut\)/);
});

test('정상 종료 때 남은 것을 비운다', () => {
  assert.match(W, /export async function drain\(\)/);
  const app = read('src/app.js');
  const drain = app.indexOf('traceWriter.drain()');
  const close = app.indexOf('db.closeDb()', drain);
  assert.ok(drain > 0 && close > drain, 'DB 를 닫기 전에 비워야 한다');
});
