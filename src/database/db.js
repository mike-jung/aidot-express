/**
 * DB 접속 래퍼 (멀티 어댑터).
 *
 * 지원: sqlite (기본), mariadb, mysql, oracle, postgres.
 *
 *  ★ patch-07: 'mock' 어댑터 폐기. SQLite 로 교체.
 *    - 기존 DB_TYPE=mock 설정은 경고와 함께 sqlite 로 자동 매핑.
 *    - SQLite 는 파일 기반 / 메모리(':memory:') 둘 다 지원.
 *    - better-sqlite3 prebuild 바이너리라 외부 DB 서버 설치 불필요.
 *
 *  공통 인터페이스:
 *    await initDb()                           // 부팅 시 1회
 *    await execute(sql, params)               // sql 은 :name 스타일, params 는 객체
 *    await query(sql, params)                 // alias
 *    await transaction(async (tx) => { ... }) // 트랜잭션
 *    await closeDb()                          // 종료 시 graceful close
 *
 *  반환 형식:
 *    { rows, rowsAffected, insertId?, meta? }
 *
 *  :name 바인딩:
 *    - mariadb : `namedPlaceholders: true` 옵션
 *    - oracle  : 네이티브 지원
 *    - sqlite  : better-sqlite3 네이티브 지원
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import config from '../config/index.js';
import logger, { isAdminSql, sqlLogger } from '../util/logger.js';
import { addStep, enterTransaction, exitTransaction } from '../core/requestContext.js';
import sqlRegistry from '../core/sqlLoader.js';
import metrics from '../core/metrics.js';
import {
  openSqliteDb, sqliteExecute, sqliteTransaction, sqliteClose,
} from './sqlite-adapter.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..');

let adapter = 'sqlite';
let pool = null;        // mariadb/postgres: pool 객체. oracle: pool 객체. sqlite: Database 인스턴스.
let driver = null;      // oracledb 모듈 캐시

/** SQLite 기본 파일 경로 결정.
 *  우선순위:
 *    1) config.db.file (env DB_FILE)
 *       - ':memory:' 는 리터럴 그대로 (path.resolve 적용하면 잘못된 경로 생성됨)
 *    2) process.env.ELECTRON_USER_DATA_PATH (Electron main 이 주입) → <userData>/app.db
 *    3) <projectRoot>/data/app.db
 */
function resolveSqliteFile() {
  if (config.db.file && typeof config.db.file === 'string') {
    const f = config.db.file.trim();
    // ':memory:' / 'file::memory:...' 같은 SQLite 특수 URI 는 그대로 반환
    if (f === ':memory:' || f.startsWith('file::memory:') || f.startsWith('file:')) return f;
    return path.isAbsolute(f) ? f : path.resolve(projectRoot, f);
  }
  //  ⚠ v1.2.0: electron/server-bridge.cjs 는 ELECTRON_USER_DATA_PATH 로 주입하는데
  //     여기서는 ELECTRON_USER_DATA 만 읽어서, 패키징 설치본의 app.db 가 userData 가 아니라
  //     설치 폴더(resources/app/data) 에 생성되고 있었다 (업그레이드/재설치 시 데이터 유실).
  const userData = process.env.AIDOT_DATA_DIR || process.env.ELECTRON_USER_DATA_PATH || process.env.ELECTRON_USER_DATA;
  if (userData) return path.join(userData, 'app.db');
  return path.resolve(projectRoot, 'data', 'app.db');
}

/**
 * 초기 접속 상태 — 부팅 마지막에 요약을 찍고, DB 가 필요한 단계를 건너뛰는 데 쓴다.
 *   { available, adapter, error, hint }
 */
let dbStatus = { available: null, adapter: null, error: null, hint: null };

export function getDbStatus() {
  return { ...dbStatus, adapter: dbStatus.adapter ?? adapter };
}

/** DB 없이 부팅된 상태인가 (마이그레이션·관리자 생성 등을 건너뛸지 판단) */
export function isDbUnavailable() {
  return dbStatus.available === false;
}

/** 스키마 이름으로 쓸 수 있는가 — 식별자는 파라미터 바인딩이 안 되므로 직접 검사한다 */
const SAFE_DB_NAME = /^[A-Za-z_][A-Za-z0-9_$]*$/;

/**
 * ★ v1.9.3 — MariaDB/MySQL 스키마가 없으면 만든다.
 *
 *  database 를 지정하지 않은 **일회용 연결**로 붙어 `CREATE DATABASE IF NOT EXISTS` 를 실행한다.
 *  이미 있으면 아무 일도 하지 않는다(IF NOT EXISTS).
 *
 *  ⚠ 실패해도 던지지 않는다. 여기서 막으면 "DB 연결 실패" 보다 더 알기 어려운 오류가 된다.
 *    대신 **무엇을 어떻게 해야 하는지** 로그로 알려 주고, 원래 흐름이 이어서 시도하게 둔다.
 */
