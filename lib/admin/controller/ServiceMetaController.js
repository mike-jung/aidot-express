/**
 * ServiceMetaController — /api/admin/services/*
 * id 는 파일명(예: 'StudentService') 입니다.
 */
import {
  Controller, GetMapping, PostMapping, PutMapping, DeleteMapping,
  Autowired, Auth, Roles, Log,
} from '../../../src/core/decorators.js';

@Controller('/api/admin/services')
export default class ServiceMetaController {

  @Autowired('ServiceMetaService') metaService;
  @Log log;

  @GetMapping('/method-catalog')
  @Auth()
  async getMethodCatalog() {
    return { data: this.metaService.getMethodCatalog() };
  }

  @GetMapping('/paged')
  @Auth()
  async listPaged(params) {
    return this.metaService.listPaged({ page: params.page, perPage: params.perPage, origin: params.origin, q: params.q });
  }

  @GetMapping('/all')
  @Auth()
  async listAll() {
    return { data: await this.metaService.listAll() };
  }

  @GetMapping('/:id')
  @Auth()
  async get(params) {
    const row = await this.metaService.findById(String(params.id));
    return { data: row };
  }

  @PostMapping('/preview')
  @Auth()
  async preview(params) {
    return { data: { content: this.metaService.generate(params) } };
  }

  @PostMapping('/')
  @Roles('admin')
  async create(params) {
    const { customCode, ...meta } = params;
    const result = await this.metaService.create(meta, customCode);
    return { data: result };
  }

  @PutMapping('/:id')
  @Roles('admin')
  async update(params) {
    const { id, customCode, ...meta } = params;
    const result = await this.metaService.update(String(id), meta, customCode);
    return { data: result };
  }

  @DeleteMapping('/:id')
  @Roles('admin')
  async remove(params) {
    const result = await this.metaService.remove(String(params.id));
    return { data: result };
  }
}
