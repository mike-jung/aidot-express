/**
 * 요청 점도표 좌표 계산 회귀 시험. (v1.8.4)
 *
 * ## 왜 필요한가
 * 점도표는 "점이 그려졌다" 만으로는 맞는지 알 수 없다. 축이 뒤집히거나
 * 좌표가 NaN 이 되어도 화면은 조용히 비어 보일 뿐이다.
 * 그래서 **좌표가 유한한지 · 그림 영역 안인지 · 축 방향이 맞는지**를 못 박는다.
 *
 * ## 왜 로직을 옮겨 적었나
 * `RequestDotPlot.vue` 는 SFC 라 Node 에서 import 할 수 없다.
 * 좌표 계산만 SFC 와 같은 식으로 옮겨 시험한다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const PAD = { top: 14, right: 14, bottom: 26, left: 132 };
const W = 860;

function build(items, mode = 'path', height = 280) {
  const rows = items.filter((d) => d && d.ts);
  if (!rows.length) return { lanes: [], points: [], plotH: height };
  const ts = rows.map((d) => new Date(d.ts).getTime());
  let min = Math.min(...ts); let max = Math.max(...ts);
  if (max - min < 1000) { min -= 30000; max += 30000; }   // 순간에 몰려도 축이 무너지지 않게

  const cnt = new Map();
  for (const d of rows) { const k = `${d.method} ${d.path}`; cnt.set(k, (cnt.get(k) || 0) + 1); }
  const lanes = [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));

  const maxDur = Math.max(1, ...rows.map((d) => Number(d.durationMs) || 0));
  const plotH = Math.max(height, mode === 'path' ? PAD.top + PAD.bottom + lanes.length * 24 : height);
  const innerW = W - PAD.left - PAD.right;
  const innerH = plotH - PAD.top - PAD.bottom;

  const xOf = (t) => PAD.left + ((new Date(t).getTime() - min) / (max - min || 1)) * innerW;
  const yOf = (d) => {
    if (mode === 'latency') {
      const v = Math.max(1, Number(d.durationMs) || 1);
      return PAD.top + innerH - (Math.log10(v) / Math.log10(Math.max(10, maxDur))) * innerH;
    }
    const i = lanes.findIndex((l) => l.key === `${d.method} ${d.path}`);
    return PAD.top + (innerH / Math.max(1, lanes.length)) * (i + 0.5);
  };
  const rOf = (d) => 3 + Math.sqrt(Math.max(0, Number(d.durationMs) || 0) / maxDur) * 5;
  const color = (d) => (d.status >= 500 ? '#dc3545' : d.status >= 400 ? '#fd7e14'
    : d.status >= 300 ? '#6c757d' : '#198754');

  return { lanes, plotH, innerW, innerH,
    points: rows.map((d) => ({ id: d.requestId, x: xOf(d.ts), y: yOf(d), r: rOf(d), fill: color(d) })) };
}

const base = Date.parse('2026-08-25T09:00:00Z');
const PATHS = [['GET', '/api/notes'], ['GET', '/api/notes/:id'], ['POST', '/api/notes'], ['DELETE', '/api/notes/:id']];
const SAMPLE = Array.from({ length: 40 }, (_, i) => {
  const [method, path] = PATHS[i % 4];
  return { requestId: `r${i}`, ts: new Date(base + i * 90000).toISOString(), method, path,
    status: i % 13 === 0 ? 500 : i % 7 === 0 ? 404 : 200,
    durationMs: i % 11 === 0 ? 2400 : 20 + i * 3 };
});

test('★ 모든 점의 좌표가 유한하고 그림 영역 안에 있다', () => {
  for (const mode of ['path', 'latency']) {
    const { points, plotH } = build(SAMPLE, mode);
    assert.equal(points.length, SAMPLE.length);
    for (const p of points) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.r),
        `${mode}: NaN 좌표가 생기면 점이 조용히 사라진다`);
      assert.ok(p.x >= PAD.left - 1 && p.x <= W - PAD.right + 1, `${mode}: x 가 영역 밖`);
      assert.ok(p.y >= 0 && p.y <= plotH, `${mode}: y 가 영역 밖`);
      assert.ok(p.r >= 3, '점이 너무 작으면 클릭할 수 없다');
    }
  }
});

test('경로 레인은 요청이 많은 순으로 정렬된다', () => {
  const items = [
    ...Array.from({ length: 5 }, (_, i) => ({ requestId: `a${i}`, ts: new Date(base + i * 1000).toISOString(), method: 'GET', path: '/rare', status: 200, durationMs: 10 })),
    ...Array.from({ length: 20 }, (_, i) => ({ requestId: `b${i}`, ts: new Date(base + i * 1000).toISOString(), method: 'GET', path: '/common', status: 200, durationMs: 10 })),
  ];
  const { lanes } = build(items, 'path');
  assert.equal(lanes[0].key, 'GET /common', '자주 하는 일이 위에 보여야 한다');
  assert.equal(lanes[0].count, 20);
});

test('지연 모드에서 느린 요청이 위쪽에 온다', () => {
  const mk = (ms) => ({ requestId: 'x' + ms, ts: new Date(base).toISOString(), method: 'GET', path: '/p', status: 200, durationMs: ms });
  const { points } = build([mk(10), mk(200), mk(2400)], 'latency');
  const [slow, mid, fast] = [points[2].y, points[1].y, points[0].y];
  assert.ok(slow < mid && mid < fast, 'y 는 작을수록 위 — 느릴수록 위여야 한다');
});

test('상태코드가 색으로 갈린다', () => {
  const mk = (s) => ({ requestId: 's' + s, ts: new Date(base).toISOString(), method: 'GET', path: '/p', status: s, durationMs: 10 });
  const { points } = build([mk(200), mk(404), mk(500)], 'path');
  assert.deepEqual(points.map((p) => p.fill), ['#198754', '#fd7e14', '#dc3545']);
});

test('점이 하나뿐이어도 축이 무너지지 않는다', () => {
  const { points } = build([SAMPLE[0]], 'path');
  assert.equal(points.length, 1);
  assert.ok(Number.isFinite(points[0].x));
  assert.ok(points[0].x > PAD.left && points[0].x < W - PAD.right, '한쪽 끝에 붙지 않고 가운데에');
});

test('같은 시각에 몰려도 좌표가 유한하다', () => {
  const same = Array.from({ length: 5 }, (_, i) => ({ ...SAMPLE[0], requestId: `s${i}` }));
  const { points } = build(same, 'path');
  for (const p of points) assert.ok(Number.isFinite(p.x), '0 으로 나누면 NaN 이 된다');
});

test('빈 목록에 던지지 않는다', () => {
  assert.doesNotThrow(() => build([], 'path'));
  assert.equal(build([], 'path').points.length, 0);
  assert.equal(build([{ ts: null }], 'path').points.length, 0);
});

test('레인이 많으면 그림이 세로로 늘어난다', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    requestId: `m${i}`, ts: new Date(base + i * 1000).toISOString(),
    method: 'GET', path: `/p${i}`, status: 200, durationMs: 10 }));
  const { plotH, lanes } = build(many, 'path', 280);
  assert.equal(lanes.length, 30);
  assert.ok(plotH > 280, '레인이 겹치면 무엇을 했는지 읽을 수 없다');
});

test('소요시간이 0이거나 없어도 점이 보인다', () => {
  const { points } = build([
    { requestId: 'z', ts: new Date(base).toISOString(), method: 'GET', path: '/p', status: 200, durationMs: 0 },
    { requestId: 'u', ts: new Date(base + 1000).toISOString(), method: 'GET', path: '/p', status: 200 },
  ], 'path');
  for (const p of points) assert.ok(p.r >= 3 && Number.isFinite(p.r));
});
