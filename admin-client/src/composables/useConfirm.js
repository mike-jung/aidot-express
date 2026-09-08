/**
 * useConfirm — 네이티브 `window.confirm()` 을 대체하는 공용 확인 대화상자. (v1.7.7)
 *
 *  왜 바꾸는가 (v1.7.6 검토에서):
 *   1. 크롬은 같은 화면에서 반복되는 대화상자에 "추가 대화상자를 표시하지 않음" 체크를 띄운다.
 *      사용자가 그걸 체크하면 이후 `confirm()` 은 **항상 false 를 반환**한다.
 *      → 삭제 버튼이 아무 반응 없이 죽은 것처럼 보이고, 원인 추적이 사실상 불가능하다.
 *   2. 탭 전체가 멈춰 SSE 스트림(모니터링·로그) 이 끊긴다.
 *   3. 무엇을 지우는지 본문에 제대로 담을 수 없다.
 *
 *  사용법 — 반드시 await:
 *      if (!await confirmDialog({ title: '삭제', message: `'${name}' 을 삭제할까요?` })) return;
 *
 *  되돌릴 수 없는 작업은 대상 이름을 직접 입력하게 한다:
 *      await confirmDialog({ ..., requireText: row.name })
 *
 *  상태는 모듈 전역 하나뿐이다 (동시에 두 개가 뜨지 않는다).
 *  MainLayout 에 <ConfirmDialog /> 를 한 번 마운트하면 어디서든 호출할 수 있다.
 */
import { reactive } from 'vue';
import { useI18n } from './useI18n';
const { t } = useI18n();

/** ConfirmDialog.vue 가 그대로 읽는 상태 */
export const confirmState = reactive({
  open: false,
  title: t('designer.cf_confirm'),
  message: '',
  detail: '',            // 회색 보조 설명 (선택)
  confirmText: t('designer.cf_confirm'),
  cancelText: t('designer.cf_cancel'),
  variant: 'primary',    // 'primary' | 'danger'
  requireText: null,     // 값이 있으면 그 문자열을 정확히 입력해야 확인 버튼이 열린다
  typed: '',             // requireText 입력값
  icon: null,
});

let resolver = null;

/** 대화상자를 열고 사용자의 선택을 Promise<boolean> 로 돌려준다. */
export function confirmDialog(opts = {}) {
  // 이미 열려 있으면 이전 요청은 취소로 정리한다 (버튼 연타 방어)
  if (resolver) { const r = resolver; resolver = null; r(false); }

  Object.assign(confirmState, {
    open: true,
    title: opts.title ?? t('designer.cf_confirm'),
    message: opts.message ?? '',
    detail: opts.detail ?? '',
    confirmText: opts.confirmText ?? (opts.variant === 'danger' ? t('designer.cf_delete') : t('designer.cf_confirm')),
    cancelText: opts.cancelText ?? t('designer.cf_cancel'),
    variant: opts.variant ?? 'primary',
    requireText: opts.requireText ?? null,
    typed: '',
    icon: opts.icon ?? (opts.variant === 'danger' ? 'bi-trash3' : 'bi-question-circle'),
  });

  return new Promise((resolve) => { resolver = resolve; });
}

/** 삭제 확인 단축 — 대상 이름을 본문에 반드시 남긴다. */
export function confirmDelete(name, opts = {}) {
  return confirmDialog({
    title: opts.title ?? '삭제 확인',
    message: `'${name}' 을(를) 삭제할까요?`,
    detail: opts.detail ?? '',
    variant: 'danger',
    confirmText: '삭제',
    ...opts,
  });
}

/** ConfirmDialog.vue 전용 — 사용자가 선택했을 때 호출 */
export function resolveConfirm(value) {
  confirmState.open = false;
  confirmState.typed = '';
  const r = resolver;
  resolver = null;
  if (r) r(!!value);
}

/** 확인 버튼을 눌러도 되는 상태인지 (requireText 검사) */
export function canConfirm() {
  if (!confirmState.requireText) return true;
  return confirmState.typed.trim() === String(confirmState.requireText).trim();
}

export default { confirmState, confirmDialog, confirmDelete, resolveConfirm, canConfirm };
