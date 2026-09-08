/**
 * ConfigController — 환경설정 파일 조회/편집.
 *
 *  GET  /api/admin/config/files             편집 가능한 파일 메타 목록
 *  GET  /api/admin/config/file?id=env       특정 파일 내용 (mask 옵션)
 *  PUT  /api/admin/config/file              저장 (body: { id, content })
 *  GET  /api/admin/config/workspace         ★ v1.12.0 작업 폴더 (내가 만든 파일이 저장되는 곳)
 *  PUT  /api/admin/config/workspace         ★ v1.12.0 작업 폴더 변경 (body: { dir, create })
 */
import {
  Controller, GetMapping, PutMapping, Autowired, Auth, Roles, Log,
} from '../../../src/core/decorators.js';

@Controller('/api/admin/config')
export default class ConfigController {

  @Autowired('ConfigService') configService;
  @Log log;

  @GetMapping('/files')
  @Auth()
  async files() {
    return { data: this.configService.listFiles() };
  }

  @GetMapping('/file')
  @Roles('admin')
  async file(params) {
    const mask = params.mask === '1' || params.mask === 'true';
    const data = this.configService.readFile({ id: params.id, mask });
    return { data };
  }

  /* ★ v1.12.0 — 작업 폴더 조회/변경 (설정 대화상자) */
  @GetMapping('/workspace')
  @Auth()
  async workspace() {
    return { data: this.configService.getWorkspace() };
  }

  @PutMapping('/workspace')
  @Roles('admin')
  async setWorkspace(params, req) {
    const body = req.body || {};
    const data = await this.configService.setWorkspace({ dir: body.dir, create: body.create !== false });
    this.log.warn(`[config] workspace changed by ${req.user?.username || '-'}: "${data.configured || '(not used)'}"`);
    return { data };
  }

  /* ★ v1.12.2 — 업무 테이블 스키마 (내가 만드는 표가 있는 곳) */
  @GetMapping('/app-schema')
  @Auth()
  async appSchema() {
    return { data: await this.configService.getAppSchema() };
  }

  @PutMapping('/app-schema')
  @Roles('admin')
  async setAppSchema(params, req) {
    const body = req.body || {};
    const data = await this.configService.setAppSchema({ schema: body.schema, create: !!body.create });
    this.log.warn(`[config] app schema changed by ${req.user?.username || '-'}: "${data.configured || '(connection schema)'}"`);
    return { data };
  }

  /* ★ v1.13.3 — EAI(전문 연동) 메뉴 표시 */
  @GetMapping('/eai')
  @Auth()
  async eai() { return { data: this.configService.getEaiFlag() }; }

  @PutMapping('/eai')
  @Roles('admin')
  async setEai(params, req) {
    const data = await this.configService.setEaiFlag({ enabled: req.body?.enabled });
    this.log.warn(`[config] EAI menu ${data.enabled ? 'on' : 'off'} by ${req.user?.username || '-'}`);
    return { data };
  }

  @PutMapping('/file')
  @Roles('admin')
  async save(params, req) {
    const body = req.body || {};
    const data = await this.configService.writeFile({ id: body.id, content: body.content });
    return { data };
  }
}