async function ensureDatabaseExists(config, logger, overrideName) {
  const name = String(overrideName ?? config.db.database ?? '').trim();
  if (!name) return;

  if (!SAFE_DB_NAME.test(name)) {
    // 식별자는 바인딩할 수 없어 문자열로 넣어야 한다 — 이상한 이름은 아예 시도하지 않는다
    logger.warn(`[DB] DB_DATABASE='${name}' cannot be created automatically (letters, digits and underscore only).`);
    return;
  }

  let conn = null;
  try {
    const { createConnection } = await import('mariadb');
    conn = await Promise.race([
      createConnection({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        // database 를 **지정하지 않는다** — 이게 이 함수의 핵심이다
        ...(config.db.ssl ? { ssl: true } : {}),
        connectTimeout: config.db.connectTimeout ?? 10_000,
        charset: 'utf8mb4',
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('접속 시간 초과(5초)')), 5_000)),
    ]);

    const rows = await conn.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [name]);
    if (rows.length) {
      logger.debug(`[DB] schema '${name}' is there`);
      return;
    }

    // 한글 데이터를 다루므로 utf8mb4 로 고정한다 — 서버 기본이 latin1 인 설치가 아직 있다
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${name}\` ` +
      'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    logger.info(`[DB] created schema '${name}' (utf8mb4).`);
  } catch (e) {
    const denied = /denied|1044|1045|permission/i.test(e.message || '');
    logger.warn(`[DB] not creating the schema automatically — ${e.message}`);
    if (denied) {
      // 권한이 없으면 사용자가 직접 만들어야 한다. 그 SQL 을 그대로 준다.
      logger.warn('[DB] this account has no CREATE right. Run the following yourself:');
      logger.warn(`[DB]   CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      logger.warn(`[DB]   GRANT ALL PRIVILEGES ON \`${name}\`.* TO '${config.db.user}'@'%';`);
      logger.warn('[DB] to turn this off, set DB_AUTO_CREATE_DATABASE=false in .env');
    }
  } finally {
    if (conn) { try { await conn.end(); } catch { /* 무시 */ } }
  }
}

