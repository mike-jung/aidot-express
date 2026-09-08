/**
 * 차트 팔레트 + 추적 설정. (v1.10.44)
 *
 * ## 차트
 * 예전에는 부트스트랩 기본색을 화면마다 직접 적었고, **빨강(#dc3545)과
 * 초록(#198754)이 같은 화면에** 있었다 — 적록색약에게는 거의 같은 색이다.
 *
 * ## 추적 설정
 * `shouldPersist()` 가 `config.trace?.enabled` 를 읽는데 **정의가 없었다.**
 * 읽는 쪽만 있고 정의가 없어 껐다 켜며 비교할 수도 없었다.
 * 부하 테스트에서 드러났다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('★ 차트 색이 한 곳에 모여 있다', () => {
  const pal = read('admin-client/src/composables/chartPalette.js');
  for (const k of ['SERIES', 'STATE', 'PAIRS']) {
    assert.match(pal, new RegExp(`export const ${k}`), `${k} 가 없다`);
  }
});

test('★ 한 화면에 빨강과 초록을 함께 두지 않는다', () => {
  /* 적록색약은 가장 흔한 색각 이상이다. 두 선이 같은 색으로 보이면
     그래프를 읽을 수 없다. */
  const mp = read('admin-client/src/views/MonitoringPage.vue');
  for (const bad of ['#dc3545', '#198754', '#0d6efd', '#fd7e14']) {
    assert.equal(mp.includes(`color-a="${bad}"`), false, `${bad} 가 남아 있다`);
    assert.equal(mp.includes(`color-b="${bad}"`), false, `${bad} 가 남아 있다`);
  }
  assert.match(mp, /:color-a="PAIRS\./);
});

test('색만으로 구분하지 않는다', () => {
  // W3C: 색이 정보를 전달하는 유일한 수단이면 안 된다
  const mc = read('admin-client/src/components/MetricChart.vue');
  assert.match(mc, /stroke-dasharray/, '두 번째 계열이 점선으로도 갈려야 한다');
});

test('★ 영역을 그라데이션으로 채운다', () => {
  const mc = read('admin-client/src/components/MetricChart.vue');
  assert.match(mc, /<linearGradient :id="gradId"/);
  // 아래로 갈수록 투명 — 선 자체를 가리면 안 된다
  assert.match(mc, /offset="100%"[^>]*stop-opacity="0"/);
});

test('★ 그라데이션 id 가 차트마다 다르다', () => {
  /* 같은 id 가 여러 개면 **첫 번째 것만** 적용된다.
     네 개의 차트가 모두 첫 차트의 색으로 칠해진다. */
  const mc = read('admin-client/src/components/MetricChart.vue');
  assert.match(mc, /let __gradSeq = 0;/);
  assert.match(mc, /const gradId = `mc-grad-\$\{\+\+__gradSeq\}`;/);
});

test('★ trace 설정이 정의돼 있다', () => {
  /* shouldPersist() 가 읽는데 정의가 없었다 — 부하 테스트에서 발견. */
  const def = read('src/config/default.js');
  assert.match(def, /trace: \{/);
  assert.match(def, /enabled: true,/);
  assert.match(def, /slowMs: 500,/);
  const store = read('src/core/traceStore.js');
  assert.match(store, /config\.trace/, '읽는 쪽이 사라지면 이 설정이 무의미하다');
});

test('추적을 끌 수 있다', () => {
  // 운영에서 성능이 급하면 끌 수 있어야 한다 (측정: 처리량 +44%)
  const idx = read('src/config/index.js');
  assert.match(idx, /process\.env\.TRACE_ENABLED/);
  assert.match(idx, /process\.env\.TRACE_SLOW_MS/);
});
