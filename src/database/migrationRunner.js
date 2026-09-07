/**
 * migrationRunner.js — 순서 기반 idempotent 마이그레이션 러너.
 *
 *  개요:
 *   - dirs 로 지정된 각 디렉토리의 *.sql 파일을 파일명 오름차순으로 실행.
 *   - 이미 실행된 파일은 schema_migrations 테이블에 기록되어 재실행하지 않음.
 *   - mariadb/mysql 및 sqlite 어댑터에서 동작. oracle 은 자동 skip.
 *
 *  ★ patch-07: SQLite 지원 추가.
 *    - adapter 별 하위 디렉토리 규칙: <dir>/sqlite/ → SQLite 전용 마이그레이션.
 *      디렉토리가 있으면 그 안의 파일 사용, 없으면 원본 <dir> 사용.
 *    - SQLite 는 파일 전체를 `db.exec()` 에 전달 — 세미콜론 split 없이.
 *      이유: TRIGGER 의 BEGIN...END 블록 안 세미콜론 때문에 정규식 split 이 깨짐.
 *
 *  파일명 규칙:
 *   - 숫자 접두사 + 설명: `001_init_auth.sql`
 *
 *  SQL 포맷 (MariaDB 경로):
 *   - 여러 문장을 `;` 로 구분하여 작성 가능.
 *   - `--` 한 줄 주석과 블록 주석 제거 후 `;` 로 split.
 *
 *  트랜잭션:
 *   - MariaDB 는 DDL 에서 트랜잭션이 의미 없으므로 파일 단위 실행 후 성공하면 기록.
 *   - SQLite 는 `db.exec()` 가 암시적으로 atomic. 실패 시 이전 변경도 롤백.
 */
import fs from 'node:fs';
import path from 'node:path';

import db from './db.js';
import logger from '../util/logger.js';
import config from '../config/index.js';
import { renderSampleTokens, samplePrefix, SAMPLE_TABLES, looksLikeOurSampleTable } from './tablePrefix.js';

const MIGRATION_TABLE = 'schema_migrations';

/**
 * 마이그레이션 실행 진입점.
 *
 * @param {object}   opts
 * @param {string[]} opts.dirs          — 실행할 디렉토리 목록 (projectRoot 기준 상대경로)
 * @param {string}   opts.projectRoot   — 절대 경로
 */
export async function runMigrations(opts) {
  const adapter = db.currentAdapter();
  if (adapter !== 'mariadb' && adapter !== 'sqlite') {
    logger.info(`[migration] adapter=${adapter} → 자동 마이그레이션 skip`);
    return;
  }

  const { dirs = [], projectRoot } = opts || {};
  if (!projectRoot) throw new Error('[migration] projectRoot 가 필요합니다');

  // adapter 별 디렉토리 선택
  const resolvedDirs = [];
  for (const relDir of dirs) {
    const abs = path.resolve(projectRoot, relDir);
    const specific = path.join(abs, adapter);
    if (fs.existsSync(specific) && fs.statSync(specific).isDirectory()) {
      resolvedDirs.push(specific);
    } else {
      resolvedDirs.push(abs);
    }
  }

  // 1) schema_migrations 테이블 보장
  await ensureMigrationTable(adapter);

  // 2) 이미 실행된 파일명 집합 로드
  const applied = await loadAppliedSet();

  // 3) 파일 수집 + 정렬
  const files = collectSqlFilesAbs(resolvedDirs, projectRoot);

  // 3-1) 접두사 도입(v1.7.3) 이전에 만들어진 샘플 테이블 흡수
  await adoptLegacySampleTables(adapter);

  let ranCount = 0;
  let skipCount = 0;
  const failed = [];

  for (const { absPath, fileName, relPath } of files) {
    if (applied.has(fileName)) {
      /* ★ v1.10.40 — 기록이 있어도 **테이블이 실제로 있는지** 본다.
         없으면 다시 적용한다 (CREATE TABLE IF NOT EXISTS 라 안전). */
      const missing = await missingTablesOf(absPath, adapter);
      if (!missing.length) { skipCount++; continue; }
      logger.warn(`[migration] ${missing.join(', ')} 이(가) 없습니다 `
        + `— 적용 기록은 있지만 ${relPath} 를 다시 적용합니다.`);
    }
    logger.info(`[migration] 적용 시작: ${relPath}`);
    const startedAt = Date.now();
    try {
      await executeSqlFile(absPath, adapter);
      const elapsed = Date.now() - startedAt;
      await recordApplied(fileName, relPath, elapsed);
      logger.info(`[migration] 적용 완료: ${relPath} (${elapsed}ms)`);
      ranCount++;
    } catch (e) {
      // ★ v1.7.3: non-blocking 파일(샘플 데이터 등)은 뒤 파일을 막지 않는다.
      //   기존 동작은 첫 실패에서 throw → 004 하나가 죽으면 005~008 이 통째로 안 돌아
      //   users.name / must_change_password / 화면 프로젝트 테이블이 전부 없는 채로 서버가 떴다.
      //   실패한 파일은 schema_migrations 에 기록하지 않으므로 원인을 고치고 재기동하면 다시 시도한다.
      if (readMigrationOptions(absPath).nonBlocking) {
        logger.error(`[migration] 실패(계속 진행): ${relPath} — ${e.message}`);
        const hint = collisionHint(e);
        if (hint) logger.error(`[migration]   ↳ ${hint}`);
        failed.push({ file: relPath, error: e.message, hint, blocking: false });
        continue;
      }
      logger.error(`[migration] 실패: ${relPath} — ${e.message}`);
      throw e;
    }
  }

  logger.info(`[migration] 완료 — 적용 ${ranCount}건, 건너뜀 ${skipCount}건, 실패 ${failed.length}건 (전체 ${files.length}, adapter=${adapter})`);
  return { ranCount, skipCount, failed, total: files.length, adapter };
}