export async function initDb() {
  let type = (config.db.type || process.env.DB_TYPE || 'sqlite').toLowerCase();

  // 하위 호환: 기존 DB_TYPE=mock 설정을 sqlite 로 자동 매핑
  if (type === 'mock') {
    logger.warn(
      `[DB] DB_TYPE='mock' 은 patch-07 에서 폐기되었습니다. SQLite 로 자동 전환합니다. ` +
      `.env 를 수정해 DB_TYPE=sqlite (또는 다른 실제 DB) 로 변경하세요.`,
    );
    type = 'sqlite';
  }

  if (type === 'sqlite' || type === 'sqlite3') {
    const file = resolveSqliteFile();
    try {
      pool = await openSqliteDb({ file, logger });
      adapter = 'sqlite';
      logger.info(`[DB] sqlite ready: ${file === ':memory:' ? '(in-memory)' : file}`);
    } catch (e) {
      logger.error(`[DB] sqlite failed to start: ${e.message}`);
      throw e;
    }
  } else if (type === 'mariadb' || type === 'mysql') {
    const { createPool } = await import('mariadb');

    /* ★ v1.9.3 — 스키마가 없으면 만든다.
       MariaDB 를 갓 설치한 PC 에는 당연히 우리 스키마가 없다. 그런데 풀을 만들 때
       `database:` 를 지정하므로 **연결 자체가 실패**하고, sqlite 로 조용히 폴백하거나
       "DB 연결 실패" 만 뜬다. 사용자는 .env 를 몇 번씩 확인하게 된다.
       sqlite 는 파일을 알아서 만드는데 MariaDB 만 그러지 않는 것도 앞뒤가 안 맞는다.

       그래서 **database 를 빼고 한 번 붙어서** CREATE DATABASE IF NOT EXISTS 를 실행한다.
       DB_AUTO_CREATE_DATABASE=false 로 끌 수 있다 (운영에서 계정에 권한을 안 주는 경우). */
    if (config.db.autoCreateDatabase !== false) {
      await ensureDatabaseExists(config, logger);

      /* ★ v1.10.17 — 예제용 별도 스키마.
         MariaDB/MySQL 은 스키마 = 데이터베이스이므로, 예제를 `sample` 스키마에
         두면 개발자가 `aidot-express` 를 열었을 때 예제가 보이지 않는다.
         ⚠ 스키마가 없으면 `sample.book` 이 통째로 실패하므로 **마이그레이션 전에**
           만들어야 한다. 여기가 그 자리다. */
      if (config.db.samples !== false && config.db.sampleSchemaSeparate !== false) {
        const { supportsSampleSchema, sampleSchemaName } = await import('./tablePrefix.js');
        if (supportsSampleSchema()) {
          const schema = sampleSchemaName();
          if (schema) await ensureDatabaseExists(config, logger, schema);
        }
      }

      /* 업무 테이블 스키마 (DB_APP_SCHEMA) — 콘솔에서 만드는 테이블이 들어갈 곳.
         기동할 때 없으면 만들어 둔다. 그래야 스키마 이름만 정해 두고 바로 테이블을 만들 수 있다. */
      {
        const { appSchemaName } = await import('./tablePrefix.js');
        let appSchema = '';
        try { appSchema = appSchemaName(); } catch (e) { logger.warn(`[DB] ${e.message}`); }
        if (appSchema && appSchema !== config.db.database) {
          await ensureDatabaseExists(config, logger, appSchema);
        }
      }
    }
    // mariadb connector 3.5 (https://github.com/mariadb-corporation/mariadb-connector-nodejs)
    //   - namedPlaceholders : SQL 파일의 :name 바인딩을 드라이버가 이스케이프 (SQL injection 차단)
    //   - allowPublicKeyRetrieval 미사용, multipleStatements 기본 false 유지 (스택 쿼리 차단)
    //   - ssl: DB_SSL=true 이면 TLS. 서버 인증서는 OS 신뢰 저장소로 검증 (rejectUnauthorized 기본 true)
    pool = createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      connectionLimit: config.db.connectionLimit ?? 10,
      acquireTimeout: config.db.acquireTimeout ?? 10_000,
      connectTimeout: config.db.connectTimeout ?? 10_000,
      ...(config.db.ssl ? { ssl: true } : {}),
      timezone: config.db.timezone || 'local',
      charset: 'utf8mb4',
      namedPlaceholders: true,
      insertIdAsNumber: true,
      decimalAsNumber: true,
      bigIntAsNumber: true,
      // 연결이 끊기면 재시도 / 풀 회복
      idleTimeout: 600,
      minDelayValidation: 500,
      leakDetectionTimeout: 60_000,
    });
    adapter = 'mariadb';
    logger.info(
      `[DB] mariadb pool ready ${config.db.host}:${config.db.port}/${config.db.database} ` +
      `(connectionLimit=${config.db.connectionLimit ?? 10})`,
    );
    // 초기 접속 확인 — 실패 시 sqlite 로 폴백 (기존 mock 폴백의 대체)
    //  ⚠ v1.7.2: 예전에는 풀 획득 타임아웃(10초)을 그대로 기다렸다. 비밀번호가 틀리면
    //    이 확인 + 마이그레이션 + 관리자 생성 + 보안 점검이 각각 10초씩 걸려 기동에 50초가 걸렸다.
    //    → 확인은 3초 안에 끝내고, 실패하면 이후 DB 단계는 건너뛴다 (요청 시점에 다시 시도됨).
    const fallback = config.db.fallbackToSqlite !== false;
    try {
      const probe = Promise.race([
        (async () => {
          const conn = await pool.getConnection();
          try { await conn.ping(); } finally { conn.release(); }
        })(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('접속 확인 시간 초과(3초)')), 3_000)),
      ]);
      await probe;
      logger.info('[DB] mariadb connection OK');
      dbStatus = { available: true, adapter: 'mariadb', error: null, hint: null };
    } catch (e) {
      if (fallback) {
        logger.warn(`[DB] mariadb connection failed: ${e.message} → falling back to sqlite`);
        try { await pool.end(); } catch {}
        pool = null;
        // 재귀 초기화 — sqlite 로
        const file = resolveSqliteFile();
        pool = await openSqliteDb({ file, logger });
        adapter = 'sqlite';
        logger.info(`[DB] sqlite fallback ready: ${file}`);
        dbStatus = { available: true, adapter: 'sqlite', error: null, hint: null };
      } else {
        logger.error(`[DB] mariadb connection failed — ${e.message}`);
        dbStatus = {
          available: false,
          adapter: 'mariadb',
          error: e.message,
          hint: dbFixHint(e),
        };
        printDbHelp(e);
      }
    }
  } else if (type === 'oracle') {
    try {
      const oracleMod = await import('oracledb');
      const oracledb = oracleMod.default ?? oracleMod;
      oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
      pool = await oracledb.createPool({
        user: config.db.user,
        password: config.db.password,
        connectString: `${config.db.host}:${config.db.port}/${config.db.service}`,
        poolMin: 2,
        poolMax: config.db.connectionLimit ?? 10,
      });
      driver = oracledb;
      adapter = 'oracle';
      logger.info(`[DB] oracle pool ready ${config.db.host}:${config.db.port}/${config.db.service}`);
    } catch (e) {
      logger.error(`[DB] could not load oracledb (run npm i oracledb): ${e.message} → falling back to sqlite`);
      const file = resolveSqliteFile();
      pool = await openSqliteDb({ file, logger });
      adapter = 'sqlite';
    }
  } else if (type === 'postgres' || type === 'postgresql' || type === 'pg') {
    // execute()/executeList()/transaction() 에 postgres 분기가 없어 모든 쿼리가 실패한다.
    //   조용히 실패하는 대신 기동 단계에서 분명하게 알린다. (지원 DB: mariadb | mysql | sqlite | oracle)
    throw new Error(`[DB] DB_TYPE='${type}' 는 아직 지원되지 않습니다. DB_TYPE=mariadb (권장) 또는 sqlite 를 사용하세요.`);
  } else if (type === '__postgres_disabled__') {
    const fallback = config.db.fallbackToSqlite !== false;
    try {
      const pgMod = await import('pg');
      const { Pool } = pgMod.default ?? pgMod;
      pool = new Pool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        max: config.db.connectionLimit ?? 10,
        connectionTimeoutMillis: config.db.acquireTimeout ?? 10_000,
      });
      adapter = 'postgres';
      logger.info(`[DB] postgres pool ready ${config.db.host}:${config.db.port}/${config.db.database}`);
      try {
        const client = await pool.connect();
        try { await client.query('SELECT 1'); logger.info('[DB] postgres connection OK'); }
        finally { client.release(); }
      } catch (e) {
        if (fallback) {
          logger.warn(`[DB] postgres connection failed: ${e.message} → falling back to sqlite`);
          try { await pool.end(); } catch {}
          pool = null;
          const file = resolveSqliteFile();
          pool = await openSqliteDb({ file, logger });
          adapter = 'sqlite';
        } else {
          logger.error(`[DB] postgres connection failed: ${e.message}`);
        }
      }
    } catch (e) {
      logger.error(`[DB] could not load the pg module: ${e.message}`);
      if (fallback) {
        logger.warn('[DB] falling back to sqlite');
        const file = resolveSqliteFile();
        pool = await openSqliteDb({ file, logger });
        adapter = 'sqlite';
      }
    }
  } else {
    // 알 수 없는 type → sqlite
    logger.warn(`[DB] unknown DB_TYPE='${type}' — defaulting to sqlite.`);
    const file = resolveSqliteFile();
    pool = await openSqliteDb({ file, logger });
    adapter = 'sqlite';
  }
}

