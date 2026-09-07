<script setup>
/**
 * DashboardPage — 서버 상태 요약 + control 기능.
 *
 *  카드:
 *   1) 서버 Control — 시작/중지/재시작 버튼 + 실시간 상태 + 실시간 스위치
 *
 *  Control API 는 supervisor 프로세스가 제공하는 별도 포트(기본 7902)로 호출한다.
 *  배포 환경/포트가 다를 수 있으므로 아래 우선순위로 URL 을 결정:
 *    1. localStorage.ctrlBaseUrl (사용자 명시 오버라이드)
 *    2. import.meta.env.VITE_CONTROL_BASE_URL
 *    3. 현재 origin 에서 7902 로 치환 (예: http://localhost:5173 → http://localhost:7902)
 *    4. http://127.0.0.1:7902
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
// ★ v1.10.13 — 다국어
import { useI18n } from '../composables/useI18n';

import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import http from '../api/http';
import CodeEditor from '../components/CodeEditor.vue';

import { useDuration } from '../utils/duration';   // ★ v1.19.0

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼

   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();


/* ★ v1.21.3 — 시간 표기 도우미 */
const { fmtDuration, fmtInterval } = useDuration();
const auth = useAuthStore();

/* ========== Control base URL 결정 ========== */
function resolveControlBase() {
  const manual = typeof localStorage !== 'undefined' && localStorage.getItem('ctrlBaseUrl');
  if (manual) return manual;
  const env = (import.meta.env && import.meta.env.VITE_CONTROL_BASE_URL) || '';
  if (env) return env;
  try {
    const loc = window.location;
    return `${loc.protocol}//${loc.hostname}:7902`;
  } catch { return 'http://127.0.0.1:7902'; }
}
const controlBase = ref(resolveControlBase());

/** control 용 axios 인스턴스 — 메인 API 와는 다른 baseURL.
 *  메인과 동일한 JWT 를 Authorization 헤더로 전달 (config.auth.accessSecret 공유). */
const ctrlHttp = computed(() => {
  const inst = axios.create({ baseURL: controlBase.value, timeout: 10_000 });
  inst.interceptors.request.use((cfg) => {
    const token = auth.accessToken;
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });
  return inst;
});

/* ========== 상태 ========== */
const status = ref(null);   // { running, pid, startedAt, uptimeSec, mainPort, controlPort, lastExit }
const loading = ref(false);
const error = ref(null);
const action = ref(null);   // 'start' | 'stop' | 'restart' 진행중

/* 로컬 시계 — uptime 을 초마다 갱신 */
const nowTick = ref(Date.now());
let tickTimer = null;

/* 실시간 폴링 */
const liveEnabled = ref(true);
const liveIntervalMs = ref(30_000);  // 기본 30초
let pollTimer = null;

async function loadStatus() {
  loading.value = true;
  error.value = null;
  try {
    const r = await ctrlHttp.value.get('/api/control/status');
    status.value = r.data?.data || null;
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
    // control 서버 자체에 접근 불가하면 상태를 null 로
    if (!e.response) status.value = null;
  } finally { loading.value = false; }
}

