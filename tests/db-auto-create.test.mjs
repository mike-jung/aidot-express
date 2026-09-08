/**
 * MariaDB 스키마 자동 생성 시험. (v1.9.3)
 *
 * ## 무엇이 문제였나
 * MariaDB 를 갓 설치한 PC 에는 우리 스키마가 없다. 그런데 풀을 만들 때 `database:` 를
 * 지정하므로 **연결 자체가 실패**하고 "DB 연결 실패" 만 뜬다. 사용자는 .env 를 몇 번씩
 * 확인하게 된다. sqlite 는 파일을 알아서 만드는데 MariaDB 만 그러지 않는 것도 앞뒤가 안 맞는다.
 *
 * → database 를 **빼고** 한 번 붙어서 `CREATE DATABASE IF NOT EXISTS` 를 실행한다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* db.js 에서 함수만 떼어 온다 — 초기화 전체를 돌리면 실제 접속을 시도한다 */
const src = fs.readFileSync(path.join(ROOT, 'src/database/db.js'), 'utf8');
const start = src.indexOf('const SAFE_DB_NAME');
const end = src.indexOf('\nexport async function', start);
assert.ok(start > 0 && end > start, 'ensureDatabaseExists 를 찾지 못했다');
const tmp = path.join(ROOT, 'tests', `_ensure_${process.pid}.mjs`);
fs.writeFileSync(tmp, src.slice(start, end) + '\nexport { ensureDatabaseExists, SAFE_DB_NAME };\n');
test.after(() => { try { fs.rmSync(tmp); } catch { /* 무시 */ } });

/* 가짜 mariadb 드라이버 — 실제 서버 없이 동작을 관찰한다.
   ★ v1.11.0 — 예전에는 node_modules/mariadb 를 **덮어쓰고 되돌리지 않았다.** 진짜 드라이버가 설치된
   개발 PC 에서 npm test 를 한 번 돌리면 그 뒤로 서버가 "createPool is undefined" 로 기동하지 않았다.
   이제 진짜 파일을 백업했다가 시험이 끝나면 되돌린다. */
const dir = path.join(ROOT, 'node_modules', 'mariadb');
const REAL = ['package.json', 'index.js'].map((f) => path.join(dir, f));
const backup = new Map();
for (const f of REAL) { if (fs.existsSync(f)) backup.set(f, fs.readFileSync(f)); }
const hadRealDriver = backup.size > 0 && /"version"/.test(backup.get(REAL[0])?.toString() || '');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"mariadb","main":"index.js"}');
fs.writeFileSync(path.join(dir, 'index.js'),
  'exports.createConnection = function (...a) { return globalThis.__FAKE_MARIADB__.createConnection(...a); };\n'
  + 'exports.createPool = function (...a) { return globalThis.__FAKE_MARIADB__.createPool(...a); };\n');
const restoreDriver = () => {
  try {
    if (hadRealDriver) { for (const [f, buf] of backup) fs.writeFileSync(f, buf); }
    else fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* 무시 */ }
};
test.after(restoreDriver);
process.once('exit', restoreDriver);

const { ensureDatabaseExists } = await import(tmp);

let calls, notes;
function setupFake({ exists = false, connectFails = null, queryFails = null } = {}) {
  calls = []; notes = [];
  globalThis.__FAKE_MARIADB__ = {
    createConnection: async (opts) => {
      calls.push({ call: 'connect', opts });
      if (connectFails) throw new Error(connectFails);
      return {
        query: async (sql, params) => {
          calls.push({ call: 'query', sql: String(sql), params });
          if (queryFails && /CREATE DATABASE/i.test(sql)) throw new Error(queryFails);
          if (/information_schema/i.test(sql)) return exists ? [{ SCHEMA_NAME: params[0] }] : [];
          return [];
        },
        end: async () => { calls.push({ call: 'end' }); },
      };
    },
  };
}
const logger = {
  info: (m) => notes.push(['info', m]), warn: (m) => notes.push(['warn', m]),
  debug: (m) => notes.push(['debug', m]), error: (m) => notes.push(['error', m]),
};
const cfg = (over = {}) => ({ db: { host: '127.0.0.1', port: 3306, user: 'aidot',
  password: 'p', database: 'aidot_express', ...over } });
const said = (re) => notes.some(([, m]) => re.test(String(m)));

