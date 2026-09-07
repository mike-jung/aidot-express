<script setup>
/**
 * MetricChart — 외부 라이브러리 없이 순수 SVG 로 그리는 실시간 지표 차트. (v1.10.1 개선)
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  왜 차트 라이브러리를 도입하지 않는가
 * ══════════════════════════════════════════════════════════════════════════
 *  "더 멋진 그래프" 의 답은 라이브러리가 아니었습니다. ECharts 는 300KB 이고
 *  폐쇄망 배포에서 번들 크기는 곧 배포 부담입니다. 그리고 조사해 보면
 *  운영 대시보드의 실패 원인은 렌더링 품질이 아니라 **정보 밀도**입니다.
 *
 *  이번 판에서 고친 것은 전부 "같은 공간에 얼마나 많은 판단 재료를 담는가" 입니다.
 *
 *   ① **현재값을 크게.** 차트만 있으면 "지금 몇인가" 를 눈으로 읽어야 합니다.
 *      운영 화면에서 가장 자주 묻는 질문이 그것입니다.
 *   ② **추세 화살표.** 숫자 하나는 좋은지 나쁜지 알려 주지 않습니다.
 *      직전 구간 대비 변화를 함께 보여야 판단이 됩니다.
 *   ③ **임계선(threshold).** 80% 가 위험한지 아닌지는 지표마다 다릅니다.
 *      선을 그어 두면 "넘었나" 를 계산하지 않고 봅니다.
 *   ④ **최근 구간 강조.** 오래된 데이터와 방금 값이 같은 굵기면 눈이 헤맵니다.
 *   ⑤ **빈 상태 처리.** 데이터가 없을 때 빈 사각형은 "고장" 으로 보입니다.
 *
 *  게이지는 쓰지 않습니다 — 공간을 많이 먹고 담는 정보는 숫자 하나뿐입니다.
 *  (Few/Tufte 이래로 일관된 권고이고, 2026 년 현재도 같습니다)
 *
 *  props:
 *   - seriesA (실선 + 영역) / seriesB (점선) 선택
 *   - dualAxis=true 면 A/B 스케일 각각 (RPS vs ms 같은 경우)
 *   - min / max 고정 스케일 (CPU/Mem 0~100)
 *   - warnAt / dangerAt : 임계선. 넘으면 현재값 색이 바뀝니다.
 */
import { ref, computed } from 'vue';
import { SERIES, STATE } from '../composables/chartPalette';

// ★ v1.10.2 — 다국어
import { useI18n } from '../composables/useI18n';
const { t } = useI18n();

/* 차트마다 다른 gradient id — 같은 id 가 여러 개면 첫 번째만 적용된다 */
let __gradSeq = 0;

const props = defineProps({
  /** ★ v1.15.3 — 점마다의 설명(예: '08-29 07:00'). 말풍선 첫 줄에 쓴다 */
  pointLabels: { type: Array, default: () => [] },
  title:      { type: String, required: true },
  seriesA:    { type: Array, required: true },
  labelA:     { type: String, default: 'A' },
  colorA:     { type: String, default: SERIES.blue },
  seriesB:    { type: Array, default: () => [] },
  labelB:     { type: String, default: '' },
  colorB:     { type: String, default: SERIES.teal },
  min:        { type: Number, default: undefined },
  max:        { type: Number, default: undefined },
  unit:       { type: String, default: '' },
  timeLabels: { type: Array, default: () => ['', '', ''] },
  dualAxis:   { type: Boolean, default: false },
  /* ★ v1.10.1 — 임계선. 지표마다 위험 기준이 다르므로 쓰는 쪽이 정한다. */
  warnAt:     { type: Number, default: undefined },
  dangerAt:   { type: Number, default: undefined },
  /** 값 표시 자릿수 — RPS 는 소수 1자리, CPU 는 정수가 읽기 좋다 */
  precision:  { type: Number, default: 0 },
});


const gradId = `mc-grad-${++__gradSeq}`;
/* ── 현재값 · 추세 ─────────────────────────────────────────────────────── */

const latest = computed(() => {
  const a = props.seriesA;
  return a.length ? a[a.length - 1] : null;
});

