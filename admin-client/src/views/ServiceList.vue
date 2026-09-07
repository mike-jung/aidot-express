<script setup>
import { useRoute } from 'vue-router';
// ★ v1.10.7 — 다국어
import { useI18n } from '../composables/useI18n';

import { confirmDelete } from '../composables/useConfirm';
import { notifyError } from '../composables/useNotify';
import { ref, onMounted, watch, computed } from 'vue';
import http from '../api/http';
import { useOnlyWorkspace } from '../composables/useOnlyWorkspace';
import { useBlocklist } from '../composables/useBlocklist';
import Pagination from '../components/Pagination.vue';
import ServiceEditor from './ServiceEditor.vue';
import LoadStateCell from '../components/LoadStateCell.vue';   // ★ v1.28.1
import { useLoadState } from '../composables/useLoadState';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

const page = ref(1);

/* ★ v1.28.1 — 직접 넣은 파일이 서버에 올라왔는지 줄마다 보여 준다 */
const loadState = useLoadState('service');
const perPage = ref(10);
const rows = ref([]);
const { onlyWorkspace, originParam } = useOnlyWorkspace();   // ★ v1.11.7 [내 것만] 스위치
/* ★ v1.13.0 — 막기/풀기 (컨트롤러 목록과 같은 방식) */
const { refresh: refreshBlocked, isBlocked, infoOf, block, unblock } = useBlocklist('services');
async function onToggleBlock(r) {
  const nm = r.name;
  if (isBlocked(nm)) {
    if (!window.confirm(`${nm} 을(를) 다시 켤까요?`)) return;
    await unblock(nm); await load(); return;
  }
  const reason = window.prompt(
    `${nm} 을(를) 막습니다.\n\n` +
    `· 서버를 다시 켜도 이 파일을 읽지 않습니다\n` +
    `· 파일은 지우지 않으므로 언제든 다시 켤 수 있습니다\n` +
    `· 이 서비스를 쓰는 컨트롤러도 함께 막는 것이 안전합니다\n\n` +
    `사유를 적어 주세요:`, '보안 점검');
  if (reason === null) return;
  await block(nm, reason); await load();
}
watch(onlyWorkspace, () => { page.value = 1; load(); });
const header = ref({ total: 0, page: 1, perPage: 10, totalPages: 0 });
const loading = ref(false);
// v1.7.8: 컨트롤러 플로우에서 '연관 이동' 으로 넘어올 때 ?q= 로 대상을 지정한다
const route = useRoute();
const q = ref(String(route.query.q || ''));
/* ★ v1.12.1 — 이름 조회를 **서버**에서 한다. 예전에는 지금 보이는 페이지 안에서만 걸러서,
   10개씩 보는 중에 3페이지에 있는 이름을 치면 "없음" 으로 보였다. 이제 전체에서 찾고 쪽수도 맞다. */
let qTimer = null;
watch(q, () => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { page.value = 1; load(); }, 250);
});
const filteredRowsBase = computed(() => rows.value);
/* ★ v1.28.1 — 안 올라온 것만 보기 */
const filteredRows = computed(() => loadState.filterRows(filteredRowsBase.value));
const error = ref(null);

