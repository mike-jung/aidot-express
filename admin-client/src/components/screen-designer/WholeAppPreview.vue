<script setup>
/**
 * WholeAppPreview — 프로젝트 전체를 iframe 안에서 실제 앱처럼 렌더.
 *
 *  Phase 9 추가. 단일 화면 preview (ScreenPreview) 와는 별개로,
 *  프로젝트의 layout (sidebar/top-nav) + 모든 screens + 메뉴 네비게이션을 포함.
 *
 *  iframe 내부에서:
 *   - Vue 3 CDN 로드
 *   - previewRuntimes 의 widget 컴포넌트들 사용
 *   - 각 endpoint 는 same-origin fetch 로 실제 호출
 *   - 사이드바 / 상단 메뉴로 화면 전환 가능
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useI18n } from '../../composables/useI18n';

import { useAuthStore } from '../../stores/auth';
import { buildWholeAppPreviewDoc } from '../../generator/screens/wholeAppPreviewBuilder';

const { t } = useI18n();

const auth = useAuthStore();
const props = defineProps({
  project: { type: Object, required: true },
});

/* 디바운스 — 편집 중 srcdoc 이 빈번히 재생성되지 않도록 */
const DEBOUNCE_MS = 400;
const debouncedProject = ref(props.project);
let timer = null;

watch(() => props.project, (p) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    debouncedProject.value = p;
    timer = null;
  }, DEBOUNCE_MS);
}, { deep: true });

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});

const srcdoc = computed(() => {
  try {
    return buildWholeAppPreviewDoc({ project: debouncedProject.value, authToken: auth.accessToken || '' });
  } catch (e) {
    return `<!DOCTYPE html><html><body style="padding:32px;font-family:monospace;color:#b91c1c">Preview 빌드 오류:<br>${String(e.message || e).replace(/</g, '&lt;')}</body></html>`;
  }
});

const viewport = ref('desktop');

const VIEWPORT_WIDTHS = {
  desktop: '100%',
  tablet:  '1024px',
  mobile:  '375px',
};

const screenCount = computed(() => (props.project?.screens || []).filter((s) => s.kind === 'composite').length);
</script>

<template>
  <div class="whole-app-preview">
    <div class="preview-toolbar">
      <div class="d-flex align-items-center gap-2 flex-grow-1">
        <i class="bi bi-app-indicator"></i>
        <span class="fw-semibold">{{ project.name || '전체 앱 미리보기' }}</span>
        <span class="text-secondary small">· {{ t('designer.screenCount').replace('{n}', screenCount) }}</span>
      </div>

      <div class="btn-group btn-group-sm" role="group">
        <button class="btn" :class="viewport === 'desktop' ? 'btn-primary' : 'btn-outline-secondary'"
                @click="viewport = 'desktop'">
          <i class="bi bi-laptop"></i> Desktop
        </button>
        <button class="btn" :class="viewport === 'tablet' ? 'btn-primary' : 'btn-outline-secondary'"
                @click="viewport = 'tablet'">
          <i class="bi bi-tablet"></i> Tablet
        </button>
        <button class="btn" :class="viewport === 'mobile' ? 'btn-primary' : 'btn-outline-secondary'"
                @click="viewport = 'mobile'">
          <i class="bi bi-phone"></i> Mobile
        </button>
      </div>
    </div>

    <div v-if="!screenCount" class="empty-state">
      <i class="bi bi-easel2 fs-1 d-block mb-2 opacity-50"></i>
      <div class="mb-2">{{ t('designer.noScreensYet') }}</div>
      <div class="small text-secondary">
        {{ t('designer.addScreenHint') }}
      </div>
    </div>

    <div v-else class="preview-frame-wrap" :class="'viewport-' + viewport">
      <iframe class="preview-iframe"
              :style="{ width: VIEWPORT_WIDTHS[viewport] }"
              :srcdoc="srcdoc"
              sandbox="allow-scripts allow-same-origin"
              referrerpolicy="no-referrer"></iframe>
    </div>
  </div>
</template>

<style scoped>
.whole-app-preview {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  min-height: 600px;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  overflow: hidden;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  padding: 2rem;
  text-align: center;
}

.preview-frame-wrap {
  flex: 1;
  overflow: auto;
  background: #e2e8f0;
  display: flex;
  justify-content: center;
  padding: 0;
}
.preview-frame-wrap.viewport-tablet,
.preview-frame-wrap.viewport-mobile {
  padding: 1rem;
}

.preview-iframe {
  border: none;
  height: 100%;
  min-height: 600px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.viewport-desktop .preview-iframe { box-shadow: none; }
.viewport-tablet .preview-iframe { border-radius: 8px; max-height: calc(100vh - 260px); }
.viewport-mobile .preview-iframe { border-radius: 8px; max-height: calc(100vh - 260px); }
</style>