/**
 * 실제 쿼리 실행.
 *
 * @param {string} sql    `:name` 형식의 SQL 문자열.
 * @param {object} params `{name: value}` 바인딩 객체.
 * @returns {Promise<{rows:any[], rowsAffected:number, insertId?:any, meta?:any}>}
 */
/** 레지스트리 역인덱스로 `파일:쿼리` 이름을 찾는다 (없으면 null → 미리보기로 대체) */
function sqlNameOf(sql) {
  try { return sqlRegistry.nameOf(sql); } catch { return null; }
}

/**
 * ★ v1.10.31 — SQL 이 요구하는데 안 넘어온 자리표시자를 null 로 채운다.
 *
 *  이게 없으면 이렇게 죽습니다.
 *
 *      SQL   UPDATE snack SET name=:name, price=:price, memo=:memo WHERE id=:id
 *      호출  db.execute(sql, { id, name })
 *      →     Placeholder 'price' is not defined
 *
 *  v1.10.29 에서 **생성기**를 고쳤지만, 그건 "앞으로 새로 만들 파일" 에만
 *  적용됩니다. **이미 만들어 둔 컨트롤러·서비스는 그대로 죽었습니다.**
 *  기존 파일을 손대지 않고도 동작해야 정상이므로, 여기서 막습니다.
 *
 *  ⚠ 왜 null 인가: 빠진 값을 "안 바꾼다" 로 해석해 원래 값을 유지하는 편이
 *    더 친절해 보이지만, 그러려면 SQL 을 다시 써야 합니다(COALESCE 등).
 *    실행 시점에 SQL 을 고쳐 쓰는 것은 예측할 수 없는 결과를 낳습니다.
 *    **명시적으로 보낸 값만 반영되고 나머지는 비워진다** 는 규칙이 단순합니다.
 *
 *  ⚠ 문자열 리터럴 안의 `:` 는 자리표시자가 아닙니다 ('12:30' 같은 시각).
 *    따옴표 안을 지운 뒤에 찾습니다.
 */
function fillMissingPlaceholders(sql, params) {
  if (typeof sql !== 'string') return params;
  const stripped = sql
    .replace(/'(?:[^']|'')*'/g, "''")     // 홑따옴표 문자열
    .replace(/"(?:[^"]|"")*"/g, '""')     // 쌍따옴표 문자열
    .replace(/--[^\n]*/g, '')            // 줄 주석
    .replace(/\/\*[\s\S]*?\*\//g, '');     // 블록 주석
  const needed = new Set((stripped.match(/(?<![:\w]):(\w+)/g) || []).map((v) => v.slice(1)));
  if (!needed.size) return params;
  const out = { ...(params || {}) };
  const filled = [];
  for (const k of needed) {
    if (!(k in out)) { out[k] = null; filled.push(k); }
  }
  if (filled.length) {
    logger.warn(
      `[DB] SQL 이 요구하는 값이 안 넘어와 null 로 채웠습니다: ${filled.join(', ')}`
      + ' — 호출부에서 이 값들을 함께 보내는지 확인하세요.',
      { kind: 'sql' },
    );
  }
  return out;
}

