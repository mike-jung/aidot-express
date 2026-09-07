// 단위 테스트: MariaDB → SQLite 방언 변환 + UDF 동작 (실제 SQL 파일의 모든 문장을 SQLite 에서 prepare 해 본다)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { rewriteForSqlite, registerSqliteFunctions, normalizeSqliteParams } from '../src/database/sqlite-dialect.js';
import { renderSampleTokens } from '../src/database/tablePrefix.js';

/**
 * ★ v1.10.18 — 이 시험은 **SQLite 방언**을 검증한다.
 *
 *  `renderSampleTokens()` 는 현재 설정된 DB 종류를 따라가므로, 개발자의 `.env` 가
 *  `DB_TYPE=mariadb` 면 `sample.book` 을 만들어 낸다 — SQLite 에는 스키마가 없어
 *  `unknown database sample` 로 실패한다. (실제로 이 시험이 그렇게 깨졌다)
 *
 *  시험은 환경에 좌우되면 안 되므로, 여기서는 **SQLite 한정자를 강제**한다.
 */
const toSqlite = (text) => renderSampleTokens(text).replace(/\bsample\./g, 'sample_');

test('DATE_ADD / DATE_SUB INTERVAL → datetime()', () => {
  assert.equal(rewriteForSqlite("DATE_ADD(NOW(), INTERVAL :m MINUTE)"),
    "datetime(NOW(), ('+' || CAST(:m AS TEXT) || ' minutes'))");
  assert.equal(rewriteForSqlite("x < DATE_SUB(NOW(), INTERVAL 30 DAY)"), "x < datetime(NOW(), '-30 days')");
  assert.equal(rewriteForSqlite("DATE_ADD(started_at, INTERVAL 2 WEEK)"), "datetime(started_at, '+14 days')");
});

test('ON DUPLICATE KEY UPDATE → ON CONFLICT DO UPDATE SET', () => {
  const out = rewriteForSqlite("INSERT INTO g (id, h) VALUES (1, :h) ON DUPLICATE KEY UPDATE h = VALUES(h), updated_at = CURRENT_TIMESTAMP");
  assert.equal(out, "INSERT INTO g (id, h) VALUES (1, :h) ON CONFLICT DO UPDATE SET h = excluded.h, updated_at = NOW()");
});

test('DDL 의 DEFAULT CURRENT_TIMESTAMP 는 보존', () => {
  assert.equal(rewriteForSqlite("CREATE TABLE t (a TEXT DEFAULT CURRENT_TIMESTAMP)"), 'CREATE TABLE t (a TEXT DEFAULT CURRENT_TIMESTAMP)');
});

test('UDF: NOW / DATE_FORMAT / TIMESTAMPDIFF 실행', () => {
  const db = new Database(':memory:');
  registerSqliteFunctions(db);
  const r1 = db.prepare("SELECT NOW() AS n, DATE_FORMAT('2026-03-05 07:08:09', '%Y-%m-%d %H:%i:%s') AS f, DATE_FORMAT('2026-03-05 07:08:09', '%Y-%m-%d %H:00') AS h").get();
  assert.match(r1.n, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.equal(r1.f, '2026-03-05 07:08:09');
  assert.equal(r1.h, '2026-03-05 07:00');
  const r2 = db.prepare(rewriteForSqlite("SELECT TIMESTAMPDIFF(SECOND, '2026-01-01 00:00:00', '2026-01-01 00:01:30') AS d")).get();
  assert.equal(r2.d, 90);
});

test('params: Date/boolean/undefined 정규화', () => {
  const p = normalizeSqliteParams({ d: new Date(2026, 0, 2, 3, 4, 5), b: true, u: undefined, s: 'x' });
  assert.equal(p.d, '2026-01-02 03:04:05'); assert.equal(p.b, 1); assert.equal(p.u, null); assert.equal(p.s, 'x');
});

test('프로젝트의 모든 런타임 SQL 문장이 SQLite 에서 prepare 된다', () => {
  const db = new Database(':memory:');
  registerSqliteFunctions(db);
  // 스키마: sqlite 마이그레이션 전부 적용
  const root = path.resolve(import.meta.dirname, '..');
  const migDirs = ['lib/admin/database/migrations/sqlite', 'src/database/migrations/sqlite'];
  const files = migDirs.flatMap((d) => fs.readdirSync(path.join(root, d)).filter((f) => f.endsWith('.sql')).map((f) => path.join(root, d, f)));
  files.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  // v1.7.3 이후 .sql 원문에는 {{sample}} 토큰이 들어 있다 — 런타임과 동일하게 치환한 뒤 실행
  for (const f of files) db.exec(toSqlite(fs.readFileSync(f, 'utf8')));

  const sqlDirs = ['lib/admin/database/sql', 'src/database/sql'];
  let count = 0; const failures = [];
  for (const d of sqlDirs) {
    for (const f of fs.readdirSync(path.join(root, d)).filter((x) => x.endsWith('.sql'))) {
      const content = toSqlite(fs.readFileSync(path.join(root, d, f), 'utf8'));
      const blocks = content.split(/^\s*--\s*@name\s*:\s*/m).slice(1);
      for (const b of blocks) {
        const name = b.split('\n')[0].trim();
        let body = b.split('\n').slice(1).filter((l) => !/^\s*--/.test(l)).join('\n').trim().replace(/;\s*$/, '');
        if (!body) continue;
        count++;
        try { db.prepare(rewriteForSqlite(body)); }
        catch (e) { failures.push(`${f}:${name} → ${e.message}`); }
      }
    }
  }
  assert.ok(count > 50, `statements=${count}`);
  assert.deepEqual(failures, [], failures.join('\n'));
});
