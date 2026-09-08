<script setup>
import { confirmDelete } from '../../composables/useConfirm';
import { notifyError } from '../../composables/useNotify';
/**
 * ScreensTab — ProjectEditorView 의 "화면 목록" 탭 내부.
 *
 *  activeProject.screens 배열을 CRUD 한다. 편집(composite 편집) 은 별도 라우트
 *  /screen-designer/:id/screen/:screenId 로 이동하여 ScreenStudioView 가 처리.
 *
 *  저장 정책:
 *   - 화면 추가 / 삭제 / 제목 변경 등은 즉시 store.savePatch(id, { screens }) 호출.
 *   - (Layout 탭처럼 디바운스를 쓰지 않는 이유: 화면 목록 변경은 사용자가 버튼 누를 때
 *     한 번씩만 일어나므로 즉시 저장이 자연스럽고, 편집 후 Studio 로 이동하는 워크플로우
 *     에서 저장 누락을 방지)
 */
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useScreenProjectsStore } from '../../stores/screenProjects';
import { getHeaderKind } from '../../generator/screens/compositeSchema';
import ScreenCreateModal from './ScreenCreateModal.vue';
import ScreenWizardModal from './ScreenWizardModal.vue';
import { useI18n } from '../../composables/useI18n';

/* ★ v1.20.0 — t() 를 쓰면 선언도 있어야 한다. 없으면 화면을 여는 순간 죽는다. */
const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const store = useScreenProjectsStore();
const { activeId, activeProject, saving } = storeToRefs(store);

const showCreateModal = ref(false);
const showWizardModal = ref(false);   // Phase 8
const deletingId = ref(null);
const renamingId = ref(null);
const renameInput = ref('');

const screens = computed(() => activeProject.value?.screens || []);

/* ─── 생성 ─── */
async function onScreenCreated(spec) {
  if (!activeProject.value) return;
  const next = [...screens.value, spec];
  try {
    await store.savePatch(activeId.value, { screens: next });
  } catch (e) {
    notifyError('화면 생성 실패', e);
  }
}

/**
 * Phase 8: Wizard 가 자동 생성한 화면. 즉시 저장 후 Studio 로 이동.
 */
async function onWizardCreate(spec) {
  if (!activeProject.value) return;
  const next = [...screens.value, spec];
  try {
    await store.savePatch(activeId.value, { screens: next });
    // Studio 로 바로 이동
    router.push({
      name: 'screen-studio',
      params: { id: activeId.value, screenId: spec.id },
    });
  } catch (e) {
    notifyError('화면 생성 실패', e);
  }
}

/* ─── 삭제 ─── */
async function onDelete(screen) {
  if (!await confirmDelete(screen.title, { title: t('screensTab.k21') })) return;
  deletingId.value = screen.id;
  const next = screens.value.filter((s) => s.id !== screen.id);
  try {
    await store.savePatch(activeId.value, { screens: next });
  } catch (e) {
    notifyError('삭제 실패', e);
  } finally {
    deletingId.value = null;
  }
}

/* ─── 이름 변경 (인라인) ─── */
function startRename(screen) {
  renamingId.value = screen.id;
  renameInput.value = screen.title;
}
function cancelRename() {
  renamingId.value = null;
  renameInput.value = '';
}
async function commitRename(screen) {
  const t = renameInput.value.trim();
  if (!t) { cancelRename(); return; }
  if (t === screen.title) { cancelRename(); return; }
  const next = screens.value.map((s) =>
    s.id === screen.id
      ? { ...s, title: t, header: { ...(s.header || {}), title: t } }
      : s
  );
  try {
    await store.savePatch(activeId.value, { screens: next });
  } catch (e) {
    notifyError('이름 변경 실패', e);
  } finally {
    cancelRename();
  }
}

/* ─── 순서 이동 (Phase 7 에서 생성될 라우트 순서에 영향) ─── */
async function moveScreen(screen, dir) {
  const idx = screens.value.findIndex((s) => s.id === screen.id);
  const to = idx + dir;
  if (idx < 0 || to < 0 || to >= screens.value.length) return;
  const next = [...screens.value];
  const [m] = next.splice(idx, 1);
  next.splice(to, 0, m);
  try {
    await store.savePatch(activeId.value, { screens: next });
  } catch (e) {
    notifyError('이동 실패', e);
  }
}

/* ─── Studio 진입 (Phase 5-b 에서 실제 편집 UI 가 채워짐) ─── */
function openStudio(screen) {
  router.push({
    name: 'screen-studio',
    params: { id: activeId.value, screenId: screen.id },
  });
}

