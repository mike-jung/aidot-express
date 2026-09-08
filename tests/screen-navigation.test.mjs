/**
 * 화면 전환(리스트 → 수정) 스키마·검증 시험. (v1.9.0)
 *
 *  로우코드 도구의 품질은 **잘못 만들 수 없게 막는 정도**로 갈린다.
 *  여기서 막지 못하면 사용자는 저장하고 미리보기를 눌러 본 뒤에야 잘못을 안다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const S = await import('../admin-client/src/generator/screens/compositeSchema.js');
const { createRowClick, isRowClickable, rowFieldOf, rowFieldCandidates,
  validateRowClick, validateScreenNavigation, findReferrers,
  createWidget, createCompositeSpec, ROW_CLICK_ACTIONS } = S;

const SCREENS = [
  { id: 'snack-list', title: '스낵 목록', params: [], rows: [] },
  { id: 'snack-edit', title: '스낵 수정', params: [{ name: 'id', required: true }], rows: [] },
  { id: 'report', title: '리포트', params: [{ name: 'from', required: false }], rows: [] },
];

const listWidget = (over = {}) => ({
  id: 'w1', kind: 'list', title: '스낵 목록',
  config: { columns: ['id', 'name', 'price'] },
  onRowClick: createRowClick({ action: 'navigate', target: 'snack-edit', params: { id: 'row.id' } }),
  ...over,
});

/* ── 스키마 기본 ─────────────────────────────────────────────────────── */

test('행이 있는 위젯만 클릭 설정을 갖는다', () => {
  assert.equal(isRowClickable('list'), true);
  assert.equal(isRowClickable('listPaged'), true);
  assert.equal(isRowClickable('timeline'), true);
  assert.equal(isRowClickable('stat'), false, '숫자 하나짜리에 행 클릭은 뜻이 없다');
  assert.equal(isRowClickable('detail'), false);
});

test('createWidget 이 행 위젯에만 onRowClick 을 붙인다', () => {
  assert.ok(createWidget({ kind: 'list' }).onRowClick, '리스트에는 있어야 한다');
  assert.equal('onRowClick' in createWidget({ kind: 'stat' }), false, '속성 창이 지저분해진다');
  assert.equal(createWidget({ kind: 'list' }).onRowClick.action, 'none', '기본은 기존 동작(무반응)');
});

test('새 화면은 params 를 빈 배열로 갖는다', () => {
  assert.deepEqual(createCompositeSpec({ title: 'x' }).params, []);
});

test('액션 목록은 첫 판에서 둘뿐이다', () => {
  // 액션을 여러 개 이어 붙이게 하면 급격히 어려워진다 — Retool 이 그 지점에서 질문이 가장 많다
  assert.deepEqual(ROW_CLICK_ACTIONS.map((a) => a.id), ['none', 'navigate']);
});

test('row.필드 파싱', () => {
  assert.equal(rowFieldOf('row.id'), 'id');
  assert.equal(rowFieldOf('row.customer_id'), 'customer_id');
  assert.equal(rowFieldOf('id'), null, 'row. 접두가 없으면 무효');
  assert.equal(rowFieldOf('{{ row.id }}'), null, '표현식 문법은 지원하지 않는다');
  assert.equal(rowFieldOf(''), null);
  assert.equal(rowFieldOf(null), null);
});

test('행 필드 후보에 id 가 항상 들어간다', () => {
  // columns 에 id 를 안 넣는 경우가 흔한데, 정작 이동에 필요한 건 id 다
  assert.deepEqual(rowFieldCandidates({ config: { columns: ['name', 'price'] } }), ['id', 'name', 'price']);
  assert.deepEqual(rowFieldCandidates({ config: {} }), ['id']);
  assert.deepEqual(rowFieldCandidates({ config: { columns: [{ key: 'name' }, { name: 'qty' }] } }),
    ['id', 'name', 'qty']);
});

/* ── 검증 ────────────────────────────────────────────────────────────── */

test('★ 올바른 설정은 통과한다', () => {
  assert.deepEqual(validateRowClick(listWidget(), SCREENS, 'snack-list'), []);
});

test('action=none 은 검사하지 않는다', () => {
  const w = listWidget({ onRowClick: createRowClick() });
  assert.deepEqual(validateRowClick(w, SCREENS, 'snack-list'), []);
});

