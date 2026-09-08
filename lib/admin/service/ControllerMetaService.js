/**
 * ControllerMetaService — 일반 controller 폴더(src/controller/*.js)의 모든 파일을 관리.
 *
 *  진실의 원천:
 *   - 디스크: src/controller/*.js  (실제 파일)
 *   - 메모리: listRegisteredControllers()  (현재 등록된 라우터)
 *
 *  DB(admin_controllers)는 이제 사용하지 않습니다. 어드민 도구로 만든 컨트롤러도,
 *  직접 코딩한 컨트롤러도 모두 같은 폴더에 들어가므로 파일 시스템이 진실의 원천입니다.
 *
 *  목록 / 조회 / 추가 / 수정 / 삭제
 *   + 코드 생성 (preview)
 *   + 파일 저장 후 동적으로 컨트롤러 로딩 (서버 재시작 불필요)
 */
import fs from 'node:fs';
import { markLoaded } from './WorkspaceLoadService.js';
import path from 'node:path';
import { writeDirFor, existingDirs, isWorkspaceFile, findExistingFile, displayPath } from '../../../src/core/appPaths.js';
import container from '../../../src/core/container.js';
import { generateServiceMethodCode, generateServiceCodeStandalone } from './codeGenerator.js';
import { fileURLToPath } from 'node:url';

import { Service, Log } from '../../../src/core/decorators.js';
import { assertSafeId } from '../../../src/core/security.js';

import {
  loadSingleControllerFile,
  unregisterControllerByBasePath,
  listRegisteredControllers,
} from '../../../src/core/controllerLoader.js';
import {
  generateControllerCode,
  generateServiceCode,
  generateSqlCode,
  getRouteTypeCatalog,
  getSqlActionCatalog,
  suggestChannel,
  CHANNEL_RE,
} from './codeGenerator.js';
import { writeMeta, readMeta, deleteMeta, isMetaFile } from './metaStorage.js';
import { safeWriteFile, safeUnlink } from './safeFs.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..', '..');

/** Express app 인스턴스 holder. server.js 가 부팅 후 setApp() 으로 주입 */
let _app = null;
export function setApp(app) { _app = app; }
/** ★ v1.13.0 — 차단 기능이 라우트를 내릴 때 쓴다 */
export function getApp() { return _app; }

@Service('ControllerMetaService')
export default class ControllerMetaService {

  @Log log;

  getRouteTypes() {
    return getRouteTypeCatalog();
  }

  /** multiSql 단계의 action 옵션 카탈로그 (SqlStepsEditor 셀렉트박스용) */
  getSqlActions() {
    return getSqlActionCatalog();
  }

  /** 코드 생성만 (저장 X) — preview 용 */
  generate(meta) {
    return {
      controllerCode: generateControllerCode(meta, writeDirFor('controllers')),
      serviceCode: generateServiceCode(meta, writeDirFor('services')),
      sqlCode: generateSqlCode(meta),
    };
  }

  /**
   * 일반 controller 폴더의 모든 파일을 목록으로.
   *
   *  - 파일명을 id 로 사용 (예: 'StudentController')
   *  - 라우터 등록 정보(basePath, routes)를 메모리에서 결합
   *  - 페이지네이션은 파일 목록을 잘라서 처리 (파일이 많아져도 100~수백 단위)
   */
  async listPaged(opts) {
    const page = Math.max(1, Number(opts.page) || 1);
    const perPage = Math.max(1, Math.min(100, Number(opts.perPage) || 10));

    /* ★ v1.11.7 — origin=workspace 면 작업 폴더의 내 파일만 (콘솔 목록의 [내 것만] 스위치).
       예제(src/)가 섞여 있으면 내가 만든 것을 찾기 어렵다. 숨긴 예제 수는 header.hiddenBuiltin 으로 돌려준다. */
    const scanned = this._scanAllControllers();
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
        total,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  }

  /** id = 파일명 (확장자 제외, 예: 'StudentController') */
  async findById(id) {
    // legacy 컨트롤러 우선 조회 — aidot 네이티브와 이름이 겹치지 않는다고 가정.
    const legacyMetas = globalThis.__legacyControllers;
    if (Array.isArray(legacyMetas)) {
      const m = legacyMetas.find((x) => x.name === id);
      if (m) {
        const info = this._buildLegacyControllerInfo(m);
        // withSource 흉내 — 파일을 직접 읽어 소스 노출 (읽기 전용)
        try {
          if (m.file && fs.existsSync(m.file)) {
            info.source = fs.readFileSync(m.file, 'utf8');
          }
        } catch { /* noop */ }
        return info;
      }
    }
    /* ★ v1.11.1 — 있는 곳에서 찾는다 (작업 폴더 → src/controller). 예전에는 쓰기 폴더만 봐서
       작업 폴더를 켜면 기존 파일이 열리지 않았다. */
    const filePath = this._existingControllerPath(id);
    if (!filePath) return null;
    return this._buildControllerInfo(id, filePath, /* withSource */ true);
  }

