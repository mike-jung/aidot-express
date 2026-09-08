/**
 * SqlMetaController — /api/admin/sqls/*
 *
 * id 는 파일명(예: 'product') 입니다.
 */
import {
  Controller, GetMapping, PostMapping, PutMapping, DeleteMapping,
  Autowired, Auth, Roles, Log,
} from '../../../src/core/decorators.js';

@Controller('/api/admin/sqls')
export default class SqlMetaController {

  @Autowired('SqlMetaService') sqlMetaService;
  @Log log;

  @GetMapping('/paged')
  @Auth()
  async listPaged(params) {
    return this.sqlMetaService.listPaged({ page: params.page, perPage: params.perPage, origin: params.origin, q: params.q });
  }

  @GetMapping('/all')
  @Auth()
  async listAll() {
    return { data: await this.sqlMetaService.listAll() };
  }

  @GetMapping('/:id')
  @Auth()
  async get(params) {
    const row = await this.sqlMetaService.findById(String(params.id));
    return { data: row };
  }

  @PostMapping('/preview')
  @Auth()
  async preview(params) {
    return { data: { content: await this.sqlMetaService.generate(params) } };
  }

  @PostMapping('/')
  @Roles('admin')
  async create(params) {
    const result = await this.sqlMetaService.create(params);
    return { data: result };
  }

  @PutMapping('/:id')
  @Roles('admin')
  async update(params) {
    const { id, ...input } = params;
    const result = await this.sqlMetaService.update(String(id), input);
    return { data: result };
  }

  @DeleteMapping('/:id')
  @Roles('admin')
  async remove(params) {
    const result = await this.sqlMetaService.remove(String(params.id));
    return { data: result };
  }

  /** SQL 쿼리 테스트 실행
   *   params:
   *     sqlFile   : 파일명 (편집 중인 경우에도 표시용으로 보내줌)
   *     queryName : 쿼리 이름 (레지스트리 조회용, 표시용)
   *     testParams: 파라미터 값 객체
   *     sqlBody   : (선택) 편집 중인 SQL 본문. 있으면 레지스트리를 거치지 않고 즉시 실행.
   */
  @PostMapping('/test')
  @Roles('admin')
  async testQuery(params) {
    const { sqlFile, queryName, testParams, sqlBody } = params;
    // sqlBody 경로가 아닐 때만 sqlFile/queryName 둘 다 필수
    const hasBody = sqlBody && typeof sqlBody === 'string' && sqlBody.trim();
    if (!hasBody && (!sqlFile || !queryName)) {
      throw Object.assign(new Error('sqlFile, queryName 또는 sqlBody 중 하나는 필요합니다'), { status: 400 });
    }
    const result = await this.sqlMetaService.testQuery(
      sqlFile || null,
      queryName || null,
      testParams || {},
      hasBody ? sqlBody : null,
    );
    return { data: result };
  }

  /** DB 테이블 컬럼 정보 조회 */
  @PostMapping('/table-columns')
  @Auth()
  async getTableColumns(params) {
    const { tableName } = params;
    if (!tableName) {
      throw Object.assign(new Error('tableName 필수'), { status: 400 });
    }
    const result = await this.sqlMetaService.getTableColumns(tableName);
    return { data: result };
  }
}
