<script setup>
/**
 * RequestDotPlot — 요청 하나를 점 하나로 그린다.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  왜 이 모양인가
 * ══════════════════════════════════════════════════════════════════════════
 *  관측 도구들이 수렴한 형태가 **"점 하나 = 요청 하나"** 인 산점도다
 *  (Honeycomb 의 latency heatmap 이 대표적). 이유가 있다.
 *
 *   · 막대그래프는 집계를 보여 준다 — "10건" 은 알아도 그 10건이 무엇인지 모른다.
 *   · 점도표는 **개별 사건이 그대로 남는다.** 튀는 점 하나를 눈으로 찾아 바로 열 수 있다.
 *     평균에 묻히는 이상치가 오히려 가장 중요한 경우가 많다.
 *
 *  이 화면은 두 가지를 동시에 물어야 한다 — "얼마나 요청했나" 와 "무엇을 요청했나".
 *  그래서 축을 이렇게 잡는다.
 *
 *      Y = 경로(레인)   ← 무엇을 했는지가 세로로 갈린다
 *      X = 시간         ← 얼마나 자주 했는지가 가로 밀도로 보인다
 *      색 = 상태        ← 실패가 즉시 눈에 띈다
 *      크기 = 소요시간   ← 느린 요청이 큰 점으로 튄다
 *
 *  `mode='latency'` 로 바꾸면 Y 축이 소요시간이 된다 (Honeycomb 식 지연 분포).
 *  같은 데이터를 두 각도로 본다 — 경로별 행동 패턴 vs 성능 이상치.
 *
 *  ⚠ 차트 라이브러리를 쓰지 않는다. 점 수백 개를 그리는 데 200KB 의존성은 과하고,
 *    클릭·툴팁·브러시 같은 상호작용을 우리가 직접 쥐고 있는 편이 낫다.
 */
import { ref, computed } from 'vue';

// ★ v1.10.9 — 언어에 맞춘 날짜/숫자 표기
import { useFormat } from '../composables/useFormat';

const fmt = useFormat();
const props = defineProps({
  /** [{ requestId, ts, method, path, status, durationMs }] */
  items: { type: Array, default: () => [] },
  /** 'path' = 경로별 레인(기본) · 'latency' = 소요시간 분포 */
  mode: { type: String, default: 'path' },
  height: { type: Number, default: 280 },
});
const emit = defineEmits(['select', 'brush']);

const PAD = { top: 14, right: 14, bottom: 26, left: 132 };
const W = 860;                                   // viewBox 기준 — 실제 폭은 CSS 가 늘린다
const hovered = ref(null);
const brush = ref(null);                         // { x0, x1 } 드래그 선택

const rows = computed(() => props.items.filter((d) => d && d.ts));

/* ── 시간 축 ─────────────────────────────────────────────────────────────── */
const timeRange = computed(() => {
  const ts = rows.value.map((d) => new Date(d.ts).getTime()).filter(Number.isFinite);
  if (!ts.length) return { min: 0, max: 1 };
  const min = Math.min(...ts), max = Math.max(...ts);
  // 점이 하나뿐이거나 순간에 몰리면 축이 무너진다 — 최소 폭을 준다
  return max - min < 1000 ? { min: min - 30000, max: max + 30000 } : { min, max };
});

/* ── 세로 축 ─────────────────────────────────────────────────────────────── */
/** 경로 레인 — 요청이 많은 순으로 위에서부터 (자주 하는 일이 먼저 보여야 한다) */
const lanes = computed(() => {
  const cnt = new Map();
  for (const d of rows.value) {
    const k = `${d.method} ${d.path}`;
    cnt.set(k, (cnt.get(k) || 0) + 1);
  }
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ key: k, count: n }));
});

const maxDuration = computed(() => Math.max(1, ...rows.value.map((d) => Number(d.durationMs) || 0)));

const plotH = computed(() => Math.max(
  props.height,
  props.mode === 'path' ? PAD.top + PAD.bottom + lanes.value.length * 24 : props.height,
));
const innerW = W - PAD.left - PAD.right;
const innerH = computed(() => plotH.value - PAD.top - PAD.bottom);

