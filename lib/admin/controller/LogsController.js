/**
 * LogsController — 서버 로그 파일 조회/검색/다운로드.
 *
 *  GET  /api/admin/logs/kinds                          로그 종류 목록
 *  GET  /api/admin/logs/facets                         거를 수 있는 값 (kind/level/요청ID)
 *  GET  /api/admin/logs/query?kinds=sql&levels=ERROR&… kind 기반 질의
 *  GET  /api/admin/logs/files?kind=general&page=1      파일 목록 (페이지네이션)
 *  GET  /api/admin/logs/content?kind=&file=&q=&isRegex 파일 내용 + 검색 결과
 *  POST /api/admin/logs/download                       zip 다운로드 (body: {files, filter?})
 */
import config from '../../../src/config/index.js';
import {
  Controller, GetMapping, PostMapping, Autowired, Auth, Log,
} from '../../../src/core/decorators.js';

/* ★ v1.11.4 — 로그는 값이 섞여 있을 수 있어(ad-hoc SQL·요청 본문 일부) 아무 콘솔 사용자에게나 보여 주지 않는다.
   기본은 admin 만. 운영에서 user 역할도 봐야 하면 LOG_VIEW_ROLES=admin,user */
function requireLogRole(req) {
  const allowed = Array.isArray(config.logView?.roles) && config.logView.roles.length ? config.logView.roles : ['admin'];
  const role = req?.user?.role;
  if (!allowed.includes(role)) {
    throw Object.assign(new Error(`로그를 볼 수 있는 역할이 아닙니다 (허용: ${allowed.join(', ')})`), { status: 403 });
  }
}

@Controller('/api/admin/logs')
export default class LogsController {

  @Autowired('LogsService') logsService;
  @Log log;

  @GetMapping('/kinds')
  @Auth()
  async kinds() {
    requireLogRole(arguments[1]);
    return { data: this.logsService.listKinds() };
  }

  /**
   * ★ v1.9.5 — 콘솔 [로그] 화면용 질의.
   *  CLI(`npm run logs`)와 같은 규칙을 쓴다 — 규칙이 갈리면 같은 조건인데
   *  화면과 터미널의 결과가 달라져 어느 쪽을 믿을지 알 수 없게 된다.
   */
  /* ⚠ 이 컨트롤러의 핸들러는 첫 인자로 **쿼리 객체**를 받는다(`req` 가 아니다).
     같은 파일의 files/content 와 같은 규약이다 — v1.9.5 에서 `req.query` 로 썼다가
     실제 호출에서 500 이 났다. 브라우저로 띄워 보고서야 발견했다. */
  @GetMapping('/facets')
  @Auth()
  async facets(params = {}) {
    requireLogRole(arguments[1]);
    return { data: await this.logsService.facets({ files: params.files }) };
  }

  @GetMapping('/query')
  @Auth()
  async query(params = {}) {
    requireLogRole(arguments[1]);
    const q = params || {};
    const list = (v) => (v ? String(v).split(',').map((x) => x.trim()).filter(Boolean) : []);
    return {
      data: await this.logsService.query({
        kinds: list(q.kinds),
        levels: list(q.levels),
        requestId: q.requestId || null,
        q: q.q || null,
        slowerThan: q.slowerThan != null && q.slowerThan !== '' ? Number(q.slowerThan) : null,
        around: q.around ? Number(q.around) : null,
        windowMs: q.windowMs ? Number(q.windowMs) : 3000,
        sinceMs: q.sinceMs ? Number(q.sinceMs) : null,
        limit: q.limit ? Number(q.limit) : 300,
        files: q.files ? Number(q.files) : 20,
      }),
    };
  }

  @GetMapping('/folders')
  @Auth()
  async folders(params) {
    requireLogRole(arguments[1]);
    const data = this.logsService.listFolders({ kind: params.kind });
    return { data };
  }

  @GetMapping('/files')
  @Auth()
  async files(params) {
    requireLogRole(arguments[1]);
    const data = this.logsService.listFiles({
      kind: params.kind,
      folder: params.folder,  // undefined 이면 전체 재귀 (호환)
      page: params.page,
      perPage: params.perPage,
    });
    return { data };
  }

  @GetMapping('/content')
  @Auth()
  async content(params) {
    requireLogRole(arguments[1]);
    const isRegex = params.isRegex === '1' || params.isRegex === 'true';
    const onlyMatches = params.onlyMatches === '1' || params.onlyMatches === 'true';
    const data = await this.logsService.readFile({
      kind: params.kind,
      file: params.file,
      q: params.q || '',
      isRegex,
      level: params.level || 'all',
      onlyMatches,
      page: params.page,
      perPage: params.perPage,
    });
    return { data };
  }

  /** zip 다운로드. express res 에 직접 쓰기 위해 req/res 도 받음. */
  @PostMapping('/download')
  @Auth()
  async download(params, req, res) {
    requireLogRole(arguments[1]);
    const body = req.body || {};
    const buf = this.logsService.buildZip({
      files: body.files,
      filter: body.filter || null,
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="server-logs-${stamp}.zip"`);
    res.setHeader('Content-Length', buf.length);
    res.end(buf);
    return undefined;   // controllerLoader 가 이미 보낸 응답은 건너뜀
  }
}
