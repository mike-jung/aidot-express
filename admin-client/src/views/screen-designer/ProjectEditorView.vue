<script setup>
import { notifyError, notifySuccess, notifyWarning } from '../../composables/useNotify';
/**
 * Screen Designer — 프로젝트 편집 view (Phase 3)
 *
 * Phase 3 에선 "프로젝트 로드 + 이름 표시 + 탭 스켈레톤" 까지만.
 *  각 탭의 실제 내용은 Phase 4~7 에서 채움:
 *    Phase 4: 레이아웃 탭 (LayoutPicker + LayoutCustomizer)
 *    Phase 5: 화면 목록 탭 (ScreenListPanel)
 *    Phase 7: 미리보기 / 코드 Export 탭
 *
 * route params:
 *   :id = screen project id
 */
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
// ★ v1.10.9 — 언어에 맞춘 날짜/숫자 표기
import { useFormat } from '../../composables/useFormat';

const fmt = useFormat();
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useScreenProjectsStore } from '../../stores/screenProjects';
import LayoutTab from '../../components/screen-designer/LayoutTab.vue';
import ScreensTab from '../../components/screen-designer/ScreensTab.vue';
import CodeExportPanel from '../../components/screen-designer/CodeExportPanel.vue';
import WholeAppPreview from '../../components/screen-designer/WholeAppPreview.vue';
import { useI18n } from '../../composables/useI18n';

/* ★ v1.20.0 — t() 를 쓰면 선언도 있어야 한다 */
const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const store = useScreenProjectsStore();
const { activeProject, loading, error, saving } = storeToRefs(store);

// 활성 탭
//  Phase 28 (patch-07): route.query.tab 으로 초기 탭 지정 가능.
//    예: /screen-designer/1?tab=screens → "화면 목록" 탭으로 시작.
//  유효한 값 외엔 무시.
const VALID_TABS = ['layout', 'screens', 'preview', 'export'];
function tabFromRoute() {
  const q = route.query.tab;
  return (typeof q === 'string' && VALID_TABS.includes(q)) ? q : 'layout';
}
const activeTab = ref(tabFromRoute());

// 탭이 바뀌면 URL query 에도 반영 (북마크/뒤로가기 시 동일 탭 유지).
watch(activeTab, (v) => {
  if (route.query.tab === v) return;
  router.replace({
    query: v === 'layout' ? {} : { ...route.query, tab: v },
  });
});

// URL 이 외부에서 바뀔 때 (예: ScreenStudio 에서 goBack 으로 ?tab=screens 로 돌아올 때)
watch(() => route.query.tab, () => {
  const next = tabFromRoute();
  if (next !== activeTab.value) activeTab.value = next;
});

/**
 * Phase 8b: 저장 상태 시각화
 *  LayoutTab 이 디바운스 자동 저장을 수행하지만 사용자는 이를 인지하기 어려움.
 *  여기서 store.saving 을 관찰해 헤더에 "자동 저장 중 / 저장됨 / 편집됨" 상태 표시.
 */
const lastSavedAt = ref(null);
watch(saving, (now, prev) => {
  // saving 이 true 에서 false 로 떨어지는 순간 저장 완료
  if (prev === true && now === false) {
    lastSavedAt.value = new Date();
  }
});

const savedStatusLabel = computed(() => {
  if (saving.value) return '저장 중…';
  if (lastSavedAt.value) return t('designer.allAutoSaved');
  return t('designer.autoSavedHint');
});

async function loadProject() {
  const id = route.params.id;
  if (!id) return;
  try {
    await store.loadById(id);
  } catch (e) {
    // 404 면 목록으로 돌려보냄
    if (e.response?.status === 404) {
      notifyError('존재하지 않는 프로젝트입니다', '목록으로 돌아갑니다.');
      router.replace({ name: 'screen-projects' });
    }
    // 그 외 에러는 store.error 에 저장됨
  }
}

