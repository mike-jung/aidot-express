<script setup>
import { confirmDelete } from '../composables/useConfirm';
import { notifyError, notifyWarning } from '../composables/useNotify';
import { ref, onMounted, watch , computed} from 'vue';
// ★ v1.10.5 — 다국어
import { useI18n } from '../composables/useI18n';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import http from '../api/http';
import { useOnlyWorkspace } from '../composables/useOnlyWorkspace';
import { useBlocklist } from '../composables/useBlocklist';
import Pagination from '../components/Pagination.vue';
import ControllerEditor from './ControllerEditor.vue';
import ApiTester from '../components/ApiTester.vue';
import ControllerFlowDialog from '../components/ControllerFlowDialog.vue';
import { useUiFlagsStore } from '../stores/uiFlags';
import LoadStateCell from '../components/LoadStateCell.vue';   // ★ v1.28.1
import { useLoadState } from '../composables/useLoadState';

const router = useRouter();

/* ★ v1.28.1 — 직접 넣은 파일이 서버에 올라왔는지 줄마다 보여 준다 */
const loadState = useLoadState('controller');
/* 안 올라온 것만 보기 스위치가 켜지면 그것만 남긴다 */
const visibleRows = computed(() => loadState.filterRows(rows.value));
const route = useRoute();
const uiFlags = useUiFlagsStore();
const { mciGeneratorEnabled } = storeToRefs(uiFlags);

const { t } = useI18n();

const page = ref(1);
const perPage = ref(10);
const rows = ref([]);
const { onlyWorkspace, originParam } = useOnlyWorkspace();   // ★ v1.11.7 [내 것만] 스위치
/* ★ v1.13.0 — 막기/풀기 */
const { refresh: refreshBlocked, isBlocked, infoOf, block, unblock } = useBlocklist('controllers');
async function onToggleBlock(r) {
  if (isBlocked(r.name)) {
    if (!window.confirm(`${r.name} 을(를) 다시 켤까요?\n\n라우트가 바로 살아납니다.`)) return;
    await unblock(r.name);
    await load();
    return;
  }
  const reason = window.prompt(
    `${r.name} 을(를) 막습니다.\n\n` +
    `· 이 컨트롤러의 라우트가 **지금 바로** 사라집니다 (서버는 계속 돕니다)\n` +
    `· 서버를 다시 켜도 이 파일을 읽지 않습니다\n` +
    `· 파일은 지우지 않으므로 언제든 다시 켤 수 있습니다\n\n` +
    `사유를 적어 주세요 (로그와 목록에 남습니다):`, '보안 점검');
  if (reason === null) return;
  await block(r.name, reason);
  await load();
}
/* ★ v1.12.1 — 이름으로 조회. 서비스·SQL 화면에는 v1.7.8 부터 있었는데 여기만 빠져 있었다
   (컨트롤러가 제일 많은데도). 서버에서 전체를 대상으로 찾는다. */
const q = ref(String(route.query.q || ''));
let qTimer = null;
watch(q, () => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { page.value = 1; load(); }, 250);
});
watch(onlyWorkspace, () => { page.value = 1; load(); });
const header = ref({ total: 0, page: 1, perPage: 10, totalPages: 0 });
const loading = ref(false);
const error = ref(null);

// API 테스터 모달
const testingController = ref(null);  // null = 닫힘, 객체 = 열림

// 플로우 대화상자 모달
const flowController = ref(null); // null = 닫힘, 객체 = 열림

// 모달 상태
const showEditor = ref(false);
const editingId = ref(null); // null = 신규

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/controllers/paged', {
      params: { page: page.value, perPage: perPage.value, q: q.value.trim() || undefined, ...originParam() },
    });
    rows.value = r.data.data || [];
    loadState.refresh();   // ★ v1.28.1 각 줄의 로딩 상태
    header.value = r.data.header || header.value;
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally {
    loading.value = false;
  }
}

