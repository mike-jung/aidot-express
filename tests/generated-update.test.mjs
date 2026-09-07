/**
 * 생성된 updateName 이 파라미터를 버리지 않는지. (v1.10.29)
 *
 * ## 문제
 * PUT /api/snack/1 에 id·name·price·memo·created_at 을 전부 보냈는데
 * 서버는 **id·name 만** 받아 SQL 이 깨졌습니다.
 *
 *     Placeholder 'price' is not defined
 *
 * ## 원인
 * SQL 생성기는 v1.10.x 에서 **테이블의 모든 컬럼**을 쓰는 UPDATE 를 만들도록
 * 바뀌었는데, 코드 생성기는 옛날 그대로 `(id, name)` 만 넘기고 있었습니다.
 *
 *     SQL       UPDATE snack SET name=:name, price=:price, memo=:memo WHERE id=:id
 *     서비스     db.execute(sql, { id, name })        ← price/memo 가 없다
 *
 * 두 생성기가 **서로 다른 판에서 바뀌어** 어긋난 것입니다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GEN = fs.readFileSync(path.join(ROOT, 'lib/admin/service/codeGenerator.js'), 'utf8');

/** 생성된 코드가 쓰는 바인딩 로직 (같은 규칙) */
function bindFor(sql, params) {
  const needed = [...new Set((sql.match(/:(\w+)/g) || []).map((v) => v.slice(1)))];
  const bind = {};
  for (const k of needed) bind[k] = params?.[k] ?? null;
  return bind;
}

const SQL = 'UPDATE snack SET name = :name, price = :price, memo = :memo WHERE id = :id';

test('★ 보낸 값이 전부 SQL 에 전달된다', () => {
  const b = bindFor(SQL, { id: 1, name: 'n', price: 700, memo: 'm' });
  assert.deepEqual(b, { name: 'n', price: 700, memo: 'm', id: 1 });
});

test('★ SQL 이 쓰는 자리표시자가 하나도 빠지지 않는다', () => {
  // 빠지면 `Placeholder 'price' is not defined` 로 실패한다
  const b = bindFor(SQL, { id: 1, name: 'n' });          // 예전처럼 일부만 보내도
  for (const k of ['name', 'price', 'memo', 'id']) {
    assert.ok(k in b, `${k} 가 바인딩에서 빠졌다`);
  }
});

test('SQL 이 안 쓰는 여분 파라미터는 넘기지 않는다', () => {
  const b = bindFor(SQL, { id: 1, name: 'n', price: 1, memo: 'm', created_at: 'x', 삭제: true });
  assert.equal('created_at' in b, false);
  assert.equal('삭제' in b, false);
});

test('★ 컨트롤러가 params 를 통째로 넘긴다', () => {
  // `updateName(params.id, params.name)` 이면 나머지가 그 자리에서 버려진다
  assert.match(GEN, /\.update\(params\)/, '컨트롤러가 params 전체를 넘겨야 한다');
  assert.equal(/update(?:Name)?\(params\.id,\s*params\.name\)/.test(GEN), false,
    'id·name 만 넘기는 옛 코드가 남아 있다');
});

test('★ 두 생성기 모두 고쳐졌다', () => {
  // codeGenerator 에는 생성 경로가 둘 있다 — 하나만 고치면 화면에 따라 갈린다
  assert.equal(/signature: 'async update(?:Name)?\(id, name\)'/.test(GEN), false,
    'standalone 생성기가 아직 (id, name) 이다');
  assert.equal(/db\.execute\(sql, \{ id, name \}\)/.test(GEN), false,
    '서비스 본문이 아직 { id, name } 만 넘긴다');
  /* 두 곳 모두 자리표시자를 채워서 넘긴다.
     ★ v1.28.0 — 정규식을 생성 코드에 박아 넣던 것을 `fillPlaceholders(sql, params)` 헬퍼로 뺐다.
     (생성되는 코드가 짧아지고, 채우는 규칙이 한 곳에 모인다. 동작은 같다) */
  assert.ok((GEN.match(/fillPlaceholders\(sql, params\)/g) || []).length >= 2,
    '생성 경로 두 곳 모두에 적용되어야 한다');
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.32 — 보정이 **모든 실행 경로**에 걸려 있는가
   v1.10.31 에서 execute() 에만 넣었더니, executeList() 는 execute 를 거치지
   않고 드라이버를 직접 불러 **페이지네이션 경로에만** 같은 버그가 남았다.

       SELECT ... WHERE name LIKE :kw  +  executeList(sql, {}, {page,perPage})
       → Placeholder 'kw' is not defined

   한 곳만 고치고 "고쳤다" 고 하면 이런 구멍이 남는다.
   ══════════════════════════════════════════════════════════════════════════ */

test('★ execute 와 executeList 둘 다 자리표시자를 보정한다', () => {
  const db = fs.readFileSync(path.join(ROOT, 'src/database/db.js'), 'utf8');
  const calls = (db.match(/fillMissingPlaceholders\(/g) || []).length;
  // 정의 1 + execute 1 + executeList 1 = 3
  assert.ok(calls >= 3, `보정 호출이 ${calls}곳뿐이다 — 실행 경로를 빠뜨렸다`);

  const listAt = db.indexOf('export async function executeList');
  const seg = db.slice(listAt, listAt + 2500);
  assert.match(seg, /fillMissingPlaceholders\(/, 'executeList 에 보정이 없다');
});

test('보정이 페이지 파라미터보다 먼저 걸린다', () => {
  const db = fs.readFileSync(path.join(ROOT, 'src/database/db.js'), 'utf8');
  const listAt = db.indexOf('export async function executeList');
  const seg = db.slice(listAt, listAt + 2500);
  const fill = seg.indexOf('fillMissingPlaceholders(');
  const paged = seg.indexOf('const pagedParams =');
  assert.ok(fill > 0 && fill < paged, '__limit/__offset 을 붙이기 전에 보정해야 한다');
});

test('★ 문자열 안의 콜론은 자리표시자가 아니다', () => {
  const db = fs.readFileSync(path.join(ROOT, 'src/database/db.js'), 'utf8');
  // '12:30' 같은 시각이 자리표시자로 오인되면 엉뚱한 값이 null 로 들어간다
  assert.match(db, /replace\(\/'\(\?:\[\^'\]\|''\)\*'\/g/, '홑따옴표 문자열을 지워야 한다');
  assert.match(db, /\(\?<!\[:\\w\]\):/, '::cast 나 :: 연산자를 걸러야 한다');
});
