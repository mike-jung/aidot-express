/**
 * AdminUserController — /api/admin/users/*
 *
 *  모든 엔드포인트는 관리자(role=admin) 전용.
 *  본인 비밀번호 변경은 역할 불문 가능 (/me/password).
 *
 *  엔드포인트:
 *   GET    /paged                    페이지네이션 목록
 *   GET    /:id                      단일 조회
 *   POST   /                         사용자 추가
 *   PUT    /:id                      사용자 수정 (이름/이메일/role/status)
 *   PUT    /:id/password             관리자가 임의 사용자 비밀번호 재설정
 *   DELETE /:id                      사용자 삭제
 *   POST   /:id/unlock               잠금 해제
 *   PUT    /me/password              로그인 사용자 본인 비밀번호 변경
 */
import {
  Controller, GetMapping, PostMapping, PutMapping, DeleteMapping,
  Autowired, Auth, Roles, Log,
} from '../../../src/core/decorators.js';

@Controller('/api/admin/users')
export default class AdminUserController {

  @Autowired('AdminUserService') userService;
  @Log log;

  /* GET /api/admin/users/paged?page=1&perPage=20 */
  @GetMapping('/paged')
  @Roles('admin')
  async listPaged(params) {
    const data = await this.userService.listPaged({
      page: Number(params.page) || 1,
      perPage: Number(params.perPage) || 20,
    });
    return { data };
  }

  /* PUT /api/admin/users/me/password  body: { currentPassword, newPassword } */
  @PutMapping('/me/password')
  @Auth()
  async changeOwnPassword(params, req) {
    const body = req.body || {};
    const userId = req.user?.sub ?? req.user?.id;
    if (!userId) throw Object.assign(new Error('인증 정보 없음'), { status: 401 });
    const data = await this.userService.changePassword(userId, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      skipCurrentCheck: false,
    });
    return { data };
  }

  /* GET /api/admin/users/:id */
  @GetMapping('/:id')
  @Roles('admin')
  async get(params) {
    const data = await this.userService.getById(Number(params.id));
    return { data };
  }

  /* POST /api/admin/users  body: { name, username, email, password, role?, status? } */
  @PostMapping('/')
  @Roles('admin')
  async create(params, req) {
    const body = req.body || {};
    const data = await this.userService.create({
      name: body.name,
      username: body.username,
      email: body.email,
      password: body.password,
      role: body.role || 'admin',
      status: body.status || 'active',
    });
    return { data };
  }

  /* PUT /api/admin/users/:id  body: { name, email, role, status } */
  @PutMapping('/:id')
  @Roles('admin')
  async update(params, req) {
    const body = req.body || {};
    const data = await this.userService.update(Number(params.id), {
      name: body.name,
      email: body.email,
      role: body.role,
      status: body.status,
    });
    return { data };
  }

  /* PUT /api/admin/users/:id/password  body: { newPassword }  (관리자 임의 재설정) */
  @PutMapping('/:id/password')
  @Roles('admin')
  async resetPassword(params, req) {
    const body = req.body || {};
    const data = await this.userService.changePassword(Number(params.id), {
      newPassword: body.newPassword,
      skipCurrentCheck: true,
    });
    return { data };
  }

  /* DELETE /api/admin/users/:id */
  @DeleteMapping('/:id')
  @Roles('admin')
  async remove(params, req) {
    const data = await this.userService.remove(Number(params.id), { actorId: req.user?.id });
    return { data };
  }

  /* POST /api/admin/users/:id/unlock */
  @PostMapping('/:id/unlock')
  @Roles('admin')
  async unlock(params) {
    const data = await this.userService.unlock(Number(params.id));
    return { data };
  }
}
