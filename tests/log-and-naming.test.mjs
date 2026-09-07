/**
 * 로그 정리 + updateName → update 개명. (v1.10.34)
 *
 * ## 로그
 * SQL 한 번에 다섯 줄이 남았다 — execute · SQL 전문 · result type ·
 * rows cleaned · 첫 행 keys. 그중 `SQL 전문` 은 바로 윗줄과 같은 SQL 을
 * 한 번 더 찍었고, 나머지 셋은 드라이버가 뭘 돌려줬는지에 대한
 * **프레임워크 내부 사정**이다.
 *
 * 개발자가 실제로 묻는 것은 셋뿐이다 — **무슨 쿼리가 · 몇 건 · 얼마나 걸렸나.**
 * 그래서 결과가 나온 뒤 한 줄로 합쳤다.
 *
 * ## 개명
 * `updateName` 은 "이름만 바꾸는" 임시 함수로 지어진 이름인데 실제로는
 * 모든 컬럼을 고친다. `create`·`remove` 와 견주면 일관성도 없다.
 * ⚠ 다만 **이미 만들어진 SQL 파일**에 `-- @name: updateName` 이 들어 있으므로,
 *   찾을 때 별칭을 함께 본다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ── 로그 ──────────────────────────────────────────────────────────── */

test('★ SQL 은 한 줄만 남긴다', () => {
  const db = read('src/database/db.js');
  const body = db.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const gone of ['SQL 전문', 'result type=', 'rows cleaned', '첫 행 keys']) {
    assert.equal(body.includes(gone), false, `'${gone}' 이 아직 로그로 남는다`);
  }
});

test('★ 그 한 줄에 건수와 시간이 들어간다', () => {
  const db = read('src/database/db.js');
  // 개발자가 묻는 것: 무슨 쿼리가 · 몇 건 · 얼마나
  assert.match(db, /\$\{rows\}건/, '건수가 없다');
  assert.match(db, /ms\.toFixed\(1\)\}ms/, '실행시간이 없다');
});

test('★ 모든 어댑터가 행수를 넘긴다', () => {
  const db = read('src/database/db.js');
  // 안 넘기면 로그에 `—` 만 찍혀 쓸모가 없다
  const bare = (db.match(/__recordMetric\(true\)\s*;/g) || []).length;
  assert.equal(bare, 0, `행수를 안 넘기는 호출이 ${bare}곳 있다`);
});

test('실패한 쿼리는 warn 으로 남는다', () => {
  const db = read('src/database/db.js');
  // 실행 전에 안 찍으므로, 실패했을 때 반드시 여기서 남아야 한다
  assert.match(db, /logger\[ok \? 'debug' : 'warn'\]/);
});

test('★ 응답 로그도 한 줄이다', () => {
  const loader = read('src/core/controllerLoader.js');
  const n = (loader.match(/\[Response\]/g) || []).length;
  assert.equal(n, 1, `[Response] 로그가 ${n}줄이다`);
  // 내부 판단 재료(hasRows/hasData/hasHeader)는 빼야 한다
  assert.equal(/hasRows=\$\{/.test(loader), false);
});

/* ── 개명 ──────────────────────────────────────────────────────────── */

test('★ 생성기는 update 를 만든다', () => {
  const gen = read('lib/admin/service/codeGenerator.js');
  assert.equal(gen.includes('updateName'), false, 'updateName 이 아직 남아 있다');
  assert.match(gen, /-- @name: update\b/, '새 SQL 은 update 로 만들어야 한다');
});

test('★ 기존 SQL 파일이 깨지지 않는다 — 별칭', () => {
  const loader = read('src/core/sqlLoader.js');
  assert.match(loader, /_alias\(name\)/, '별칭 처리가 없다');
  // 양방향이어야 한다: 옛 파일도 새 파일도 어느 이름으로든 찾아진다
  assert.match(loader, /name === 'update'\) return 'updateName'/);
  assert.match(loader, /name === 'updateName'\) return 'update'/);
});

test('별칭이 양방향으로 동작한다', () => {
  const alias = (name) => (name === 'update' ? 'updateName'
    : name === 'updateName' ? 'update' : null);
  const get = (statements, name) => {
    if (name in statements) return statements[name];
    const alt = alias(name);
    if (alt && alt in statements) return statements[alt];
    return null;
  };
  const oldFile = { updateName: 'UPDATE ...' };   // 기존 파일
  const newFile = { update: 'UPDATE ...' };       // 새로 만든 파일
  assert.ok(get(oldFile, 'update'), '기존 파일을 새 이름으로 못 찾는다');
  assert.ok(get(oldFile, 'updateName'));
  assert.ok(get(newFile, 'updateName'), '새 파일을 옛 이름으로 못 찾는다');
  assert.ok(get(newFile, 'update'));
  assert.equal(get(newFile, '없는것'), null);
});

test('콘솔이 옛 이름으로 저장된 컨트롤러도 연다', () => {
  const ed = read('admin-client/src/views/ControllerEditor.vue');
  // 카탈로그에 둘 다 있어야 기존 메타(type:'updateName')가 계속 열린다
  assert.match(ed, /^\s*update:\s*\{ method: 'put'/m);
  assert.match(ed, /^\s*updateName: \{ method: 'put'/m);
  // 새로 만드는 5개는 update 를 쓴다
  assert.match(ed, /DEFAULT_TYPES = \['list', 'getById', 'create', 'update', 'remove'\]/);
});