/* ============================================================
 *  샘플 테이블 흡수 (v1.7.3)
 * ============================================================ */

/**
 * 접두사 도입 이전(v1.7.2 이하)에 만들어진 샘플 테이블을 새 이름으로 RENAME 한다.
 *
 *  · 접두사가 비어 있으면(구버전 호환 모드) 아무것도 하지 않는다.
 *  · 새 이름이 이미 있으면 건드리지 않는다.
 *  · **컬럼 구성이 우리가 만든 모양일 때만** RENAME 한다.
 *    남의 `students`(예: email NOT NULL 보유)는 그대로 두고 경고만 남긴다 —
 *    남의 데이터를 우리가 마음대로 옮기면 안 된다.
 */
/**
 * ★ v1.10.40 — 이 마이그레이션이 만들려는 테이블이 **실제로** 있는가.
 *
 *  예전에는 `schema_migrations` 에 **기록만 있으면** 건너뛰었다. 그래서
 *  테이블이 지워진 뒤에는 재기동해도 되살아나지 않고, 화면에서는
 *  `Table 'sample.book' doesn't exist` 만 보였다.
 *
 *  그런 상태가 되는 경로는 여럿이다 — DB 를 손으로 정리했거나, 덤프를
 *  복원했거나, 이름이 겹쳐 건너뛴 테이블이 있었거나.
 *
 *  ⚠ 마이그레이션은 모두 `CREATE TABLE IF NOT EXISTS` 이므로
 *    **다시 적용해도 안전하다.** 있는 것은 그대로 두고 없는 것만 만든다.
 */
