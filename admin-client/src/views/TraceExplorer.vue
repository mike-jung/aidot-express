<script setup>
/**
 * TraceExplorer — 요청 추적. (v1.8.0)
 *
 *  ## 설계 근거
 *  감사 트레일 UX 조사에서 반복해서 나온 결론은 **하나의 표현으로는 부족하다** 는 것이었다.
 *  같은 데이터라도 보는 사람이 다르면 필요한 모양이 다르다.
 *
 *   · 개발자   — "어디서 시간을 썼나"        → **폭포수(waterfall)**
 *   · 운영자   — "무슨 일이 있었나"          → **서술형 복원(narrative)**
 *   · 감사자   — "이 사람이 무엇을 했나"     → **사람 단위 타임라인**
 *
 *  그래서 탭 세 개가 아니라 **세 개의 진입점 + 하나의 상세**로 짰다.
 *  상세 화면 안에서 이야기 ↔ 폭포수 ↔ 원자료를 오갈 수 있다.
 */
import { ref, computed, onMounted, watch } from 'vue';
// ★ v1.10.3 — 다국어
import { useI18n, locale } from '../composables/useI18n';

import { useFormat } from '../composables/useFormat';
const fmt = useFormat();
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import http from '../api/http';
import { notifyError } from '../composables/useNotify';
import RequestDotPlot from '../components/RequestDotPlot.vue';

import { useDuration } from '../utils/duration';   // ★ v1.19.4

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼

   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

/* ★ v1.39.1 — 요청 이야기는 서버가 ko/en 두 벌로 보낸다. 언어에 맞는 쪽을 고른다.
   예전에는 서버가 한국어 문장만 만들어, English 로 두어도 여기만 한글이었다.
   조사(을/를·이/가)를 붙여 완성하기 때문에 화면에서 낱말만 바꿔 끼울 수 없었다. */
const pickLang = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;              /* 예전 형태도 받아 준다 */
  return (locale.value === 'en' ? v.en : v.ko) || v.ko || v.en || '';
};
const stepText = (n) => (locale.value === 'en' && n.textEn) ? n.textEn : (n.text || '');


/* ★ v1.21.3 — 시간 표기 도우미 */
const { fmtDuration } = useDuration();
/* ★ v1.8.4 재설계 — 진입을 '질문 3개' 로 바꾼다.
   이전 판은 열자마자 입력 9개와 버튼 6개가 한꺼번에 보여, 기능은 다 있어도
   "지금 뭘 해야 하지" 가 눈에 들어오지 않았다.
   사용자는 도구가 아니라 **상황**을 고른다. */
/* ★ v1.10.5 — computed 로 감싼다. 그냥 배열이면 t() 가 **한 번만** 평가되어
   언어를 바꿔도 문구가 그대로 남는다 (메뉴에서 이미 겪었다). */
const MODES = computed(() => ([
  { key: 'problem', icon: 'bi-exclamation-octagon', title: t('trace.modeProblem'),
    desc: t('trace.modeProblemDesc'), tone: 'danger' },
  { key: 'id', icon: 'bi-hash', title: t('trace.modeId'),
    desc: t('trace.modeIdDesc'), tone: 'primary' },
  { key: 'who', icon: 'bi-person-lines-fill', title: t('trace.modeWho'),
    desc: t('trace.modeWhoDesc'), tone: 'secondary' },
]));

const mode = ref('problem');
const showAdvanced = ref(false);      // 세부 조건은 접어 둔다
const plotMode = ref('path');         // 점도표: 'path' | 'latency'
const brushed = ref(null);            // 점도표에서 끌어 고른 구간

/** 서버 응답(snake_case)과 메모리 버퍼(camelCase)를 한 모양으로 */
function normalizeRow(r) {
  return {
    requestId: r.requestId ?? r.request_id,
    ts: r.ts, method: r.method, path: r.path,
    status: Number(r.status ?? 0),
    durationMs: Number(r.durationMs ?? r.duration_ms ?? 0),
    username: r.username, ip: r.ip, summary: r.summary,
  };
}

/** 사람 모드의 행적을 점도표용 평면 목록으로 */
const activityItems = computed(() =>
  (activity.value?.groups || []).flatMap((g) => g.items).map(normalizeRow));
const shownItems = computed(() => brushed.value ?? activityItems.value);

/** 규모 요약 — 표를 스크롤하기 전에 크기를 먼저 알려 준다 */
const stats = computed(() => {
  const list = mode.value === 'who' ? shownItems.value : rows.value.map(normalizeRow);
  if (!list.length) return null;
  const fail = list.filter((d) => d.status >= 400).length;
  const durs = list.map((d) => d.durationMs).sort((a, b) => a - b);
  const p95 = durs[Math.min(durs.length - 1, Math.floor(durs.length * 0.95))] || 0;
  const paths = new Set(list.map((d) => `${d.method} ${d.path}`));
  const span = list.length > 1
    ? Math.abs(new Date(list[list.length - 1].ts) - new Date(list[0].ts)) : 0;
  return { total: list.length, fail, p95, paths: paths.size, span };
});

/* ★ v1.19.4 — 시간 표기는 공통 모듈로 (한글이 박혀 영어로 안 바뀌었다) */
const fmtSpan = (ms) => fmtDuration(Math.round(ms / 1000));

