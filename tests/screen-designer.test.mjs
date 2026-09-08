/**
 * tests/screen-designer.test.mjs — 화면 디자이너: 화면 연결(행 클릭·버튼)과 생성 코드 (v1.11.7)
 *   ① paramsFromPath — /books/:id 에서 파라미터를 읽는다
 *   ② routePathFor — 경로에 이미 :id 가 있으면 또 붙이지 않는다
 *   ③ rowClickHandlers — router.push(대상, { id: row.id }) 를 만든다
 *   ④ genCompositeScreen — 핸들러·useRouter·defineProps·fetchOne(props.id) 가 실제로 파일에 들어간다
 *   ⑤ 미리보기 런타임 — 화면 이동 파라미터를 쓰고 다시 읽는다 (소스 검사)
 *   ⑥ scaffold — vue3 · vite · pinia · vue-router · bootstrap (내보낸 프로젝트가 바로 빌드되도록)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paramsFromPath, effectiveParams, createCompositeSpec, isRowClickable } from '../admin-client/src/generator/screens/compositeSchema.js';
import { routePathFor, rowClickHandlers, genCompositeScreen } from '../admin-client/src/generator/screens/compositeGen.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('① paramsFromPath / effectiveParams', () => {
  assert.deepEqual(paramsFromPath('/books/:id'), [{ name: 'id', required: true }]);
  assert.deepEqual(paramsFromPath('/x/{id}/y/:k?'), [{ name: 'id', required: true }, { name: 'k', required: false }]);
  assert.deepEqual(paramsFromPath('/books'), []);
  assert.deepEqual(paramsFromPath(null), []);
  const spec = createCompositeSpec({ title: '책 자세히', path: '/books/:id' });
  assert.deepEqual(spec.params, [{ name: 'id', required: true }], '화면을 만들 때 경로에서 자동으로');
  assert.deepEqual(effectiveParams({ path: '/a/:x' }), [{ name: 'x', required: true }]);
  assert.deepEqual(effectiveParams({ path: '/a/:x', params: [{ name: 'y', required: true }] }), [{ name: 'y', required: true }], '선언한 것이 우선');
});

test('② routePathFor: 경로의 :id 를 두 번 붙이지 않는다', () => {
  assert.equal(routePathFor({ path: '/books/:id', params: [{ name: 'id', required: true }] }), '/books/:id');
  assert.equal(routePathFor({ path: '/book-edit', params: [{ name: 'id', required: true }] }), '/book-edit/:id');
  assert.equal(routePathFor({ path: '/books', params: [] }), '/books');
});

test('③ rowClickHandlers: 행 클릭·버튼 → router.push', () => {
  const target = { id: 'sc_detail', title: '책 자세히', path: '/books/:id' };
  const spec = { id: 'sc_list', rows: [{ widgets: [
    { id: 'w1', kind: 'list', title: '책 목록', onRowClick: { action: 'navigate', target: 'sc_detail', params: { id: 'row.id' } } },
    { id: 'w2', kind: 'button', title: '새 책 등록', onRowClick: { action: 'navigate', target: 'sc_new', params: {} } },
    { id: 'w3', kind: 'list', title: '설정 없음' },
  ] }] };
  const { needsRouter, lines } = rowClickHandlers(spec, [target, { id: 'sc_new', title: '새 책', path: '/book-new' }]);
  assert.equal(needsRouter, true);
  const code = lines.join('\n');
  assert.match(code, /function onRowClick_w1\(row\) \{/);
  /* ★ v1.20.1 — 제목이 한글('책 자세히')이면 예전에는 id 꼬리로 `ScreenDetailView` 를 만들었다.
     이제 **경로**('/books/:id')에서 만들어 `BooksIdView` 가 된다 — 사람이 읽을 수 있는 이름이다. */
  assert.match(code, /router\.push\(\{ name: 'BooksIdView', params: \{ id: row\.id \} \}\)/);
  assert.match(code, /function onRowClick_w2\(row\) \{/);
  assert.ok(!/onRowClick_w3/.test(code), '설정이 없으면 핸들러도 없다');
  assert.equal(rowClickHandlers({ rows: [] }, []).needsRouter, false);
  assert.equal(isRowClickable('button'), true, '버튼도 "눌렀을 때 동작" 을 가진다');
});

