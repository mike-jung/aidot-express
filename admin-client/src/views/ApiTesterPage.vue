<script setup>
import { confirmDialog } from '../composables/useConfirm';
/**
 * ApiTesterPage — 좌측 메뉴 "API 테스터".
 *
 *  좌측 탭: 라우트 / 히스토리 / 즐겨찾기
 *  우측: 선택된 라우트(또는 히스토리 항목)의 호출 폼
 */
import { ref, computed, onMounted, watch } from 'vue';
import http from '../api/http';
import ApiCallForm from '../components/ApiCallForm.vue';
import Pagination from '../components/Pagination.vue';
import {
  listHistory, getHistoryItem, saveHistoryItem,
  toggleFavorite, setLabel, deleteHistoryItem, clearHistory,
} from '../utils/historyStore';
import { useI18n } from '../composables/useI18n';

/* ★ v1.20.0 — t() 를 쓰면 선언도 있어야 한다. 없으면 화면을 여는 순간 죽는다. */
const { t } = useI18n();

const loading = ref(false);
const error = ref(null);
const controllers = ref([]);

const search = ref('');
const showAdmin = ref(false);
const showUser = ref(true);
const tab = ref('routes');  // 'routes' | 'history' | 'favorites'

// 탭별 페이지 상태 (라우트는 컨트롤러 단위, 히스토리/즐겨찾기는 항목 단위)
const routePage = ref(1);
const historyPage = ref(1);
const favoritePage = ref(1);
const ROUTES_PER_PAGE = 5;       // 컨트롤러 5개씩
const HISTORY_PER_PAGE = 15;     // 히스토리 항목 15개씩

// (watch 는 computed 선언 이후로 이동 — 아래 참조)

// 우측에 띄울 라우트 + (선택적) prefill
const selectedRoute = ref(null);
const prefill = ref(null);

const history = ref([]);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/routes');
    controllers.value = r.data.data || [];
    refreshHistory();
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally {
    loading.value = false;
  }
}

function refreshHistory() {
  history.value = listHistory();
}

const filteredControllers = computed(() => {
  const q = search.value.trim().toLowerCase();
  const out = [];
  for (const c of controllers.value) {
    if (c.isAdmin && !showAdmin.value) continue;
    if (!c.isAdmin && !showUser.value) continue;
    const matched = c.routes.filter((r) => {
      if (!q) return true;
      const hay = `${r.method} ${r.fullPath} ${r.handler} ${c.controllerName}`.toLowerCase();
      return hay.includes(q);
    });
    if (matched.length) out.push({ ...c, routes: matched });
  }
  return out;
});

const totalRoutes = computed(() => filteredControllers.value.reduce((s, c) => s + c.routes.length, 0));

const filteredHistory = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = tab.value === 'favorites'
    ? history.value.filter((h) => h.isFavorite)
    : history.value;
  if (!q) return list;
  return list.filter((h) => {
    const hay = `${h.method} ${h.fullPath} ${h.label || ''}`.toLowerCase();
    return hay.includes(q);
  });
});

/* ──── paged computed ──── */
const routeTotalPages = computed(() => Math.max(1, Math.ceil(filteredControllers.value.length / ROUTES_PER_PAGE)));
const pagedControllers = computed(() => {
  const start = (routePage.value - 1) * ROUTES_PER_PAGE;
  return filteredControllers.value.slice(start, start + ROUTES_PER_PAGE);
});

const historyTotalPages = computed(() => Math.max(1, Math.ceil(filteredHistory.value.length / HISTORY_PER_PAGE)));
const currentHistoryPage = computed({
  get: () => tab.value === 'favorites' ? favoritePage.value : historyPage.value,
  set: (v) => { if (tab.value === 'favorites') favoritePage.value = v; else historyPage.value = v; },
});
const pagedHistory = computed(() => {
  const start = (currentHistoryPage.value - 1) * HISTORY_PER_PAGE;
  return filteredHistory.value.slice(start, start + HISTORY_PER_PAGE);
});

