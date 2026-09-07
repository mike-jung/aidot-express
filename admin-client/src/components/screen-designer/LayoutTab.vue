<script setup>
/**
 * LayoutTab — ProjectEditorView 의 "레이아웃" 탭 내부 컨테이너.
 *
 *  책임:
 *   1. activeProject.layout 을 편집 가능한 상태로 유지
 *   2. 사용자가 값을 바꾸면 500ms 디바운스 후 store.savePatch(id, { layout }) 호출
 *   3. 저장 중 / 저장 완료 상태를 시각적으로 표시
 *   4. 레이아웃 kind 변경 시 기본값 보강 (사이드바 추가 등)
 *
 *  구성:
 *   - LayoutPicker          : 3 프리셋 카드
 *   - LayoutPreview         : 오른쪽 미니어처 (선택 사항)
 *   - LayoutCustomizer      : 세부 편집 (타이틀/사이드바/메인)
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useScreenProjectsStore } from '../../stores/screenProjects';
import LayoutPicker from './LayoutPicker.vue';
import LayoutCustomizer from './LayoutCustomizer.vue';
import LayoutPreview from './LayoutPreview.vue';

const store = useScreenProjectsStore();
const { activeId, activeProject, saving } = storeToRefs(store);

const DEBOUNCE_MS = 500;

// 저장 상태 시각화용: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
const saveState = ref('idle');
const savedAnimTimer = ref(null);
let pendingTimer = null;

/**
 * 레이아웃이 완전치 않거나 kind 에 어울리는 기본 필드가 빠진 경우 보강.
 * (예: 서버에서 오래된 프로젝트에 sidebar 필드가 없을 수도 있음)
 */
function ensureDefaults(layout) {
  const out = { ...(layout || {}) };
  out.kind = out.kind || 'sidebar-left';
  out.title = {
    text: 'My App', logoUrl: '', bgColor: '#ffffff', fgColor: '#0f172a', height: 60,
    ...(out.title || {}),
  };
  out.sidebar = {
    items: [], bgColor: '#1e2a3a', fgColor: '#cfd6de', width: 220, activeBg: '#0d6efd',
    ...(out.sidebar || {}),
  };
  // items 는 {...} 스프레드로 복제해도 배열 참조가 공유될 수 있으니 방어
  if (!Array.isArray(out.sidebar.items)) out.sidebar.items = [];
  out.mainArea = {
    bgColor: '#f5f7fa', padding: 16,
    ...(out.mainArea || {}),
  };
  return out;
}

/**
 * 실제로 편집되는 로컬 레이아웃. activeProject.layout 을 깊은 복사해서
 * 여기서 자유롭게 수정 → 디바운스 후 서버 저장 → activeProject 에 반영됨.
 */
const localLayout = ref(ensureDefaults(activeProject.value?.layout));

/**
 * Phase 7-d hotfix: 마지막으로 저장된 상태의 JSON 스냅샷.
 *  localLayout 이 초기값 (ensureDefaults 로 보강됨) 과 동일할 때 불필요한 저장 방지.
 *  사용자가 아무것도 수정하지 않았는데 watch 가 튀어 PUT 이 가는 상황을 막음.
 */
let lastSavedJson = JSON.stringify(localLayout.value);

// activeProject 가 새로 로드되면 localLayout 을 재설정 (다른 프로젝트로 전환 시)
watch(
  () => activeProject.value?.id,
  () => {
    localLayout.value = ensureDefaults(activeProject.value?.layout);
    lastSavedJson = JSON.stringify(localLayout.value);  // baseline 재설정
    saveState.value = 'idle';
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  },
);

// 편집값 변경 감지 → 디바운스 후 저장
watch(
  localLayout,
  () => {
    if (!activeId.value) return;
    // Phase 7-d: 변경 없으면 pending 표시도 생략
    if (JSON.stringify(localLayout.value) === lastSavedJson) return;
    saveState.value = 'pending';
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(async () => {
      pendingTimer = null;
      // 타이머 실행 시점에 다시 한 번 비교 (사용자가 수동 복구했을 수도)
      if (JSON.stringify(localLayout.value) === lastSavedJson) {
        saveState.value = 'idle';
        return;
      }
      saveState.value = 'saving';
      try {
        await store.savePatch(activeId.value, { layout: localLayout.value });
        lastSavedJson = JSON.stringify(localLayout.value);  // baseline 갱신
        saveState.value = 'saved';
        if (savedAnimTimer.value) clearTimeout(savedAnimTimer.value);
        savedAnimTimer.value = setTimeout(() => {
          saveState.value = 'idle';
          savedAnimTimer.value = null;
        }, 2000);
      } catch (e) {
        saveState.value = 'error';
      }
    }, DEBOUNCE_MS);
  },
  { deep: true },
);