/**
 * controller_type 문자열을 {main, old} 로 분해.
 *   'DB'        → { main: 'DB',  old: false }
 *   'MCI'       → { main: 'MCI', old: false }
 *   'DB OLD'    → { main: 'DB',  old: true  }   ← legacy 컨트롤러
 *   'MCI OLD'   → { main: 'MCI', old: true  }
 *   null/empty  → { main: 'DB',  old: false }   (안전한 기본값)
 */
function splitType(row) {
  const raw = (row?.controller_type || 'DB').toString().trim();
  const old = /\s+OLD$/i.test(raw);
  const main = old ? raw.replace(/\s+OLD$/i, '').trim() || 'DB' : raw;
  return { main, old };
}

/**
 * Phase 37 (patch-16): 유형별 배지 색상 클래스.
 *   DB  → badge-ctrl-type-db  (연파랑 — 기존 badge-ctrl-type 와 동일 팔레트)
 *   MCI → badge-ctrl-type-mci (초록 — 외부 시스템 통신 의미 강조)
 *   그 외 → badge-ctrl-type-other (회색)
 */
function badgeClassForType(main) {
  const m = String(main || '').toUpperCase();
  if (m === 'DB')  return 'badge-ctrl-type-db';
  if (m === 'MCI') return 'badge-ctrl-type-mci';
  return 'badge-ctrl-type-other';
}

function openCreate() {
  editingId.value = null;
  showEditor.value = true;
}
function openEdit(row) {
  // EAI 컨트롤러는 전용 편집 페이지로 이동 (분석 메타 기반으로 모든 매핑 재편집)
  if (row.controller_type === 'MCI') {
    if (!mciGeneratorEnabled.value) {
      notifyWarning('EAI 생성기가 꺼져 있습니다', '서버 .env 에 MCI_GENERATOR_ENABLED=true 를 설정한 뒤 다시 시작하세요.');
      return;
    }
    router.push({ name: 'mci-controller-edit', params: { id: row.id } });
    return;
  }
  editingId.value = row.id;
  showEditor.value = true;
}
async function openTest(row) {
  // 라우터 등록되지 않은 컨트롤러는 호출 불가
  if (!row.registered) {
    notifyWarning('테스트할 수 없습니다', '이 컨트롤러는 라우터에 등록되어 있지 않습니다.');
    return;
  }
  // 라우트 정보가 행에 이미 있지만, 메타에서 가져온 것이라 오래되었을 수 있음
  // → 최신 등록 상태를 다시 조회
  try {
    const r = await http.get(`/api/admin/controllers/${row.id}`);
    testingController.value = r.data.data;
  } catch (e) {
    notifyError('요청 실패', e);
  }
}
async function openFlow(row) {
  // 플로우 시각화: 최신 상세 정보를 조회하여 routes / autowired_services 를 확보
  try {
    const r = await http.get(`/api/admin/controllers/${row.id}`);
    flowController.value = r.data.data;
  } catch (e) {
    notifyError('요청 실패', e);
  }
}
// Phase 25: 파라미터 분석은 ControllerFlowDialog 의 "파라미터" 탭으로 이동.
//  이전의 별도 openParams 모달은 제거 — 동일 대화상자에서 플로우/파라미터 탭 전환.
async function onSaved() {
  showEditor.value = false;
  await load();
}
async function onDelete(row) {
  if (!await confirmDelete(row.name, { title: t('controllerList.k16'), detail: '파일과 라우터에서 모두 제거됩니다. 되돌릴 수 없습니다.', requireText: row.name })) return;
  try {
    await http.delete(`/api/admin/controllers/${row.id}`);
    await load();
  } catch (e) {
    notifyError('요청 실패', e);
  }
}

watch(page, load);
watch(perPage, () => { page.value = 1; load(); });
onMounted(() => { refreshBlocked(); load(); });
</script>

