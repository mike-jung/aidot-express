/**
 * 신규 Service 대화상자의 **메서드 자동 채움** 회귀 시험. (v1.8.2)
 *
 * ## 무엇이 문제였나
 * 신규 대화상자가 `['list','getById','create']` 3개를 하드코딩으로 심고,
 * SQL 파일을 선택해도 watch 가 `preview()` 만 다시 부를 뿐 **메서드 목록은 손대지 않았다.**
 * 그래서 쿼리 5개짜리 `snack.sql` 을 골라도 `updateName`·`deleteById` 는
 * **아예 만들어지지 않았다** — 표시가 빠진 게 아니었다
 * (메서드 목록은 5개/쪽 페이지네이션이라 5개였다면 한 화면에 다 보였을 것이다).
 *
 * ## 왜 로직을 여기에 옮겨 적었나
 * `ServiceEditor.vue` 는 SFC 라 Node 테스트에서 그대로 import 할 수 없다.
 * 그래서 **판정 로직만** 같은 규칙으로 옮겨 시험한다. 규칙이 갈라지지 않도록
 * `defaultSqlQueryFor` 의 역방향(`methodTypeForQuery`)과 자동 채움 규칙을
 * SFC 와 같은 순서·같은 조건으로 유지한다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

/** codeGenerator.SERVICE_METHOD_TEMPLATES 와 동기화된 표준 메서드 카탈로그 */
const CATALOG = [
  { method: 'list', defaultSqlQueryName: 'findAll' },
  { method: 'listPaged', defaultSqlQueryName: 'findAll' },
  { method: 'getById', defaultSqlQueryName: 'findById' },
  { method: 'create', defaultSqlQueryName: 'insert' },
  { method: 'updateName', defaultSqlQueryName: 'updateName' },
  { method: 'remove', defaultSqlQueryName: 'deleteById' },
];
const defaultSqlQueryFor = (t) => CATALOG.find((c) => c.method === t)?.defaultSqlQueryName || t;
/** list 와 listPaged 는 둘 다 findAll 을 쓴다 — 먼저 선언된 list 를 택한다 */
const methodTypeForQuery = (q) => CATALOG.map((c) => c.method).find((mt) => defaultSqlQueryFor(mt) === q) || null;

/** ServiceEditor 의 메서드 목록 상태를 재현 */
function editor(queries, seed = ['list', 'getById', 'create']) {
  let methods = seed.map((mt) => ({ type: 'standard', methodType: mt, sqlQueryName: '' }));
  const removed = new Set();
  const coveredSet = () => new Set(
    methods.filter((m) => m.type === 'standard')
      .map((m) => m.sqlQueryName || defaultSqlQueryFor(m.methodType)),
  );
  return {
    get types() { return methods.map((m) => m.methodType); },
    fill() {
      const covered = coveredSet();
      const added = [];
      for (const q of queries) {
        if (covered.has(q)) continue;
        const mt = methodTypeForQuery(q);
        if (!mt || removed.has(mt)) continue;
        if (methods.some((m) => m.type === 'standard' && m.methodType === mt)) continue;
        methods.push({ type: 'standard', methodType: mt, sqlQueryName: '' });
        covered.add(q);
        added.push(mt);
      }
      return added;
    },
    unmapped() { const c = coveredSet(); return queries.filter((q) => !c.has(q)); },
    remove(mt) { removed.add(mt); methods = methods.filter((m) => m.methodType !== mt); },
    addBack(mt) { removed.delete(mt); methods.push({ type: 'standard', methodType: mt, sqlQueryName: '' }); },
  };
}

const SNACK = ['findAll', 'findById', 'insert', 'updateName', 'deleteById'];

test('★ 사용자가 겪은 그대로 — 쿼리 5개 SQL 을 고르면 메서드가 5개가 된다', () => {
  const e = editor(SNACK);
  assert.deepEqual(e.types, ['list', 'getById', 'create'], '열자마자는 대표 3개');
  const added = e.fill();
  assert.deepEqual(added, ['updateName', 'remove']);
  assert.equal(e.types.length, 5, '이전에는 3개에서 멈춰 updateName/deleteById 가 사라졌다');
  assert.deepEqual(e.unmapped(), [], '모든 쿼리가 담당자를 갖는다');
});

test('사용자가 지운 메서드는 SQL 을 다시 골라도 되살아나지 않는다', () => {
  const e = editor(SNACK);
  e.fill();
  e.remove('remove');
  e.fill();                       // SQL 파일을 다시 선택한 상황
  assert.equal(e.types.includes('remove'), false, '지운 것이 되살아나면 화면을 못 쓴다');
});

test('지웠다가 직접 다시 추가하면 이후에도 유지된다', () => {
  const e = editor(SNACK);
  e.fill(); e.remove('remove'); e.addBack('remove'); e.fill();
  assert.equal(e.types.filter((t) => t === 'remove').length, 1, '중복 없이 하나만');
});

test('같은 SQL 파일을 두 번 골라도 중복 생성되지 않는다', () => {
  const e = editor(SNACK);
  e.fill();
  const n = e.types.length;
  e.fill();
  assert.equal(e.types.length, n);
});

test('표준 메서드로 표현할 수 없는 쿼리는 만들지 않고 미매핑으로 보고한다', () => {
  const e = editor(['findAll', 'findById', 'insert', 'searchByTag', 'bulkImport']);
  assert.deepEqual(e.fill(), [], '억지로 메서드를 만들면 안 된다');
  assert.deepEqual(e.unmapped(), ['searchByTag', 'bulkImport'], '화면에서 multiSql 로 유도한다');
});

test('findAll 하나뿐이면 list 와 listPaged 가 함께 생기지 않는다', () => {
  const e = editor(['findAll']);
  e.fill();
  const owners = e.types.filter((t) => defaultSqlQueryFor(t) === 'findAll');
  assert.equal(owners.length, 1, '같은 쿼리를 두 메서드가 담당하면 코드가 중복된다');
  assert.equal(owners[0], 'list');
});

test('빈 SQL 파일을 골라도 아무 일도 일어나지 않는다', () => {
  const e = editor([]);
  assert.deepEqual(e.fill(), []);
  assert.deepEqual(e.types, ['list', 'getById', 'create']);
});

test('역매핑이 카탈로그 전 항목을 왕복한다', () => {
  for (const c of CATALOG) {
    const back = methodTypeForQuery(c.defaultSqlQueryName);
    assert.equal(defaultSqlQueryFor(back), c.defaultSqlQueryName,
      `${c.method} 의 기본 쿼리 ${c.defaultSqlQueryName} 가 왕복하지 않는다`);
  }
});