/* ─── 화면 수 / row·widget 카운트 ─── */
function widgetCount(screen) {
  if (screen.kind !== 'composite' || !Array.isArray(screen.rows)) return 0;
  return screen.rows.reduce((n, r) => n + (r.widgets?.length || 0), 0);
}
function rowCount(screen) {
  return Array.isArray(screen?.rows) ? screen.rows.length : 0;
}
function headerLabel(screen) {
  const k = screen.header?.kind || 'page-title';
  return getHeaderKind(k).label;
}
</script>

<template>
  <div>
    <!-- 헤더: 제목 + 생성 버튼 -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h6 class="mb-1">
          <i class="bi bi-collection me-1"></i>{{ t('screensTab.k1') }}
          <span class="badge bg-secondary ms-2">{{ screens.length }}</span>
        </h6>
        <p class="text-secondary small mb-0">
          {{ t('screensTab.k2') }}
        </p>
      </div>
      <button class="btn btn-outline-primary btn-sm me-2" @click="showWizardModal = true" :disabled="saving">
        <i class="bi bi-magic me-1"></i>{{ t('screensTab.k3') }}
      </button>
      <button class="btn btn-primary btn-sm" @click="showCreateModal = true" :disabled="saving">
        <i class="bi bi-plus-lg me-1"></i>{{ t('screensTab.k4') }}
      </button>
    </div>

    <!-- 빈 상태 -->
    <div v-if="screens.length === 0" class="card">
      <div class="card-body text-center py-5 text-secondary">
        <i class="bi bi-collection fs-1 d-block mb-3 opacity-50"></i>
        <div class="mb-2">{{ t('screensTab.k5') }}</div>
        <div class="small">{{ t('screensTab.k6') }} <em>{{ t('screensTab.k7') }}</em> {{ t('screensTab.k8') }}</div>
      </div>
    </div>

    <!-- 목록 -->
    <div v-else class="card">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-light">
            <tr>
              <th style="width: 40px;">#</th>
              <th>{{ t('screensTab.k9') }}</th>
              <th>{{ t('screensTab.k10') }}</th>
              <th style="width: 110px;">{{ t('screensTab.k11') }}</th>
              <th style="width: 90px;">Row / Widget</th>
              <th style="width: 240px;">{{ t('screensTab.k12') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, idx) in screens" :key="s.id">
              <td class="text-secondary small">{{ idx + 1 }}</td>
              <td>
                <template v-if="renamingId === s.id">
                  <div class="d-flex gap-1">
                    <input v-model="renameInput"
                           class="form-control form-control-sm"
                           @keyup.enter="commitRename(s)"
                           @keyup.escape="cancelRename"
                           ref="renameInputEl" />
                    <button class="btn btn-sm btn-success"
                            @click="commitRename(s)" :title="t('screensTab.k14')">
                      <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary"
                            @click="cancelRename" :title="t('screensTab.k15')">
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                </template>
                <template v-else>
                  <a href="#" class="text-decoration-none" @click.prevent="openStudio(s)">
                    <strong>{{ s.title }}</strong>
                  </a>
                </template>
              </td>
              <td class="small">
                <code>{{ s.path }}</code>
              </td>
              <td class="small text-secondary">
                {{ headerLabel(s) }}
              </td>
              <td class="small text-secondary">
                {{ rowCount(s) }} / {{ widgetCount(s) }}
              </td>
              <td>
                <button class="btn btn-sm btn-outline-primary me-1"
                        @click="openStudio(s)" :title="t('screensTab.k16')">
                  <i class="bi bi-pencil-square"></i> {{ t('screensTab.k13') }}
                </button>
                <div class="btn-group me-1">
                  <button class="btn btn-sm btn-outline-secondary"
                          @click="moveScreen(s, -1)" :disabled="idx === 0" :title="t('screensTab.k17')">
                    <i class="bi bi-arrow-up"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-secondary"
                          @click="moveScreen(s, 1)"
                          :disabled="idx === screens.length - 1" :title="t('screensTab.k18')">
                    <i class="bi bi-arrow-down"></i>
                  </button>
                </div>
                <button class="btn btn-sm btn-outline-secondary me-1"
                        @click="startRename(s)" :title="t('screensTab.k19')">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger"
                        @click="onDelete(s)" :disabled="deletingId === s.id"
                        :title="t('screensTab.k20')">
                  <span v-if="deletingId === s.id" class="spinner-border spinner-border-sm"></span>
                  <i v-else class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 생성 모달 -->
    <ScreenCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onScreenCreated"
    />

    <!-- Phase 8: Wizard 모달 -->
    <ScreenWizardModal
      :show="showWizardModal"
      @close="showWizardModal = false"
      @create="onWizardCreate"
    />
  </div>
</template>
