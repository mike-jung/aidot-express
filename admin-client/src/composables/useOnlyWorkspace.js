/**
 * useOnlyWorkspace — 컨트롤러 · 서비스 · SQL 목록의 [내 것만] 스위치 (v1.11.7)
 *
 *  켜져 있으면 작업 폴더(APP_WORKSPACE)의 파일만 목록에 보인다. 예제(src/)가 섞여 있으면
 *  내가 만든 것을 찾기 어렵다고 해서 넣었다. 기본은 켜짐, 브라우저에 기억한다.
 *  서버가 origin=workspace 로 걸러 주므로 페이지 수도 맞다.
 */
import { ref, watch } from 'vue';

const KEY = 'aidot.admin.onlyWorkspace';
const state = ref((() => { try { const v = localStorage.getItem(KEY); return v === null ? true : v === '1'; } catch { return true; } })());
watch(state, (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* noop */ } });

export function useOnlyWorkspace() {
  return {
    onlyWorkspace: state,
    /** http params 에 섞어 쓴다: { ...originParam() } */
    originParam: () => (state.value ? { origin: 'workspace' } : {}),
  };
}