async function missingTablesOf(absPath, adapter) {
  let sql;
  try { sql = fs.readFileSync(absPath, 'utf8'); } catch { return []; }
  // CREATE TABLE 대상 이름을 뽑는다 ({{sample}} 토큰은 실제 접두사로 바꾼다)
  const raw = [...sql.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?([\w{}\s]+?)`?\s*\(/gi)]
    .map((m) => renderSampleTokens(m[1].trim()));
  if (!raw.length) return [];

  const missing = [];
  for (const full of raw) {
    // 'sample.book' 처럼 스키마가 붙어 있을 수 있다
    const [schema, name] = full.includes('.') ? full.split('.') : [null, full];
    try {
      const q = adapter === 'sqlite'
        ? `SELECT name AS t FROM sqlite_master WHERE type='table' AND name = :n`
        : `SELECT TABLE_NAME AS t FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = ${schema ? ':s' : 'DATABASE()'} AND TABLE_NAME = :n`;
      const r = await db.execute(q, schema ? { s: schema, n: name } : { n: name });
      if (!(r.rows || []).length) missing.push(full);
    } catch { /* 확인 실패는 건너뛴다 — 마이그레이션을 막으면 안 된다 */ }
  }
  return missing;
}

async function adoptLegacySampleTables(adapter) {
  const prefix = samplePrefix();
  if (!prefix) return;                       // DB_SAMPLE_PREFIX='' → 구버전 이름 유지

  const bases = Object.keys(SAMPLE_TABLES);
  const wanted = [...bases, ...bases.map((b) => prefix + b)];

  let cols;
  try {
    cols = await collectColumns(adapter, wanted);
  } catch (e) {
    logger.warn(`[migration] 샘플 테이블 점검 실패(건너뜀): ${e.message}`);
    return;
  }

  for (const base of bases) {
    const target = prefix + base;
    if (cols.has(target)) continue;          // 이미 새 이름으로 존재
    if (!cols.has(base)) continue;           // 옛 이름도 없음 → 신규 설치

    if (looksLikeOurSampleTable(base, cols.get(base))) {
      const sql = adapter === 'sqlite'
        ? `ALTER TABLE \`${base}\` RENAME TO \`${target}\``
        : `RENAME TABLE \`${base}\` TO \`${target}\``;
      try {
        await db.execute(sql, {});
        logger.info(`[migration] 샘플 테이블 흡수: ${base} → ${target} (데이터 유지)`);
      } catch (e) {
        logger.warn(`[migration] 샘플 테이블 이름 변경 실패 ${base} → ${target}: ${e.message}`);
      }
    } else {
      logger.warn(
        `[migration] '${base}' 테이블이 이미 있는데 이 프레임워크가 만든 모양이 아닙니다 `
        + `(컬럼: ${cols.get(base).join(', ')}). 다른 프로그램의 테이블로 보고 그대로 둡니다 — `
        + `샘플은 '${target}' 로 따로 만듭니다.`,
      );
    }
  }
}

/** 지정한 테이블들의 컬럼 목록을 한 번에 조회. @returns {Map<string,string[]>} */
async function collectColumns(adapter, tableNames) {
  const map = new Map();
  if (adapter === 'sqlite') {
    const r = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table'", {});
    const present = new Set((r.rows || []).map((x) => String(x.name)));
    for (const name of tableNames) {
      if (!present.has(name)) continue;
      // 테이블명은 우리가 만든 상수 + 검증된 접두사 조합이라 인젝션 여지가 없다.
      const pr = await db.execute(`PRAGMA table_info(\`${name}\`)`, {});
      map.set(name, (pr.rows || []).map((c) => String(c.name)));
    }
    return map;
  }
  // mariadb / mysql
  const list = tableNames.map((n) => `'${n}'`).join(', ');
  const r = await db.execute(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${list})`,
    {},
  );
  for (const row of (r.rows || [])) {
    const t = String(row.t ?? row.TABLE_NAME);
    const c = String(row.c ?? row.COLUMN_NAME);
    if (!map.has(t)) map.set(t, []);
    map.get(t).push(c);
  }
  return map;
}

/**
 * "이름은 같은데 남의 테이블" 정황이면 사람이 읽을 원인 문장을 돌려준다.
 *   1364 ER_NO_DEFAULT_FOR_FIELD  — 우리가 모르는 NOT NULL 컬럼이 있음
 *   1054 ER_BAD_FIELD_ERROR       — 우리가 쓰는 컬럼이 그 테이블엔 없음
 *   1136 ER_WRONG_VALUE_COUNT_ON_ROW
 */
function collisionHint(e) {
  if (!e) return null;
  if (![1364, 1054, 1136].includes(e.errno)) return null;
  return '같은 이름의 테이블이 이미 있는데 구성이 다릅니다 (다른 프로그램이 만든 테이블일 가능성). '
    + '.env 의 DB_SAMPLE_PREFIX 를 다른 값으로 바꾸거나, DB_DATABASE 를 빈 DB 로 지정하세요.';
}

/* ============================================================
 *  내부 헬퍼
 * ============================================================ */

async function ensureMigrationTable(adapter) {
  if (adapter === 'sqlite') {
    const ddl = `
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name   TEXT    NOT NULL,
        source_path TEXT    NULL,
        applied_at  TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        elapsed_ms  INTEGER NULL,
        UNIQUE(file_name)
      )
    `;
    await db.execute(ddl, {});
    return;
  }
  // mariadb
  const ddl = `
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      file_name   VARCHAR(255)    NOT NULL,
      source_path VARCHAR(500)    NULL,
      applied_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      elapsed_ms  INT UNSIGNED    NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_schema_migrations_file (file_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await db.execute(ddl, {});
}

