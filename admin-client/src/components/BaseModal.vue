<script setup>
/**
 * BaseModal — 모달 접근성 규칙을 한 곳에서 보장한다. (v1.7.7)
 *
 *  v1.7.6 검토에서 측정된 것: 모달 7개 중 ESC 로 닫히는 것 5, role=dialog 5,
 *  포커스 이동 3, **포커스 트랩 0, 배경 스크롤 잠금 0**.
 *  키보드만 쓰는 사용자는 모달을 열어 둔 채 탭이 뒤 페이지로 빠져나간다.
 *
 *  이 컴포넌트가 보장하는 것
 *    · ESC 로 닫힘 (busy 중에는 막음)
 *    · 열릴 때 첫 요소로 포커스, 닫힐 때 **열기 전 요소로 복귀**
 *    · Tab / Shift+Tab 이 모달 안에서 순환 (포커스 트랩)
 *    · 배경 스크롤 잠금 — 중첩 모달을 대비해 카운터로 관리
 *    · role=dialog · aria-modal · aria-labelledby
 *    · body 로 teleport — 부모의 overflow/transform 에 잘리지 않는다
 */
import { ref, watch, nextTick, onBeforeUnmount, useId } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  /** '' | 'sm' | 'lg' | 'xl' */
  size: { type: String, default: '' },
  /** 저장 중 등 — ESC·배경클릭·닫기버튼을 모두 막는다 */
  busy: { type: Boolean, default: false },
  /** 배경 클릭으로 닫을지 */
  dismissible: { type: Boolean, default: true },
});
const emit = defineEmits(['close']);

const titleId = `bm-${useId()}`;
const dialogRef = ref(null);
let lastFocused = null;

/* 배경 스크롤 잠금 — 중첩을 대비해 열린 개수를 센다 */
function lockScroll() {
  const n = Number(document.body.dataset.bmLocks || 0) + 1;
  document.body.dataset.bmLocks = String(n);
  if (n === 1) {
    document.body.dataset.bmPrevOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
  }
}
function unlockScroll() {
  const n = Math.max(0, Number(document.body.dataset.bmLocks || 0) - 1);
  document.body.dataset.bmLocks = String(n);
  if (n === 0) {
    document.body.style.overflow = document.body.dataset.bmPrevOverflow || '';
    delete document.body.dataset.bmPrevOverflow;
  }
}

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusables() {
  if (!dialogRef.value) return [];
  return [...dialogRef.value.querySelectorAll(FOCUSABLE)]
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    if (!props.busy) { e.stopPropagation(); requestClose(); }
    return;
  }
  if (e.key !== 'Tab') return;
  const list = focusables();
  if (list.length === 0) { e.preventDefault(); return; }
  const first = list[0];
  const last = list[list.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function requestClose() {
  if (props.busy) return;
  emit('close');
}
function onBackdrop() {
  if (props.dismissible) requestClose();
}

watch(() => props.open, async (v) => {
  if (v) {
    lastFocused = document.activeElement;
    lockScroll();
    await nextTick();
    const list = focusables();
    (list.find((el) => el.dataset.autofocus !== undefined) || list[0] || dialogRef.value)?.focus?.();
  } else {
    unlockScroll();
    // 열기 전 위치로 포커스 복귀 — 키보드 사용자가 목록의 원래 자리로 돌아온다
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    lastFocused = null;
  }
}, { immediate: true });

onBeforeUnmount(() => { if (props.open) unlockScroll(); });
</script>

<template>
  <Teleport to="body">
    <div v-if="open">
      <div class="modal-backdrop fade show" @click="onBackdrop"></div>
      <div class="modal fade show d-block"
           tabindex="-1"
           role="dialog"
           aria-modal="true"
           :aria-labelledby="titleId"
           @keydown="onKeydown"
           @mousedown.self="onBackdrop">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"
             :class="size ? `modal-${size}` : ''"
             role="document">
          <div ref="dialogRef" class="modal-content shadow">
            <div class="modal-header">
              <h5 :id="titleId" class="modal-title">
                <i v-if="icon" class="bi me-2" :class="icon"></i>
                <slot name="title">{{ title }}</slot>
              </h5>
              <button type="button" class="btn-close" aria-label="닫기"
                      :disabled="busy" @click="requestClose"></button>
            </div>
            <div class="modal-body">
              <slot />
            </div>
            <div v-if="$slots.footer" class="modal-footer">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
