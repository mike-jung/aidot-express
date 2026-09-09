<script setup>
import { useAuthStore } from '../../stores/auth';
import { useI18n } from '../../composables/useI18n';

/**
 * ScreenPreview — Composite 화면을 iframe 으로 라이브 프리뷰.
 *
 *   buildCompositePreviewDoc(spec) 로 srcdoc 생성 → iframe 에 주입.
 *   spec 이 바뀌면 300ms 디바운스 후 재빌드 (Phase 7-d hotfix).
 *   디바운스 없이 모든 키 입력마다 재빌드하면 iframe 이 Vue CDN 을 계속 다시 로드함.
 *   뷰포트 토글: desktop / tablet / mobile.
 *
 *   이 컴포넌트는 "view-only" — 편집 기능 없음.
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { buildCompositePreviewDoc } from '../../generator/screens/compositePreviewBuilder';

const { t } = useI18n();
const auth = useAuthStore();

const props = defineProps({
  spec: { type: Object, required: true },
});

const viewport = ref('desktop');   // 'desktop' | 'tablet' | 'mobile'

const VIEWPORT_WIDTHS = {
  desktop: '100%',
  tablet:  '768px',
  mobile:  '375px',
};

/**
 * Phase 7-d hotfix: spec → debouncedSpec 디바운스.
 *  첫 렌더는 즉시 (= props.spec 의 현재 값으로 초기화), 이후 변경은 300ms 디바운스.
 *  사용자가 textarea/input 에 빠르게 타이핑해도 iframe 은 300ms 마다 1회 재빌드.
 */
const DEBOUNCE_MS = 300;
const debouncedSpec = ref(props.spec);
let debounceTimer = null;

watch(() => props.spec, (newVal) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedSpec.value = newVal;
    debounceTimer = null;
  }, DEBOUNCE_MS);
}, { deep: true });

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

const srcdoc = computed(() => {
  try {
    return buildCompositePreviewDoc({
      spec: debouncedSpec.value,
      title: debouncedSpec.value?.title || 'Preview',
      authToken: auth.accessToken || '',   // ★ v1.11.7 인증 API 도 미리보기에서
    });
  } catch (e) {
    return `<!DOCTYPE html><html><body style="padding:32px;font-family:monospace;color:#b91c1c">Preview 빌드 오류:<br>${String(e.message || e).replace(/</g, '&lt;')}</body></html>`;
  }
});
</script>

<template>
  <div class="screen-preview">
    <!-- 상단 툴바 -->
    <div class="preview-toolbar">
      <div class="btn-group btn-group-sm" role="group">
        <button class="btn btn-outline-secondary"
                :class="{ active: viewport === 'desktop' }"
                @click="viewport = 'desktop'">
          <i class="bi bi-display"></i> Desktop
        </button>
        <button class="btn btn-outline-secondary"
                :class="{ active: viewport === 'tablet' }"
                @click="viewport = 'tablet'">
          <i class="bi bi-tablet"></i> Tablet
        </button>
        <button class="btn btn-outline-secondary"
                :class="{ active: viewport === 'mobile' }"
                @click="viewport = 'mobile'">
          <i class="bi bi-phone"></i> Mobile
        </button>
      </div>
      <span class="ms-auto text-secondary small">
        <i class="bi bi-clock"></i> {{ t('designer.livePreview') }}
      </span>
    </div>

    <!-- iframe 컨테이너 -->
    <div class="preview-frame-wrap" :class="'viewport-' + viewport">
      <iframe
        class="preview-iframe"
        :style="{ width: VIEWPORT_WIDTHS[viewport] }"
        :srcdoc="srcdoc"
        sandbox="allow-scripts allow-same-origin"
        referrerpolicy="no-referrer"
      ></iframe>
    </div>
  </div>
</template>

<style scoped>
.screen-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-bottom: none;
  border-radius: 0.375rem 0.375rem 0 0;
}

.preview-frame-wrap {
  flex: 1;
  min-height: 500px;
  background: #e5e7eb;
  border: 1px solid #e5e7eb;
  border-radius: 0 0 0.375rem 0.375rem;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 0.5rem;
}

.preview-iframe {
  border: 1px solid #cbd5e1;
  background: #fff;
  height: 100%;
  min-height: 500px;
  max-width: 100%;
  transition: width 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.viewport-tablet .preview-iframe,
.viewport-mobile .preview-iframe {
  border-radius: 8px;
}
</style>
