import fs from 'node:fs';
import { isBlocked, blockInfo } from './blocklist.js';   // ★ v1.13.0
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config/index.js';
import { existingDirs } from './appPaths.js';
import { renderSampleTokens } from '../database/tablePrefix.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..');

/**
 * SQL 파일 형식:
 *
 *   -- @name: findById
 *   SELECT * FROM users WHERE id = :id;
 *
 *   -- @name: insert
 *   INSERT INTO users(id, name) VALUES(:id, :name);
 *
 * 각 블록은 '-- @name: 이름' 주석으로 시작하고, 다음 블록 주석이 나오기 전까지를 본문으로 사용.
 */

/** 파일 하나의 SQL 묶음 */
class SqlFile {
  constructor(fileName, statements) {
    this.fileName = fileName;         // 예: 'user'
    this.statements = statements;     // { findById: 'SELECT ...', ... }
  }
  has(name) {
    return Object.prototype.hasOwnProperty.call(this.statements, name);
  }
  /** 원본 SQL 문자열 */
  /**
   * ★ v1.10.34 — 옛 이름과 새 이름을 **둘 다** 받는다.
   *
   *  `updateName` 은 개발 중간 단계에서 "이름만 바꾸는" 임시 함수로 지어진
   *  이름이었다. 다른 것들이 `create` · `remove` 인데 이것만 `updateName` 이라
   *  일관성이 없고, 실제로는 모든 컬럼을 고친다. 그래서 `update` 로 바꾼다.
   *
   *  ⚠ 다만 **이미 만들어진 SQL 파일**에는 `-- @name: updateName` 이 들어 있다.
   *    이름만 바꾸면 그 파일들이 전부 깨진다. 그래서 찾을 때 별칭을 함께 본다:
   *    `update` 로 찾았는데 없으면 `updateName` 도 찾아본다(그 반대도).
   *    기존 파일은 그대로 두고, 새로 만드는 것만 `update` 가 된다.
   */
  _alias(name) {
    if (name === 'update') return 'updateName';
    if (name === 'updateName') return 'update';
    return null;
  }

  get(name) {
    if (this.has(name)) return this.statements[name];
    const alt = this._alias(name);
    if (alt && this.has(alt)) return this.statements[alt];
    throw new Error(`SQL 문을 찾을 수 없습니다: ${this.fileName}:${name}`);
  }
  /**
   * :var 바인딩 파싱 → { text, values, names }
   *  - text  : :var 를 DB 드라이버가 인식할 수 있는 placeholder 로 변환한 SQL
   *  - values: 바인딩 순서대로의 값 배열
   *  - names : placeholder 순서대로의 변수명
   * 기본 placeholder 스타일은 오라클(:name) 유지. style 옵션으로 '?', '$n' 도 가능.
   */
  bind(name, params = {}, style = 'oracle') {
    const raw = this.get(name);
    return bindParams(raw, params, style);
  }
}

/** 전역 SQL 레지스트리 */
class SqlRegistry {
  constructor() {
    this.files = new Map(); // fileName -> SqlFile
  }

  /** 'user:findById' → { file, name } */
  _parseKey(key) {
    const idx = key.indexOf(':');
    if (idx < 0) {
      throw new Error(`SQL 키 형식이 잘못되었습니다: '${key}'. 'file:name' 형식을 사용하세요.`);
    }
    return { file: key.slice(0, idx), name: key.slice(idx + 1) };
  }

  getFile(fileName) {
    if (!this.files.has(fileName)) {
      throw new Error(`SQL 파일을 찾을 수 없습니다: ${fileName}`);
    }
    return this.files.get(fileName);
  }

  /** 'user:findById' 키로 원본 SQL 획득 */
  get(fullKey) {
    const { file, name } = this._parseKey(fullKey);
    return this.getFile(file).get(name);
  }

  /** 'user:findById' 키로 바인딩 결과 획득 */
  bind(fullKey, params = {}, style = 'oracle') {
    const { file, name } = this._parseKey(fullKey);
    return this.getFile(file).bind(name, params, style);
  }