<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <span>
        <i class="bi bi-diagram-3 me-2"></i>{{ t('controllerList.k1') }}
        <small class="text-secondary ms-2">{{ t('common.totalN', { n: header.total }) }}</small>
      </span>
      <div class="d-flex gap-2 align-items-center">
            <button v-if="loadState.hasUnloaded.value" type="button"
                    class="btn btn-sm btn-outline-primary me-2"
                    :disabled="loadState.busy.value"
                    :title="t('loadState.loadAllHint')"
                    @click="loadState.loadAllOfKind().then(() => load())">
              <i :class="loadState.busy.value ? 'bi bi-hourglass-split' : 'bi bi-box-arrow-in-down'" class="me-1"></i>
              {{ t('loadState.loadAll') }} ({{ loadState.unloadedCount.value }})
            </button>
            <div v-if="loadState.hasUnloaded.value" class="form-check form-switch mb-0 me-1"
                 :title="t('loadState.unloadedHint')">
              <input id="onlyUnloaded" v-model="loadState.onlyUnloaded.value" class="form-check-input" type="checkbox" />
              <label class="form-check-label small" for="onlyUnloaded">
                {{ t('loadState.onlyUnloaded') }}
                <span class="text-warning-emphasis">({{ loadState.unloadedCount.value }})</span>
              </label>
            </div>
        <div class="form-check form-switch mb-0 me-1" :title="t('origin.onlyWorkspaceHint')">
          <input id="onlyWs" v-model="onlyWorkspace" class="form-check-input" type="checkbox" role="switch" />
          <label class="form-check-label small" for="onlyWs">
            {{ t('origin.onlyWorkspace') }}
            <span v-if="onlyWorkspace && header.hiddenBuiltin" class="text-secondary">({{ t('origin.hiddenBuiltin', { n: header.hiddenBuiltin }) }})</span>
          </label>
        </div>
        <select v-model.number="perPage" class="form-select form-select-sm" style="width:90px">
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
        <button class="btn btn-sm btn-outline-secondary" @click="load" :disabled="loading">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button class="btn btn-sm btn-primary" @click="openCreate">
          <i class="bi bi-plus-lg me-1"></i>{{ t('controllerList.newController') }}
        </button>
      </div>
    </div>
    <div class="card-body">
      <div v-if="error" class="alert alert-danger small">{{ error }}</div>

      <!-- ★ v1.12.1 — 이름으로 조회 (서비스·SQL 화면과 같은 자리·같은 모양) -->
      <div class="input-group input-group-sm mb-2" style="max-width:320px">
        <span class="input-group-text"><i class="bi bi-search"></i></span>
        <input v-model="q" type="text" class="form-control" :placeholder="t('serviceList.filterByName')" />
        <button v-if="q" class="btn btn-outline-secondary" :title="t('serviceList.clear')" @click="q = ''">
          <i class="bi bi-x-lg"></i></button>
      </div>


      <!-- ★ v1.31.0 — 여러 개를 올릴 때 진행률을 보여 준다.
           예전에는 누르고 나면 화면이 멈춘 듯 보였고, 다 올린 뒤에는
           "안 올라온 것만" 에 남는 것이 없어 **빈 화면**이 됐다. -->
      <div v-if="loadState.busy.value" class="alert alert-info py-2 px-3 small mb-2">
        <div class="d-flex align-items-center gap-2">
          <span class="spinner-border spinner-border-sm"></span>
          <span>
            {{ t('loadState.loading') }}
            <strong>{{ loadState.progress.done }}</strong> / {{ loadState.progress.total }}
            <span v-if="loadState.progress.current" class="text-secondary">— {{ loadState.progress.current }}</span>
          </span>
        </div>
        <div class="progress mt-2" style="height:4px">
          <div class="progress-bar" role="progressbar"
               :style="{ width: (loadState.progress.total ? (loadState.progress.done / loadState.progress.total * 100) : 0) + '%' }"></div>
        </div>
      </div>
      <div v-if="loadState.notice.value" class="alert alert-success py-2 px-3 small mb-2 d-flex align-items-start gap-2">
        <i class="bi bi-check2-circle mt-1"></i>
        <span class="flex-grow-1">{{ loadState.notice.value }}</span>
        <button type="button" class="btn-close btn-sm" @click="loadState.notice.value = ''"></button>
      </div>
      <div v-if="loadState.lastError.value" class="alert alert-warning py-2 px-3 small mb-2 d-flex align-items-start gap-2">
        <i class="bi bi-exclamation-triangle mt-1"></i>
        <span class="flex-grow-1">{{ loadState.lastError.value }}</span>
        <button type="button" class="btn-close btn-sm" @click="loadState.lastError.value = ''"></button>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead class="text-secondary small">
            <tr>
              <th>{{ t('controllerList.k2') }}</th>
              <th style="width:80px">{{ t('controllerList.k3') }}</th>
              <th>{{ t('controllerList.colBasePath') }}</th>
              <!-- ★ v1.22.0 — 서비스 목록처럼 설명 열을 둔다.
                   이름만으로는 무엇을 하는 컨트롤러인지 알기 어렵다. -->
              <th>{{ t('controllerList.colDescription') }}</th>
              <th>{{ t('common.colFilePath') }}</th>
              <th class="num" style="width:80px">{{ t('controllerList.colRoutes') }}</th>
              <th style="width:120px">{{ t('loadState.loaded') }}</th>
              <th class="col-when num" style="width:140px">{{ t('controllerList.colCreated') }}</th>
              <th style="width:200px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="10" class="text-center text-secondary py-4">
                <span class="spinner-border spinner-border-sm me-2"></span>{{ t('controllerList.k4') }}
              </td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="10" class="text-center text-secondary py-4">
                <template v-if="q">"{{ q }}" 와(과) 맞는 컨트롤러가 없습니다.
                  <button class="btn btn-link btn-sm p-0 align-baseline" @click="q = ''">{{ t('serviceList.clearFilter') }}</button></template>
                <template v-else>{{ t('controllerList.k5') }}</template>
                <div v-if="onlyWorkspace && header.hiddenBuiltin" class="small mt-2">{{ t('origin.emptyWorkspaceHint', { n: header.hiddenBuiltin }) }}
                  <button class="btn btn-link btn-sm p-0 align-baseline" @click="onlyWorkspace = false">{{ t('origin.showAll') }}</button></div>
              </td>
            </tr>
            <tr v-for="r in visibleRows" :key="r.id" :class="{ 'table-warning': isBlocked(r.name) }">
              <td>
                <!-- ★ v1.29.1 — 경로는 전용 [파일 경로] 열에 있으므로 여기서 뺀다.
                     같은 것을 두 곳에 두면 이름이 눈에 덜 들어온다.
                     [내 것] 배지는 이름 옆으로 (서비스 목록과 같은 자리). -->
                <div class="fw-semibold">
                  {{ r.name }}
                  <span v-if="r.origin === 'workspace'" class="badge bg-info-subtle text-info-emphasis border border-info-subtle ms-1" :title="t('origin.workspaceHint')">{{ t('origin.workspace') }}</span>
                </div>
              </td>
              <td>
                <!-- Phase 37 (patch-16): DB / EAI 유형별 다른 배경색으로 시각적 구분.
                     DB → 연파랑, MCI → 초록 계열. -->
                <span class="badge" :class="badgeClassForType(splitType(r).main)">
                  <i v-if="splitType(r).main === 'MCI'" class="bi bi-plug-fill me-1" style="font-size:9px"></i>
                  {{ splitType(r).main }}
                </span>
                <span v-if="splitType(r).old" class="badge badge-ctrl-old ms-1"
                      :title="t('controllerList.k6')">OLD</span>
              </td>
              <td>
                <code class="small">{{ r.base_path || '-' }}</code>
                <span v-if="!r.registered" class="badge bg-warning text-dark small ms-1" :title="t('controllerList.k7')">{{ t('controllerList.unregistered') }}</span>
              </td>
              <td class="small text-secondary desc-cell" :title="r.description || ''">{{ r.description || '—' }}</td>
              <td class="small text-secondary path-cell" :title="r.file_path || ''">
                <code class="small">{{ r.file_path || '—' }}</code>
              </td>
              <td class="num"><span class="badge bg-secondary">{{ r.routes?.length ?? 0 }}</span></td>
              <td>
                <LoadStateCell :kind="'controller'" :name="r.name"
                               :loaded="loadState.isLoaded(r.name)"
                               @loaded="loadState.refresh(); load()" />
              </td>
              <td class="small text-secondary col-when num">{{ r.created_at }}</td>
              <td>
                <button class="btn btn-sm btn-outline-info me-1" @click="openFlow(r)" :title="t('controllerList.k8')">
                  <i class="bi bi-diagram-2"></i>
                </button>
                <button class="btn btn-sm btn-outline-success me-1" @click="openTest(r)" :title="t('controllerList.k9')"
                        :disabled="!r.registered">
                  <i class="bi bi-send"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary me-1" @click="openEdit(r)"
                        :disabled="r.legacy"
                        :title="r.legacy ? t('controllerList.k10') : (splitType(r).main === 'MCI' ? t('controllerList.k11') : t('controllerList.k12'))">
                  <i class="bi" :class="splitType(r).main === 'MCI' ? 'bi-plug-fill' : 'bi-pencil'"></i>
                </button>
                <!-- ★ v1.13.0 — 막기/풀기. 삭제와 달리 되돌릴 수 있고, 재기동해도 막혀 있다 -->
                <button class="btn btn-sm me-1"
                        :class="isBlocked(r.name) ? 'btn-warning' : 'btn-outline-warning'"
                        @click="onToggleBlock(r)"
                        :title="isBlocked(r.name) ? t('controllerList.blockedBy', { reason: infoOf(r.name)?.reason || t('controllerList.noReason') }) : t('controllerList.blockHint')">
                  <i class="bi" :class="isBlocked(r.name) ? 'bi-lock-fill' : 'bi-unlock'"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="onDelete(r)"
                        :disabled="r.legacy"
                        :title="r.legacy ? t('controllerList.k14') : t('controllerList.k15')">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination v-model:page="page" :total-pages="header.totalPages || 1" :window-size="10" />
    </div>
  </div>

  <ControllerEditor
    v-if="showEditor"
    :id="editingId"
    @close="showEditor = false"
    @saved="onSaved"
  />

  <ApiTester
    v-if="testingController"
    :controller="testingController"
    @close="testingController = null"
  />

  <ControllerFlowDialog
    v-if="flowController"
    :controller="flowController"
    @close="flowController = null"
  />

