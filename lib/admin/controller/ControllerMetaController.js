/**
 * ControllerMetaController — /api/admin/controllers/*
 *
 * id 는 파일명(예: 'StudentController') 입니다.
 */
import {
  Controller, GetMapping, PostMapping, PutMapping, DeleteMapping,
  Autowired, Auth, Roles, Log,
} from '../../../src/core/decorators.js';

@Controller('/api/admin/controllers')
export default class ControllerMetaController {

  @Autowired('ControllerMetaService') metaService;
  @Log log;

  /* GET /api/admin/controllers/route-types */
  @GetMapping('/route-types')
  @Auth()
  async getRouteTypes() {
    return { data: this.metaService.getRouteTypes() };
  }

  /* GET /api/admin/controllers/sql-actions  (multiSql 단계의 action 옵션 카탈로그) */
  @GetMapping('/sql-actions')
  @Auth()
  async getSqlActions() {
    return { data: this.metaService.getSqlActions() };
  }

  /* GET /api/admin/controllers/paged?page=1&perPage=10 */
  @GetMapping('/paged')
  @Auth()
  async listPaged(params) {
    return this.metaService.listPaged({ page: params.page, perPage: params.perPage, origin: params.origin, q: params.q });
  }

  /* GET /api/admin/controllers/:id/params — Phase 22: 입/출력 파라미터 분석 */
  @GetMapping('/:id/params')
  @Auth()
  async analyzeParams(params) {
    return { data: await this.metaService.analyzeParameters(String(params.id)) };
  }

  /* GET /api/admin/controllers/:id  (id = 파일명) */
  @GetMapping('/:id')
  @Auth()
  async get(params) {
    const row = await this.metaService.findById(String(params.id));
    return { data: row };
  }

  /* POST /api/admin/controllers/preview */
  @PostMapping('/preview')
  @Auth()
  async preview(params) {
    return { data: this.metaService.generate(params) };
  }

  /* POST /api/admin/controllers */
  @PostMapping('/')
  @Roles('admin')
  async create(params) {
    const { customCode, ...meta } = params;
    const result = await this.metaService.create(meta, customCode);
    return { data: result };
  }

  /* PUT /api/admin/controllers/:id */
  @PutMapping('/:id')
  @Roles('admin')
  async update(params) {
    const { id, customCode, ...meta } = params;
    const result = await this.metaService.update(String(id), meta, customCode);
    return { data: result };
  }

  /* DELETE /api/admin/controllers/:id */
  @DeleteMapping('/:id')
  @Roles('admin')
  async remove(params) {
    const result = await this.metaService.remove(String(params.id));
    return { data: result };
  }
}
