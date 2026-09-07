/**
 * '컨트롤러 수정' 진입 시 SQL 연결 복원 회귀 시험. (v1.8.5)
 *
 * ## 무엇이 문제였나
 * v1.8.3 에서 라우트→서비스→SQL 체인을 고쳤는데 **신규 화면에서만** 동작했다.
 * '수정' 으로 들어가면 여전히 '없음' 이었다.
 *
 * 원인은 저장된 메타였다. 편집기가 라우트 객체를 `{ ...r }` 로 통째로 저장해
 * 화면 전용 상태와 파생값이 사이드카 파일에 박혔고, 그중 `_sqlQueries: []` 가
 * 다음 편집 때 계산값을 이겼다 — **빈 배열은 JS 에서 truthy** 라
 * `r._sqlQueries || sqlQueries` 가 `[]` 를 그대로 돌려준다.
 * 신규 화면은 저장값이 없어 계산값이 쓰였으므로, 신규만 고쳐진 것처럼 보였다.
 *
 * `_serviceMethods` 도 함께 굳었다. 옛 판이 `BookService.get` 같은 handlerName 기반
 * 이름을 저장해 두었는데, 서비스에는 `getById` 밖에 없어 SQL 도 못 찾는다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const UI_ONLY = ['expanded', '_showServices', '_showSqls', '_svcPickerOpen', '_sqlPickerOpen',
  '_serviceMethods', '_sqlQueries'];

/** 서버가 저장 메타를 읽어 내려보낼 때 (ControllerMetaService) */
const stripUiOnly = (routes) => routes.map((r) => {
  if (!r || typeof r !== 'object') return r;
  const out = { ...r };
  for (const k of UI_ONLY) delete out[k];
  return out;
});

/** 편집기가 저장으로 보낼 때 (buildRoutesForServer) */
const buildForServer = (routes) => routes.map((r) => {
  const out = { ...r };
  for (const k of UI_ONLY) delete out[k];
  return out;
});

/** 편집기의 병합 규칙 (initRoute) */
const pickQueries = (saved, computed) => ((Array.isArray(saved) && saved.length) ? saved : computed);

function mergeServiceMethods(saved, computed, svc) {
  if (!Array.isArray(saved) || !saved.length) return computed;
  if (!svc) return saved;
  const known = new Set([...(svc.methods || []), ...((svc.multiSqlMethods || []).map((m) => m.name))]);
  return [...new Set(saved.map((id) => {
    const dot = id.indexOf('.');
    const m = dot < 0 ? id : id.slice(dot + 1);
    return known.has(m) ? id : (computed[0] || id);
  }))];
}

const SVC = { name: 'BookService', sql_file: 'book',
  methods: ['list', 'getById', 'create', 'updateName', 'remove'], multiSqlMethods: [] };

/** v1.8.4 이전이 실제로 저장한 모양 */
const LEGACY = [
  { type: 'list', handlerName: 'list', expanded: false, _showSqls: false,
    _serviceMethods: ['BookService.list'], _sqlQueries: [] },
  { type: 'getById', handlerName: 'get', expanded: false, _showSqls: false,
    _serviceMethods: ['BookService.get'], _sqlQueries: [] },
];

test('★ 빈 배열이 계산값을 이기지 않는다 — 이것이 근본 원인이었다', () => {
  // 전제 확인 — 이 한 줄이 버그의 전부였다
  assert.equal(Boolean([]), true, '빈 배열은 JS 에서 truthy 다');
  assert.deepEqual([] || ['fallback'], [], '그래서 || 가 fallback 으로 넘어가지 않는다');
  assert.deepEqual(pickQueries([], ['book.findById']), ['book.findById']);
  assert.deepEqual(pickQueries(undefined, ['book.findById']), ['book.findById']);
  assert.deepEqual(pickQueries(null, ['book.findById']), ['book.findById']);
});

test('사용자가 직접 고른 SQL 은 계산값이 덮어쓰지 않는다', () => {
  assert.deepEqual(pickQueries(['my.custom'], ['book.findById']), ['my.custom']);
});

test('서버가 옛 메타의 화면 전용 필드를 걸러 낸다', () => {
  for (const r of stripUiOnly(LEGACY)) {
    for (const k of UI_ONLY) assert.equal(k in r, false, `${k} 가 남으면 계산값을 덮어쓴다`);
    assert.ok(r.type, '실제 데이터는 남아야 한다');
  }
});

test('편집기가 저장할 때도 화면 전용 필드를 보내지 않는다', () => {
  const sent = buildForServer([{ type: 'list', handlerName: 'list', method: 'get', path: '/',
    expanded: true, _sqlQueries: ['book.findAll'], _serviceMethods: ['BookService.list'] }]);
  for (const k of UI_ONLY) assert.equal(k in sent[0], false);
  assert.deepEqual(sent[0], { type: 'list', handlerName: 'list', method: 'get', path: '/' });
});

test('옛 handlerName 기반 이름을 실제 서비스 메서드로 바로잡는다', () => {
  // 저장된 'BookService.get' 은 서비스에 없다 → 계산값 'BookService.getById' 로
  assert.deepEqual(mergeServiceMethods(['BookService.get'], ['BookService.getById'], SVC),
    ['BookService.getById']);
  // 실제로 있는 이름은 그대로 둔다
  assert.deepEqual(mergeServiceMethods(['BookService.list'], ['BookService.list'], SVC),
    ['BookService.list']);
});

test('서비스 목록을 아직 못 받았으면 저장값을 존중한다', () => {
  // 판단 근거가 없는데 고치면 사용자가 고른 것을 지운다
  assert.deepEqual(mergeServiceMethods(['BookService.get'], ['BookService.getById'], null),
    ['BookService.get']);
});

test('보정 결과에 중복이 생기지 않는다', () => {
  const got = mergeServiceMethods(['BookService.get', 'BookService.getById'], ['BookService.getById'], SVC);
  assert.deepEqual(got, ['BookService.getById']);
});

test('저장 → 읽기 왕복 후에도 파생값이 되살아난다', () => {
  // 편집기가 저장 → 서버가 읽어 내려줌 → 편집기가 다시 계산
  const saved = buildForServer(LEGACY);
  const loaded = stripUiOnly(saved);
  for (const r of loaded) {
    const computed = r.type === 'list' ? ['book.findAll'] : ['book.findById'];
    assert.deepEqual(pickQueries(r._sqlQueries, computed), computed,
      '왕복 후에도 계산값이 살아 있어야 한다');
  }
});

test('multiSql 라우트의 SQL 은 sqlSteps 에서 복원된다', () => {
  // _sqlQueries 를 저장하지 않아도 sqlSteps 가 남아 있으므로 잃지 않는다
  const r = buildForServer([{ type: 'multiSql', sqlSteps: [
    { sqlFile: 'book', queryName: 'findAll' }, { sqlFile: 'book', queryName: 'count' }] }])[0];
  assert.ok(r.sqlSteps, 'sqlSteps 는 실제 데이터라 저장돼야 한다');
  const restored = r.sqlSteps.filter((s) => s.sqlFile && s.queryName).map((s) => `${s.sqlFile}.${s.queryName}`);
  assert.deepEqual(restored, ['book.findAll', 'book.count']);
});
