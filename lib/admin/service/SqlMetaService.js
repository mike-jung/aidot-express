/**
 * SqlMetaService — 일반 SQL 폴더(src/database/sql/*.sql)의 모든 파일을 관리.
 *
 *  진실의 원천:
 *   - 디스크: src/database/sql/*.sql
 *   - 메모리: sqlRegistry.listFiles()
 *
 *  목록 / 조회 / 추가 / 수정 / 삭제
 *   + 테이블 정보로 5개 기본 쿼리 자동 생성
 *   + 파일 저장 후 SqlRegistry 동적 등록
 */
import fs from 'node:fs';
import { qualifyAppTable, appSchemaName } from '../../../src/database/tablePrefix.js';   // ★ v1.12.2
import path from 'node:path';
import { markLoaded } from './WorkspaceLoadService.js';
import { writeDirFor, existingDirs, isWorkspaceFile, findExistingFile, displayPath } from '../../../src/core/appPaths.js';
import { fileURLToPath } from 'node:url';

import { Service, Log } from '../../../src/core/decorators.js';
import { assertSafeId } from '../../../src/core/security.js';

import sqlRegistry from '../../../src/core/sqlLoader.js';
import { execute as dbExecute, currentAdapter } from '../../../src/database/db.js';
import {
  generateSqlFromTable,
  extractQueryNames,
  extractQueriesWithParams,
} from './codeGenerator.js';
import { safeWriteFile, safeUnlink } from './safeFs.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..', '..');

@Service('SqlMetaService')
export default class SqlMetaService {

  @Log log;

  /** 테이블+컬럼 정보로 SQL 코드 생성만 (저장 X)
   *
   *   input: { fileName, tableName, description, columns? }
   *
   *    columns 가 비어있고 tableName 이 주어지면, DB 메타정보를 자동 조회하여
   *    실제 컬럼명을 사용해 SELECT/INSERT/UPDATE 를 채운다.
   *    DB 조회 실패(테이블 없음 등)일 경우 columns 빈 상태로 generator 호출 →
   *    기존 fallback(SELECT * + 주석처리된 INSERT/UPDATE) 동작.
   */
  async generate(input) {
    /* ★ v1.12.2 — 업무 테이블 스키마(DB_APP_SCHEMA)가 정해져 있으면 `스키마.테이블` 로 만든다.
       그래야 시스템 표(admin_*)가 있는 접속 스키마와 섞이지 않는다. 이미 스키마를 적었으면 그대로 둔다. */
    if (input?.tableName) input = { ...input, tableName: qualifyAppTable(input.tableName) };
    let columns = Array.isArray(input.columns) ? input.columns : [];

    // 클라이언트가 컬럼을 명시적으로 넘기지 않았으면 DB 조회 시도
    if (columns.length === 0 && input.tableName) {
      try {
        const meta = await this.getTableColumns(input.tableName);
        // getTableColumns 는 에러를 예외로 던지지 않고 { error } 로 반환함
        if (!meta?.error && Array.isArray(meta?.columns) && meta.columns.length > 0) {
          columns = meta.columns.map((c) => {
            const extra = String(c.extra || '');
            const dflt = c.default == null ? '' : String(c.default);
            /* ★ v1.11.2 — DB 가 스스로 채우는 컬럼은 INSERT/UPDATE 에서 뺀다.
                 · auto_increment / GENERATED / IDENTITY
                 · 기본값이 함수인 것 — CURRENT_TIMESTAMP, now(), uuid() … (created_at / updated_at 이 여기에 든다)
                 · ON UPDATE CURRENT_TIMESTAMP (updated_at)
               예전에는 created_at 까지 `:created_at` 로 넣어서, 튜토리얼처럼 name·price·memo 만 보내면
               "Column 'created_at' cannot be null" 로 INSERT 가 실패했다. DB 기본값에 맡기는 것이 맞다. */
            const isAuto = /auto_increment|GENERATED|IDENTITY/i.test(extra);
            const dbFilled = /^(current_timestamp|now|curdate|curtime|utc_timestamp|uuid|sysdate)\s*(\(\s*\d*\s*\))?$/i.test(dflt.trim());
            const onUpdateAuto = /on update/i.test(extra);
            const timestampish = /^(created_at|updated_at|create_dt|update_dt|reg_dt|mod_dt|inserted_at|modified_at)$/i.test(String(c.name || ''));
            return {
              name: c.name,
              pk: (c.key || '').toUpperCase() === 'PRI',
              insertable: !(isAuto || dbFilled || onUpdateAuto),
              updatable: !(isAuto || dbFilled || onUpdateAuto || timestampish),
            };
          });
          this.log.info(
            `[meta:sql] generate: ${input.tableName} 컬럼 ${columns.length}개 자동 조회 완료`,
          );
        } else {
          this.log.info(
            `[meta:sql] generate: ${input.tableName} 컬럼 조회 실패(${meta?.error || '컬럼 없음'}) → SELECT * fallback`,
          );
        }
      } catch (e) {
        this.log.warn(`[meta:sql] generate: exception while auto-detecting columns — ${e.message}. SELECT * fallback`);
      }
    }

    return generateSqlFromTable({ ...input, columns });
  }