/* ★ v1.11.5 — 실행 훅. 컬럼 암호화 인터셉터가 여기에 걸린다.
   예전에는 인터셉터가 default export 객체의 `execute` 속성만 바꿔치기했다. 그래서
     · `import { execute } from db.js` 로 가져온 쪽(SQL 테스트 실행 등)은 **평문 그대로** 저장·조회했고
     · executeList(페이지네이션)와 transaction 안의 tx.execute 는 인터셉터를 아예 거치지 않았다
   — 암호화 표의 페이지 목록이 암호문으로 나오고, 시험 실행 INSERT 가 평문을 남겼다(실행 검증에서 확인).
   훅은 모든 경로의 **안쪽**에서 돈다: 누가 어떻게 가져와도 같다. */
let _executeHook = null;   // async (sql, params, next) => result   (next = 훅 없는 실행)
export function setExecuteHook(fn) { _executeHook = typeof fn === 'function' ? fn : null; }
export function getExecuteHook() { return _executeHook; }
/** 훅을 거치지 않는 실행 — 마이그레이터(이미 암호화된 값을 그대로 넣을 때)용 */
export async function rawExecute(sql, params = {}) { return executeCore(sql, params); }

export async function execute(sql, params = {}) {
  if (_executeHook) return _executeHook(sql, params, executeCore);
  return executeCore(sql, params);
}

async function executeCore(sql, params = {}) {
  const preview = sql.replace(/\s+/g, ' ').trim().slice(0, 200);
  /* ★ v1.10.26 — 프레임워크 배관(request_steps 등)은 kind=internal 로 내린다.
     끄지 않고 나누는 이유: 추적 기능 자체가 이상할 때는 이 로그를 봐야 한다.
     LOG_INTERNAL=true 로 언제든 켤 수 있다. */
  const framework = isAdminSql(sql);
  const sqlKind = framework ? 'internal' : 'sql';
  /* ★ v1.16.4 — 살아있음 확인용 'SELECT 1' 은 로그에서 뺀다.
     로그인 화면을 새로 고칠 때마다 헬스 확인이 돌아 DEBUG 한 줄이 쌓였는데,
     이 쿼리는 결과가 늘 같아 진단에 아무 도움이 되지 않는다(오히려 볼 줄을 밀어낸다). */
  const isLivenessPing = /^\s*SELECT\s+1\s+AS\s+ok\s*$/i.test(String(sql).trim());
  const suppressLog = isLivenessPing || (framework && !config.log.admin && !config.log.internal);
  /* ★ v1.9.4 — SQL 을 **원본 로그에서 빼지 않는다.**
     예전에는 `sqlLogger || logger` 로 갈라져, LOG_SQL=true 를 켜면 SQL 이
     전용 파일로 **옮겨갔다**. 그러면 장애를 볼 때 원본만 봐서는
     "그 시각에 어떤 쿼리가 돌았나" 를 알 수 없다 — 파일 두 개를 손으로
     시간 정렬하게 된다. 가장 필요한 순간에 가장 불편해지는 구조였다.
     이제 원본에 항상 남기고, 전용 파일에는 **추가로** 쓴다. */
  /* ★ v1.10.34 — SQL 한 번에 **한 줄**.
     예전에는 실행 전 2줄(execute / SQL 전문) + 실행 후 3줄(result type /
     rows cleaned / 첫 행 keys) = **다섯 줄**이 남았다. 그중
       · `SQL 전문` 은 바로 윗줄과 같은 SQL 을 한 번 더 찍었고
       · `result type` · `rows cleaned` · `첫 행 keys` 는 드라이버가 뭘
         돌려줬는지에 대한 **프레임워크 내부 사정**이다.
     개발자가 실제로 묻는 것은 셋뿐이다 —
       **무슨 쿼리가 · 몇 건 · 얼마나 걸렸나.**
     그래서 결과가 나온 뒤 한 줄로 합친다(PostgreSQL 느린 쿼리 로그와 같은 모양).
     ⚠ 실행 **전**에 안 찍으므로, 쿼리가 멈춰 죽으면 그 줄이 없다.
       그래서 실패했을 때는 아래 __recordMetric 이 반드시 남긴다. */

  // ★ v1.10.31 — 빠진 자리표시자를 채워 `not defined` 로 죽지 않게 한다
  params = fillMissingPlaceholders(sql, params);

  const __metricStart = process.hrtime.bigint();
  /** v1.8.0: 지표 기록과 함께 요청 추적 단계도 남긴다.
      이미 실행시간을 재고 있으므로 추가 비용이 사실상 없다.
      쿼리 이름(`book:findAll`)은 sqlLoader 가 붙여 둔 주석에서 뽑는다 — 익명 SQL 문자열보다
      사람이 읽기 훨씬 낫고, 나중에 '느린 SQL' 집계도 이름 단위로 된다. */
  const __recordMetric = (ok, rows, err) => {
    let ms = 0;
    try {
      ms = Number(process.hrtime.bigint() - __metricStart) / 1_000_000;
      metrics.recordDb(ms, ok);
    } catch { /* noop */ }
    /* ★ v1.10.35 — **자기 자신을 기록하지 않는다.**
       요청 추적이 단계를 DB 에 적으면(`admin_trace:insertStep`) 그 INSERT 가
       다시 단계로 기록되고, 그 기록이 또 INSERT 를 부른다. 실제로 로그인 한
       번에 단계가 **191개**까지 불어났다.
       `framework` 는 이미 위에서 판정해 둔 값이다(admin_* · request_* 테이블). */
    try {
      if (framework) return;   // 프레임워크 배관 SQL 은 단계로 남기지 않는다
      addStep('sql', sqlNameOf(sql) || preview.slice(0, 80), {
        ms: Math.round(ms), ok, rows: rows ?? null,
        detail: err ? String(err.message).slice(0, 200) : null,
      });
    } catch { /* 추적 실패가 쿼리를 깨뜨리면 안 된다 */ }

    /* ★ v1.10.34 — 여기서 한 줄로 남긴다. 모든 어댑터가 이 지점을 거치고,
       실행시간과 행수를 이미 알고 있으므로 추가 비용이 없다. */
    if (!suppressLog) {
      const head = `[DB:${adapter}] ${preview}`;
      const parts = [head];
      const ps = safeStringify(params);
      if (ps && ps !== '{}') parts.push(`params=${ps}`);
      parts.push(rows == null ? '—' : `${rows}건`);
      parts.push(`${ms.toFixed(1)}ms`);
      if (!ok) parts.push(`✖ ${err ? String(err.message).slice(0, 120) : '실패'}`);
      const line = parts.join(' | ');
      logger[ok ? 'debug' : 'warn'](line, { kind: sqlKind });
      if (sqlLogger) sqlLogger[ok ? 'debug' : 'warn'](line);
    }
  };

  try {
    if (adapter === 'sqlite') {
      const result = sqliteExecute(pool, sql, params);
      __recordMetric(true, result?.rows?.length ?? null);
      return result;
    }

    if (adapter === 'mariadb') {
      const conn = await pool.getConnection();
      try {
        const hasParams = params && Object.keys(params).length > 0;
        const res = hasParams ? await conn.query(sql, params) : await conn.query(sql);

        if (!suppressLog) {
        }

        if (Array.isArray(res)) {
          const rows = [];
          for (let i = 0; i < res.length; i++) {
            const row = res[i];
            if (row && typeof row === 'object' && !Array.isArray(row)) {
              const clean = {};
              for (const [k, v] of Object.entries(row)) {
                if (typeof v === 'bigint') clean[k] = Number(v);
                else clean[k] = v;
              }
              rows.push(clean);
            }
          }
          // ★ v1.10.34 — 행수를 넘겨야 로그에 `3건` 이 찍힌다
          __recordMetric(true, rows.length);
          return { rows, rowsAffected: rows.length };
        }
        __recordMetric(true, res.affectedRows ?? 0);
        return {
          rows: [],
          rowsAffected: res.affectedRows ?? 0,
          insertId: typeof res.insertId === 'bigint' ? Number(res.insertId) : res.insertId,
          meta: res,
        };
      } finally {
        conn.release();
      }
    }

    if (adapter === 'oracle') {
      const conn = await pool.getConnection();
      try {
        const hasParams = params && Object.keys(params).length > 0;
        const res = await conn.execute(sql, hasParams ? params : {}, { autoCommit: true });
        __recordMetric(true, (res.rows ?? []).length);
        return {
          rows: res.rows ?? [],
          rowsAffected: res.rowsAffected ?? 0,
          meta: res,
        };
      } finally {
        await conn.close();
      }
    }

    throw new Error(`알 수 없는 DB adapter: ${adapter}`);
  } catch (err) {
    __recordMetric(false);
    throw err;
  }
}