// 검색/필터/탭 변경 시 페이지 리셋
watch([search, showAdmin, showUser], () => { routePage.value = 1; });
watch([search, tab], () => { historyPage.value = 1; favoritePage.value = 1; });

function pickRoute(route, controllerName) {
  selectedRoute.value = { ...route, controllerName };
  prefill.value = null;
}

/** 히스토리 항목 클릭 → 우측 폼에 그대로 채움 */
function pickHistoryItem(metaItem) {
  const detail = getHistoryItem(metaItem.id);
  if (!detail) return;
  selectedRoute.value = {
    method: detail.method,
    fullPath: detail.fullPath,
    handler: '(history)',
    controllerName: 'history',
  };
  prefill.value = {
    pathParams: detail.pathParams || {},
    queryParams: detail.queryParams || [],
    headers: detail.headers || [],
    body: detail.body || '',
  };
}

/** ApiCallForm 이 호출 끝낼 때마다 자동 저장 */
function onApiCalled(callDetails) {
  saveHistoryItem(callDetails);
  refreshHistory();
}

function onToggleFavorite(item) {
  toggleFavorite(item.id);
  refreshHistory();
}

function onLabelEdit(item) {
  const newLabel = prompt(t('designer.api_labelAsk'), item.label || '');
  if (newLabel === null) return;
  setLabel(item.id, newLabel.trim());
  refreshHistory();
}

async function onDeleteHistory(item) {
  if (!await confirmDialog({ title: t('designer.api_delRecord'), message: t('designer.api_delRecordAsk'), detail: `${item.method || ''} ${item.path || item.url || ''}`.trim(), confirmText: t('designer.cf_delete'), variant: 'danger' })) return;
  deleteHistoryItem(item.id);
  refreshHistory();
}

async function onClearHistory() {
  if (!await confirmDialog({ title: t('apiTester.k18'), message: t('apiTester.k19'), detail: t('designer.api_favKept'), confirmText: t('apiTester.k8'), variant: 'danger' })) return;
  clearHistory({ keepFavorites: true });
  refreshHistory();
}

function methodBadgeClass(method) {
  switch ((method || '').toUpperCase()) {
    case 'GET':    return 'bg-success';
    case 'POST':   return 'bg-primary';
    case 'PUT':    return 'bg-warning text-dark';
    case 'PATCH':  return 'bg-info text-dark';
    case 'DELETE': return 'bg-danger';
    default:       return 'bg-secondary';
  }
}

function statusBadgeClass(s) {
  if (s == null) return 'bg-secondary';
  if (s >= 200 && s < 300) return 'bg-success';
  if (s >= 300 && s < 400) return 'bg-info text-dark';
  if (s >= 400 && s < 500) return 'bg-warning text-dark';
  return 'bg-danger';
}

function fmtTs(ms) {
  if (!ms) return '-';
  const d = new Date(ms);
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60_000) return t('designer.api_secAgo').replace('{n}', Math.floor(diff / 1000));
  if (diff < 3_600_000) return t('designer.api_minAgo').replace('{n}', Math.floor(diff / 60_000));
  if (diff < 86_400_000) return t('designer.api_hourAgo').replace('{n}', Math.floor(diff / 3_600_000));
  return d.toLocaleString('sv-SE').slice(5, 16);
}

onMounted(load);
</script>

