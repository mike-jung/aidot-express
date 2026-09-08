<script setup>
/**
 * AccessStatsPage — 접속 통계 화면.
 *
 *  탭 구성:
 *   1) 개요       : 전역 기간 공통 — 요약 + 타임라인
 *   2) 경로별     : 전역 기간 공통 — admin 필터 스위치 + 페이지네이션
 *   3) 사용자별   : 탭 자체 기간 — 사용자 랭킹 + 드릴다운
 *   4) 로그인/세션: 활성 세션 카드(자체 기간) + 세션 이력 카드(자체 기간)
 *
 *  페이지네이션: Pagination.vue (page 1-indexed, window=10) 사용
 *    offset = (page - 1) * perPage  로 서버에 전달
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import TraceStepsDialog from '../components/TraceStepsDialog.vue';   // ★ v1.17.0
// ★ v1.10.4 — 다국어
import { useI18n } from '../composables/useI18n';
import http, { sseUrl } from '../api/http';
import MetricChart from '../components/MetricChart.vue';
import Pagination from '../components/Pagination.vue';
import { useDuration } from '../utils/duration';   // ★ v1.19.0

/* ★ v1.17.1 — 원본 기록 한 줄에서 "이 요청 안에서 무슨 일이 있었나" 로 들어간다.
   대화상자 위에 대화상자를 띄우므로 층(z-index)은 TraceStepsDialog 안에서 정해 둔다.
   ⚠ v1.17.0 에서는 이 선언이 통째로 빠져 있었다(치환이 조용히 실패했다).
      템플릿에서는 없는 이름을 불러도 조용하고, 누를 때서야 "not a function" 이 난다. */
const stepsFor = ref(null);
function openSteps(x) {
  stepsFor.value = x?.requestId || x?.request_id || null;
}

/* ==========================================================
 *  기간 유틸
 * ========================================================== */
/* ★ v1.10.11 — computed 로 감싼다. 그냥 배열이면 t() 가 한 번만 평가되어
   언어를 바꿔도 문구가 그대로 남는다. */
const QUICK_RANGES = computed(() => ([
  /* ★ v1.15.3 — 짧은 기간을 더 촘촘히. 방금 무슨 일이 있었는지 보려면 30분·6시간이 필요하다.
     (90일은 뺐다 — 그렇게 긴 기간은 CSV·엑셀로 받아 보는 편이 낫다) */
  { label: t('access3.range30m'),  hours: 0.5 },
  { label: t('access3.rangeHour'), hours: 1 },
  { label: t('access3.range6h'),   hours: 6 },
  { label: t('access3.rangeDay'),  hours: 24 },
  { label: t('access3.range2d'),   hours: 48 },
  { label: t('access3.rangeWeek'), hours: 24 * 7 },
  { label: t('access3.rangeMonth'), hours: 24 * 30 },
]));

