/**
 * WorkspaceLoadService — 개발자가 **직접 넣은 파일**을 찾아 서버에 올린다. (v1.28.0)
 *
 *  왜 필요한가
 *    콘솔에서 만든 컨트롤러·서비스·SQL 은 저장하는 순간 hot-reload 로 올라간다.
 *    그런데 개발자가 편집기로 `workspace/controller/` 에 파일을 직접 넣으면
 *    **목록에는 보이지만 라우팅이 되지 않는다.** 실측:
 *      · 콘솔 컨트롤러 목록 → 보임 (registered: false)
 *      · GET /api/memo/ping → 404
 *    지금까지는 서버를 다시 켜야만 올라왔다. 재기동은 운영 중에 부담이 크다.
 *
 *  무엇을 하나
 *    ① 미로딩 진단: 파일은 있는데 서버에 안 올라온 것을 셋(컨트롤러·서비스·SQL)으로 나눠 알려 준다
 *    ② 올리기: 재기동 없이 지금 올린다
 *
 *  ⚠ 한계 (숨기지 않고 적어 둔다)
 *    · 서비스와 SQL 은 **레지스트리를 통째로 다시 읽는다** — 개별 파일만 올리는 길이 없다.
 *      이미 올라와 있던 것도 새 내용으로 바뀐다(대개 원하는 바이지만, 알고 쓰는 편이 낫다).
 *    · 컨트롤러가 서비스를 @Autowired 로 쓰면 서비스를 먼저 올려야 한다 — 그래서 순서를 SQL → 서비스 → 컨트롤러로 고정한다.
 *    · 문법 오류가 있는 파일은 올리다 실패한다. 실패해도 나머지는 계속 올리고, 무엇이 왜 실패했는지 돌려준다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Service, Log } from '../../../src/core/decorators.js';
import { existingDirs } from '../../../src/core/appPaths.js';
import { loadSingleControllerFile, loadSingleServiceFile, loadServices, listRegisteredControllers } from '../../../src/core/controllerLoader.js';
import { loadSqlFiles, loadSingleSqlFile } from '../../../src/core/sqlLoader.js';
import { metaPathFor, writeMeta } from './metaStorage.js';
import sqlRegistry from '../../../src/core/sqlLoader.js';
import container from '../../../src/core/container.js';

/* 올린 파일의 수정 시각 — 프로세스가 살아 있는 동안만 유지된다 */
const _loadedFiles = new Map();

let _app = null;
/** server.js 가 부팅 후 주입 */
export function setApp(app) { _app = app; }

@Service()
export default class WorkspaceLoadService {
  @Log log;

  /** Express app — server.js 가 부팅 뒤 넣어 준다 (ControllerMetaService 와 같은 방식) */
  _app() {
    /* ★ v1.28.0 — 우리 모듈의 _app 이 비어 있을 수 있다.
       서버는 부팅 때 이 파일을 import 해 setApp() 을 부르지만, 서비스 로더가 이미
       같은 파일을 다른 URL(캐시 우회 등)로 읽어 두면 **모듈 인스턴스가 갈라져**
       주입이 한쪽에만 들어간다. 실측에서 컨트롤러 개별 올리기만 503 이 났다.
       그래서 같은 app 을 이미 받아 둔 ControllerMetaService 에서 빌려 온다. */
    if (_app) return _app;
    /* 같은 app 을 이미 받아 둔 ControllerMetaService 에서 빌려 온다.
       (동적 import 라 위쪽 정적 import 와 인스턴스가 갈리지 않는다) */
    if (globalThis.__aidotExpressApp) return globalThis.__aidotExpressApp;
    throw Object.assign(new Error('서버가 아직 준비되지 않았습니다'), { status: 503 });
  }

  /** 지금 올라와 있는 컨트롤러 — 로더가 관리하는 등록표를 그대로 읽는다.
   *  ⚠ 라우터 스택을 파헤치는 방법은 쓰지 않는다: Express 5 는 하위 라우터의 마운트 경로가
   *    layer.path 에 남지 않아 `/api/auth` 대신 `/login` 만 잡혔다(실측 16건 과탐지).
   *    로더가 basePath → 정보 맵을 이미 들고 있으므로 그것이 유일한 진실이다. */
  _registered() {
    try { return listRegisteredControllers() || []; } catch { return []; }
  }

  /** app 을 확보한다 — 우리 것이 없으면 ControllerMetaService 에서 가져온다 */
  async _resolveApp() {
    try { return this._app(); } catch (e) {
      const mod = await import('./ControllerMetaService.js');
      const borrowed = mod.getApp?.();
      if (borrowed) return borrowed;
      throw e;
    }
  }

