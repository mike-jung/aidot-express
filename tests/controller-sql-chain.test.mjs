/**
 * 컨트롤러 라우트 → 서비스 메서드 → SQL 쿼리 **체인 해석** 회귀 시험. (v1.8.3)
 *
 * ## 무엇이 문제였나
 * '신규 컨트롤러' 에서 5개 기본 라우트를 만들고 [SQL] 아이콘을 누르면 언제나 '없음' 이었다.
 * [서비스] 아이콘은 정상이었으므로 라우트→서비스까지는 이어져 있었고, 그 다음 한 칸이 끊긴 것이다.
 *
 * 원인이 **두 개** 겹쳐 있었다.
 *
 *  ① 서버가 매핑을 만들어 놓고 응답에서 뺐다.
 *     `ServiceMetaService._buildInfo()` 는 소스를 파싱해
 *     `method_sql_map = { list:'findAll', getById:'findById', ... }` 를 만든다.
 *     그런데 `listAll()`(= `/api/admin/services/all`) 이 이 필드를 빼고 내보냈다.
 *     프론트는 받을 수가 없으니 SQL 을 알 방법이 없었다.
 *
 *  ② 프론트가 표준 라우트의 SQL 을 채우지 않았다.
 *     `initRoute()` 가 `type === 'multiSql'` 일 때만 SQL 을 넣고,
 *     표준 라우트는 **서비스를 거쳐 SQL 에 닿는 한 단계를 아예 따라가지 않았다.**
 *
 *  ③ 그리고 이름 체계가 달랐다.
 *     컨트롤러 카탈로그: `getById` → handlerName `'get'`, `updateName` → `'update'`
 *     서비스 카탈로그  : 메서드명이 곧 type (`'getById'`, `'updateName'`)
 *     handlerName 으로만 이으면 5개 중 2개가 서비스에서 안 잡힌다.
 *
 * ## 왜 로직을 여기에 옮겨 적었나
 * `ControllerEditor.vue` 는 SFC 라 Node 테스트에서 import 할 수 없다.
 * 해석 규칙만 SFC 와 같은 순서·같은 조건으로 옮겨 시험한다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

/** `/api/admin/services/all` 이 주는 모양 (v1.8.3 이후) */
const SERVICES = [
  {
    name: 'SnackService', sql_file: 'snack',
    methods: ['list', 'getById', 'create', 'updateName', 'remove'],
    method_sql_map: { list: 'findAll', getById: 'findById', create: 'insert', updateName: 'updateName', remove: 'deleteById' },
    multiSqlMethods: [], multiSqlSteps: {},
  },
  {
    name: 'ReportService', sql_file: 'report',
    methods: ['list'],
    method_sql_map: { list: 'findAll' },
    multiSqlMethods: [{ name: 'monthly' }],
    multiSqlSteps: { monthly: ['report.header', 'report.rows'] },
  },
  { // sql_file 이 없는 서비스 — 어떤 파일의 쿼리인지 특정할 수 없다
    name: 'PlainService', sql_file: null,
    methods: ['doThing'], method_sql_map: { doThing: 'whatever' },
    multiSqlMethods: [], multiSqlSteps: {},
  },
];

function resolveServiceMethodName(serviceName, type, handlerName) {
  const svc = SERVICES.find((x) => x.name === serviceName);
  const known = new Set([...(svc?.methods || []), ...((svc?.multiSqlMethods || []).map((m) => m.name))]);
  if (type && type !== 'custom' && known.has(type)) return type;
  if (handlerName && known.has(handlerName)) return handlerName;
  return handlerName || type || 'handler';
}

function sqlQueriesForServiceMethod(id) {
  const dot = String(id || '').indexOf('.');
  if (dot < 0) return [];
  const svc = SERVICES.find((x) => x.name === id.slice(0, dot));
  if (!svc) return [];
  const method = id.slice(dot + 1);
  const steps = svc.multiSqlSteps?.[method];
  if (Array.isArray(steps) && steps.length) return steps;
  const query = svc.method_sql_map?.[method];
  if (!query || !svc.sql_file) return [];
  return [`${svc.sql_file}.${query}`];
}

const sqlQueriesForRoute = (ids) => {
  const out = [];
  for (const id of (ids || [])) for (const q of sqlQueriesForServiceMethod(id)) if (!out.includes(q)) out.push(q);
  return out;
};

