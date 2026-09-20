/**
 * ApiUserController — /api/admin/api-users/*
 *
 *  연동 업체 계정(users.role='vendor') 을 관리 콘솔에서 만들고 관리한다.
 *
 *  모든 엔드포인트에 @Auth({ realm: 'admin', roles: ['admin'] }) 를 명시한다.
 *  lib/admin 아래 컨트롤러는 프레임워크가 realm='admin' 을 기본값으로 잡아 주지만,
 *  그 기본값에 기대지 않고 적어 둔다. @Auth 는 기존 가드 설정을 통째로 덮어쓰므로
 *  @Roles 와 함께 쓰면 데코레이터 순서에 따라 realm 이 사라질 수 있다 — 한 줄로
 *  모아 두면 그 사고가 생기지 않는다. 업체 토큰(realm='user')으로는 403 이다.
 *
 *  엔드포인트:
 *   GET    /paged                 목록 (기관 권한·상태 포함)
 *   GET    /:id                   단일 조회 (유효 토큰 수 포함)
 *   POST   /                      업체 계정 발급
 *   PUT    /:id                   이름·이메일·상태 수정
 *   PUT    /:id/password          비밀번호 재설정 (기존 토큰 자동 폐기)
 *   PUT    /:id/orgs              조회 허용 기관 지정
 *   POST   /:id/revoke            발급된 토큰 전부 폐기
 *   POST   /:id/unlock            로그인 실패 잠금 해제
 *   DELETE /:id                   업체 계정 삭제
 */
import {
  Controller, GetMapping, PostMapping, PutMapping, DeleteMapping,
  Autowired, Auth, Log,
} from '../../../src/core/decorators.js';

@Controller('/api/admin/api-users')
export default class ApiUserController {

  @Autowired('ApiUserService') apiUserService;

  @Log log;

  /* GET /api/admin/api-users/paged?page=1&perPage=20 */
  @GetMapping('/paged')
  @Auth({ realm: 'admin', roles: ['admin'] })
  async listPaged(params) {
    const data = await this.apiUserService.listPaged({
      page: Number(params.page) || 1,
      perPage: Number(params.perPage) || 20,
    });
    return { data };
  }

  /* GET /api/admin/api-users/:id */
  @GetMapping('/:id')
  @Auth({ realm: 'admin', roles: ['admin'] })
  async get(params) {
    const data = await this.apiUserService.getById(Number(params.id));
    return { data };
  }

  /* POST /api/admin/api-users  body: { name, username, email, password, orgIds[], status? } */
  @PostMapping('/')
  @Auth({ realm: 'admin', roles: ['admin'] })
  async create(params, req) {
    const body = req.body || {};
    const data = await this.apiUserService.create({
      name: body.name,
      username: body.username,
      email: body.email,
      password: body.password,
      orgIds: body.orgIds || [],
      status: body.status || 'active',
    });
    return { data };
  }

  /* PUT /api/admin/api-users/:id  body: { name, email, status } */
  @PutMapping('/:id')
  @Auth({ realm: 'admin', roles: ['admin'] })
  async update(params, req) {
    const body = req.body || {};
    const data = await this.apiUserService.update(Number(params.id), {
      name: body.name, email: body.email, status: body.status,
    });
    return { data };
  }

  /* PUT /api/admin/api-users/:id/password  body: { newPassword } */
  @PutMapping('/:id/password')
  @Auth({ realm: 'admin', roles: ['admin'] })
  async resetPassword(params, req) {
    const data = await this.apiUserService.resetPassword(
      Number(params.id), (req.body || {}).newPassword);
    return { data };
  }

  /* PUT /api/admin/api-users/:id/orgs  body: { orgIds: ['ORG001', ...] } */
  @PutMapping('/:id/orgs')
  @Auth({ realm: 'admin', roles: ['admin'] })
  async setOrgs(params, req) {
    const data = await this.apiUserService.setGrants(
      Number(params.id), (req.body || {}).orgIds || []);
    return { data };
  }

  /* POST /api/admin/api-users/:id/revoke */
  @PostMapping('/:id/revoke')
  @Auth({ realm: 'admin', roles: ['admin'] })
  async revoke(params) {
    const data = await this.apiUserService.revokeTokens(Number(params.id));
    return { data };
  }

  /* POST /api/admin/api-users/:id/unlock */
  @PostMapping('/:id/unlock')
  @Auth({ realm: 'admin', roles: ['admin'] })
  async unlock(params) {
    const data = await this.apiUserService.unlock(Number(params.id));
    return { data };
  }

  /* DELETE /api/admin/api-users/:id */
  @DeleteMapping('/:id')
  @Auth({ realm: 'admin', roles: ['admin'] })
  async remove(params) {
    const data = await this.apiUserService.remove(Number(params.id));
    return { data };
  }
}