  /**
   * SQL 본문 → `파일:쿼리` 역인덱스. (v1.8.0)
   *
   *  요청 추적에서 "익명 SQL 문자열" 대신 `book:findAll` 같은 이름을 쓰기 위한 것이다.
   *  본문에 `/* @name *\/` 주석을 심는 방법도 있었지만, sqlite 어댑터와 dialect 변환기가
   *  `/^\s*SELECT/i` · `/^\s*DELETE\s/i` 처럼 **문장 첫 단어로 종류를 판정**하기 때문에
   *  앞에 주석이 붙으면 실행 경로 자체가 틀어진다. 그래서 SQL 문자열은 손대지 않고
   *  역인덱스로 푼다 — 레지스트리가 돌려주는 문자열은 동일 인스턴스라 조회가 안정적이다.
   */
  nameOf(sqlText) {
    if (typeof sqlText !== 'string') return null;
    if (!this._reverse || this._reverseSize !== this.files.size) {
      this._reverse = new Map();
      for (const [file, sf] of this.files) {
        for (const [name, text] of Object.entries(sf.statements)) {
          if (!this._reverse.has(text)) this._reverse.set(text, `${file}:${name}`);
        }
      }
      this._reverseSize = this.files.size;
    }
    return this._reverse.get(sqlText) ?? null;
  }

  list() {
    const out = [];
    for (const [file, sf] of this.files) {
      for (const name of Object.keys(sf.statements)) out.push(`${file}:${name}`);
    }
    return out;
  }

  /** 등록된 SQL 파일 목록 (이름 + 쿼리 갯수) */
  listFiles() {
    const out = [];
    for (const [file, sf] of this.files) {
      out.push({ name: file, queries: Object.keys(sf.statements) });
    }
    return out;
  }

  /** 단일 파일 등록/교체 (동적 로딩용) */
  registerFile(fileName, content) {
    // {{sample}} → 샘플 테이블 접두사 (v1.7.3). 원본 파일은 토큰 그대로 둔다.
    const statements = parseSqlFileContent(renderSampleTokens(content));
    this.files.set(fileName, new SqlFile(fileName, statements));
    return { fileName, count: Object.keys(statements).length };
  }

  /** 등록 해제 */
  unregisterFile(fileName) {
    return this.files.delete(fileName);
  }
}

/** ---------- 파서 ---------- */
function parseSqlFileContent(content) {
  const lines = content.split(/\r?\n/);
  const statements = {};
  let currentName = null;
  let currentBuf = [];

  const flush = () => {
    if (currentName == null) return;
    let sql = currentBuf.join('\n').trim();
    if (sql.endsWith(';')) sql = sql.slice(0, -1).trimEnd();
    statements[currentName] = sql;
  };

  const nameRe = /^\s*--\s*@name\s*:\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/;

  for (const line of lines) {
    const m = line.match(nameRe);
    if (m) {
      flush();
      currentName = m[1];
      currentBuf = [];
    } else if (currentName != null) {
      currentBuf.push(line);
    }
  }
  flush();
  return statements;
}

/** :name 바인딩. 문자열 리터럴 안의 : 는 무시 */
/**
 * SQL 이 요구하는 자리표시자만 골라 값을 채운다. 없으면 null.
 *
 *  왜 필요한가 — UPDATE 는 대개 테이블의 **모든 컬럼**을 쓴다:
 *    UPDATE snack SET name=:name, price=:price, memo=:memo WHERE id=:id
 *  클라이언트가 name 만 보내면 `:price` 자리가 비어 "바인딩 파라미터 누락" 으로 실패한다.
 *  빠진 자리를 null 로 채워 그 실패를 막는다.
 *
 *  ⚠ null 로 채운다는 것은 **보내지 않은 컬럼이 null 로 덮인다**는 뜻이다.
 *    일부 컬럼만 고치고 싶다면 그 컬럼만 쓰는 SQL 을 따로 만드는 편이 낫다.
 */
export function fillPlaceholders(sql, params = {}) {
  const names = new Set((String(sql).match(/:(\w+)/g) || []).map((v) => v.slice(1)));
  const bind = {};
  for (const name of names) bind[name] = params?.[name] ?? null;
  return bind;
}

