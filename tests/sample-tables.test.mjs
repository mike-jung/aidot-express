/**
 * 예제 테이블 스위치 시험. (v1.10.16)
 *
 * ## 문제
 * 새 PC 에서 서버를 띄우면 스키마에 `admin_*`(콘솔) · `users`(앱 인증) ·
 * `sample_*`(예제)가 뒤섞여 나타납니다. 처음 여는 사람은 **무엇을 지워도 되는지**
 * 알 수 없어 "복잡하다" 고 느낍니다.
 *
 * → `.env` 의 `DB_SAMPLES=false` 로 예제를 통째로 끕니다.
 *
 * ⚠ 판정은 **파일 이름이 아니라 내용**으로 합니다. 파일명 규칙에 기대면
 *   나중에 이름을 바꿨을 때 조용히 어긋납니다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** migrationRunner 의 판정 규칙 (같은 로직) */
function isSampleOnly(absPath) {
  let text = '';
  try { text = fs.readFileSync(absPath, 'utf8'); } catch { return false; }
  const stmts = text
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(';').map((x) => x.trim()).filter(Boolean);
  if (!stmts.length) return false;
  const touching = stmts.filter((x) => /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/i.test(x));
  if (!touching.length) return false;
  return touching.every((x) => x.includes('{{sample}}'));
}

const APP = path.join(ROOT, 'src/database/migrations');
const ADMIN = path.join(ROOT, 'lib/admin/database/migrations');
const sqlIn = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.sql')).sort() : []);

test('★ 콘솔 운영 마이그레이션은 절대 예제로 분류되지 않는다', () => {
  // admin_* 가 안 만들어지면 콘솔이 통째로 죽는다
  for (const f of sqlIn(ADMIN)) {
    assert.equal(isSampleOnly(path.join(ADMIN, f)), false, `${f} 가 예제로 분류됐다`);
  }
});

test('★ 앱 인증 테이블도 예제가 아니다', () => {
  // users / refresh_tokens 는 실제 앱이 쓰는 테이블이다
  for (const f of ['001_init_auth.sql', '002_fix_users_and_create_refresh.sql', '005_users_add_name.sql']) {
    const p = path.join(APP, f);
    if (!fs.existsSync(p)) continue;
    assert.equal(isSampleOnly(p), false, `${f} 가 예제로 분류됐다 — 앱 인증이 깨진다`);
  }
});

test('예제 전용 마이그레이션은 예제로 분류된다', () => {
  const samples = sqlIn(APP).filter((f) => isSampleOnly(path.join(APP, f)));
  assert.ok(samples.length >= 3, `예제로 분류된 것이 ${samples.length}건뿐이다`);
});

test('★ 애매하면 실행하는 쪽으로 판단한다', () => {
  const tmp = path.join(ROOT, 'tests', `_mix_${process.pid}.sql`);
  try {
    // 예제와 실제 테이블을 한 파일에서 만드는 경우 — 건너뛰면 실제 테이블이 사라진다
    fs.writeFileSync(tmp,
      'CREATE TABLE IF NOT EXISTS {{sample}}book (id INT);\n'
      + 'CREATE TABLE IF NOT EXISTS real_table (id INT);\n');
    assert.equal(isSampleOnly(tmp), false, '섞여 있으면 실행해야 한다');
  } finally { fs.rmSync(tmp, { force: true }); }
});

test('주석 안의 문장에 속지 않는다', () => {
  const tmp = path.join(ROOT, 'tests', `_cmt_${process.pid}.sql`);
  try {
    fs.writeFileSync(tmp,
      '-- CREATE TABLE real_table (id INT);\n'
      + '/* CREATE TABLE another (id INT); */\n'
      + 'CREATE TABLE IF NOT EXISTS {{sample}}book (id INT);\n');
    assert.equal(isSampleOnly(tmp), true, '주석은 실행되지 않으므로 예제 전용이 맞다');
  } finally { fs.rmSync(tmp, { force: true }); }
});

