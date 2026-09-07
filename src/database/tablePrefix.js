/**
 * tablePrefix.js — 샘플/튜토리얼 테이블 이름에 접두사를 붙이는 단일 지점.
 *
 *  왜 필요한가:
 *    `person`, `students`, `book`, `guestbook` 같은 이름은 너무 흔해서, 이미 쓰고 있는
 *    DB 에 aidot-express 를 붙이면 남의 테이블과 부딪친다. 그런데 `CREATE TABLE IF NOT EXISTS`
 *    는 **이름만** 보고 넘어가므로 남의 테이블이 그대로 남고, 뒤따르는 시드 INSERT 가
 *    그 테이블로 꽂혀 1364(Field '...' doesn't have a default value) 같은 엉뚱한 에러를 낸다.
 *
 *  해법 (v1.7.3):
 *    SQL 원문에 `{{sample}}` 토큰을 쓰고, 실행 직전에 접두사로 치환한다.
 *      `SELECT * FROM {{sample}}students`  →  `SELECT * FROM sample_students`
 *
 *    토큰 방식을 쓴 이유 — 테이블명을 정규식으로 통째 치환하면 `person_id` 같은 컬럼명이나
 *    문자열 리터럴 안의 단어까지 바뀐다. 토큰은 그런 오탐이 원천적으로 없다.
 *
 *  설정:
 *    config.db.samplePrefix (.env 의 DB_SAMPLE_PREFIX) — 기본 'sample_'
 *    빈 문자열('')로 두면 v1.7.2 이전과 완전히 동일한 이름을 쓴다 (기존 설치본 탈출구).
 *
 *  ⚠ 이 접두사는 **샘플 테이블에만** 적용된다.
 *    users / refresh_tokens / admin_* / schema_migrations 는 프레임워크 테이블이라 그대로 둔다.
 */
import config from '../config/index.js';

const TOKEN_RE = /\{\{\s*sample\s*\}\}/g;

/** 식별자로 안전한 문자만 허용 — 설정 오타로 SQL 이 깨지는 것을 막는다. */
const SAFE_PREFIX_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * ★ v1.10.17 — 스키마 분리를 지원하는 DB 인가?
 *
 *  MariaDB/MySQL 은 **스키마와 데이터베이스가 동의어**입니다(공식 문서).
 *  그래서 `sample` 이라는 별도 DB 를 만들고 `sample.book` 으로 한정하면
 *  개발자가 `aidot-express` 스키마를 열었을 때 예제가 보이지 않습니다.
 *
 *  ⚠ SQLite 는 스키마 개념이 없습니다 — `CREATE SCHEMA` 가 문법 오류입니다.
 *    (`ATTACH DATABASE` 로 별도 파일을 붙이는 방법은 있지만, 파일이 늘고
 *     백업·복사 절차가 복잡해집니다. 파일 하나로 끝나는 장점을 잃습니다.)
 *    그래서 SQLite 는 **기존처럼 접두사**를 씁니다.
 */
export function supportsSampleSchema() {
  const type = String(config?.db?.type || '').toLowerCase();
  return type === 'mariadb' || type === 'mysql';
}

/** 스키마 분리를 쓸 때의 스키마 이름 (.env 의 DB_SAMPLE_SCHEMA) */
export function sampleSchemaName() {
  const raw = config?.db?.sampleSchema;
  const v = String(raw ?? 'sample').trim();
  if (!v) return '';
  if (!SAFE_PREFIX_RE.test(v)) {
    throw new Error(
      `[tablePrefix] DB_SAMPLE_SCHEMA='${v}' 는 사용할 수 없습니다. `
      + '영문/숫자/밑줄만 쓰고 숫자로 시작하지 마세요 (예: sample).',
    );
  }
  return v;
}

/**
 * 현재 설정된 샘플 테이블 한정자.
 *
 *  MariaDB/MySQL  →  'sample.'   (별도 스키마)
 *  SQLite 등      →  'sample_'   (접두사 — 스키마 개념이 없다)
 *
 *  두 경우 모두 `{{sample}}book` → `sample.book` / `sample_book` 로 치환되므로
 *  **SQL 원문은 손댈 필요가 없습니다.**
 *
 * @returns {string} 예: 'sample.' 또는 'sample_' (빈 문자열이면 한정 없음)
 */
export function samplePrefix() {
  // ── 스키마 분리 (MariaDB/MySQL) ──────────────────────────────────────
  if (supportsSampleSchema() && config?.db?.sampleSchemaSeparate !== false) {
    const schema = sampleSchemaName();
    return schema ? `${schema}.` : '';
  }

  // ── 접두사 (SQLite 등) ───────────────────────────────────────────────
  const raw = config?.db?.samplePrefix;
  if (raw === undefined || raw === null) return 'sample_';
  const v = String(raw).trim();
  if (v === '') return '';
  if (!SAFE_PREFIX_RE.test(v)) {
    throw new Error(
      `[tablePrefix] DB_SAMPLE_PREFIX='${v}' 는 사용할 수 없습니다. `
      + '영문/숫자/밑줄만 쓰고 숫자로 시작하지 마세요 (예: sample_).',
    );
  }
  return v;
}