const xOf = (ts) => {
  const { min, max } = timeRange.value;
  return PAD.left + ((new Date(ts).getTime() - min) / (max - min || 1)) * innerW;
};

const yOf = (d) => {
  if (props.mode === 'latency') {
    // 지연은 꼬리가 길다 — 로그 축이라야 빠른 요청 무리와 느린 이상치가 함께 보인다
    const v = Math.max(1, Number(d.durationMs) || 1);
    const t = Math.log10(v) / Math.log10(Math.max(10, maxDuration.value));
    return PAD.top + innerH.value - t * innerH.value;
  }
  const i = lanes.value.findIndex((l) => l.key === `${d.method} ${d.path}`);
  const step = innerH.value / Math.max(1, lanes.value.length);
  return PAD.top + step * (i + 0.5);
};

/** 같은 좌표에 겹치는 점을 살짝 흩는다 — 겹치면 "몇 건인지" 를 못 읽는다 */
const jitter = (id) => {
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) | 0;
  return ((h % 100) / 100 - 0.5) * 9;
};

const rOf = (d) => {
  const v = Math.max(0, Number(d.durationMs) || 0);
  return 3 + Math.sqrt(v / maxDuration.value) * 5;    // 면적이 아니라 반지름에 sqrt — 과장 방지
};

const colorOf = (d) => (d.status >= 500 ? '#dc3545'
  : d.status >= 400 ? '#fd7e14'
    : d.status >= 300 ? '#6c757d' : '#198754');

const points = computed(() => rows.value.map((d) => ({
  d,
  x: xOf(d.ts),
  y: yOf(d) + (props.mode === 'path' ? jitter(d.requestId) : 0),
  r: rOf(d),
  fill: colorOf(d),
})));

/* ── 시간 눈금 ───────────────────────────────────────────────────────────── */
const ticks = computed(() => {
  const { min, max } = timeRange.value;
  const n = 5;
  return Array.from({ length: n }, (_, i) => {
    const t = min + ((max - min) * i) / (n - 1);
    return { x: PAD.left + (innerW * i) / (n - 1), label: fmt.timeShort(t) };
  });
});

const laneTicks = computed(() => {
  if (props.mode !== 'path') return [];
  const step = innerH.value / Math.max(1, lanes.value.length);
  return lanes.value.map((l, i) => ({
    ...l,
    y: PAD.top + step * (i + 0.5),
    short: l.key.length > 26 ? l.key.slice(0, 25) + '…' : l.key,
  }));
});

const durTicks = computed(() => {
  if (props.mode !== 'latency') return [];
  const top = Math.max(10, maxDuration.value);
  return [1, 10, 100, 1000, 10000].filter((v) => v <= top * 1.2).map((v) => ({
    v,
    y: PAD.top + innerH.value - (Math.log10(v) / Math.log10(top)) * innerH.value,
    label: v >= 1000 ? `${v / 1000}s` : `${v}ms`,
  }));
});

/* ── 드래그 선택 ─────────────────────────────────────────────────────────── */
let dragStart = null;
function onDown(e) { dragStart = localX(e); brush.value = null; }
function onMove(e) {
  if (dragStart == null) return;
  const x = localX(e);
  brush.value = { x0: Math.min(dragStart, x), x1: Math.max(dragStart, x) };
}
function onUp() {
  dragStart = null;
  if (!brush.value || brush.value.x1 - brush.value.x0 < 8) { brush.value = null; return; }
  const sel = points.value.filter((p) => p.x >= brush.value.x0 && p.x <= brush.value.x1).map((p) => p.d);
  emit('brush', sel);
}
function localX(e) {
  const svg = e.currentTarget.closest('svg');
  const r = svg.getBoundingClientRect();
  return ((e.clientX - r.left) / r.width) * W;
}
function clearBrush() { brush.value = null; emit('brush', null); }


</script>

