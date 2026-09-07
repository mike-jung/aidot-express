<script setup>
import { confirmDelete } from '../../composables/useConfirm';
import { notifyError } from '../../composables/useNotify';
/**
 * Screen Designer — 프로젝트 목록 (Phase 3 실구현)
 *
 * 스토어(screenProjects.js) 경유로 Phase 2 API 를 호출한다.
 *  - GET    /api/admin/screen-projects/paged
 *  - POST   /api/admin/screen-projects
 *  - PUT    /api/admin/screen-projects/:id   (이름 변경 용도)
 *  - DELETE /api/admin/screen-projects/:id
 *
 * 생성한 프로젝트는 곧바로 편집 화면 (/screen-designer/:id) 으로 이동.
 * (Phase 4 에서 실제 편집 기능이 채워짐)
 */
import { ref, computed, watch, onActivated } from 'vue';
// ★ v1.10.15 — 다국어
import { useI18n } from '../../composables/useI18n';

import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useScreenProjectsStore } from '../../stores/screenProjects';
import ProjectNameModal from '../../components/screen-designer/ProjectNameModal.vue';
import Pagination from '../../components/Pagination.vue';
import http from '../../api/http';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

const router = useRouter();
const route = useRoute();
const store = useScreenProjectsStore();
const { rows, header, loading, error } = storeToRefs(store);

const page = ref(1);
const perPage = ref(10);

// 모달 상태
const modalMode = ref(null);                       // null | 'create' | 'rename'
const modalInitial = ref({ id: null, name: '', description: '' });

// 삭제 중 표시용
const deletingId = ref(null);

watch(page, () => load());

/**
 * Phase 11: 프로젝트 목록 자동 로드 진단/수정.
 *
 *  원인 분석:
 *   - 이전에는 `onMounted(() => load())` + `watch(route.fullPath, ...)` (non-immediate) 조합이었는데
 *     Vue Router 가 동일 path 재방문 시 컴포넌트 lifecycle 을 재트리거하지 않아,
 *     사용자가 "화면 디자이너" 메뉴를 반복 클릭하면 load() 가 호출되지 않아 요청이 없었음.
 *   - 또한 route.fullPath watcher 는 초기값에선 fire 하지 않아 첫 진입 시에도 놓칠 수 있음.
 *
 *  수정:
 *   - watch 에 immediate:true → 첫 진입 및 경로 변경 모두 fire
 *   - onActivated 도 추가 → keep-alive 상황 대응
 *   - load() 함수에 console.log 로 호출 가시성 확보
 *   - 템플릿에 "목록 새로고침" 버튼 상시 표시
 */
watch(
  () => route.fullPath,
  (newPath) => {
    // /screen-designer 및 /screen-designer?... 만 반응 (/screen-designer/3 제외)
    if (newPath && newPath.startsWith('/screen-designer')
        && !/^\/screen-designer\/\d/.test(newPath)) {
      load();
    }
  },
  { immediate: true },
);

// keep-alive 가 적용된 경우를 위한 보조. 일반 SPA 동작에선 불필요하지만 방어적.
onActivated(() => load());

async function load() {
  // eslint-disable-next-line no-console
  console.log('[ProjectListView] load() → GET /api/admin/screen-projects/paged',
              { page: page.value, perPage: perPage.value });
  try {
    // Phase 17: raw response 를 덤프하여 서버 로그와 대조
    const r = await http.get('/api/admin/screen-projects/paged', {
      params: { page: page.value, perPage: perPage.value },
    });
    // eslint-disable-next-line no-console
    console.log('[ProjectListView] RAW axios response.data =', JSON.stringify(r.data));
    // eslint-disable-next-line no-console
    console.log('[ProjectListView] RAW response.data typeof=', typeof r.data, 'keys=', Object.keys(r.data || {}));

    // store 로직 수동 재현 — store.loadList 가 envelope 을 잘못 파싱할 수도
    const body = r.data?.data ?? r.data;
    // eslint-disable-next-line no-console
    console.log('[ProjectListView] unwrapped body =', JSON.stringify(body));
    // eslint-disable-next-line no-console
    console.log('[ProjectListView] body.rows?.length =', body?.rows?.length, 'body.header?.total =', body?.header?.total);

    // 기존 store 로도 로드 (normal path)
    await store.loadList({ page: page.value, perPage: perPage.value });
    // eslint-disable-next-line no-console
    console.log('[ProjectListView] load ✓ rows=' + rows.value.length + ' total=' + (header.value?.total ?? '?'));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[ProjectListView] load ✗', e.response?.status, e.message);
  }
}

function openCreate() {
  modalInitial.value = { id: null, name: '', description: '' };
  modalMode.value = 'create';
}

function openRename(row) {
  modalInitial.value = { id: row.id, name: row.name, description: row.description };
  modalMode.value = 'rename';
}

function onModalClose() {
  modalMode.value = null;
}

async function onModalSaved(result) {
  // create 모드에선 곧바로 편집 화면으로 이동.
  if (modalMode.value === 'create' && result?.id) {
    router.push({ name: 'screen-project-edit', params: { id: result.id } });
    return;
  }
  // rename 은 목록에서 해당 행만 갱신됨 — 스토어가 이미 처리했으므로 여기선 아무것도 안 해도 됨.
  await load();
}

async function onDelete(row) {
  if (!await confirmDelete(row.name, { title: '프로젝트 삭제', detail: '복구할 수 없습니다.', requireText: row.name })) return;
  deletingId.value = row.id;
  try {
    await store.removeProject(row.id);
    // 목록이 페이지 경계에서 빌 수 있으므로 한번 더 reload
    await load();
  } catch (e) {
    notifyError('삭제 실패', e);
  } finally {
    deletingId.value = null;
  }
}