export function bindParams(sql, params = {}, style = 'oracle') {
  const values = [];
  const names = [];
  let out = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;

  while (i < sql.length) {
    const ch = sql[i];
    const prev = sql[i - 1];

    if (ch === "'" && !inDouble && prev !== '\\') {
      inSingle = !inSingle;
      out += ch;
      i++;
      continue;
    }
    if (ch === '"' && !inSingle && prev !== '\\') {
      inDouble = !inDouble;
      out += ch;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && ch === ':') {
      // :: 는 Postgres cast 연산자 → 바인딩으로 취급 안 함 (알파 체크보다 먼저)
      if (sql[i + 1] === ':') {
        out += '::';
        i += 2;
        continue;
      }
      if (!/[A-Za-z_]/.test(sql[i + 1] ?? '')) {
        out += ch;
        i++;
        continue;
      }
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++;
      const name = sql.slice(i + 1, j);
      if (!(name in params)) {
        throw new Error(`바인딩 파라미터 누락: :${name}`);
      }
      values.push(params[name]);
      names.push(name);

      if (style === 'oracle') {
        out += `:${name}`;
      } else if (style === 'qmark') {
        out += '?';
      } else if (style === 'pg' || style === 'postgres') {
        out += `$${values.length}`;
      } else {
        out += `:${name}`;
      }
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return { text: out, values, names };
}

/** 디렉토리 재귀 스캔 */
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.toLowerCase().endsWith('.sql')) out.push(full);
  }
  return out;
}

const registry = new SqlRegistry();

/** 부트 시 1회 호출: src/database/sql 하위의 .sql 파일 전부 로딩 */
/**
 * ★ v1.28.0 — **SQL 파일 하나만** 올린다.
 *
 *  예전에는 `loadSqlFiles()` 로 전부 다시 읽는 길밖에 없었다. 그러면 고치지 않은 것까지
 *  새로 읽혀, "이것 하나만 올리고 싶다" 를 할 수 없었다.
 *  @param {string} file  .sql 파일의 절대 경로
 */
export async function loadSingleSqlFile(file, logger) {
  const fileName = path.basename(file).replace(/\.sql$/i, '');
  if (isBlocked('sqls', fileName)) {
    throw Object.assign(new Error(`${fileName} 은 막혀 있어 올릴 수 없습니다`), { status: 409 });
  }
  const content = fs.readFileSync(file, 'utf8');
  const res = registry.registerFile(fileName, content);
  if (logger) logger.info(`[SQL] loaded one: ${fileName} (${res?.count ?? '?'} queries)`);
  return res;
}

export async function loadSqlFilesFromDir(sqlDir, logger) {
  const files = walk(sqlDir);
  for (const file of files) {
    const rel0 = path.relative(sqlDir, file).replace(/\\/g, '/');
    /* ★ v1.13.0 — 막아 둔 SQL 은 읽지 않는다. 이 파일을 쓰는 서비스는 호출할 때
       "등록되지 않은 SQL" 로 실패한다 — 조용히 옛 쿼리가 도는 것보다 낫다. */
    if (isBlocked('sqls', rel0.replace(/\.sql$/i, ''))) {
      const info = blockInfo('sqls', rel0.replace(/\.sql$/i, ''));
      if (logger) logger.warn(`[SQL] ⛔ ${rel0} is blocked and was not loaded${info?.reason ? ` — ${info.reason}` : ''}`);
      continue;
    }
    const content = fs.readFileSync(file, 'utf8');
    // {{sample}} → 샘플 테이블 접두사 (v1.7.3)
    const statements = parseSqlFileContent(renderSampleTokens(content));
    const rel = rel0;
    const fileName = rel.replace(/\.sql$/i, '');
    registry.files.set(fileName, new SqlFile(fileName, statements));
    if (logger) {
      logger.info(`[SQL] loaded: ${fileName} (${Object.keys(statements).length} statements)`);
    }
  }
  return registry;
}

/**
 * ★ v1.10.42 — 설정된 **모든 폴더**에서 SQL 을 읽는다 (작업 폴더 포함).
 *  같은 파일 이름이 양쪽에 있으면 **나중에 읽은 것**(작업 폴더)이 이긴다 —
 *  예제를 손대지 않고 고쳐 쓸 수 있다.
 */
export async function loadSqlFiles(logger) {
  let last = registry;
  for (const dir of existingDirs('sql')) {
    last = await loadSqlFilesFromDir(dir, logger);
  }
  return last;
}

export { SqlFile, SqlRegistry };
export default registry;