  /**
   * 올린 파일의 **수정 시각**을 기억한다.
   *  키: `${kind}:${절대경로}` · 값: mtimeMs
   *  파일을 지웠다 같은 이름으로 새로 넣으면 mtime 이 달라져 "안 올라옴" 이 된다.
   */
  _mark(kind, file) {
    try { _loadedFiles.set(`${kind}:${file}`, fs.statSync(file).mtimeMs); } catch { /* 무시 */ }
  }

  _isFileLoaded(kind, file) {
    const known = _loadedFiles.get(`${kind}:${file}`);
    if (known === undefined) return false;
    try { return fs.statSync(file).mtimeMs === known; } catch { return false; }
  }

  /** 부팅이 읽어 올린 것들을 "올라옴" 으로 채운다 (server.js 가 부팅 끝에 부른다) */
  seedLoadedAtBoot() {
    let meta = 0;
    for (const [kind, dirKind, exts] of [
      ['service', 'services', /\.(m?js|ts)$/],
      ['sql', 'sql', /\.sql$/],
      ['controller', 'controllers', /\.(m?js|ts)$/],
    ]) {
      for (const f of this._files(dirKind, exts)) {
        if (kind !== 'controller') this._mark(kind, f.file);
        /* ★ v1.32.0 — 부팅이 올린 것에도 meta 를 만들어 준다.
           예전에는 [이것만 올리기] 를 눌러야 meta 가 생겼다. 그런데 부팅이 이미 올려 버리면
           그 단추가 없으니, **meta 없이 "올라옴"** 인 상태로 남았다(실제로 그렇게 됐다).
           올린 주체가 부팅이든 사람이든 결과는 같아야 한다. */
        if (this._ensureMeta(kind, f.name, f.file)) meta += 1;
      }
    }
    if (meta) this.log.info(`[workspace] 부팅 시 meta 자동 생성 ${meta}건`);
  }