const route = useRoute();
const router = useRouter();

/* ── 진입점 1: 검색 ─────────────────────────────────────────────────────── */
/* ★ v1.10.36 — 기본값을 **내 요청만** 으로.
   여러 사람이 함께 쓰면 목록이 섞여, 방금 내가 보낸 요청을 찾기 어렵다.
   "내 것" 이 기본이고 필요할 때 전체로 넓히는 편이 맞다. */
const auth = useAuthStore();
const myName = computed(() => auth.user?.username || '');
const filters = ref({ username: myName.value, method: '', path: '', minStatus: '', minMs: '' });
/* 실패 이유 한 줄. summary 에 이미 들어 있으면 그걸 쓰고,
   없으면 상태 코드로 흔한 원인을 짚어 준다. */
/** 요청 ID 를 검색어로 채운 채 [로그 탐색] 을 연다 */
function openInLogs(requestId) {
  // ★ v1.11.3 — 본문 검색(q)이 아니라 요청 ID 조건으로 넘긴다 (로그 탐색이 route.query.requestId 를 읽는다)
  router.push({ name: 'logs', query: { requestId } });
}
/* ★ v1.11.3 — 기록 상태. 부하로 물러난 단계면 "왜 내 요청이 없지" 의 답을 화면에 보여 준다 */
const writerStatus = ref(null);
async function loadStatus() {
  try { writerStatus.value = (await http.get('/api/admin/trace/status')).data?.data || null; }
  catch { writerStatus.value = null; }
}
const pressureNote = computed(() => {
  const w = writerStatus.value?.writer;
  if (!w) return '';
  if (w.level === 'shed') return t('trace.pressureShed');
  if (w.level === 'heavy') return t('trace.pressureHeavy');
  if (w.level === 'ease') return t('trace.pressureEase');
  return '';
});
/** 지우기 전에 무엇이 지워지는지 알려 주고 한 번 물어본다 */
function confirmRetention() {
  const days = writerStatus.value?.rules?.retentionDays || '∞';
  const max = (writerStatus.value?.rules?.maxRecords || 0).toLocaleString();
  if (!window.confirm(t('trace.retentionConfirm', { days, max }))) return;
  runRetention();
}

async function runRetention() {
  try {
    const r = (await http.get('/api/admin/trace/retention/run')).data?.data;
    await loadStatus();
    alert(r ? `${t('trace.retentionDone')} — ${r.deletedTraces} / ${r.deletedSteps}` : t('trace.retentionSkipped'));
  } catch (e) { notifyError(t('designer.trc_cleanupFailed'), e); }
}

function failReason(r) {
  const sm = String(pickLang(r.summary) || '');
  const m = sm.match(/[—-]\s*(.{3,80})$/);
  if (m) return m[1];
  const byCode = {
    400: t('designer.trc_st400'), 401: t('designer.trc_st401'), 403: t('designer.trc_st403'),
    404: t('designer.trc_st404'), 409: t('designer.trc_st409'), 500: t('designer.trc_st500'),
  };
  return byCode[r.status] || `HTTP ${r.status}`;
}

const onlyMine = computed({
  get: () => filters.value.username === myName.value && !!myName.value,
  set: (v) => { filters.value.username = v ? myName.value : ''; search(); },
});
const rows = ref([]);
const loading = ref(false);
const searched = ref(false);

async function search() {
  loading.value = true;
  try {
    const params = {};
    for (const [k, v] of Object.entries(filters.value)) if (v !== '' && v != null) params[k] = v;
    const r = await http.get('/api/admin/trace', { params });
    rows.value = r.data?.data || [];
    searched.value = true;
  } catch (e) {
    notifyError(t('designer.trc_queryFailed'), e);
  } finally {
    loading.value = false;
  }
}

/** 자주 쓰는 조건은 버튼으로 — 매번 조합을 기억하게 하지 않는다 */
function preset(kind) {
  filters.value = { username: myName.value, method: '', path: '', minStatus: '', minMs: '' };
  if (kind === 'errors') filters.value.minStatus = '400';
  else if (kind === 'server-errors') filters.value.minStatus = '500';
  else if (kind === 'slow') filters.value.minMs = '1000';
  else if (kind === 'changes') filters.value.method = 'DELETE';
  search();
}

/* ── 진입점 2: 요청 ID 직접 조회 ────────────────────────────────────────── */
const lookupId = ref('');
async function lookup(id) {
  const key = String(id ?? lookupId.value).trim();
  if (!key) return;
  loading.value = true;
  try {
    const r = await http.get(`/api/admin/trace/${encodeURIComponent(key)}`);
    detail.value = r.data?.data || null;
    detailView.value = 'story';
  } catch (e) {
    detail.value = null;
    notifyError(t('designer.trc_recNotFound'), e);
  } finally {
    loading.value = false;
  }
}

/* ── 진입점 3: 사람 단위 행적 ───────────────────────────────────────────── */
const users = ref([]);
const activity = ref(null);

async function loadUsers() {
  try {
    const r = await http.get('/api/admin/trace/users');
    users.value = r.data?.data || [];
  } catch { users.value = []; }
}

