/**
 * ScreenProjectController — /api/admin/screen-projects/*
 *
 * 화면 디자이너(admin) 프로젝트의 CRUD 엔드포인트.
 *   GET    /paged           — 프로젝트 목록 (페이지)
 *   GET    /_diag           — DB 상태 진단 (Phase 12 신규)
 *   GET    /all             — 전체 요약 (드롭다운용)
 *   GET    /:id             — 프로젝트 상세 (config/layout/screens/vars JSON 포함)
 *   POST   /                — 신규 생성
 *   PUT    /:id             — 부분 업데이트
 *   DELETE /:id             — soft delete
 */
import {
  Controller, GetMapping, PostMapping, PutMapping, DeleteMapping,
  Autowired, Auth, Roles, Log,
} from '../../../src/core/decorators.js';

@Controller('/api/admin/screen-projects')
export default class ScreenProjectController {

  @Autowired('ScreenProjectService') screenProjectService;
  @Log log;

  @GetMapping('/paged')
  @Auth()
  async listPaged(params) {
    return this.screenProjectService.listPaged({
      page: params.page,
      perPage: params.perPage,
    });
  }

  /** Phase 12: 진단 엔드포인트 — DB 상태 확인 용도 */
  @GetMapping('/_diag')
  @Auth()
  async diagnose() {
    return { data: await this.screenProjectService.diagnose() };
  }

  @GetMapping('/all')
  @Auth()
  async listAll() {
    return { data: await this.screenProjectService.listAllBrief() };
  }

  @GetMapping('/:id')
  @Auth()
  async get(params) {
    const row = await this.screenProjectService.findById(Number(params.id));
    if (!row) {
      throw Object.assign(new Error(`프로젝트 없음: id=${params.id}`), { status: 404 });
    }
    return { data: row };
  }

  @PostMapping('/')
  @Roles('admin')
  async create(params) {
    const result = await this.screenProjectService.create(params);
    return { data: result };
  }

  @PutMapping('/:id')
  @Roles('admin')
  async update(params) {
    const { id, ...patch } = params;
    const result = await this.screenProjectService.update(Number(id), patch);
    return { data: result };
  }

  @DeleteMapping('/:id')
  @Roles('admin')
  async remove(params) {
    await this.screenProjectService.remove(Number(params.id));
    return { data: { id: Number(params.id), deleted: true } };
  }
}
