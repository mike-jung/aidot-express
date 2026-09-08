/**
 * src/database/sqlite-adapter.js
 *
 * better-sqlite3 기반의 SQLite 어댑터.
 *
 *  공통 인터페이스 (db.js 의 다른 어댑터와 동일):
 *    openSqliteDb(opts)          : Database 인스턴스 생성 (pragma 세팅 포함)
 *    sqliteExecute(db, sql, params)
 *    sqliteTransaction(db, fn)
 *    sqliteClose(db)
 *
 *  설계 결정:
 *   - better-sqlite3 는 **동기 API**. async sqlite3 보다 빠른 이유는 SQLite 파일 I/O 자체가
 *     수 마이크로초라 async 콜백 오버헤드가 더 크기 때문. 공식 권장도 동기.
 *   - :name 바인딩 네이티브 지원 → 기존 SQL 파일 그대로 재사용.
 *   - WAL 모드 + foreign_keys=ON 기본 활성화 (동시성/무결성 향상).
 *   - executeList 는 db.js 에서 LIMIT/OFFSET 로 처리 (MariaDB 와 동일 문법).
 *   - SQLite 는 모든 쿼리에서 autoCommit. transaction 블록은 better-sqlite3 의
 *     `db.transaction(fn)` 유틸로 atomic 보장.
 *
 *  SQL 방언 변환:
 *   - MariaDB 의 ':name' 바인딩과 SQLite 의 ':name' 바인딩은 호환되므로 파라미터는 그대로.
 *   - 단, 빈 params 객체일 때 sqlite 는 인자를 아예 넘기면 안됨 (bind error).
 */
import fs from 'node:fs';
import path from 'node:path';
import { registerSqliteFunctions, rewriteForSqlite, normalizeSqliteParams } from './sqlite-dialect.js';

/**
 * @param {object} opts
 * @param {string} opts.file           — DB 파일 절대 경로. ':memory:' 도 허용
 * @param {boolean} [opts.readonly]    — 읽기 전용 모드
 * @param {boolean} [opts.verbose]     — 모든 쿼리를 로거로 출력 (디버그용)
 * @param {Function} [opts.logger]     — verbose 시 사용할 로거 함수
 * @returns Database 인스턴스
 */
export async function openSqliteDb(opts) {
  const file = opts.file;
  if (!file) throw new Error('[sqlite] opts.file 이 필요합니다');

  // 실제 파일 경로인 경우만 상위 디렉토리 생성
  //   ':memory:' / 'file:' URI (URI filename) 는 모두 SQLite 특수 처리 — 건너뜀.
  const isSpecial = file === ':memory:' || file.startsWith('file:');
  if (!isSpecial) {
    const dir = path.dirname(path.resolve(file));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  // better-sqlite3 는 CJS 모듈 — dynamic import() 로 로드 (ESM 경계).
  const mod = await import('better-sqlite3');
  const Database = mod.default ?? mod;

  const db = new Database(file, {
    readonly: !!opts.readonly,
    verbose: opts.verbose ? (sql) => opts.logger?.debug?.(`[sqlite] ${sql}`) : null,
  });

  // pragma — 실무 기본값
  if (!opts.readonly && file !== ':memory:') {
    db.pragma('journal_mode = WAL');         // 동시 읽기/쓰기 성능 ↑
    db.pragma('synchronous = NORMAL');       // WAL 와 함께 쓸 때의 균형점
    db.pragma('temp_store = MEMORY');
    db.pragma('mmap_size = 268435456');      // 256MB memory-mapped I/O
  }
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');        // 동시 쓰기 대기 (SQLITE_BUSY 즉시 실패 방지)

  // MariaDB 문법 호환 UDF (NOW, DATE_FORMAT, TIMESTAMPDIFF ...) — src/database/sqlite-dialect.js
  registerSqliteFunctions(db);

  return db;
}

/**
 * SQL 실행. MariaDB 어댑터의 execute 와 반환 shape 을 맞춘다:
 *   { rows, rowsAffected, insertId?, meta? }
 */
export function sqliteExecute(db, rawSql, rawParams = {}) {
  // MariaDB 전용 구문(DATE_ADD ... INTERVAL, ON DUPLICATE KEY, backtick) → SQLite 구문
  const sql = rewriteForSqlite(rawSql);
  const params = normalizeSqliteParams(rawParams);
  const hasParams = params && Object.keys(params).length > 0;
  const stmt = db.prepare(sql);

  // SELECT 는 rows, 그 외는 changes.
  //  - better-sqlite3 의 `stmt.reader` 가 SELECT 여부를 알려주지만,
  //    그 시점에 이미 prepare 가 끝나 있어야 한다. reader 가 undefined 인 경우도 있으니
  //    fallback 으로 'returnsData' 를 보강.
  const isSelect = stmt.reader === true
    || stmt.reader === undefined && /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql);

  if (isSelect) {
    const rows = hasParams ? stmt.all(params) : stmt.all();
    return { rows, rowsAffected: 0 };
  }

  const info = hasParams ? stmt.run(params) : stmt.run();
  return {
    rows: [],
    rowsAffected: info.changes ?? 0,
    insertId: info.lastInsertRowid != null
      ? (typeof info.lastInsertRowid === 'bigint'
          ? Number(info.lastInsertRowid)
          : info.lastInsertRowid)
      : undefined,
    meta: info,
  };
}