/**
 * 추세 — 직전 구간 평균 대비 변화.
 *  ⚠ 마지막 두 점만 비교하면 잡음에 흔들립니다. 뒤쪽 1/3 과 그 앞 1/3 을 견줍니다.
 */
const trend = computed(() => {
  const a = props.seriesA.filter((v) => Number.isFinite(v));
  if (a.length < 6) return null;
  const k = Math.max(2, Math.floor(a.length / 3));
  const avg = (arr) => arr.reduce((x, y) => x + y, 0) / arr.length;
  const now = avg(a.slice(-k));
  const before = avg(a.slice(-k * 2, -k));
  if (!Number.isFinite(before) || before === 0) return null;
  const pct = ((now - before) / Math.abs(before)) * 100;
  if (Math.abs(pct) < 3) return { dir: 'flat', pct: 0 };   // 3% 미만은 변화로 보지 않는다
  return { dir: pct > 0 ? 'up' : 'down', pct: Math.abs(pct) };
});

/** 임계 상태 — 현재값 색과 임계선 표시에 함께 쓴다 */
const level = computed(() => {
  const v = latest.value;
  if (v == null) return 'none';
  if (props.dangerAt != null && v >= props.dangerAt) return 'danger';
  if (props.warnAt != null && v >= props.warnAt) return 'warn';
  return 'ok';
});

const fmtValue = (v) => (v == null ? '—'
  : Number(v).toFixed(props.precision).replace(/\B(?=(\d{3})+(?!\d))/g, ','));

const hasData = computed(() => props.seriesA.some((v) => Number.isFinite(v)));

/**
 * 값 → y 좌표 (임계선용).
 *  ⚠ 범위 밖이면 null 을 돌려줍니다. 억지로 그리면 차트 밖에 선이 걸쳐
 *    "이상한 그림" 이 되고, 임계선이 오히려 신뢰를 깎습니다.
 */
function yOfA(v) {
  if (v == null || !Number.isFinite(v)) return null;
  const mn = mnA.value; const mx = mxA.value;
  if (v < mn || v > mx) return null;
  const range = (mx === mn) ? 1 : (mx - mn);
  return PT + IH - ((v - mn) / range) * IH;
}

// ── 레이아웃 (viewBox) ──
const W = 520, H = 160;
const PL = 40, PR = 40, PT = 10, PB = 22;
const IW = W - PL - PR;
const IH = H - PT - PB;

function niceMax(values) {
  if (!values.length) return 1;
  const v = Math.max(...values);
  if (v === 0) return 1;
  return v * 1.2;
}
function niceMin(values) {
  if (!values.length) return 0;
  return Math.min(0, ...values);
}

const mnA = computed(() => (props.min !== undefined ? props.min : niceMin(props.seriesA)));
const mxA = computed(() => (props.max !== undefined ? props.max : niceMax(props.seriesA)));
const mnB = computed(() => niceMin(props.seriesB));
const mxB = computed(() => niceMax(props.seriesB));