</template>

<style scoped>
/* 경로가 길어도 표가 밀리지 않게 — 넘치면 … 로 줄이고 전체는 툴팁으로 */
.path-cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 설명이 길어도 표가 밀리지 않게 — 넘치면 … 로 줄이고 전체는 툴팁으로 */
.desc-cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Phase 37 (patch-16): 컨트롤러 유형 배지 — DB/EAI 구분되게 색상 분리. */

/* DB — 연파랑 (기존과 동일 팔레트) */
.badge-ctrl-type-db {
  background-color: #cfe2ff;   /* bootstrap light blue */
  color: #084298;
  border: 1px solid #9ec5fe;
  font-weight: 600;
}
/* MCI — 초록 (외부 시스템 통신 의미) */
.badge-ctrl-type-mci {
  background-color: #d1e7dd;   /* bootstrap light green */
  color: #0a3622;
  border: 1px solid #a3cfbb;
  font-weight: 600;
}
/* 기타 유형 (확장 대비) — 회색 */
.badge-ctrl-type-other {
  background-color: #e9ecef;
  color: #495057;
  border: 1px solid #ced4da;
  font-weight: 600;
}

/* legacy(ubiaccess 호환) 컨트롤러 — 주황색, '이것은 구 버전' 의미 */
.badge-ctrl-old {
  background-color: #fff3cd;   /* bootstrap light yellow */
  color: #664d03;
  border: 1px solid #ffecb5;
  font-weight: 700;
  letter-spacing: 0.05em;
}
</style>