/** '5개 기본 라우트 자동 생성' 이 만드는 것 — type 과 handlerName 이 다르다 */
const FIVE = [
  { type: 'list', handlerName: 'list', expect: 'snack.findAll' },
  { type: 'getById', handlerName: 'get', expect: 'snack.findById' },
  { type: 'create', handlerName: 'create', expect: 'snack.insert' },
  { type: 'updateName', handlerName: 'update', expect: 'snack.updateName' },
  { type: 'remove', handlerName: 'remove', expect: 'snack.deleteById' },
];

test('★ 사용자가 겪은 그대로 — 5개 기본 라우트가 모두 SQL 로 이어진다', () => {
  for (const r of FIVE) {
    const m = resolveServiceMethodName('SnackService', r.type, r.handlerName);
    const sql = sqlQueriesForServiceMethod(`SnackService.${m}`);
    assert.deepEqual(sql, [r.expect], `${r.type} 라우트가 SQL 에 닿지 않는다`);
  }
});

test('handlerName 과 서비스 메서드명의 체계 차이를 흡수한다', () => {
  // 컨트롤러는 'get'/'update', 서비스는 'getById'/'updateName' — 표기가 다르다
  assert.equal(resolveServiceMethodName('SnackService', 'getById', 'get'), 'getById');
  assert.equal(resolveServiceMethodName('SnackService', 'updateName', 'update'), 'updateName');
  // type 이 없으면 handlerName 으로 되짚는다
  assert.equal(resolveServiceMethodName('SnackService', undefined, 'list'), 'list');
});

test('서비스에 없는 메서드는 지어내지 않는다', () => {
  // custom 라우트 — 사용자가 직접 붙여야 한다. 억지로 매핑하면 잘못된 코드가 생성된다.
  assert.equal(resolveServiceMethodName('SnackService', 'custom', 'myHandler'), 'myHandler');
  assert.deepEqual(sqlQueriesForServiceMethod('SnackService.myHandler'), []);
});

test('multiSql 메서드는 단계별 SQL 을 모두 돌려준다', () => {
  assert.deepEqual(sqlQueriesForServiceMethod('ReportService.monthly'),
    ['report.header', 'report.rows']);
});

test('sql_file 이 없는 서비스는 SQL 을 특정하지 않는다', () => {
  // 쿼리 이름은 알아도 어느 파일인지 모르면 `undefined.whatever` 같은 쓰레기가 생긴다
  assert.deepEqual(sqlQueriesForServiceMethod('PlainService.doThing'), []);
});

test('잘못된 입력에 던지지 않는다', () => {
  for (const bad of [null, undefined, '', 'NoDot', 'Unknown.method', 'SnackService.']) {
    assert.doesNotThrow(() => sqlQueriesForServiceMethod(bad));
    assert.deepEqual(sqlQueriesForServiceMethod(bad), []);
  }
});

test('한 라우트에 여러 서비스 메서드를 걸면 SQL 이 합쳐지고 중복은 제거된다', () => {
  const got = sqlQueriesForRoute(['SnackService.list', 'ReportService.list', 'SnackService.list']);
  assert.deepEqual(got, ['snack.findAll', 'report.findAll']);
});

test('서비스 메서드를 떼면 그 SQL 만 빠지고 공유되는 것은 남는다', () => {
  // ReportService.monthly 와 ReportService.list 가 함께 걸린 상태에서 monthly 를 뗀다
  const before = sqlQueriesForRoute(['ReportService.list', 'ReportService.monthly']);
  assert.deepEqual(before, ['report.findAll', 'report.header', 'report.rows']);

  const remaining = ['ReportService.list'];
  const stillUsed = new Set(sqlQueriesForRoute(remaining));
  const orphaned = sqlQueriesForServiceMethod('ReportService.monthly').filter((q) => !stillUsed.has(q));
  const after = before.filter((q) => !orphaned.includes(q));
  assert.deepEqual(after, ['report.findAll'], '남은 메서드가 쓰는 SQL 까지 지우면 안 된다');
});

test('서버 응답에 method_sql_map 이 없으면(구버전) 조용히 빈 값', () => {
  // 서버만 예전 버전인 혼합 배포에서도 화면이 깨지면 안 된다
  SERVICES.push({ name: 'OldService', sql_file: 'old', methods: ['list'], multiSqlSteps: {} });
  assert.doesNotThrow(() => sqlQueriesForServiceMethod('OldService.list'));
  assert.deepEqual(sqlQueriesForServiceMethod('OldService.list'), []);
  SERVICES.pop();
});