onMounted(loadProject);
// id 가 바뀌면 다시 로드 (router 내부 이동 대응)
watch(() => route.params.id, loadProject);

// 다른 view 로 떠날 때 activeProject 정리 — 메모리 누수 방지 + 다음 방문 시 stale 데이터 회피
onBeforeUnmount(() => store.clearActive());

function goBack() {
  router.push({ name: 'screen-projects' });
}

/**
 * Phase 10: 수동 저장 — 서버 요청을 명시적으로 보내고 성공/실패를 사용자에게 확실히 알림.
 *  이전 Phase 8b 구현은 무조건 try 블록에서 lastSavedAt 을 찍어 "자동 저장됨" 표시만
 *  했으므로 사용자가 실제 요청이 서버로 갔는지 판단하기 어려웠음.
 *  이번엔:
 *   - activeProject 가 없으면 경고
 *   - PUT 요청 직전에 콘솔 로그 (개발자 툴 Network 탭에서 확인 용이)
 *   - 성공 시 저장된 id 와 시각을 alert 로 명확히 표시 (추후 toast 로 대체 가능)
 *   - 실패 시 상세 에러 메시지
 */
async function saveNow() {
  if (!activeProject.value) {
    notifyWarning('저장할 수 없습니다', '프로젝트가 아직 로드되지 않았습니다.');
    return;
  }
  const p = activeProject.value;
  // eslint-disable-next-line no-console
  console.log('[ProjectEditor] saveNow → PUT /api/admin/screen-projects/' + p.id, {
    name: p.name,
    screensCount: (p.screens || []).length,
  });
  try {
    const updated = await store.savePatch(p.id, {
      name: p.name,
      description: p.description,
      config: p.config,
      layout: p.layout,
      screens: p.screens,
      vars: p.vars,
    });
    lastSavedAt.value = new Date();
    // eslint-disable-next-line no-console
    console.log('[ProjectEditor] saveNow ✓ updated id=' + (updated?.id ?? p.id));
    // 사용자에게 명시적 확인 — 요청이 실제로 서버로 갔음을 보여줌
    notifySuccess('저장되었습니다', `${p.name} · ID ${p.id} · ${fmt.time(lastSavedAt.value)}`);
  } catch (e) {
    const status = e.response?.status;
    const msg = e.response?.data?.message || e.message;
    // eslint-disable-next-line no-console
    console.error('[ProjectEditor] saveNow ✗', status, msg);
    notifyError(`저장 실패 (HTTP ${status || '?'})`, msg);
  }
}
</script>

