/**
 * 테스트 전용 로더 — `vue` / `vue-router` / pinia 스토어를 대역으로 바꿔치기한다.
 * 샌드박스에 admin-client 의 의존성을 설치할 수 없어, 컴포저블의 분기 로직만 실행하기 위한 장치다.
 */
export async function resolve(specifier, context, next) {
  if (specifier === 'vue') return { url: 'stub:vue', shortCircuit: true, format: 'module' };
  if (specifier === 'vue-router') return { url: 'stub:vue-router', shortCircuit: true, format: 'module' };
  if (specifier.endsWith('/stores/toasts')) return { url: 'stub:toasts', shortCircuit: true, format: 'module' };
  // Vite 는 확장자 없는 상대 import 를 해석하지만 Node 는 못 한다 → .js 를 붙여 재시도
  try {
    return await next(specifier, context);
  } catch (e) {
    if (e?.code === 'ERR_MODULE_NOT_FOUND' && /^\.{1,2}\//.test(specifier)) {
      return next(specifier + '.js', context);
    }
    throw e;
  }
}

export async function load(url, context, next) {
  if (url === 'stub:vue') {
    return { format: 'module', shortCircuit: true, source: `
const s = globalThis.__VUE_STUB__;
export const ref = s.ref, reactive = s.reactive, computed = s.computed, watch = s.watch;
export const nextTick = s.nextTick, onMounted = s.onMounted, onBeforeUnmount = s.onBeforeUnmount, useId = s.useId;
export default s;` };
  }
  if (url === 'stub:vue-router') {
    return { format: 'module', shortCircuit: true, source: `
export const onBeforeRouteLeave = (f) => globalThis.__VUE_ROUTER_STUB__.onBeforeRouteLeave(f);
export default { onBeforeRouteLeave };` };
  }
  if (url === 'stub:toasts') {
    return { format: 'module', shortCircuit: true, source: `
globalThis.__TOASTS__ = [];
export const useToastStore = () => ({ push: (t) => { globalThis.__TOASTS__.push(t); return 1; } });
export default { useToastStore };` };
  }
  return next(url, context);
}
