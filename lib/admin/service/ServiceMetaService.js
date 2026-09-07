/**
 * ServiceMetaService — 일반 service 폴더(src/service/*.js)의 모든 파일 관리.
 *
 *  진실의 원천:
 *   - 디스크: src/service/*.js
 *   - 메모리: container.has(name)
 *
 *  목록 / 조회 / 추가 / 수정 / 삭제 + 코드 자동 생성 + 동적 컨테이너 등록
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeDirFor, existingDirs, isWorkspaceFile, findExistingFile } from '../../../src/core/appPaths.js';
import { fileURLToPath } from 'node:url';

import { Service, Log } from '../../../src/core/decorators.js';
import { assertSafeId } from '../../../src/core/security.js';

import container from '../../../src/core/container.js';
import { loadSingleServiceFile } from '../../../src/core/controllerLoader.js';
import {
  generateServiceCodeStandalone,
  getServiceMethodCatalog,
} from './codeGenerator.js';
import { writeMeta, readMeta, deleteMeta } from './metaStorage.js';
import { safeWriteFile, safeUnlink } from './safeFs.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..', '..');

@Service('ServiceMetaService')
export default class ServiceMetaService {

  @Log log;

  getMethodCatalog() {
    return getServiceMethodCatalog();
  }

  generate(meta) {
    return generateServiceCodeStandalone(meta, writeDirFor('services'));
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

  /** 셀렉트박스용 — Controller 화면에서 사용 */
  async listAll() {
    return this._scanAll().map((s) => ({
      id: s.id, name: s.name, sql_file: s.sql_file, description: s.description,
      methods: s.methods || [],
      multiSqlMethods: s.multiSqlMethods || [],
      /**
       * ★ v1.8.3 — 메서드별 SQL 쿼리 매핑을 함께 내보낸다.
       *
       *  `_buildInfo()` 가 이미 소스를 파싱해 `{ list: 'findAll', getById: 'findById', ... }`
       *  를 만들어 두는데, 여기서 빼고 있었다. 그 결과 컨트롤러 편집기가
       *  **라우트 → 서비스 메서드까지는 알아도 그 메서드가 쓰는 SQL 을 알 방법이 없어**
       *  [SQL] 팝오버가 언제나 '없음' 으로 나왔다.
       *
       *  multiSqlMethods 의 단계도 함께 담는다 — 다단계 메서드는 여러 SQL 을 쓴다.
       */
      method_sql_map: s.method_sql_map || {},
      multiSqlSteps: Object.fromEntries(
        (s.multiSqlMethods || []).map((m) => [
          m.name,
          (m.sqlSteps || []).filter((st) => st.sqlFile && st.queryName)
            .map((st) => `${st.sqlFile}.${st.queryName}`),
        ]),
      ),
    }));
  }

  /** id = 파일명 (예: 'StudentService') */
  async findById(id) {
    // ★ v1.11.1 — 있는 곳에서 찾는다 (작업 폴더 → src/service). 예전에는 쓰기 폴더만 봐서 작업 폴더를 켜면 기존 파일이 열리지 않았다
    const filePath = this._existingServiceFilePath(id);
    if (!filePath) return null;
    return this._buildInfo(id, filePath, /* withSource */ true);
  }

  async create(input, customCode) {
    this._validateMeta(input);

    const filePath = this._serviceFilePath(input.name);
    if (fs.existsSync(filePath) || this._existingServiceFilePath(input.name)) {
      throw Object.assign(
        new Error(`이미 존재하는 Service 파일: ${input.name}.js`),
        { status: 409 },
      );
    }

    const code = customCode ?? generateServiceCodeStandalone(input, path.dirname(filePath));
    this._ensureParentDir(filePath);
    await safeWriteFile(filePath, code);
    await writeMeta(filePath, {
      name: input.name,
      sqlFile: input.sqlFile,
      description: input.description,
      methods: input.methods,
      multiSqlMethods: input.multiSqlMethods,
    });

    try {
      await loadSingleServiceFile(filePath);
      this.log.info(`[meta:service] 동적 등록: ${input.name}`);
    } catch (e) {
      this.log.error(`[meta:service] 동적 등록 실패: ${e.message}`);
      throw Object.assign(
        new Error(`동적 등록 실패: ${e.message}`),
        { status: 500 },
      );
    }

    return { id: input.name, filePath };
  }

  async update(id, input, customCode) {
    const existing = await this.findById(id);
    if (!existing) throw Object.assign(new Error('not found'), { status: 404 });
    this._validateMeta(input);

    // ★ v1.11.1 — 제자리 수정 (작업 폴더에 사본을 만들지 않는다). 이름을 바꿔도 같은 폴더 안에서
    const oldPath = this._existingServiceFilePath(existing.name) || this._serviceFilePath(existing.name);
    const filePath = existing.name === input.name ? oldPath : path.join(path.dirname(oldPath), `${input.name}.js`);
    const code = typeof customCode === 'function'
      ? customCode(path.dirname(filePath))
      : (customCode ?? generateServiceCodeStandalone(input, path.dirname(filePath)));

    if (existing.name !== input.name) {
      if (fs.existsSync(filePath) || this._existingServiceFilePath(input.name)) {
        throw Object.assign(
          new Error(`이미 존재하는 Service 파일: ${input.name}.js`),
          { status: 409 },
        );
      }
      await safeUnlink(oldPath);
      await deleteMeta(oldPath);
    }

    this._ensureParentDir(filePath);
    await safeWriteFile(filePath, code);
    await writeMeta(filePath, {
      name: input.name,
      sqlFile: input.sqlFile,
      description: input.description,
      methods: input.methods,
      multiSqlMethods: input.multiSqlMethods,
    });

    try {
      await loadSingleServiceFile(filePath);
    } catch (e) {
      this.log.error(`[meta:service] update 후 동적 로딩 실패: ${e.message}`);
      throw Object.assign(
        new Error(`동적 로딩 실패: ${e.message}`),
        { status: 500 },
      );
    }

    return { id: input.name, filePath };
  }

  async remove(id) {
    const existing = await this.findById(id);
    if (!existing) throw Object.assign(new Error('not found'), { status: 404 });

    const filePath = this._existingServiceFilePath(existing.name) || this._serviceFilePath(existing.name);
    await safeUnlink(filePath);
    await deleteMeta(filePath);

    return { id: existing.name };
  }

  /* ─── 내부 ─── */

  _scanAll() {
    /* ★ v1.10.42 — 모든 폴더를 훑는다 (작업 폴더 포함).
       한 곳만 보면 콘솔에서 만든 파일이 목록에서 사라진다. */
    const out = [];
    for (const dir of existingDirs('services')) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!e.isFile() || !/\.(m?js|ts)$/.test(e.name)) continue;
        const name = e.name.replace(/\.(m?js|ts)$/, '');
        const filePath = path.join(dir, e.name);
        out.push(this._buildInfo(name, filePath, /* withSource */ false));
      }
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  /** 파일 내용에서 @Sql('xxx') 패턴 파싱 — 참조 SQL 알아내기 */
  _extractSqlFile(content) {
    const m = content.match(/@Sql\(\s*['"]([a-z][a-z0-9_]*)['"]\s*\)/i);
    return m ? m[1] : null;
  }

  /** export default class XxxService 안의 async 메서드 목록 추출 */
  _extractMethods(content) {
    const out = [];
    const re = /^\s+async\s+([a-zA-Z_$][\w$]*)\s*\(/gm;
    let m;
    while ((m = re.exec(content)) !== null) out.push(m[1]);
    return out;
  }

  /**
   * Service 소스에서 method 별 첫 번째 `this.xxxSql.get('QUERYNAME')` 호출의 QUERYNAME 추출.
   *  반환: { methodName: queryName, ... }
   *
   *  Option B 의 핵심 입력 — UI 가 "이 메서드가 실제로 어느 SQL 쿼리를 호출하는가" 를
   *  표시할 수 있도록 한다. 사이드카 메타가 없거나 (사용자가 손으로 작성한 service),
   *  메타에 sqlQueryName 매핑이 누락된 경우에도 표시 일관성을 보장.
   *
   *  방식: 정규식으로 모든 `async name(...) {` 위치를 찾고, 각 method 시작 ~ 다음 method 시작
   *        (없으면 파일 끝) 사이의 body 안에서 첫 `.get('NAME')` 호출의 NAME 을 캡처.
   *        엄밀한 brace 매칭은 아니지만 일반적인 한 메서드/한 SQL 호출 패턴에서는 정확.
   */
  _extractMethodSqlMap(content) {
    const map = {};
    const methodRe = /^\s{2,}async\s+([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{/gm;
    const matches = [];
    let mm;
    while ((mm = methodRe.exec(content)) !== null) {
      matches.push({ name: mm[1], start: mm.index + mm[0].length });
    }
    for (let i = 0; i < matches.length; i++) {
      const end = (i + 1 < matches.length) ? matches[i + 1].start : content.length;
      const body = content.slice(matches[i].start, end);
      const gm = /\.\s*get\(\s*['"]([a-zA-Z_][\w]*)['"]\s*\)/.exec(body);
      if (gm) map[matches[i].name] = gm[1];
    }
    return map;
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

  /** 예전 이름 — 호출부가 그대로 쓰도록 남겨 둔다 */
  _extractDescription(content, name = '') {
    return this._descriptionFromSource(content, name);
  }

  _buildInfo(name, filePath, withSource) {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const meta = readMeta(filePath);  // 사이드카 메타 (있으면 multiSqlMethods 등 복원)

    // 메타가 있으면 우선, 없으면 코드 파싱 결과
    const sql_file = meta?.sqlFile ?? this._extractSqlFile(content);
    const methods = meta?.methods ?? this._extractMethods(content);
    const description = meta?.description || this._extractDescription(content, name);
    const multiSqlMethods = meta?.multiSqlMethods ?? [];
    const registered = container.has(name);

    // Option B: 소스에서 메서드별 SQL 쿼리 이름 추출 — UI 의 표시 일관성 + 메타 누락 보강용
    const method_sql_map = this._extractMethodSqlMap(content);

    const info = {
      id: name,
      name,
      sql_file,
      description,
      methods,
      multiSqlMethods,
      method_sql_map,  // ★ Option B: { methodName: actualSqlQueryNameInSource }
      methods_json: JSON.stringify(methods),
      file_path: path.relative(projectRoot, filePath).replace(/\\/g, '/'),
      // ★ v1.10.42 — 'workspace'(내가 만든 것) | 'builtin'(예제)
      origin: isWorkspaceFile(filePath) ? 'workspace' : 'builtin',
      registered,
      hasMeta: !!meta,
      created_at: this._fmtTs(stat.birthtime),
      updated_at: this._fmtTs(stat.mtime),
    };
    if (withSource) info.source = content;
    return info;
  }

  _validateMeta(meta) {
    if (!meta?.name || !/^[A-Z][A-Za-z0-9_]*Service$/.test(meta.name)) {
      throw Object.assign(
        new Error('Service 이름은 PascalCase + Service 끝 (예: ProductService)'),
        { status: 400 },
      );
    }
    const methods = Array.isArray(meta.methods) ? meta.methods : [];
    const multiSqlMethods = Array.isArray(meta.multiSqlMethods) ? meta.multiSqlMethods : [];
    if (methods.length === 0 && multiSqlMethods.length === 0) {
      throw Object.assign(
        new Error('methods 또는 multiSqlMethods 가 1개 이상 필요합니다'),
        { status: 400 },
      );
    }
    // Option B: methods 항목은 string 또는 { type, sqlQueryName } 객체 모두 허용
    const idRe = /^[a-zA-Z_$][\w$]*$/;
    for (const m of methods) {
      if (typeof m === 'string') {
        if (!idRe.test(m)) {
          throw Object.assign(
            new Error(`methods 항목 식별자 형식이 잘못되었습니다: ${m}`),
            { status: 400 },
          );
        }
      } else if (m && typeof m === 'object') {
        if (!m.type || !idRe.test(m.type)) {
          throw Object.assign(
            new Error(`methods 객체 항목의 type 이 잘못되었습니다: ${JSON.stringify(m)}`),
            { status: 400 },
          );
        }
        if (m.sqlQueryName != null && m.sqlQueryName !== '' && !idRe.test(m.sqlQueryName)) {
          throw Object.assign(
            new Error(`methods 객체 항목의 sqlQueryName 형식이 잘못되었습니다: ${m.sqlQueryName}`),
            { status: 400 },
          );
        }
      } else {
        throw Object.assign(
          new Error(`methods 항목은 string 또는 객체여야 합니다: ${JSON.stringify(m)}`),
          { status: 400 },
        );
      }
    }
    // 단순 메서드가 있으면 sqlFile 형식 검증
    if (methods.length > 0) {
      if (!meta.sqlFile || !/^[a-z][a-z0-9_]*$/.test(meta.sqlFile)) {
        throw Object.assign(
          new Error('단순 메서드가 있으면 sqlFile 이 필요합니다 (예: product)'),
          { status: 400 },
        );
      }
    }
    // multiSqlMethods 각 항목 검증
    for (const m of multiSqlMethods) {
      if (!m.name || !/^[a-z][a-zA-Z0-9_]*$/.test(m.name)) {
        throw Object.assign(
          new Error(`multiSqlMethods 의 name 이 잘못되었습니다: ${m.name}`),
          { status: 400 },
        );
      }
      if (!Array.isArray(m.sqlSteps) || m.sqlSteps.length === 0) {
        throw Object.assign(
          new Error(`'${m.name}' 의 sqlSteps 가 1개 이상 필요합니다`),
          { status: 400 },
        );
      }
    }
  }

  /** ★ v1.11.1 — 이미 있는 파일은 있는 곳에서. 없으면 null */
  _existingServiceFilePath(name) {
    assertSafeId(name, 'name');
    return findExistingFile('services', [`${name}.js`, `${name}.mjs`, `${name}.ts`]);
  }

  _serviceFilePath(name) {
    // 보안: id/name 은 URL 파라미터로 들어오므로 경로 문자(.., /)를 차단한다 (경로 탈출 → 임의 파일 읽기/삭제 방지)
    assertSafeId(name, 'name');
    // ★ v1.10.42 — 새 파일은 작업 폴더로
    return path.join(writeDirFor('services'), `${name}.js`);
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