test('빈 파일이나 읽을 수 없는 파일은 실행 쪽', () => {
  const tmp = path.join(ROOT, 'tests', `_empty_${process.pid}.sql`);
  try {
    fs.writeFileSync(tmp, '-- 주석만 있는 파일\n');
    assert.equal(isSampleOnly(tmp), false);
  } finally { fs.rmSync(tmp, { force: true }); }
  assert.equal(isSampleOnly('/does/not/exist.sql'), false);
});

test('설정과 안내가 연결되어 있다', () => {
  const def = fs.readFileSync(path.join(ROOT, 'src/config/default.js'), 'utf8');
  const idx = fs.readFileSync(path.join(ROOT, 'src/config/index.js'), 'utf8');
  const env = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  /* ★ v1.10.41 — true/false 에서 core/all/none 으로 나뉘었다.
     의도는 그대로다: **첫 실행에는 예제가 필요하다**(none 이 아니다). */
  assert.match(def, /samples: 'core',/, '기본은 켜 둔다 — 첫 실행에는 예제가 필요하다');
  assert.match(idx, /process\.env\.DB_SAMPLES/, 'env 매핑이 없으면 끌 수 없다');
  assert.match(env, /^DB_SAMPLES=/m);
  const runner = fs.readFileSync(path.join(ROOT, 'src/database/migrationRunner.js'), 'utf8');
  assert.match(runner, /import config from/, 'config import 가 없으면 마이그레이션이 통째로 죽는다');
});