/**
 * SQL 원문의 `{{sample}}` 토큰을 접두사로 치환.
 * @param {string} text
 * @returns {string}
 */
export function renderSampleTokens(text) {
  if (text == null) return text;
  const s = String(text);
  if (!s.includes('{{')) return s;   // 빠른 경로 — 토큰 없는 파일이 대부분
  const prefix = samplePrefix();
  return s.replace(TOKEN_RE, prefix);
}

/**
 * 기본 이름 → 접두사가 붙은 실제 테이블명.
 * @param {string} baseName 예: 'students'
 * @returns {string} 예: 'sample_students'
 */
export function sampleTable(baseName) {
  return `${samplePrefix()}${baseName}`;
}

/**
 * 이 프레임워크가 만드는 샘플 테이블과 그 컬럼 목록.
 *
 *  용도 두 가지:
 *   1) 기존 설치본 흡수(adopt) — 접두사 없는 옛 테이블이 **우리가 만든 것일 때만** RENAME.
 *   2) 진단 메시지 — 이름은 같은데 남의 테이블일 때 원인을 정확히 짚어 준다.
 *
 *  컬럼 목록은 MariaDB/SQLite 양쪽의 합집합이다.
 *    (예: sqlite 의 book 에는 author_ai 가 없다 → 부분집합도 우리 것으로 인정)
 */
export const SAMPLE_TABLES = Object.freeze({
  book:                   ['id', 'title', 'author', 'author_ai', 'price', 'created_at'],
  person:                 ['id', 'name', 'age', 'mobile'],
  students:               ['id', 'name', 'created_at'],
  secure_member:          ['id', 'name', 'ssn', 'phone', 'phone_ai'],
  weight_records:         ['id', 'date', 'weight', 'memo', 'created_at', 'updated_at'],
  weight_goals:           ['id', 'height', 'min_weight', 'max_weight', 'created_at', 'updated_at'],
  blood_pressure_records: ['id', 'date', 'label', 'systolic', 'diastolic', 'memo', 'created_at', 'updated_at'],
  blood_pressure_goals:   ['id', 'type', 'min_value', 'max_value', 'created_at', 'updated_at'],
  blood_sugar_records:    ['id', 'date', 'label', 'meal_time', 'value', 'memo', 'created_at', 'updated_at'],
  blood_sugar_goals:      ['id', 'type', 'min_value', 'max_value', 'created_at', 'updated_at'],
  guestbook:              ['id', 'writer', 'message', 'created_at'],
});

/**
 * 실제 테이블의 컬럼 집합이 "우리가 만든 샘플 테이블"과 맞는지 판정.
 *
 *  판정 규칙 (보수적 — 애매하면 남의 것으로 본다):
 *    · `id` 컬럼이 있어야 한다.
 *    · 실제 컬럼이 **전부** 우리 컬럼 목록 안에 있어야 한다 (부분집합 허용).
 *      → 남의 students 에 `email` 이 있으면 우리 것이 아니라고 판정.
 *
 * @param {string}   baseName    접두사 없는 기본 이름 ('students')
 * @param {string[]} actualCols  실제 테이블의 컬럼명 배열
 * @returns {boolean}
 */
export function looksLikeOurSampleTable(baseName, actualCols) {
  const known = SAMPLE_TABLES[baseName];
  if (!known || !Array.isArray(actualCols) || actualCols.length === 0) return false;
  const knownSet = new Set(known.map((c) => c.toLowerCase()));
  const actual = actualCols.map((c) => String(c).toLowerCase());
  if (!actual.includes('id')) return false;
  return actual.every((c) => knownSet.has(c));
}

export default { samplePrefix, renderSampleTokens, sampleTable, SAMPLE_TABLES, looksLikeOurSampleTable };

/**
 * ★ v1.12.2 — 내가 만드는 업무 테이블이 있는 스키마 (.env 의 DB_APP_SCHEMA).
 *   비어 있으면 접속 스키마를 그대로 쓴다(예전 동작).
 *   SQLite 는 스키마 개념이 달라 항상 빈 문자열을 돌려준다.
 * @returns {string} 예: 'aidot_app' 또는 ''
 */
export function appSchemaName() {
  if (!supportsSampleSchema()) return '';   // SQLite 등은 스키마 개념이 다르다
  const raw = config?.db?.appSchema;
  if (!raw || typeof raw !== 'string') return '';
  const v = raw.trim();
  if (!v) return '';
  if (!SAFE_PREFIX_RE.test(v)) {
    throw new Error(`[tablePrefix] DB_APP_SCHEMA='${v}' 는 사용할 수 없습니다. 영문/숫자/밑줄만 쓰고 숫자로 시작하지 마세요.`);
  }
  return v;
}

/**
 * 업무 테이블 이름에 스키마를 붙인다. 이미 `스키마.테이블` 이면 그대로 둔다.
 * @param {string} tableName 예: 'snack' → 'aidot_app.snack'
 */
export function qualifyAppTable(tableName) {
  const t = String(tableName || '').trim();
  if (!t || t.includes('.')) return t;
  const schema = appSchemaName();
  return schema ? `${schema}.${t}` : t;
}