/** execute alias */
export const query = execute;

/**
 * 페이지네이션 SELECT.
 * SQLite / MariaDB 모두 LIMIT/OFFSET 문법 동일. Oracle 만 OFFSET/FETCH.
 */
export async function executeList(sql, params = {}, pageOpts = {}) {
  const res = await executeListCore(sql, params, pageOpts);
  // ★ v1.11.5 — 페이지 목록의 행도 훅(암호화 인터셉터)을 거친다. 훅에는 원본 SELECT 를 보이고, 실행은 이미 끝났으니 결과만 넘긴다.
  if (_executeHook && res && Array.isArray(res.rows) && res.rows.length) {
    const hooked = await _executeHook(sql, params, async () => res);
    return hooked && Array.isArray(hooked.rows) ? { ...res, rows: hooked.rows } : res;
  }
  return res;
}

async function executeListCore(sql, params = {}, pageOpts = {}) {
  const page     = normPositiveInt(pageOpts.page, 1);
  const perPage  = Math.min(
    normPositiveInt(pageOpts.perPage, 20),
    normPositiveInt(pageOpts.maxPerPage, 500),
  );
  const offset   = (page - 1) * perPage;

  const base = sql.trim().replace(/;+\s*$/, '');

  if ('__limit' in params || '__offset' in params) {
    throw new Error('executeList: 바인딩 키 "__limit", "__offset" 은 예약되어 사용할 수 없습니다.');
  }
  /* ★ v1.10.32 — executeList 도 자리표시자를 보정한다.
     v1.10.31 에서 execute() 에만 넣었는데, executeList 는 execute 를 거치지
     않고 드라이버를 직접 부른다. 그래서 **페이지네이션 경로에만** 같은 버그가
     남아 있었다:
       SELECT ... WHERE name LIKE :kw ...  +  executeList(sql, {}, {...})
       → Placeholder 'kw' is not defined
     한 곳만 고치고 "고쳤다" 고 하면 이런 구멍이 남는다. */
  params = fillMissingPlaceholders(base, params);
  const pagedParams = { ...params, __limit: perPage, __offset: offset };

  if (adapter === 'sqlite') {
    const pagedSql = `${base} LIMIT :__limit OFFSET :__offset`;
    const countSql = `SELECT COUNT(*) AS total FROM (${base}) _cnt_`;
    // SQLite 는 동기라 Promise.all 의 병렬 의미가 없음. 순차 실행.
    const countRes = sqliteExecute(pool, countSql, params);
    const rowsRes = sqliteExecute(pool, pagedSql, pagedParams);
    const total = Number(countRes.rows?.[0]?.total ?? 0);
    return {
      rows: rowsRes.rows,
      header: { total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    };
  }

  if (adapter === 'mariadb') {
    const pagedSql = `${base} LIMIT :__limit OFFSET :__offset`;
    const countSql = `SELECT COUNT(*) AS total FROM (${base}) _cnt_`;
    const conn = await pool.getConnection();
    try {
      const [countRes, rowsRes] = await Promise.all([
        conn.query(countSql, params),
        conn.query(pagedSql, pagedParams),
      ]);
      const total = Number(countRes?.[0]?.total ?? 0);
      const rows = Array.isArray(rowsRes) ? rowsRes : [];
      return {
        rows,
        header: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
      };
    } finally {
      conn.release();
    }
  }

  if (adapter === 'oracle') {
    const pagedSql = `${base} OFFSET :__offset ROWS FETCH NEXT :__limit ROWS ONLY`;
    const countSql = `SELECT COUNT(*) AS total FROM (${base}) _cnt_`;
    const conn = await pool.getConnection();
    try {
      const [countRes, rowsRes] = await Promise.all([
        conn.execute(countSql, params),
        conn.execute(pagedSql, pagedParams),
      ]);
      const total = Number(
        countRes.rows?.[0]?.TOTAL ?? countRes.rows?.[0]?.total ?? 0,
      );
      const rows = rowsRes.rows ?? [];
      return {
        rows,
        header: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
      };
    } finally {
      await conn.close();
    }
  }

  throw new Error(`알 수 없는 DB adapter: ${adapter}`);
}

function normPositiveInt(v, def) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.floor(n);
}

