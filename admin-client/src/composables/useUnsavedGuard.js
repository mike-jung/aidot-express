/**
 * useUnsavedGuard — 저장하지 않은 편집을 두고 화면을 떠나려 할 때 붙잡는다. (v1.7.7)
 *
 *  v1.7.6 검토에서: 에디터 화면 6종에 이탈 경고가 **한 곳도 없었다.**
 *  이 콘솔은 사이드바 클릭 한 번으로 라우트가 바뀌므로, 잘못 누르면 작업이 조용히 사라진다.
 *
 *  두 가지 경로를 모두 막는다.
 *    · 앱 내 이동 (사이드바/뒤로가기) → vue-router 의 onBeforeRouteLeave + 우리 확인 대화상자
 *    · 브라우저 이탈 (새로고침/탭 닫기) → beforeunload (브라우저 기본 대화상자만 가능하다.
 *      명세상 커스텀 문구를 넣을 수 없으므로 preventDefault 만 한다.)
 *
 *  사용법 — setup 최상단에서:
 *      const dirty = computed(() => JSON.stringify(form) !== baseline.value);
 *      useUnsavedGuard(dirty);
 *
 *  저장 직후처럼 의도적으로 통과시켜야 할 때:
 *      const { skipOnce } = useUnsavedGuard(dirty);
 *      await save(); skipOnce();
 *
 * @param {import('vue').Ref<boolean>|(() => boolean)} isDirty
 * @param {{ message?: string, detail?: string }} [opts]
 */
import { onBeforeUnmount, onMounted } from 'vue';
import { useI18n } from './useI18n';
const { t } = useI18n();
import { onBeforeRouteLeave } from 'vue-router';
import { confirmDialog } from './useConfirm';

export function useUnsavedGuard(isDirty, opts = {}) {
  const dirty = () => {
    try {
      return typeof isDirty === 'function' ? !!isDirty() : !!isDirty?.value;
    } catch { return false; }
  };

  let skip = false;
  /** 다음 이탈 1회는 검사하지 않는다 (저장 직후 등) */
  const skipOnce = () => { skip = true; };

  function onBeforeUnload(e) {
    if (skip || !dirty()) return;
    // 명세상 커스텀 문구는 무시된다 — preventDefault 로 브라우저 기본 확인만 띄운다.
    e.preventDefault();
    e.returnValue = '';
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload));
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload));

  onBeforeRouteLeave(async () => {
    if (skip) { skip = false; return true; }
    if (!dirty()) return true;
    return await confirmDialog({
      title: t('designer.ug_title'),
      message: opts.message || t('designer.ug_message'),
      detail: opts.detail || '',
      confirmText: t('designer.ug_leave'),
      cancelText: t('designer.ug_stay'),
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
    });
  });

  return { skipOnce };
}

export default useUnsavedGuard;
