<script setup>
import { confirmDelete } from '../composables/useConfirm';
/**
 * MonitoringPage — 서버 부하 실시간 모니터링 화면.
 *
 *  구성:
 *   - 상단 설정: 폴링 interval, 차트 window, 알림 on/off
 *   - KPI 카드 6개: CPU, 메모리, HTTP RPS, HTTP 평균응답, DB QPS, DB 평균쿼리
 *   - 실시간 차트 4개: CPU/Mem, HTTP(RPS+avgMs), DB(QPS+avgMs), 프로세스 메모리
 *   - 활성 알림 / 최근 알림 이력
 *   - 임계값 편집 테이블 (추가/수정/삭제/저장)
 *
 *  실시간: 기본은 SSE 푸시(GET /api/admin/metrics/stream). 서버가 채널당 타이머 1개로 스냅샷을 만들어
 *          구독자 전원에게 밀어 주므로, 접속자가 늘어도 서버 비용이 늘지 않는다.
 *          연결이 실패하면 예전 방식(HTTP 폴링)으로 자동 전환한다.
 *  차트는 순수 SVG 로 렌더링 (외부 라이브러리 없음).
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { PAIRS } from '../composables/chartPalette';
// ★ v1.10.2 — 다국어
import { useI18n } from '../composables/useI18n';
import { useFormat } from '../composables/useFormat';
import http, { sseUrl } from '../api/http';
import KpiCard from '../components/KpiCard.vue';
import MetricChart from '../components/MetricChart.vue';
import ControllerRequestsDialog from '../components/ControllerRequestsDialog.vue';
import { useDuration } from '../utils/duration';   // ★ v1.19.10 시간 표기 공통화

/* ==========================================================
 *  설정 / 상태
 * ========================================================== */
const { t } = useI18n();
/* ★ v1.42.0 — 임계값 라벨은 **DB 에 한글로 저장돼** 있다 (마이그레이션 005 가 넣는다).
   이미 실행된 마이그레이션은 되돌릴 수 없으므로 화면에서 알아보고 번역한다.
   사용자가 직접 지은 라벨은 그대로 둔다 — 그건 그 사람의 말이다. */
const THRESHOLD_KEY = {
  'CPU 사용률 85% 초과': 'thr_cpu',
  '메모리 사용률 90% 초과': 'thr_mem',
  'HTTP 평균 응답시간 1초 초과': 'thr_httpMs',
  'HTTP 에러율 10% 초과': 'thr_httpErr',
  'DB 평균 쿼리시간 500ms 초과': 'thr_dbMs',
  'DB 에러율 5% 초과': 'thr_dbErr',
};
const thresholdLabel = (label) => {
  const k = THRESHOLD_KEY[String(label || '').trim()];
  return k ? t('designer.' + k) : (label || '');
};

const { fmtDuration } = useDuration();

const fmt = useFormat();
const settings = ref({
  intervalMs: 2000,     // 500 ~ 30000
  windowSec: 60,        // 차트 가로축 길이
  notifyEnabled: true,  // 브라우저 알림
  liveEnabled: true,    // 실시간 폴링 활성화 (기본 ON)
});

const loading  = ref(false);
const error    = ref(null);
const snapshot = ref(null);
const series   = ref([]);
const routesTop = ref([]);  // 상위 라우트 요약 (KPI 차트용)
const activeAlerts = ref([]);
const recentAlerts = ref([]);

// 실시간 수신 방식: 'sse' = 서버 푸시, 'poll' = 예전 폴링, 'off' = 정지
const liveMode = ref('off');
const sseFailures = ref(0);
let es = null;            // EventSource (반응형 객체로 감싸면 안 됨)
let sseRetryTimer = null;

const thresholds = ref([]);
const thresholdsDirty = ref(false);
const savingThresholds = ref(false);
const thresholdsSavedAt = ref(null);

// 컨트롤러별 상세 다이얼로그
const showControllerDialog = ref(false);

let pollTimer = null;
let alertsTimer = null;
const seenAlertIds = new Set();

/* ==========================================================
 *  브라우저 알림
 * ========================================================== */
const notificationPermission = ref(
  typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
);