async function loadAppliedSet() {
  const r = await db.execute(`SELECT file_name FROM ${MIGRATION_TABLE}`, {});
  const set = new Set();
  for (const row of (r.rows || [])) set.add(row.file_name);
  return set;
}

async function recordApplied(fileName, relPath, elapsedMs) {
  /* ★ v1.10.40 — **다시 적용될 수 있으므로** 기록도 덮어쓴다.
     테이블이 지워져 재적용하는 경우 기록은 이미 있다. INSERT 만 하면
     `Duplicate entry` 로 실패해, 테이블은 만들어졌는데 실패로 집계된다. */
  const sql = db.currentAdapter() === 'sqlite'
    ? `INSERT INTO ${MIGRATION_TABLE} (file_name, source_path, elapsed_ms)
         VALUES (:file_name, :source_path, :elapsed_ms)
       ON CONFLICT(file_name) DO UPDATE SET source_path = :source_path, elapsed_ms = :elapsed_ms`
    : `INSERT INTO ${MIGRATION_TABLE} (file_name, source_path, elapsed_ms)
         VALUES (:file_name, :source_path, :elapsed_ms)
       ON DUPLICATE KEY UPDATE source_path = VALUES(source_path), elapsed_ms = VALUES(elapsed_ms)`;
  await db.execute(sql, { file_name: fileName, source_path: relPath, elapsed_ms: elapsedMs });
}

/**
 * ★ v1.10.16 — 이 마이그레이션이 **예제 테이블만** 만드는가?
 *
 *  새 PC 에서 서버를 띄우면 스키마에 `admin_*`(콘솔 운영) · `users`(앱 인증) ·
 *  `sample_*`(예제)가 뒤섞여 나타납니다. 처음 여는 사람은 무엇이 지워도 되는
 *  것인지 알 수 없어 "복잡하다" 고 느낍니다.
 *
 *  그래서 예제를 **통째로 끌 수 있게** 합니다 (`.env` 의 `DB_SAMPLES=false`).
 *  파일 이름이 아니라 **내용**으로 판정합니다 — 파일명 규칙에 기대면
 *  나중에 이름을 바꿨을 때 조용히 어긋납니다.
 *
 *  ⚠ `{{sample}}` 토큰이 **하나라도 없는** 문이 있으면 예제 전용이 아닙니다.
 *    예제와 실제 테이블을 한 파일에서 만드는 경우가 있으므로, 애매하면
 *    **실행하는 쪽**으로 판단합니다. 안 만들어서 깨지는 편이 더 위험합니다.
 */
function isSampleOnlyMigration(absPath) {
  let text = '';
  try { text = fs.readFileSync(absPath, 'utf8'); } catch { return false; }
  const stmts = text
    .replace(/--[^\n]*/g, '')                 // 줄 주석
    .replace(/\/\*[\s\S]*?\*\//g, '')          // 블록 주석
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);
  if (!stmts.length) return false;
  // 테이블을 만들거나 건드리는 문이 전부 {{sample}} 대상이어야 한다
  const touching = stmts.filter((x) => /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/i.test(x));
  if (!touching.length) return false;
  return touching.every((x) => x.includes('{{sample}}'));
}