// 화면을 떠날 때 대기 중 저장이 있으면 즉시 flush (변경됐을 때만)
onBeforeUnmount(async () => {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
    // Phase 7-d: 변경 없으면 저장 스킵
    if (activeId.value && JSON.stringify(localLayout.value) !== lastSavedJson) {
      try { await store.savePatch(activeId.value, { layout: localLayout.value }); } catch {}
    }
  }
  if (savedAnimTimer.value) clearTimeout(savedAnimTimer.value);
});

/* ─── kind 변경 핸들러 ─── */
// 레이아웃 kind 가 바뀌면 해당 레이아웃에 맞는 필드 보강.
//  sidebar-* 로 전환 시 sidebar 기본값 재확보 (이미 있다면 유지)
//  top-nav 로 전환 시 기존 sidebar 설정은 유지 (다시 돌아갈 수 있으므로 파괴적 변경 X)
function onKindChange(newKind) {
  // Phase 26: nested 속성 변경 (`localLayout.value.kind = newKind`) 대신
  //  새 객체로 재할당하여 LayoutCustomizer / LayoutPreview 의 computed 구독자들이
  //  확실히 re-evaluate 되도록 한다. 기존 방식은 Customizer 내부의 일부 computed 가
  //  kind 변경 후 다음 tick 에서만 stale reference 를 가져 "가끔 반영 안 됨" 증상 유발.
  localLayout.value = { ...localLayout.value, kind: newKind };
  // ensureDefaults 는 이미 sidebar 가 있으면 그대로 두므로 kind 전환 시 데이터 손실 없음.
}
</script>

<template>
  <div>
    <!-- 상단 안내 + 저장 상태
         Phase 27 (patch-06): 이 인디케이터는 ProjectEditorView 의 헤더 저장 상태와
         겹치므로, 사용자가 편집 중임을 알려주는 과도기 신호 (pending / error) 만 남김.
         'saving' / 'saved' 는 ProjectEditorView 헤더가 전담 (모든 탭 공통). -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <p class="text-secondary small mb-0">
        전체 화면 구조를 선택하고 타이틀 / 사이드바 / 메인 영역의 색상과 구성을 편집합니다.
        <span class="text-muted">변경사항은 자동 저장됩니다.</span>
      </p>
      <div class="save-indicator">
        <span v-if="saveState === 'pending'" class="text-secondary small">
          <i class="bi bi-pencil-square me-1"></i>편집 중…
        </span>
        <span v-else-if="saveState === 'error'" class="text-danger small">
          <i class="bi bi-exclamation-triangle me-1"></i>저장 실패
        </span>
      </div>
    </div>

    <!-- Phase 25: 2-column 레이아웃 — 왼쪽 Picker, 오른쪽 세부 편집 + 미리보기 -->
    <div class="row g-3">
      <!-- 왼쪽: 전체 구조 선택 -->
      <div class="col-lg-6">
        <h6 class="mb-2">
          <i class="bi bi-grid-1x2 me-1"></i>전체 구조 선택
        </h6>
        <LayoutPicker :model-value="localLayout.kind" @update:model-value="onKindChange" />
      </div>

      <!-- 오른쪽: 미리보기 + 세부 편집 (스크롤 시 고정) -->
      <div class="col-lg-6">
        <div class="right-sticky">
          <h6 class="mb-2">
            <i class="bi bi-eye me-1"></i>미리보기
          </h6>
          <LayoutPreview :layout="localLayout" />

          <h6 class="mb-2 mt-4">
            <i class="bi bi-sliders me-1"></i>세부 편집
          </h6>
          <LayoutCustomizer v-model:layout="localLayout" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.save-indicator {
  min-width: 120px;
  text-align: right;
}
.right-sticky {
  position: sticky;
  top: 1rem;
}
</style>
