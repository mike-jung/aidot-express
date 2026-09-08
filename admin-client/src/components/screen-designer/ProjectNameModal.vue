<script setup>
import { confirmDialog } from '../../composables/useConfirm';
/**
 * ProjectNameModal — 프로젝트 생성 / 이름 변경용 간단 모달.
 *
 *  두 모드를 하나로 통합 (UI 가 거의 동일하기 때문):
 *   - mode='create' : 이름 + 설명 입력 → create API
 *   - mode='rename' : 이름만 수정 (기존 값 프리필) → rename API
 *
 *  사용:
 *    <ProjectNameModal
 *       v-if="showModal"
 *       :mode="'create'"
 *       :initial="{ name: '', description: '' }"
 *       @close="showModal = false"
 *       @saved="onSaved"
 *    />
 */
import { ref, watch, nextTick, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useScreenProjectsStore } from '../../stores/screenProjects';
import { useI18n } from '../../composables/useI18n';

/* ★ v1.20.0 — t() 를 쓰면 선언도 있어야 한다. 없으면 화면을 여는 순간 죽는다. */
const { t } = useI18n();

const router = useRouter();

const props = defineProps({
  mode: { type: String, default: 'create' },   // 'create' | 'rename'
  initial: { type: Object, default: () => ({ id: null, name: '', description: '' }) },
});
const emit = defineEmits(['close', 'saved']);

const store = useScreenProjectsStore();

const name = ref(props.initial.name || '');
const description = ref(props.initial.description || '');
// Phase 9: CSS 프레임워크 선택 (create 모드에서만 노출)
const cssFramework = ref(props.initial.cssFramework || 'bootstrap');  // 'bootstrap' | 'metronic'
// Phase 27 (patch-06): 레이아웃 프리셋 미리 선택. 기본 'sidebar-left'.
//  이렇게 해두면 생성 직후 편집 화면에서 곧장 세부 편집을 시작할 수 있어
//  "생성 → 레이아웃 탭 이동 → 프리셋 다시 고르기" 라는 3-step 을 줄임.
const layoutKind = ref(props.initial.layoutKind || 'sidebar-left');
const localError = ref(null);
const busy = ref(false);
const nameInput = ref(null);

// 레이아웃 프리셋 — LayoutPicker 와 동일한 kind 세트. 생성 모달에선 대표 4개만 노출.
const LAYOUT_PRESETS = [
  { kind: 'sidebar-left', label: t('projectName.k16'),   desc: t('projectName.k17'),       icon: 'bi-layout-sidebar' },
  { kind: 'sidebar-dark', label: t('projectName.k18'), desc: t('projectName.k19'),         icon: 'bi-layout-sidebar-inset' },
  { kind: 'top-nav',      label: t('projectName.k20'),       desc: t('projectName.k21'),           icon: 'bi-menu-button-wide' },
  { kind: 'card-grid',    label: t('projectName.k22'),     desc: t('projectName.k23'),            icon: 'bi-grid-3x3-gap' },
];

/**
 * Phase 27 (patch-06): Metronic 번들 존재 확인.
 *
 *  Metronic 을 선택했는데 실제로 public/metronic 에 번들이 없으면 생성된 프로젝트를
 *  실행했을 때 빈 화면 / 스타일 깨짐이 발생. 사용자가 선택한 시점에서 즉시 경고해
 *  혼란을 줄인다.
 *
 *  구현: HEAD /metronic/ (관리 콘솔이 호스팅 중이므로 동일 origin).
 *   200 → 번들 있음, 404 → 없음, 기타 → 알 수 없음 (경고 생략).
 *  첫 번째 확인 결과를 캐시 (같은 세션 내 재검사 불필요).
 */
const metronicBundleStatus = ref('unknown');  // 'unknown' | 'checking' | 'present' | 'missing'

async function checkMetronicBundle() {
  if (metronicBundleStatus.value === 'present' || metronicBundleStatus.value === 'missing') return;
  metronicBundleStatus.value = 'checking';
  try {
    const res = await fetch('/metronic/', { method: 'HEAD', cache: 'no-store' });
    metronicBundleStatus.value = res.ok ? 'present' : 'missing';
  } catch {
    // 네트워크 오류 등 — 확인 불가. 사용자에겐 표시하지 않음.
    metronicBundleStatus.value = 'unknown';
  }
}

