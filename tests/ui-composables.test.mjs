/**
 * 확인 대화상자 / 알림 / 이탈 가드 컴포저블 실행 검증. (v1.7.7)
 *   node --test tests/ui-composables.test.mjs
 *
 * ⚠ 샌드박스에 `vue` 를 설치할 수 없어 최소 반응성 대역(`ref`/`reactive`/`computed`)을 주입해
 *   컴포저블의 **분기 로직**을 실제로 실행한다. 렌더링은 검증 대상이 아니다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '..', 'admin-client', 'src');

/* ── vue / vue-router 대역 주입 ─────────────────────────────────────────── */
const routeLeaveGuards = [];
const vueStub = {
  ref: (v) => ({ value: v }),
  reactive: (o) => o,
  computed: (g) => ({ get value() { return typeof g === 'function' ? g() : g.get(); } }),
  watch: () => {},
  nextTick: async () => {},
  onMounted: (f) => f(),
  onBeforeUnmount: () => {},
  useId: () => 'x1',
};
const routerStub = { onBeforeRouteLeave: (f) => routeLeaveGuards.push(f) };


const { register } = await import('node:module');
const loaderUrl = pathToFileURL(path.join(here, '_stub-loader.mjs')).href;
register(loaderUrl, import.meta.url);
globalThis.__VUE_STUB__ = vueStub;
globalThis.__VUE_ROUTER_STUB__ = routerStub;
globalThis.window = { addEventListener() {}, removeEventListener() {} };

const useConfirm = await import(pathToFileURL(path.join(SRC, 'composables/useConfirm.js')).href);
const { confirmState, confirmDialog, confirmDelete, resolveConfirm, canConfirm } = useConfirm;
const { errorMessage } = await import(pathToFileURL(path.join(SRC, 'composables/useNotify.js')).href);
const { useUnsavedGuard } = await import(pathToFileURL(path.join(SRC, 'composables/useUnsavedGuard.js')).href);

/* ── useConfirm ─────────────────────────────────────────────────────────── */

test('확인을 누르면 true, 취소를 누르면 false 로 resolve 된다', async () => {
  const p1 = confirmDialog({ message: '진행할까요?' });
  assert.equal(confirmState.open, true);
  resolveConfirm(true);
  assert.equal(await p1, true);
  assert.equal(confirmState.open, false);

  const p2 = confirmDialog({ message: '진행할까요?' });
  resolveConfirm(false);
  assert.equal(await p2, false);
});

test('danger 변형은 버튼 문구와 아이콘이 삭제용으로 바뀐다', async () => {
  const p = confirmDialog({ message: 'x', variant: 'danger' });
  /* ★ v1.40.4 — 문구가 사전을 거치므로 언어에 따라 달라진다.
     예전에는 '삭제' 로 못박아, 사전이 English 로 잡히면 시험이 깨졌다.
     확인용 기본 문구와 다른지만 본다 — 그것이 이 시험이 지키려던 것이다. */
  assert.notEqual(confirmState.confirmText, '');
  assert.ok(['삭제', 'Delete'].includes(confirmState.confirmText),
    `danger 는 삭제 문구여야 한다: ${confirmState.confirmText}`);
  assert.equal(confirmState.icon, 'bi-trash3');
  resolveConfirm(false); await p;
});

test('confirmDelete 는 대상 이름을 본문에 반드시 남긴다', async () => {
  const p = confirmDelete('BookController', { detail: '파일이 제거됩니다.' });
  assert.match(confirmState.message, /BookController/);
  assert.equal(confirmState.detail, '파일이 제거됩니다.');
  assert.equal(confirmState.variant, 'danger');
  resolveConfirm(true);
  assert.equal(await p, true);
});