async function requestNotifyPermission() {
  if (typeof Notification === 'undefined') return;
  try {
    const p = await Notification.requestPermission();
    notificationPermission.value = p;
  } catch { /* noop */ }
}

function notify(title, body) {
  if (!settings.value.notifyEnabled) return;
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try { new Notification(title, { body, tag: `metric-${title}`, renotify: false }); }
  catch { /* noop */ }
}

/* ==========================================================
 *  데이터 로드
 * ========================================================== */
/** 스냅샷 한 건을 화면 상태에 반영 (폴링·SSE 공통) */
function applyCurrent(d) {
  if (!d) return;
  snapshot.value = d.snapshot;
  series.value = d.series || [];
  routesTop.value = d.routesTop || [];

  const newActive = d.activeAlerts || [];
  for (const a of newActive) {
    if (!seenAlertIds.has(a.id)) {
      seenAlertIds.add(a.id);
      notify(
        t('monLabel.alertTitle', { kind: a.kind, metric: a.metric }),
        t('monLabel.alertBody', { label: thresholdLabel(a.label), cmp: a.comparator, threshold: fmtNum(a.threshold), peak: fmtNum(a.peak_value) }),
      );
    }
  }
  activeAlerts.value = newActive;
}

async function loadCurrent() {
  loading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/metrics/current', {
      params: { windowSec: settings.value.windowSec, topRoutes: 5 },
    });
    applyCurrent(r.data.data);
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally {
    loading.value = false;
  }
}

async function loadRecentAlerts() {
  try {
    const r = await http.get('/api/admin/metrics/alerts', { params: { limit: 50 } });
    recentAlerts.value = r.data.data || [];
  } catch { /* ignore */ }
}

async function loadThresholds() {
  try {
    const r = await http.get('/api/admin/metrics/thresholds');
    thresholds.value = (r.data.data || []).map(normalizeThresholdRow);
    thresholdsDirty.value = false;
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  }
}

function normalizeThresholdRow(r) {
  return {
    id: r.id ?? null,
    kind: r.kind,
    metric: r.metric,
    comparator: r.comparator || '>',
    threshold: Number(r.threshold),
    durationSec: Number(r.duration_sec ?? r.durationSec ?? 30),
    enabled: Number(r.enabled) === 1 || r.enabled === true,
    label: thresholdLabel(r.label),
  };
}

function markThresholdsDirty() { thresholdsDirty.value = true; }