const showEditor = ref(false);
const editingId = ref(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/services/paged', {
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

function openCreate() { editingId.value = null; showEditor.value = true; }
function openEdit(id) { editingId.value = id; showEditor.value = true; }

async function onSaved() {
  showEditor.value = false;
  await load();
}

async function onDelete(row) {
  if (!await confirmDelete(row.name, { title: 'Service 삭제', detail: '파일이 제거됩니다 (다음 서버 재시작 후 컨테이너에서도 사라집니다).', requireText: row.name })) return;
  try {
    await http.delete(`/api/admin/services/${row.id}`);
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
        <i class="bi bi-gear me-2"></i>{{ t('serviceList.title') }}
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
          <i class="bi bi-plus-lg me-1"></i>{{ t('serviceList.newService') }}
        </button>
      </div>
    </div>
    <div class="card-body">
      <div v-if="error" class="alert alert-danger small">{{ error }}</div>

      <!-- v1.7.8: 이름 필터. 컨트롤러 플로우의 '연관 이동'이 ?q= 로 여기 값을 채운다 -->

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
              <th>{{ t('serviceList.colName') }}</th>
              <th>{{ t('serviceList.colSql') }}</th>
              <th class="num" style="width:90px">{{ t('serviceList.colMethods') }}</th>
              <th>{{ t('serviceList.colDescription') }}</th>
              <th>{{ t('common.colFilePath') }}</th>
              <th style="width:120px">{{ t('loadState.loaded') }}</th>
              <th class="num col-when" style="width:140px">{{ t('serviceList.colCreated') }}</th>
              <th style="width:120px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="text-center text-secondary py-4">
                <span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}
              </td>
            </tr>
            <tr v-else-if="!filteredRows.length">
              <td colspan="9" class="text-center text-secondary py-4">
                <template v-if="q">"{{ q }}" 와(과) 맞는 항목이 없습니다.
                  <button class="btn btn-link btn-sm p-0 align-baseline" @click="q = ''">{{ t('serviceList.clearFilter') }}</button></template>
                <template v-else>{{ t('serviceList.empty') }}
                  <div v-if="onlyWorkspace && header.hiddenBuiltin" class="small mt-2">{{ t('origin.emptyWorkspaceHint', { n: header.hiddenBuiltin }) }}
                  <button class="btn btn-link btn-sm p-0 align-baseline" @click="onlyWorkspace = false">{{ t('origin.showAll') }}</button></div></template>
              </td>
            </tr>
            <tr v-for="r in filteredRows" :key="r.id">
              <td><strong>{{ r.name }}</strong>
                <span v-if="r.origin === 'workspace'" class="badge bg-info-subtle text-info-emphasis border border-info-subtle ms-1" :title="t('origin.workspaceHint')">{{ t('origin.workspace') }}</span>
              </td>
              <td><code class="small">{{ r.sql_file || '-' }}</code></td>
              <td class="num">
                <!-- ★ v1.29.0 — 컨트롤러의 [라우트] 열과 같은 모양(개수 배지)으로 맞춘다.
                     이름을 다 나열하면 메서드가 많은 서비스에서 줄이 터진다.
                     자세한 목록은 툴팁으로 본다. -->
                <span class="badge bg-secondary" :title="(r.methods || []).join(', ')">{{ r.methods?.length ?? 0 }}</span>
              </td>
              <td class="small">{{ r.description }}</td>
              <td class="small text-secondary path-cell" :title="r.file_path || ''">
                <code class="small">{{ r.file_path || '—' }}</code>
              </td>
              <td>
                <LoadStateCell :kind="'service'" :name="r.name"
                               :loaded="loadState.isLoaded(r.name)"
                               @loaded="loadState.refresh(); load()" />
              </td>
              <td class="small text-secondary num col-when">{{ r.created_at }}</td>
              <td>
                <button class="btn btn-sm btn-outline-primary me-1" @click="openEdit(r.id)" :title="t('common.edit')">
                  <i class="bi bi-pencil"></i>
                </button>
                <!-- ★ v1.13.0 막기/풀기 -->
                <button class="btn btn-sm me-1" :class="isBlocked(r.name) ? 'btn-warning' : 'btn-outline-warning'"
                        @click="onToggleBlock(r)"
                        :title="isBlocked(r.name) ? `막혀 있음 — ${infoOf(r.name)?.reason || ''} (누르면 풉니다)` : '막습니다 (재기동해도 읽지 않습니다)'">
                  <i class="bi" :class="isBlocked(r.name) ? 'bi-lock-fill' : 'bi-unlock'"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="onDelete(r)" :title="t('common.delete')">
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

  <ServiceEditor
    v-if="showEditor"
    :id="editingId"
    @close="showEditor = false"
    @saved="onSaved"
  />
</template>