/** 이미 해석된 절대 디렉토리 배열에서 *.sql 파일을 수집 */
function collectSqlFilesAbs(absDirs, projectRoot) {
  const seen = new Map();
  const skippedSamples = [];
  /* ★ v1.10.41 — 예제를 **어디까지** 만들 것인가.
       core (기본) 튜토리얼이 실제로 쓰는 것만  ·  all 전부  ·  none 없음 */
  const level = (() => {
    const v = config.db?.samples;
    if (v === false || v === 'none') return 'none';
    if (v === true || v === 'all') return 'all';
    return 'core';
  })();
  /** 파일 이름으로 갈래를 읽는다 — `008_samples_optional.sql` → optional */
  const groupOf = (name) => {
    const m = /_samples_(core|optional|deprecated)\.sql$/i.exec(name);
    return m ? m[1].toLowerCase() : null;
  };
  for (const absDir of absDirs) {
    if (!fs.existsSync(absDir)) continue;
    const entries = fs.readdirSync(absDir);
    for (const name of entries) {
      if (!name.toLowerCase().endsWith('.sql')) continue;
      if (seen.has(name)) continue; // 앞선 디렉토리 우선
      const g = groupOf(name);
      if (level === 'none' && isSampleOnlyMigration(path.join(absDir, name))) {
        skippedSamples.push(name);
        continue;
      }
      /* core 에서는 선택·정리 대상 갈래를 건너뛴다.
         ⚠ 갈래 표시가 없는 예제 파일(003_init_book 등)은 **건너뛰지 않는다** —
           애매하면 만드는 쪽이 안전하다(v1.10.16 에서 정한 원칙). */
      if (level === 'core' && (g === 'optional' || g === 'deprecated')) {
        skippedSamples.push(name);
        continue;
      }
      const abs = path.join(absDir, name);
      const st = fs.statSync(abs);
      if (!st.isFile()) continue;
      seen.set(name, {
        absPath: abs,
        fileName: name,
        relPath: path.relative(projectRoot, abs).replace(/\\/g, '/'),
      });
    }
  }
  if (skippedSamples.length) {
    logger.info(`[migration] 예제 마이그레이션 ${skippedSamples.length}건 건너뜀 (DB_SAMPLES=false)`, { kind: 'migration' });
  }
  return [...seen.values()].sort((a, b) => a.fileName.localeCompare(b.fileName));
}

/** 한 파일을 실행.
 *  - MariaDB: 세미콜론 split 후 문장별 실행 (기존)
 *  - SQLite : 파일 전체를 db.exec 에 넘겨 한 번에 실행 (TRIGGER BEGIN...END 안의 세미콜론 문제 회피) */
async function executeSqlFile(absPath, adapter) {
  // {{sample}} → 샘플 테이블 접두사 (v1.7.3). 원본 .sql 파일은 토큰 그대로 보관한다.
  const raw = renderSampleTokens(fs.readFileSync(absPath, 'utf8'));

  if (adapter === 'sqlite') {
    // 원본 sqlite handle 을 얻어 exec(). db.js 가 _getHandle 로 노출.
    const handle = db.__sqliteHandle?.();
    if (!handle) {
      // 안전 폴백: handle 미노출 시 단일 exec 을 위해 execute 에 전체 전달
      // (일반적 경로는 아니지만 마이그레이션 실패 시 명확한 메시지)
      throw new Error('[migration] sqlite: db 핸들을 얻지 못했습니다 (db.__sqliteHandle 부재)');
    }
    try {
      handle.exec(raw);
    } catch (e) {
      throw new Error(`SQL 실행 실패 — ${previewSql(raw)} :: ${e.message}`);
    }
    return;
  }

  // MariaDB 경로 (기존 동작)
  const { ignoreAlreadyApplied } = parseMigrationOptions(raw);

  const stmts = splitSqlStatements(raw);
  for (const stmt of stmts) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;

    try {
      await db.execute(trimmed, {});
    } catch (e) {
      if (ignoreAlreadyApplied && isAlreadyAppliedError(e)) {
        logger.info(`[migration] already-applied (무시): ${previewSql(trimmed)} — ${e.message}`);
        continue;
      }
      throw new Error(`SQL 실행 실패 — ${previewSql(trimmed)} :: ${e.message}`);
    }
  }
}