async function saveThresholds() {
  savingThresholds.value = true;
  try {
    await http.put('/api/admin/metrics/thresholds', { rows: thresholds.value });
    thresholdsSavedAt.value = new Date().toLocaleTimeString();
    thresholdsDirty.value = false;
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally {
    savingThresholds.value = false;
  }
}

function addThreshold() {
  thresholds.value.push({
    id: null,
    kind: 'os',
    metric: 'cpu_pct',
    comparator: '>',
    threshold: 80,
    durationSec: 30,
    enabled: true,
    label: '',
  });
  thresholdsDirty.value = true;
}

async function removeThreshold(row, idx) {
  if (row.id) {
    if (!await confirmDelete(`${row.kind}.${row.metric}`, { title: t('monLabel.deleteThreshold') })) return;
    try {
      await http.delete(`/api/admin/metrics/thresholds/${row.id}`);
    } catch (e) {
      error.value = e.response?.data?.message || e.message;
      return;
    }
  }
  thresholds.value.splice(idx, 1);
}

/* ==========================================================
 *  실시간 수신 — SSE 우선, 실패하면 폴링으로 자동 전환
 * ========================================================== */
const MAX_SSE_FAILURES = 2;   // 연속 실패가 이만큼이면 폴링으로 굳힌다

function startLive() {
  stopLive();
  if (!settings.value.liveEnabled) { liveMode.value = 'off'; return; }
  // 알림 이력은 자주 바뀌지 않으므로 기존처럼 가볍게 폴링
  alertsTimer = setInterval(loadRecentAlerts, Math.max(5000, settings.value.intervalMs * 3));
  if (sseFailures.value < MAX_SSE_FAILURES) void startStream();
  else startPolling();
}

function stopLive() {
  stopPolling();
  stopStream();
  if (alertsTimer) { clearInterval(alertsTimer); alertsTimer = null; }
  liveMode.value = 'off';
}

/* ---------- SSE ---------- */
/** 접속 주소 — 매번 새 1회용 티켓을 받아 붙인다 (티켓은 접속 시 소모됨) */
function streamUrl() {
  return sseUrl('/api/admin/metrics/stream', {
    windowSec: settings.value.windowSec,
    intervalMs: settings.value.intervalMs,
    topRoutes: 5,
  });
}

async function startStream() {
  stopStream();
  let url;
  try {
    url = await streamUrl();
    if (!settings.value.liveEnabled) return;   // 티켓 받는 사이에 실시간이 꺼졌으면 중단
    es = new EventSource(url);
  } catch {
    fallbackToPolling();
    return;
  }
  es.onopen = () => { liveMode.value = 'sse'; sseFailures.value = 0; error.value = null; };
  es.addEventListener('metrics', (ev) => {
    try { applyCurrent(JSON.parse(ev.data)); liveMode.value = 'sse'; } catch { /* 손상된 프레임 무시 */ }
  });
  es.addEventListener('metrics-error', (ev) => {
    try { error.value = JSON.parse(ev.data)?.error || t('monLabel.collectFail'); } catch { /* noop */ }
  });
  es.onerror = () => {
    // EventSource 는 스스로 재접속하지만, 토큰이 만료됐을 수 있어 직접 다시 붙는다.
    stopStream();
    sseFailures.value += 1;
    if (sseFailures.value >= MAX_SSE_FAILURES) { fallbackToPolling(); return; }
    sseRetryTimer = setTimeout(() => { if (settings.value.liveEnabled) void startStream(); }, 2000);
  };
}

function stopStream() {
  if (sseRetryTimer) { clearTimeout(sseRetryTimer); sseRetryTimer = null; }
  if (es) { es.close(); es = null; }
}

function fallbackToPolling() {
  stopStream();
  startPolling();
}

/* ---------- 폴링 (예전 방식 · SSE 실패 시) ---------- */
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  if (!settings.value.liveEnabled) return;
  liveMode.value = 'poll';
  loadCurrent();
  pollTimer = setInterval(loadCurrent, settings.value.intervalMs);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

/** 사용자가 [다시 시도] 를 누르면 SSE 로 복귀 */
function retryStream() {
  sseFailures.value = 0;
  startLive();
}

watch(() => settings.value.intervalMs, () => startLive());
watch(() => settings.value.windowSec, () => { loadCurrent(); startLive(); });
watch(() => settings.value.liveEnabled, (on) => { if (on) startLive(); else stopLive(); });

onMounted(async () => {
  await Promise.all([loadCurrent(), loadRecentAlerts(), loadThresholds()]);
  startLive();
});
onBeforeUnmount(stopLive);

/* ==========================================================
 *  포맷 / 파생값
 * ========================================================== */
function fmtNum(n, digits = 1) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  return v.toFixed(digits);
}
function fmtMs(n) { return fmtNum(n, 0) + ' ms'; }
function fmtPct(n) { return fmtNum(n, 1) + '%'; }
function fmtGb(mb) {
  if (mb === null || mb === undefined || !Number.isFinite(Number(mb))) return '—';
  const gb = Number(mb) / 1024;
  return gb.toFixed(1);
}

const kpi = computed(() => {
  const s = snapshot.value;
  if (!s) return null;
  const mu = s.os?.memUsedMb ?? 0;
  const mt = s.os?.memTotalMb ?? 0;
  return {
    cpu:    s.os?.cpuPct ?? 0,
    mem:    s.os?.memPct ?? 0,
    memUsedMb:  mu,
    memTotalMb: mt,
    // KPI 카드 표시 문자열: "75.2% · 12.3 / 16.0 GB"
    memLabel: mt > 0
      ? `${fmtPct(s.os?.memPct ?? 0)} · ${fmtGb(mu)} / ${fmtGb(mt)} GB`
      : fmtPct(s.os?.memPct ?? 0),
    rps:    s.http?.rps ?? 0,
    httpMs: s.http?.avgMs ?? 0,
    /* ★ v1.11.9 — 4xx(요청 거부)와 5xx(서버 오류)를 나눠 보여 준다.
       예전에는 5xx 만 세어서 401/404 가 쏟아져도 화면은 "오류 0" 이었다. */
    failPct: s.http?.failPct ?? 0,
    failCount: s.http?.failCount ?? 0,
    errPct: s.http?.errPct ?? 0,
    errCount: s.http?.errCount ?? 0,
    qps:    s.db?.qps ?? 0,
    dbMs:   s.db?.avgMs ?? 0,
  };
});

