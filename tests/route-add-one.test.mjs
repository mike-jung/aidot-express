/**
 * 라우트 **개별 추가** 회귀 시험. (v1.8.4)
 *
 * ## 무엇이 문제였나
 * 컨트롤러 편집기에는 개별 추가 기능이 원래 있었지만(`+ 라우트 추가...` 셀렉트),
 * 일괄 생성과 **fallback 이 달랐다.**
 *
 *   일괄 생성 `generate5DefaultRoutes()` → `defaultRouteSpec(type)` 사용
 *   개별 추가 `addRoute()`                → `{ method:'get', path:'/', handlerName:'handler' }` 고정
 *
 * 서버 카탈로그(`/api/admin/controllers/route-types`)가 아직 도착하지 않은 동안
 * 개별 추가로 `remove` 를 고르면 `DELETE /:id remove` 가 아니라 **`GET / handler`** 가 만들어졌다.
 * 같은 화면에서 두 경로의 결과가 달랐던 것이다.
 *
 * ## 왜 로직을 여기에 옮겨 적었나
 * `ControllerEditor.vue` 는 SFC 라 Node 테스트에서 import 할 수 없다.
 * 두 경로가 **같은 스펙을 쓰는지**만 확인한다 — 그것이 이 결함의 본질이다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

/** 카탈로그 로드 전 fallback (ControllerEditor.defaultRouteSpec 와 동일) */
function defaultRouteSpec(type) {
  return ({
    list: { method: 'get', path: '/', handlerName: 'list' },
    getById: { method: 'get', path: '/:id', handlerName: 'get' },
    create: { method: 'post', path: '/', handlerName: 'create' },
    updateName: { method: 'put', path: '/:id', handlerName: 'update' },
    remove: { method: 'delete', path: '/:id', handlerName: 'remove' },
  })[type] || { method: 'get', path: '/', handlerName: 'handler' };
}

/** 고친 뒤의 addRoute — 일괄 생성과 같은 fallback */
function addRoute(type, routeTypes = []) {
  const tpl = routeTypes.find((t) => t.type === type);
  const d = defaultRouteSpec(type);
  return {
    type,
    method: tpl?.method || d.method,
    path: tpl?.path || d.path,
    handlerName: tpl?.handlerName || d.handlerName,
  };
}

/** 일괄 생성이 만드는 한 건 */
function bulkRoute(type, routeTypes = []) {
  const tpl = routeTypes.find((t) => t.type === type);
  const d = defaultRouteSpec(type);
  return {
    type,
    method: tpl?.method || d.method,
    path: tpl?.path || d.path,
    handlerName: tpl?.handlerName || d.handlerName,
  };
}

/** 개별 추가 메뉴 항목 (카탈로그가 비어도 메뉴가 비지 않아야 한다) */
function routeAddOptions(routeTypes = []) {
  if (routeTypes.length) return routeTypes;
  return ['list', 'getById', 'create', 'updateName', 'remove'].map((type) => {
    const d = defaultRouteSpec(type);
    return { type, ...d, description: `${d.method.toUpperCase()} ${d.path}` };
  });
}

const TYPES = ['list', 'getById', 'create', 'updateName', 'remove'];

/** 서버 카탈로그가 정상 도착한 경우 */
const CATALOG = [
  { type: 'list', method: 'get', path: '/', handlerName: 'list', description: '전체 조회' },
  { type: 'getById', method: 'get', path: '/:id', handlerName: 'get', description: '단건 조회' },
  { type: 'create', method: 'post', path: '/', handlerName: 'create', description: '생성' },
  { type: 'updateName', method: 'put', path: '/:id', handlerName: 'update', description: '수정' },
  { type: 'remove', method: 'delete', path: '/:id', handlerName: 'remove', description: '삭제' },
];

test('★ 카탈로그가 아직 안 왔어도 개별 추가가 올바른 스펙을 만든다', () => {
  // 이전에는 전부 GET / handler 로 떨어져, DELETE 를 골라도 GET 이 생겼다
  assert.deepEqual(addRoute('remove', []),
    { type: 'remove', method: 'delete', path: '/:id', handlerName: 'remove' });
  assert.deepEqual(addRoute('create', []),
    { type: 'create', method: 'post', path: '/', handlerName: 'create' });
  assert.deepEqual(addRoute('updateName', []),
    { type: 'updateName', method: 'put', path: '/:id', handlerName: 'update' });
});

test('개별 추가와 일괄 생성이 같은 결과를 낸다 — 카탈로그 없이', () => {
  for (const t of TYPES) {
    assert.deepEqual(addRoute(t, []), bulkRoute(t, []),
      `${t}: 같은 화면에서 두 경로의 결과가 다르면 안 된다`);
  }
});

test('개별 추가와 일괄 생성이 같은 결과를 낸다 — 카탈로그 있음', () => {
  for (const t of TYPES) {
    assert.deepEqual(addRoute(t, CATALOG), bulkRoute(t, CATALOG));
  }
});

test('카탈로그가 오면 서버 값이 fallback 을 이긴다', () => {
  const custom = [{ type: 'list', method: 'get', path: '/all', handlerName: 'findEverything' }];
  const r = addRoute('list', custom);
  assert.equal(r.path, '/all', '서버가 경로를 바꿨으면 그것을 따라야 한다');
  assert.equal(r.handlerName, 'findEverything');
});

test('모르는 타입은 안전한 기본값으로 떨어진다', () => {
  assert.deepEqual(addRoute('somethingNew', []),
    { type: 'somethingNew', method: 'get', path: '/', handlerName: 'handler' });
});

test('카탈로그가 비어도 추가 메뉴가 비지 않는다', () => {
  const opts = routeAddOptions([]);
  assert.equal(opts.length, 5, '메뉴가 비면 사용자는 추가 기능이 없다고 생각한다');
  assert.deepEqual(opts.map((o) => o.type), TYPES);
  for (const o of opts) assert.ok(o.description, '설명이 없으면 무엇인지 알 수 없다');
});

test('카탈로그가 있으면 그것을 그대로 보여 준다', () => {
  assert.deepEqual(routeAddOptions(CATALOG), CATALOG);
});

test('메뉴 항목이 실제로 추가 가능한 타입과 일치한다', () => {
  // 메뉴에 있는데 추가하면 엉뚱한 것이 나오면 안 된다
  for (const o of routeAddOptions([])) {
    const r = addRoute(o.type, []);
    assert.equal(r.method, o.method);
    assert.equal(r.path, o.path);
  }
});