  /** 폴더의 파일 목록 (확장자로 거른다) */
  _files(kind, exts) {
    const out = [];
    for (const dir of existingDirs(kind)) {
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        if (!e.isFile()) continue;
        if (!exts.test(e.name)) continue;
        out.push({ name: e.name.replace(exts, ''), file: path.join(dir, e.name), dir });
      }
    }
    return out;
  }

  /**
   * ① 무엇이 안 올라왔는가.
   *  @returns {{controllers:[], services:[], sql:[], total:number}}
   */
  diagnose() {
    const reg = this._registered();
    const regNames = new Set(reg.map((r) => r.name));
    const regPaths = new Set(reg.map((r) => r.basePath));
    const isRegistered = (name, base) => regNames.has(name) || (!!base && regPaths.has(base));

    /* 컨트롤러 — 파일의 @Controller('/base') 를 읽어 라우터에 그 basePath 가 올라와 있는지 본다 */
    const controllers = [];
    for (const f of this._files('controllers', /\.(m?js|ts)$/)) {
      let base = null;
      try {
        const src = fs.readFileSync(f.file, 'utf8');
        base = (/@Controller\(\s*['"]([^'"]+)['"]/.exec(src) || [])[1] || null;
      } catch { /* 못 읽으면 아래에서 미로딩으로 본다 */ }
      if (!isRegistered(f.name, base)) controllers.push({ name: f.name, file: f.file, basePath: base });
    }

    /* 서비스 — DI 컨테이너에 이름이 있는가 */
    const services = this._files('services', /\.(m?js|ts)$/)
      .filter((f) => !container?.has?.(f.name))
      .map((f) => ({ name: f.name, file: f.file }));

    /* SQL — 레지스트리에 그 파일 이름이 있는가 */
    const sql = this._files('sql', /\.sql$/)
      .filter((f) => !sqlRegistry?.files?.has?.(f.name))
      .map((f) => ({ name: f.name, file: f.file }));

    return { controllers, services, sql, total: controllers.length + services.length + sql.length };
  }

  /**
   * ★ 목록 — 파일 전체를 상태(loaded)와 함께 돌려준다.
   *
   *  진단(diagnose)은 "안 올라온 것" 만 준다. 화면에서는 **각 줄이 지금 올라와 있는지**를
   *  함께 보여 줘야 하고, "안 올라온 것만 보기" 로 거를 수도 있어야 한다.
   *  그래서 셋(컨트롤러·서비스·SQL)을 같은 모양으로 준다.
   */
  list() {
    const reg = this._registered();
    const regNames = new Set(reg.map((r) => r.name));
    const regPaths = new Set(reg.map((r) => r.basePath));

    const controllers = this._files('controllers', /\.(m?js|ts)$/).map((f) => {
      let basePath = null;
      try {
        const src = fs.readFileSync(f.file, 'utf8');
        basePath = (/@Controller\(\s*['"]([^'"]+)['"]/.exec(src) || [])[1] || null;
      } catch { /* 못 읽으면 아래에서 미로딩으로 본다 */ }
      return { kind: 'controller', name: f.name, file: f.file, basePath,
               loaded: regNames.has(f.name) || (!!basePath && regPaths.has(basePath)) };
    });
    /* ★ v1.32.0 — **"올라옴" 은 지금 이 파일이 올라와 있다는 뜻이어야 한다.**
     *
     *  예전에는 이름만 봤다: 서비스는 DI 컨테이너에 그 이름이 있는지, SQL 은 레지스트리에
     *  그 파일 이름이 있는지. 그런데 **둘 다 한 번 담기면 빠지지 않는다** —
     *  컨테이너에는 unregister 자체가 없고, SQL 의 unregisterFile 은 아무도 부르지 않는다.
     *
     *  그래서 이런 일이 생겼다(실제 겪음):
     *    SupplyService.js 를 지웠다 → 같은 이름으로 새 파일을 넣었다
     *    → meta 도 없고 올린 적도 없는데 목록에는 "올라옴"
     *    → 올리기 단추가 없으니 영영 못 올린다
     *
     *  이제 **그 파일을 올렸는지**를 따로 기억한다. 서버가 다시 뜨면 기억이 비워지고,
     *  부팅이 읽은 것은 부팅 시각으로 채워 넣는다(아래 _seedLoadedAtBoot).
     *  파일이 바뀌면(수정 시각이 달라지면) 다시 "안 올라옴" 이 된다 — 새 내용은 아직 안 올라왔으니까. */
    const services = this._files('services', /\.(m?js|ts)$/).map((f) => ({
      kind: 'service', name: f.name, file: f.file,
      loaded: this._isFileLoaded('service', f.file) && !!container?.has?.(f.name),
    }));
    const sql = this._files('sql', /\.sql$/).map((f) => ({
      kind: 'sql', name: f.name, file: f.file,
      loaded: this._isFileLoaded('sql', f.file) && !!sqlRegistry?.files?.has?.(f.name),
    }));

    const unloaded = [...controllers, ...services, ...sql].filter((x) => !x.loaded).length;
    return { controllers, services, sql, unloaded };
  }

  /**
   * ★ v1.30.0 — 직접 넣은 파일에 **meta 를 만들어 준다.**
   *
   *  콘솔이 만든 컨트롤러·서비스에는 `meta/이름.meta.json` 이 함께 생긴다.
   *  거기에는 기본 경로·라우트·주입 서비스처럼 **파일만 봐서는 콘솔이 다루기 번거로운 것**이 들어 있고,
   *  콘솔의 편집·삭제가 그것을 근거로 움직인다.
   *
   *  편집기로 직접 넣은 파일에는 meta 가 없다. 그래서 목록에서 기본 경로가 비어 보이거나
   *  편집이 매끄럽지 않았다. 파일에 이미 `@Controller('/api/supply')` 라고 적혀 있으니
   *  **읽어서 만들어 주면 된다.** 사람이 같은 것을 두 번 적을 이유가 없다.
   *
   *  ⚠ 이미 meta 가 있으면 건드리지 않는다 — 콘솔에서 손댄 내용을 덮으면 안 된다.
   */
  _ensureMeta(kind, name, file) {
    if (kind === 'sql') return null;                  // SQL 은 meta 를 쓰지 않는다
    try {
      if (fs.existsSync(metaPathFor(file))) return null;   // 있으면 그대로 둔다
      const src = fs.readFileSync(file, 'utf8');
      const meta = kind === 'controller'
        ? this._metaFromController(name, src)
        : this._metaFromService(name, src);
      if (!meta) return null;
      writeMeta(file, meta);
      this.log.info(`[workspace] meta 자동 생성 — ${kind}: ${name}`);
      return meta;
    } catch (e) {
      /* meta 를 못 만들어도 **올리기 자체는 성공한 것**이다. 조용히 넘어가지 말고 남긴다. */
      this.log.warn(`[workspace] meta 자동 생성 실패 — ${name}: ${e.message}`);
      return null;
    }
  }

  /** 컨트롤러 파일에서 meta 를 뽑는다 (@Controller · @GetMapping … · @Autowired) */
  _metaFromController(name, src) {
    const basePath = (/@Controller\(\s*['"]([^'"]+)['"]/.exec(src) || [])[1];
    if (!basePath) return null;
    const routes = [];
    const re = /@(Get|Post|Put|Patch|Delete)Mapping\(\s*['"]([^'"]*)['"]\s*\)[\s\S]{0,200}?async\s+(\w+)\s*\(/g;
    for (let m; (m = re.exec(src));) {
      routes.push({ method: m[1].toUpperCase(), path: m[2] || '/', handler: m[3], handlerName: m[3], type: 'custom' });
    }
    const services = [...src.matchAll(/@Autowired\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
    return {
      name, basePath, controllerType: 'DB',
      serviceName: services[0] || null,
      description: '', auth: /@Auth\(/.test(src), roles: [],
      routes,
      /* 사람이 만든 파일에서 읽어 온 것임을 남긴다 — 나중에 왜 이 값인지 알 수 있게 */
      generatedFrom: 'source-scan',
    };
  }

  /** 서비스 파일에서 meta 를 뽑는다 (@Sql · async 메서드) */
  _metaFromService(name, src) {
    const sqlFile = (/@Sql\(\s*['"]([^'"]+)['"]/.exec(src) || [])[1] || null;
    const methods = [...src.matchAll(/^\s*async\s+(\w+)\s*\(/gm)]
      .map((m) => m[1]).filter((n) => !n.startsWith('_'));
    return {
      name, sqlFile, description: '',
      methods: methods.map((n) => ({ name: n, type: 'custom' })),
      generatedFrom: 'source-scan',
    };
  }

  /**
   * ★ **하나만** 올린다.
   *
   *  여러 개가 안 올라와 있어도 원하는 것 하나만 고를 수 있어야 한다.
   *  (전부 올리기는 loadAll — 둘 다 필요하다)
   * @param {'controller'|'service'|'sql'} kind
   * @param {string} name  확장자를 뺀 파일 이름
   */
  async loadOne(kind, name) {
    const kinds = { controller: 'controllers', service: 'services', sql: 'sql' };
    if (!kinds[kind]) throw Object.assign(new Error(`알 수 없는 종류: ${kind}`), { status: 400 });
    const exts = kind === 'sql' ? /\.sql$/ : /\.(m?js|ts)$/;
    const found = this._files(kinds[kind], exts).find((f) => f.name === name);
    if (!found) throw Object.assign(new Error(`파일을 찾을 수 없습니다: ${name}`), { status: 404 });

    if (kind === 'sql') await loadSingleSqlFile(found.file, this.log);
    else if (kind === 'service') await loadSingleServiceFile(found.file);
    else await loadSingleControllerFile(await this._resolveApp(), found.file);

    this._mark(kind, found.file);
    this._ensureMeta(kind, name, found.file);
    this.log.warn(`[workspace] 개별 올리기 — ${kind}: ${name}`);
    /* 올린 뒤 실제로 올라왔는지 확인해서 돌려준다 (말만 하고 안 올라오면 안 된다) */
    const after = this.list();
    const row = [...after.controllers, ...after.services, ...after.sql]
      .find((x) => x.kind === kind && x.name === name);
    return { kind, name, loaded: !!row?.loaded };
  }

  /**
   * ② 지금 올린다. 순서는 SQL → 서비스 → 컨트롤러 (뒤가 앞을 쓴다).
   *  @returns 무엇을 올렸고 무엇이 실패했는지
   */
  async loadAll() {
    const before = this.diagnose();
    const errors = [];
    const done = { sql: 0, services: 0, controllers: 0 };

    if (before.sql.length) {
      try { await loadSqlFiles(this.log); done.sql = before.sql.length; }
      catch (e) { errors.push({ kind: 'sql', message: e.message }); }
    }
    if (before.services.length) {
      try { await loadServices(); done.services = before.services.length; }
      catch (e) { errors.push({ kind: 'service', message: e.message }); }
    }
    for (const c of before.controllers) {
      try {
        await loadSingleControllerFile(await this._resolveApp(), c.file);
        this._ensureMeta('controller', c.name, c.file);
        done.controllers += 1;
      } catch (e) {
        errors.push({ kind: 'controller', name: c.name, message: e.message });
      }
    }

    const after = this.diagnose();
    this.log.warn(`[workspace] 직접 넣은 파일 올리기 — SQL ${done.sql} · 서비스 ${done.services} · 컨트롤러 ${done.controllers}`
      + (errors.length ? ` · 실패 ${errors.length}건` : ''));
    return { loaded: done, errors, remaining: after };
  }
}