test('★ 필수 파라미터가 비면 오류 — 이게 없으면 빈 화면이 뜬다', () => {
  const w = listWidget({ onRowClick: createRowClick({ action: 'navigate', target: 'snack-edit', params: {} }) });
  const r = validateRowClick(w, SCREENS, 'snack-list');
  assert.equal(r.length, 1);
  assert.equal(r[0].level, 'error');
  assert.match(r[0].message, /'id'/);
});

test('선택 파라미터는 비어도 통과한다', () => {
  const w = listWidget({ onRowClick: createRowClick({ action: 'navigate', target: 'report', params: {} }) });
  assert.deepEqual(validateRowClick(w, SCREENS, 'snack-list'), []);
});

test('이동할 화면을 안 고르면 오류', () => {
  const w = listWidget({ onRowClick: createRowClick({ action: 'navigate', target: '' }) });
  assert.equal(validateRowClick(w, SCREENS, 'snack-list')[0].level, 'error');
});

test('없는 화면을 가리키면 오류 — 화면을 지웠을 때', () => {
  const w = listWidget({ onRowClick: createRowClick({ action: 'navigate', target: 'gone', params: { id: 'row.id' } }) });
  const r = validateRowClick(w, SCREENS, 'snack-list');
  assert.equal(r[0].level, 'error');
  assert.match(r[0].message, /찾을 수 없습니다/);
});

test('★ 자기 자신으로 이동하면 오류 — 무한 루프', () => {
  const w = listWidget({ onRowClick: createRowClick({ action: 'navigate', target: 'snack-list', params: { id: 'row.id' } }) });
  const r = validateRowClick(w, SCREENS, 'snack-list');
  assert.equal(r[0].level, 'error');
  assert.match(r[0].message, /무한 루프/);
});

test('열 목록에 없는 필드를 바인딩하면 경고 — 오타 하나로 undefined 가 URL 에 들어간다', () => {
  const w = listWidget({ onRowClick: createRowClick({ action: 'navigate', target: 'snack-edit', params: { id: 'row.idd' } }) });
  const r = validateRowClick(w, SCREENS, 'snack-list');
  assert.equal(r.length, 1);
  assert.equal(r[0].level, 'warn', '막지는 않는다 — 소스가 열을 다 아는 것은 아니다');
  assert.match(r[0].message, /row\.idd/);
});

test('row. 형식이 아니면 오류', () => {
  const w = listWidget({ onRowClick: createRowClick({ action: 'navigate', target: 'snack-edit', params: { id: '{{ row.id }}' } }) });
  assert.equal(validateRowClick(w, SCREENS, 'snack-list')[0].level, 'error');
});

test('행 없는 위젯에 설정이 남으면 경고 — 종류를 바꿨을 때의 쓰레기', () => {
  const w = listWidget({ kind: 'stat' });
  const r = validateRowClick(w, SCREENS, 'snack-list');
  assert.equal(r[0].level, 'warn');
  assert.match(r[0].message, /행이 없어/);
});

/* ── 화면·프로젝트 단위 ──────────────────────────────────────────────── */

test('화면 전체를 훑어 문제를 모은다', () => {
  const screen = { id: 'snack-list', title: '목록', rows: [
    { widgets: [listWidget(), listWidget({ id: 'w2',
      onRowClick: createRowClick({ action: 'navigate', target: 'gone' }) })] },
  ] };
  const issues = validateScreenNavigation(screen, SCREENS);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].widgetId, 'w2', '어느 위젯인지 알려 줘야 고칠 수 있다');
});

test('★ 화면을 지우기 전에 가리키는 곳을 찾는다', () => {
  const screens = [
    { id: 'snack-list', title: '목록', rows: [{ widgets: [listWidget()] }] },
    { id: 'other', title: '다른 화면', rows: [{ widgets: [listWidget({ id: 'w9' })] }] },
    { id: 'snack-edit', title: '수정', rows: [] },
  ];
  const refs = findReferrers('snack-edit', screens);
  assert.equal(refs.length, 2, '지우면 링크 2개가 끊긴다');
  assert.deepEqual(refs.map((r) => r.screenId), ['snack-list', 'other']);
});

test('아무도 안 가리키면 빈 배열', () => {
  assert.deepEqual(findReferrers('report', [{ id: 'a', rows: [{ widgets: [listWidget()] }] }]), []);
});

test('망가진 입력에 던지지 않는다', () => {
  for (const bad of [null, undefined, {}, { onRowClick: null }, { onRowClick: {} }]) {
    assert.doesNotThrow(() => validateRowClick(bad, SCREENS, 'x'));
  }
  assert.doesNotThrow(() => validateScreenNavigation(null, SCREENS));
  assert.doesNotThrow(() => findReferrers('x', null ?? []));
});