test('requireText 가 있으면 정확히 입력해야 확인이 열린다', async () => {
  const p = confirmDialog({ message: 'x', requireText: 'my-project' });
  assert.equal(canConfirm(), false);
  confirmState.typed = 'my-projec';
  assert.equal(canConfirm(), false);
  confirmState.typed = '  my-project  ';        // 앞뒤 공백은 허용
  assert.equal(canConfirm(), true);
  resolveConfirm(true);
  assert.equal(await p, true);
  assert.equal(confirmState.typed, '', '닫힐 때 입력값이 남으면 다음 대화상자에 샌다');
});

test('requireText 가 없으면 곧바로 확인할 수 있다', async () => {
  const p = confirmDialog({ message: 'x' });
  assert.equal(canConfirm(), true);
  resolveConfirm(true); await p;
});

test('열려 있는 상태에서 새로 열면 이전 요청은 false 로 정리된다 (버튼 연타)', async () => {
  const first = confirmDialog({ message: '첫 번째' });
  const second = confirmDialog({ message: '두 번째' });
  assert.equal(await first, false, '방치된 Promise 가 남으면 호출부가 영원히 대기한다');
  assert.equal(confirmState.message, '두 번째');
  resolveConfirm(true);
  assert.equal(await second, true);
});

/* ── useNotify ──────────────────────────────────────────────────────────── */

test('errorMessage 는 axios 오류에서 사람이 읽을 문구를 뽑는다', () => {
  assert.equal(errorMessage({ response: { data: { message: '권한 없음' } } }), '권한 없음');
  assert.equal(errorMessage(new Error('boom')), 'boom');
  assert.equal(errorMessage('문자열 그대로'), '문자열 그대로');
  assert.equal(errorMessage(null, '기본값'), '기본값');
});

test('errorMessage 는 서버의 필드 검증 오류 배열을 합쳐 보여 준다', () => {
  const e = { response: { data: { errors: [
    { field: 'name', message: '필수' }, { field: 'basePath', message: '형식 오류' },
  ] } } };
  assert.equal(errorMessage(e), 'name: 필수, basePath: 형식 오류');
});

/* ── useUnsavedGuard ────────────────────────────────────────────────────── */

test('편집이 없으면 이탈을 막지 않는다', async () => {
  routeLeaveGuards.length = 0;
  const dirty = { value: false };
  useUnsavedGuard(dirty);
  assert.equal(await routeLeaveGuards[0](), true);
});

test('편집이 있으면 확인 대화상자를 띄우고, 그 답을 그대로 돌려준다', async () => {
  routeLeaveGuards.length = 0;
  const dirty = { value: true };
  useUnsavedGuard(dirty);

  const leaving = routeLeaveGuards[0]();
  await Promise.resolve();
  assert.equal(confirmState.open, true);
  assert.equal(confirmState.confirmText, '떠나기');
  resolveConfirm(false);
  assert.equal(await leaving, false, '취소했는데 떠나면 작업이 사라진다');

  const leaving2 = routeLeaveGuards[0]();
  await Promise.resolve();
  resolveConfirm(true);
  assert.equal(await leaving2, true);
});

test('skipOnce 는 딱 한 번만 가드를 통과시킨다 (저장 직후)', async () => {
  routeLeaveGuards.length = 0;
  const dirty = { value: true };
  const { skipOnce } = useUnsavedGuard(dirty);

  skipOnce();
  assert.equal(await routeLeaveGuards[0](), true, '저장 직후에는 묻지 않아야 한다');

  const again = routeLeaveGuards[0]();          // 두 번째부터는 다시 막는다
  await Promise.resolve();
  assert.equal(confirmState.open, true);
  resolveConfirm(false);
  assert.equal(await again, false);
});

test('isDirty 를 함수로 넘겨도 동작하고, 예외가 나면 막지 않는다', async () => {
  routeLeaveGuards.length = 0;
  useUnsavedGuard(() => { throw new Error('계산 실패'); });
  assert.equal(await routeLeaveGuards[0](), true, '판정이 깨졌다고 사용자를 가두면 안 된다');
});
