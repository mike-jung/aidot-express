/**
 * WorkspaceLoadController — 직접 넣은 파일 진단·올리기 (v1.28.0)
 *
 *  콘솔에서 만든 것은 저장 즉시 올라가지만, 개발자가 편집기로 workspace/ 에
 *  직접 넣은 파일은 **서버를 다시 켜야** 올라왔다. 재기동 없이 올릴 수 있게 한다.
 */
import { Controller, GetMapping, PostMapping, Roles, Autowired, Log } from '../../../src/core/decorators.js';

@Controller('/api/admin/workspace')
export default class WorkspaceLoadController {
  @Autowired('WorkspaceLoadService') loadService;
  @Log log;

  /** GET /api/admin/workspace/unloaded — 무엇이 안 올라왔는지 */
  @GetMapping('/unloaded')
  @Roles('admin')
  async unloaded() {
    return { data: this.loadService.diagnose() };
  }

  /** GET /api/admin/workspace/files — 전체 목록 + 각 줄의 로딩 상태 */
  @GetMapping('/files')
  @Roles('admin')
  async files() {
    return { data: this.loadService.list() };
  }

  /** POST /api/admin/workspace/load-one — 하나만 올린다 { kind, name } */
  @PostMapping('/load-one')
  @Roles('admin')
  async loadOne(params, req) {
    const { kind, name } = req.body || {};
    const data = await this.loadService.loadOne(kind, name);
    this.log.warn(`[workspace] loaded one by ${req.user?.username || '-'} — ${kind}:${name}`);
    return { data };
  }

  /** POST /api/admin/workspace/load — 지금 올린다 */
  @PostMapping('/load')
  @Roles('admin')
  async load(params, req) {
    const data = await this.loadService.loadAll();
    this.log.warn(`[workspace] load requested by ${req.user?.username || '-'}`);
    return { data };
  }
}