/* ══════════════════════════════════════════════════════════════════════════
   생성기 — 나오는 코드가 실제로 이어지는지
   ══════════════════════════════════════════════════════════════════════════ */
const G = await import('../admin-client/src/generator/screens/compositeGen.js');

const GS = [
  { id: 'composite_a1b2c3', title: '스낵 목록', path: '/snack', params: [], rows: [] },
  { id: 'composite_d4e5f6', title: '스낵 수정', path: '/snack-edit', params: [{ name: 'id', required: true }], rows: [] },
  { id: 'composite_g7h8i9', title: 'Snack Report', path: '/rep', params: [{ name: 'from', required: false }], rows: [] },
];

test('★ 화면 params 가 라우트 경로가 된다', () => {
  assert.equal(G.routePathFor(GS[0]), '/snack', '선언이 없으면 그대로');
  assert.equal(G.routePathFor(GS[1]), '/snack-edit/:id');
  assert.equal(G.routePathFor(GS[2]), '/rep/:from?', '선택 파라미터는 ? — 없어도 열려야 한다');
});

test('★ 한글 제목 화면들의 라우트 이름이 충돌하지 않는다', () => {
  // v1.9.0 이전에는 fileSafe(pascal('스낵 목록')) 이 빈 문자열이 되어
  // 모든 화면이 'ScreenView' 로 같아졌다 — 파일명까지 덮어썼다
  const mod = G.genCompositeRouterModule(GS);
  const names = [...mod.content.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]);
  assert.equal(names.length, 3);
  assert.equal(new Set(names).size, 3, '이름이 겹치면 이동이 엉뚱한 화면으로 간다');
});

test('설정이 없으면 위젯 태그가 한 글자도 바뀌지 않는다', () => {
  assert.equal(G.rowClickAttrs({ id: 'w1', kind: 'list' }), '');
  assert.equal(G.rowClickAttrs({ id: 'w1', kind: 'list', onRowClick: createRowClick() }), '');
  assert.equal(G.rowClickAttrs({ id: 'w1', kind: 'list',
    onRowClick: createRowClick({ action: 'navigate', target: '' }) }), '', '대상이 없으면 생성하지 않는다');
});

test('설정이 있으면 클릭 가능 속성과 핸들러가 붙는다', () => {
  const attrs = G.rowClickAttrs({ id: 'wdg1', kind: 'list',
    onRowClick: createRowClick({ action: 'navigate', target: 'composite_d4e5f6', params: { id: 'row.id' } }) });
  assert.match(attrs, /:row-clickable="true"/);
  assert.match(attrs, /@row-click="onRowClick_wdg1"/);
});

test('★ 핸들러가 가리키는 라우트 이름이 라우터의 이름과 일치한다', () => {
  const w = { id: 'wdg1', kind: 'list', title: '목록', config: { columns: ['id'] },
    onRowClick: createRowClick({ action: 'navigate', target: 'composite_d4e5f6', params: { id: 'row.id' } }) };
  const { lines, needsRouter } = G.rowClickHandlers({ id: 'composite_a1b2c3', rows: [{ widgets: [w] }] }, GS);
  assert.equal(needsRouter, true);
  const push = lines.find((l) => l.includes('router.push'));
  const used = /name: '([^']+)'/.exec(push)[1];

  const mod = G.genCompositeRouterModule(GS);
  const declared = [...mod.content.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(declared.includes(used), `핸들러가 '${used}' 로 가는데 라우터에 그 이름이 없다`);
  assert.match(push, /params: \{ id: row\.id \}/);
});

test('파라미터가 없으면 params 를 넣지 않는다', () => {
  const w = { id: 'w2', kind: 'list',
    onRowClick: createRowClick({ action: 'navigate', target: 'composite_g7h8i9' }) };
  const { lines } = G.rowClickHandlers({ id: 'x', rows: [{ widgets: [w] }] }, GS);
  const push = lines.find((l) => l.includes('router.push'));
  assert.ok(push, '핸들러는 만들어져야 한다');
  assert.equal(/params:/.test(push), false, '빈 params 를 넣으면 URL 이 지저분해진다');
});