/* ★ v1.16.0 — 한 사람의 기록은 금방 수백 줄이 된다.
   ① 기본은 **업무 API 요청만** 본다 (보통 사용자는 그것만 부른다)
   ② 보안 점검이 필요하면 [시스템 접근] 으로 바꿔 관리 API 만 본다
   ③ 카드 높이를 고정하고 그 안에서만 스크롤한다 — 화면이 끝없이 길어지지 않게
   ④ 아래에 닿으면 다음 쪽을 이어 붙인다 (끊김 없이 과거로) */
const ACTIVITY_KINDS = [
  { value: 'business', label: t('designer.trc_ctrlReq'), hint: '업무 API (/api/*)' },
  { value: 'system',   label: '시스템 접근',   hint: '관리 API (/api/admin/*)' },
  { value: 'all',      label: '전체',          hint: '둘 다' },
];
const activityKind = ref('business');
const activityUser = ref(null);
const activityMore = ref(false);
const activityLoadingMore = ref(false);
const ACTIVITY_PAGE = 50;

async function loadActivity(username, { append = false } = {}) {
  if (!append) { loading.value = true; detail.value = null; activityUser.value = username; }
  else { activityLoadingMore.value = true; }
  try {
    const offset = append ? (activity.value?.loaded || 0) : 0;
    const r = await http.get(`/api/admin/trace/user/${encodeURIComponent(username)}`, {
      params: { kind: activityKind.value, limit: ACTIVITY_PAGE, offset },
    });
    const d = r.data?.data || null;
    if (!d) { activity.value = null; return; }
    activityMore.value = !!d.hasMore;
    const loaded = offset + (d.groups || []).reduce((n, g) => n + g.items.length, 0);
    if (append && activity.value) {
      /* 과거로 이어 붙인다 — 새로 받은 묶음이 더 오래된 것이므로 앞에 놓는다 */
      activity.value = { ...d, groups: [...(d.groups || []), ...activity.value.groups], loaded };
    } else {
      activity.value = { ...d, loaded };
    }
  } catch (e) {
    notifyError('행적 조회 실패', e);
  } finally {
    loading.value = false; activityLoadingMore.value = false;
  }
}

/** 카드 안에서 위로 끝까지 올라가면 더 옛날 것을 불러온다 */
function onActivityScroll(ev) {
  const el = ev.target;
  if (el.scrollTop <= 40 && activityMore.value && !activityLoadingMore.value && activityUser.value) {
    const before = el.scrollHeight;
    loadActivity(activityUser.value, { append: true }).then(() => {
      // 이어 붙인 만큼 스크롤을 내려 보던 자리를 유지한다
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - before + el.scrollTop; });
    });
  }
}

watch(activityKind, () => { if (activityUser.value) loadActivity(activityUser.value); });

/* ── 상세 ───────────────────────────────────────────────────────────────── */
const detail = ref(null);
const detailView = ref('story');   // 'story' | 'waterfall' | 'raw'

/** 폭포수 막대 — 요청 시작 기준 상대시간을 백분율로 */
const bars = computed(() => {
  const d = detail.value;
  if (!d?.steps?.length) return [];
  const total = Math.max(d.durationMs || 1, 1);
  return d.steps.map((s) => ({
    ...s,
    left: Math.min(100, (s.at / total) * 100),
    width: Math.max(0.8, Math.min(100, ((s.ms ?? 2) / total) * 100)),
  }));
});

const statusTone = (s) => (s >= 500 ? 'danger' : s >= 400 ? 'warning' : s >= 300 ? 'secondary' : 'success');
const kindIcon = {
  auth: 'bi-person-check', controller: 'bi-diagram-3', service: 'bi-gear',
  sql: 'bi-database', sse: 'bi-broadcast', mci: 'bi-plug', error: 'bi-exclamation-triangle',
};
const kindColor = {
  auth: '#8b5cf6', controller: '#0d6efd', service: '#0dcaf0',
  sql: '#198754', sse: '#fd7e14', mci: '#6f42c1', error: '#dc3545', note: '#6c757d',
};

function fmtTs(v) {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : fmt.dateTime(d);
}
function fmtDur(ms) {
  const t = Number(ms) || 0;
  return t >= 1000 ? `${(t / 1000).toFixed(2)}s` : `${t}ms`;
}
function copyId(id) {
  navigator.clipboard?.writeText(id);
}

watch(mode, (m) => {
  detail.value = null;
  brushed.value = null;
  if (m === 'who' && !users.value.length) loadUsers();
  if (m === 'problem' && !searched.value) preset('server-errors');
});

onMounted(() => {
  loadUsers();
  loadStatus();
  // 로그 화면 등에서 ?id= 로 넘어올 수 있다
  if (route.query.id) { mode.value = 'id'; lookupId.value = String(route.query.id); lookup(); }
  else if (route.query.user) { mode.value = 'who'; loadActivity(String(route.query.user)); }
  /* ★ v1.10.37 — 처음 열면 **내 요청**을 보여 준다.
     예전에는 진입하자마자 preset('server-errors') 가 걸려
     `상태 ≥ 500` · `경로 /api/admin/users` 로 좁혀졌다. 그래서 "내 요청만"
     토글을 켜 놔도 목록이 늘 비어 보였다.
     오류부터 보고 싶으면 위의 [서버 오류(5xx)] 버튼이 그대로 있다. */
  else search();
});
</script>