function nowMs() { return Date.now(); }
function fmtLocalInput(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function parseLocalInput(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}
/** 각 탭/카드별 독립 기간 객체 생성 (reactive refs 묶음) */
/* ⚠ 여기서 돌려주는 것은 **평범한 객체 안의 ref** 다. Vue 는 setup 최상위 ref 만 자동으로 벗겨 주므로
   템플릿에서는 반드시 `range.fromInput.value` 로 써야 한다. 그냥 `range.fromInput` 을 v-model 에 매면
   Ref 객체가 그대로 들어가 datetime-local 이 "[object Object]" 라며 거부한다(콘솔 오류가 계속 찍힌다). */
function makeRange(defHours = 24) {
  const to = ref(nowMs());
  const from = ref(nowMs() - defHours * 3600 * 1000);
  const fromInput = ref(fmtLocalInput(from.value));
  const toInput = ref(fmtLocalInput(to.value));
  return { from, to, fromInput, toInput };
}

/* ==========================================================
 *  상태
 * ========================================================== */
const { t } = useI18n();
const { fmtDuration, fmtInterval } = useDuration();

const loading = ref(false);
const error   = ref(null);
const tablesMissing = ref(false);
const serviceStatus = ref(null);

/* --- 전역 기간 (개요/경로별) --- */
const globalRange = makeRange(24);
/* ★ v1.15.3 — "최근 N" 으로 고른 기간은 **시간이 흐르면 같이 흘러야 한다.**
   예전에는 화면을 연 순간의 끝시각(toMs)이 그대로 굳어 있어서,
   그 뒤에 들어온 요청은 조회 창 밖이었다. SSE 신호를 받아 다시 읽어도 숫자가 그대로였던 이유다.
   (사용자가 시작·종료를 직접 넣은 경우에는 null 로 두어 그 구간을 그대로 지킨다) */
const globalQuickHours = ref(24);

/* --- 개요 --- */
const overview = ref(null);
const timeline = ref([]);
const timelineBucket = ref('hour');
/** 서버가 준 '21_50' 을 사람이 읽는 '21:50' 으로 */
/** 서버가 준 '2026-08-29 21_50' → 화면용 '08-29 21:50' (연도는 자리만 차지한다) */
const prettyBucket = (b) => String(b || '').replace('_', ':').replace(/^\d{4}-/, '');

/* --- 경로별 --- */
const pathRows = ref([]);
const pathTotal = ref(0);
const pathPage = ref(1);
const pathPerPage = ref(50);
const pathExcludeAdmin = ref(true);
const pathTotalPages = computed(() => Math.max(1, Math.ceil(pathTotal.value / pathPerPage.value)));

/* --- 사용자별 (자체 기간) --- */
const userRange = makeRange(24 * 7);  // 기본 7일
const userRows = ref([]);
const userTotal = ref(0);
const userPage = ref(1);
const userPerPage = ref(50);
const userTotalPages = computed(() => Math.max(1, Math.ceil(userTotal.value / userPerPage.value)));
const selectedUser = ref(null);

/* ★ v1.15.0 — 행을 눌러 **원본 기록**을 보는 대화상자.
   집계만 보면 "왜 느렸지 · 누가 불렀지" 를 알 수 없다. 그 줄에 해당하는 실제 요청을 그대로 보여 준다. */
const detail = reactive({ open: false, title: '', filter: null, rows: [], loading: false });
async function openDetail(title, filter) {
  Object.assign(detail, { open: true, title, filter, rows: [], loading: true });
  try {
    const r = await http.get('/api/admin/access/logs', {
      params: {
        fromMs: globalRange.from.value, toMs: globalRange.to.value,
        path: filter.path || undefined, username: filter.username || undefined,
        limit: 50,
      },
    });
    let rows = r.data?.data?.rows || r.data?.data || [];
    // 컨트롤러로 연 경우엔 그 컨트롤러의 것만 남긴다 (원본 조회는 경로·사용자만 거른다)
    if (filter.controller) rows = rows.filter((x) => (x.controller || '') === filter.controller);
    detail.rows = rows;
  } catch (e) { error.value = e?.response?.data?.message || e.message; }
  finally { detail.loading = false; }
}
const userPaths = ref([]);

/* --- 로그인/세션 --- */
const loginStatsRange = makeRange(24 * 7);  // 로그인 통계 + 체류시간 — 7일
const loginByUser = ref([]);
const sessionByUser = ref([]);

/* 활성 세션 카드 (자체 기간) */
const activeRange = makeRange(24 * 7);
const activeRows = ref([]);
const activeTotal = ref(0);
const activePage = ref(1);
const activePerPage = ref(20);
const activeTotalPages = computed(() => Math.max(1, Math.ceil(activeTotal.value / activePerPage.value)));

/* 세션 이력 카드 (자체 기간) */
const historyRange = makeRange(24);
const historyRows = ref([]);
const historyTotal = ref(0);
const historyPage = ref(1);
const historyPerPage = ref(50);
const historyTotalPages = computed(() => Math.max(1, Math.ceil(historyTotal.value / historyPerPage.value)));
const historyUsernameFilter = ref('');

/* --- 강제 종료 진행 중 id --- */
const forceEndingId = ref(null);

/* --- 실시간 갱신 ---------------------------------------------------------
 *  기본은 SSE: 서버가 **접속 기록이 실제로 저장됐을 때만** 알려 주고,
 *              화면은 그 신호를 받았을 때만 현재 탭을 다시 읽는다.
 *              → 아무도 접속하지 않는 동안에는 집계 쿼리가 한 건도 돌지 않는다.
 *  SSE 연결이 안 되면 예전 방식(주기적 폴링)으로 자동 전환한다.
 * ------------------------------------------------------------------------ */
const liveEnabled = ref(true);       // 기본 ON
const liveIntervalMs = ref(10_000);  // 폴링으로 물러섰을 때의 주기
const liveMode = ref('off');         // 'sse' | 'poll' | 'off'
const sseFailures = ref(0);
const MAX_SSE_FAILURES = 2;
const MIN_RELOAD_GAP_MS = 1_200;     // 신호가 몰려 와도 이 간격 안에서는 한 번만 다시 읽는다

let livePollTimer = null;
let accessEs = null;
let sseRetryTimer = null;
let lastReloadAt = 0;
let pendingReloadTimer = null;

/** 신호를 받았을 때의 새로고침 — 과하게 몰리지 않도록 최소 간격을 둔다 */
/* ★ v1.16.4 — 탭이 안 보이면 갱신하지 않는다.
   다른 탭을 보고 있는 동안에도 신호마다 집계 쿼리를 돌리면 DB 만 축낸다.
   다시 보이면 그때 한 번 읽어 최신으로 맞춘다. */
function onVisibility() {
  if (document.hidden) return;
  reloadThrottled();
}

function reloadThrottled() {
  const wait = Math.max(0, MIN_RELOAD_GAP_MS - (Date.now() - lastReloadAt));
  if (pendingReloadTimer) return;
  if (document.hidden) return;          // 안 보이는 화면은 읽지 않는다
  pendingReloadTimer = setTimeout(() => {
    pendingReloadTimer = null;
    lastReloadAt = Date.now();
    reloadCurrentTab();
    loadStatus();
  }, wait);
}

function startLive() {
  stopLive();
  if (!liveEnabled.value) { liveMode.value = 'off'; return; }
  if (sseFailures.value < MAX_SSE_FAILURES) void startAccessStream();
  else startLivePolling();
}

function stopLive() {
  stopLivePolling();
  stopAccessStream();
  if (pendingReloadTimer) { clearTimeout(pendingReloadTimer); pendingReloadTimer = null; }
  liveMode.value = 'off';
}

async function startAccessStream() {
  stopAccessStream();
  let url;
  try {
    url = await sseUrl('/api/admin/access/stream');   // 1회용 티켓 포함
    if (!liveEnabled.value) return;
    accessEs = new EventSource(url);
  } catch {
    startLivePolling();
    return;
  }
  accessEs.onopen = () => { liveMode.value = 'sse'; sseFailures.value = 0; };
  accessEs.addEventListener('access-changed', () => reloadThrottled());
  accessEs.onerror = () => {
    stopAccessStream();
    sseFailures.value += 1;
    if (sseFailures.value >= MAX_SSE_FAILURES) { startLivePolling(); return; }
    sseRetryTimer = setTimeout(() => { if (liveEnabled.value) void startAccessStream(); }, 2000);
  };
}

function stopAccessStream() {
  if (sseRetryTimer) { clearTimeout(sseRetryTimer); sseRetryTimer = null; }
  if (accessEs) { accessEs.close(); accessEs = null; }
}

function startLivePolling() {
  stopLivePolling();
  if (!liveEnabled.value) return;
  liveMode.value = 'poll';
  livePollTimer = setInterval(() => { reloadCurrentTab(); }, liveIntervalMs.value);
}
function stopLivePolling() {
  if (livePollTimer) { clearInterval(livePollTimer); livePollTimer = null; }
}

/** 사용자가 [SSE 다시 시도] 를 누르면 실시간 방식으로 복귀 */
function retryAccessStream() {
  sseFailures.value = 0;
  startLive();
}

/* ==========================================================
 *  탭
 * ========================================================== */
/* ★ v1.10.11 — computed 로 감싼다. 그냥 배열이면 t() 가 한 번만 평가되어
   언어를 바꿔도 문구가 그대로 남는다. */
const TABS = computed(() => ([
  { id: 'overview',  label: t('access3.tabOverview'),        icon: 'bi-speedometer' },
  { id: 'by-controller', label: t('access3.tabByController'), icon: 'bi-diagram-3' },
  { id: 'by-path',   label: t('access3.tabByPath'),      icon: 'bi-signpost-2' },
  { id: 'by-user',   label: t('access3.tabByUser'),    icon: 'bi-people' },
  { id: 'sessions',  label: t('access3.tabLoginSession'), icon: 'bi-key' },
]));
const activeTab = ref('overview');
function setTab(id) { activeTab.value = id; reloadCurrentTab(); }

/* ==========================================================
 *  데이터 로드
 * ========================================================== */
function handleTablesMissing(d) {
  if (d && d.tablesMissing) tablesMissing.value = true;
  else tablesMissing.value = false;
}

async function loadStatus() {
  try {
    const r = await http.get('/api/admin/access/status');
    serviceStatus.value = r.data?.data || null;
    if (serviceStatus.value?.tablesMissing) tablesMissing.value = true;
  } catch { /* 무시 */ }
}

async function loadOverview() {
  loading.value = true;
  error.value = null;
  try {
    const params = { fromMs: globalRange.from.value, toMs: globalRange.to.value };
    const [o, t] = await Promise.all([
      http.get('/api/admin/access/overview', { params }),
      http.get('/api/admin/access/timeline', { params: { ...params, bucket: timelineBucket.value } }),
    ]);
    overview.value = o.data?.data || null;
    const rawTl = t.data?.data?.rows || [];
    // 서버는 데이터가 있는 버킷만 반환 → 빈 버킷을 0 으로 채워 연속된 타임라인 생성.
    // 그래야 차트의 polyline 이 제대로 그려진다 (점 1개만으론 선이 안 그려짐).
    timeline.value = fillEmptyBuckets(rawTl, timelineBucket.value,
      globalRange.from.value, globalRange.to.value);
    handleTablesMissing(o.data?.data || t.data?.data);
  } catch (e) { error.value = e.response?.data?.message || e.message; }
  finally { loading.value = false; }
}

/** 서버가 반환한 bucket 행들에 빈 버킷을 0-fill 로 채움.
 *  bucket = 'hour' → YYYY-MM-DD HH:00 형식, 시간 단위로 증가
 *  bucket = 'day'  → YYYY-MM-DD       형식, 일 단위로 증가
 *  차트는 이 연속된 배열로 polyline 을 그려야 선이 보인다.
 */
function fillEmptyBuckets(rows, bucket, fromMs, toMs) {
  const map = new Map(rows.map(r => [r.bucket, r]));
  const out = [];
  const pad2 = (n) => String(n).padStart(2, '0');
  if (bucket === 'day') {
    // 일 단위 루프 — 로컬 시간 기준 자정
    const start = new Date(fromMs);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toMs);
    end.setHours(0, 0, 0, 0);
    const safety = 366 * 3;  // 3년 한도
    let cur = new Date(start);
    let guard = 0;
    while (cur.getTime() <= end.getTime() && guard < safety) {
      const key = `${cur.getFullYear()}-${pad2(cur.getMonth()+1)}-${pad2(cur.getDate())}`;
      const existing = map.get(key);
      out.push(existing || { bucket: key, count: 0, err_count: 0, distinct_users: 0 });
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
  } else if (bucket === '10min' || bucket === '30min') {
    /* ★ v1.15.0 — 분 단위 루프. 지금 시각이 속한 칸까지 만들어야
       "방금 보낸 요청" 이 화면에 보인다(예전에는 정시가 지나야 보였다). */
    const step = bucket === '10min' ? 10 : 30;
    const start = new Date(fromMs);
    start.setMinutes(Math.floor(start.getMinutes() / step) * step, 0, 0);
    const end = new Date(toMs);
    end.setMinutes(Math.floor(end.getMinutes() / step) * step, 0, 0);
    let cur = new Date(start);
    let guard = 0;
    while (cur.getTime() <= end.getTime() && guard < 2000) {
      /* 서버는 '2026-08-29 21_50' 형태로 준다 (DATE_FORMAT 의 %i 를 못 쓰는 사정 — SQL 주석 참고) */
      const key = `${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}-${pad2(cur.getDate())} `
        + `${pad2(cur.getHours())}_${pad2(cur.getMinutes())}`;
      out.push(map.get(key) || { bucket: key, count: 0, err_count: 0, distinct_users: 0 });
      cur = new Date(cur.getTime() + step * 60_000);
      guard++;
    }
  } else {
    // 시간 단위 루프
    const start = new Date(fromMs);
    start.setMinutes(0, 0, 0);
    const end = new Date(toMs);
    end.setMinutes(0, 0, 0);
    const safety = 24 * 90;  // 90일치 시간 한도
    let cur = new Date(start);
    let guard = 0;
    while (cur.getTime() <= end.getTime() && guard < safety) {
      const key = `${cur.getFullYear()}-${pad2(cur.getMonth()+1)}-${pad2(cur.getDate())} ${pad2(cur.getHours())}:00`;
      const existing = map.get(key);
      out.push(existing || { bucket: key, count: 0, err_count: 0, distinct_users: 0 });
      cur.setHours(cur.getHours() + 1);
      guard++;
    }
  }
  return out;
}

async function loadByPath() {
  loading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/access/summary/by-path', {
      params: {
        fromMs: globalRange.from.value,
        toMs: globalRange.to.value,
        limit: pathPerPage.value,
        offset: (pathPage.value - 1) * pathPerPage.value,
        excludeAdmin: pathExcludeAdmin.value ? '1' : '0',
      },
    });
    pathRows.value = r.data?.data?.rows || [];
    pathTotal.value = Number(r.data?.data?.total || 0);
    handleTablesMissing(r.data?.data);
  } catch (e) { error.value = e.response?.data?.message || e.message; }
  finally { loading.value = false; }
}