test('설정이 없는 화면은 router 를 요구하지 않는다', () => {
  const r = G.rowClickHandlers({ id: 'x', rows: [{ widgets: [{ id: 'w', kind: 'list' }] }] }, GS);
  assert.equal(r.needsRouter, false, '쓰지 않는 import 를 만들면 안 된다');
  assert.deepEqual(r.lines, []);
});

/* ══════════════════════════════════════════════════════════════════════════
   미리보기 — router.push 를 그대로 부르면 콘솔 화면 자체가 이동한다
   ══════════════════════════════════════════════════════════════════════════ */
const PB = await import('../admin-client/src/generator/screens/compositePreviewBuilder.js');

function previewSpec(onRowClick) {
  return { id: 'snack-list', kind: 'composite', title: '스낵 목록', path: '/snack', params: [],
    header: { kind: 'page-title', title: '스낵 목록', subtitle: '' },
    customVars: [{ name: 'snacks', expression: '[{id:3,name:"새우깡"}]' }], customFns: [],
    rows: [{ id: 'r1', widths: [12], style: {}, widgets: [{
      id: 'wdg1', kind: 'list', title: '스낵 목록',
      config: { columns: ['id', 'name'], maxRows: 10 },
      source: { type: 'customVar', varName: 'snacks' },
      ...(onRowClick ? { onRowClick } : {}),
    }] }] };
}

test('★ 미리보기는 router.push 를 쓰지 않는다 — 콘솔 화면이 이동해 버린다', () => {
  const doc = PB.buildCompositePreviewDoc({ spec: previewSpec(
    createRowClick({ action: 'navigate', target: 'snack-edit', params: { id: 'row.id' } })) });
  assert.equal(/router\.push/.test(doc), false, '미리보기에는 vue-router 가 없다');
  assert.match(doc, /__previewNavigate/);
});

test('미리보기 태그가 깨지지 않는다', () => {
  const doc = PB.buildCompositePreviewDoc({ spec: previewSpec(
    createRowClick({ action: 'navigate', target: 'snack-edit', params: { id: 'row.id' } })) });
  // `/ :row-clickable=... />` 처럼 슬래시 뒤에 속성이 붙으면 태그가 깨진다 (실제로 겪었다)
  assert.equal(/\/\s+:row-clickable/.test(doc), false, '자기닫힘 슬래시 뒤에 속성이 붙었다');
  // ⚠ `[^>]*` 는 화살표 함수의 '>' 에서 잘린다 — 줄 단위로 떼어낸다
  const tag = doc.split('\n').find((l) => l.includes('<ListWidget')).trim();
  assert.match(tag, /:row-clickable="true"/);
  assert.match(tag, /@row-click=/);
  assert.ok(tag.endsWith('/>'), `태그가 올바르게 닫히지 않았다: ${tag.slice(-50)}`);
});

test('설정이 없으면 미리보기 태그가 예전 그대로', () => {
  const doc = PB.buildCompositePreviewDoc({ spec: previewSpec(null) });
  const tag = /<ListWidget[^>]*>/.exec(doc)[0];
  assert.equal(/row-clickable/.test(tag), false);
  assert.equal(/row-click/.test(tag), false);
});

test('★ __previewNavigate 가 전역에 올라간다 — 자식 컴포넌트가 부른다', () => {
  // App 의 setup() 에서 return 만 하면 자식(ListWidget)은 그 스코프를 볼 수 없다.
  // 실제로 이것 때문에 클릭이 조용히 무시됐다.
  const doc = PB.buildCompositePreviewDoc({ spec: previewSpec(
    createRowClick({ action: 'navigate', target: 'snack-edit', params: { id: 'row.id' } })) });
  assert.match(doc, /window\.__previewNavigate = __previewNavigate/);
  assert.match(doc, /globalProperties\.__previewNavigate/);
});