  /**
   * ★ v1.31.0 — 파일 맨 위 주석에서 설명을 읽는다.
   *
   *  SQL 은 `-- 설명` 을 읽어 [설명] 열에 보여 주는데, 컨트롤러·서비스는 그러지 않았다.
   *  직접 만든 파일에 이렇게 적어 두어도 목록의 [설명] 이 비어 있었다:
   *
   *      ///
   *      ///  내 준비물 API
   *      ///
   *
   *  세 가지 형태를 모두 읽는다 — 사람마다 쓰는 주석이 다르다.
   *    ① `/// 설명`   ② `// 설명`   ③ `/** 설명 *\/` (JSDoc)
   *
   *  건너뛰는 줄: 빈 주석(`///`), 파일 이름과 같은 줄(ClassName), `auto-generated`,
   *  import·데코레이터 같은 코드 줄. 첫 번째로 남는 문장을 설명으로 본다.
   */
  _descriptionFromSource(content, name = '') {
    const lines = String(content).split(/\r?\n/).slice(0, 20);
    for (const raw of lines) {
      const ln = raw.trim();
      if (!ln) continue;
      /* 코드가 시작되면 더 볼 필요가 없다 */
      if (/^(import|export|@|const|let|class)\b/.test(ln)) break;
      let t = null;
      const m3 = /^\/\/\/\s*(.*)$/.exec(ln);          // ///
      const m2 = /^\/\/\s*(.*)$/.exec(ln);             // //
      const mj = /^(?:\/\*\*?|\*)\s*(.*?)\s*(?:\*\/)?$/.exec(ln);   // /** ... */ · *
      if (m3) t = m3[1];
      else if (m2) t = m2[1];
      else if (mj && /^[/*]/.test(ln)) t = mj[1];
      if (t == null) continue;
      t = t.trim();
      if (!t) continue;                                  // 빈 주석 줄
      if (name && t === name) continue;                  // 파일 이름만 적힌 줄
      if (/auto-generated/i.test(t)) continue;
      if (/^(eslint|@ts-|prettier)/i.test(t)) continue;  // 도구 지시문
      return t;
    }
    return '';
  }

  /** legacy 컨트롤러 수정/삭제 시도 시 공통 에러 */
  _assertNotLegacy(id, operation = '수정') {
    const legacyMetas = globalThis.__legacyControllers;
    if (Array.isArray(legacyMetas) && legacyMetas.some((m) => m.name === id)) {
      throw Object.assign(
        new Error(`legacy 컨트롤러는 ${operation}할 수 없습니다 (읽기 전용): ${id}`),
        { status: 403 },
      );
    }
  }

  /**
   * 컨트롤러 생성:
   *  1) 메타 검증
   *  2) 같은 이름 파일이 이미 있으면 거절
   *  3) 코드 생성 + src/controller/<name>.js 파일 저장
   *  4) 동적으로 controllerLoader 로 import + router 등록
   */
  async create(meta, customCode) {
    this._validateMeta(meta);

    const filePath = this._controllerFilePath(meta.name);
    // ★ v1.11.1 — 어느 폴더에든 같은 이름이 있으면 거절. 작업 폴더에 만들면 src/controller 의 것을 가려 버린다
    const already = this._existingControllerPath(meta.name);
    if (already || fs.existsSync(filePath)) {
      throw Object.assign(
        new Error(`이미 존재하는 컨트롤러 파일: ${meta.name}.js (${already || filePath})`),
        { status: 409 },
      );
    }

    // 같은 basePath 의 라우터가 이미 있으면 거절
    const dupRoute = listRegisteredControllers().find((c) => c.basePath === meta.basePath);
    if (dupRoute) {
      throw Object.assign(
        new Error(`이미 사용 중인 base_path: ${meta.basePath} (${dupRoute.name})`),
        { status: 409 },
      );
    }

    /* ★ v1.11.1 — customCode 가 함수면 **저장될 폴더**를 넘겨 부른다. 생성기가 import 경로를 그 폴더 기준으로
       계산해야 한다 (MCI 생성기가 '../core/decorators.js' 를 박아 넣어 작업 폴더에서 로드에 실패했다). */
    const code = typeof customCode === 'function'
      ? customCode(path.dirname(filePath))
      : (customCode ?? generateControllerCode(meta, path.dirname(filePath)));
    this._ensureParentDir(filePath);
    await safeWriteFile(filePath, code);
    // 사이드카 메타 저장 (수정 시 multiSql 등 복원용)
    await writeMeta(filePath, {
      name: meta.name,
      basePath: meta.basePath,
      controllerType: meta.controllerType || 'DB',
      serviceName: meta.serviceName,
      description: meta.description,
      auth: meta.auth || false,
      roles: meta.roles || [],
      routes: meta.routes,
      // 실시간(SSE) 설정 — 재편집 시 체크 상태를 복원하기 위해 저장
      ...(meta.realtime ? { realtime: meta.realtime } : {}),
      // MCI 컨트롤러의 경우 재편집을 위해 원본 분석/매핑 메타를 저장
      ...(meta.mci ? { mci: meta.mci } : {}),
    });

    // Phase 35 (patch-14): hot-reload 성공 여부를 호출자(UI) 에게 전달.
    //  _app 이 없거나 로딩 실패 시 registered=false 로 반환 → UI 가 재시작 필요 경고 표시.
    let registered = false;
    if (_app) {
      try {
        await loadSingleControllerFile(_app, filePath);
        markLoaded('controller', filePath);
        this.log.info(`[meta:controller] loaded: ${meta.name} (${meta.basePath})`);
        registered = true;
      } catch (e) {
        this.log.error(`[meta:controller] could not load: ${e.message}`);
        /* ★ v1.11.1 — 로드에 실패한 파일을 남겨 두면 다음 시도가 409(이미 존재) 가 되고, 다음 기동 때
           같은 오류로 부팅 로그가 더러워진다. 만들다 만 것은 치운다. */
        try { await safeUnlink(filePath); await deleteMeta(filePath); } catch { /* noop */ }
        throw Object.assign(
          new Error(`동적 로딩 실패: ${e.message} (파일은 되돌렸습니다)`),
          { status: 500 },
        );
      }
    } else {
      this.log.warn(`[meta:controller] _app is null — check that server.js calls setApp(app). The file was saved, but its routes are unreachable until the server restarts.`);
    }

    const serviceSync = await this._syncServiceMethods(meta, code);
    return { id: meta.name, filePath, registered, ...(serviceSync ? { serviceSync } : {}) };
  }

  /**
   * 컨트롤러 수정 — 파일 재저장 + hot-reload
   *  - id(파일명)와 meta.name 이 다르면 파일명 rename 처리
   */
  async update(id, meta, customCode) {
    this._assertNotLegacy(id, '수정');
    const existing = await this.findById(id);
    if (!existing) throw Object.assign(new Error('not found'), { status: 404 });
    this._validateMeta(meta);

    /* ★ v1.11.1 — **제자리** 수정. 예전에는 쓰기 폴더(작업 폴더) 경로를 썼기 때문에 src/controller 의
       파일을 고치면 작업 폴더에 사본이 생기고 원본은 그대로 남아 다음 기동 때 라우트가 겹쳤다.
       이름을 바꿔도 같은 폴더 안에서 바꾼다. */
    const oldPath = this._existingControllerPath(existing.name) || this._controllerFilePath(existing.name);
    const filePath = existing.name === meta.name ? oldPath : path.join(path.dirname(oldPath), `${meta.name}.js`);
    const code = typeof customCode === 'function'
      ? customCode(path.dirname(filePath))
      : (customCode ?? generateControllerCode(meta, path.dirname(filePath)));
    const previousSource = fs.existsSync(oldPath) ? fs.readFileSync(oldPath, 'utf8') : null;

    // 이름이 바뀌면 옛 파일 삭제 + 라우터 unregister + 옛 메타 삭제
    if (existing.name !== meta.name) {
      // 새 이름이 어느 폴더에든 이미 있으면 거절 (옛 파일을 지우기 **전에** 검사)
      if (this._existingControllerPath(meta.name) || fs.existsSync(filePath)) {
        throw Object.assign(
          new Error(`이미 존재하는 컨트롤러 파일: ${meta.name}.js`),
          { status: 409 },
        );
      }
      await safeUnlink(oldPath);
      await deleteMeta(oldPath);
      if (_app && existing.basePath) {
        unregisterControllerByBasePath(_app, existing.basePath);
      }
    }

    this._ensureParentDir(filePath);
    await safeWriteFile(filePath, code);
    await writeMeta(filePath, {
      name: meta.name,
      basePath: meta.basePath,
      controllerType: meta.controllerType || 'DB',
      serviceName: meta.serviceName,
      description: meta.description,
      auth: meta.auth || false,
      roles: meta.roles || [],
      routes: meta.routes,
      ...(meta.realtime ? { realtime: meta.realtime } : {}),
      ...(meta.mci ? { mci: meta.mci } : {}),
    });

    // Phase 35 (patch-14): update 도 create 와 동일하게 registered 필드 반환.
    let registered = false;
    if (_app) {
      // basePath 가 바뀌었으면 기존 basePath 의 라우터 먼저 해제
      if (existing.basePath && existing.basePath !== meta.basePath) {
        unregisterControllerByBasePath(_app, existing.basePath);
      }
      try {
        await loadSingleControllerFile(_app, filePath);
        markLoaded('controller', filePath);
        registered = true;
      } catch (e) {
        this.log.error(`[meta:controller] could not reload after update: ${e.message}`);
        /* ★ v1.11.1 — 고치다 깨진 파일을 남기지 않는다. 이름이 그대로면 예전 소스로 되돌리고 다시 로드해 둔다 */
        if (previousSource !== null && existing.name === meta.name) {
          try {
            await safeWriteFile(filePath, previousSource);
            await loadSingleControllerFile(_app, filePath);
            markLoaded('controller', filePath);
          } catch { /* 되돌리기까지 실패하면 어쩔 수 없다 — 원인은 위 로그에 있다 */ }
        }
        throw Object.assign(
          new Error(`동적 로딩 실패: ${e.message}${previousSource !== null && existing.name === meta.name ? ' (예전 소스로 되돌렸습니다)' : ''}`),
          { status: 500 },
        );
      }
    } else {
      this.log.warn(`[meta:controller] _app is null — server.js must call setApp(app). Routes are unreachable until restart.`);
    }

    const serviceSync = await this._syncServiceMethods(meta, code);
    return { id: meta.name, filePath, registered, ...(serviceSync ? { serviceSync } : {}) };
  }

  /**
   * ★ v1.11.2 — 컨트롤러 라우트가 부르는 서비스 메서드가 서비스에 없으면 **만들어 준다.**
   *
   *   왜: [라우트 추가] 로 listPaged 를 고르면 컨트롤러에는 `this.snackService.listPaged(...)` 가 들어가는데
   *       서비스에는 listPaged 가 없어 호출이 500 이었다. 튜토리얼은 "유형을 고르면 코드가 들어간다" 고 말한다 —
   *       서비스 쪽도 그래야 맞다.
   *   어떻게:
   *     · 콘솔이 만든 서비스(사이드카 메타가 있고, 파일이 메타대로 재생성한 것과 같음) → 메서드를 더해 재생성
   *     · 손으로 고친 서비스 → 메서드 코드만 클래스 끝에 덧붙인다 (기존 코드는 손대지 않는다)
   *     · 서비스가 없거나 SQL 파일을 모르면 건너뛰고 이유를 돌려준다
   *   실패해도 컨트롤러 저장은 이미 끝난 뒤라 던지지 않는다.
   */
  async _syncServiceMethods(meta, controllerCode = '') {
    try {
      const STD = new Set(['list', 'listPaged', 'getById', 'create', 'update', 'remove']);
      const needed = [...new Set((meta.routes || []).map((r) => r.type).filter((t) => STD.has(t)))];
      if (!needed.length) return null;
      const serviceName = meta.serviceName || this._extractAutowired(controllerCode)[0]?.serviceName
        || `${String(meta.name).replace(/Controller$/, '')}Service`;
      if (!container.has('ServiceMetaService')) return null;
      const svcMeta = container.resolve('ServiceMetaService');
      const info = await svcMeta.findById(serviceName);
      if (!info) return { service: serviceName, skipped: 'no-service' };
      const source = info.source || '';
      const missing = needed.filter((m) => !new RegExp(`async\\s+${m}\\s*\\(`).test(source));
      if (!missing.length) return { service: serviceName, added: [] };
      const sqlFile = info.sql_file || info.sqlFile;
      if (!sqlFile) return { service: serviceName, skipped: 'no-sql-file', missing };

      const filePath = svcMeta._existingServiceFilePath(serviceName);
      const methods = Array.isArray(info.methods) ? info.methods : [];
      const regenerated = info.hasMeta
        ? generateServiceCodeStandalone({ name: serviceName, sqlFile, description: info.description, methods, multiSqlMethods: info.multiSqlMethods || [] }, path.dirname(filePath))
        : null;
      if (regenerated && regenerated === source) {
        // 콘솔이 만든 그대로 — 메서드를 더해 정식으로 재생성 (메타도 함께 갱신)
        await svcMeta.update(serviceName, { name: serviceName, sqlFile, description: info.description, methods: [...methods, ...missing], multiSqlMethods: info.multiSqlMethods || [] });
        this.log.info(`[meta:controller] ${serviceName} — methods added (regenerated): ${missing.join(', ')}`);
        return { service: serviceName, added: missing, how: 'regenerated' };
      }
      // 손으로 고친 파일 — 클래스의 마지막 닫는 괄호 앞에 메서드만 덧붙인다
      const snippets = missing.map((m) => generateServiceMethodCode(m, sqlFile)).filter(Boolean);
      if (!snippets.length) return { service: serviceName, skipped: 'no-template', missing };
      const at = source.lastIndexOf('}');
      if (at < 0) return { service: serviceName, skipped: 'no-class-end', missing };
      const patched = source.slice(0, at).replace(/\s+$/, '') + '\n\n' + snippets.join('\n\n') + '\n' + source.slice(at);
      await svcMeta.update(serviceName, { name: serviceName, sqlFile, description: info.description, methods: [...methods, ...missing], multiSqlMethods: info.multiSqlMethods || [] }, patched);
      this.log.info(`[meta:controller] ${serviceName} — methods added (appended): ${missing.join(', ')}`);
      return { service: serviceName, added: missing, how: 'appended' };
    } catch (e) {
      this.log.warn(`[meta:controller] could not sync service methods (ignored): ${e.message}`);
      return { skipped: 'error', message: e.message };
    }
  }

  /** 컨트롤러 삭제 — 라우터 해제 + 파일 삭제 */
  async remove(id) {
    this._assertNotLegacy(id, '삭제');
    const existing = await this.findById(id);
    if (!existing) throw Object.assign(new Error('not found'), { status: 404 });

    if (_app && existing.basePath) {
      unregisterControllerByBasePath(_app, existing.basePath);
    }

    const filePath = this._existingControllerPath(existing.name) || this._controllerFilePath(existing.name);
    await safeUnlink(filePath);
    await deleteMeta(filePath);

    return { id: existing.name };
  }

  /* ─── 내부 ─── */

  /** src/controller 폴더의 모든 .js / .ts 파일 스캔 */
  _scanAllControllers() {
    const out = [];

    /* ★ v1.10.42 — **모든 폴더**를 훑는다 (작업 폴더 포함).
       한 곳만 보면 콘솔에서 만든 파일이 목록에서 사라진다. */
    for (const dir of existingDirs('controllers')) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isFile()) continue;
        if (!/\.(m?js|ts)$/.test(e.name)) continue;
        const name = e.name.replace(/\.(m?js|ts)$/, '');
        const filePath = path.join(dir, e.name);
        out.push(this._buildControllerInfo(name, filePath, /* withSource */ false));
      }
    }

    // 2) legacy/controller/*.js — ubiaccess 호환 레이어 (phase 3)
    //    legacy 로더가 globalThis.__legacyControllers 에 등록된 메타를 노출함.
    //    여기서 admin UI 용으로 기존 스키마 (_buildControllerInfo 와 같은 shape)에 맞춰 변환.
    try {
      const legacyMetas = globalThis.__legacyControllers;
      if (Array.isArray(legacyMetas)) {
        for (const meta of legacyMetas) {
          out.push(this._buildLegacyControllerInfo(meta));
        }
      }
    } catch (e) {
      this.log.warn(`[ControllerMeta] could not collect legacy controllers: ${e.message}`);
    }

    // 이름순 정렬
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  /**
   * legacy(ubiaccess) 컨트롤러 메타를 admin UI 가 기대하는 shape 으로 변환.
   *
   *  legacy/loader.mjs 가 반환하는 원본 메타:
   *    { name, basePath, file, kind: 'DB'|'MCI', legacy: true,
   *      routes: [{ method, path, handler }, ...] }
   *
   *  admin UI 가 기대하는 shape:
   *    { id, name, base_path, basePath, controller_type, description,
   *      file_path, routes, registered, hasMeta, legacy, ... }
   */
  _buildLegacyControllerInfo(meta) {
    let createdAt = null;
    let updatedAt = null;
    try {
      if (meta.file && fs.existsSync(meta.file)) {
        const stat = fs.statSync(meta.file);
        createdAt = this._fmtTs(stat.birthtime);
        updatedAt = this._fmtTs(stat.mtime);
      }
    } catch { /* noop */ }

    // controller_type: 'DB OLD' 또는 'MCI OLD' — 프론트의 배지 로직이 split 해서 두 배지로 표시.
    const controllerType = `${meta.kind || 'DB'} OLD`;

    // routes: legacy 메타의 shape 을 그대로 수용 (method, path, handler)
    // UI 테이블 배지는 length 만 보므로 그대로 통과.
    // Phase 28 (patch-07): handler 와 handlerName 둘 다 채워 일관성 유지.
    const routes = (meta.routes || []).map((r) => {
      const handler = r.handler || r.handlerName;
      return {
        method: r.method,
        path: r.path,
        handler:     handler || null,
        handlerName: r.handlerName || handler || null,
        type: 'legacy',
      };
    });

    const filePathRel = meta.file
      ? displayPath(meta.file)
      : null;

    return {
      id: meta.name,
      name: meta.name,
      base_path: meta.basePath ?? null,
      basePath:  meta.basePath ?? null,
      controller_type: controllerType,            // 'DB OLD' | 'MCI OLD'
      service_name: null,
      autowired_services: [],
      description: 'ubiaccess 호환 레이어 — 읽기 전용',
      auth: false,
      roles: [],
      file_path: filePathRel,
      routes,
      registered: true,                           // legacy 로더가 등록했다는 뜻
      hasMeta: false,                             // 사이드카 메타는 없음
      mci: null,
      legacy: true,                               // 프론트가 편집/삭제 비활성화 판단용
      kind: meta.kind || 'DB',                    // 'DB' | 'MCI' (OLD 접미 없이 원시 값)
      created_at: createdAt,
      updated_at: updatedAt,
    };
  }

  /** 등록 상태 + 파일 정보 + 사이드카 메타 결합 */
  _buildControllerInfo(name, filePath, withSource) {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const registered = listRegisteredControllers().find(
      (c) => c.name === name || c.file === filePath,
    );
    const meta = readMeta(filePath);  // 사이드카 메타 (있으면 multiSql 등 복원)

    // routes 우선순위: 메타 > 라우터 등록상태
    let routes = meta?.routes ?? registered?.routes ?? [];

    /* ★ v1.8.5 — 옛 판이 저장해 둔 화면 전용 필드를 걸러 낸다.
       v1.8.4 까지는 편집기가 라우트 객체를 통째로 저장해, 접힘 상태와
       **계산으로 복원할 수 있는 파생값**(`_sqlQueries`, `_serviceMethods`)까지
       사이드카 메타에 박혔다. 그 중 `_sqlQueries: []` 가 다음 편집 때
       계산값을 덮어써(빈 배열은 JS 에서 truthy) SQL 연결이 '없음' 으로 굳었다.

       클라이언트도 v1.8.5 에서 저장하지 않도록 고쳤지만, **이미 저장된 파일**이
       남아 있으므로 읽는 쪽에서도 걸러야 한다. 파생값은 편집기가 열 때 다시 계산한다. */
    const UI_ONLY = ['expanded', '_showServices', '_showSqls', '_svcPickerOpen', '_sqlPickerOpen',
      '_serviceMethods', '_sqlQueries'];
    routes = routes.map((r) => {
      if (!r || typeof r !== 'object') return r;
      const out = { ...r };
      for (const k of UI_ONLY) delete out[k];
      return out;
    });
    routes = routes.map((r) => {
      // Phase 28 (patch-07): meta 파일은 `handlerName` 필드를 쓰는데 클라이언트들은
      //  대부분 `r.handler` 를 쓰므로, 서버에서 normalize 해서 둘 다 채워서 내려보낸다.
      //  이전에는 ScreenWizardModal 의 radio 가 `undefined === undefined` 로 모두 체크된
      //  것처럼 보여 @change 이벤트가 안 터지는 버그가 있었음 (다음 버튼 활성화 안 됨).
      const handler = r.handler || r.handlerName;
      const normalized = {
        ...r,
        handler:     handler || null,
        handlerName: r.handlerName || handler || null,
      };
      if (normalized.type && normalized.type !== 'custom') return normalized;
      return { ...normalized, type: this._inferRouteType(normalized) };
    });

    /* 파일에 적힌 @Controller('/api/xxx') — meta 가 없을 때의 근거가 된다 */
    const basePathFromSource = (/@Controller\(\s*['"]([^'"]+)['"]/.exec(content) || [])[1] || null;

    // ★ @Autowired 파싱 → 주입된 서비스 목록
    const autowiredServices = this._extractAutowired(content);
    // service_name: 메타 > @Autowired 중 첫 번째 > null
    const service_name = meta?.serviceName ?? (autowiredServices.length > 0 ? autowiredServices[0].serviceName : null);

    const info = {
      id: name,
      name,
      /* ★ v1.30.0 — meta 도 없고 라우터 등록도 아직이면 **파일에서 직접 읽는다.**
         예전에는 여기가 null 이 되어 목록에 "미등록" 으로 보였다.
         편집기로 직접 넣은 컨트롤러가 정확히 그 경우다 — 파일에는 @Controller('/api/supply') 가
         멀쩡히 적혀 있는데 화면은 경로를 모른다고 말하는 셈이었다.
         meta 파일은 콘솔이 만들 때만 생기는 것이므로, 없다고 문제일 이유가 없다. */
      base_path: meta?.basePath ?? registered?.basePath ?? basePathFromSource ?? null,
      basePath:  meta?.basePath ?? registered?.basePath ?? basePathFromSource ?? null,
      // 컨트롤러 유형. 앞으로 'DB' | 'DB OLD' | 'MCI' | 'MCI OLD' 등 확장 예정.
      // 메타에 controllerType 이 있으면 그 값을, 없으면 기본값 'DB' 를 사용.
      controller_type: meta?.controllerType ?? 'DB',
      service_name,
      autowired_services: autowiredServices,  // ★ [{ serviceName, propertyName }]
      description: meta?.description || this._descriptionFromSource(content, name),
      auth: meta?.auth ?? false,
      roles: meta?.roles ?? [],
      file_path: displayPath(filePath),
      // ★ v1.10.42 — 'workspace'(내가 만든 것) | 'builtin'(예제)
      origin: isWorkspaceFile(filePath) ? 'workspace' : 'builtin',
      routes,
      registered: !!registered,
      hasMeta: !!meta,
      // MCI 컨트롤러의 경우 원본 설정을 그대로 노출 (편집 UI 에서 복원용)
      mci: meta?.mci ?? null,
      created_at: this._fmtTs(stat.birthtime),
      updated_at: this._fmtTs(stat.mtime),
    };
    if (withSource) {
      info.source = content;
    }
    return info;
  }

  _validateMeta(meta) {
    // Phase 35 (patch-14): PascalCase 엄격 — mciCodeGenerator 의 검증과 일치.
    //  이전: /^[A-Za-z][...]/ (소문자 첫글자 허용) — 두 파일의 검증이 달라 호출 경로에 따라 다른 에러.
    //  통일 후: 첫 글자 반드시 대문자.
    if (!meta?.name || !/^[A-Z][A-Za-z0-9_]*Controller$/.test(meta.name)) {
      throw Object.assign(
        new Error('name 은 PascalCase + Controller 끝 (예: ProductController)'),
        { status: 400 },
      );
    }
    if (!meta?.basePath || !/^\/[A-Za-z0-9/_:.-]*$/.test(meta.basePath)) {
      throw Object.assign(
        new Error('basePath 형식이 잘못되었습니다 (예: /api/products)'),
        { status: 400 },
      );
    }
    if (!Array.isArray(meta.routes) || meta.routes.length === 0) {
      throw Object.assign(
        new Error('routes 가 1개 이상 있어야 합니다'),
        { status: 400 },
      );
    }
    // 실시간(SSE) 검증
    const sseRoutes = meta.routes.filter((r) => r.type === 'sse');
    if (sseRoutes.length > 1) {
      throw Object.assign(
        new Error('실시간 스트림(SSE) 라우트는 컨트롤러당 1개만 만들 수 있습니다'),
        { status: 400 },
      );
    }
    if (meta.realtime?.enabled || sseRoutes.length > 0) {
      const channel = meta.realtime?.channel || suggestChannel(meta.basePath, meta.name);
      if (!CHANNEL_RE.test(channel)) {
        throw Object.assign(
          new Error('채널 이름은 영문 소문자로 시작하고 소문자·숫자·-·_·: 만 쓸 수 있습니다 (예: snacks)'),
          { status: 400 },
        );
      }
    }

    // multiSql 라우트 추가 검증
    for (const r of meta.routes) {
      if (r.type !== 'multiSql') continue;
      if (!Array.isArray(r.sqlSteps) || r.sqlSteps.length === 0) {
        throw Object.assign(
          new Error(`'${r.handlerName || 'multiSql route'}' 의 sqlSteps 가 1개 이상 필요합니다`),
          { status: 400 },
        );
      }
      for (const st of r.sqlSteps) {
        if (!st.sqlFile || !/^[a-z][a-z0-9_]*$/.test(st.sqlFile)) {
          throw Object.assign(
            new Error(`sqlSteps 의 sqlFile 형식이 잘못되었습니다: ${st.sqlFile}`),
            { status: 400 },
          );
        }
        if (!st.queryName) {
          throw Object.assign(
            new Error(`sqlSteps 의 queryName 이 비어있습니다`),
            { status: 400 },
          );
        }
        if (!st.varName || !/^[a-zA-Z_$][\w$]*$/.test(st.varName)) {
          throw Object.assign(
            new Error(`sqlSteps 의 varName 이 잘못되었습니다: ${st.varName}`),
            { status: 400 },
          );
        }
      }
    }
  }

  _controllerFilePath(name) {
    // 보안: id/name 은 URL 파라미터로 들어오므로 경로 문자(.., /)를 차단한다 (경로 탈출 → 임의 파일 읽기/삭제 방지)
    assertSafeId(name, 'name');
    /* ★ v1.10.42 — 새 파일은 **작업 폴더**로. 예제와 섞이지 않게 한다. */
    return path.join(writeDirFor('controllers'), `${name}.js`);
  }

  /** ★ v1.11.1 — 이미 있는 파일은 있는 곳에서 (작업 폴더 → src/controller 순). 없으면 null */
  _existingControllerPath(name) {
    assertSafeId(name, 'name');
    return findExistingFile('controllers', [`${name}.js`, `${name}.mjs`, `${name}.ts`]);
  }

  _ensureParentDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  /** 코드에서 @Autowired('ServiceName') propertyName 패턴 추출 */
  _extractAutowired(content) {
    const results = [];
    const re = /@Autowired\(\s*['"]([^'"]+)['"]\s*\)\s+(\w+)/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      results.push({ serviceName: m[1], propertyName: m[2] });
    }
    return results;
  }

  /** 라우트 패턴에서 type 추론 (메타 없는 기존 컨트롤러용) */
  _inferRouteType(r) {
    if (Array.isArray(r.sqlSteps) && r.sqlSteps.length > 0) return 'multiSql';
    const m = (r.method || 'get').toLowerCase();
    const p = r.path || '/';
    const h = (r.handlerName || r.handler || '').toLowerCase();
    if (m === 'get' && p === '/' && (h === 'list' || h === 'findall')) return 'list';
    if (m === 'get' && /^\/paged/i.test(p)) return 'listPaged';
    if (m === 'get' && /^\/:[\w]+$/.test(p) && (h === 'get' || h.includes('byid'))) return 'getById';
    if (m === 'post' && p === '/' && h === 'create') return 'create';
    if ((m === 'put' || m === 'patch') && /^\/:[\w]+$/.test(p)) return 'updateName';
    if (m === 'delete' && /^\/:[\w]+$/.test(p)) return 'remove';
    return 'custom';
  }

  _fmtTs(d) {
    if (!d) return null;
    return d.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' ');
  }

  /* =========================================================
   * Phase 22: Controller 의 입/출력 파라미터 분석.
   *  id = 파일명 (확장자 없음, 예: 'StudentController')
   *
   * 반환 형태:
   *   {
   *     id, name, type, isLegacy,
   *     services: [{ name, propertyName, filePath, sqls: ['student'] }],
   *     sqlFiles: [{ name, filePath, queries: [{ name, type, inputParams, outputColumns }] }],
   *     note: string (MCI 인 경우 설명)
   *   }
   *
   * DB Controller:
   *   1) controller 소스에서 @Autowired('XxxService') → service 이름 수집
   *   2) 각 service 파일에서 @Sql('yyy') → SQL 파일명 수집
   *   3) SQL 파일에서 -- @name: 쿼리 구획 분석:
   *      - 입력: :param 정규식 (::cast 제외)
   *      - 출력: SELECT 컬럼 파싱 (AS alias 지원)
   *
   * MCI Controller:
   *   route 의 request/response mapper 정보를 그대로 노출 (메타 기반).
   * ========================================================= */
  async analyzeParameters(id) {
    const all = this._scanAllControllers();
    const ctrl = all.find((c) => c.id === id);
    if (!ctrl) {
      throw Object.assign(new Error(`컨트롤러 없음: ${id}`), { status: 404 });
    }

    const result = {
      id: ctrl.id,
      name: ctrl.name,
      type: ctrl.controller_type || 'DB',
      isLegacy: !!ctrl.isLegacy,
      services: [],
      sqlFiles: [],
      note: null,
    };

    // MCI 는 mapper 기반이라 다른 파싱 경로
    if ((result.type || '').toUpperCase().includes('MCI')) {
      result.note = 'MCI 컨트롤러는 request/response mapper 로 입/출력이 결정됩니다. 각 route 의 메타에서 mapper 정보를 확인하세요.';
      return result;
    }

    // DB controller → service + SQL 파싱
    const filePath = this._existingControllerPath(ctrl.id);
    if (!filePath || !fs.existsSync(filePath)) {
      result.note = '컨트롤러 파일을 찾을 수 없습니다.';
      return result;
    }

    const controllerSrc = fs.readFileSync(filePath, 'utf8');
    const services = this._extractAutowired(controllerSrc) || [];

    for (const svc of services) {
      const svcFile = this._findServiceFile(svc.serviceName);
      const svcInfo = {
        name: svc.serviceName,
        propertyName: svc.propertyName,
        filePath: svcFile ? displayPath(svcFile) : null,
        sqls: [],
      };

      if (svcFile && fs.existsSync(svcFile)) {
        const svcSrc = fs.readFileSync(svcFile, 'utf8');
        const sqlBindings = this._extractSqlBindings(svcSrc);
        svcInfo.sqls = sqlBindings.map((b) => b.sqlName);

        for (const binding of sqlBindings) {
          const sqlFile = this._findSqlFile(binding.sqlName);
          if (!sqlFile) continue;
          const sqlSrc = fs.readFileSync(sqlFile, 'utf8');
          const queries = this._parseSqlQueries(sqlSrc);
          result.sqlFiles.push({
            name: binding.sqlName,
            filePath: displayPath(sqlFile),
            queries,
          });
        }
      }

      result.services.push(svcInfo);
    }

    return result;
  }

  /** controller 소스에서 @Autowired('XxxService') propName 패턴 추출 */
  // _extractAutowired 는 이미 존재 — 반환 형태 확인용. 아래에서 사용.

  /** service 파일의 @Sql('name') propName 바인딩들 추출 */
  _extractSqlBindings(src) {
    const out = [];
    // @Sql('name') propName 또는 @Sql("name") propName 패턴
    const re = /@Sql\s*\(\s*['"]([^'"]+)['"]\s*\)\s*(\w+)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      out.push({ sqlName: m[1], propertyName: m[2] });
    }
    return out;
  }

