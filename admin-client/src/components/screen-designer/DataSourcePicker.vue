<script setup>
/**
 * DataSourcePicker (Phase 8) — Widget 의 source 를 설정하는 편집기.
 *
 *  Phase 6 과의 차이:
 *   - Service / SQL 탭은 **별도의 선택 옵션이 아님** (의미 없으므로 제거)
 *   - 대신 Controller 탭 내부에서 선택된 컨트롤러의 참조 Service/SQL 정보를
 *     자동으로 찾아 "참고 정보" 로 표시
 *   - 사용자는 Controller 또는 변수 중 하나만 선택하면 됨 (탭 2개)
 *
 *  props:
 *    spec          : ScreenSpec (customVars 접근용)
 *    initialSource : 현재 widget 의 source 또는 null
 *  emits:
 *    apply(newSource)
 *    clear()
 *    close()
 */
import { ref, computed, onMounted, watch } from 'vue';
// ★ v1.10.22 — 다국어
import { useI18n } from '../../composables/useI18n';

import http from '../../api/http';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

const props = defineProps({
  spec:          { type: Object, required: true },
  initialSource: { type: Object, default: null },
});
const emit = defineEmits(['apply', 'clear', 'close']);

/* ─── 탭 ─── */
const activeTab = ref(initialTab());
function initialTab() {
  const s = props.initialSource;
  if (!s) return 'controller';
  if (s.type === 'customVar') return 'variable';
  return 'controller';
}

/* ═════════════════ Controller 탭 ═════════════════ */

const ctrlRows = ref([]);
const ctrlLoading = ref(false);
const ctrlError = ref(null);
const ctrlSearch = ref('');

const selectedCtrlId = ref(null);
const selectedCtrlDetail = ref(null);
const selectedRouteIdx = ref(null);
const resultKey = ref('');
/** 선택한 컨트롤러가 실시간(SSE) 스트림 라우트를 갖고 있는가 */
const realtimeRoute = computed(() =>
  (selectedCtrlDetail.value?.routes || []).find((r) => r.type === 'sse') || null);
const useRealtime = ref(true);      // 스트림이 있으면 기본 사용

// Phase 8: 참조 Service / SQL 정보
const dependencies = ref(null);   // { services: [...], sqls: [...] }
const loadingDeps = ref(false);
const depTab = ref('services');   // 'services' | 'sqls' | 'none'

async function loadCtrlList() {
  ctrlLoading.value = true;
  ctrlError.value = null;
  try {
    const r = await http.get('/api/admin/controllers/paged', { params: { page: 1, perPage: 200 } });
    ctrlRows.value = r.data?.data || [];
  } catch (e) {
    ctrlError.value = e.response?.data?.message || e.message;
  } finally {
    ctrlLoading.value = false;
  }
}

async function loadCtrlDetail(id) {
  if (!id) { selectedCtrlDetail.value = null; return; }
  try {
    const r = await http.get(`/api/admin/controllers/${encodeURIComponent(id)}`);
    selectedCtrlDetail.value = r.data?.data || null;
  } catch (e) {
    ctrlError.value = `${t('designer.ctrlLoadFailed')}: ${e.response?.data?.message || e.message}`;
  }
}

/** Phase 8: 컨트롤러 + 특정 handler 에 대한 참조 Service/SQL 을 서버에서 조회 */
async function loadDependencies(controllerName, handler) {
  dependencies.value = null;
  if (!controllerName || !handler) return;
  loadingDeps.value = true;
  try {
    const r = await http.get('/api/admin/screen-wizard/analyze', {
      params: { controllerId: controllerName, handler },
    });
    dependencies.value = r.data?.data?.dependencies || { services: [], sqls: [] };
  } catch (e) {
    // 의존성 분석 실패는 조용히 무시 (라우트 선택 자체는 문제없음)
    dependencies.value = { services: [], sqls: [] };
  } finally {
    loadingDeps.value = false;
  }
}

function onSelectCtrl(row) {
  selectedCtrlId.value = row.id;
  selectedRouteIdx.value = null;
  dependencies.value = null;
  loadCtrlDetail(row.id);
}

watch(selectedRouteIdx, (idx) => {
  if (idx != null && selectedCtrlDetail.value) {
    const r = selectedCtrlDetail.value.routes?.[idx];
    if (r) loadDependencies(selectedCtrlDetail.value.name || selectedCtrlId.value, r.handler);
  }
});