<template>
  <div>
    <!-- ★ v1.11.3 — 기록 상태 띠: 물러난 단계일 때만 눈에 띄게, 평소에는 한 줄 -->
    <div v-if="writerStatus" class="d-flex align-items-center flex-wrap gap-2 small mb-2"
         :class="pressureNote ? 'alert alert-warning py-2 px-3 mb-3' : 'text-secondary'">
      <i class="bi" :class="pressureNote ? 'bi-exclamation-triangle' : 'bi-record-circle'"></i>
      <span v-if="pressureNote">{{ pressureNote }}</span>
      <span v-else>{{ t('trace.statusLine', { rows: (writerStatus.db?.rows ?? 0).toLocaleString(), days: writerStatus.rules?.retentionDays || '∞', max: (writerStatus.rules?.maxRecords || 0).toLocaleString() }) }}</span>
      <span v-if="writerStatus.writer?.droppedTotal" class="badge bg-danger">{{ t('trace.dropped', { n: writerStatus.writer.droppedTotal }) }}</span>
      <span v-if="writerStatus.writer?.skippedByPressure" class="badge bg-warning text-dark">{{ t('trace.skipped', { n: writerStatus.writer.skippedByPressure }) }}</span>
      <!-- ★ v1.16.5 — 예전에는 "보관 정리 지금 실행" 이라는 링크만 있어 무엇을 지우는지 알 수 없었다.
           무엇을·왜 지우는지 말해 주고, 되돌릴 수 없으므로 한 번 물어본다. -->
      <button type="button" class="btn btn-sm btn-outline-secondary ms-auto"
              :title="t('trace.retentionHelp', { days: writerStatus.rules?.retentionDays || '∞',
                        max: (writerStatus.rules?.maxRecords || 0).toLocaleString() })"
              @click="confirmRetention">
        <i class="bi bi-eraser me-1"></i>{{ t('trace.runRetention') }}
      </button>
    </div>
    <!-- ★ 1단계: 무엇을 하려는지 고른다. 처음 보는 사람은 여기서 하나만 고르면 된다. -->
    <div class="row g-2 mb-3">
      <div v-for="m in MODES" :key="m.key" class="col-12 col-md-4">
        <button type="button" class="mode-card w-100" :class="{ on: mode === m.key }" @click="mode = m.key">
          <i class="bi" :class="[m.icon, `text-${m.tone}`]"></i>
          <span class="t">{{ m.title }}</span>
          <span class="d">{{ m.desc }}</span>
          <!-- ★ v1.16.5 — 고른 카드에 표시를 남긴다. 예전에는 눌러도 무엇이 바뀌는지 알 수 없었다 -->
          <span v-if="mode === m.key" class="mode-on"><i class="bi bi-check-lg me-1"></i>{{ t('traceUi.modeOn') }}</span>
        </button>
      </div>
    </div>
    <!-- 고른 것이 아래 어느 영역을 여는지 한 줄로 알려 준다 -->
    <div class="small text-secondary mb-3">
      <i class="bi bi-arrow-down-short"></i>
      <span v-if="mode === 'problem'">{{ t('traceUi.modeHintProblem') }}</span>
      <span v-else-if="mode === 'id'">{{ t('traceUi.modeHintId') }}</span>
      <span v-else>{{ t('traceUi.modeHintWho') }}</span>
    </div>

    <!-- ★ 규모 요약 — 표를 스크롤하기 전에 크기를 먼저 알려 준다 -->
    <!-- ★ v1.16.5 — 숫자를 카드로. 아이콘·색으로 무엇을 뜻하는지 한눈에,
         실패가 있으면 그 카드만 붉게 해서 눈이 먼저 가게 한다. -->
    <div v-if="stats" class="kpi-row mb-3">
      <div class="kpi">
        <i class="bi bi-list-ul kpi-ico"></i>
        <div><div class="kpi-v">{{ stats.total.toLocaleString() }}</div>
             <div class="kpi-l">{{ t('traceUi.statRequests') }}</div></div>
      </div>
      <div class="kpi" :class="{ 'kpi-bad': stats.fail > 0 }">
        <i class="bi kpi-ico" :class="stats.fail > 0 ? 'bi-exclamation-octagon-fill' : 'bi-check-circle'"></i>
        <div><div class="kpi-v">{{ stats.fail.toLocaleString() }}</div>
             <div class="kpi-l">{{ t('traceUi.statFailed') }}</div></div>
      </div>
      <div class="kpi">
        <i class="bi bi-speedometer2 kpi-ico"></i>
        <div><div class="kpi-v">{{ fmtDur(stats.p95) }}</div>
             <div class="kpi-l">{{ t('traceUi.statP95') }}</div></div>
      </div>
      <div class="kpi">
        <i class="bi bi-signpost-split kpi-ico"></i>
        <div><div class="kpi-v">{{ stats.paths }}</div>
             <div class="kpi-l">{{ t('traceUi.statPaths') }}</div></div>
      </div>
      <div v-if="stats.span" class="kpi">
        <i class="bi bi-clock-history kpi-ico"></i>
        <div><div class="kpi-v">{{ fmtSpan(stats.span) }}</div>
             <div class="kpi-l">{{ t('traceUi.statSpan') }}</div></div>
      </div>
      <button v-if="brushed" type="button" class="btn btn-sm btn-outline-secondary align-self-center ms-auto"
              @click="brushed = null">{{ t('traceUi.viewAll') }}</button>
    </div>

    <!-- ★ 사람 모드: 점도표 — 점 하나가 요청 하나다 -->
    <div v-if="mode === 'who' && activity" class="card mb-3">
      <div class="card-header d-flex align-items-center flex-wrap gap-2">
        <i class="bi bi-graph-up me-1"></i>{{ activity.username }} 님의 요청 분포
        <div class="ms-auto btn-group btn-group-sm">
          <button class="btn" :class="plotMode==='path' ? 'btn-primary' : 'btn-outline-secondary'"
                  @click="plotMode='path'">{{ t('traceUi.plotWhat') }}</button>
          <button class="btn" :class="plotMode==='latency' ? 'btn-primary' : 'btn-outline-secondary'"
                  @click="plotMode='latency'">{{ t('traceUi.plotHowLong') }}</button>
        </div>
      </div>
      <div class="card-body pt-2">
        <RequestDotPlot :items="activityItems" :mode="plotMode"
                        @select="lookup($event.requestId)" @brush="brushed = $event" />
      </div>
    </div>

    <!-- ── 진입점 ─────────────────────────────────────────────────────── -->
    <div class="card mb-3">
      <div class="card-header d-flex align-items-center">
        <i class="bi bi-crosshair me-2"></i>{{ t('traceUi2.requestTrace') }}
        <span class="ms-2 small text-secondary fw-normal">
          {{ t('traceUi.subtitle') }}
        </span>
      </div>
      <div class="card-body">
        <!-- 요청 ID 직접 조회: 사용자가 화면에서 본 오류 번호를 그대로 넣는 자리 -->
        <div class="row g-2 align-items-end mb-3">
          <div class="col-12 col-md-5">
            <label class="form-label mb-1">{{ t('traceUi.byId') }}</label>
            <div class="input-group input-group-sm">
              <span class="input-group-text"><i class="bi bi-hash"></i></span>
              <input v-model="lookupId" class="form-control font-monospace"
                     :placeholder="t('traceUi2.idPlaceholder')"
                     @keyup.enter="lookup()" />
              <button class="btn btn-primary" :disabled="!lookupId.trim()" @click="lookup()">{{ t('traceUi.find') }}</button>
            </div>
            <div class="form-text">
              <span v-html="t('traceUi2.idHint', { header: t('traceUi2.responseHeader') })"></span>
            </div>
          </div>

          <div class="col-12 col-md-7">
            <label class="form-label mb-1">{{ t('traceUi.common') }}</label>
            <div class="d-flex flex-wrap gap-1">
              <button class="btn btn-sm btn-outline-danger" @click="preset('server-errors')">
                <i class="bi bi-x-octagon me-1"></i>{{ t('traceUi.serverErrors') }}
              </button>
              <button class="btn btn-sm btn-outline-warning" @click="preset('errors')">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ t('traceUi.failedRequests') }}
              </button>
              <button class="btn btn-sm btn-outline-secondary" @click="preset('slow')">
                <i class="bi bi-hourglass-split me-1"></i>{{ t('traceUi.slowRequests') }}
              </button>
              <button class="btn btn-sm btn-outline-secondary" @click="preset('changes')">
                <i class="bi bi-trash3 me-1"></i>{{ t('traceUi.deleteActions') }}
              </button>
            </div>
          </div>
        </div>

        <!-- 상세 조건 -->
        <div class="row g-2">
          <div class="col-6 col-md-2">
            <label class="form-label mb-1">{{ t('traceUi.fUser') }}</label>
            <!-- ★ v1.10.36 — 기본은 내 요청만. 끄면 전체가 보인다. -->
            <div class="form-check form-switch mb-1">
              <input id="onlyMine" v-model="onlyMine" class="form-check-input" type="checkbox" :disabled="!myName" />
              <label class="form-check-label small" for="onlyMine">{{ t('traceList.onlyMine') }}</label>
            </div>
            <input v-model="filters.username" class="form-control form-control-sm" placeholder="admin" />
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label mb-1">{{ t('traceUi.fMethod') }}</label>
            <select v-model="filters.method" class="form-select form-select-sm">
              <option value="">{{ t('traceUi2.all') }}</option>
              <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
            </select>
          </div>
          <div class="col-12 col-md-3">
            <label class="form-label mb-1">{{ t('traceUi.fPath') }}</label>
            <input v-model="filters.path" class="form-control form-control-sm" placeholder="/api/admin/users" />
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label mb-1">{{ t('traceUi.fStatus') }}</label>
            <input v-model="filters.minStatus" type="number" class="form-control form-control-sm" placeholder="400" />
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label mb-1">{{ t('traceUi.fMs') }}</label>
            <input v-model="filters.minMs" type="number" class="form-control form-control-sm" placeholder="500" />
          </div>
          <!-- ★ v1.16.5 — d-grid 라서 칸 높이만큼 늘어나 거대한 파란 덩어리가 됐다.
               라벨 자리를 비워 다른 입력과 아래를 맞추고, 글자를 넣어 무슨 단추인지 보이게 한다. -->
          <div class="col-12 col-md-2 d-flex align-items-end">
            <button type="button" class="btn btn-sm btn-primary w-100" :disabled="loading" @click="search">
              <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-search me-1"></i>{{ t('traceUi.search') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <!-- ── 왼쪽: 결과 목록 / 사람 목록 ──────────────────────────────── -->
      <div class="col-12" :class="detail || activity ? 'col-xl-5' : ''">
        <div class="card mb-3">
          <div class="card-header d-flex align-items-center">
            <i class="bi bi-list-ul me-2"></i>{{ t('traceList.listTitle') }}
            <span class="ms-2 badge bg-secondary">{{ rows.length }}</span>
          </div>
          <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th style="width:96px">{{ t('traceUi2.time') }}</th>
                  <th>{{ t('traceUi2.request') }}</th>
                  <th class="num" style="width:70px">{{ t('traceUi2.status') }}</th>
                  <th class="num" style="width:80px">{{ t('traceUi2.duration') }}</th>
                  <th>{{ t('traceList.why') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading"><td colspan="4" class="text-center text-secondary py-4">
                  <span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}
                </td></tr>
                <tr v-else-if="!rows.length"><td colspan="4" class="text-center text-secondary py-4">
                  {{ searched ? '조건에 맞는 요청이 없습니다.' : '위에서 조건을 골라 조회하세요.' }}
                </td></tr>
                <tr v-for="r in rows" :key="r.request_id"
                    style="cursor: pointer"
                    :class="{ 'table-active': detail?.requestId === r.request_id }"
                    @click="lookup(r.request_id)">
                  <td class="cell-sub">{{ fmtTs(r.ts).slice(-8) }}</td>
                  <td>
                    <div><span class="badge bg-light text-dark border me-1">{{ r.method }}</span>
                      <span class="font-monospace" style="font-size:.8rem">{{ r.path }}</span></div>
                    <div class="cell-sub">
                      <i class="bi bi-person me-1"></i>{{ r.username || '익명' }}
                      · <span class="font-monospace">{{ r.request_id }}</span>
                    </div>
                  </td>
                  <td class="num"><span class="badge" :class="`bg-${statusTone(r.status)}`">{{ r.status }}</span></td>
                  <td class="num cell-sub">{{ fmtDur(r.duration_ms) }}</td>
                  <!-- ★ v1.10.36 — 실패 이유를 목록에 바로.
                       클릭하지 않고도 무엇이 잘못됐는지 알아야 목록이 쓸모 있다. -->
                  <td class="cell-sub text-truncate" style="max-width:260px">
                    <span v-if="r.status >= 400" class="text-danger">✖ {{ failReason(r) }}</span>
                    <span v-else class="text-secondary">{{ pickLang(r.summary) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 사람 단위 진입 -->
        <div class="card">
          <div class="card-header"><i class="bi bi-people me-2"></i>{{ t('traceList.byPerson') }}</div>
          <div class="card-body py-2">
            <p class="cell-sub mb-2">{{ t('traceList.byPersonHint') }}</p>
            <div v-if="!users.length" class="text-secondary small py-2">{{ t('traceList.noUsers') }}</div>
            <button v-for="u in users" :key="u.username"
                    class="btn btn-sm btn-outline-secondary me-1 mb-1"
                    @click="loadActivity(u.username)">
              <i class="bi bi-person me-1"></i>{{ u.username }}
              <span class="badge bg-secondary ms-1">{{ u.cnt }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── 오른쪽: 상세 ──────────────────────────────────────────────── -->
      <div v-if="detail" class="col-12 col-xl-7">
        <div class="card">
          <div class="card-header d-flex align-items-center flex-wrap gap-2">
            <i class="bi bi-signpost-split me-1"></i>
            <span class="font-monospace">{{ detail.requestId }}</span>
            <button class="btn btn-sm btn-link p-0" :title="t('traceUi2.copy')" @click="copyId(detail.requestId)">
              <i class="bi bi-clipboard"></i>
            </button>
            <!-- ★ v1.10.36 — 화면에서 못 보는 것(서비스 안의 log.info 등)이 있을 때
                 요청 ID 를 들고 [로그 탐색]으로 넘어간다. 두 화면을 잇는 다리. -->
            <button class="btn btn-sm btn-outline-secondary ms-2" @click="openInLogs(detail.requestId)">
              <i class="bi bi-journal-text me-1"></i>{{ t('traceList.openLogs') }}
            </button>
            <span class="badge" :class="`bg-${statusTone(detail.status)}`">{{ detail.status }}</span>
            <div class="ms-auto btn-group btn-group-sm">
              <button class="btn" :class="detailView === 'story' ? 'btn-primary' : 'btn-outline-secondary'"
                      @click="detailView = 'story'"><i class="bi bi-chat-left-text me-1"></i>{{ t('traceList.viewStory') }}</button>
              <button class="btn" :class="detailView === 'waterfall' ? 'btn-primary' : 'btn-outline-secondary'"
                      @click="detailView = 'waterfall'"><i class="bi bi-bar-chart-steps me-1"></i>{{ t('traceList.viewWaterfall') }}</button>
              <button class="btn" :class="detailView === 'raw' ? 'btn-primary' : 'btn-outline-secondary'"
                      @click="detailView = 'raw'"><i class="bi bi-table me-1"></i>{{ t('traceList.viewRaw') }}</button>
            </div>
          </div>

          <div class="card-body">
            <!-- 한 줄 요약 — 어떤 탭에서든 맨 위에 있다 -->
            <div class="alert alert-light border mb-3 py-2">
              <div class="fw-semibold">{{ pickLang(detail.summary) }}</div>
              <div class="cell-sub mt-1">
                {{ fmtTs(detail.ts) }} · {{ detail.ip }} ·
                <span class="font-monospace">trace {{ detail.traceId?.slice(0, 16) }}…</span>
              </div>
            </div>

            <!-- 이야기: 운영자·감사자용 -->
            <ol v-if="detailView === 'story'" class="trace-story">
              <li v-for="(n, i) in detail.narrative" :key="i" :class="`tone-${n.tone}`">
                <span class="trace-at">+{{ n.at }}ms</span>
                <i class="bi" :class="n.icon"></i>
                <span>{{ stepText(n) }}</span>
              </li>
            </ol>

            <!-- 폭포수: 개발자용 -->
            <div v-else-if="detailView === 'waterfall'">
              <div v-if="!bars.length" class="text-secondary small py-3">{{ t('traceUi2.noSteps') }}</div>
              <div v-for="(b, i) in bars" :key="i" class="wf-row">
                <div class="wf-label" :title="b.name">
                  <i class="bi me-1" :class="kindIcon[b.kind] || 'bi-dot'"
                     :style="{ color: kindColor[b.kind] }"></i>{{ b.name }}
                </div>
                <div class="wf-track">
                  <div class="wf-bar" :class="{ bad: !b.ok }"
                       :style="{ left: b.left + '%', width: b.width + '%', background: b.ok ? kindColor[b.kind] : '#dc3545' }"></div>
                </div>
                <div class="wf-ms num">{{ b.ms != null ? b.ms + 'ms' : '—' }}</div>
              </div>
              <div class="cell-sub mt-2">막대의 위치는 요청 시작 기준, 길이는 소요 시간입니다. 총 {{ fmtDur(detail.durationMs) }}.</div>
            </div>

            <!-- 원자료 -->
            <div v-else class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead><tr>
                  <th class="num" style="width:70px">+ms</th><th style="width:90px">{{ t('traceUi2.kind') }}</th>
                  <th>{{ t('traceUi2.name') }}</th><th class="num" style="width:70px">{{ t('traceUi2.duration') }}</th><th class="num" style="width:60px">{{ t('traceUi2.count') }}</th>
                </tr></thead>
                <tbody>
                  <tr v-for="(s, i) in detail.steps" :key="i" :class="{ 'table-danger': !s.ok }">
                    <td class="num cell-sub">{{ s.at }}</td>
                    <td><span class="badge bg-light text-dark border">{{ s.kind }}</span></td>
                    <td class="font-monospace" style="font-size:.8rem">
                      {{ s.name }}
                      <div v-if="s.detail" class="cell-sub text-danger">{{ s.detail }}</div>
                    </td>
                    <td class="num">{{ s.ms ?? '—' }}</td>
                    <td class="num">{{ s.rows ?? '—' }}</td>
                  </tr>
                  <tr v-if="!detail.steps?.length">
                    <td colspan="5" class="text-center text-secondary py-3">{{ t('traceUi2.noSteps') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 사람 단위 행적 ────────────────────────────────────────────── -->
      <div v-else-if="activity" class="col-12 col-xl-7">
        <div class="card">
          <div class="card-header d-flex align-items-center flex-wrap gap-2">
            <i class="bi bi-person-lines-fill me-2"></i>{{ activity.username }} 님의 행적
            <!-- ★ v1.16.0 — 무엇을 볼지 고른다. 기본은 업무 API 요청만 -->
            <div class="btn-group btn-group-sm ms-2">
              <button v-for="k in ACTIVITY_KINDS" :key="k.value" type="button"
                      class="btn" :class="activityKind === k.value ? 'btn-primary' : 'btn-outline-secondary'"
                      :title="k.hint" @click="activityKind = k.value">{{ k.label }}</button>
            </div>
            <button type="button" class="btn btn-sm btn-link ms-auto" @click="activity = null; activityUser = null">
              {{ t('traceUi2.close') }}
            </button>
          </div>
          <!-- 카드 안에서만 스크롤한다 — 화면 전체가 끝없이 길어지지 않게 -->
          <div class="card-body activity-scroll" @scroll="onActivityScroll">
            <div v-if="activityLoadingMore" class="text-center small text-secondary py-2">
              <span class="spinner-border spinner-border-sm me-1"></span>더 옛날 기록을 불러오는 중…
            </div>
            <!-- 스크롤이 맨 위에서 시작하면 "위로 올리기" 이벤트가 나지 않는다.
                 그래서 누를 수 있는 단추를 함께 둔다 (스크롤로도, 눌러서도 된다). -->
            <div v-else-if="activityMore" class="text-center py-2">
              <button type="button" class="btn btn-sm btn-outline-secondary"
                      @click="loadActivity(activityUser, { append: true })">
                <i class="bi bi-arrow-up me-1"></i>더 옛날 기록 불러오기
              </button>
            </div>
            <div v-if="!activity.groups?.length" class="text-secondary small">{{ t('traceUi2.noRecords') }}</div>
            <div v-for="(g, gi) in activity.groups" :key="gi" class="mb-4">
              <div class="fw-semibold mb-2">
                <i class="bi bi-clock-history me-1"></i>
                {{ fmtTs(g.startedAt) }} — {{ fmt.time(g.endedAt) }}
                <span class="badge bg-secondary ms-1">{{ g.items.length }}건</span>
              </div>
              <ol class="trace-story">
                <li v-for="it in g.items" :key="it.requestId"
                    :class="`tone-${it.status >= 400 ? 'bad' : 'muted'}`"
                    style="cursor: pointer" :title="`${it.method} ${it.path} · ${it.status} · ${it.durationMs}ms`"
                    @click="lookup(it.requestId)">
                  <span class="trace-at">{{ fmt.time(it.ts) }}</span>
                  <i class="bi bi-dot"></i>
                  <span>{{ it.summary }}</span>
                  <!-- 눌러서 그 요청 하나만 파고들 수 있다는 것을 보이게 -->
                  <i class="bi bi-search ms-2 small opacity-50"></i>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 고른 진입 카드 표시 */
.mode-on { position: absolute; top: 8px; right: 10px; font-size: 11px; font-weight: 600;
  color: #fff; background: #3b5bdb; border-radius: 999px; padding: 1px 8px; }
.mode-card { position: relative; }

/* ★ v1.16.5 KPI 카드 */
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.kpi {
  display: flex; align-items: center; gap: 10px;
  background: var(--bs-body-bg, #fff); border: 1px solid var(--bs-border-color, #e3e6ec);
  border-radius: 10px; padding: 12px 14px;
}
.kpi-ico { font-size: 18px; opacity: .45; }
.kpi-v { font-size: 20px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
.kpi-l { font-size: 11.5px; color: var(--bs-secondary-color, #6b7280); margin-top: 2px; }
.kpi-bad { border-color: #f1aeb5; background: #fdf2f3; }
.kpi-bad .kpi-ico, .kpi-bad .kpi-v { color: #d0323f; opacity: 1; }

/* 사람의 행적은 금방 수백 줄이 된다 — 카드 안에서만 스크롤한다 */
.activity-scroll { max-height: 62vh; overflow-y: auto; }

/* 진입 카드 */
.mode-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: 12px 14px; text-align: left;
  background: var(--ax-surface, #fff);
  border: 1px solid var(--ax-border, #e6e9ef); border-radius: 10px;
  cursor: pointer; transition: border-color .12s ease, background .12s ease;
}
.mode-card:hover { background: var(--ax-hover, #f1f5f9); }
.mode-card.on {
  border-color: var(--primary-color, #1b84ff);
  background: color-mix(in srgb, var(--primary-color, #1b84ff) 7%, transparent);
}
.mode-card .bi { font-size: 1.15rem; }
.mode-card .t { font-weight: 640; font-size: .92rem; }
.mode-card .d { font-size: .74rem; color: var(--ax-text-muted, #6b7280); }

/* 규모 요약 띠 */
.stat-strip {
  display: flex; align-items: center; gap: 22px; flex-wrap: wrap;
  padding: 10px 14px; border: 1px solid var(--ax-border, #e6e9ef);
  border-radius: 10px; background: var(--ax-surface, #fff);
}
.stat-strip > div { display: flex; flex-direction: column; }
.stat-strip b { font-size: 1.05rem; font-variant-numeric: tabular-nums; line-height: 1.2; }
.stat-strip span { font-size: .7rem; color: var(--ax-text-muted, #6b7280); }
.stat-strip .bad b { color: #dc3545; }

.trace-story { list-style: none; margin: 0; padding: 0; }
.trace-story li {
  display: flex; align-items: baseline; gap: 8px;
  padding: 6px 0 6px 4px;
  border-left: 2px solid var(--ax-grid-line);
  padding-left: 14px;
  position: relative;
}
.trace-story li::before {
  content: ''; position: absolute; left: -5px; top: 12px;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--ax-border);
}
.trace-story li.tone-ok::before { background: #198754; }
.trace-story li.tone-bad::before { background: #dc3545; }
.trace-story li.tone-bad { color: #dc3545; }
.trace-at {
  font-family: var(--ax-font-mono);
  font-size: .72rem; color: var(--ax-text-muted);
  min-width: 66px; text-align: right; flex-shrink: 0;
}

.wf-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.wf-label {
  width: 220px; flex-shrink: 0;
  font-family: var(--ax-font-mono); font-size: .75rem;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wf-track {
  flex: 1; height: 14px; position: relative;
  background: var(--ax-grid-line); border-radius: 3px; overflow: hidden;
}
.wf-bar { position: absolute; top: 0; bottom: 0; border-radius: 3px; min-width: 2px; }
.wf-ms { width: 62px; flex-shrink: 0; font-size: .75rem; color: var(--ax-text-muted); }
</style>
