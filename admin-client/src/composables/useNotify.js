/**
 * useNotify — `window.alert()` 을 대체하는 toast 헬퍼. (v1.7.7)
 *
 *  `alert()` 의 실질적 문제는 미관이 아니라 **텍스트를 복사할 수 없다는 것**이었다.
 *  `alert('저장 실패: ' + e.message)` 로 띄운 서버 오류를 사용자가 우리에게 전달할 방법이 없었다.
 *  toast 는 화면에 남고 선택·복사가 되며, 탭을 멈추지 않는다.
 *
 *  이미 있는 stores/toasts.js 를 감싸기만 한다 — 새 인프라를 만들지 않는다.
 *  Pinia 스토어를 setup 바깥에서 부르므로, 앱에 pinia 가 설치된 뒤에만 호출해야 한다
 *  (이벤트 핸들러 안에서 부르는 실제 사용 패턴은 항상 그 조건을 만족한다).
 */
import { useToastStore } from '../stores/toasts';

/** axios 오류 / Error / 문자열에서 사람이 읽을 메시지를 뽑는다. */
export function errorMessage(e, fallback = '알 수 없는 오류') {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  const d = e.response?.data;
  if (d?.errors?.length) {
    return d.errors.map((x) => (x.field ? `${x.field}: ${x.message}` : x.message)).join(', ');
  }
  return d?.message || e.message || String(e) || fallback;
}

export function notifyError(title, e) {
  useToastStore().push({ type: 'error', title, message: errorMessage(e), timeout: 8000 });
}

export function notifySuccess(title, message = '') {
  useToastStore().push({ type: 'success', title, message });
}

export function notifyInfo(title, message = '') {
  useToastStore().push({ type: 'info', title, message });
}

export function notifyWarning(title, message = '') {
  useToastStore().push({ type: 'warning', title, message, timeout: 6000 });
}

export default { errorMessage, notifyError, notifySuccess, notifyInfo, notifyWarning };