async function loadByUser() {
  loading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/access/summary/by-user', {
      params: {
        fromMs: userRange.from.value,
        toMs: userRange.to.value,
        limit: userPerPage.value,
        offset: (userPage.value - 1) * userPerPage.value,
      },
    });
    userRows.value = r.data?.data?.rows || [];
    userTotal.value = Number(r.data?.data?.total || 0);
    handleTablesMissing(r.data?.data);
  } catch (e) { error.value = e.response?.data?.message || e.message; }
  finally { loading.value = false; }
}

async function loadUserPaths(username) {
  if (!username) { userPaths.value = []; return; }
  try {
    const r = await http.get(`/api/admin/access/users/${encodeURIComponent(username)}/paths`, {
      params: { fromMs: userRange.from.value, toMs: userRange.to.value, limit: 200,
        excludeAdmin: userPathsIncludeSystem.value ? 'false' : 'true' },
    });
    userPaths.value = r.data?.data?.rows || [];
  } catch (e) { error.value = e.response?.data?.message || e.message; }
}
/* ★ v1.15.1 — 로그인 같은 시스템 요청은 기본으로 접어 둔다.
   지우지는 않는다 — 감사 관점에서 로그인도 그 사람의 행적이고, 필요하면 펴서 본다. */
const userPathsIncludeSystem = ref(false);
function selectUser(username) { selectedUser.value = username; loadUserPaths(username); }
watch(userPathsIncludeSystem, () => { if (selectedUser.value) loadUserPaths(selectedUser.value); });

async function loadLoginStats() {
  try {
    const r = await http.get('/api/admin/access/login-stats', {
      params: {
        fromMs: loginStatsRange.from.value,
        toMs: loginStatsRange.to.value,
        limit: 200,
      },
    });
    loginByUser.value   = r.data?.data?.loginByUser   || [];
    sessionByUser.value = r.data?.data?.sessionByUser || [];
    handleTablesMissing(r.data?.data);
  } catch (e) { error.value = e.response?.data?.message || e.message; }
}

async function loadActiveSessions() {
  try {
    const r = await http.get('/api/admin/access/sessions/active', {
      params: {
        fromMs: activeRange.from.value,
        toMs: activeRange.to.value,
        limit: activePerPage.value,
        offset: (activePage.value - 1) * activePerPage.value,
      },
    });
    activeRows.value = r.data?.data?.rows || [];
    activeTotal.value = Number(r.data?.data?.total || 0);
    handleTablesMissing(r.data?.data);
  } catch (e) { error.value = e.response?.data?.message || e.message; }
}

async function loadHistorySessions() {
  try {
    const r = await http.get('/api/admin/access/sessions', {
      params: {
        fromMs: historyRange.from.value,
        toMs: historyRange.to.value,
        limit: historyPerPage.value,
        offset: (historyPage.value - 1) * historyPerPage.value,
        username: historyUsernameFilter.value || undefined,
      },
    });
    historyRows.value = r.data?.data?.rows || [];
    historyTotal.value = Number(r.data?.data?.total || 0);
    handleTablesMissing(r.data?.data);
  } catch (e) { error.value = e.response?.data?.message || e.message; }
}

async function loadSessionsTab() {
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([loadLoginStats(), loadActiveSessions(), loadHistorySessions()]);
  } finally { loading.value = false; }
}

function reloadCurrentTab() {
  slideGlobalRange();
  switch (activeTab.value) {
    case 'overview':  loadOverview(); break;
    case 'by-controller': loadByController(); break;
    case 'by-path':   loadByPath(); break;
    case 'by-user':   loadByUser(); if (selectedUser.value) loadUserPaths(selectedUser.value); break;
    case 'sessions':  loadSessionsTab(); break;
  }
}

/* ==========================================================
 *  기간 변경 헬퍼
 * ========================================================== */
/** "최근 N" 구간이면 지금 시각까지로 창을 밀어 준다 */
function slideGlobalRange() {
  const h = globalQuickHours.value;
  if (!h) return;                       // 직접 넣은 구간은 건드리지 않는다
  globalRange.to.value   = nowMs();
  globalRange.from.value = globalRange.to.value - h * 3600 * 1000;
  globalRange.fromInput.value = fmtLocalInput(globalRange.from.value);
  globalRange.toInput.value   = fmtLocalInput(globalRange.to.value);
}

function applyQuickGlobal(hours) {
  globalQuickHours.value = hours;
  globalRange.to.value   = nowMs();
  globalRange.from.value = globalRange.to.value - hours * 3600 * 1000;
  /* ★ v1.15.0 — 기간에 맞는 칸 크기를 자동으로 고른다.
     최근 1시간을 시간 단위로 보면 막대가 한두 개뿐이라 아무것도 읽히지 않는다. */
  timelineBucket.value = hours <= 1 ? '10min' : (hours <= 6 ? '30min' : (hours <= 72 ? 'hour' : 'day'));
  globalRange.fromInput.value = fmtLocalInput(globalRange.from.value);
  globalRange.toInput.value   = fmtLocalInput(globalRange.to.value);
  pathPage.value = 1;
  reloadCurrentTab();
}
function applyCustomGlobal() {
  globalQuickHours.value = null;        // 직접 넣은 구간은 흐르지 않는다
  const f = parseLocalInput(globalRange.fromInput.value);
  const t = parseLocalInput(globalRange.toInput.value);
  if (f && t && f < t) {
    globalRange.from.value = f; globalRange.to.value = t;
    pathPage.value = 1;
    reloadCurrentTab();
  }
}

/* ⚠ 템플릿에서 ref 를 인자로 넘기면 Vue 가 **값으로 풀어서** 전달한다(숫자 1).
   그래서 예전 코드의 pageRef.value = 1 이 "Cannot create property 'value' on number" 로 터졌다.
   페이지 초기화는 화면이 아니라 **여기 스크립트 안에서** 처리한다. */
function applyQuickRange(r, hours, pageRef, loader) {
  r.to.value   = nowMs();
  r.from.value = r.to.value - hours * 3600 * 1000;
  r.fromInput.value = fmtLocalInput(r.from.value);
  r.toInput.value   = fmtLocalInput(r.to.value);
  if (pageRef && typeof pageRef === 'object' && 'value' in pageRef) pageRef.value = 1;
  loader();
}

/* 탭마다 기간 버튼이 부르는 것 — ref 를 템플릿으로 내보내지 않으려고 여기서 감싼다 */
function quickUser(hours)    { userPage.value = 1;    applyQuickRange(userRange, hours, null, loadByUser); }
function quickLoginStats(h)  { applyQuickRange(loginStatsRange, h, null, loadLoginStats); }
function quickActive(hours)  { activePage.value = 1;  applyQuickRange(activeRange, hours, null, loadActiveSessions); }
function quickHistory(hours) { historyPage.value = 1; applyQuickRange(historyRange, hours, null, loadHistorySessions); }
function customUser()    { userPage.value = 1;    applyCustomRange(userRange, null, loadByUser); }
function customActive()  { activePage.value = 1;  applyCustomRange(activeRange, null, loadActiveSessions); }
function customHistory() { historyPage.value = 1; applyCustomRange(historyRange, null, loadHistorySessions); }

function applyCustomRange(r, pageRef, loader) {
  const f = parseLocalInput(r.fromInput.value);
  const t = parseLocalInput(r.toInput.value);
  if (f && t && f < t) {
    r.from.value = f; r.to.value = t;
    if (pageRef) pageRef.value = 1;
    loader();
  }
}

