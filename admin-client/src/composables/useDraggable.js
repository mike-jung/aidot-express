import { ref, onMounted, onUnmounted } from 'vue';

/**
 * 모달 드래그 + 리사이즈.
 *
 *  사용법:
 *    const { modalRef, headerRef } = useDraggable();
 *    <div ref="modalRef" class="app-modal" ...>
 *      <div ref="headerRef" class="modal-header" ...>
 */
export function useDraggable() {
  const modalRef = ref(null);
  const headerRef = ref(null);

  let isDragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  function onMouseDown(e) {
    // 버튼이나 input 클릭은 무시
    if (e.target.closest('button, input, select, textarea, .btn-close')) return;
    const modal = modalRef.value;
    if (!modal) return;

    isDragging = true;
    const rect = modal.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    // 초기 위치 설정 (transform → position)
    modal.style.position = 'fixed';
    modal.style.left = startLeft + 'px';
    modal.style.top = startTop + 'px';
    modal.style.transform = 'none';
    modal.style.margin = '0';

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!isDragging || !modalRef.value) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    modalRef.value.style.left = (startLeft + dx) + 'px';
    modalRef.value.style.top = Math.max(0, startTop + dy) + 'px';
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  onMounted(() => {
    const header = headerRef.value;
    if (header) {
      header.style.cursor = 'move';
      header.addEventListener('mousedown', onMouseDown);
    }
    // 리사이즈 활성화
    const modal = modalRef.value;
    if (modal) {
      modal.style.resize = 'both';
      modal.style.overflow = 'auto';
      modal.style.minWidth = '400px';
      modal.style.minHeight = '300px';
    }
  });

  onUnmounted(() => {
    const header = headerRef.value;
    if (header) header.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  });

  return { modalRef, headerRef };
}