test('④ genCompositeScreen: 상세는 props+fetchOne, 목록은 핸들러+useRouter', () => {
  const detail = { id: 'sc_detail', kind: 'composite', title: '책 자세히', path: '/books/:id', params: [{ name: 'id', required: true }],
    header: { kind: 'page-title', title: '책 자세히' },
    rows: [{ id: 'r1', widths: [12], widgets: [{ id: 'd1', kind: 'detail', title: '결과', source: { type: 'endpoint', method: 'GET', path: '/api/books/:id' } }] }] };
  const list = { id: 'sc_list', kind: 'composite', title: '책 목록', path: '/book-list', params: [],
    header: { kind: 'page-title', title: '책 목록' },
    rows: [{ id: 'r1', widths: [12], widgets: [
      { id: 'w1', kind: 'list', title: '책 목록', source: { type: 'endpoint', method: 'GET', path: '/api/books' }, onRowClick: { action: 'navigate', target: 'sc_detail', params: { id: 'row.id' } } },
      { id: 'w2', kind: 'button', title: '새 책 등록', config: { variant: 'success' }, onRowClick: { action: 'navigate', target: 'sc_detail', params: {} } },
    ] }] };
  const screens = [list, detail];
  const dFile = genCompositeScreen(detail, { screens }).content;
  assert.match(dFile, /<script setup>/);
  assert.match(dFile, /defineProps\(\{ id: \{ type: \[String, Number\], default: null \} \}\)/);
  assert.match(dFile, /fetchOne\(\{ id: props\.id \}\)/);
  assert.ok(!/fetchList\(\)/.test(dFile), '파라미터를 쓰는 화면은 목록 조회를 부르지 않는다');
  const lFile = genCompositeScreen(list, { screens }).content;
  assert.match(lFile, /import \{ useRouter \} from 'vue-router';/);
  assert.match(lFile, /const router = useRouter\(\);/);
  assert.match(lFile, /function onRowClick_w1\(row\)/);
  assert.match(lFile, /@row-click="onRowClick_w1"/);
  assert.match(lFile, /btn btn-success" @click="onRowClick_w2\(\{\}\)">새 책 등록</, '버튼 글자는 제목');
});

test('⑤ 미리보기 런타임: 화면 이동 파라미터', () => {
  const rt = read('admin-client/src/generator/widget-templates/previewRuntimes.js');
  assert.match(rt, /const __previewNav = reactive\(\{ params: \{\}, version: 0 \}\)/);
  assert.match(rt, /function resolveParam\(name, rowContext, queryParams\)/);
  assert.equal((rt.match(/__previewNav\.version/g) || []).length >= 5, true, '위젯들이 이동 파라미터를 지켜본다');
  assert.match(rt, /window\.__previewToken/, '인증 API 도 미리보기에서');
  const wb = read('admin-client/src/generator/screens/wholeAppPreviewBuilder.js');
  assert.match(wb, /window\.__previewNav\.params = resolved; window\.__previewNav\.version\+\+/);
  assert.match(wb, /case 'button':/);
  assert.ok(!/cdn\.jsdelivr\.net/.test(wb), 'Vue 를 CDN 에서 받지 않는다 (인터넷 없는 곳)');
});

test('⑥ scaffold: vue3 · vite · pinia · vue-router · bootstrap', () => {
  const sc = read('admin-client/src/generator/layouts/scaffoldGen.js');
  for (const dep of ["vue: '^3", "'vue-router': '^4", "pinia: '^2", "vite: '^5", "'@vitejs/plugin-vue'", "bootstrap: '^5", "'bootstrap-icons'"]) {
    assert.ok(sc.includes(dep), `package.json 에 ${dep}`);
  }
  assert.match(sc, /import 'bootstrap\/dist\/css\/bootstrap\.min\.css'/, 'CSS 도 패키지에서 (CDN 없이)');
  assert.ok(!/cdn\.jsdelivr\.net\/npm\/bootstrap/.test(sc), 'index.html 의 bootstrap CDN 제거');
});

test('⑦ [내 것만] 스위치 — 서버가 origin=workspace 로 거르고, 화면은 기본 켜짐', () => {
  for (const f of ['lib/admin/service/ControllerMetaService.js', 'lib/admin/service/ServiceMetaService.js', 'lib/admin/service/SqlMetaService.js']) {
    const src = read(f);
    assert.match(src, /const onlyWs = opts\.origin === 'workspace'/, f);
    assert.match(src, /hiddenBuiltin/, f);
  }
  for (const f of ['lib/admin/controller/ControllerMetaController.js', 'lib/admin/controller/ServiceMetaController.js', 'lib/admin/controller/SqlMetaController.js']) {
    assert.match(read(f), /origin: params\.origin/, f);
  }
  const composable = read('admin-client/src/composables/useOnlyWorkspace.js');
  assert.match(composable, /v === null \? true : v === '1'/, '기본값은 켜짐');
  for (const f of ['admin-client/src/views/ControllerList.vue', 'admin-client/src/views/ServiceList.vue', 'admin-client/src/views/SqlList.vue']) {
    const src = read(f);
    assert.match(src, /useOnlyWorkspace/, f);
    assert.match(src, /\.\.\.originParam\(\)/, f);
    assert.match(src, /id="onlyWs"/, f);
  }
});