/* 페이지/옵션 변경 시 리로드 */
watch([pathPage, pathPerPage], () => { if (activeTab.value === 'by-path') loadByPath(); });
watch(pathExcludeAdmin, () => { pathPage.value = 1; if (activeTab.value === 'by-path') loadByPath(); });
watch([userPage, userPerPage], () => { if (activeTab.value === 'by-user') loadByUser(); });
watch([activePage, activePerPage], () => { if (activeTab.value === 'sessions') loadActiveSessions(); });
watch([historyPage, historyPerPage], () => { if (activeTab.value === 'sessions') loadHistorySessions(); });
watch(timelineBucket, () => { if (activeTab.value === 'overview') loadOverview(); });
watch(liveEnabled, (on) => { if (on) startLive(); else stopLive(); });
watch(liveIntervalMs, () => { if (liveMode.value === 'poll') startLivePolling(); });

onMounted(() => {
  loadStatus(); reloadCurrentTab(); startLive();
  document.addEventListener('visibilitychange', onVisibility);   // ★ v1.16.4
});
onBeforeUnmount(() => {
  stopLive();
  document.removeEventListener('visibilitychange', onVisibility);
});

/* ★ v1.13.0 — 컨트롤러별 접속 통계.
     "어떤 기능을 얼마나 썼나" 는 경로(method+path)보다 컨트롤러 단위가 읽기 쉽다.
     사용자 한 명만 보려면 아래 입력칸에 아이디를 적는다. */
const ctrlRows = ref([]);
const ctrlLoading = ref(false);
const ctrlUser = ref('');
const ctrlExcludeAdmin = ref(true);
async function loadByController() {
  ctrlLoading.value = true;
  try {
    const r = await http.get('/api/admin/access/summary/by-controller', {
      params: {
        fromMs: globalRange.from.value, toMs: globalRange.to.value,
        limit: 200, username: ctrlUser.value.trim() || undefined,
        excludeAdmin: ctrlExcludeAdmin.value ? 'true' : 'false',
      },
    });
    ctrlRows.value = r.data?.data?.rows || [];
  } catch (e) { error.value = e.response?.data?.message || e.message; }
  finally { ctrlLoading.value = false; }
}
watch([ctrlUser, ctrlExcludeAdmin], () => { if (activeTab.value === 'by-controller') loadByController(); });

/* ==========================================================
 *  CSV 다운로드
 * ========================================================== */
/** ★ v1.13.0 — 엑셀(.xlsx) 로 받기. CSV 는 엑셀에서 한글이 깨지거나 긴 숫자가 지수로 바뀐다 */
function downloadXlsx(kind, extra = {}) { return downloadCsv(kind, { ...extra, format: 'xlsx' }); }