/**
 * 파일 선두 주석의 `-- @migration-options: ...` 헤더를 해석.
 *
 *   ignore-already-applied : "이미 그 상태"를 뜻하는 에러코드를 무시하고 다음 문장으로
 *   non-blocking           : 이 파일이 실패해도 뒤 파일 실행을 막지 않음 (v1.7.3)
 *
 * @param {string} raw SQL 원문
 */
function parseMigrationOptions(raw) {
  const headMatch = String(raw).match(/^\s*(?:--.*\n)*/);
  const header = headMatch ? headMatch[0] : '';
  const line = /@migration-options:([^\n]*)/i.exec(header);
  const opts = line ? line[1] : '';
  return {
    ignoreAlreadyApplied: /\bignore-already-applied\b/i.test(opts),
    nonBlocking: /\bnon-blocking\b/i.test(opts),
  };
}

/** 파일 경로로 옵션만 읽는다 (실패 처리 분기에서 사용). */
function readMigrationOptions(absPath) {
  try {
    return parseMigrationOptions(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return { ignoreAlreadyApplied: false, nonBlocking: false };
  }
}

/**
 * "이미 원하는 상태"를 의미하는 에러 코드들.
 *  - 1091 ER_CANT_DROP_FIELD_OR_KEY : DROP 하려는 컬럼/인덱스가 없음
 *  - 1060 ER_DUP_FIELDNAME         : ADD 하려는 컬럼이 이미 존재
 *  - 1061 ER_DUP_KEYNAME           : ADD 하려는 인덱스가 이미 존재
 *  - 1050 ER_TABLE_EXISTS_ERROR    : CREATE TABLE (IF NOT EXISTS 없이)
 *  - 1068 ER_MULTIPLE_PRI_KEY      : PK 중복 추가
 *  - 1146 ER_NO_SUCH_TABLE         : 테이블 자체가 없음 (DROP 대상)
 */
function isAlreadyAppliedError(e) {
  if (!e) return false;
  const errno = e.errno;
  if ([1091, 1060, 1061, 1050, 1068, 1146].includes(errno)) return true;
  return false;
}

/**
 * 매우 단순한 SQL splitter.
 *  - `--` 한 줄 주석과 `/* ... *\/` 블록 주석 제거
 *  - 세미콜론으로 분리 (문자열 리터럴 내부 세미콜론 보호)
 *  - DELIMITER 문은 지원하지 않음 (프로시저/트리거가 필요하면 별도 관리)
 */
function splitSqlStatements(src) {
  // 1) 블록 주석 제거
  let s = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // 2) 한 줄 주석 제거 (-- ... 또는 # ...)
  s = s.split('\n').map((ln) => {
    // 문자열 리터럴 밖의 -- 부터 끝까지 삭제
    return stripLineComment(ln);
  }).join('\n');

  // 3) 세미콜론 분리 (문자열 안의 ; 보호)
  const out = [];
  let buf = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const prev = s[i - 1];
    if (c === "'" && prev !== '\\' && !inDouble && !inBacktick) inSingle = !inSingle;
    else if (c === '"' && prev !== '\\' && !inSingle && !inBacktick) inDouble = !inDouble;
    else if (c === '`' && !inSingle && !inDouble) inBacktick = !inBacktick;

    if (c === ';' && !inSingle && !inDouble && !inBacktick) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function stripLineComment(line) {
  let inSingle = false, inDouble = false, inBacktick = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i], prev = line[i - 1];
    if (c === "'" && prev !== '\\' && !inDouble && !inBacktick) inSingle = !inSingle;
    else if (c === '"' && prev !== '\\' && !inSingle && !inBacktick) inDouble = !inDouble;
    else if (c === '`' && !inSingle && !inDouble) inBacktick = !inBacktick;
    if (!inSingle && !inDouble && !inBacktick) {
      if (c === '-' && line[i + 1] === '-') return line.slice(0, i);
      if (c === '#') return line.slice(0, i);
    }
  }
  return line;
}

function previewSql(s) {
  return s.replace(/\s+/g, ' ').trim().slice(0, 120);
}