// cssFramework 가 'metronic' 으로 바뀌면 번들 확인 트리거.
watch(cssFramework, (v) => {
  if (v === 'metronic') checkMetronicBundle();
}, { immediate: false });

// 열릴 때 input 에 포커스
onMounted(async () => {
  await nextTick();
  nameInput.value?.focus();
  nameInput.value?.select?.();
});

const title = computed(() => (props.mode === 'rename') ? t('designer.renameTitle') : t('designer.newTitle'));
const submitLabel = computed(() => (props.mode === 'rename') ? t('designer.submitRename') : t('designer.submitCreate'));

async function onSubmit() {
  const trimmed = name.value.trim();
  if (!trimmed) {
    localError.value = t('designer.nameRequired');
    return;
  }
  localError.value = null;
  busy.value = true;
  try {
    let result;
    if (props.mode === 'rename') {
      result = await store.renameProject(props.initial.id, trimmed);
    } else {
      result = await store.createProject({
        name: trimmed,
        description: description.value.trim(),
        // Phase 9: 사용자가 선택한 CSS 프레임워크를 프로젝트 config 에 저장
        config: {
          cssFramework: cssFramework.value,
        },
        // Phase 27 (patch-06): 선택한 레이아웃 프리셋을 즉시 반영.
        //  서버는 defaults.layout 와 merge 하므로 kind 만 보내도 됨.
        layout: {
          kind: layoutKind.value,
        },
      });
    }
    emit('saved', result);
    emit('close');
  } catch (e) {
    const status = e.response?.status;
    const body = e.response?.data;

    // Phase 9: 이름 중복 (409) 이면 기존 프로젝트 id 를 알려주고 사용자 선택 유도
    if (status === 409 && body?.existingId) {
      const ok = await confirmDialog({
        title: t('projectName.k24'),
        message: t('designer.existsMove').replace('{name}', body.existingName || trimmed),
        detail: t('designer.existsDetail').replace('{id}', body.existingId),
        confirmText: t('projectName.k25'),
        cancelText: t('projectName.k26'),
      });
      if (ok) {
        emit('close');
        router.push({ name: 'screen-project-edit', params: { id: body.existingId } });
        return;
      }
      localError.value = t('designer.existsInline').replace('{name}', trimmed);
    } else {
      localError.value = body?.message || e.message || String(e);
    }
  } finally {
    busy.value = false;
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') emit('close');
}
</script>

<template>
  <div class="modal-backdrop-custom" @click.self="emit('close')" @keydown="onKeydown" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered" style="max-width: 600px;">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-easel2 me-2"></i>{{ title }}
          </h5>
          <button type="button" class="btn-close" @click="emit('close')"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">{{ t('projectName.k1') }} <span class="text-danger">*</span></label>
            <input
              ref="nameInput"
              v-model="name"
              type="text"
              class="form-control"
              :placeholder="t('projectName.k14')"
              @keyup.enter="onSubmit"
              maxlength="200"
            />
          </div>
          <div v-if="mode === 'create'" class="mb-3">
            <label class="form-label">{{ t('projectName.k2') }} <span class="text-secondary small">{{ t('projectName.k3') }}</span></label>
            <textarea
              v-model="description"
              class="form-control"
              rows="2"
              :placeholder="t('projectName.k15')"
              maxlength="500"
            ></textarea>
          </div>

          <!-- Phase 27 (patch-06): 레이아웃 프리셋 미리 선택 (생성 모드에서만) -->
          <div v-if="mode === 'create'" class="mb-3">
            <label class="form-label">{{ t('projectName.k4') }} <span class="text-secondary small">{{ t('projectName.k5') }}</span></label>
            <div class="layout-preset-grid">
              <label v-for="p in LAYOUT_PRESETS" :key="p.kind"
                     class="layout-preset-card"
                     :class="{ selected: layoutKind === p.kind }">
                <input type="radio" :value="p.kind" v-model="layoutKind" />
                <div class="layout-preset-icon"><i class="bi" :class="p.icon"></i></div>
                <div class="layout-preset-body">
                  <div class="layout-preset-title">{{ p.label }}</div>
                  <div class="layout-preset-desc">{{ p.desc }}</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Phase 9: CSS 프레임워크 선택 (생성 모드에서만) -->
          <div v-if="mode === 'create'" class="mb-3">
            <label class="form-label">{{ t('projectName.k6') }}</label>
            <div class="framework-options">
              <label class="framework-card" :class="{ selected: cssFramework === 'bootstrap' }">
                <input type="radio" value="bootstrap" v-model="cssFramework" />
                <div class="framework-body">
                  <div class="framework-title">
                    <i class="bi bi-bootstrap me-1 text-primary"></i>Bootstrap 5
                  </div>
                  <div class="framework-desc small text-secondary">
                    {{ t('projectName.k7') }}
                  </div>
                </div>
              </label>
              <label class="framework-card" :class="{ selected: cssFramework === 'metronic' }">
                <input type="radio" value="metronic" v-model="cssFramework" />
                <div class="framework-body">
                  <div class="framework-title">
                    <i class="bi bi-palette me-1 text-warning"></i>Metronic v8
                  </div>
                  <div class="framework-desc small text-secondary">
                    {{ t('projectName.k8') }}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <!-- Phase 27 (patch-06): Metronic 번들 누락 경고 -->
          <div v-if="mode === 'create' && cssFramework === 'metronic' && metronicBundleStatus === 'missing'"
               class="alert alert-warning small mt-2 py-2 mb-0">
            <div class="fw-semibold">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ t('projectName.k9') }}
            </div>
            <div class="mt-1">
              {{ t('projectName.k10') }} <code>public/metronic/</code> {{ t('projectName.k11') }}
            </div>
          </div>
          <div v-else-if="mode === 'create' && cssFramework === 'metronic' && metronicBundleStatus === 'checking'"
               class="text-secondary small mt-2">
            <span class="spinner-border spinner-border-sm me-1"></span>{{ t('projectName.k12') }}
          </div>

          <div v-if="localError" class="alert alert-danger small mb-0 py-2 mt-2">
            <i class="bi bi-exclamation-triangle me-1"></i>{{ localError }}
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" @click="emit('close')" :disabled="busy">
            {{ t('projectName.k13') }}
          </button>
          <button type="button" class="btn btn-primary" @click="onSubmit" :disabled="busy">
            <span v-if="busy" class="spinner-border spinner-border-sm me-1"></span>
            {{ submitLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Bootstrap 모달은 JS 토글이 있어야 깔끔. 여기선 독립 스타일로 간단 구현. */
.modal-backdrop-custom {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.modal-content {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
.modal-header,
.modal-footer {
  padding: 1rem 1.25rem;
}
.modal-body {
  padding: 1rem 1.25rem;
}
.modal-header {
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-footer {
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Phase 9: CSS 프레임워크 선택 카드 */
.framework-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.framework-card {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  cursor: pointer;
  margin: 0;
  transition: border-color 0.15s, background-color 0.15s;
}
.framework-card:hover { background: #f8fafc; }
.framework-card.selected {
  border-color: #0d6efd;
  background: #eff6ff;
}
.framework-card input[type=radio] {
  margin-top: 0.3rem;
  flex-shrink: 0;
}
.framework-body { flex: 1; min-width: 0; }
.framework-title { font-weight: 500; font-size: 0.9rem; }
.framework-desc { line-height: 1.3; margin-top: 0.1rem; }

/* Phase 27 (patch-06): 레이아웃 프리셋 선택 카드 */
.layout-preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}
.layout-preset-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  cursor: pointer;
  margin: 0;
  text-align: center;
  transition: border-color 0.15s, background-color 0.15s;
}
.layout-preset-card:hover { background: #f8fafc; }
.layout-preset-card.selected {
  border-color: #0d6efd;
  background: #eff6ff;
}
.layout-preset-card input[type=radio] { display: none; }
.layout-preset-icon {
  font-size: 1.4rem;
  color: #64748b;
}
.layout-preset-card.selected .layout-preset-icon { color: #0d6efd; }
.layout-preset-body { flex: 1; min-width: 0; width: 100%; }
.layout-preset-title { font-weight: 500; font-size: 0.8rem; line-height: 1.2; }
.layout-preset-desc { font-size: 0.7rem; color: #64748b; line-height: 1.2; margin-top: 0.1rem; }
</style>