function startPolling() {
  stopPolling();
  if (!liveEnabled.value) return;
  pollTimer = setInterval(loadStatus, liveIntervalMs.value);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

watch(liveEnabled, (on) => { if (on) startPolling(); else stopPolling(); });
watch(liveIntervalMs, () => startPolling());

onMounted(() => {
  loadStatus();
  startPolling();
  tickTimer = setInterval(() => { nowTick.value = Date.now(); }, 1000);
});
onBeforeUnmount(() => {
  stopPolling();
  if (tickTimer) clearInterval(tickTimer);
});

/* ========== Control 액션 — Bootstrap confirm modal ========== */
const confirmModal = ref({
  open: false,
  action: null,       // 'start' | 'stop' | 'restart'
  title: '',
  message: '',
  btnLabel: '',
  btnClass: 'btn-primary',
});

function openConfirm(name) {
  if (action.value) return;
  const cfg = {
    start:   { title: t('dash2.startTitle'),   btnLabel: t('dash2.start'),   btnClass: 'btn-success',
               message: t('dash2.startMsg') },
    stop:    { title: t('dash2.stopTitle'),   btnLabel: t('dash2.stop'),   btnClass: 'btn-danger',
               message: t('dash2.stopMsg') },
    restart: { title: t('dash2.restartTitle'), btnLabel: t('dash2.restart'), btnClass: 'btn-warning',
               message: '메인 서버를 재시작하시겠습니까?\n기존 세션이 일시적으로 끊어집니다.' },
  }[name];
  confirmModal.value = { open: true, action: name, ...cfg };
}

function closeConfirm() {
  confirmModal.value.open = false;
  confirmModal.value.action = null;
}

async function confirmAndRun() {
  const name = confirmModal.value.action;
  closeConfirm();
  if (!name) return;
  await doAction(name);
}

async function doAction(name) {
  if (action.value) return;
  action.value = name;
  error.value = null;
  try {
    const r = await ctrlHttp.value.post(`/api/control/${name}`);
    status.value = r.data?.data || null;
    await new Promise(r => setTimeout(r, 500));
    await loadStatus();
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally { action.value = null; }
}

/* ========== 포맷 유틸 ========== */
/* ★ v1.19.0 — 시간 표기는 공통 모듈로 (한글이 박혀 있어 영어로 안 바뀌었다) */
function fmtTs(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* 실시간 경과 시간: status.startedAt 이 있으면 현재 시각과의 차이 */
const liveUptimeSec = computed(() => {
  if (!status.value?.running || !status.value?.startedAt) return null;
  return Math.max(0, Math.floor((nowTick.value - status.value.startedAt) / 1000));
});

/* ========== ★ v1.11.0 — 생존 감시 · 자동 재기동 (status.watchdog) ========== */
const wd = computed(() => status.value?.watchdog || null);
const wdHistoryOpen = ref(false);
const wdBadge = computed(() => {
  const w = wd.value;
  if (!w || !w.enabled) return { cls: 'bg-secondary', text: t('dash.wdOff'), icon: 'bi-eye-slash' };
  if (w.halted) return { cls: 'bg-danger', text: t('dash.wdHalted'), icon: 'bi-exclamation-octagon' };
  if (w.restarting) return { cls: 'bg-warning text-dark', text: t('dash.wdRestarting'), icon: 'bi-arrow-repeat spinning' };
  if (w.consecutiveFailures > 0) {
    return { cls: 'bg-warning text-dark', icon: 'bi-hourglass-split',
      text: t('dash.wdUnresponsive', { k: w.consecutiveFailures, n: w.failuresThreshold, sec: w.unresponsiveSec }) };
  }
  return { cls: 'bg-success', text: t('dash.wdWatching'), icon: 'bi-eye' };
});
function wdKindLabel(kind) {
  const key = `dash.wdKind_${kind}`;
  const v = t(key);
  return v === key ? kind : v;
}
function wdReasonLabel(reason) {
  if (!reason) return '';
  const key = `dash.wdReason_${reason}`;
  const v = t(key);
  return v === key ? reason : v;
}
function wdRowClass(h) {
  if (h.kind === 'restart') return h.ok === false ? 'table-danger' : 'table-warning';
  if (h.kind === 'halt') return 'table-danger';
  if (h.kind === 'recover' || h.kind === 'resume') return 'table-success';
  return '';
}

/* ========== ★ v1.11.0 — EAI 연결 카드 (/api/admin/system/mci) ========== */
const mci = ref(null);
const mciLoading = ref(false);
const mciError = ref(null);
async function loadMci() {
  mciLoading.value = true;
  try {
    const r = await http.get('/api/admin/system/mci');
    mci.value = r.data?.data || null;
    mciError.value = null;
  } catch (e) {
    mciError.value = e.response?.data?.message || e.message;
  } finally { mciLoading.value = false; }
}
const mciStateBadge = computed(() => {
  const m = mci.value;
  if (!m || m.enabled === false) return { cls: 'bg-secondary', text: t('dash.mciDisabled') };
  if (m.state === 'not-loaded') return { cls: 'bg-secondary', text: t('dash.mciNotLoaded') };
  if (m.state === 'idle') return { cls: 'bg-secondary', text: t('dash.mciIdle') };
  const map = { closed: 'bg-success', open: 'bg-danger', 'half-open': 'bg-warning text-dark', disabled: 'bg-secondary' };
  return { cls: map[m.state] || 'bg-secondary', text: t(`dash.mciState_${String(m.state).replace('-', '_')}`) };
});
let mciTimer = null;
watch(liveEnabled, (on) => { if (on) { clearInterval(mciTimer); mciTimer = setInterval(loadMci, liveIntervalMs.value); } else { clearInterval(mciTimer); mciTimer = null; } });
watch(liveIntervalMs, () => { if (liveEnabled.value) { clearInterval(mciTimer); mciTimer = setInterval(loadMci, liveIntervalMs.value); } });
onMounted(() => { loadMci(); if (liveEnabled.value) mciTimer = setInterval(loadMci, liveIntervalMs.value); });
onBeforeUnmount(() => { if (mciTimer) clearInterval(mciTimer); });

function saveCtrlBaseUrl(v) {
  if (v) { localStorage.setItem('ctrlBaseUrl', v); controlBase.value = v; }
  else   { localStorage.removeItem('ctrlBaseUrl'); controlBase.value = resolveControlBase(); }
  loadStatus();
}

/* ========== 환경설정 카드 ========== */
const configFiles = ref([]);         // [{ id, label, relPath, exists, size, mtime, requiresRestart, ... }]
const configLoading = ref(false);
const configError = ref(null);

async function loadConfigFiles() {
  configLoading.value = true;
  configError.value = null;
  try {
    const r = await http.get('/api/admin/config/files');
    configFiles.value = r.data?.data || [];
  } catch (e) {
    configError.value = e.response?.data?.message || e.message;
  } finally { configLoading.value = false; }
}

/* 편집 대화상자 상태 */
const configEditor = ref({
  open: false,
  activeId: null,      // 현재 선택된 탭 id
  files: {},           // { id: { content, originalContent, lang, exists, envPairs, ... } }
  saving: false,
  saveMsg: null,
  saveErr: null,
});

function openConfigEditor() {
  if (!configFiles.value.length) loadConfigFiles();
  configEditor.value = {
    open: true,
    activeId: configFiles.value[0]?.id || 'env',
    files: {},
    saving: false, saveMsg: null, saveErr: null,
  };
  // 첫 탭 즉시 로드
  if (configEditor.value.activeId) loadConfigTab(configEditor.value.activeId);
}

function closeConfigEditor() {
  // dirty 확인
  const anyDirty = Object.values(configEditor.value.files).some(f => f.content !== f.originalContent);
  if (anyDirty && !window.confirm('저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?')) return;
  configEditor.value.open = false;
}

async function loadConfigTab(id) {
  configEditor.value.activeId = id;
  if (configEditor.value.files[id]) return;   // 이미 로드됨
  configEditor.value.saveErr = null;
  try {
    const r = await http.get('/api/admin/config/file', { params: { id } });
    const d = r.data?.data || {};
    configEditor.value.files[id] = {
      ...d,
      originalContent: d.content || '',
      content: d.content || '',
    };
  } catch (e) {
    configEditor.value.saveErr = e.response?.data?.message || e.message;
  }
}

async function saveConfigTab() {
  const id = configEditor.value.activeId;
  const f = configEditor.value.files[id];
  if (!f) return;
  if (f.content === f.originalContent) {
    configEditor.value.saveMsg = '변경사항이 없습니다.';
    return;
  }
  configEditor.value.saving = true;
  configEditor.value.saveMsg = null;
  configEditor.value.saveErr = null;
  try {
    const r = await http.put('/api/admin/config/file', { id, content: f.content });
    const d = r.data?.data || {};
    f.originalContent = f.content;
    configEditor.value.saveMsg = `저장되었습니다 (${d.savedBytes} bytes${d.backup ? ', 백업: ' + d.backup : ''}). ${d.requiresRestart ? '변경 내용 반영을 위해 서버 재시작이 필요합니다.' : ''}`;
    // 파일 메타 갱신
    loadConfigFiles();
  } catch (e) {
    configEditor.value.saveErr = e.response?.data?.message || e.message;
  } finally {
    configEditor.value.saving = false;
  }
}

function discardConfigChanges() {
  const id = configEditor.value.activeId;
  const f = configEditor.value.files[id];
  if (f) f.content = f.originalContent;
}

const currentConfigFile = computed(() => configEditor.value.files[configEditor.value.activeId] || null);
const configTabDirty = computed(() => {
  const f = currentConfigFile.value;
  return f && f.content !== f.originalContent;
});

onMounted(() => {
  loadConfigFiles();
  refreshDbHealth();
});

/* ========== DB 헬스 상태 (상단 배지) ========== */
const dbHealth = ref({ ok: null });
const dbHealthLoading = ref(false);
async function refreshDbHealth() {
  dbHealthLoading.value = true;
  try {
    const r = await http.get('/api/admin/system/health');
    const data = r.data?.data || r.data || {};
    // 설정된 타입과 현재 adapter 가 다르면 폴백됐음 — 사용자에게 경고
    data.fallbackActive = data.configuredType
      && data.adapter
      && data.configuredType.toLowerCase() !== data.adapter.toLowerCase();
    dbHealth.value = data;
  } catch (e) {
    dbHealth.value = { ok: false, error: e.response?.data?.message || e.message || '알 수 없는 오류' };
  } finally {
    dbHealthLoading.value = false;
  }
}

const dbCardTooltip = computed(() => {
  const h = dbHealth.value;
  const lines = [];
  if (h.configuredType) lines.push(`설정된 DB 타입: ${h.configuredType}`);
  if (h.adapter)        lines.push(`현재 어댑터: ${h.adapter}`);
  if (h.host)           lines.push(`Host: ${h.host}${h.port ? ':' + h.port : ''}`);
  if (h.database || h.service) lines.push(`DB: ${h.database || h.service}`);
  if (h.fallbackActive) lines.push('⚠ 폴백 상태 — 설정과 실제 어댑터 불일치');
  if (h.error)          lines.push(`에러: ${h.error}`);
  return lines.join('\n');
});
</script>

<template>
  <div class="dashboard-page">
    <h4 class="mb-3"><i class="bi bi-speedometer2 text-primary me-2"></i>{{ t('dash.title') }}</h4>

    <!-- 서버 Control 카드 -->
    <div class="card mb-3">
      <div class="card-header d-flex align-items-center flex-wrap gap-2">
        <span><i class="bi bi-hdd-network text-primary me-2"></i>{{ t('dash.serverControl') }}</span>

        <!-- 상태 뱃지 -->
        <span v-if="status" class="ms-3">
          <span v-if="status.running" class="badge bg-success">
            <i class="bi bi-circle-fill me-1" style="font-size:8px"></i>RUNNING
          </span>
          <span v-else class="badge bg-danger">
            <i class="bi bi-circle-fill me-1" style="font-size:8px"></i>STOPPED
          </span>
          <span v-if="status.stopping" class="badge bg-warning text-dark ms-1">
            <span class="spinner-border spinner-border-sm me-1"></span>STOPPING
          </span>
        </span>
        <span v-else class="ms-3">
          <span class="badge bg-secondary">
            <i class="bi bi-question-circle me-1"></i>UNKNOWN
          </span>
        </span>

        <div class="ms-auto d-flex align-items-center gap-2">
          <div class="form-check form-switch mb-0">
            <input class="form-check-input" type="checkbox" id="dashLiveSwitch" v-model="liveEnabled" />
            <label class="form-check-label small" for="dashLiveSwitch">
              {{ t('dash.live') }}
              <span class="badge ms-1" :class="liveEnabled ? 'bg-success' : 'bg-secondary'">
                {{ liveEnabled ? 'ON' : 'OFF' }}
              </span>
            </label>
          </div>
          <select v-model.number="liveIntervalMs" class="form-select form-select-sm" style="width:100px" :disabled="!liveEnabled">
            <option :value="5000">{{ fmtInterval(5000) }}</option>
            <option :value="10000">{{ fmtInterval(10000) }}</option>
            <option :value="30000">{{ fmtInterval(30000) }}</option>
            <option :value="60000">{{ fmtInterval(60000) }}</option>
          </select>
          <button class="btn btn-sm btn-outline-secondary" @click="loadStatus" :disabled="loading">
            <i class="bi bi-arrow-clockwise"></i> {{ t('dash.reload') }}
          </button>
        </div>
      </div>

      <div class="card-body">
        <div v-if="error" class="alert alert-danger small mb-3">
          <i class="bi bi-exclamation-triangle me-1"></i>
          {{ error }}
          <div class="mt-1 text-secondary">{{ t('dash.controlUrl') }} <code>{{ controlBase }}</code></div>
        </div>

        <!-- 상태 정보 그리드 -->
        <div class="row g-3 mb-3" v-if="status">
          <div class="col-sm-6 col-md-3">
            <div class="stat-card">
              <div class="small text-secondary">PID</div>
              <div class="h5 mb-0">{{ status.pid ?? '—' }}</div>
            </div>
          </div>
          <div class="col-sm-6 col-md-3">
            <div class="stat-card">
              <div class="small text-secondary">{{ t('dash.startedAt') }}</div>
              <div class="h6 mb-0">{{ fmtTs(status.startedAt) }}</div>
            </div>
          </div>
          <div class="col-sm-6 col-md-3">
            <div class="stat-card">
              <div class="small text-secondary">{{ t('dash.uptime') }}</div>
              <div class="h5 mb-0 text-success">
                {{ liveUptimeSec !== null ? fmtDuration(liveUptimeSec) : '—' }}
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-md-3">
            <div class="stat-card">
              <div class="small text-secondary">{{ t('dash.port') }}</div>
              <div class="h6 mb-0">
                {{ t('dash.main') }} <strong>{{ status.mainPort ?? '—' }}</strong> /
                Control <strong>{{ status.controlPort ?? '—' }}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- 종료 이력 -->
        <div v-if="status && status.lastExit" class="alert alert-warning small mb-3">
          <i class="bi bi-info-circle me-1"></i>
          {{ t('bind.lastExit', { code: status.lastExit.code ?? '-', signal: status.lastExit.signal ?? '-' }) }}, at={{ fmtTs(status.lastExit.at) }}
        </div>

        <!-- ★ v1.11.0 — 생존 감시 · 자동 재기동 -->
        <div v-if="status" class="stat-card mb-3" :class="wd && wd.halted ? 'border-danger' : ''">
          <div class="d-flex align-items-center flex-wrap gap-2">
            <i class="bi bi-heart-pulse text-primary"></i>
            <span class="fw-semibold">{{ t('dash.wdTitle') }}</span>
            <span class="badge" :class="wdBadge.cls"><i class="bi me-1" :class="wdBadge.icon"></i>{{ wdBadge.text }}</span>
            <span v-if="wd && wd.enabled" class="small text-secondary">
              {{ t('dash.wdRule', { sec: Math.round((wd.intervalMs || 0) / 1000), n: wd.failuresThreshold }) }}
            </span>
            <button class="btn btn-sm btn-outline-secondary ms-auto" @click="wdHistoryOpen = !wdHistoryOpen">
              <i class="bi" :class="wdHistoryOpen ? 'bi-chevron-up' : 'bi-clock-history'"></i>
              {{ t('dash.wdHistory') }}
              <span v-if="wd && wd.history && wd.history.length" class="badge bg-secondary ms-1">{{ wd.history.length }}</span>
            </button>
          </div>

          <div v-if="wd && wd.halted" class="alert alert-danger small mt-2 mb-2">
            <i class="bi bi-exclamation-octagon me-1"></i>
            {{ t('dash.wdHaltedHint', { n: wd.maxRestartsPerHour }) }}
          </div>

          <div v-if="wd && wd.enabled" class="row g-2 mt-1">
            <div class="col-6 col-md-3">
              <div class="small text-secondary">{{ t('dash.wdAutoTotal') }}</div>
              <div class="h4 mb-0" :class="wd.autoRestarts.total > 0 ? 'text-warning' : ''">{{ wd.autoRestarts.total }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="small text-secondary">{{ t('dash.wdLastHour') }} / {{ t('dash.wdLast24h') }}</div>
              <div class="h5 mb-0">
                <span :class="wd.autoRestarts.lastHour > 0 ? 'text-danger fw-bold' : ''">{{ wd.autoRestarts.lastHour }}</span>
                <span class="text-secondary"> / </span>{{ wd.autoRestarts.last24h }}
                <span class="small text-secondary fw-normal">(max {{ wd.maxRestartsPerHour || '∞' }}/h)</span>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="small text-secondary">{{ t('dash.wdLastAuto') }}</div>
              <div class="h6 mb-0" v-if="wd.autoRestarts.last">
                {{ fmtTs(wd.autoRestarts.last.at) }}
                <span class="badge bg-warning text-dark ms-1">{{ wdReasonLabel(wd.autoRestarts.last.reason) }}</span>
              </div>
              <div class="h6 mb-0 text-secondary" v-else>{{ t('dash.wdNone') }}</div>
            </div>
            <div class="col-6 col-md-3">
              <div class="small text-secondary">{{ t('dash.wdManual') }} · {{ t('dash.wdLastCheck') }}</div>
              <div class="h6 mb-0">
                {{ status.restartCount ? status.restartCount.manual : 0 }}
                <span class="small text-secondary fw-normal ms-2">{{ wd.lastCheckAt ? fmtTs(wd.lastCheckAt) : '—' }}</span>
              </div>
            </div>
          </div>
          <div v-if="wd && wd.autoRestarts && wd.autoRestarts.last" class="small text-muted mt-2" style="word-break: break-all;">
            <i class="bi bi-chat-left-text me-1"></i>{{ wd.autoRestarts.last.detail }}
          </div>

          <div v-if="wdHistoryOpen" class="mt-2">
            <div v-if="!wd || !wd.history || !wd.history.length" class="small text-secondary">{{ t('dash.wdNoHistory') }}</div>
            <div v-else class="table-responsive" style="max-height: 260px; overflow:auto;">
              <table class="table table-sm table-hover small mb-1">
                <thead><tr><th style="width:150px">{{ t('dash.wdTime') }}</th><th style="width:120px">{{ t('dash.wdEvent') }}</th><th>{{ t('dash.wdDetail') }}</th></tr></thead>
                <tbody>
                  <tr v-for="(h, i) in wd.history" :key="i" :class="wdRowClass(h)">
                    <td class="text-nowrap">{{ fmtTs(h.at) }}</td>
                    <td>
                      <strong>{{ wdKindLabel(h.kind) }}</strong>
                      <span v-if="h.kind === 'restart' && h.ok === false" class="badge bg-danger ms-1">FAIL</span>
                      <div v-if="h.reason" class="text-secondary">{{ wdReasonLabel(h.reason) }}</div>
                    </td>
                    <td style="word-break: break-all;">
                      {{ h.detail }}
                      <span v-if="h.pid" class="text-secondary"> · pid {{ h.pid }}<span v-if="h.newPid"> → {{ h.newPid }}</span></span>
                      <span v-if="h.rssMb" class="text-secondary"> · rss {{ h.rssMb }}MB</span>
                      <span v-if="h.durationMs" class="text-secondary"> · {{ h.durationMs }}ms</span>
                      <!-- ★ 멈춘 지점의 JS 스택 — 재기동 직전에 밖에서 꺼낸 것 -->
                      <pre v-if="h.stack && h.stack.length" class="wd-stack mb-0 mt-1"><span v-for="(l, j) in h.stack" :key="j">at {{ l }}
</span></pre>
                      <div v-else-if="h.kind === 'restart' && h.reason === 'unresponsive'" class="text-secondary fst-italic">{{ t('dash.wdNoStack') }}<span v-if="h.dumpError"> — {{ h.dumpError }}</span></div>
                      <div v-if="h.reportWritten" class="text-secondary"><i class="bi bi-file-earmark-text me-1"></i>{{ t('dash.wdReportSaved') }}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="small text-secondary"><i class="bi bi-info-circle me-1"></i>{{ t('dash.wdReportHint') }}</div>
          </div>
        </div>

        <!-- 액션 버튼 -->
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-success" @click="openConfirm('start')"
                  :disabled="action !== null || (status && status.running)">
            <span v-if="action === 'start'" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-play-fill me-1"></i>
            {{ t('dash.start') }}
          </button>
          <button class="btn btn-danger" @click="openConfirm('stop')"
                  :disabled="action !== null || !(status && status.running)">
            <span v-if="action === 'stop'" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-stop-fill me-1"></i>
            {{ t('dash.stop') }}
          </button>
          <button class="btn btn-warning" @click="openConfirm('restart')"
                  :disabled="action !== null || !(status && status.running)">
            <span v-if="action === 'restart'" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-arrow-clockwise me-1"></i>
            {{ t('dash.restart') }}
          </button>

          <div class="ms-auto d-flex align-items-center gap-2">
            <label class="small text-secondary mb-0">Control URL</label>
            <input type="text" class="form-control form-control-sm" style="width:220px"
                   :value="controlBase"
                   @change="saveCtrlBaseUrl($event.target.value)" />
          </div>
        </div>

        <!-- DB 연결 상태 미니카드 (서버 Control 아래) -->
        <div class="stat-card mt-3 d-flex align-items-center"
             :class="dbHealth.ok === true ? 'border-success-subtle' : (dbHealth.ok === false ? 'border-danger-subtle' : '')"
             :title="dbCardTooltip">
          <i class="bi me-2"
             :class="dbHealth.ok === true ? 'bi-database-check text-success' :
                     dbHealth.ok === false ? 'bi-database-x text-danger' :
                     'bi-database text-secondary'"
             style="font-size: 1.4rem;"></i>
          <div class="flex-grow-1">
            <div class="small text-secondary">{{ t('dash.dbStatus') }}</div>
            <div class="fw-semibold">
              <span v-if="dbHealth.ok === true" class="text-success">{{ t('dash.ok') }}</span>
              <span v-else-if="dbHealth.ok === false" class="text-danger">{{ t('dash.failed') }}</span>
              <span v-else class="text-secondary">{{ t('dash.checking') }}</span>
              <span v-if="dbHealth.adapter" class="ms-2 small text-muted fw-normal">
                {{ dbHealth.adapter }}{{ dbHealth.host ? '@' + dbHealth.host : '' }}<!--
                -->{{ dbHealth.database ? '/' + dbHealth.database : '' }}
              </span>
              <span v-if="dbHealth.fallbackActive"
                    class="badge bg-warning text-dark ms-2 small"
                    :title="t('dash.typeMismatch')">
                {{ t('dash.fellBack') }}
              </span>
            </div>
            <div v-if="dbHealth.ok === false && dbHealth.error"
                 class="small text-danger mt-1"
                 style="word-break: break-all;">
              {{ dbHealth.error }}
            </div>
          </div>
          <button class="btn btn-sm btn-outline-secondary ms-2" @click="refreshDbHealth" :disabled="dbHealthLoading"
                  :title="t('dash.recheck')">
            <i class="bi" :class="dbHealthLoading ? 'bi-arrow-repeat spinning' : 'bi-arrow-clockwise'"></i>
          </button>
        </div>

        <div class="small text-secondary mt-3">
          <i class="bi bi-info-circle me-1"></i>
          {{ t('dash.supervisorNote') }}
        </div>
      </div>
    </div>

    <!-- ★ v1.11.0 — EAI 연결 카드 -->
    <div class="card mb-3">
      <div class="card-header d-flex align-items-center flex-wrap gap-2">
        <span><i class="bi bi-diagram-3 text-primary me-2"></i>{{ t('dash.mciTitle') }}</span>
        <span class="badge ms-2" :class="mciStateBadge.cls">{{ mciStateBadge.text }}</span>
        <span v-if="mci && mci.host" class="small text-secondary">
          {{ t('dash.mciTarget') }} <code>{{ mci.host }}:{{ mci.port }}</code>
          <span v-if="mci.pool"> · {{ t('dash.mciMode') }} <code>{{ mci.pool.mode }}</code></span>
        </span>
        <button class="btn btn-sm btn-outline-secondary ms-auto" @click="loadMci" :disabled="mciLoading">
          <i class="bi" :class="mciLoading ? 'bi-arrow-repeat spinning' : 'bi-arrow-clockwise'"></i>
        </button>
      </div>
      <div class="card-body" v-if="mci && mci.pool">
        <div v-if="mci.breaker && mci.breaker.state === 'open'" class="alert alert-danger small mb-3">
          <i class="bi bi-lightning-charge me-1"></i>
          {{ t('dash.mciOpenFor', { sec: Math.ceil((mci.breaker.retryAfterMs || 0) / 1000), n: mci.breaker.consecutiveFailures }) }}
        </div>
        <div v-if="mci.txGuardWarnings > 0" class="alert alert-warning small mb-3">
          {{ t('dash.mciTxWarn', { n: mci.txGuardWarnings }) }}
        </div>
        <div class="row g-3">
          <div class="col-sm-6 col-md-3">
            <div class="stat-card">
              <div class="small text-secondary">{{ t('dash.mciConn') }}</div>
              <div class="h6 mb-0">
                {{ t('dash.mciActive') }} <strong>{{ mci.pool.active }}</strong>/{{ mci.pool.max }} ·
                {{ t('dash.mciIdleConn') }} <strong>{{ mci.pool.idle }}</strong> ·
                {{ t('dash.mciQueued') }} <strong :class="mci.pool.queued > 0 ? 'text-warning' : ''">{{ mci.pool.queued }}</strong>/{{ mci.pool.maxQueue }}
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-md-3">
            <div class="stat-card">
              <div class="small text-secondary">{{ t('dash.mciRequests') }} / {{ t('dash.mciFailures') }}</div>
              <div class="h6 mb-0">
                {{ mci.counters.requests }} /
                <span :class="mci.counters.transportFailures > 0 ? 'text-danger' : ''">{{ mci.counters.transportFailures }}</span>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-md-3">
            <div class="stat-card">
              <div class="small text-secondary">{{ t('dash.mciRetries') }} / {{ t('dash.mciRejected') }}</div>
              <div class="h6 mb-0">
                {{ mci.counters.retries }} /
                <span :class="(mci.counters.rejectedByCircuit + mci.counters.rejectedByQueue) > 0 ? 'text-warning' : ''">
                  {{ mci.counters.rejectedByCircuit + mci.counters.rejectedByQueue }}
                </span>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-md-3">
            <div class="stat-card">
              <div class="small text-secondary">{{ t('dash.mciLastOk') }} · {{ t('dash.mciLoopLag') }}</div>
              <div class="h6 mb-0">
                {{ mci.lastSuccessAt ? fmtTs(mci.lastSuccessAt) : '—' }}
                <span v-if="mci.loopLag" class="small text-secondary fw-normal ms-1">p99 {{ mci.loopLag.p99Ms }}ms</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="mci.lastError" class="small mt-2" :class="mci.state === 'closed' ? 'text-muted' : 'text-danger'" style="word-break: break-all;">
          <i class="bi bi-exclamation-circle me-1"></i>{{ t('dash.mciLastError') }}: {{ fmtTs(mci.lastError.at) }} · {{ mci.lastError.phase }} · {{ mci.lastError.message }}
        </div>
      </div>
      <div class="card-body small text-secondary" v-else>
        <span v-if="mciError" class="text-danger">{{ mciError }}</span>
        <span v-else>{{ mciStateBadge.text }}</span>
      </div>
    </div>

    <!-- ───── 환경설정 카드 ───── -->
    <div class="card mb-3">
      <div class="card-header d-flex align-items-center flex-wrap gap-2">
        <span><i class="bi bi-sliders text-primary me-2"></i>{{ t('dash.settings') }}</span>
        <small class="text-secondary">
          <span v-html="t('dash.configHelp', { restart: t('dash.restart') })"></span>
          <span class="ms-2 text-muted" v-html="t('dash.dbTypeHint')"></span>
        </small>
        <div class="ms-auto d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" @click="loadConfigFiles" :disabled="configLoading">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
          <button class="btn btn-sm btn-primary" @click="openConfigEditor">
            <i class="bi bi-pencil-square me-1"></i>{{ t('common.edit') }}
          </button>
        </div>
      </div>
      <div class="card-body">
        <div v-if="configError" class="alert alert-danger small mb-2">{{ configError }}</div>
        <table class="table table-sm table-hover mb-0 align-middle">
          <thead class="small text-secondary">
            <tr>
              <th>{{ t('dash.colFile') }}</th>
              <th>{{ t('dash.colDesc') }}</th>
              <th class="text-end" style="width:80px">{{ t('dash.colState') }}</th>
              <th class="text-end" style="width:100px">{{ t('dash.colSize') }}</th>
              <th style="width:170px">{{ t('dash.colMtime') }}</th>
              <th class="text-end" style="width:90px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="configLoading">
              <td colspan="6" class="text-center text-secondary py-3">
                <span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}
              </td>
            </tr>
            <tr v-else-if="!configFiles.length">
              <td colspan="6" class="text-center text-secondary py-3">{{ t('dash2.noConfigFiles') }}</td>
            </tr>
            <tr v-for="f in configFiles" :key="f.id">
              <td>
                <!-- .env 는 단순 label + 마우스 호버/클릭 시 tooltip 으로 실제 경로/인코딩 표시 -->
                <template v-if="f.id === 'env'">
                  <code
                    style="cursor: help; border-bottom: 1px dotted #888;"
                    :title="(f.absPath || t('dash2.pathUnknown')) + '\n' + t('dash2.encoding') + ': ' + (f.encoding || 'unknown') + (f.loadedFiles && f.loadedFiles.length > 1 ? '\n\n⚠ 다중 로드: ' + f.loadedFiles.join('\n') : '')"
                    @click="() => { const el = document.getElementById('env-path-detail-' + f.id); if (el) el.style.display = (el.style.display === 'block' ? 'none' : 'block'); }">
                    .env
                  </code>
                  <span v-if="f.encoding && f.encoding !== 'UTF-8'"
                        class="badge bg-warning text-dark ms-2"
                        :title="t('dash2.notUtf8')">
                    {{ f.encoding }}
                  </span>
                  <div :id="'env-path-detail-' + f.id"
                       class="small text-muted mt-1"
                       style="display: none; font-family: monospace; word-break: break-all;">
                    📁 {{ f.absPath || t('bind.noFileLoaded') }}
                    <span v-if="f.encoding" class="ms-2 badge bg-light text-dark border">{{ f.encoding }}</span>
                    <div v-if="f.loadedFiles && f.loadedFiles.length > 1" class="text-warning mt-1">
                      <i class="bi bi-exclamation-triangle"></i>
                      {{ t('bind.multiLoad', { n: f.loadedFiles.length }) }}
                    </div>
                  </div>
                </template>
                <code v-else>{{ f.label }}</code>
              </td>
              <td class="small text-secondary">{{ f.descKey ? t('configFiles.' + f.descKey) : f.description }}</td>
              <td class="text-end">
                <span v-if="f.exists" class="badge bg-success">{{ t('dash2.present') }}</span>
                <span v-else class="badge bg-secondary">{{ t('dash2.absent') }}</span>
              </td>
              <td class="text-end small">{{ f.exists ? (f.size + ' B') : '-' }}</td>
              <td class="small text-secondary">{{ f.mtime ? fmtTs(new Date(f.mtime).getTime()) : '-' }}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-primary"
                        @click="openConfigEditor(); configEditor.activeId = f.id; loadConfigTab(f.id);">
                  <i class="bi bi-pencil"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ───── 환경설정 편집 대화상자 ───── -->
    <div v-if="configEditor.open" class="modal-backdrop fade show" @click="closeConfigEditor"></div>
    <div v-if="configEditor.open" class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true">
      <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-sliders me-2"></i>{{ t('dash.settings') }} 편집
            </h5>
            <button type="button" class="btn-close" @click="closeConfigEditor"></button>
          </div>
          <div class="modal-body" style="padding:0">
            <!-- 파일 탭 -->
            <ul class="nav nav-tabs px-3 pt-2" style="font-size:13px">
              <li v-for="f in configFiles" :key="f.id" class="nav-item">
                <button class="nav-link py-1"
                        :class="{ active: configEditor.activeId === f.id }"
                        @click="loadConfigTab(f.id)">
                  <i class="bi bi-file-code me-1"></i>{{ f.label }}
                  <span v-if="configEditor.files[f.id] && configEditor.files[f.id].content !== configEditor.files[f.id].originalContent"
                        class="badge bg-warning text-dark ms-1" :title="t('dash2.unsaved')">*</span>
                </button>
              </li>
            </ul>

            <!-- 메시지 / 에러 -->
            <div v-if="configEditor.saveMsg" class="alert alert-success small mx-3 mt-2 mb-0">
              <i class="bi bi-check-circle me-1"></i>{{ configEditor.saveMsg }}
            </div>
            <div v-if="configEditor.saveErr" class="alert alert-danger small mx-3 mt-2 mb-0">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ configEditor.saveErr }}
            </div>

            <!-- 현재 탭 내용 -->
            <div v-if="currentConfigFile" class="px-3 py-2">
              <div class="small text-secondary mb-2">
                <code>{{ currentConfigFile.relPath }}</code>
                <span v-if="!currentConfigFile.exists" class="ms-2 text-warning">
                  <i class="bi bi-info-circle me-1"></i>{{ t('dash2.willCreate') }}
                </span>
              </div>
              <!-- .env 인 경우: envPairs 요약 표시 (secret 마스킹) -->
              <details v-if="configEditor.activeId === 'env' && currentConfigFile.envPairs && currentConfigFile.envPairs.length" class="mb-2">
                <summary class="small text-secondary" style="cursor:pointer">
                  <i class="bi bi-key me-1"></i>{{ t('bind.envSummary', { n: currentConfigFile.envPairs.length }) }}
                </summary>
                <table class="table table-sm mt-2 mb-0">
                  <thead class="small text-secondary"><tr><th>Key</th><th>Value</th></tr></thead>
                  <tbody>
                    <tr v-for="p in currentConfigFile.envPairs" :key="p.key">
                      <td class="small"><code>{{ p.key }}</code>
                        <span v-if="p.isSecret" class="badge bg-warning text-dark ms-1 small">secret</span>
                      </td>
                      <td class="small text-break" style="max-width:480px">{{ p.value }}</td>
                    </tr>
                  </tbody>
                </table>
              </details>

              <!-- 코드 에디터 -->
              <div style="height:55vh; min-height:380px;">
                <CodeEditor v-model="currentConfigFile.content"
                            :language="currentConfigFile.lang === 'javascript' ? 'javascript' : 'plaintext'" />
              </div>
            </div>
            <div v-else class="p-4 text-center text-secondary">
              <span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary"
                    @click="discardConfigChanges" :disabled="!configTabDirty">
              <i class="bi bi-arrow-counterclockwise me-1"></i>{{ t('dash2.discard') }}
            </button>
            <button type="button" class="btn btn-secondary" @click="closeConfigEditor">{{ t('common.close') }}</button>
            <button type="button" class="btn btn-primary"
                    @click="saveConfigTab"
                    :disabled="configEditor.saving || !configTabDirty">
              <span v-if="configEditor.saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-save me-1"></i>
              저장
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bootstrap 5 확인 모달 — alert/confirm 대체 -->
    <div v-if="confirmModal.open" class="modal-backdrop fade show" @click="closeConfirm"></div>
    <div v-if="confirmModal.open" class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-question-circle text-warning me-2"></i>{{ confirmModal.title }}
            </h5>
            <button type="button" class="btn-close" @click="closeConfirm" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="mb-0" style="white-space:pre-line">{{ confirmModal.message }}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeConfirm">{{ t('common.cancel') }}</button>
            <button type="button" class="btn" :class="confirmModal.btnClass" @click="confirmAndRun">
              {{ confirmModal.btnLabel }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page { padding-bottom: 24px; }
.card-header { background: #f8f9fb; }
.stat-card {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 10px 14px;
  background: #ffffff;
  height: 100%;
}
.spinning { animation: spin 1.2s linear infinite; display: inline-block; }
.wd-stack { font-size: 11px; line-height: 1.35; background: #fff8e6; border: 1px solid #ffe8a8; border-radius: 4px; padding: 6px 8px; white-space: pre; overflow-x: auto; max-height: 140px; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
/* Bootstrap modal: v-if 로 띄울 때 z-index 보정 */
.modal.d-block { z-index: 1055; }
.modal-backdrop.show { opacity: 0.5; }
</style>
