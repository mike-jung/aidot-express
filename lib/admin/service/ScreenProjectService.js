/**
 * ScreenProjectService — 화면 디자이너(admin) 프로젝트 CRUD.
 *
 *  진실의 원천:
 *   - DB 테이블 admin_screen_projects.
 *   - 각 프로젝트의 설정/레이아웃/화면/변수는 JSON 컬럼에 통째로 저장.
 *
 *  호출 패턴:
 *   - listPaged({ page, perPage })
 *   - findById(id)            → 상세 (JSON 필드 파싱됨)
 *   - create({ name, description?, config?, layout?, screens?, vars? })
 *   - update(id, patch)       → 주어진 필드만 업데이트
 *   - remove(id)              → soft delete (status = 'deleted')
 *
 *  에러 모델:
 *   - 이름 중복 → { status: 409, message }
 *   - 없는 id → null 또는 { status: 404 }
 *
 *  DB 어댑터 반환 shape (src/database/db.js 계약):
 *   execute() → { rows: any[], rowsAffected: number, insertId?: any }
 */
import { Service, Sql, Log } from '../../../src/core/decorators.js';
import db from '../../../src/database/db.js';
// Phase 12: admin 서비스 로그는 config.log.admin=false 일 때 @Log 가 no-op 로 주입됨.
// 진단/오류 로그만큼은 필터 우회해 항상 출력되도록 기본 logger 를 직접 import.
import rawLogger from '../../../src/util/logger.js';

/**
 * Phase 20: config / layout 부분 merge.
 *  사용자가 `{ cssFramework: 'metronic' }` 만 보내면 apiBaseUrl, theme 등 기본값은 유지.
 *  theme 같은 중첩 객체는 한 단계 더 merge.
 */
function mergeConfig(defaults, input) {
  if (!input || typeof input !== 'object') return { ...defaults };
  return {
    ...defaults,
    ...input,
    theme: { ...(defaults.theme || {}), ...(input.theme || {}) },
  };
}
function mergeLayout(defaults, input) {
  if (!input || typeof input !== 'object') return JSON.parse(JSON.stringify(defaults));
  return {
    ...defaults,
    ...input,
    title:    { ...(defaults.title    || {}), ...(input.title    || {}) },
    sidebar:  { ...(defaults.sidebar  || {}), ...(input.sidebar  || {}),
                items: input.sidebar?.items ?? defaults.sidebar?.items ?? [] },
    mainArea: { ...(defaults.mainArea || {}), ...(input.mainArea || {}) },
  };
}

@Service('ScreenProjectService')
export default class ScreenProjectService {

  @Sql('admin_screen_project') projectSql;
  @Log log;

  // 진단 전용 로거 — admin 필터를 우회하여 서버 콘솔에 무조건 출력.
  // 일반 흐름 로그는 기존처럼 this.log 사용, 진단/경고/오류는 this.diagLog 사용.
  diagLog = rawLogger;

  /* ────────────────────── 내부 헬퍼 ────────────────────── */