function openEdit(row) {
  router.push({ name: 'screen-project-edit', params: { id: row.id } });
}

function fmtDate(s) {
  if (!s) return '-';
  // MariaDB/SQLite 둘 다 'YYYY-MM-DD HH:MM:SS' 형식 또는 ISO — 앞 16자까지만 노출.
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return String(s).slice(0, 16);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yy}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return String(s).slice(0, 16);
  }
}
</script>

<template>
  <div class="container-fluid py-3">

    <!-- 헤더 -->
    <div class="d-flex justify-content-between align-items-start mb-3">
      <div>
        <h4 class="mb-1">
          <i class="bi bi-easel2 me-2"></i>{{ t('designer.title') }}
        </h4>
        <p class="text-secondary small mb-0">
          {{ t('designer.intro') }}
        </p>
      </div>
      <div class="d-flex align-items-center gap-2">
        <!-- Phase 11: 상시 노출되는 목록 새로고침 버튼. 요청 발생 여부 진단용. -->
        <button class="btn btn-outline-secondary" @click="load" :disabled="loading" :title="t('designer.refreshList')">
          <i class="bi" :class="loading ? 'bi-arrow-clockwise spinner' : 'bi-arrow-clockwise'"></i>
          <span class="ms-1">{{ loading ? '불러오는 중…' : '새로고침' }}</span>
        </button>
        <button class="btn btn-primary" @click="openCreate" :disabled="loading">
          <i class="bi bi-plus-lg me-1"></i>{{ t('designer.newProject') }}
        </button>
      </div>
    </div>

    <!-- 오류 -->
    <div v-if="error" class="alert alert-danger small d-flex align-items-start">
      <i class="bi bi-exclamation-triangle me-2 mt-1"></i>
      <div class="flex-grow-1">
        <strong>{{ t('designer.errorPrefix') }}</strong> {{ error }}
      </div>
      <button class="btn btn-sm btn-outline-danger ms-3" @click="load">{{ t('designer.retry') }}</button>
    </div>

    <!-- 로딩 -->
    <div v-if="loading && rows.length === 0" class="card">
      <div class="card-body text-center py-5 text-secondary">
        <div class="spinner-border spinner-border-sm me-2"></div>{{ t('designer.loadingList') }}
      </div>
    </div>

    <!-- 빈 목록 -->
    <div v-else-if="!loading && rows.length === 0" class="card">
      <div class="card-body text-center py-5 text-secondary">
        <i class="bi bi-folder2-open fs-1 d-block mb-3 opacity-50"></i>
        <div class="mb-2">{{ t('designer.noProjects') }}</div>
        <div class="small mb-3">오른쪽 위의 <em>"{{ t('designer.newProject') }}"</em> 버튼으로 첫 프로젝트를 만들어보세요.</div>

      </div>
    </div>

    <!-- 목록 -->
    <div v-else class="card">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th style="width: 70px;">ID</th>
              <th>{{ t('designer.colName') }}</th>
              <th style="width: 110px;">{{ t('designer.colStyle') }}</th>
              <th>{{ t('designer.colDescription') }}</th>
              <th style="width: 160px;">{{ t('designer.colUpdated') }}</th>
              <th style="width: 200px;">{{ t('designer.colActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td class="text-secondary small">{{ r.id }}</td>
              <td>
                <a href="#" class="text-decoration-none" @click.prevent="openEdit(r)">
                  <strong>{{ r.name }}</strong>
                </a>
              </td>
              <td>
                <!-- Phase 25: CSS 프레임워크 뱃지 -->
                <span v-if="r.config?.cssFramework === 'metronic'"
                      class="badge bg-dark">
                  <i class="bi bi-palette-fill me-1"></i>Metronic
                </span>
                <span v-else class="badge bg-primary">
                  <i class="bi bi-bootstrap me-1"></i>Bootstrap
                </span>
              </td>
              <td class="small text-secondary">
                {{ r.description || '—' }}
              </td>
              <td class="small text-secondary">{{ fmtDate(r.updatedAt) }}</td>
              <td>
                <button class="btn btn-sm btn-outline-primary me-1" @click="openEdit(r)" :title="t('common.edit')">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary me-1" @click="openRename(r)" :title="t('designer.rename')">
                  <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger"
                        @click="onDelete(r)"
                        :disabled="deletingId === r.id"
                        :title="t('common.delete')">
                  <span v-if="deletingId === r.id" class="spinner-border spinner-border-sm"></span>
                  <i v-else class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 페이지네이션: 2 페이지 이상일 때만 -->
      <div v-if="header.totalPages > 1" class="card-footer bg-white">
        <Pagination v-model:page="page" :total-pages="header.totalPages || 1" :window-size="10" />
      </div>
    </div>

    <!-- 생성 / 이름 변경 모달 -->
    <ProjectNameModal
      v-if="modalMode"
      :mode="modalMode"
      :initial="modalInitial"
      @close="onModalClose"
      @saved="onModalSaved"
    />
  </div>
</template>

<style scoped>
.spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.sql-box {
  background: #282c34;
  color: #abb2bf;
  padding: 8px 10px;
  border-radius: 4px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 11px;
  overflow-x: auto;
  white-space: pre;
  line-height: 1.4;
  margin: 0;
}
.sql-box code { color: inherit; background: none; padding: 0; }
</style>