<template>
  <div class="container-fluid py-3">

    <!-- 헤더 -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary" @click="goBack" :title="t('projectEditor.k12')">
          <i class="bi bi-arrow-left"></i>
        </button>
        <div>
          <h5 class="mb-0">
            <i class="bi bi-easel2 me-2"></i>
            <span v-if="loading && !activeProject" class="text-secondary">
              <span class="spinner-border spinner-border-sm me-2"></span>{{ t('projectEditor.k1') }}
            </span>
            <span v-else-if="activeProject">{{ activeProject.name }}</span>
            <span v-else class="text-secondary">{{ t('projectEditor.k2') }}</span>
          </h5>
          <div v-if="activeProject" class="small text-secondary">
            <span v-if="activeProject.description">{{ activeProject.description }} · </span>
            Project ID: <code>{{ activeProject.id }}</code>
            <!-- v1.7.8: Phase 8b 가 계산해 두고도 화면에 붙이지 않아 죽어 있던 저장 상태.
                 자동 저장은 사용자가 인지하기 어려워 반드시 보여야 한다. -->
            <span class="ms-2">
              <i class="bi" :class="saving ? 'bi-arrow-repeat' : 'bi-check-circle'"></i>
              {{ savedStatusLabel }}
              <span v-if="lastSavedAt" class="opacity-75">
                ({{ fmt.time(lastSavedAt) }})
              </span>
            </span>
          </div>
          <div v-else class="small text-secondary">
            Project ID: <code>{{ route.params.id }}</code>
          </div>
        </div>
      </div>

      <!-- Phase 8b: 저장 상태 + 수동 저장 -->
      <div v-if="activeProject" class="d-flex align-items-center gap-2">
        <span class="small save-indicator" :class="{ saving: saving, 'just-saved': lastSavedAt && !saving }">
          <span v-if="saving">
            <span class="spinner-border spinner-border-sm me-1"></span>{{ t('projectEditor.k3') }}
          </span>
          <span v-else-if="lastSavedAt">
            <i class="bi bi-check-circle-fill me-1 text-success"></i>
            {{ t('projectEditor.k4') }} <span class="text-secondary">({{ fmt.time(lastSavedAt) }})</span>
          </span>
          <span v-else class="text-secondary">
            <i class="bi bi-cloud me-1"></i>{{ t('projectEditor.k5') }}
          </span>
        </span>
        <button class="btn btn-sm btn-outline-primary" @click="saveNow" :disabled="saving" :title="t('projectEditor.k6')">
          <i class="bi bi-save me-1"></i>{{ t('projectEditor.k6') }}
        </button>
      </div>
    </div>

    <!-- 오류 -->
    <div v-if="error" class="alert alert-danger small">
      <i class="bi bi-exclamation-triangle me-1"></i>{{ error }}
    </div>

    <!-- 탭 -->
    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'layout' }" @click="activeTab = 'layout'">
          <i class="bi bi-layout-sidebar me-1"></i>{{ t('projectEditor.k7') }}
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'screens' }" @click="activeTab = 'screens'">
          <i class="bi bi-collection me-1"></i>{{ t('projectEditor.k8') }}
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'preview' }" @click="activeTab = 'preview'">
          <i class="bi bi-eye me-1"></i>{{ t('projectEditor.k9') }}
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'export' }" @click="activeTab = 'export'">
          <i class="bi bi-download me-1"></i>{{ t('projectEditor.k10') }}
        </button>
      </li>
    </ul>

    <!-- 탭 컨텐츠 -->
    <div v-if="activeTab === 'layout'">
      <!-- 프로젝트 로드 완료 전엔 스피너만 -->
      <div v-if="!activeProject" class="card">
        <div class="card-body text-center py-5 text-secondary">
          <div class="spinner-border spinner-border-sm me-2"></div>{{ t('projectEditor.k11') }}
        </div>
      </div>
      <LayoutTab v-else />
    </div>

    <div v-if="activeTab === 'screens'">
      <div v-if="!activeProject" class="card">
        <div class="card-body text-center py-5 text-secondary">
          <div class="spinner-border spinner-border-sm me-2"></div>{{ t('projectEditor.k11') }}
        </div>
      </div>
      <ScreensTab v-else />
    </div>

    <div v-if="activeTab === 'preview'">
      <div v-if="!activeProject" class="card">
        <div class="card-body text-center py-5 text-secondary">
          <div class="spinner-border spinner-border-sm me-2"></div>{{ t('projectEditor.k11') }}
        </div>
      </div>
      <WholeAppPreview v-else :project="activeProject" />
    </div>

    <div v-if="activeTab === 'export'">
      <div v-if="!activeProject" class="card">
        <div class="card-body text-center py-5 text-secondary">
          <div class="spinner-border spinner-border-sm me-2"></div>{{ t('projectEditor.k11') }}
        </div>
      </div>
      <CodeExportPanel v-else :project="activeProject" />
    </div>
  </div>
</template>

<style scoped>
.save-indicator {
  padding: 0.25rem 0.6rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}
.save-indicator.saving {
  background: #fff8e1;
  color: #b45309;
}
.save-indicator.just-saved {
  background: #ecfdf5;
}
</style>