test('★ 스키마가 없으면 만든다 — 빈 MariaDB 의 첫 기동', async () => {
  setupFake({ exists: false });
  await ensureDatabaseExists(cfg(), logger);
  const create = calls.find((c) => c.call === 'query' && /CREATE DATABASE/i.test(c.sql));
  assert.ok(create, 'CREATE DATABASE 를 실행하지 않았다');
  assert.match(create.sql, /IF NOT EXISTS/i, '경합에서 터지지 않도록');
  assert.match(create.sql, /`aidot_express`/, '식별자는 백틱으로 감싼다');
  assert.ok(said(/created schema/), '만들었으면 알려 줘야 한다');
});

test('★ 연결에 database 를 지정하지 않는다 — 이게 이 기능의 핵심', () => {
  // database 를 넣으면 없는 스키마에 붙으려다 똑같이 실패한다
  const connect = calls.find((c) => c.call === 'connect');
  assert.equal('database' in connect.opts, false);
});

test('한글을 위해 utf8mb4 로 만든다', () => {
  const create = calls.find((c) => c.call === 'query' && /CREATE DATABASE/i.test(c.sql));
  assert.match(create.sql, /utf8mb4/);
  assert.match(create.sql, /utf8mb4_unicode_ci/);
});

test('이미 있으면 만들지 않는다', async () => {
  setupFake({ exists: true });
  await ensureDatabaseExists(cfg(), logger);
  assert.equal(calls.some((c) => c.call === 'query' && /CREATE DATABASE/i.test(c.sql)), false);
});

test('★ 권한이 없으면 실행할 SQL 을 그대로 알려 준다', async () => {
  setupFake({ queryFails: "Access denied for user 'aidot'@'%' (1044)" });
  await ensureDatabaseExists(cfg(), logger);
  assert.ok(said(/CREATE DATABASE `aidot_express`/), '직접 실행할 SQL 을 줘야 한다');
  assert.ok(said(/GRANT ALL PRIVILEGES/), '권한 부여 SQL 도');
  assert.ok(said(/DB_AUTO_CREATE_DATABASE=false/), '끄는 방법도');
});

test('★ 실패해도 던지지 않는다 — 여기서 막으면 더 알기 어려운 오류가 된다', async () => {
  setupFake({ connectFails: 'ECONNREFUSED 127.0.0.1:3306' });
  await assert.doesNotReject(() => ensureDatabaseExists(cfg(), logger));
  assert.ok(said(/not creating the schema/));
});

test('★ 이상한 스키마 이름은 시도조차 하지 않는다 — 식별자는 바인딩할 수 없다', async () => {
  for (const bad of ['aidot;DROP DATABASE x', 'a`b', '1abc', 'a b', "x'--"]) {
    setupFake({});
    await ensureDatabaseExists(cfg({ database: bad }), logger);
    assert.equal(calls.length, 0, `'${bad}' 로 접속을 시도했다`);
    assert.ok(said(/cannot be created automatically/));
  }
});

test('정상적인 이름은 통과한다', async () => {
  for (const ok of ['aidot_express', 'AidotExpress', '_x', 'a1_b$c']) {
    setupFake({ exists: true });
    await ensureDatabaseExists(cfg({ database: ok }), logger);
    assert.ok(calls.length > 0, `'${ok}' 가 거부됐다`);
  }
});

test('DB 이름이 비어 있으면 조용히 넘어간다', async () => {
  setupFake({});
  await ensureDatabaseExists(cfg({ database: '' }), logger);
  assert.equal(calls.length, 0);
});

test('연결은 반드시 닫는다', async () => {
  setupFake({ exists: false });
  await ensureDatabaseExists(cfg(), logger);
  assert.ok(calls.some((c) => c.call === 'end'), '일회용 연결이 남으면 커넥션이 샌다');
});

test('설정 기본값은 켬, DB_AUTO_CREATE_DATABASE 로 끌 수 있다', async () => {
  const idx = fs.readFileSync(path.join(ROOT, 'src/config/index.js'), 'utf8');
  const def = fs.readFileSync(path.join(ROOT, 'src/config/default.js'), 'utf8');
  assert.match(def, /autoCreateDatabase:\s*true/, '기본은 켜 둔다 — 처음 쓰는 사람이 대상이다');
  assert.match(idx, /DB_AUTO_CREATE_DATABASE/, 'env 매핑이 없으면 조정 자체가 불가능하다');
});