  /** Service 파일 경로 추정 */
  _findServiceFile(className) {
    const candidates = [
      path.resolve(projectRoot, 'src', 'service', `${className}.js`),
      path.resolve(projectRoot, 'src', 'service', `${className}.ts`),
      path.resolve(projectRoot, 'src', 'service', `${className}.mjs`),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /** SQL 파일 경로 추정 */
  _findSqlFile(name) {
    const candidates = [
      path.resolve(projectRoot, 'src', 'database', 'sql', `${name}.sql`),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /**
   * SQL 파일 내용 파싱 → 각 `-- @name: xxx` 블록별 { name, type, inputParams, outputColumns }
   */
  _parseSqlQueries(src) {
    const out = [];
    // `-- @name: xxx` 로 블록 분리
    const blocks = String(src).split(/^\s*--\s*@name\s*:\s*/im);
    // 첫 블록은 preamble
    for (let i = 1; i < blocks.length; i++) {
      const lines = blocks[i].split('\n');
      const name = (lines[0] || '').trim();
      const body = lines.slice(1).join('\n');
      // 다음 `-- @name` 시작 전까지만 body (split 이 이미 해결)
      // 주석 제거 (단일 라인만)
      const cleanBody = body
        .split('\n')
        .filter((l) => !/^\s*--/.test(l))
        .join('\n')
        .trim();

      const type = this._detectSqlType(cleanBody);
      const inputParams = this._extractSqlParams(cleanBody);
      const outputColumns = type === 'SELECT'
        ? this._extractSelectColumns(cleanBody)
        : [];

      out.push({ name, type, inputParams, outputColumns });
    }
    return out;
  }

  _detectSqlType(body) {
    const trimmed = body.replace(/^\s+/, '').toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  /** :param 추출 (::cast 는 제외). 순서 유지 + 중복 제거. */
  _extractSqlParams(body) {
    // 문자열 리터럴 제거 (작은따옴표 안의 :는 무시)
    const noStrings = body.replace(/'[^']*'/g, "''");
    const re = /(?<!:):(\w+)/g;   // :: 가 아닌 : 뒤의 \w+
    const seen = new Set();
    const out = [];
    let m;
    while ((m = re.exec(noStrings)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        out.push(m[1]);
      }
    }
    return out;
  }

  /**
   * SELECT 절의 컬럼 파싱 — `SELECT ... FROM` 사이의 표현식을 콤마로 split.
   *   각 표현식:
   *    - 'xxx AS alias'   → alias
   *    - 'table.col'      → col
   *    - 'func(a, b)'     → func(a, b) (alias 없으면 표현식 그대로)
   *    - '*'              → '*'
   * 간단한 heuristic; 복잡한 CTE/서브쿼리는 정확하지 않을 수 있음.
   */
  _extractSelectColumns(body) {
    const cleaned = body.replace(/\s+/g, ' ');
    const m = cleaned.match(/SELECT\s+(.*?)\s+FROM\s/i);
    if (!m) return [];
    const rawCols = m[1];
    // 괄호 depth 고려해서 콤마 split
    const cols = this._splitTopLevel(rawCols, ',');
    return cols.map((c) => {
      const trimmed = c.trim();
      // AS alias
      const asMatch = trimmed.match(/\s+AS\s+["`]?(\w+)["`]?\s*$/i);
      if (asMatch) {
        return { expression: trimmed.replace(/\s+AS\s+.*$/i, '').trim(), name: asMatch[1] };
      }
      // table.col → col
      const dotMatch = trimmed.match(/^([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)$/);
      if (dotMatch) return { expression: trimmed, name: dotMatch[2] };
      // 단순 identifier
      const idMatch = trimmed.match(/^[a-zA-Z_]\w*$/);
      if (idMatch) return { expression: trimmed, name: trimmed };
      // 식 — alias 없으면 expression 그대로
      return { expression: trimmed, name: trimmed.length > 30 ? trimmed.slice(0, 30) + '…' : trimmed };
    });
  }

  /** 괄호 depth 를 고려한 top-level split (comma 기준) */
  _splitTopLevel(s, delim) {
    const out = [];
    let depth = 0;
    let buf = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      if (c === delim && depth === 0) {
        out.push(buf);
        buf = '';
      } else {
        buf += c;
      }
    }
    if (buf.trim()) out.push(buf);
    return out;
  }
}
