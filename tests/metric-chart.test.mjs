/**
 * MetricChart 개선 시험. (v1.10.1)
 *
 *  조사 결론: "더 멋진 그래프" 의 답은 라이브러리가 아니라 **정보 밀도**였다.
 *  ECharts 는 300KB 이고, 운영 대시보드의 실패 원인은 렌더링 품질이 아니다.
 *  여기서 지키는 것은 "같은 공간에 얼마나 많은 판단 재료가 담기는가" 다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'admin-client/src/components/MetricChart.vue'), 'utf8');

/* ── 추세 계산 (SFC 와 같은 규칙) ─────────────────────────────────────── */
function trendOf(a) {
  const v = a.filter((x) => Number.isFinite(x));
  if (v.length < 6) return null;
  const k = Math.max(2, Math.floor(v.length / 3));
  const avg = (arr) => arr.reduce((x, y) => x + y, 0) / arr.length;
  const now = avg(v.slice(-k));
  const before = avg(v.slice(-k * 2, -k));
  if (!Number.isFinite(before) || before === 0) return null;
  const pct = ((now - before) / Math.abs(before)) * 100;
  if (Math.abs(pct) < 3) return { dir: 'flat', pct: 0 };
  return { dir: pct > 0 ? 'up' : 'down', pct: Math.abs(pct) };
}

test('★ 추세는 마지막 두 점이 아니라 구간 평균으로 낸다 — 잡음에 안 흔들려야 한다', () => {
  // 전체적으로 오르는데 마지막 점만 잠깐 내려간 경우
  const rising = [10, 12, 14, 18, 22, 28, 34, 40, 46, 52, 58, 50];
  assert.equal(trendOf(rising).dir, 'up', '마지막 점만 봤다면 down 이 됐을 것');
});

test('변화가 미미하면 flat — 3% 미만은 변화로 보지 않는다', () => {
  const flat = [50, 50.4, 49.8, 50.2, 50.1, 49.9, 50.3, 50, 50.1, 49.95];
  assert.equal(trendOf(flat).dir, 'flat', '숫자가 흔들릴 때마다 화살표가 바뀌면 못 믿는다');
});

test('내려가는 추세를 잡는다', () => {
  assert.equal(trendOf([90, 85, 80, 72, 65, 58, 50, 42, 35, 28]).dir, 'down');
});

test('점이 적으면 추세를 내지 않는다 — 근거 없는 화살표는 거짓말이다', () => {
  assert.equal(trendOf([10, 20, 30]), null);
  assert.equal(trendOf([]), null);
});

test('0 으로 나누지 않는다', () => {
  assert.equal(trendOf([0, 0, 0, 0, 0, 0, 0, 0, 0]), null);
  assert.doesNotThrow(() => trendOf([0, 0, 0, 5, 10, 15, 20, 25, 30]));
});

/* ── 임계 판정 ────────────────────────────────────────────────────────── */
const levelOf = (v, warn, danger) => {
  if (v == null) return 'none';
  if (danger != null && v >= danger) return 'danger';
  if (warn != null && v >= warn) return 'warn';
  return 'ok';
};

test('★ 임계 판정 — 지표마다 기준이 다르므로 쓰는 쪽이 정한다', () => {
  assert.equal(levelOf(50, 70, 85), 'ok');
  assert.equal(levelOf(75, 70, 85), 'warn');
  assert.equal(levelOf(88, 70, 85), 'danger');
  assert.equal(levelOf(85, 70, 85), 'danger', '경계값은 포함');
  assert.equal(levelOf(50, undefined, undefined), 'ok', '임계 미지정이면 항상 ok');
  assert.equal(levelOf(null, 70, 85), 'none');
});

/* ── 구현 확인 ────────────────────────────────────────────────────────── */

test('★ 현재값을 크게 보여 준다 — 운영 화면의 첫 질문은 "지금 몇인가"', () => {
  assert.match(src, /class="now/, '현재값 표시가 없다');
  assert.match(src, /fmtValue\(latest\)/);
  assert.match(src, /lv-\$\{level\}|`lv-\$\{level\}`/, '임계 상태가 색으로 드러나야 한다');
});

test('임계선을 그린다', () => {
  assert.match(src, /warnAt/); assert.match(src, /dangerAt/);
  assert.match(src, /yOfA\(/, '값을 y 좌표로 옮기는 함수가 필요하다');
});

test('★ 임계값이 범위 밖이면 선을 그리지 않는다 — 차트 밖 선은 신뢰를 깎는다', () => {
  assert.match(src, /if \(v < mn \|\| v > mx\) return null/);
});

test('빈 상태를 안내한다 — 빈 사각형은 "고장" 으로 보인다', () => {
  assert.match(src, /empty-chart/);
  assert.match(src, /v-if="!hasData"/);
});

test('마지막 점을 강조한다', () => {
  assert.match(src, /circlesA\.length - 1/, '오래된 점과 방금 값이 같으면 눈이 헤맨다');
});

test('★ 차트 라이브러리를 도입하지 않았다 — 폐쇄망에서 번들 크기는 배포 부담', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'admin-client/package.json'), 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  for (const heavy of ['echarts', 'chart.js', 'apexcharts', 'plotly.js', 'd3']) {
    assert.equal(deps.includes(heavy), false, `${heavy} 가 추가됐다`);
  }
});

test('모니터링 화면이 임계값을 넘긴다', () => {
  const mon = fs.readFileSync(path.join(ROOT, 'admin-client/src/views/MonitoringPage.vue'), 'utf8');
  assert.match(mon, /:warn-at="70"/, 'CPU/메모리 경고선');
  assert.match(mon, /:danger-at="85"/);
});