  /**
   * DB 행의 JSON 컬럼들을 파싱해서 사용자에게 줄 shape 으로 변환.
   *  - MySQL: JSON 컬럼이 자동 파싱되어 object 로 올 수도 있고 string 으로 올 수도 있다
   *  - SQLite: TEXT 이므로 항상 string. JSON.parse 필요.
   *  → 두 케이스를 통합 처리.
   */
  _parseRow(row) {
    if (!row) return null;
    const parse = (v, fallback) => {
      if (v === null || v === undefined) return fallback;
      if (typeof v === 'object') return v;
      try { return JSON.parse(v); } catch { return fallback; }
    };
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      config: parse(row.config_json, {}),
      layout: parse(row.layout_json, {}),
      screens: parse(row.screens_json, []),
      vars: parse(row.vars_json, []),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** 신규 프로젝트의 기본값들. create 시 누락된 필드를 채움. */
  _defaults() {
    return {
      config: {
        apiBaseUrl: 'http://localhost:7901',
        cssFramework: 'bootstrap',   // 'bootstrap' | 'metronic'
        theme: { primary: '#0d6efd', font: 'system-ui', customCss: '' },
      },
      layout: {
        kind: 'sidebar-left',
        title: { text: 'My App', logoUrl: '', bgColor: '#ffffff', fgColor: '#0f172a', height: 60 },
        sidebar: { items: [], bgColor: '#1e2a3a', fgColor: '#cfd6de', width: 220, activeBg: '#0d6efd' },
        mainArea: { bgColor: '#f5f7fa', padding: 16 },
      },
      screens: [],
      vars: [],
    };
  }

  /* ────────────────────── 목록 ────────────────────── */

  async listPaged(opts = {}) {
    const page = Math.max(1, Number(opts.page) || 1);
    const perPage = Math.max(1, Math.min(100, Number(opts.perPage) || 10));

    try {
      // Phase 12: active (listPaged 가 쓰는 기준) + 전체 (status 무관) 모두 찍어 비교
      const activeRes = await db.execute(this.projectSql.get('countProjects'));
      const activeTotal = activeRes.rows?.[0]?.cnt ?? 0;

      let rawTotal = activeTotal;
      try {
        const rawRes = await db.execute("SELECT COUNT(*) AS cnt FROM admin_screen_projects");
        rawTotal = rawRes.rows?.[0]?.cnt ?? activeTotal;
      } catch (_) { /* 테이블 없으면 countProjects 에서 이미 fail */ }

      this.diagLog.info(`[screen-project] listPaged page=${page} perPage=${perPage} active=${activeTotal} total(all status)=${rawTotal}`);

      if (rawTotal > 0 && activeTotal === 0) {
        this.diagLog.warn(`[screen-project] ⚠ DB 에 ${rawTotal} 개 row 가 있지만 status='active' 는 0개. status 필드 확인 필요.`);
      }

      const listRes = await db.execute(this.projectSql.get('listProjectsPaged'), {
        lim: perPage,
        off: (page - 1) * perPage,
      });

      return {
        rows: (listRes.rows || []).map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description || '',
          status: r.status,
          // Phase 25: config 파싱 (cssFramework 뱃지 표시용). 파싱 실패 시 빈 객체.
          config: (() => {
            if (!r.config_json) return {};
            try { return JSON.parse(r.config_json); }
            catch (_) { return {}; }
          })(),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
        header: {
          total: activeTotal,
          page,
          perPage,
          totalPages: Math.max(1, Math.ceil(activeTotal / perPage)),
        },
      };
    } catch (e) {
      this.diagLog.error(`[screen-project] listPaged 실패: ${e.message}`, { stack: e.stack });
      throw Object.assign(
        new Error(`프로젝트 목록 조회 실패: ${e.message}`),
        { status: 500, cause: e.message },
      );
    }
  }

  async listAllBrief() {
    const res = await db.execute(this.projectSql.get('listAllProjectsBrief'));
    return (res.rows || []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      updatedAt: r.updated_at,
    }));
  }

  /* ────────────────────── 상세 ────────────────────── */

  async findById(id) {
    const res = await db.execute(this.projectSql.get('findProjectById'), { id });
    const row = res.rows?.[0];
    if (!row || row.status === 'deleted') return null;
    return this._parseRow(row);
  }

  /* ────────────────────── 생성 ────────────────────── */

  async create(input = {}) {
    if (!input.name || !String(input.name).trim()) {
      throw Object.assign(new Error('프로젝트 이름이 필요합니다'), { status: 400 });
    }
    const trimmedName = String(input.name).trim();

    // 이름 중복 체크 — findProjectByName 은 active 만 검색
    const dupRes = await db.execute(
      this.projectSql.get('findProjectByName'),
      { name: trimmedName },
    );
    const dupRow = (dupRes.rows || [])[0];
    if (dupRow) {
      // Phase 9: 409 에 기존 id/name 포함
      throw Object.assign(
        new Error(`이미 존재하는 프로젝트 이름: ${trimmedName}`),
        { status: 409, existingId: dupRow.id, existingName: dupRow.name },
      );
    }

    const defaults = this._defaults();
    // Phase 20: 사용자 입력 config 가 { cssFramework: 'metronic' } 처럼 부분적이면
    //  이전에는 `input.config ?? defaults.config` 로 전체가 덮어써져 apiBaseUrl, theme 등이 사라짐.
    //  이제 얕은 merge: 사용자가 준 key 만 덮어쓰고 나머지는 기본값 유지.
    //  theme 같은 중첩 객체도 같이 부분 merge.
    const mergedConfig = mergeConfig(defaults.config, input.config);
    const mergedLayout = mergeLayout(defaults.layout, input.layout);

    const payload = {
      name: trimmedName,
      description: input.description || '',
      config_json:  JSON.stringify(mergedConfig),
      layout_json:  JSON.stringify(mergedLayout),
      screens_json: JSON.stringify(input.screens ?? defaults.screens),
      vars_json:    JSON.stringify(input.vars    ?? defaults.vars),
    };

    const insRes = await db.execute(this.projectSql.get('insertProject'), payload);
    const newId = insRes.insertId;
    if (!newId) {
      throw new Error('프로젝트 생성에 실패했습니다 (insertId 없음)');
    }
    this.diagLog.info(`[screen-project] 생성 id=${newId} name='${payload.name}' rowsAffected=${insRes.rowsAffected}`);

    // Phase 12: INSERT 직후 같은 DB 에서 즉시 SELECT 해서 실제로 저장됐는지 검증.
    //  사용자 증상: "저장은 되는데 목록에 없음" — INSERT 와 SELECT 가 다른 DB/트랜잭션인지 확인.
    try {
      const verify = await db.execute(
        this.projectSql.get('findProjectById'),
        { id: newId },
      );
      const vrow = verify.rows?.[0];
      this.diagLog.info(`[screen-project] create ✓ verify id=${newId} found=${!!vrow} status='${vrow?.status ?? 'null'}'`);
      if (!vrow) {
        this.diagLog.error(`[screen-project] ⚠ INSERT 직후 findProjectById(${newId}) 가 빈 결과! 트랜잭션/커밋 문제 가능성.`);
      }
      // 전체 active 카운트도 함께 — 방금 추가 후 최소 1 이어야 함
      const countRes = await db.execute(this.projectSql.get('countProjects'));
      this.diagLog.info(`[screen-project] 현재 active 프로젝트 총 ${countRes.rows?.[0]?.cnt ?? 0} 개`);
    } catch (e) {
      this.diagLog.error(`[screen-project] create 검증 SELECT 실패: ${e.message}`);
    }

    return this.findById(newId);
  }

  /**
   * Phase 12: 진단 메서드 — DB 상태를 한눈에 확인.
   *  프로젝트 저장/조회 불일치 디버깅 용.
   *  반환:
   *    {
   *      dbAdapter: 'sqlite'|'mariadb'|...,
   *      dbFile: string (SQLite 경우),
   *      migrationsApplied: [...],          // schema_migrations 테이블 내용
   *      tableSchema: string,                // admin_screen_projects 스키마
   *      totalCount: number,                 // status 무관 전체
   *      activeCount: number,                // status='active'
   *      statusBreakdown: { [status]: count },
   *      recentRows: [ { id, name, status, created_at, updated_at }, ... ]  // 최근 10개
   *    }
   */
  async diagnose() {
    const out = {
      dbAdapter: null,
      dbFile: null,
      migrationsApplied: [],
      tableSchema: null,
      totalCount: 0,
      activeCount: 0,
      statusBreakdown: {},
      recentRows: [],
      warnings: [],
      // Phase 14: 실행 진단
      listPagedSql: null,          // 서버가 실제로 로드한 SQL 텍스트
      countProjectsSql: null,
      listPagedResult: null,       // 직접 실행 결과
      countProjectsResult: null,
    };

    try {
      out.dbAdapter = db.currentAdapter ? db.currentAdapter() : 'unknown';
    } catch (e) { out.warnings.push(`currentAdapter: ${e.message}`); }

    try {
      if (out.dbAdapter === 'sqlite') {
        const r = await db.execute("PRAGMA database_list");
        const main = (r.rows || []).find((row) => row.name === 'main' || row.seq === 0);
        out.dbFile = main?.file || null;
      }
    } catch (e) { out.warnings.push(`db file: ${e.message}`); }

    // schema_migrations 내역
    try {
      const r = await db.execute("SELECT file_name, applied_at FROM schema_migrations ORDER BY applied_at DESC");
      out.migrationsApplied = (r.rows || []).map((x) => ({ name: x.file_name, appliedAt: x.applied_at }));
    } catch (e) { out.warnings.push(`migrations query: ${e.message}`); }

    // 테이블 스키마
    try {
      if (out.dbAdapter === 'sqlite') {
        const r = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='admin_screen_projects'");
        out.tableSchema = r.rows?.[0]?.sql || '(admin_screen_projects 테이블이 없습니다)';
      } else {
        out.tableSchema = '(스키마 조회는 SQLite 에서만 지원)';
      }
    } catch (e) { out.warnings.push(`schema: ${e.message}`); }

    // 전체 row 수 (status 무관)
    try {
      const r = await db.execute("SELECT COUNT(*) AS cnt FROM admin_screen_projects");
      out.totalCount = r.rows?.[0]?.cnt ?? 0;
    } catch (e) { out.warnings.push(`total count: ${e.message}`); }

    // status 별
    try {
      const r = await db.execute("SELECT status, COUNT(*) AS cnt FROM admin_screen_projects GROUP BY status");
      for (const row of (r.rows || [])) {
        out.statusBreakdown[row.status] = row.cnt;
      }
      out.activeCount = out.statusBreakdown['active'] || 0;
    } catch (e) { out.warnings.push(`status breakdown: ${e.message}`); }

    // 최근 10개 (status 무관)
    try {
      const r = await db.execute(
        "SELECT id, name, status, created_at, updated_at FROM admin_screen_projects ORDER BY id DESC LIMIT 10"
      );
      out.recentRows = r.rows || [];
    } catch (e) { out.warnings.push(`recent rows: ${e.message}`); }

    // Phase 14: 서버가 실제로 로드한 SQL 텍스트를 덤프
    //  Phase 13 수정 (:limit→:lim) 이 서버에 반영됐는지 확인하기 위해.
    try {
      out.listPagedSql = this.projectSql.get('listProjectsPaged');
    } catch (e) { out.warnings.push(`listPagedSql: ${e.message}`); }
    try {
      out.countProjectsSql = this.projectSql.get('countProjects');
    } catch (e) { out.warnings.push(`countProjectsSql: ${e.message}`); }

    // Phase 14: listPaged / countProjects 를 diagnose 컨텍스트에서 직접 실행
    //  listPaged 실패 원인을 에러 메시지까지 포함해 전달
    try {
      const r = await db.execute(this.projectSql.get('countProjects'));
      out.countProjectsResult = {
        ok: true,
        cnt: r.rows?.[0]?.cnt ?? 0,
      };
    } catch (e) {
      out.countProjectsResult = {
        ok: false,
        error: e.message,
        sqlState: e.sqlState || e.code,
      };
    }

    try {
      const r = await db.execute(this.projectSql.get('listProjectsPaged'), {
        lim: 10,
        off: 0,
      });
      out.listPagedResult = {
        ok: true,
        rowCount: (r.rows || []).length,
        firstRow: (r.rows || [])[0] || null,
      };
    } catch (e) {
      out.listPagedResult = {
        ok: false,
        error: e.message,
        sqlState: e.sqlState || e.code,
      };
    }

    // Phase 15: 결정적 진단 — listPaged() 메서드를 this 바인딩으로 직접 호출.
    //  diagnose 의 raw SQL 실행과 listPaged 메서드 호출의 결과를 비교해서
    //  어느 경로에서 0 이 반환되는지 확정.
    try {
      const selfRes = await this.listPaged({ page: 1, perPage: 10 });
      out.selfListPagedResult = {
        ok: true,
        rowCount: (selfRes.rows || []).length,
        headerTotal: selfRes.header?.total ?? null,
        firstRow: (selfRes.rows || [])[0] || null,
      };
    } catch (e) {
      out.selfListPagedResult = {
        ok: false,
        error: e.message,
      };
    }

    // 이 메서드의 소스 위치를 로그 — 서버가 어떤 파일의 어떤 버전을 돌리고 있는지 확인
    try {
      const fnSrc = this.listPaged.toString();
      out.listPagedFnSignature = {
        firstLine: fnSrc.split('\n')[0],
        containsDiagLog: fnSrc.includes('diagLog'),       // Phase 12 반영 여부
        containsLim: fnSrc.includes('lim: perPage'),       // Phase 13 반영 여부
        length: fnSrc.length,
      };
    } catch (e) { out.warnings.push(`fn signature: ${e.message}`); }

    this.diagLog.info(`[screen-project] diagnose: adapter=${out.dbAdapter} file=${out.dbFile} total=${out.totalCount} active=${out.activeCount} listPagedOk=${out.listPagedResult?.ok} countOk=${out.countProjectsResult?.ok} selfListPaged=${out.selfListPagedResult?.rowCount}`);
    return out;
  }

  /* ────────────────────── 수정 ────────────────────── */

  /**
   * 부분 업데이트. 주어진 필드만 반영, 나머지는 기존 값 유지.
   * patch: { name?, description?, config?, layout?, screens?, vars? }
   */
  async update(id, patch = {}) {
    const existing = await this.findById(id);
    if (!existing) {
      throw Object.assign(new Error(`프로젝트 없음: id=${id}`), { status: 404 });
    }

    // 이름 변경 시 중복 체크 (자신은 제외)
    if (patch.name && String(patch.name).trim() !== existing.name) {
      const dupRes = await db.execute(
        this.projectSql.get('findProjectByName'),
        { name: String(patch.name).trim() },
      );
      const dupRows = dupRes.rows || [];
      if (dupRows.length > 0 && Number(dupRows[0].id) !== Number(id)) {
        throw Object.assign(new Error(`이미 존재하는 프로젝트 이름: ${patch.name}`), { status: 409 });
      }
    }

    const merged = {
      name:        patch.name        !== undefined ? String(patch.name).trim() : existing.name,
      description: patch.description !== undefined ? String(patch.description)  : existing.description,
      config:      patch.config      !== undefined ? patch.config   : existing.config,
      layout:      patch.layout      !== undefined ? patch.layout   : existing.layout,
      screens:     patch.screens     !== undefined ? patch.screens  : existing.screens,
      vars:        patch.vars        !== undefined ? patch.vars     : existing.vars,
    };

    await db.execute(this.projectSql.get('updateProject'), {
      id,
      name: merged.name,
      description: merged.description,
      config_json:  JSON.stringify(merged.config),
      layout_json:  JSON.stringify(merged.layout),
      screens_json: JSON.stringify(merged.screens),
      vars_json:    JSON.stringify(merged.vars),
    });

    this.log.info(`[screen-project] 수정 id=${id}`);
    return this.findById(id);
  }

  /* ────────────────────── 삭제 (soft) ────────────────────── */

  async remove(id) {
    const existing = await this.findById(id);
    if (!existing) {
      throw Object.assign(new Error(`프로젝트 없음: id=${id}`), { status: 404 });
    }
    await db.execute(this.projectSql.get('softDeleteProject'), { id });
    this.log.info(`[screen-project] 삭제(soft) id=${id}`);
    return { id };
  }
}