/**
 * 트랜잭션.
 *
 *   await db.transaction(async (tx) => {
 *     await tx.execute('INSERT ...', {...});
 *   });
 *
 * 구현 방식:
 *   better-sqlite3 의 `db.transaction(fn)` 유틸은 fn 이 **동기** 함수여야 함을 강제함
 *   (v12+ 에서 "Transaction function cannot return a promise" 로 명시적 에러).
 *   우리 프로젝트의 service 코드는 async 함수로 통일되어 있으므로, 이 어댑터에선
 *   BEGIN / COMMIT / ROLLBACK 을 직접 실행하는 방식으로 구현한다.
 *
 *   ★ 동시성 주의:
 *     SQLite 는 단일 쓰기 연결 모델이므로 같은 db 핸들에서 동시에 2개 트랜잭션을
 *     시작하면 내부 nesting 이 꼬인다. 이를 방지하기 위해 프로세스 내부에서
 *     트랜잭션을 큐잉 (직렬화) 한다. 한 번에 하나만 진행되며 다른 요청은 대기.
 *     SQLite 파일 I/O 가 마이크로초 단위라 실무 레벨 처리량엔 영향 없음.
 *
 *   ★ BEGIN IMMEDIATE 사용:
 *     DEFERRED (기본) 대신 IMMEDIATE 로 시작해서 쓰기 락을 즉시 획득.
 *     동시 읽기는 WAL 모드 덕분에 계속 가능.
 */
let _txChain = Promise.resolve();

export function sqliteTransaction(db, fn) {
  // 이전 트랜잭션이 끝난 뒤에 시작하도록 체인
  const run = async () => {
    const tx = {
      execute(sql, params = {}) { return sqliteExecute(db, sql, params); },
    };
    tx.query = tx.execute;

    sqliteExecute(db, 'BEGIN IMMEDIATE', {});
    try {
      const result = await fn(tx);  // async fn 지원
      sqliteExecute(db, 'COMMIT', {});
      return result;
    } catch (e) {
      try { sqliteExecute(db, 'ROLLBACK', {}); } catch { /* noop */ }
      throw e;
    }
  };

  // 대기열에 추가. 실패해도 다음 트랜잭션이 처리될 수 있도록 catch 로 흘려보냄.
  const p = _txChain.then(run, run);
  _txChain = p.catch(() => {});
  return p;
}

export function sqliteClose(db) {
  if (db && db.open) {
    try { db.close(); } catch { /* noop */ }
  }
  // close 시 대기 중인 트랜잭션 체인도 reset (새 DB 에서는 깨끗한 상태)
  _txChain = Promise.resolve();
}