/** 트랜잭션 */
export async function transaction(fn) {
  if (adapter === 'sqlite') {
    enterTransaction();
    try { return await sqliteTransaction(pool, fn); } finally { exitTransaction(); }
  }
  if (adapter === 'mariadb') {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const txRaw = async (sql, params = {}) => {
        const res = await conn.query(sql, params);
        if (Array.isArray(res)) return { rows: res, rowsAffected: res.length };
        return { rows: [], rowsAffected: res.affectedRows ?? 0, insertId: res.insertId };
      };
      const tx = {
        // ★ v1.11.5 — 트랜잭션 안에서도 훅(암호화)을 거친다. 예전에는 tx.execute 가 드라이버를 직접 불러 평문이 저장됐다.
        async execute(sql, params = {}) { return _executeHook ? _executeHook(sql, params, txRaw) : txRaw(sql, params); },
        query: async (...a) => tx.execute(...a),
      };
      enterTransaction();
      let result;
      try { result = await fn(tx); } finally { exitTransaction(); }
      await conn.commit();
      return result;
    } catch (e) {
      try { await conn.rollback(); } catch { /* ignore */ }
      throw e;
    } finally {
      conn.release();
    }
  }
  if (adapter === 'oracle') {
    const conn = await pool.getConnection();
    try {
      const tx = {
        async execute(sql, params = {}) {
          const res = await conn.execute(sql, params);
          return { rows: res.rows ?? [], rowsAffected: res.rowsAffected ?? 0, meta: res };
        },
        query: async (...a) => tx.execute(...a),
      };
      enterTransaction();
      let result;
      try { result = await fn(tx); } finally { exitTransaction(); }
      await conn.commit();
      return result;
    } catch (e) {
      try { await conn.rollback(); } catch { /* ignore */ }
      throw e;
    } finally {
      await conn.close();
    }
  }
  throw new Error(`알 수 없는 DB adapter: ${adapter}`);
}

export async function closeDb() {
  if (!pool) return;
  try {
    if (adapter === 'sqlite') sqliteClose(pool);
    else if (adapter === 'mariadb') await pool.end();
    else if (adapter === 'oracle') await pool.close(10);
    else if (adapter === 'postgres') await pool.end();
    logger.info(`[DB:${adapter}] stop`);
  } catch (e) {
    logger.error(`[DB] stop failed: ${e.message}`);
  } finally {
    pool = null;
  }
}

export function currentAdapter() {
  return adapter;
}