async function downloadCsv(kind, extra = {}) {
  try {
    // kind 에 따라 어떤 range 를 쓸지 결정
    let range = globalRange;
    if (kind === 'byUser')     range = userRange;
    if (kind === 'loginStats') range = loginStatsRange;
    if (kind === 'sessions')   range = historyRange;
    const params = { fromMs: range.from.value, toMs: range.to.value, ...extra };
    const res = await http.get(`/api/admin/access/export/${kind}`, { params, responseType: 'blob' });
    const xlsx = extra.format === 'xlsx';
    const blob = new Blob([res.data], { type: xlsx
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `access-${kind}-${stamp}.${xlsx ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) { error.value = e.response?.data?.message || e.message; }
}

/* ==========================================================
 *  세션 강제 종료
 * ========================================================== */
async function confirmForceEndSession(s) {
  const ok = window.confirm(
    t('access3.forceEndConfirm', {
      user: s.username, kind: s.session_kind, started: s.started_at, ip: s.ip || '-',
    })
  );
  if (!ok) return;
  forceEndingId.value = s.id;
  try {
    await http.post(`/api/admin/access/sessions/${s.id}/force-end`);
    await Promise.all([loadActiveSessions(), loadHistorySessions(), loadLoginStats()]);
  } catch (e) { error.value = e.response?.data?.message || e.message; }
  finally { forceEndingId.value = null; }
}

/* ==========================================================
 *  포맷 유틸
 * ========================================================== */
function fmtNum(v, d = 0) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1000) return n.toLocaleString();
  return n.toFixed(d);
}
function fmtMs(v) { return fmtNum(v, 0) + ' ms'; }
/* ★ v1.19.0 — 시간 표기는 공통 모듈로 (한글이 박혀 있어 영어로 안 바뀌었다) */

/* 타임라인 차트 시리즈 */
const timelineCount = computed(() => timeline.value.map((r) => Number(r.count) || 0));
const timelineErr   = computed(() => timeline.value.map((r) => Number(r.err_count) || 0));
/* ★ v1.15.1 — 막대 하나는 **그 칸이 시작된 시각**을 뜻한다.
   07:12 요청은 '07:00' 칸(=07:00~08:00 구간)에 들어가고, 그 칸은 08:00 이 될 때까지 계속 채워진다.
   오른쪽 끝이 08:00 으로 보이지 않는 것은 그 때문이다 — 헷갈리기 쉬워 아래에 한 줄로 적는다. */
const lastBucketNote = computed(() => {
  const n = timeline.value.length;
  if (!n) return '';
  const b = prettyBucket(timeline.value[n - 1].bucket);
  const step = { '10min': 10, '30min': 30, hour: 60, day: 1440 }[timelineBucket.value] || 60;
  const hm = b.slice(-5);
  const [hh, mm] = hm.includes(':') ? hm.split(':').map(Number) : [Number(hm), 0];
  const end = new Date(2000, 0, 1, hh, mm + step);
  const pad = (x) => String(x).padStart(2, '0');
  const endLabel = timelineBucket.value === 'day' ? '' : `~${pad(end.getHours())}:${pad(end.getMinutes())}`;
  return t('access3.lastBucketNote', { from: hm, to: endLabel.replace('~', '') });
});

const timelineLabels = computed(() => {
  if (!timeline.value.length) return ['', '', ''];
  const n = timeline.value.length;
  return [timeline.value[0].bucket, timeline.value[Math.floor(n / 2)].bucket, timeline.value[n - 1].bucket]
    .map(prettyBucket);
});
</script>

<template>
  <div class="access-stats-page">
    <!-- 공통 헤더 (전역 기간 + 상태 뱃지) -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex align-items-center flex-wrap gap-2">
          <h5 class="mb-0 me-3">
            <i class="bi bi-graph-up-arrow text-primary me-2"></i>{{ t('access.title') }}
          </h5>
          <span v-if="serviceStatus" class="d-flex align-items-center gap-1 me-2">
            <span class="badge" :class="serviceStatus.tablesMissing ? 'bg-warning text-dark' : 'bg-success'">
              <i class="bi" :class="serviceStatus.tablesMissing ? 'bi-exclamation-triangle' : 'bi-check-circle'"></i>
              {{ serviceStatus.tablesMissing ? t('access3.statusTablesMissing') : t('access3.statusOk') }}
            </span>
            <span class="badge bg-light text-dark">{{ t('access3.queue', { n: serviceStatus.queueLength }) }}</span>
            <span class="badge bg-light text-dark">{{ t('access3.retention', { n: serviceStatus.retentionDays }) }}</span>
          </span>
          <div class="vr mx-2"></div>
          <small class="text-secondary">
            <i class="bi bi-info-circle me-1"></i>
            {{ t('access3.rangeNoteFull') }}
          </small>
          <div class="w-100"></div>

          <button v-for="q in QUICK_RANGES" :key="q.hours"
                  class="btn btn-sm btn-outline-secondary"
                  @click="applyQuickGlobal(q.hours)">{{ q.label }}</button>
          <div class="vr mx-2"></div>
          <label class="small text-secondary mb-0">{{ t('access.from') }}</label>
          <input type="datetime-local" class="form-control form-control-sm" style="width:170px" v-model="globalRange.fromInput.value" />
          <label class="small text-secondary mb-0 ms-2">{{ t('access.to') }}</label>
          <input type="datetime-local" class="form-control form-control-sm" style="width:170px" v-model="globalRange.toInput.value" />
          <button class="btn btn-sm btn-primary" @click="applyCustomGlobal">{{ t('common.apply') }}</button>
          <div class="ms-auto d-flex align-items-center gap-2">
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" id="accessLiveSwitch" v-model="liveEnabled" />
              <label class="form-check-label small" for="accessLiveSwitch">
                {{ t('access2.live') }}
                <span class="badge ms-1" :class="liveEnabled ? 'bg-success' : 'bg-secondary'">
                  {{ liveEnabled ? 'ON' : 'OFF' }}
                </span>
              </label>
              <!-- 수신 방식: SSE(변경될 때만 갱신) / 폴링(주기적 갱신) -->
              <span v-if="liveEnabled" class="badge ms-1"
                    :class="liveMode === 'sse' ? 'bg-primary' : 'bg-warning text-dark'"
                    :title="liveMode === 'sse'
                      ? t('access3.sseQuiet')
                      : t('access3.sseFellBack')">
                {{ liveMode === 'sse' ? t('access3.modeSse') : t('access3.modePoll') }}
              </span>
              <button v-if="liveEnabled && liveMode === 'poll'"
                      class="btn btn-sm btn-link p-0 ms-1 small" @click="retryAccessStream">{{ t('monitoring.sseRetry') }}</button>
            </div>
            <!-- ★ v1.15.0 — 예전에는 SSE 일 때 이 칸이 잠겨 있어 "고장 났다" 로 보였다.
                 이제 언제나 고를 수 있고, SSE 중에는 "폴링으로 물러섰을 때 쓰는 값" 이라고 옆에 적는다. -->
            <select v-model.number="liveIntervalMs" class="form-select form-select-sm" style="width:100px"
                    :disabled="!liveEnabled"
                    :title="liveMode === 'sse' ? t('access3.ssePushNoInterval') : t('access3.pollInterval')">
              <option :value="5000">{{ t('access3.sec', { n: 5 }) }}</option>
              <option :value="10000">{{ t('access3.sec', { n: 10 }) }}</option>
              <option :value="30000">{{ t('access3.sec', { n: 30 }) }}</option>
              <option :value="60000">{{ t('access3.min', { n: 1 }) }}</option>
            </select>
            <span v-if="liveEnabled && liveMode === 'sse'" class="small text-secondary">{{ t('access3.sseNoIntervalHint') }}</span>
            <button class="btn btn-sm btn-outline-secondary" @click="reloadCurrentTab" :disabled="loading">
              <i class="bi bi-arrow-clockwise"></i> {{ t('access2.reload') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 탭 -->
    <ul class="nav nav-tabs mb-3">
      <li class="nav-item" v-for="t in TABS" :key="t.id">
        <a class="nav-link" :class="{ active: activeTab === t.id }" href="#" @click.prevent="setTab(t.id)">
          <i class="bi" :class="t.icon"></i> {{ t.label }}
        </a>
      </li>
    </ul>

    <div v-if="tablesMissing" class="alert alert-warning small">
      <i class="bi bi-exclamation-triangle me-1"></i>
      {{ t('access.noTable') }} <code>006_init_access_stats.sql</code> {{ t('access2.retryAfterMigration') }}
    </div>
    <div v-if="error" class="alert alert-danger small">{{ error }}</div>

    <!-- ========== 1) 개요 ========== -->
    <div v-if="activeTab === 'overview'">
      <div v-if="overview && overview.totalRequests > 0 && overview.distinctUsers === 0"
           class="alert alert-info small mb-3">
        <i class="bi bi-info-circle me-1"></i>
        {{ t('access.recordedButNoUser') }} <strong>{{ t('access.recordedButNoUser') }}</strong>.
        {{ t('access3.user') }} 식별을 위해 로그인 토큰에 username 이 포함되어야 하며, 기존 로그인이 있다면 <strong>{{ t('access2.signInAgain') }}</strong> {{ t('access.reloginHint') }}
      </div>

      <div class="row g-3 mb-3" v-if="overview">
        <div class="col-6 col-md-3">
          <div class="card h-100"><div class="card-body py-2 px-3">
            <div class="small text-secondary">{{ t('access.totalRequests') }}</div>
            <div class="h4 mb-0 text-primary">{{ fmtNum(overview.totalRequests) }}</div>
          </div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card h-100"><div class="card-body py-2 px-3">
            <div class="small text-secondary">{{ t('access.errorResponses') }}</div>
            <div class="h4 mb-0" :class="overview.errorRequests > 0 ? 'text-danger' : 'text-success'">
              {{ fmtNum(overview.errorRequests) }}
            </div>
          </div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card h-100"><div class="card-body py-2 px-3">
            <div class="small text-secondary">{{ t('access.uniqueUsers') }}</div>
            <div class="h4 mb-0 text-info">{{ fmtNum(overview.distinctUsers) }}</div>
          </div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card h-100"><div class="card-body py-2 px-3">
            <div class="small text-secondary">{{ t('access.uniquePaths') }}</div>
            <div class="h4 mb-0">{{ fmtNum(overview.distinctPaths) }}</div>
          </div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header d-flex align-items-center">
          <span><i class="bi bi-calendar3 me-2"></i>{{ t('access.hourly') }}</span>
          <div class="ms-auto d-flex gap-2 align-items-center">
            <label class="small text-secondary mb-0">{{ t('access2.bucket') }}</label>
            <select v-model="timelineBucket" class="form-select form-select-sm" style="width:90px">
              <option value="10min">{{ t('access3.b10min') }}</option>
              <option value="30min">{{ t('access3.b30min') }}</option>
              <option value="hour">{{ t('access3.hour') }}</option>
              <option value="day">{{ t('access3.day') }}</option>
            </select>
            <button class="btn btn-sm btn-outline-primary" @click="downloadCsv('timeline')">
              <i class="bi bi-download me-1"></i>CSV
            </button>
          </div>
        </div>
        <div class="card-body">
          <div v-if="timeline.length" class="small text-secondary mb-1">{{ lastBucketNote }}</div>
          <MetricChart v-if="timeline.length"
            :title="t('access3.hourlyChart')"
            :point-labels="timeline.map((r) => prettyBucket(r.bucket))"
            :series-a="timelineCount" :label-a="t('access3.legendReq')" color-a="#0d6efd"
            :series-b="timelineErr"   :label-b="t('access3.legendErr')"   color-b="#dc3545"
            :time-labels="timelineLabels" dual-axis />
          <div v-else class="text-secondary small text-center py-4">{{ t('access.noDataInRange') }}</div>
        </div>
      </div>
    </div>

    <!-- ========== 2) 경로별 ========== -->
    <!-- ★ v1.13.0 컨트롤러별 -->
    <div v-if="activeTab === 'by-controller'">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span><i class="bi bi-diagram-3 me-2"></i>{{ t('access3.tabByController') }}</span>
          <div class="d-flex align-items-center gap-2">
            <div class="input-group input-group-sm" style="width:220px">
              <span class="input-group-text"><i class="bi bi-person"></i></span>
              <input v-model="ctrlUser" type="text" class="form-control" :placeholder="t('access3.userFilter')" />
            </div>
            <div class="form-check form-switch mb-0">
              <input id="ctrlExAdmin" v-model="ctrlExcludeAdmin" class="form-check-input" type="checkbox" />
              <label class="form-check-label small" for="ctrlExAdmin">{{ t('access3.excludeAdmin') }}</label>
            </div>
            <button class="btn btn-sm btn-outline-secondary" @click="downloadCsv('byController', { username: ctrlUser.trim() || undefined, excludeAdmin: ctrlExcludeAdmin ? 'true' : 'false' })">CSV</button>
            <button class="btn btn-sm btn-outline-success" @click="downloadXlsx('byController', { username: ctrlUser.trim() || undefined, excludeAdmin: ctrlExcludeAdmin ? 'true' : 'false' })">
              <i class="bi bi-file-earmark-excel me-1"></i>{{ t('access3.excel') }}
            </button>
          </div>
        </div>
        <div class="card-body p-0">
          <div v-if="ctrlLoading" class="text-secondary small p-3"><span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}</div>
          <table v-else class="table table-sm table-hover mb-0">
            <thead><tr>
              <th>{{ t('access3.colController') }}</th><th class="text-end">{{ t('access3.colCount') }}</th>
              <th class="text-end">{{ t('access3.colRoutes') }}</th><th class="text-end">{{ t('access3.colUsers') }}</th>
              <th class="text-end">4xx</th><th class="text-end">5xx</th>
              <th class="text-end">{{ t('access3.colAvgMs') }}</th><th class="text-end">{{ t('access3.colMaxMs') }}</th>
              <th>{{ t('access3.colLast') }}</th>
            </tr></thead>
            <tbody>
              <tr v-if="!ctrlRows.length"><td colspan="9" class="text-center text-secondary py-4">{{ t('access3.noData') }}</td></tr>
              <tr v-for="r in ctrlRows" :key="r.controller">
                <td>
                  <button class="btn btn-sm btn-link p-0 me-1" :title="t('access3.rowDetail')"
                          @click="openDetail(r.controller, { controller: r.controller })">
                    <i class="bi bi-search"></i>
                  </button>
                  <code>{{ r.controller }}</code>
                </td>
                <td class="text-end fw-semibold">{{ Number(r.count).toLocaleString() }}</td>
                <td class="text-end">{{ r.distinctRoutes ?? r.distinct_routes }}</td>
                <td class="text-end">{{ r.distinctUsers ?? r.distinct_users }}</td>
                <td class="text-end" :class="{ 'text-warning': (r.failCount ?? r.fail_count) > 0 }">{{ r.failCount ?? r.fail_count ?? 0 }}</td>
                <td class="text-end" :class="{ 'text-danger': (r.errCount ?? r.err_count) > 0 }">{{ r.errCount ?? r.err_count ?? 0 }}</td>
                <td class="text-end">{{ Math.round(r.avgMs ?? r.avg_ms ?? 0) }}</td>
                <td class="text-end">{{ Math.round(r.maxMs ?? r.max_ms ?? 0) }}</td>
                <td class="small text-secondary">{{ String(r.lastTs ?? r.last_ts ?? '').replace('T', ' ').slice(0, 19) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'by-path'">
      <div class="card">
        <div class="card-header d-flex align-items-center flex-wrap gap-2">
          <span><i class="bi bi-signpost-2 me-2"></i>{{ t('access.byPath') }}</span>
          <div class="form-check form-switch ms-3 mb-0">
            <input class="form-check-input" type="checkbox" id="pathExclAdmin"
                   :checked="!pathExcludeAdmin" @change="pathExcludeAdmin = !$event.target.checked" />
            <label class="form-check-label small" for="pathExclAdmin">
              {{ t('access2.includeAdmin') }}
            </label>
          </div>
          <div class="ms-auto d-flex align-items-center gap-2">
            <label class="small text-secondary mb-0">{{ t('access2.pageSize') }}</label>
            <select v-model.number="pathPerPage" class="form-select form-select-sm" style="width:90px" @change="pathPage = 1">
              <option :value="20">20</option><option :value="50">50</option>
              <option :value="100">100</option><option :value="200">200</option>
            </select>
            <button class="btn btn-sm btn-outline-primary"
                    @click="downloadCsv('byPath', { excludeAdmin: pathExcludeAdmin ? '1' : '0' })">
              <i class="bi bi-download me-1"></i>CSV
            </button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0 align-middle">
            <thead class="small text-secondary">
              <tr>
                <th style="width:60px">Method</th><th>Path</th><th>Controller.handler</th>
                <th class="text-end" style="width:90px">{{ t('access2.requests') }}</th>
                <th class="text-end" style="width:70px">{{ t('access2.errors') }}</th>
                <th class="text-end" style="width:90px">{{ t('access3.avg') }}</th>
                <th class="text-end" style="width:90px">{{ t('access3.max') }}</th>
                <th class="text-end" style="width:80px">{{ t('access3.userCount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!pathRows.length">
                <td colspan="8" class="text-center text-secondary py-4">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>{{ t('access3.noData') }}
                </td>
              </tr>
              <tr v-for="r in pathRows" :key="r.method + r.path">
                <td><code class="small">{{ r.method }}</code></td>
                <td>
                  <button class="btn btn-sm btn-link p-0 me-1" :title="t('access3.rowDetail')"
                          @click="openDetail(`${r.method} ${r.path}`, { path: r.path })">
                    <i class="bi bi-search"></i>
                  </button>
                  <code class="small">{{ r.path }}</code>
                </td>
                <td class="small text-secondary">{{ r.route_key || '—' }}</td>
                <td class="text-end"><strong>{{ fmtNum(r.count) }}</strong></td>
                <td class="text-end">
                  <span v-if="Number(r.err_count) > 0" class="text-danger">{{ fmtNum(r.err_count) }}</span>
                  <span v-else class="text-secondary">0</span>
                </td>
                <td class="text-end small">{{ fmtMs(r.avg_ms) }}</td>
                <td class="text-end small">{{ fmtMs(r.max_ms) }}</td>
                <td class="text-end small">{{ fmtNum(r.distinct_users) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-footer">
          <div class="d-flex align-items-center flex-wrap gap-2">
            <small class="text-secondary">
              {{ t('access3.all') }} <strong>{{ fmtNum(pathTotal) }}</strong>{{ t('access3.itemsUnit') }} ·
              <strong>{{ pathPage }}</strong> / {{ pathTotalPages }} 페이지
            </small>
            <div class="ms-auto">
              <Pagination v-model:page="pathPage" :total-pages="pathTotalPages" :window-size="10" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 3) 사용자별 (자체 기간) ========== -->
    <div v-if="activeTab === 'by-user'">
      <!-- 사용자별 기간 선택 -->
      <div class="card mb-3">
        <div class="card-body py-2">
          <div class="d-flex align-items-center flex-wrap gap-2">
            <strong class="small text-secondary me-2"><i class="bi bi-calendar-range me-1"></i>{{ t('access3.userRange') }}</strong>
            <button v-for="q in QUICK_RANGES" :key="q.hours"
                    class="btn btn-sm btn-outline-secondary"
                    @click="quickUser(q.hours)">{{ q.label }}</button>
            <div class="vr mx-2"></div>
            <input type="datetime-local" class="form-control form-control-sm" style="width:170px" v-model="userRange.fromInput.value" />
            <span class="small text-secondary">~</span>
            <input type="datetime-local" class="form-control form-control-sm" style="width:170px" v-model="userRange.toInput.value" />
            <button class="btn btn-sm btn-primary" @click="customUser()">{{ t('common.apply') }}</button>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card h-100">
            <div class="card-header d-flex align-items-center">
              <span><i class="bi bi-people me-2"></i>{{ t('access3.userAgg') }}</span>
              <div class="ms-auto d-flex align-items-center gap-2">
                <select v-model.number="userPerPage" class="form-select form-select-sm" style="width:80px" @change="userPage = 1">
                  <option :value="20">20</option><option :value="50">50</option><option :value="100">100</option>
                </select>
                <button class="btn btn-sm btn-outline-primary" @click="downloadCsv('byUser')">
                  <i class="bi bi-download me-1"></i>CSV
                </button>
              </div>
            </div>
            <div class="table-responsive">
              <table class="table table-sm table-hover mb-0 align-middle">
                <thead class="small text-secondary">
                  <tr>
                    <th>{{ t('access3.user') }}</th>
                    <th class="text-end" style="width:90px">{{ t('access3.requests') }}</th>
                    <th class="text-end" style="width:70px">{{ t('access3.errors') }}</th>
                    <th class="text-end" style="width:90px">{{ t('access3.avg') }}</th>
                    <th class="text-end" style="width:70px">{{ t('access3.pathCount') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!userRows.length">
                    <td colspan="5" class="text-center text-secondary py-4">
                      <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>{{ t('access3.noData') }}
                    </td>
                  </tr>
                  <tr v-for="r in userRows" :key="r.username"
                      @click="selectUser(r.username)"
                      :class="{ 'table-active': selectedUser === r.username }"
                      style="cursor:pointer">
                    <td><strong>{{ r.username }}</strong> <span class="small text-secondary ms-2">({{ r.session_kind || '-' }})</span></td>
                    <td class="text-end"><strong>{{ fmtNum(r.count) }}</strong></td>
                    <td class="text-end">
                      <span v-if="Number(r.err_count) > 0" class="text-danger">{{ fmtNum(r.err_count) }}</span>
                      <span v-else class="text-secondary">0</span>
                    </td>
                    <td class="text-end small">{{ fmtMs(r.avg_ms) }}</td>
                    <td class="text-end small">{{ fmtNum(r.distinct_paths) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="card-footer">
              <div class="d-flex align-items-center flex-wrap gap-2">
                <small class="text-secondary">
                  {{ t('access3.all') }} <strong>{{ fmtNum(userTotal) }}</strong>{{ t('access3.itemsUnit') }} ·
                  <strong>{{ userPage }}</strong> / {{ userTotalPages }} 페이지
                </small>
                <div class="ms-auto">
                  <Pagination v-model:page="userPage" :total-pages="userTotalPages" :window-size="10" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card h-100">
            <div class="card-header">
              <i class="bi bi-signpost me-2"></i>
              <span v-if="selectedUser"><strong>{{ selectedUser }}</strong> {{ t('access3.pathsOf') }}</span>
              <div v-if="selectedUser" class="form-check form-switch mb-0 ms-auto small">
                <input id="userSysReq" v-model="userPathsIncludeSystem" class="form-check-input" type="checkbox" />
                <label class="form-check-label" for="userSysReq">{{ t('access2.includeAdmin') }}</label>
              </div>
              <span v-else class="text-secondary">{{ t('access3.pickUser') }}</span>
            </div>
            <div class="table-responsive">
              <table v-if="selectedUser" class="table table-sm table-hover mb-0 align-middle">
                <thead class="small text-secondary">
                  <tr>
                    <th style="width:60px">Method</th><th>Path</th>
                    <th class="text-end" style="width:80px">{{ t('access3.requests') }}</th>
                    <th class="text-end" style="width:70px">{{ t('access3.errors') }}</th>
                    <th class="text-end" style="width:90px">{{ t('access3.avg') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!userPaths.length"><td colspan="5" class="text-center text-secondary py-4">{{ t('access3.noHistory') }}</td></tr>
                  <tr v-for="r in userPaths" :key="r.method + r.path">
                    <td><code class="small">{{ r.method }}</code></td>
                    <td>
                  <!-- ★ v1.17.2 — 사용자별 탭에서 연 상세는 **그 사람의 그 경로**만 봐야 한다.
                       경로만 걸면 다른 사람이 부른 것까지 섞여 "이 사람이 한 일" 이 아니게 된다. -->
                  <button class="btn btn-sm btn-link p-0 me-1" :title="t('access3.rowDetail')"
                          @click="openDetail(`${selectedUser} · ${r.method} ${r.path}`, { path: r.path, username: selectedUser })">
                    <i class="bi bi-search"></i>
                  </button>
                  <code class="small">{{ r.path }}</code>
                </td>
                    <td class="text-end"><strong>{{ fmtNum(r.count) }}</strong></td>
                    <td class="text-end small">
                      <span v-if="Number(r.err_count) > 0" class="text-danger">{{ fmtNum(r.err_count) }}</span>
                      <span v-else class="text-secondary">0</span>
                    </td>
                    <td class="text-end small">{{ fmtMs(r.avg_ms) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 4) 로그인/세션 ========== -->
    <div v-if="activeTab === 'sessions'">
      <!-- 로그인/체류시간 통계 범위 -->
      <div class="card mb-3">
        <div class="card-body py-2">
          <div class="d-flex align-items-center flex-wrap gap-2">
            <strong class="small text-secondary me-2"><i class="bi bi-calendar-range me-1"></i>{{ t('access3.loginRange') }}</strong>
            <button v-for="q in QUICK_RANGES" :key="q.hours"
                    class="btn btn-sm btn-outline-secondary"
                    @click="quickLoginStats(q.hours)">{{ q.label }}</button>
            <div class="vr mx-2"></div>
            <input type="datetime-local" class="form-control form-control-sm" style="width:170px" v-model="loginStatsRange.fromInput.value" />
            <span class="small text-secondary">~</span>
            <input type="datetime-local" class="form-control form-control-sm" style="width:170px" v-model="loginStatsRange.toInput.value" />
            <button class="btn btn-sm btn-primary" @click="applyCustomRange(loginStatsRange, null, loadLoginStats)">{{ t('common.apply') }}</button>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-lg-6">
          <div class="card h-100">
            <div class="card-header d-flex align-items-center">
              <span><i class="bi bi-box-arrow-in-right me-2"></i>{{ t('access3.loginCounts') }}</span>
              <div class="ms-auto">
                <button class="btn btn-sm btn-outline-primary" @click="downloadCsv('loginStats')">
                  <i class="bi bi-download me-1"></i>CSV
                </button>
              </div>
            </div>
            <div class="table-responsive" style="max-height:320px">
              <table class="table table-sm table-hover mb-0 align-middle">
                <thead class="small text-secondary">
                  <tr><th>{{ t('access3.user') }}</th><th class="text-end" style="width:90px">{{ t('access3.signIn') }}</th>
                    <th class="text-end" style="width:90px">{{ t('access3.failed') }}</th>
                    <th class="text-end" style="width:90px">{{ t('access3.signOut') }}</th>
                    <th>{{ t('access3.lastSignIn') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!loginByUser.length"><td colspan="5" class="text-center text-secondary py-3">{{ t('access3.noData') }}</td></tr>
                  <tr v-for="r in loginByUser" :key="r.username">
                    <td><strong>{{ r.username }}</strong> <span class="small text-secondary ms-2">({{ r.session_kind }})</span></td>
                    <td class="text-end"><strong>{{ fmtNum(r.login_count) }}</strong></td>
                    <td class="text-end">
                      <span v-if="Number(r.failed_count) > 0" class="text-danger">{{ fmtNum(r.failed_count) }}</span>
                      <span v-else class="text-secondary">0</span>
                    </td>
                    <td class="text-end small">{{ fmtNum(r.logout_count) }}</td>
                    <td class="small text-secondary">{{ r.last_login_ts || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card h-100">
            <div class="card-header"><i class="bi bi-clock-history me-2"></i>{{ t('access3.dwellStats') }}</div>
            <div class="table-responsive" style="max-height:320px">
              <table class="table table-sm table-hover mb-0 align-middle">
                <thead class="small text-secondary">
                  <tr><th>{{ t('access3.user') }}</th>
                    <th class="text-end" style="width:70px">{{ t('access3.sessions') }}</th>
                    <th class="text-end">{{ t('access3.totalDwell') }}</th>
                    <th class="text-end">{{ t('access3.avg') }}</th>
                    <th class="text-end" style="width:70px">{{ t('access3.inProgress') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!sessionByUser.length"><td colspan="5" class="text-center text-secondary py-3">{{ t('access3.noData') }}</td></tr>
                  <tr v-for="r in sessionByUser" :key="r.username">
                    <td><strong>{{ r.username }}</strong></td>
                    <td class="text-end">{{ fmtNum(r.session_count) }}</td>
                    <td class="text-end small">{{ fmtDuration(r.total_sec) }}</td>
                    <!-- ★ v1.15.1 — 진행 중 세션은 "시작~지금" 으로 계산돼 평균을 크게 부풀린다
                         (로그아웃 없이 브라우저만 닫은 경우). 끝난 세션만의 평균을 먼저 보여 주고,
                         진행 중이 섞인 값은 회색으로 함께 적는다. -->
                    <td class="text-end small">
                      <span :title="t('access3.avgClosedHint')">{{ fmtDuration(r.avg_closed_sec) }}</span>
                      <span v-if="Number(r.active_count) > 0" class="text-secondary ms-1"
                            :title="t('access3.avgAllHint')">({{ fmtDuration(r.avg_sec) }})</span>
                    </td>
                    <td class="text-end">
                      <span v-if="Number(r.active_count) > 0" class="badge bg-success">{{ r.active_count }}</span>
                      <span v-else class="text-secondary">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- 활성 세션 카드 -->
      <div class="card mb-3">
        <div class="card-header d-flex align-items-center flex-wrap gap-2">
          <span>
            <i class="bi bi-broadcast text-success me-2"></i>{{ t('access3.activeSessions') }}
            <span class="badge bg-success ms-2">{{ fmtNum(activeTotal) }}</span>
          </span>
          <div class="ms-auto d-flex align-items-center gap-2 flex-wrap">
            <small class="text-secondary me-1">{{ t('access3.period') }}</small>
            <button v-for="q in QUICK_RANGES" :key="q.hours"
                    class="btn btn-sm btn-outline-secondary"
                    @click="quickActive(q.hours)">{{ q.label }}</button>
            <input type="datetime-local" class="form-control form-control-sm ms-2" style="width:170px" v-model="activeRange.fromInput.value" />
            <span class="small text-secondary">~</span>
            <input type="datetime-local" class="form-control form-control-sm" style="width:170px" v-model="activeRange.toInput.value" />
            <button class="btn btn-sm btn-primary" @click="customActive()">{{ t('common.apply') }}</button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0 align-middle">
            <thead class="small text-secondary">
              <tr>
                <th>{{ t('access.from') }}</th>
                <th class="text-end">{{ t('access3.elapsed') }}</th>
                <th>{{ t('access3.user') }}</th>
                <th>{{ t('access3.kind') }}</th>
                      <th>{{ t('access3.lastSeen') }}</th>
                <th>IP</th>
                <th>User-Agent</th>
                <th class="text-end" style="width:110px">{{ t('access3.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!activeRows.length">
                <td colspan="7" class="text-center text-secondary py-4">{{ t('access3.noActiveSessions') }}</td>
              </tr>
              <tr v-for="s in activeRows" :key="s.id">
                <td class="small">{{ s.started_at }}</td>
                <td class="text-end small">{{ fmtDuration(s.duration_sec) }}</td>
                <td><strong>{{ s.username }}</strong></td>
                <td class="small"><span class="badge bg-light text-dark">{{ s.session_kind }}</span></td>
                <td class="small">{{ s.ip || '-' }}</td>
                <td class="small text-secondary text-truncate" style="max-width:260px">{{ s.user_agent || '-' }}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-danger"
                          :disabled="forceEndingId === s.id"
                          @click="confirmForceEndSession(s)">
                    <span v-if="forceEndingId === s.id" class="spinner-border spinner-border-sm"></span>
                    <i v-else class="bi bi-power"></i>
                    {{ t('access3.forceEnd') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-footer">
          <div class="d-flex align-items-center flex-wrap gap-2">
            <small class="text-secondary">
              {{ t('access3.all') }} <strong>{{ fmtNum(activeTotal) }}</strong>{{ t('access3.itemsUnit') }} ·
              <strong>{{ activePage }}</strong> / {{ activeTotalPages }} 페이지
            </small>
            <select v-model.number="activePerPage" class="form-select form-select-sm ms-2" style="width:80px" @change="activePage = 1">
              <option :value="20">20</option><option :value="50">50</option><option :value="100">100</option>
            </select>
            <div class="ms-auto">
              <Pagination v-model:page="activePage" :total-pages="activeTotalPages" :window-size="10" />
            </div>
          </div>
        </div>
      </div>

      <!-- 세션 이력 카드 -->
      <div class="card">
        <div class="card-header d-flex align-items-center flex-wrap gap-2">
          <span><i class="bi bi-list-ul me-2"></i>{{ t('access3.sessionHistory') }}</span>
          <div class="ms-auto d-flex align-items-center gap-2 flex-wrap">
            <small class="text-secondary me-1">{{ t('access3.period') }}</small>
            <button v-for="q in QUICK_RANGES" :key="q.hours"
                    class="btn btn-sm btn-outline-secondary"
                    @click="quickHistory(q.hours)">{{ q.label }}</button>
            <input type="datetime-local" class="form-control form-control-sm ms-2" style="width:170px" v-model="historyRange.fromInput.value" />
            <span class="small text-secondary">~</span>
            <input type="datetime-local" class="form-control form-control-sm" style="width:170px" v-model="historyRange.toInput.value" />
            <button class="btn btn-sm btn-primary" @click="customHistory()">{{ t('common.apply') }}</button>
            <input v-model="historyUsernameFilter" type="text" class="form-control form-control-sm ms-2"
                   :placeholder="t('access3.usernameFilter')" style="width:140px"
                   @keyup.enter="() => { historyPage = 1; loadHistorySessions(); }" />
            <button class="btn btn-sm btn-outline-secondary" @click="() => { historyPage = 1; loadHistorySessions(); }">{{ t('access3.search') }}</button>
            <button class="btn btn-sm btn-outline-primary"
                    @click="downloadCsv('sessions', { username: historyUsernameFilter || undefined })">
              <i class="bi bi-download me-1"></i>CSV
            </button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0 align-middle">
            <thead class="small text-secondary">
              <tr>
                <th>{{ t('access.from') }}</th><th>{{ t('access.to') }}</th>
                <th class="text-end">{{ t('access3.dwellTime') }}</th>
                <th>{{ t('access3.user') }}</th><th>{{ t('access3.kind') }}</th><th>IP</th><th>User-Agent</th>
                <th class="text-end" style="width:110px">{{ t('access3.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!historyRows.length"><td colspan="8" class="text-center text-secondary py-4">{{ t('access3.noData') }}</td></tr>
              <tr v-for="s in historyRows" :key="s.id">
                <td class="small">{{ s.started_at }}</td>
                <td class="small">
                  <span v-if="s.ended_at">{{ s.ended_at }}</span>
                  <span v-else class="badge bg-success">{{ t('access3.inProgress') }}</span>
                </td>
                <td class="text-end small">
                  <span v-if="s.duration_sec != null">{{ fmtDuration(s.duration_sec) }}</span>
                  <span v-else class="text-secondary">-</span>
                </td>
                <td><strong>{{ s.username }}</strong></td>
                <td class="small"><span class="badge bg-light text-dark">{{ s.session_kind }}</span></td>
                <td class="small">{{ s.ip || '-' }}</td>
                <td class="small text-secondary text-truncate" style="max-width:220px">{{ s.user_agent || '-' }}</td>
                <td class="text-end">
                  <button v-if="!s.ended_at" class="btn btn-sm btn-outline-danger"
                          :disabled="forceEndingId === s.id"
                          @click="confirmForceEndSession(s)">
                    <span v-if="forceEndingId === s.id" class="spinner-border spinner-border-sm"></span>
                    <i v-else class="bi bi-power"></i>
                    {{ t('access3.forceEnd') }}
                  </button>
                  <span v-else class="text-secondary small">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-footer">
          <div class="d-flex align-items-center flex-wrap gap-2">
            <small class="text-secondary">
              {{ t('access3.all') }} <strong>{{ fmtNum(historyTotal) }}</strong>{{ t('access3.itemsUnit') }} ·
              <strong>{{ historyPage }}</strong> / {{ historyTotalPages }} 페이지
            </small>
            <select v-model.number="historyPerPage" class="form-select form-select-sm ms-2" style="width:80px" @change="historyPage = 1">
              <option :value="20">20</option><option :value="50">50</option><option :value="100">100</option>
            </select>
            <div class="ms-auto">
              <Pagination v-model:page="historyPage" :total-pages="historyTotalPages" :window-size="10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- ★ v1.15.0 원본 기록 대화상자 -->
    <div v-if="detail.open" class="modal-backdrop-custom" @mousedown.self="detail.open = false">
      <div class="detail-dialog">
        <div class="d-flex align-items-center gap-2 mb-2">
          <h6 class="mb-0"><i class="bi bi-search me-2"></i>{{ t('access3.detailTitle') }}</h6>
          <code class="small">{{ detail.title }}</code>
          <button class="btn-close ms-auto" @click="detail.open = false"></button>
        </div>
        <div v-if="detail.loading" class="text-secondary small py-3">
          <span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}
        </div>
        <div v-else-if="!detail.rows.length" class="text-secondary small py-3">{{ t('access3.detailNone') }}</div>
        <div v-else class="table-responsive" style="max-height:55vh">
          <table class="table table-sm table-hover mb-0">
            <thead><tr>
              <th>{{ t('access3.colTime') }}</th><th>Method</th><th>Path</th>
              <th>{{ t('access3.colUser') }}</th><th class="text-end">{{ t('access3.colStatus') }}</th>
              <th class="text-end">ms</th><th>IP</th><th class="text-end">{{ t('access3.steps') }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="(x, i) in detail.rows" :key="i">
                <td class="small text-nowrap">{{ String(x.ts || '').replace('T', ' ').slice(0, 19) }}</td>
                <td><span class="badge text-bg-light border">{{ x.method }}</span></td>
                <td><code class="small">{{ x.path }}</code></td>
                <td class="small">{{ x.username || '—' }}</td>
                <td class="text-end" :class="x.status >= 500 ? 'text-danger fw-semibold' : (x.status >= 400 ? 'text-warning' : '')">{{ x.status }}</td>
                <td class="text-end small">{{ Math.round(x.durationMs ?? x.duration_ms ?? 0) }}</td>
                <td class="small text-secondary">{{ x.ip || '—' }}</td>
                <td class="text-end">
                  <button type="button" class="btn btn-sm btn-link p-0"
                          :disabled="!(x.requestId || x.request_id)"
                          :title="t('access3.stepsTitle')"
                          @click="openSteps(x)">
                    <i class="bi bi-diagram-3"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ★ v1.17.0 처리 과정 (원본 기록 대화상자 위에 겹쳐 뜬다) -->
    <TraceStepsDialog v-if="stepsFor" :request-id="stepsFor" @close="stepsFor = null" />
</template>

<style scoped>
.access-stats-page { padding-bottom: 24px; }
.card-header { background: #f8f9fb; }
.nav-tabs .nav-link { cursor: pointer; color: #495057; }
.nav-tabs .nav-link.active { font-weight: 600; }
</style>

<style scoped>
.modal-backdrop-custom { position: fixed; inset: 0; background: rgba(15,23,42,.45); z-index: 1080; display: grid; place-items: center; padding: 24px; }
.detail-dialog { background: var(--bs-body-bg, #fff); border-radius: 12px; padding: 16px; width: min(1000px, 100%); box-shadow: 0 20px 50px rgba(2,6,23,.3); }
</style>