test('미리보기 리스트 런타임이 rowClickable 을 받는다', async () => {
  const { WIDGET_PREVIEW_CODE } = await import('../admin-client/src/generator/widget-templates/previewRuntimes.js');
  const code = String(WIDGET_PREVIEW_CODE);
  assert.match(code, /rowClickable/);
  assert.match(code, /row-click/);
  assert.match(code, /keyup\.enter/, '클릭만 되면 키보드 사용자가 쓸 수 없다');
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.9.2 — 전체 앱 미리보기
   v1.9.1 은 compositePreviewBuilder(단일 화면)만 고쳤는데, '미리보기 탭'은
   wholeAppPreviewBuilder 라는 **완전히 다른 빌더**를 쓴다. 그래서 실제로는
   행에 클릭 속성조차 붙지 않았다.
   ══════════════════════════════════════════════════════════════════════════ */
const WB = await import('../admin-client/src/generator/screens/wholeAppPreviewBuilder.js');

function appProject(withClick = true) {
  const list = { id: 'snack-list', kind: 'composite', title: '스낵 목록', path: '/snack', params: [],
    header: { kind: 'page-title', title: '스낵 목록', subtitle: '' }, customVars: [], customFns: [],
    rows: [{ id: 'r1', widths: [12], style: {}, widgets: [{
      id: 'wdg1', kind: 'list', title: '스낵 목록', config: { columns: ['id', 'name'], maxRows: 10 },
      source: { type: 'endpoint', path: '/api/snacks', resultKey: 'data' },
      ...(withClick ? { onRowClick: createRowClick({
        action: 'navigate', target: 'snack-edit', params: { id: 'row.id' } }) } : {}),
    }] }] };
  const edit = { id: 'snack-edit', kind: 'composite', title: '스낵 수정', path: '/snack-edit',
    params: [{ name: 'id', required: true }],
    header: { kind: 'page-title', title: '스낵 수정', subtitle: '' }, customVars: [], customFns: [],
    rows: [{ id: 'r1', widths: [12], style: {}, widgets: [
      { id: 'wdg2', kind: 'markdown', title: '수정', config: { text: 'x' }, source: null }] }] };
  return { id: 'p1', name: '스낵 앱', screens: [list, edit],
    layout: { kind: 'sidebar-left', title: { text: '스낵 앱' }, menu: { items: [] } } };
}

test('★ 전체 앱 미리보기에도 행 클릭이 붙는다 — 이게 빠져서 이동이 안 됐다', () => {
  const doc = WB.buildWholeAppPreviewDoc({ project: appProject(true) });
  assert.match(doc, /:row-clickable="true"/);
  assert.match(doc, /__previewNavigate\('snack-edit'/);
});

test('★ 정규식 대신 문자열 조작을 쓴다 — 템플릿을 거치며 백슬래시가 먹힌다', () => {
  // 실제로 문서에 `/^row.([w$]+)$/` 로 새겨져 값이 안 풀리고 'row.id' 가 그대로 넘어갔다
  for (const doc of [
    WB.buildWholeAppPreviewDoc({ project: appProject(true) }),
    PB.buildCompositePreviewDoc({ spec: previewSpec(createRowClick(
      { action: 'navigate', target: 'snack-edit', params: { id: 'row.id' } })) }),
  ]) {
    assert.equal(/\[w\$\]/.test(doc), false, '백슬래시가 먹힌 정규식이 문서에 새겨졌다');
    assert.match(doc, /indexOf\('row\.'\)/, '문자열 조작으로 파싱해야 한다');
  }
});

test('메뉴에 없는 화면도 이동 대상이 된다', () => {
  // 수정 화면은 메뉴에 없는 경우가 많다. MENU 만 보면 못 간다.
  const doc = WB.buildWholeAppPreviewDoc({ project: appProject(true) });
  assert.match(doc, /SCREEN_INDEX/);
  assert.match(doc, /"snack-edit"/);
});

test('★ 뒤로 가기가 있다 — 없으면 수정 화면에 갇힌다', () => {
  const doc = WB.buildWholeAppPreviewDoc({ project: appProject(true) });
  assert.match(doc, /__previewBack/);
  assert.match(doc, /navStack/);
  assert.match(doc, /받은 값/, '넘어온 값을 보여 줘야 설정이 맞는지 안다');
});

test('전체 앱 미리보기도 router.push 를 실행하지 않는다', () => {
  const doc = WB.buildWholeAppPreviewDoc({ project: appProject(true) });
  // 주석에 단어가 들어 있을 수 있으므로 '실행되는 코드'만 본다
  const code = doc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  assert.equal(/router\s*\.\s*push\s*\(/.test(code), false,
    '미리보기에는 vue-router 가 없다 — 부르면 콘솔 화면 자체가 이동한다');
});

test('설정이 없으면 전체 앱 미리보기 태그가 예전 그대로', () => {
  const doc = WB.buildWholeAppPreviewDoc({ project: appProject(false) });
  const tag = doc.split('\n').find((l) => l.includes('<ListWidget'));
  assert.equal(/row-clickable/.test(tag), false);
  assert.ok(tag.trim().endsWith('/>'), '태그가 깨지지 않아야 한다');
});