function pointsOf(values, mn, mx) {
  if (!values.length) return '';
  const n = values.length;
  const range = (mx === mn) ? 1 : (mx - mn);
  return values.map((v, i) => {
    const x = PL + (n === 1 ? IW / 2 : (i / (n - 1)) * IW);
    const y = PT + IH - ((v - mn) / range) * IH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

/** 축 글자 — 그래프가 작아 10px 은 너무 크다. 절반 이하로 줄여 눈금이 그림을 가리지 않게 */
const AXIS_FS = 4.5;

/** 마우스가 올라간 점 번호 */
const hover = ref(null);

const pointsA = computed(() => pointsOf(props.seriesA, mnA.value, mxA.value));
/** 말풍선에 담을 것 — 그 지점의 값과 (있으면) 두 번째 계열 값 */
const tip = computed(() => {
  const i = hover.value;
  if (i == null) return null;
  const c = circlesA.value?.[i];
  if (!c) return null;
  const a = Number(props.seriesA?.[i] ?? 0);
  const b = props.seriesB?.length ? Number(props.seriesB[i] ?? 0) : null;
  const label = props.pointLabels?.[i] || '';
  const text = [label, `${props.labelA || ''} ${fmt(a)}`.trim(),
    b != null ? `${props.labelB || ''} ${fmt(b)}`.trim() : ''].filter(Boolean).join('  ·  ');
  return { x: c.cx, y: c.cy, text, w: Math.max(40, text.length * 4.6), flip: c.cx > W - 120 };
});

const pointsB = computed(() => {
  if (!props.seriesB.length) return '';
  if (props.dualAxis) return pointsOf(props.seriesB, mnB.value, mxB.value);
  return pointsOf(props.seriesB, mnA.value, mxA.value);
});

/** 점 좌표 배열로 반환 — polyline 외에 개별 원(circle) 으로도 표시 가능.
 *  특히 데이터 포인트가 1개인 경우 polyline 은 아무 선도 그리지 않으므로,
 *  이 circle 들이 fallback 역할을 한다. */
function circlesOf(values, mn, mx) {
  if (!values.length) return [];
  const n = values.length;
  const range = (mx === mn) ? 1 : (mx - mn);
  return values.map((v, i) => ({
    cx: PL + (n === 1 ? IW / 2 : (i / (n - 1)) * IW),
    cy: PT + IH - ((v - mn) / range) * IH,
  }));
}
const circlesA = computed(() => circlesOf(props.seriesA, mnA.value, mxA.value));
const circlesB = computed(() => {
  if (!props.seriesB.length) return [];
  if (props.dualAxis) return circlesOf(props.seriesB, mnB.value, mxB.value);
  return circlesOf(props.seriesB, mnA.value, mxA.value);
});

const areaA = computed(() => {
  const pts = pointsA.value;
  if (!pts) return '';
  const arr = pts.split(' ');
  const first = arr[0].split(',');
  const last = arr[arr.length - 1].split(',');
  return `M${first[0]},${PT + IH} L${arr.join(' L')} L${last[0]},${PT + IH} Z`;
});

function ticks(mn, mx, count = 3) {
  const out = [];
  for (let i = 0; i <= count; i++) {
    const v = mn + ((mx - mn) * i) / count;
    const y = PT + IH - (i / count) * IH;
    out.push({ v, y });
  }
  return out;
}
const ticksA = computed(() => ticks(mnA.value, mxA.value, 3));
const ticksB = computed(() =>
  props.dualAxis && props.seriesB.length ? ticks(mnB.value, mxB.value, 3) : [],
);

function fmt(v) {
  if (!Number.isFinite(v)) return '';
  const a = Math.abs(v);
  if (a >= 1000) return v.toFixed(0);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

/**
 * Legend 에 표시할 "현재값".
 *  - 단순히 배열 마지막 값이 0/null 이면 실측치가 아직 안 들어온 경우가 많다 (특히 현재 초).
 *  - 뒤에서부터 0이 아닌 값을 찾아서 "마지막 실제 값" 을 반환. 전부 0이면 0.
 */
function latestNonZero(arr) {
  if (!arr || !arr.length) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (Number.isFinite(v) && v !== 0) return v;
  }
  return 0;
}

const lastA = computed(() => latestNonZero(props.seriesA));
const lastB = computed(() => latestNonZero(props.seriesB));
</script>

<template>
  <div class="card chart-card h-100">
    <div class="card-header py-2 d-flex align-items-center">
      <span class="small fw-bold">{{ title }}</span>

      <!-- ★ v1.10.1 — 현재값을 크게. 운영 화면에서 가장 자주 묻는 질문이 "지금 몇인가" 다.
           차트만 있으면 마지막 점의 높이를 눈으로 읽어야 한다. -->
      <span v-if="hasData" class="now ms-2" :class="`lv-${level}`">
        {{ fmtValue(latest) }}<span class="unit">{{ unit }}</span>
      </span>
      <!-- 추세 — 숫자 하나는 좋은지 나쁜지 알려 주지 않는다 -->
      <span v-if="trend" class="trend ms-1" :class="`t-${trend.dir}`"
            :title="trend.dir === 'up' ? t('chart.trendUp') : trend.dir === 'down' ? t('chart.trendDown') : t('chart.trendFlat')">
        <i class="bi" :class="trend.dir === 'up' ? 'bi-arrow-up-right'
                            : trend.dir === 'down' ? 'bi-arrow-down-right' : 'bi-dash'"></i>
        <template v-if="trend.dir !== 'flat'">{{ trend.pct.toFixed(0) }}%</template>
      </span>

      <div class="ms-auto small d-flex align-items-center flex-wrap gap-2">
        <span class="legend-item" :style="{ color: colorA }">
          <i class="legend-dot" :style="{ background: colorA }"></i>
          {{ labelA }}
          <strong v-if="lastA !== null" class="ms-1">{{ fmt(lastA) }}{{ unit && !dualAxis ? unit : '' }}</strong>
        </span>
        <span v-if="seriesB.length" class="legend-item" :style="{ color: colorB }">
          <i class="legend-dot dashed" :style="{ borderTopColor: colorB }"></i>
          {{ labelB }}
          <strong v-if="lastB !== null" class="ms-1">{{ fmt(lastB) }}</strong>
        </span>
      </div>
    </div>
    <div class="card-body p-2">
      <!-- ★ 빈 상태 — 빈 사각형은 "고장" 으로 보인다. 무슨 일인지 말해 준다. -->
      <div v-if="!hasData" class="empty-chart">
        <i class="bi bi-hourglass-split me-1"></i>{{ t('chart.waiting') }}
      </div>
      <svg v-else :viewBox="`0 0 ${W} ${H}`" width="100%" preserveAspectRatio="none" class="chart-svg">
        <line
          v-for="(t, i) in ticksA" :key="'g'+i"
          :x1="PL" :x2="W - PR" :y1="t.y" :y2="t.y"
          :stroke="STATE.grid" stroke-dasharray="2,3" />
        <!-- ★ 임계선 — 80% 가 위험한지는 지표마다 다르다.
             선을 그어 두면 "넘었나" 를 계산하지 않고 본다. -->
        <template v-if="warnAt != null && yOfA(warnAt) != null">
          <line :x1="PL" :x2="W - PR" :y1="yOfA(warnAt)" :y2="yOfA(warnAt)"
                :stroke="STATE.warn" stroke-width="1" stroke-dasharray="5,4" opacity=".55" />
          <text :x="W - PR + 3" :y="yOfA(warnAt) + 3" class="thr" :fill="STATE.warn">{{ warnAt }}</text>
        </template>
        <template v-if="dangerAt != null && yOfA(dangerAt) != null">
          <line :x1="PL" :x2="W - PR" :y1="yOfA(dangerAt)" :y2="yOfA(dangerAt)"
                :stroke="STATE.danger" stroke-width="1" stroke-dasharray="5,4" opacity=".65" />
          <text :x="W - PR + 3" :y="yOfA(dangerAt) + 3" class="thr" :fill="STATE.danger">{{ dangerAt }}</text>
        </template>

        <!-- ★ v1.10.44 — 아래 영역을 **그라데이션**으로 채운다.
             선 하나만 있으면 값의 크기가 눈에 덜 들어온다. 위는 진하게,
             아래로 갈수록 투명하게 해 선 자체를 가리지 않는다.
             ⚠ 색이 두 계열뿐이라 gradient id 는 차트마다 달라야 한다
               (같은 id 가 여러 개면 첫 번째 것만 적용된다). -->
        <defs>
          <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   :stop-color="colorA" stop-opacity="0.28" />
            <stop offset="60%"  :stop-color="colorA" stop-opacity="0.08" />
            <stop offset="100%" :stop-color="colorA" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path v-if="areaA" :d="areaA" :fill="`url(#${gradId})`" />
        <polyline v-if="pointsA" :points="pointsA" fill="none" :stroke="colorA" stroke-width="2" />
        <polyline v-if="pointsB" :points="pointsB" fill="none" :stroke="colorB" stroke-width="2" stroke-dasharray="4,3" />
        <!-- 데이터 포인트를 원으로도 표시 — 점이 1개이거나 드문드문인 경우에도 가시성 확보 -->
        <!-- ★ 마지막 점을 크게 — 오래된 데이터와 방금 값이 같은 굵기면 눈이 헤맨다 -->
        <circle v-for="(p, i) in circlesA" :key="'ca'+i" :cx="p.cx" :cy="p.cy"
                :r="i === circlesA.length - 1 ? 4.5 : 2.5" :fill="colorA"
                :opacity="i === circlesA.length - 1 ? 1 : 0.55" />
        <!-- ★ v1.15.3 — 값 보기.
             그리는 점(2.5px)은 너무 작아 마우스가 잘 안 맞는다. 그래서 **보이지 않는 큰 원**을 겹쳐
             그 위에 올리거나 누르면 그 지점의 값을 말풍선으로 보여 준다. -->
        <circle v-for="(p, i) in circlesA" :key="'ha'+i" :cx="p.cx" :cy="p.cy" r="9"
                fill="transparent" style="cursor:pointer"
                @mouseenter="hover = i" @mouseleave="hover = null" @click="hover = i" />
        <circle v-if="circlesA.length" :cx="circlesA[circlesA.length-1].cx"
                :cy="circlesA[circlesA.length-1].cy" r="8" :fill="colorA" opacity=".16" />
        <circle v-for="(p, i) in circlesB" :key="'cb'+i" :cx="p.cx" :cy="p.cy" r="2.5" :fill="colorB" />
        <text v-for="(t, i) in ticksA" :key="'yA'+i"
              :x="PL - 5" :y="t.y + 4" text-anchor="end" :font-size="AXIS_FS" :fill="STATE.muted">
          {{ fmt(t.v) }}
        </text>
        <text v-for="(t, i) in ticksB" :key="'yB'+i"
              :x="W - PR + 5" :y="t.y + 4" text-anchor="start" :font-size="AXIS_FS" :fill="colorB">
          {{ fmt(t.v) }}
        </text>
        <text :x="PL" :y="H - 6" :font-size="AXIS_FS" :fill="STATE.muted">{{ timeLabels[0] }}</text>
        <text :x="PL + IW / 2" :y="H - 6" text-anchor="middle" :font-size="AXIS_FS" :fill="STATE.muted">{{ timeLabels[1] }}</text>
        <text :x="W - PR" :y="H - 6" text-anchor="end" :font-size="AXIS_FS" :fill="STATE.muted">{{ timeLabels[2] }}</text>

        <!-- 말풍선: 고른 점 위에 -->
        <g v-if="tip" :transform="`translate(${tip.x}, ${tip.y})`" pointer-events="none">
          <circle cx="0" cy="0" r="4" :fill="colorA" stroke="#fff" stroke-width="1.5" />
          <rect :x="tip.flip ? -tip.w - 10 : 10" y="-26" :width="tip.w" height="22" rx="4"
                fill="rgba(17,24,39,.92)" />
          <text :x="tip.flip ? -tip.w : 16" y="-11" font-size="9" fill="#fff">{{ tip.text }}</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
/* ★ v1.10.1 — 현재값을 크게. 정보 밀도가 이 개선의 전부다. */
.now { font-size: 1.15rem; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.now .unit { font-size: .68rem; font-weight: 500; opacity: .6; margin-left: 1px; }
.now.lv-ok { color: var(--bs-body-color, #22262f); }
.now.lv-warn { color: #fd7e14; }
.now.lv-danger { color: #dc3545; }

.trend { font-size: .7rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.trend.t-up { color: #dc3545; }      /* 지표는 대개 '오르면 나쁨' (CPU·지연·오류) */
.trend.t-down { color: #198754; }
.trend.t-flat { color: var(--ax-text-muted, #6b7280); }

.thr { font-size: 8px; font-family: var(--ax-font-mono, monospace); }

.empty-chart {
  height: 160px; display: flex; align-items: center; justify-content: center;
  color: var(--ax-text-muted, #6b7280); font-size: .8rem;
}

.chart-card { border: 1px solid #e9ecef; }
.chart-card .card-header { background: #f8f9fb; }
.chart-svg { display: block; }
.legend-item { display: inline-flex; align-items: center; gap: 3px; }
.legend-dot {
  display: inline-block;
  width: 12px; height: 3px; border-radius: 2px;
  vertical-align: middle;
}
.legend-dot.dashed {
  background: transparent !important;
  border-top: 2px dashed;
  height: 0;
}
</style>