  async listPaged(opts) {
    const page = Math.max(1, Number(opts.page) || 1);
    const perPage = Math.max(1, Math.min(100, Number(opts.perPage) || 10));

    /* ★ v1.11.7 — origin=workspace 면 작업 폴더의 내 파일만 (콘솔 목록의 [내 것만] 스위치).
       예제(src/)가 섞여 있으면 내가 만든 것을 찾기 어렵다. 숨긴 예제 수는 header.hiddenBuiltin 으로 돌려준다. */
    const scanned = this._scanAll();
    const onlyWs = opts.origin === 'workspace';
    const byOrigin = onlyWs ? scanned.filter((r) => r.origin === 'workspace') : scanned;
    const hiddenBuiltin = onlyWs ? scanned.length - byOrigin.length : 0;
    /* ★ v1.12.1 — 이름으로 조회. 예전에는 화면이 **지금 보이는 페이지 안에서만** 걸렀다.
       10개씩 보는데 3페이지에 있는 이름을 치면 "없음" 으로 보였다. 서버에서 전체를 대상으로 찾는다. */
    const needle = String(opts.q ?? '').trim().toLowerCase();
    const all = needle
      ? byOrigin.filter((r) => `${r.name ?? ''} ${r.basePath ?? r.base_path ?? ''}`.toLowerCase().includes(needle))
      : byOrigin;
    const total = all.length;
    const start = (page - 1) * perPage;
    const rows = all.slice(start, start + perPage);

    return {
      rows,
      header: {
        q: needle || null,
        hiddenBuiltin,
        total, page, perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  }

  /** 셀렉트박스용 — 모든 SQL 파일명 (Service 화면에서 사용) */
  async listAll() {
    return this._scanAll().map((s) => ({
      id: s.id, name: s.name, table_name: s.table_name || null, description: s.description || '',
      queries: s.queries || [],
      queriesWithParams: s.queriesWithParams || [],
      query_count: s.query_count || 0,
    }));
  }

  /** id = 파일명 (확장자 제외, 예: 'product') */
  async findById(id) {
    // ★ v1.11.1 — 있는 곳에서 찾는다 (작업 폴더 → src/database/sql)
    const filePath = this._existingSqlFilePath(id);
    if (!filePath) return null;
    return this._buildInfo(id, filePath, /* withSource */ true);
  }

  async create(input) {
    this._validateName(input.name);
    if (!input.content || typeof input.content !== 'string' || input.content.trim().length === 0) {
      throw Object.assign(new Error('content 가 비어있습니다'), { status: 400 });
    }

    const filePath = this._sqlFilePath(input.name);
    if (fs.existsSync(filePath) || this._existingSqlFilePath(input.name)) {
      throw Object.assign(
        new Error(`이미 존재하는 SQL 파일: ${input.name}.sql`),
        { status: 409 },
      );
    }

    // description 을 content 첫 줄 주석으로 반영
    let finalContent = input.content;
    if (input.description != null) {
      finalContent = this._embedDescription(finalContent, input.description);
    }

    this._ensureParentDir(filePath);
    await safeWriteFile(filePath, finalContent);

    try {
      const r = sqlRegistry.registerFile(input.name, finalContent);
      markLoaded('sql', filePath);
      /* ★ v1.38.1 — 등록했으면 "올라옴" 으로 표시한다.
         예전에는 등록만 하고 표시를 안 해서, 목록에 "안 올라옴" 으로 보이고
         사용자가 한 번 더 눌러야 했다. 실제로는 이미 쓸 수 있는 상태였다. */
      markLoaded('sql', filePath);
      this.log.info(`[meta:sql] registered: ${r.fileName} (${r.count} statements)`);
    } catch (e) {
      this.log.error(`[meta:sql] could not register: ${e.message}`);
    }

    return { id: input.name, filePath, queries: extractQueryNames(finalContent) };
  }

  async update(id, input) {
    const existing = await this.findById(id);
    if (!existing) throw Object.assign(new Error('not found'), { status: 404 });
    this._validateName(input.name);
    if (!input.content) throw Object.assign(new Error('content 가 비어있습니다'), { status: 400 });

    // description 을 content 첫 줄 주석으로 반영
    let finalContent = input.content;
    if (input.description != null) {
      finalContent = this._embedDescription(finalContent, input.description);
    }

    // ★ v1.11.1 — 제자리 수정. 이름이 바뀌면 같은 폴더 안에서 옛 파일/registry 정리
    const oldPath = this._existingSqlFilePath(existing.name) || this._sqlFilePath(existing.name);
    const filePath = existing.name === input.name ? oldPath : path.join(path.dirname(oldPath), `${input.name}.sql`);
    if (existing.name !== input.name) {
      if (fs.existsSync(filePath) || this._existingSqlFilePath(input.name)) {
        throw Object.assign(
          new Error(`이미 존재하는 SQL 파일: ${input.name}.sql`),
          { status: 409 },
        );
      }
      await safeUnlink(oldPath);
      sqlRegistry.unregisterFile(existing.name);
    }

    this._ensureParentDir(filePath);
    await safeWriteFile(filePath, finalContent);

    try {
      const r = sqlRegistry.registerFile(input.name, finalContent);
      markLoaded('sql', filePath);
      this.log.info(`[meta:sql] refreshed: ${r.fileName} (${r.count} statements)`);
    } catch (e) {
      this.log.error(`[meta:sql] could not refresh: ${e.message}`);
    }

    return { id: input.name, filePath, queries: extractQueryNames(finalContent) };
  }

  async remove(id) {
    const existing = await this.findById(id);
    if (!existing) throw Object.assign(new Error('not found'), { status: 404 });

    sqlRegistry.unregisterFile(existing.name);
    const filePath = this._existingSqlFilePath(existing.name) || this._sqlFilePath(existing.name);
    await safeUnlink(filePath);

    return { id: existing.name };
  }

  /**
   * SQL 쿼리 테스트 실행.
   *
   *  두 가지 경로를 지원:
   *   (1) sqlBody 가 주어지면: 편집 중인 SQL 본문을 그대로 바인딩/실행 (저장 전 테스트)
   *   (2) sqlBody 가 없으면 : sqlRegistry 에서 sqlFile:queryName 으로 조회 (기존 동작)
   *
   *  위험한 쿼리(DROP/TRUNCATE/ALTER 등 DDL)도 실행 가능하지만,
   *  어드민 콘솔 권한자에 한정된 기능이므로 별도 차단은 하지 않음.
   */
  async testQuery(sqlFile, queryName, params = {}, sqlBody = null) {
    const startTime = Date.now();
    try {
      // SQL 획득: sqlBody 우선, 없으면 레지스트리 조회
      let sql;
      if (sqlBody && typeof sqlBody === 'string' && sqlBody.trim()) {
        sql = sqlBody.trim();
        // 끝에 ';' 가 있으면 better-sqlite3 등에서 multi-statement 오류 방지 위해 제거
        if (sql.endsWith(';')) sql = sql.slice(0, -1).trimEnd();
        this.log.info(`[sql-test] running inline (sqlBody): ${sqlFile || '(new)'}:${queryName || '(adhoc)'}`);
      } else {
        const key = `${sqlFile}:${queryName}`;
        try {
          sql = sqlRegistry.get(key);
        } catch {
          throw Object.assign(new Error(`SQL을 찾을 수 없습니다: ${key}`), { status: 404 });
        }
        this.log.info(`[sql-test] running from the registry: ${key}`);
      }

      this.log.info(`[sql-test] SQL: ${sql.replace(/\s+/g, ' ').trim().slice(0, 200)}`);

      // 문자열 리터럴('...' / "...")을 제거한 뒤 :param 추출
      const sanitized = sql.replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
      const usedParams = {};
      const paramRe = /(?<!:):([a-zA-Z_][\w]*)\b/g;
      let m;
      while ((m = paramRe.exec(sanitized)) !== null) {
        const name = m[1];
        if (params[name] !== undefined && params[name] !== '') {
          const v = params[name];
          usedParams[name] = /^-?\d+$/.test(String(v)) ? Number(v) : v;
        } else {
          usedParams[name] = null;
        }
      }

      this.log.info(`[sql-test] detected parameters: ${JSON.stringify(usedParams)}`);

      // DB 실행
      const hasParams = Object.keys(usedParams).length > 0;
      const result = await dbExecute(sql, hasParams ? usedParams : {});
      const elapsed = Date.now() - startTime;

      this.log.info(`[sql-test] done: ${elapsed}ms, rows=${Array.isArray(result.rows) ? result.rows.length : 'N/A'}, rowsAffected=${result.rowsAffected ?? 'N/A'}`);

      // 결과 정제 (BigInt, Buffer, meta 속성 등)
      let rows = result.rows || [];
      if (Array.isArray(rows)) {
        rows = rows.filter(row => row && typeof row === 'object' && !Array.isArray(row)).map((row) => {
          const clean = {};
          for (const [k, v] of Object.entries(row)) {
            if (typeof v === 'bigint') clean[k] = Number(v);
            else if (Buffer.isBuffer(v)) clean[k] = v.toString('hex');
            else if (v instanceof Date) clean[k] = v.toISOString();
            else clean[k] = v;
          }
          return clean;
        });
      }

      this.log.info(`[sql-test] rows after cleanup: ${rows.length}`);

      return {
        success: true,
        sqlFile,
        queryName,
        boundSql: sql,
        detectedParams: Object.keys(usedParams),
        params: usedParams,
        rows: rows.slice(0, 100),
        rowCount: rows.length,
        rowsAffected: result.rowsAffected ?? 0,
        insertId: result.insertId,
        elapsed,
        mode: (sqlBody && typeof sqlBody === 'string' && sqlBody.trim()) ? 'adhoc' : 'registry',
      };
    } catch (e) {
      const elapsed = Date.now() - startTime;
      this.log.error(`[sql-test] error: ${e.message}`);
      return {
        success: false,
        sqlFile,
        queryName,
        error: e.message,
        elapsed,
      };
    }
  }

  /**
   * DB 테이블 컬럼 정보 조회.
   *  어댑터별로 메타정보 조회 방법 상이:
   *   - mariadb/mysql/postgres: INFORMATION_SCHEMA.COLUMNS
   *   - sqlite : PRAGMA table_info('table')
   *   - oracle : USER_TAB_COLUMNS / ALL_TAB_COLUMNS
   */
  async getTableColumns(tableName) {
    if (!tableName) throw Object.assign(new Error('tableName 필수'), { status: 400 });

    const adapter = currentAdapter();

    let schema = appSchemaName() || null;   // ★ v1.12.2 업무 스키마가 정해져 있으면 거기서 찾는다
    let table = tableName;
    if (tableName.includes('.')) {
      [schema, table] = tableName.split('.');
    }

    try {
      // ── SQLite 경로 (INFORMATION_SCHEMA 미지원 → PRAGMA) ──────────────
      if (adapter === 'sqlite') {
        // PRAGMA 는 바인딩이 불가하므로 테이블명에 대해 영문/숫자/_ 만 허용
        const safeTable = String(table).replace(/[^A-Za-z0-9_]/g, '');
        if (!safeTable) {
          return { tableName, columns: [], error: '유효하지 않은 테이블명입니다' };
        }
        // SQLite 는 스키마(=attached DB) 개념이 다르므로 schema 는 기본적으로 main.
        const safeSchema = schema ? String(schema).replace(/[^A-Za-z0-9_]/g, '') : '';
        const pragmaSql = safeSchema
          ? `PRAGMA ${safeSchema}.table_info(${safeTable})`
          : `PRAGMA table_info(${safeTable})`;
        const result = await dbExecute(pragmaSql, {});
        const rawRows = result.rows || [];
        if (!rawRows.length) {
          return { tableName: schema ? `${schema}.${table}` : table, columns: [], error: `테이블을 찾을 수 없거나 컬럼이 없습니다: ${table}` };
        }
        // PRAGMA table_info 반환 필드: cid, name, type, notnull, dflt_value, pk
        const rows = rawRows.map((r) => ({
          name: r.name,
          type: (r.type || '').toLowerCase(),
          nullable: !r.notnull,
          key: r.pk ? 'PRI' : '',
          default: r.dflt_value ?? null,
          extra: '',
          maxLength: null,
        }));
        return { tableName: schema ? `${schema}.${table}` : table, columns: rows };
      }

      // ── Oracle 경로 ──────────────────────────────────────────────
      if (adapter === 'oracle') {
        // 오라클은 테이블명/스키마명을 대문자로 저장
        const owner = (schema || '').toUpperCase();
        const tbl = String(table).toUpperCase();
        const sql = owner
          ? `SELECT c.COLUMN_NAME, c.DATA_TYPE, c.NULLABLE, c.DATA_DEFAULT, c.DATA_LENGTH,
                    (SELECT 'PRI' FROM ALL_CONSTRAINTS ac JOIN ALL_CONS_COLUMNS acc ON ac.CONSTRAINT_NAME=acc.CONSTRAINT_NAME AND ac.OWNER=acc.OWNER
                     WHERE ac.CONSTRAINT_TYPE='P' AND ac.TABLE_NAME=c.TABLE_NAME AND ac.OWNER=c.OWNER AND acc.COLUMN_NAME=c.COLUMN_NAME AND ROWNUM=1) AS PK_FLAG
               FROM ALL_TAB_COLUMNS c
              WHERE c.OWNER = :owner AND c.TABLE_NAME = :tbl
              ORDER BY c.COLUMN_ID`
          : `SELECT c.COLUMN_NAME, c.DATA_TYPE, c.NULLABLE, c.DATA_DEFAULT, c.DATA_LENGTH,
                    (SELECT 'PRI' FROM USER_CONSTRAINTS uc JOIN USER_CONS_COLUMNS ucc ON uc.CONSTRAINT_NAME=ucc.CONSTRAINT_NAME
                     WHERE uc.CONSTRAINT_TYPE='P' AND uc.TABLE_NAME=c.TABLE_NAME AND ucc.COLUMN_NAME=c.COLUMN_NAME AND ROWNUM=1) AS PK_FLAG
               FROM USER_TAB_COLUMNS c
              WHERE c.TABLE_NAME = :tbl
              ORDER BY c.COLUMN_ID`;
        const params = owner ? { owner, tbl } : { tbl };
        const result = await dbExecute(sql, params);
        const rows = (result.rows || []).map((r) => ({
          name: r.COLUMN_NAME || r.column_name,
          type: (r.DATA_TYPE || r.data_type || '').toLowerCase(),
          nullable: (r.NULLABLE || r.nullable) === 'Y',
          key: r.PK_FLAG || r.pk_flag || '',
          default: r.DATA_DEFAULT || r.data_default,
          extra: '',
          maxLength: r.DATA_LENGTH || r.data_length,
        }));
        return { tableName: owner ? `${owner}.${tbl}` : tbl, columns: rows };
      }

      // ── MariaDB / MySQL / Postgres (기존 경로) ──────────────────────
      // 스키마 미지정 시 → 같은 이름 테이블이 여러 스키마에 있는지 먼저 확인
      if (!schema) {
        const checkSql = `SELECT DISTINCT TABLE_SCHEMA, TABLE_NAME
                          FROM INFORMATION_SCHEMA.COLUMNS
                          WHERE TABLE_NAME = :table
                          ORDER BY TABLE_SCHEMA`;
        const checkResult = await dbExecute(checkSql, { table });
        const schemas = (checkResult.rows || []).map(r => r.TABLE_SCHEMA || r.table_schema).filter(Boolean);
        const uniqueSchemas = [...new Set(schemas)];

        if (uniqueSchemas.length > 1) {
          // 여러 스키마에 같은 테이블 → 선택지 반환
          return {
            tableName: table,
            needSchemaSelection: true,
            tables: uniqueSchemas.map(s => `${s}.${table}`),
            columns: [],
          };
        }
        if (uniqueSchemas.length === 1) {
          schema = uniqueSchemas[0];
        }
      }

      let sql, params;
      if (schema) {
        sql = `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA, CHARACTER_MAXIMUM_LENGTH
               FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table
               ORDER BY ORDINAL_POSITION`;
        params = { schema, table };
      } else {
        sql = `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA, CHARACTER_MAXIMUM_LENGTH
               FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = :table
               ORDER BY ORDINAL_POSITION`;
        params = { table };
      }
      const result = await dbExecute(sql, params);
      const rows = (result.rows || []).map((r) => ({
        name: r.COLUMN_NAME || r.column_name,
        type: r.DATA_TYPE || r.data_type,
        nullable: (r.IS_NULLABLE || r.is_nullable) === 'YES',
        key: r.COLUMN_KEY || r.column_key || '',
        default: r.COLUMN_DEFAULT || r.column_default,
        extra: r.EXTRA || r.extra || '',
        maxLength: r.CHARACTER_MAXIMUM_LENGTH || r.character_maximum_length,
      }));
      return { tableName: schema ? `${schema}.${table}` : table, columns: rows };
    } catch (e) {
      this.log.error(`[table-columns] error: ${e.message}`);
      return { tableName, columns: [], error: e.message };
    }
  }

  /* ─── 내부 ─── */

  /** src/database/sql 폴더의 모든 .sql 파일 스캔 */
  _scanAll() {
    /* ★ v1.10.42 — 모든 폴더를 훑는다 (작업 폴더 포함) */
    const out = [];
    for (const dir of existingDirs('sql')) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!e.isFile() || !/\.sql$/i.test(e.name)) continue;
        const name = e.name.replace(/\.sql$/i, '');
        const filePath = path.join(dir, e.name);
        out.push(this._buildInfo(name, filePath, /* withSource */ false));
      }
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  _buildInfo(name, filePath, withSource) {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const queries = extractQueryNames(content);
    const queriesWithParams = extractQueriesWithParams(content)
      .map((q) => ({ name: q.name, params: q.params }));  // body 는 너무 크니 제외
    const registered = sqlRegistry.listFiles().some((f) => f.name === name);

    const info = {
      id: name,                    // ★ id 는 파일명
      name,
      table_name: this._extractTableName(content),
      description: this._extractDescription(content),
      file_path: displayPath(filePath),
      // ★ v1.10.42 — 'workspace'(내가 만든 것) | 'builtin'(예제)
      origin: isWorkspaceFile(filePath) ? 'workspace' : 'builtin',
      queries,
      queriesWithParams,           // ★ 추가: [{ name, params: ['id', 'name', ...] }]
      query_count: queries.length,
      registered,
      created_at: this._fmtTs(stat.birthtime),
      updated_at: this._fmtTs(stat.mtime),
    };
    if (withSource) info.content = content;
    return info;
  }

  /** 파일 첫 부분의 -- 주석에서 테이블명 추출 시도 (best-effort) */
  _extractTableName(content) {
    const m = content.match(/FROM\s+([A-Za-z_][\w.]*)/i);
    return m ? m[1] : null;
  }

  _extractDescription(content) {
    const lines = content.split(/\r?\n/).slice(0, 5);
    for (const ln of lines) {
      const m = ln.match(/^--\s*(.+)$/);
      if (m && !/@name:/.test(m[1]) && !/접근\s*키/.test(m[1])) return m[1].trim();
    }
    return '';
  }

  /**
   * description 문자열을 SQL content 의 첫 줄 주석으로 삽입/교체.
   *  이미 첫 줄이 '-- xxx' 이면 교체, 아니면 맨 앞에 삽입.
   *  description 이 빈 문자열이면 기존 주석 제거.
   */
  _embedDescription(content, description) {
    const lines = content.split(/\r?\n/);
    const desc = (description || '').trim();

    // 기존 첫 줄이 일반 주석인지 (@name 이 아닌)
    const firstIsComment = lines.length > 0 && /^--\s/.test(lines[0]) && !/@name:/.test(lines[0]);

    if (desc) {
      if (firstIsComment) {
        lines[0] = `-- ${desc}`;
      } else {
        lines.unshift(`-- ${desc}`);
      }
    } else if (firstIsComment) {
      // description 비움 → 기존 주석 제거
      lines.shift();
    }
    return lines.join('\n');
  }

  _validateName(name) {
    if (!name || !/^[a-z][a-z0-9_]*$/.test(name)) {
      throw Object.assign(
        new Error('SQL 파일명은 소문자 + 숫자/언더바만 허용 (예: product)'),
        { status: 400 },
      );
    }
  }

  /** ★ v1.11.1 — 이미 있는 파일은 있는 곳에서. 없으면 null */
  _existingSqlFilePath(name) {
    assertSafeId(name, 'name');
    return findExistingFile('sql', `${name}.sql`);
  }

  _sqlFilePath(name) {
    // 보안: id/name 은 URL 파라미터로 들어오므로 경로 문자(.., /)를 차단한다 (경로 탈출 → 임의 파일 읽기/삭제 방지)
    assertSafeId(name, 'name');
    // ★ v1.10.42 — 새 파일은 작업 폴더로
    return path.join(writeDirFor('sql'), `${name}.sql`);
  }

  _ensureParentDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  _fmtTs(d) {
    if (!d) return null;
    return d.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' ');
  }
}