test('기동 요약이 테이블 부류를 알려 준다', () => {
  const bs = fs.readFileSync(path.join(ROOT, 'src/core/bootSummary.js'), 'utf8');
  assert.match(bs, /function tableGroups/);
  assert.match(bs, /DB_SAMPLES=false/, '껐으면 그 사실을 말해 줘야 한다');
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.17 — DB 종류별 예제 배치
   MariaDB/MySQL : 별도 스키마 (`sample.book`)  — 스키마 = 데이터베이스
   SQLite        : 접두사     (`sample_book`)  — 스키마 개념 자체가 없다
   ══════════════════════════════════════════════════════════════════════════ */
import { execFileSync } from 'node:child_process';

/**
 * 별도 프로세스로 한정자를 읽는다 — config 는 모듈 로드 시 한 번만 평가되므로
 * 같은 프로세스에서 DB_TYPE 을 바꿔도 반영되지 않는다.
 *
 * ⚠ 두 가지를 피해야 한다:
 *   ① config 가 기동 로그를 stdout 에 찍는다 → 마지막 줄만 읽는다
 *   ② 프로젝트의 `.env` 가 환경변수를 **덮어쓴다** → 빈 임시 디렉터리에서 실행
 */
function prefixWith(env) {
  /* ⚠ config 는 **프로젝트 루트의 `.env`** 를 읽어 환경변수를 덮어쓴다.
     검증용 `.env` 가 놓여 있으면 시험이 그 값을 보게 되므로 잠시 치운다. */
  const envFile = path.join(ROOT, '.env');
  const stash = `${envFile}.testbak_${process.pid}`;
  const had = fs.existsSync(envFile);
  if (had) fs.renameSync(envFile, stash);
  try {
    const out = execFileSync(process.execPath, ['--input-type=module', '-e',
      `const m = await import(${JSON.stringify(path.join(ROOT, 'src/database/tablePrefix.js'))});`
      + "process.stdout.write('\\n@@' + m.samplePrefix());"],
    { env: { ...process.env, ...env }, encoding: 'utf8' });
    const line = out.split('\n').find((l) => l.startsWith('@@'));
    return line === undefined ? '' : line.slice(2);
  } finally {
    if (had) fs.renameSync(stash, envFile);
  }
}

test('★ MariaDB/MySQL 은 별도 스키마로 한정한다', () => {
  assert.equal(prefixWith({ DB_TYPE: 'mariadb' }), 'sample.');
  assert.equal(prefixWith({ DB_TYPE: 'mysql' }), 'sample.');
});

test('★ SQLite 는 접두사를 쓴다 — 스키마 개념이 없다', () => {
  // CREATE SCHEMA 가 문법 오류이고, ATTACH 는 파일이 늘어 백업이 복잡해진다
  assert.equal(prefixWith({ DB_TYPE: 'sqlite' }), 'sample_');
});

test('분리를 끄면 MariaDB 도 접두사로 돌아간다', () => {
  // 기존 설치본을 그대로 쓰고 싶을 때의 탈출구
  assert.equal(prefixWith({ DB_TYPE: 'mariadb', DB_SAMPLE_SCHEMA_SEPARATE: 'false' }), 'sample_');
});

test('스키마 이름을 바꿀 수 있다', () => {
  assert.equal(prefixWith({ DB_TYPE: 'mariadb', DB_SAMPLE_SCHEMA: 'demo' }), 'demo.');
});

test('★ 이상한 스키마 이름은 거부한다 — 식별자는 바인딩할 수 없다', () => {
  assert.throws(() => prefixWith({ DB_TYPE: 'mariadb', DB_SAMPLE_SCHEMA: 'a;DROP DATABASE x' }));
});

test('SQL 치환이 두 방식 모두에서 성립한다', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/database/tablePrefix.js'), 'utf8');
  // 토큰 하나만 바꾸면 되도록 되어 있어야 한다 — SQL 원문은 손대지 않는다
  assert.match(src, /export function supportsSampleSchema/);
  assert.match(src, /export function sampleSchemaName/);
  assert.match(src, /mariadb.*mysql|mysql.*mariadb/s);
});

test('★ 스키마는 마이그레이션 전에 만들어져야 한다', () => {
  // 없으면 `sample.book` 이 통째로 실패한다
  const dbjs = fs.readFileSync(path.join(ROOT, 'src/database/db.js'), 'utf8');
  assert.match(dbjs, /supportsSampleSchema/, 'db.js 가 샘플 스키마를 만들어야 한다');
  assert.match(dbjs, /ensureDatabaseExists\(config, logger, schema\)/);
});

test('예제를 껐으면 스키마도 만들지 않는다', () => {
  const dbjs = fs.readFileSync(path.join(ROOT, 'src/database/db.js'), 'utf8');
  assert.match(dbjs, /config\.db\.samples !== false && config\.db\.sampleSchemaSeparate !== false/);
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.18 — 실제 MariaDB 검증이 잡은 결함
   v1.9.4 에서 `const dbLog = sqlLogger || logger` 를 지우면서 **3줄을 놓쳤습니다.**
   그 3줄은 MariaDB 경로에만 있어 SQLite 검증으로는 드러나지 않았고,
   실제 MariaDB 로 띄우자 **모든 SQL 이 "dbLog is not defined" 로 실패**했습니다.
   ══════════════════════════════════════════════════════════════════════════ */

test('★ db.js 에 정의되지 않은 로거 참조가 없다', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/database/db.js'), 'utf8');
  const body = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1');
  // dbLog 는 v1.9.4 에서 없앤 이름이다 — 남아 있으면 그 경로의 SQL 이 전부 죽는다
  assert.equal(/\bdbLog\b/.test(body), false, 'dbLog 참조가 남아 있다');
  // 쓰는 로거는 전부 import 되어 있어야 한다
  for (const name of ['logger', 'sqlLogger']) {
    if (new RegExp(`\\b${name}\\.`).test(body)) {
      assert.match(src, new RegExp(`import[^\\n]*\\b${name}\\b`), `${name} 이 import 되지 않았다`);
    }
  }
});

test('★ SQL 로그가 본 로그에 kind=sql 로 남는다 (v1.9.4 규칙)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/database/db.js'), 'utf8');
  // 장애 때 원본 로그만 봐서는 그 시각 쿼리를 알 수 없으면 안 된다
  assert.ok(src.includes('{ kind: sqlKind }'));
  assert.ok(src.includes("if (sqlLogger) sqlLogger[ok ? 'debug' : 'warn'](line)"),
    '분리 로거에는 추가로 남긴다');
});