/** 마이그레이션 러너 전용: raw sqlite handle 노출 (TRIGGER 포함 파일 한 번에 exec 용) */
export function __sqliteHandle() {
  return adapter === 'sqlite' ? pool : null;
}

const SENSITIVE_PARAM_RE = /(password|passwd|pwd|secret|token|hash|ssn|card|cvv|authorization|api_?key|master)/i;

/** SQL 로그용 직렬화 — 비밀번호/토큰/해시/주민번호류 파라미터는 값 대신 '***' 로 기록 */
function safeStringify(obj) {
  try {
    return JSON.stringify(obj, (k, v) => {
      if (k && SENSITIVE_PARAM_RE.test(k)) return v == null ? v : '***';
      if (typeof v === 'bigint') return v.toString();
      if (typeof v === 'string' && v.length > 300) return v.slice(0, 300) + `…(+${v.length - 300})`;
      return v;
    });
  } catch {
    return '[unserializable]';
  }
}

export default { initDb, execute, executeList, query, transaction, closeDb, currentAdapter, __sqliteHandle, getDbStatus, isDbUnavailable, dbFixHint, setExecuteHook, getExecuteHook, rawExecute };

/** .env 에 예제 파일의 자리표시자가 그대로 남아 있는지 */
const PLACEHOLDER_VALUES = ['여기에_DB_비밀번호', 'CHANGE_ME', 'your_password', 'password_here'];

/**
 * DB 접속에 실패했을 때, 콘솔에 "무엇을 고치면 되는지" 를 한 화면에 보여 준다.
 *   로그가 수백 줄 흘러가는 상황에서 원인을 놓치지 않도록 눈에 띄게 출력한다.
 */
/** 원인 한 줄 — 부팅 요약·health API 에서 같은 문장을 쓴다 */
export function dbFixHint(err) {
  const c = config.db || {};
  const pw = String(c.password ?? '');
  const msg = `${err?.code || ''} ${err?.message || ''}`;
  if (PLACEHOLDER_VALUES.some((v) => pw.includes(v))) {
    return `.env 의 DB_PASSWORD 가 예제값(${pw.slice(0, 6)}…) 그대로입니다 — 실제 비밀번호로 바꾸세요`;
  }
  if (!pw) return '.env 의 DB_PASSWORD 가 비어 있습니다';
  if (/ECONNREFUSED/i.test(msg)) return `${c.host}:${c.port} 에서 DB 가 실행 중인지 확인하세요`;
  if (/Access denied|1045/i.test(msg)) return `계정 '${c.user}' 의 비밀번호·권한을 확인하세요`;
  if (/Unknown database|1049/i.test(msg)) return `데이터베이스 '${c.database}' 를 먼저 만들어야 합니다`;
  return `접속 정보를 확인하세요 (${c.user}@${c.host}:${c.port}/${c.database})`;
}

function printDbHelp(err) {
  const c = config.db || {};
  const pw = String(c.password ?? '');
  const isPlaceholder = PLACEHOLDER_VALUES.some((v) => pw.includes(v));
  const code = err?.code || err?.errno || '';

  const causes = [];
  if (isPlaceholder) {
    causes.push('.env 의 DB_PASSWORD 가 예제값 그대로입니다  →  실제 비밀번호로 바꾸세요 (가장 흔한 원인)');
  }
  if (!pw) causes.push('.env 의 DB_PASSWORD 가 비어 있습니다');
  if (/ECONNREFUSED/i.test(String(code) + err?.message)) {
    causes.push(`${c.host}:${c.port} 에서 MariaDB 가 실행 중인지 확인하세요 (Windows: 서비스 → MariaDB → 시작)`);
  }
  if (/Access denied|1045/i.test(String(code) + err?.message)) {
    causes.push(`사용자 '${c.user}' 의 비밀번호가 맞는지, 그 계정에 '${c.database}' 권한이 있는지 확인하세요`);
  }
  if (/Unknown database|1049/i.test(String(code) + err?.message)) {
    causes.push(`데이터베이스 '${c.database}' 가 없습니다  →  CREATE DATABASE ${c.database}; 를 먼저 실행하세요`);
  }
  if (causes.length === 0) {
    causes.push(`접속 정보를 확인하세요: ${c.user}@${c.host}:${c.port}/${c.database}`);
  }

  const lines = [
    '',
    '╔══════════════════════════════════════════════════════════════════════════════╗',
    '║  DB 에 접속하지 못했습니다 — 로그인·마이그레이션이 동작하지 않습니다            ║',
    '╚══════════════════════════════════════════════════════════════════════════════╝',
    ...causes.map((t, i) => `  ${i + 1}) ${t}`),
    '',
    '  고친 뒤 서버를 다시 시작하세요.  DB 없이 바로 써 보려면 .env 에서  DB_TYPE=sqlite  로 바꾸면 됩니다.',
    '  안내 문서: docs/GUIDE_01_MARIADB_AND_ENV.md (9번 문제 해결 표)',
    '',
  ];
  process.stderr.write(lines.join('\n') + '\n');
}