<template>
  <div class="dotplot">
    <div v-if="!rows.length" class="empty">표시할 요청이 없습니다.</div>

    <template v-else>
      <svg :viewBox="`0 0 ${W} ${plotH}`" preserveAspectRatio="none" class="plot">
        <!-- 격자 -->
        <g class="grid">
          <line v-for="t in ticks" :key="'v'+t.x" :x1="t.x" :x2="t.x" :y1="PAD.top" :y2="PAD.top+innerH" />
          <line v-for="l in laneTicks" :key="'h'+l.y" :x1="PAD.left" :x2="W-PAD.right" :y1="l.y" :y2="l.y" />
          <line v-for="t in durTicks" :key="'d'+t.v" :x1="PAD.left" :x2="W-PAD.right" :y1="t.y" :y2="t.y" />
        </g>

        <!-- 세로축 라벨 -->
        <g class="axis">
          <text v-for="l in laneTicks" :key="'lt'+l.y" :x="PAD.left-8" :y="l.y+4" text-anchor="end">
            {{ l.short }} <tspan class="cnt">({{ l.count }})</tspan>
          </text>
          <text v-for="t in durTicks" :key="'dt'+t.v" :x="PAD.left-8" :y="t.y+4" text-anchor="end">{{ t.label }}</text>
          <text v-for="t in ticks" :key="'x'+t.x" :x="t.x" :y="plotH-8" text-anchor="middle">{{ t.label }}</text>
        </g>

        <!-- 드래그 선택 영역 -->
        <rect v-if="brush" class="brush" :x="brush.x0" :y="PAD.top" :width="brush.x1-brush.x0" :height="innerH" />

        <!-- 점 -->
        <g @mousedown="onDown" @mousemove="onMove" @mouseup="onUp" @mouseleave="onUp">
          <rect :x="PAD.left" :y="PAD.top" :width="innerW" :height="innerH" fill="transparent" />
          <circle v-for="p in points" :key="p.d.requestId"
                  :cx="p.x" :cy="p.y" :r="hovered===p.d.requestId ? p.r+2.5 : p.r"
                  :fill="p.fill"
                  :class="['dot', { hot: hovered===p.d.requestId }]"
                  @mouseenter="hovered=p.d.requestId" @mouseleave="hovered=null"
                  @click="emit('select', p.d)">
            <title>{{ p.d.method }} {{ p.d.path }} · {{ p.d.status }} · {{ fmt.duration(p.d.durationMs) }}</title>
          </circle>
        </g>
      </svg>

      <!-- 범례 + 조작 안내 -->
      <div class="legend">
        <span><i class="sw" style="background:#198754"></i>성공</span>
        <span><i class="sw" style="background:#fd7e14"></i>요청 거부(4xx)</span>
        <span><i class="sw" style="background:#dc3545"></i>서버 오류(5xx)</span>
        <span class="sep">·</span>
        <span>점 크기 = 소요시간</span>
        <span class="sep">·</span>
        <span>점을 누르면 그 요청이 열립니다</span>
        <span v-if="brush" class="ms-auto">
          <button class="btn btn-sm btn-link p-0" @click="clearBrush">구간 선택 해제</button>
        </span>
        <span v-else class="ms-auto text-secondary">가로로 끌면 구간 선택</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dotplot { width: 100%; }
.plot { width: 100%; display: block; user-select: none; }
.grid line { stroke: var(--ax-grid-line, #eef0f4); stroke-width: 1; }
.axis text { font-size: 10px; fill: var(--ax-text-muted, #6b7280); font-family: var(--ax-font-mono, monospace); }
.axis .cnt { fill: var(--ax-border, #c8cdd6); }
.dot { cursor: pointer; opacity: .78; transition: r .1s ease, opacity .1s ease; }
.dot:hover, .dot.hot { opacity: 1; stroke: #fff; stroke-width: 1.5; }
.brush { fill: rgba(27,132,255,.12); stroke: #1b84ff; stroke-dasharray: 3 3; }
.empty { text-align: center; color: var(--ax-text-muted, #6b7280); padding: 40px 0; font-size: .875rem; }
.legend {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  font-size: .72rem; color: var(--ax-text-muted, #6b7280); padding: 6px 4px 0;
}
.legend .sw { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: 4px; }
.legend .sep { opacity: .4; }
</style>