<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <span>
        <i class="bi bi-send me-2"></i>{{ t('apiTester.k1') }}
        <small v-if="tab === 'routes'" class="text-secondary ms-2">{{ t('designer.api_routesOf').replace('{n}', totalRoutes).replace('{total}', controllers.reduce((s,c) => s + c.routes.length, 0)) }}</small>
        <small v-else-if="tab === 'history'" class="text-secondary ms-2">{{ t('designer.api_calls').replace('{n}', history.length) }}</small>
        <small v-else class="text-secondary ms-2">{{ t('designer.api_favorites').replace('{n}', history.filter(h => h.isFavorite).length) }}</small>
      </span>
      <button class="btn btn-sm btn-outline-secondary" @click="load" :disabled="loading">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
    </div>
    <div class="card-body">
      <div v-if="error" class="alert alert-danger small">{{ error }}</div>

      <div class="row g-3">
        <!-- 좌측 패널 -->
        <div class="col-lg-5">
          <!-- 탭 -->
          <ul class="nav nav-pills nav-fill mb-2" style="font-size:13px">
            <li class="nav-item"><button class="nav-link py-1" :class="{ active: tab === 'routes' }" @click="tab = 'routes'">
              <i class="bi bi-list me-1"></i>{{ t('apiTester.k2') }}
            </button></li>
            <li class="nav-item"><button class="nav-link py-1" :class="{ active: tab === 'history' }" @click="tab = 'history'">
              <i class="bi bi-clock-history me-1"></i>{{ t('apiTester.k3') }}
            </button></li>
            <li class="nav-item"><button class="nav-link py-1" :class="{ active: tab === 'favorites' }" @click="tab = 'favorites'">
              <i class="bi bi-star me-1"></i>{{ t('apiTester.k4') }}
            </button></li>
          </ul>

          <!-- 검색 -->
          <input v-model="search" type="text" class="form-control form-control-sm mb-2"
                 :placeholder="t('apiTester.k12')" />

          <!-- 라우트 탭의 추가 필터 -->
          <div v-if="tab === 'routes'" class="mb-2 d-flex gap-3 small">
            <label class="form-check"><input type="checkbox" class="form-check-input me-1" v-model="showUser" /> {{ t('apiTester.k5') }}</label>
            <label class="form-check"><input type="checkbox" class="form-check-input me-1" v-model="showAdmin" /> {{ t('apiTester.k6') }}</label>
          </div>

          <!-- 히스토리 탭의 컨트롤 -->
          <div v-if="tab === 'history'" class="mb-2 d-flex justify-content-between small">
            <span class="text-secondary">{{ t('apiTester.k7') }}</span>
            <button class="btn btn-sm btn-outline-danger py-0" @click="onClearHistory">
              <i class="bi bi-trash me-1"></i>{{ t('apiTester.k8') }}
            </button>
          </div>

          <!-- 라우트 트리 -->
          <div v-if="tab === 'routes'" style="max-height:600px; overflow-y:auto">
            <div v-if="loading" class="text-center text-secondary py-4">
              <span class="spinner-border spinner-border-sm me-2"></span>{{ t('apiTester.k9') }}
            </div>
            <div v-else-if="!filteredControllers.length" class="text-center text-secondary small py-4">
              {{ t('apiTester.k10') }}
            </div>
            <div v-else>
              <div v-for="c in pagedControllers" :key="c.controllerName" class="mb-2">
                <div class="px-2 py-1 small text-secondary fw-bold"
                     style="background:#f6f7f9; border-bottom:1px solid #e8eaee">
                  <i :class="c.isAdmin ? 'bi-shield-lock text-warning' : 'bi-folder'" class="bi me-1"></i>
                  {{ c.controllerName }}
                  <small class="text-secondary fw-normal ms-1">{{ c.basePath }}</small>
                </div>
                <button v-for="r in c.routes"
                        :key="`${c.controllerName}::${r.method}::${r.fullPath}`"
                        class="route-item w-100 text-start border-0 px-2 py-1 d-flex align-items-center"
                        :class="{ active: selectedRoute && selectedRoute.controllerName === c.controllerName
                                 && selectedRoute.method === r.method && selectedRoute.fullPath === r.fullPath }"
                        @click="pickRoute(r, c.controllerName)">
                  <span class="badge me-2" :class="methodBadgeClass(r.method)" style="width:54px">{{ r.method }}</span>
                  <code class="small flex-grow-1" style="color:#2b2f3a">{{ r.fullPath }}</code>
                  <small class="text-secondary ms-2">{{ r.handler }}</small>
                </button>
              </div>
            </div>
          </div>

          <!-- 라우트 탭 페이지네이션 -->
          <div v-if="tab === 'routes'" class="mt-2">
            <Pagination v-model:page="routePage" :total-pages="routeTotalPages" :window-size="10" />
            <div class="text-center small text-secondary mt-1">
              {{ t('designer.api_ctrlRange').replace('{from}', filteredControllers.length ? ((routePage - 1) * ROUTES_PER_PAGE) + 1 : 0).replace('{to}', Math.min(routePage * ROUTES_PER_PAGE, filteredControllers.length)).replace('{total}', filteredControllers.length) }}
            </div>
          </div>

          <!-- 히스토리/즐겨찾기 -->
          <div v-else style="max-height:600px; overflow-y:auto">
            <div v-if="!filteredHistory.length" class="text-center text-secondary small py-4">
              {{ tab === 'favorites' ? t('apiTester.k15') : t('apiTester.k16') }}
            </div>
            <div v-for="h in pagedHistory" :key="h.id"
                 class="history-item px-2 py-2 border-bottom"
                 @click="pickHistoryItem(h)">
              <div class="d-flex align-items-center mb-1">
                <span class="badge me-2" :class="methodBadgeClass(h.method)" style="width:54px">{{ h.method }}</span>
                <span v-if="h.status" class="badge me-2" :class="statusBadgeClass(h.status)">{{ h.status }}</span>
                <code class="small flex-grow-1 text-truncate" style="color:#2b2f3a">{{ h.fullPath }}</code>
                <button class="btn btn-link p-0 ms-1" @click.stop="onToggleFavorite(h)" :title="h.isFavorite ? t('apiTester.k17') : t('apiTester.k4')">
                  <i :class="h.isFavorite ? 'bi-star-fill text-warning' : 'bi-star text-secondary'" class="bi"></i>
                </button>
                <button class="btn btn-link p-0 ms-1 text-secondary" @click.stop="onLabelEdit(h)" :title="t('apiTester.k13')">
                  <i class="bi bi-tag"></i>
                </button>
                <button class="btn btn-link p-0 ms-1 text-danger" @click.stop="onDeleteHistory(h)" :title="t('apiTester.k14')">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
              <div class="d-flex justify-content-between small text-secondary">
                <span>
                  <span v-if="h.label" class="badge bg-light text-dark me-1">{{ h.label }}</span>
                  <span v-if="h.timeMs">{{ h.timeMs }}ms</span>
                </span>
                <span>{{ fmtTs(h.timestamp) }}</span>
              </div>
            </div>
          </div>

          <!-- 히스토리/즐겨찾기 페이지네이션 -->
          <div v-if="tab !== 'routes'" class="mt-2">
            <Pagination v-model:page="currentHistoryPage" :total-pages="historyTotalPages" :window-size="10" />
            <div class="text-center small text-secondary mt-1">
              {{ ((currentHistoryPage - 1) * HISTORY_PER_PAGE) + 1 }}-{{ Math.min(currentHistoryPage * HISTORY_PER_PAGE, filteredHistory.length) }} / {{ filteredHistory.length }}
            </div>
          </div>
        </div>

        <!-- 우측 패널 — 호출 폼 -->
        <div class="col-lg-7">
          <div v-if="!selectedRoute" class="text-center text-secondary py-5 border rounded">
            <i class="bi bi-arrow-left fs-3 d-block mb-2"></i>
            {{ t('apiTester.k11') }}
          </div>
          <div v-else>
            <div class="mb-2 small text-secondary">
              <strong>{{ selectedRoute.controllerName }}</strong> · {{ selectedRoute.handler }}
            </div>
            <ApiCallForm :route="selectedRoute"
                         :prefill="prefill"
                         :key="`${selectedRoute.method}::${selectedRoute.fullPath}::${prefill ? Date.now() : ''}`"
                         @called="onApiCalled" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.route-item {
  background: transparent;
  cursor: pointer;
  transition: background 0.1s;
  border-radius: 0;
}
.route-item:hover { background: #eef0f3; }
.route-item.active { background: #e0e9ff; }

.history-item {
  cursor: pointer;
  transition: background 0.1s;
}
.history-item:hover { background: #f6f7f9; }

.nav-pills .nav-link {
  color: #6c757d;
  background: transparent;
  border: 1px solid transparent;
}
.nav-pills .nav-link.active {
  background: #e0e9ff;
  color: #1b84ff;
}
</style>