const filteredCtrls = computed(() => {
  const q = ctrlSearch.value.trim().toLowerCase();
  if (!q) return ctrlRows.value;
  return ctrlRows.value.filter((r) => {
    const hay = [r.name, r.base_path, r.basePath, r.description].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
});

const selectedFullPath = computed(() => {
  if (!selectedCtrlDetail.value || selectedRouteIdx.value == null) return null;
  const base = selectedCtrlDetail.value.base_path || selectedCtrlDetail.value.basePath || '';
  const r = (selectedCtrlDetail.value.routes || [])[selectedRouteIdx.value];
  if (!r) return null;
  const p = r.path === '/' || r.path === '' ? '' : r.path;
  return {
    method: (r.method || 'GET').toUpperCase(),
    path: `${base}${p}`,
    handler: r.handler || null,
  };
});

const isMutation = computed(() => {
  if (!selectedFullPath.value) return false;
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(selectedFullPath.value.method);
});

function preselectFromSource() {
  const s = props.initialSource;
  if (!s || s.type !== 'endpoint') return;
  if (s.controllerId != null) {
    selectedCtrlId.value = s.controllerId;
    loadCtrlDetail(s.controllerId).then(() => tryMatchRoute());
  } else if (s.path) {
    const ctrl = ctrlRows.value.find((c) => {
      const base = c.base_path || c.basePath || '';
      return base && s.path.startsWith(base);
    });
    if (ctrl) {
      selectedCtrlId.value = ctrl.id;
      loadCtrlDetail(ctrl.id).then(() => tryMatchRoute());
    }
  }
  if (s.resultKey) resultKey.value = s.resultKey;
  if (typeof s.realtime === 'boolean') useRealtime.value = s.realtime;
}

function tryMatchRoute() {
  const s = props.initialSource;
  if (!s || s.type !== 'endpoint' || !selectedCtrlDetail.value) return;
  const base = selectedCtrlDetail.value.base_path || selectedCtrlDetail.value.basePath || '';
  const routes = selectedCtrlDetail.value.routes || [];
  const idx = routes.findIndex((r) => {
    const p = r.path === '/' || r.path === '' ? '' : r.path;
    return `${base}${p}` === s.path && (r.method || 'GET').toUpperCase() === (s.method || 'GET').toUpperCase();
  });
  if (idx >= 0) selectedRouteIdx.value = idx;
}

function applyCtrlSelection() {
  if (!selectedFullPath.value) return;
  const { method, path, handler } = selectedFullPath.value;
  // 실시간: 컨트롤러에 SSE 라우트가 있고 체크되어 있으면 구독 주소를 함께 넘긴다.
  //   생성된 화면은 change 이벤트를 받을 때마다 목록을 다시 읽는다 (수동 새로고침 불필요).
  const base = selectedCtrlDetail.value?.base_path || selectedCtrlDetail.value?.basePath || '';
  const rt = realtimeRoute.value;
  const streamPath = rt ? `${base}${rt.path === '/' ? '' : rt.path}` : null;

  emit('apply', {
    type: 'endpoint',
    method, path,
    resultKey: resultKey.value.trim() || null,
    controllerId: selectedCtrlId.value,
    handlerName: handler,
    realtime: !!(rt && useRealtime.value),
    streamPath: rt && useRealtime.value ? streamPath : null,
  });
}

/* ═════════════════ 변수 탭 ═════════════════ */

const customVars = computed(() => Array.isArray(props.spec?.customVars) ? props.spec.customVars : []);
const selectedVarName = ref((props.initialSource?.type === 'customVar') ? props.initialSource.varName : null);

function applyVarSelection() {
  if (!selectedVarName.value) return;
  emit('apply', { type: 'customVar', varName: selectedVarName.value });
}

/* ─── 생명주기 ─── */

onMounted(async () => {
  await loadCtrlList();
  preselectFromSource();
});

/* ─── 유틸 ─── */

function methodBadgeClass(method) {
  const m = (method || 'GET').toUpperCase();
  return {
    'GET':    'bg-success',
    'POST':   'bg-warning text-dark',
    'PUT':    'bg-info text-dark',
    'PATCH':  'bg-info text-dark',
    'DELETE': 'bg-danger',
  }[m] || 'bg-secondary';
}

const hasExistingSource = computed(() => !!props.initialSource);
</script>

<template>
  <div class="data-source-picker">

    <!-- 탭 헤더 — Phase 8: Controller / 변수 2개만 -->
    <ul class="nav nav-tabs nav-fill small">
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'controller' }"
                @click="activeTab = 'controller'">
          <i class="bi bi-diagram-3 me-1"></i>Controller
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'variable' }"
                @click="activeTab = 'variable'">
          <i class="bi bi-braces me-1"></i>{{ t('dsp.variables') }}
        </button>
      </li>
    </ul>

    <!-- 탭 바디 -->
    <div class="tab-body">

      <!-- Controller 탭 -->
      <div v-if="activeTab === 'controller'">
        <!-- 검색 -->
        <div class="mb-2">
          <div class="input-group input-group-sm">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input v-model="ctrlSearch" class="form-control" :placeholder="t('designer.searchCtrl')" />
          </div>
        </div>

        <div v-if="ctrlError" class="alert alert-danger small py-2">{{ ctrlError }}</div>

        <div v-if="ctrlLoading" class="text-center text-secondary small py-2">
          <span class="spinner-border spinner-border-sm me-1"></span>{{ t('dsp.loadingList') }}
        </div>

        <!-- 컨트롤러 목록 -->
        <div v-if="!ctrlLoading" class="ctrl-list">
          <div v-if="!filteredCtrls.length" class="text-secondary small text-center py-3">
            <span v-if="ctrlSearch">{{ t('designer.noResultFor').replace('{q}', ctrlSearch) }}</span>
            <span v-else>{{ t('dsp.noControllers') }}</span>
          </div>
          <label v-for="c in filteredCtrls" :key="c.id" class="ctrl-item"
                 :class="{ selected: selectedCtrlId === c.id }">
            <input type="radio" :value="c.id"
                   :checked="selectedCtrlId === c.id" @change="onSelectCtrl(c)" />
            <div class="ctrl-info">
              <div class="ctrl-name">{{ c.name }}</div>
              <div class="ctrl-path"><code>{{ c.base_path || c.basePath || '-' }}</code></div>
            </div>
          </label>
        </div>

        <!-- 라우트 선택 -->
        <div v-if="selectedCtrlDetail" class="routes-block">
          <div class="section-label">{{ t('dsp.pickRoute') }}</div>
          <div v-if="!(selectedCtrlDetail.routes || []).length" class="text-secondary small">
            {{ t('dsp.noRoutes') }}
          </div>
          <label v-for="(r, i) in (selectedCtrlDetail.routes || [])" :key="i" class="route-item"
                 :class="{ selected: selectedRouteIdx === i }">
            <input type="radio" :value="i"
                   :checked="selectedRouteIdx === i" @change="selectedRouteIdx = i" />
            <span class="badge route-method" :class="methodBadgeClass(r.method)">
              {{ (r.method || 'GET').toUpperCase() }}
            </span>
            <code class="route-path">{{ r.path || '/' }}</code>
            <span v-if="r.handler" class="text-secondary small route-handler">{{ r.handler }}</span>
          </label>
        </div>

        <!-- 참조 Service / SQL (Phase 8 추가) -->
        <div v-if="selectedRouteIdx != null" class="deps-block">
          <div class="section-label d-flex align-items-center">
            <span>{{ t('dsp.refServiceSql') }}</span>
            <span v-if="loadingDeps" class="spinner-border spinner-border-sm ms-2" style="width:0.7em;height:0.7em;"></span>
            <span class="badge bg-light text-secondary border ms-1" title="read-only">{{ t('dsp.forReference') }}</span>
          </div>

          <template v-if="dependencies">
            <ul class="nav nav-pills nav-sm mb-1">
              <li class="nav-item">
                <button class="nav-link btn-sm" :class="{ active: depTab === 'services' }"
                        @click="depTab = 'services'">
                  Services ({{ dependencies.services.length }})
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link btn-sm" :class="{ active: depTab === 'sqls' }"
                        @click="depTab = 'sqls'">
                  SQLs ({{ dependencies.sqls.length }})
                </button>
              </li>
            </ul>

            <!-- Services 리스트 -->
            <div v-if="depTab === 'services'" class="dep-panel">
              <div v-if="!dependencies.services.length" class="text-secondary small">
                {{ t('dsp.noServiceDetected') }}
              </div>
              <details v-for="svc in dependencies.services" :key="svc.name" class="dep-item">
                <summary>
                  <i class="bi bi-gear me-1"></i>
                  <strong>{{ svc.name }}</strong>
                  <span v-if="svc.sqlIds && svc.sqlIds.length" class="text-secondary ms-1">
                    · {{ t('designer.sqlRefs').replace('{n}', svc.sqlIds.length) }}
                  </span>
                </summary>
                <div class="dep-content">
                  <div v-if="svc.file" class="dep-file"><code>{{ svc.file }}</code></div>
                  <pre class="dep-code"><code>{{ svc.preview }}</code></pre>
                </div>
              </details>
            </div>

            <!-- SQLs 리스트 -->
            <div v-if="depTab === 'sqls'" class="dep-panel">
              <div v-if="!dependencies.sqls.length" class="text-secondary small">
                {{ t('dsp.noSqlDetected') }}
              </div>
              <details v-for="sql in dependencies.sqls" :key="sql.fileBase" class="dep-item">
                <summary>
                  <i class="bi bi-database me-1"></i>
                  <strong>{{ sql.fileBase }}</strong>
                  <span v-if="sql.queryIds && sql.queryIds.length" class="text-secondary ms-1">
                    · {{ sql.queryIds.join(', ') }}
                  </span>
                </summary>
                <div class="dep-content">
                  <div v-if="sql.file" class="dep-file"><code>{{ sql.file }}</code></div>
                  <pre class="dep-code"><code>{{ sql.content }}</code></pre>
                </div>
              </details>
            </div>
          </template>
        </div>

        <!-- 선택 요약 + 적용 -->
        <div v-if="selectedFullPath" class="summary-block">
          <div class="section-label">{{ t('dsp.selectedSource') }}</div>
          <div class="summary-line">
            <span class="badge" :class="methodBadgeClass(selectedFullPath.method)">
              {{ selectedFullPath.method }}
            </span>
            <code class="ms-2">{{ selectedFullPath.path }}</code>
          </div>

          <div v-if="isMutation" class="alert alert-warning small mt-2 py-2">
            <i class="bi bi-exclamation-triangle me-1"></i>
            이 라우트는 <strong>{{ selectedFullPath.method }}</strong> 이므로 서버 데이터를 변경할 수 있습니다.
            {{ t('designer.writeWarn2') }}
          </div>

          <div class="mt-2">
            <label class="form-label small mb-1">
              {{ t('dsp.resultKey') }} <span class="text-secondary">{{ t('dsp.optional') }}</span>
            </label>
            <input v-model="resultKey" class="form-control form-control-sm"
                   placeholder="rows, data, items" />
            <div class="form-text">
              {{ t('designer.resultKeyHint') }}
            </div>
          </div>

          <!-- 실시간 자동 갱신 — 컨트롤러에 SSE 스트림이 있을 때만 보인다 -->
          <div v-if="realtimeRoute" class="mt-3 p-2 rounded" style="background:#eef6ff;border:1px solid #b6d4fe">
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" id="dsRealtime" v-model="useRealtime" />
              <label class="form-check-label small fw-bold" for="dsRealtime">
                <i class="bi bi-broadcast me-1"></i>{{ t('dsp.liveRefresh') }}
              </label>
            </div>
            <div class="form-text mb-0">
              {{ t('designer.liveAvail') }}
              {{ t('designer.liveReread') }}
              <span class="d-block mt-1 text-secondary">{{ t('dsp.subscribeUrl') }} <code>{{ (selectedCtrlDetail?.base_path || selectedCtrlDetail?.basePath || '') + (realtimeRoute.path === '/' ? '' : realtimeRoute.path) }}</code></span>
            </div>
          </div>

          <div class="mt-3">
            <button class="btn btn-primary btn-sm w-100" @click="applyCtrlSelection">
              <i class="bi bi-check-lg me-1"></i>{{ t('dsp.applySource') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 변수 탭 -->
      <div v-else-if="activeTab === 'variable'">
        <div class="section-label">{{ t('designer.projectVars') }} ({{ customVars.length }})</div>

        <div v-if="!customVars.length" class="text-secondary small py-2">
          {{ t('dsp.noUserVars') }}
          {{ t('designer.projectVarsHint') }}
        </div>

        <div v-else class="var-list">
          <label v-for="v in customVars" :key="v.name" class="var-item"
                 :class="{ selected: selectedVarName === v.name }">
            <input type="radio" :value="v.name"
                   :checked="selectedVarName === v.name" @change="selectedVarName = v.name" />
            <div class="var-info">
              <div class="var-name"><code>{{ v.name }}</code></div>
              <div v-if="v.expression" class="var-expr">= {{ v.expression }}</div>
            </div>
          </label>
        </div>

        <div v-if="selectedVarName" class="mt-3">
          <button class="btn btn-primary btn-sm w-100" @click="applyVarSelection">
            <i class="bi bi-check-lg me-1"></i>{{ t('dsp.applyVariable') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 공통 푸터 -->
    <div class="picker-footer">
      <button v-if="hasExistingSource" class="btn btn-outline-danger btn-sm" @click="emit('clear')">
        <i class="bi bi-trash me-1"></i>{{ t('designer.clearDataSource') }}
      </button>
      <button class="btn btn-link btn-sm text-secondary ms-auto" @click="emit('close')">
        {{ t('designer.cancelEdit') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.data-source-picker {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: #fff;
  overflow: hidden;
}

.tab-body {
  padding: 0.75rem;
  max-height: 600px;
  overflow-y: auto;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 0.75rem 0 0.5rem;
}
.section-label:first-child { margin-top: 0; }

.ctrl-list {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid #f1f5f9;
  border-radius: 0.25rem;
}
.ctrl-item {
  display: flex; align-items: flex-start; gap: 0.5rem;
  padding: 0.4rem 0.6rem; cursor: pointer;
  border-bottom: 1px solid #f8fafc; margin: 0;
}
.ctrl-item:last-child { border-bottom: none; }
.ctrl-item:hover { background: #f8fafc; }
.ctrl-item.selected { background: #eff6ff; }
.ctrl-item input[type=radio] { margin-top: 0.25rem; }
.ctrl-info { flex: 1; min-width: 0; }
.ctrl-name { font-weight: 500; font-size: 0.875rem; }
.ctrl-path { font-size: 0.75rem; color: #6b7280; }
.ctrl-path code { background: transparent; padding: 0; }

.routes-block { margin-top: 0.5rem; }
.route-item {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.35rem 0.5rem; cursor: pointer;
  border-radius: 0.25rem; margin: 0;
}
.route-item:hover { background: #f8fafc; }
.route-item.selected { background: #eff6ff; }
.route-method {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.7rem;
  flex-shrink: 0;
  min-width: 3rem;
  text-align: center;
}
.route-path {
  font-size: 0.8rem;
  color: #1e293b;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.route-handler {
  font-size: 0.7rem;
  font-family: ui-monospace, Menlo, Consolas, monospace;
}

/* Phase 8: 참조 deps 블록 */
.deps-block {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #e5e7eb;
}
.deps-block .nav-pills { gap: 0.25rem; }
.deps-block .nav-pills .nav-link {
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 0.25rem;
  background: #f1f5f9;
  color: #475569;
  border: none;
}
.deps-block .nav-pills .nav-link.active { background: #0d6efd; color: white; }

.dep-panel { padding: 0.25rem 0; }
.dep-item {
  border: 1px solid #f1f5f9;
  border-radius: 0.25rem;
  padding: 0.4rem 0.6rem;
  margin-bottom: 0.3rem;
  background: #fafbfc;
}
.dep-item summary {
  cursor: pointer;
  font-size: 0.8rem;
  user-select: none;
}
.dep-content {
  margin-top: 0.4rem;
  padding-top: 0.4rem;
  border-top: 1px dashed #e5e7eb;
}
.dep-file { font-size: 0.7rem; color: #6b7280; margin-bottom: 0.3rem; }
.dep-file code { background: transparent; padding: 0; }
.dep-code {
  background: #f8fafc;
  padding: 0.5rem;
  border-radius: 0.25rem;
  max-height: 240px;
  overflow: auto;
  font-size: 0.7rem;
  line-height: 1.4;
  margin: 0;
}
.dep-code code { background: transparent; padding: 0; color: #0f172a; }

.summary-block {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed #e5e7eb;
}
.summary-line code { font-size: 0.85rem; }

.var-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #f1f5f9;
  border-radius: 0.25rem;
}
.var-item {
  display: flex; align-items: flex-start; gap: 0.5rem;
  padding: 0.4rem 0.6rem; cursor: pointer;
  border-bottom: 1px solid #f8fafc; margin: 0;
}
.var-item:last-child { border-bottom: none; }
.var-item:hover { background: #f8fafc; }
.var-item.selected { background: #f5f3ff; }
.var-info { flex: 1; min-width: 0; }
.var-name { font-size: 0.875rem; }
.var-expr { font-size: 0.75rem; color: #6b7280; font-family: ui-monospace, monospace; }

.picker-footer {
  padding: 0.5rem 0.75rem;
  border-top: 1px solid #e5e7eb;
  background: #fafbfc;
  display: flex;
  align-items: center;
}
</style>