function kpiAccent(v, warn, danger) {
  if (v >= danger) return 'danger';
  if (v >= warn) return 'warning';
  return 'info';
}

const systemInfo = computed(() => snapshot.value?.systemInfo || null);
const activeCount = computed(() => activeAlerts.value.length);

/** Top 5 라우트 막대 그래프의 기준값 */
const routesTopMaxCount = computed(() => {
  if (!routesTop.value.length) return 0;
  return Math.max(...routesTop.value.map((r) => r.count || 0));
});

/* 시리즈에서 숫자 배열 추출 */
function seriesValues(path) {
  return series.value.map((s) => {
    const parts = path.split('.');
    let v = s;
    for (const p of parts) v = v == null ? null : v[p];
    return Number.isFinite(v) ? v : 0;
  });
}

const chartCpu    = computed(() => seriesValues('os.cpuPct'));
const chartMem    = computed(() => seriesValues('os.memPct'));
const chartRps    = computed(() => seriesValues('http.rps'));
const chartHttpMs = computed(() => seriesValues('http.avgMs'));
const chartQps    = computed(() => seriesValues('db.qps'));
const chartDbMs   = computed(() => seriesValues('db.avgMs'));
const chartRss    = computed(() => seriesValues('os.procRssMb'));
const chartHeap   = computed(() => seriesValues('os.procHeapMb'));

const timeLabels = computed(() => {
  if (!series.value.length) return ['', '', ''];
  const ts0 = series.value[0].tsSec * 1000;
  const tsN = series.value[series.value.length - 1].tsSec * 1000;
  const tsMid = (ts0 + tsN) / 2;
  const f = (ms) => fmt.time(ms, { hour12: false });
  return [f(ts0), f(tsMid), f(tsN)];
});

const KIND_OPTIONS = [
  { value: 'os',   label: 'OS' },
  { value: 'http', label: 'HTTP' },
  { value: 'db',   label: 'DB' },
];
const METRIC_OPTIONS = {
  os:   [
    { value: 'cpu_pct',      label: 'CPU (%)' },
    { value: 'mem_pct',      label: t('monLabel.k1') },
    { value: 'load1',        label: 'Load 1m' },
    { value: 'proc_rss_mb',  label: t('monLabel.k2') },
    { value: 'proc_heap_mb', label: t('monLabel.k3') },
  ],
  http: [
    { value: 'rps',      label: t('monLabel.k4') },
    { value: 'avg_ms',   label: t('monLabel.k5') },
    { value: 'max_ms',   label: t('monLabel.k6') },
    { value: 'err_pct',  label: t('monLabel.k7') },
  ],
  db:   [
    { value: 'qps',      label: t('monLabel.k8') },
    { value: 'avg_ms',   label: t('monLabel.k9') },
    { value: 'max_ms',   label: t('monLabel.k10') },
    { value: 'err_pct',  label: t('monLabel.k7') },
  ],
};

function metricsForKind(kind) { return METRIC_OPTIONS[kind] || []; }
</script>

