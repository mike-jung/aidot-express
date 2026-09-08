/**
 * 마이그레이션이 기록이 아니라 **실제 테이블**을 본다. (v1.10.40)
 *
 * ## 증상
 * 콘솔에서 샘플 API 를 부르면 이렇게 났다.
 *
 *     500  Table 'sample.book' doesn't exist
 *
 * ## 원인
 * `schema_migrations` 에 **기록만 있으면** 건너뛰었다.
 *
 * ```js
 * if (applied.has(fileName)) { skipCount++; continue; }   // 기록만 본다
 * ```
 *
 * 그래서 테이블이 지워진 뒤에는 재기동해도 되살아나지 않는다.
 * 그런 상태가 되는 경로는 여럿이다 — DB 를 손으로 정리했거나, 덤프를
 * 복원했거나, 이름이 겹쳐 건너뛴 테이블이 있었거나.
 *
 * ⚠ 샘플 개수를 줄여도 이 문제는 그대로 남는다. 원인이 다르다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNNER = fs.readFileSync(path.join(ROOT, 'src/database/migrationRunner.js'), 'utf8');

test('★ 기록이 있어도 테이블이 없으면 다시 적용한다', () => {
  assert.match(RUNNER, /async function missingTablesOf\(absPath, adapter\)/);
  // 건너뛰기 전에 확인해야 한다
  assert.match(RUNNER, /const missing = await missingTablesOf\(absPath, adapter\);/);
  assert.match(RUNNER, /if \(!missing\.length\) \{ skipCount\+\+; continue; \}/);
});

test('무엇이 없어서 다시 만드는지 알려 준다', () => {
  // 조용히 다시 만들면 "왜 느리지" 가 된다
  assert.match(RUNNER, /not found/);
  assert.match(RUNNER, /logger\.warn/);
});

test('★ 재적용해도 기록이 깨지지 않는다', () => {
  /* 테이블만 지워진 경우 기록은 이미 있다. INSERT 만 하면 Duplicate entry 로
     실패해, 테이블은 만들어졌는데 "실패 1건" 으로 집계된다 — 실제로 겪었다. */
  assert.match(RUNNER, /ON DUPLICATE KEY UPDATE/);
  assert.match(RUNNER, /ON CONFLICT\(file_name\) DO UPDATE/);
});

test('sqlite 와 mariadb 를 갈라 쓴다', () => {
  assert.match(RUNNER, /db\.currentAdapter\(\) === 'sqlite'/);
  // sqlite 는 sqlite_master, 그 외는 information_schema
  assert.match(RUNNER, /FROM sqlite_master WHERE type='table'/);
  assert.match(RUNNER, /FROM information_schema\.TABLES/);
});

test('★ 확인이 실패해도 마이그레이션을 막지 않는다', () => {
  // 존재 확인이 깨졌다고 기동을 못 하게 하면 더 나쁘다
  assert.match(RUNNER, /catch \{ \/\* 확인 실패는 건너뛴다/);
});

test('{{sample}} 토큰을 실제 이름으로 바꿔 확인한다', () => {
  // 마이그레이션 원문은 `{{sample}}book` 이다. 그대로 찾으면 항상 '없음' 이 된다
  assert.match(RUNNER, /renderSampleTokens\(m\[1\]\.trim\(\)\)/);
});

test('마이그레이션이 모든 샘플 테이블을 만든다', () => {
  const dir = path.join(ROOT, 'src/database/migrations');
  const made = new Set();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql'))) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of sql.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?\{\{\s*sample\s*\}\}(\w+)/gi)) {
      made.add(m[1]);
    }
  }
  // 튜토리얼·샘플 API 가 실제로 쓰는 것들
  for (const t of ['book', 'guestbook', 'students', 'guestbook', 'students']) {
    assert.ok(made.has(t), `${t} 를 만드는 마이그레이션이 없다`);
  }
});