<template>
  <div class="monitoring-page">
    <!-- 상단 설정 바 -->
    <div class="card mb-3">
      <div class="card-body d-flex flex-wrap gap-3 align-items-center">
        <div>
          <h5 class="mb-0">
            <i class="bi bi-speedometer2 text-primary me-2"></i>
            {{ t('monitoring.title') }}
            <span v-if="activeCount > 0" class="badge bg-danger ms-2">
              {{ t('monitoring.activeAlerts') }} {{ activeCount }}
            </span>
          </h5>
          <small v-if="systemInfo" class="text-secondary">
            {{ systemInfo.hostname }} · node {{ systemInfo.nodeVersion }} ·
            {{ systemInfo.cpuCount }} vCPU · RAM {{ (systemInfo.totalMemMb / 1024).toFixed(1) }} GB ·
            uptime {{ fmtDuration(systemInfo.uptimeSec) }}
          </small>
        </div>

        <div class="ms-auto d-flex gap-3 align-items-end flex-wrap">
          <div>
            <label class="form-label small mb-1 text-secondary d-block">{{ t('monitoringUi.refreshInterval') }}</label>
            <select v-model.number="settings.intervalMs" class="form-select form-select-sm" style="width:130px">
              <option :value="500">{{ t('mon3.halfSec') }}</option>
              <option :value="1000">{{ t('access3.sec', { n: 1 }) }}</option>
              <option :value="2000">{{ t('access3.sec', { n: 2 }) }}</option>
              <option :value="5000">{{ t('access3.sec', { n: 5 }) }}</option>
              <option :value="10000">{{ t('access3.sec', { n: 10 }) }}</option>
              <option :value="30000">{{ t('access3.sec', { n: 30 }) }}</option>
            </select>
          </div>
          <div>
            <label class="form-label small mb-1 text-secondary d-block">{{ t('monitoringUi.chartWindow') }}</label>
            <select v-model.number="settings.windowSec" class="form-select form-select-sm" style="width:130px">
              <option :value="30">{{ t('access3.sec', { n: 30 }) }}</option>
              <option :value="60">{{ t('access3.min', { n: 1 }) }}</option>
              <option :value="120">{{ t('access3.min', { n: 2 }) }}</option>
              <option :value="300">{{ t('access3.min', { n: 5 }) }}</option>
              <option :value="600">{{ t('access3.min', { n: 10 }) }}</option>
            </select>
          </div>
          <div class="form-check form-switch mb-1">
            <input class="form-check-input" type="checkbox" id="liveChk" v-model="settings.liveEnabled" />
            <label class="form-check-label small" for="liveChk">
              {{ t('monitoring.live') }}
              <span class="badge ms-1" :class="settings.liveEnabled ? 'bg-success' : 'bg-secondary'">
                {{ settings.liveEnabled ? 'ON' : 'OFF' }}
              </span>
            </label>
            <!-- 수신 방식 표시: SSE(서버 푸시) / 폴링(예전 방식) -->
            <span v-if="settings.liveEnabled" class="badge ms-1"
                  :class="liveMode === 'sse' ? 'bg-primary' : 'bg-warning text-dark'"
                  :title="liveMode === 'sse' ? t('monitoring.sseHint') : t('monitoring.sseFellBack')">
              {{ liveMode === 'sse' ? t('monitoring.ssePush') : t('monitoring.polling') }}
            </span>
            <button v-if="settings.liveEnabled && liveMode === 'poll'"
                    class="btn btn-sm btn-link p-0 ms-1 small" @click="retryStream">
              {{ t('monitoring.sseRetry') }}
            </button>
          </div>
          <div class="form-check form-switch mb-1">
            <input class="form-check-input" type="checkbox" id="notifyChk" v-model="settings.notifyEnabled" />
            <label class="form-check-label small" for="notifyChk">{{ t('mon2.notify') }}</label>
            <button
              v-if="settings.notifyEnabled && notificationPermission !== 'granted' && notificationPermission !== 'unsupported'"
              class="btn btn-sm btn-link p-0 ms-1 small"
              @click="requestNotifyPermission">
              {{ t('monitoringUi.permissionNeeded') }}
            </button>
          </div>
          <button
            class="btn btn-sm btn-outline-primary mb-1"
            @click="showControllerDialog = true"
            :title="t('mon3.requestDetail')">
            <i class="bi bi-bar-chart-line me-1"></i>
            {{ t('monitoringUi.perController') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger small">{{ error }}</div>

    <!-- KPI 카드 -->
    <div v-if="kpi" class="row g-3 mb-3">
      <KpiCard label="CPU"           :value="fmtPct(kpi.cpu)"    :accent="kpiAccent(kpi.cpu, 60, 85)"  icon="bi-cpu" />
      <KpiCard :label="t('mon.memory')"
               :value="fmtPct(kpi.mem)"
               :sub="kpi.memTotalMb > 0 ? `${fmtGb(kpi.memUsedMb)} / ${fmtGb(kpi.memTotalMb)} GB` : ''"
               :accent="kpiAccent(kpi.mem, 70, 90)"
               icon="bi-memory" />
      <KpiCard label="HTTP RPS"      :value="fmtNum(kpi.rps, 1)" accent="primary"                     icon="bi-arrow-left-right" />
      <KpiCard :label="t('mon.httpAvg')" :value="fmtMs(kpi.httpMs)"  :accent="kpiAccent(kpi.httpMs, 500, 1000)" icon="bi-stopwatch" />
      <KpiCard :label="t('mon.err5xx')" :value="fmtPct(kpi.errPct)"  :sub="t('mon.countN', { n: kpi.errCount })" :accent="kpiAccent(kpi.errPct, 1, 5)"  icon="bi-exclamation-octagon" />
      <KpiCard :label="t('mon.fail4xx')" :value="fmtPct(kpi.failPct)" :sub="t('mon.fail4xxSub', { n: kpi.failCount })" :accent="kpiAccent(kpi.failPct, 20, 50)" icon="bi-slash-circle" />
      <KpiCard label="DB QPS"        :value="fmtNum(kpi.qps, 1)" accent="primary"                     icon="bi-database" />
      <KpiCard :label="t('mon.dbAvg')"   :value="fmtMs(kpi.dbMs)"    :accent="kpiAccent(kpi.dbMs, 200, 500)"    icon="bi-hourglass-split" />
    </div>

    <!-- 차트 그리드 -->
    <div class="row g-3 mb-3">
      <div class="col-lg-6">
        <MetricChart
          :title="t('monitoring.chartOs')"
          :series-a="chartCpu" label-a="CPU" :color-a="PAIRS.os.a"
          :series-b="chartMem" label-b="Memory" :color-b="PAIRS.os.b"
          :min="0" :max="100" unit="%" :time-labels="timeLabels"
          :warn-at="70" :danger-at="85" />
      </div>
      <div class="col-lg-6">
        <MetricChart
          :title="t('monitoring.chartHttp')"
          :series-a="chartRps"    label-a="RPS"      :color-a="PAIRS.http.a"
          :series-b="chartHttpMs" label-b="avg (ms)" :color-b="PAIRS.http.b"
          :time-labels="timeLabels" dual-axis :precision="1" />
      </div>
      <div class="col-lg-6">
        <MetricChart
          :title="t('monitoring.chartDb')"
          :series-a="chartQps"    label-a="QPS"      :color-a="PAIRS.db.a"
          :series-b="chartDbMs"   label-b="avg (ms)" :color-b="PAIRS.db.b"
          :time-labels="timeLabels" dual-axis :precision="1" />
      </div>
      <div class="col-lg-6">
        <MetricChart
          :title="t('monitoring.chartProcMem')"
          :series-a="chartRss"  label-a="RSS"  :color-a="PAIRS.memory.a"
          :series-b="chartHeap" label-b="Heap" :color-b="PAIRS.memory.b"
          :time-labels="timeLabels" unit=" MB" dual-axis />
      </div>
    </div>

    <!-- 컨트롤러 요청 빈도 Top 5 -->
    <div class="card mb-3">
      <div class="card-header d-flex align-items-center">
        <i class="bi bi-bar-chart-line me-2"></i>
        {{ t('monitoringUi.topControllers') }}
        <small class="text-secondary ms-2">
          {{ t('monLabel.windowNote', { sec: settings.windowSec }) }}
        </small>
        <button
          class="btn btn-sm btn-outline-primary ms-auto"
          @click="showControllerDialog = true">
          {{ t('monitoringUi.viewAll') }} <i class="bi bi-chevron-right"></i>
        </button>
      </div>
      <div class="card-body">
        <div v-if="!routesTop.length" class="text-secondary small text-center py-3">
          {{ t('monitoring.noRoutes') }}
        </div>
        <div v-else>
          <div v-for="r in routesTop" :key="r.key" class="route-row mb-2">
            <div class="d-flex justify-content-between align-items-baseline small">
              <span class="fw-bold text-truncate me-2">
                <code class="small text-dark">{{ r.meta?.method || '' }}</code>
                <span class="ms-1">{{ r.meta?.controller && r.meta?.handler
                  ? `${r.meta.controller}.${r.meta.handler}`
                  : r.key }}</span>
                <span class="text-secondary ms-2">{{ r.meta?.path }}</span>
              </span>
              <span class="text-nowrap">
                <strong>{{ fmtNum(r.count, 0) }}</strong>
                <span class="text-secondary ms-1">req</span>
                <span class="text-secondary ms-2">·</span>
                <span class="ms-2">{{ fmtNum(r.rps, 2) }} rps</span>
                <span class="text-secondary ms-2">·</span>
                <span class="ms-2">{{ fmtMs(r.avgMs) }}</span>
                <span v-if="r.failCount > 0" class="text-warning ms-2">· 4xx {{ r.failCount }}</span>
                <span v-if="r.errCount > 0" class="text-danger ms-2">
                  · err {{ r.errCount }}
                </span>
              </span>
            </div>
            <div class="progress mt-1" style="height:8px">
              <div
                class="progress-bar"
                :style="{
                  width: (routesTopMaxCount > 0 ? (r.count / routesTopMaxCount) * 100 : 0) + '%',
                  backgroundColor: r.errCount > 0 ? '#dc3545' : '#0d6efd',
                }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 알림 섹션 -->
    <div class="row g-3 mb-3">
      <div class="col-lg-6">
        <div class="card h-100">
          <div class="card-header">
            <i class="bi bi-exclamation-triangle-fill text-danger me-2"></i>
            {{ t('monitoringUi.activeAlerts') }} <span class="badge bg-secondary ms-1">{{ activeAlerts.length }}</span>
          </div>
          <div class="card-body p-0">
            <div v-if="!activeAlerts.length" class="text-secondary small py-3 text-center">
              {{ t('monitoringUi.noAlerts') }}
            </div>
            <table v-else class="table table-sm table-hover mb-0">
              <thead class="small text-secondary">
                <tr>
                  <th style="width:150px">{{ t('monitoringUi.occurredAt') }}</th>
                  <th>{{ t('monitoringUi.metric') }}</th>
                  <th>{{ t('mon2.threshold') }}</th>
                  <th>Peak</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in activeAlerts" :key="a.id">
                  <td class="small">{{ a.triggered_at }}</td>
                  <td>
                    <code class="small">{{ a.kind }}.{{ a.metric }}</code>
                    <div class="small text-secondary">{{ thresholdLabel(a.label) }}</div>
                  </td>
                  <td class="small">{{ a.comparator }} {{ fmtNum(a.threshold) }} × {{ a.duration_sec }}s</td>
                  <td class="small"><strong class="text-danger">{{ fmtNum(a.peak_value) }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card h-100">
          <div class="card-header d-flex align-items-center">
            <i class="bi bi-clock-history me-2"></i>{{ t('mon2.recentAlerts') }}
            <button class="btn btn-sm btn-outline-secondary ms-auto" @click="loadRecentAlerts" :title="t('mon3.refresh')">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
          </div>
          <div class="card-body p-0" style="max-height:280px; overflow-y:auto;">
            <div v-if="!recentAlerts.length" class="text-secondary small py-3 text-center">
              {{ t('mon2.noHistory') }}
            </div>
            <table v-else class="table table-sm mb-0">
              <thead class="small text-secondary">
                <tr>
                  <th>{{ t('mon2.time') }}</th><th>{{ t('mon2.metric') }}</th><th>Peak</th><th>{{ t('mon2.status') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in recentAlerts" :key="a.id">
                  <td class="small">{{ a.triggered_at }}</td>
                  <td><code class="small">{{ a.kind }}.{{ a.metric }}</code></td>
                  <td class="small">{{ fmtNum(a.peak_value) }}</td>
                  <td>
                    <span v-if="a.status === 'active'" class="badge bg-danger">active</span>
                    <span v-else class="badge bg-success">resolved</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 임계값 편집 -->
    <div class="card">
      <div class="card-header d-flex align-items-center flex-wrap gap-2">
        <span>
          <i class="bi bi-sliders me-2"></i>{{ t('mon2.thresholdSettings') }}
          <small class="text-secondary ms-2">
            {{ t('mon2.durationHint') }}
          </small>
        </span>
        <div class="ms-auto d-flex align-items-center gap-2">
          <small v-if="thresholdsSavedAt" class="text-success">{{ t('common.saved') }} {{ thresholdsSavedAt }}</small>
          <button class="btn btn-sm btn-outline-secondary" @click="addThreshold">
            <i class="bi bi-plus-lg me-1"></i>{{ t('mon2.add') }}
          </button>
          <button
            class="btn btn-sm btn-primary"
            :disabled="!thresholdsDirty || savingThresholds"
            @click="saveThresholds">
            <span v-if="savingThresholds" class="spinner-border spinner-border-sm me-1"></span>
            {{ t('mon2.save') }}
          </button>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-sm mb-0 align-middle">
          <thead class="small text-secondary">
            <tr>
              <th style="width:90px">Kind</th>
              <th style="width:200px">Metric</th>
              <th style="width:70px">{{ t('mon2.compare') }}</th>
              <th style="width:120px">{{ t('mon2.thresholdValue') }}</th>
              <th style="width:130px">Duration (s)</th>
              <th style="width:80px" class="text-center">{{ t('mon2.active') }}</th>
              <th>{{ t('mon3.label') }}</th>
              <th style="width:60px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!thresholds.length">
              <td colspan="8" class="text-center text-secondary py-4">
                {{ t('monitoring.noThresholds') }}
              </td>
            </tr>
            <tr v-for="(th, idx) in thresholds" :key="(th.id || 'new') + '-' + idx">
              <td>
                <select v-model="th.kind" class="form-select form-select-sm" @change="markThresholdsDirty">
                  <option v-for="o in KIND_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </td>
              <td>
                <select v-model="th.metric" class="form-select form-select-sm" @change="markThresholdsDirty">
                  <option v-for="o in metricsForKind(th.kind)" :key="o.value" :value="o.value">
                    {{ o.label }}
                  </option>
                </select>
              </td>
              <td>
                <select v-model="th.comparator" class="form-select form-select-sm" @change="markThresholdsDirty">
                  <option value=">">&gt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<">&lt;</option>
                  <option value="<=">&lt;=</option>
                </select>
              </td>
              <td>
                <input type="number" step="0.01" class="form-control form-control-sm"
                       v-model.number="th.threshold" @input="markThresholdsDirty" />
              </td>
              <td>
                <input type="number" min="1" class="form-control form-control-sm"
                       v-model.number="th.durationSec" @input="markThresholdsDirty" />
              </td>
              <td class="text-center">
                <div class="form-check form-switch d-inline-block">
                  <input class="form-check-input" type="checkbox"
                         v-model="th.enabled" @change="markThresholdsDirty" />
                </div>
              </td>
              <td>
                <input type="text" class="form-control form-control-sm"
                       v-model="th.label" @input="markThresholdsDirty" :placeholder="t('mon3.descOptional')" />
                <!-- ★ v1.42.0 — 기본 라벨은 DB 에 한글로 있다. 입력 상자의 값을 번역으로 바꾸면
                     다른 칸만 고쳐도 영문 라벨이 저장된다. 값은 원문으로 두고 English 에서는
                     번역을 아래에 작게 보여 준다. 사용자가 지은 라벨은 그대로다. -->
                <div v-if="thresholdLabel(th.label) !== (th.label || '')" class="small text-secondary mt-1">
                  {{ thresholdLabel(th.label) }}
                </div>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-danger"
                        @click="removeThreshold(th, idx)" :title="t('mon3.remove')">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ControllerRequestsDialog
      v-if="showControllerDialog"
      @close="showControllerDialog = false"
    />
  </div>
</template>

<style scoped>
.monitoring-page { padding-bottom: 24px; }
.card-header { background: #f8f9fb; }
.route-row { }
.route-row .progress { background-color: #f1f3f5; }
</style>
