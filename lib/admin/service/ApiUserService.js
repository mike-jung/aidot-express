/**
 * ApiUserService — 연동 업체 계정 관리 (관리 콘솔 전용)
 *
 *  업체 계정은 users 테이블의 role='vendor' 행이다.
 *  관리자 콘솔 계정(admin_users)과는 테이블부터 분리되어 있고, 토큰의 realm 이
 *  달라 서로의 API 를 호출할 수 없다 — 업체에게 콘솔 권한이 새어 나가지 않는다.
 *
 *  비밀번호 해시는 AuthService 와 같은 argon2id 파라미터를 쓴다.
 *  (여기서 값을 바꾸면 로그인이 깨진다.)
 */
import argon2 from 'argon2';
import { Service, Sql, Log } from '../../../src/core/decorators.js';
import db from '../../../src/database/db.js';

// src/service/AuthService.js 의 ARGON2_OPTS 와 동일해야 한다.
const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const USERNAME_RE = /^[A-Za-z0-9._-]{3,50}$/;
const ORG_RE = /^[A-Za-z0-9._-]{1,40}$/;
const STATUSES = new Set(['active', 'locked', 'disabled']);

const fail = (status, message) => Object.assign(new Error(message), { status });

@Service('ApiUserService')
export default class ApiUserService {

  @Sql('api_user') sql;

  @Log log;

  /* ------------------------------------------------------------ 목록 */

  async listPaged({ page = 1, perPage = 20 } = {}) {
    const limit = Math.min(Math.max(Number(perPage) || 20, 1), 200);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const totalRes = await db.execute(this.sql.get('countVendors'), {});
    const rowsRes = await db.execute(this.sql.get('listVendorsPaged'), { limit, offset });
    const grantsRes = await db.execute(this.sql.get('listGrants'), {});

    const byUser = new Map();
    for (const g of grantsRes.rows) {
      if (!byUser.has(g.userId)) byUser.set(g.userId, []);
      byUser.get(g.userId).push(g.orgId);
    }

    const total = Number(totalRes.rows[0].total);
    return {
      rows: rowsRes.rows.map(row => ({ ...row, orgIds: byUser.get(row.id) ?? [] })),
      page: Math.max(Number(page) || 1, 1),
      perPage: limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getById(id) {
    const res = await db.execute(this.sql.get('findVendorById'), { id });
    const row = res.rows[0];
    if (!row) throw fail(404, '업체 계정을 찾을 수 없습니다');
    const grants = await db.execute(this.sql.get('listGrantsForUser'), { userId: id });
    const active = await db.execute(this.sql.get('countActiveTokens'), { userId: id });
    return { ...row, orgIds: grants.rows.map(g => g.orgId), activeTokens: Number(active.rows[0].active) };
  }

  /* ------------------------------------------------------------ 생성 */

  async create({ name, username, email, password, orgIds = [], status = 'active' }) {
    if (!USERNAME_RE.test(String(username || '')))
      throw fail(400, '아이디는 영문·숫자·. _ - 조합 3~50자여야 합니다');
    if (String(password || '').length < 12)
      throw fail(400, '비밀번호는 12자 이상이어야 합니다');
    if (!STATUSES.has(status)) throw fail(400, '상태 값이 올바르지 않습니다');
    this.#assertOrgIds(orgIds);

    const existing = await db.execute(this.sql.get('findByUsername'), { username });
    if (existing.rows.length) throw fail(409, '이미 사용 중인 아이디입니다');

    const password_hash = await argon2.hash(String(password), ARGON2_OPTS);
    const res = await db.execute(this.sql.get('insertVendor'), {
      name: name || username,
      username,
      email: email || `${username}@vendor.invalid`,
      password_hash,
      status,
    });
    const id = Number(res.insertId ?? 0);

    for (const orgId of orgIds) {
      await db.execute(this.sql.get('insertGrant'), { userId: id, orgId });
    }
    this.log.info(`업체 계정 생성 id=${id} username=${username} orgs=${orgIds.join(',')}`);
    return this.getById(id);
  }

  /* ------------------------------------------------------------ 수정 */

  async update(id, { name, email, status }) {
    const current = await this.getById(id);
    const next = status ?? current.status;
    if (!STATUSES.has(next)) throw fail(400, '상태 값이 올바르지 않습니다');

    await db.execute(this.sql.get('updateVendor'), {
      id, name: name ?? current.name, email: email ?? current.email, status: next,
    });

    // 정지된 계정은 이미 발급된 토큰도 끊어야 실제로 막힌다.
    if (next !== 'active') await this.revokeTokens(id);
    return this.getById(id);
  }

  async resetPassword(id, newPassword) {
    if (String(newPassword || '').length < 12)
      throw fail(400, '비밀번호는 12자 이상이어야 합니다');
    await this.getById(id);
    const password_hash = await argon2.hash(String(newPassword), ARGON2_OPTS);
    await db.execute(this.sql.get('updateVendorPassword'), { id, password_hash });
    // 비밀번호를 바꿨으면 기존 토큰은 무효가 되어야 한다.
    await this.revokeTokens(id);
    this.log.info(`업체 계정 비밀번호 재설정 id=${id}`);
    return { id, revoked: true };
  }

  async unlock(id) {
    await this.getById(id);
    await db.execute(this.sql.get('unlockVendor'), { id });
    return this.getById(id);
  }

  async remove(id) {
    await this.getById(id);
    await this.revokeTokens(id);
    await db.execute(this.sql.get('deleteGrantsForUser'), { userId: id });
    await db.execute(this.sql.get('deleteVendor'), { id });
    this.log.info(`업체 계정 삭제 id=${id}`);
    return { id, deleted: true };
  }

  /* ------------------------------------------------------------ 권한 */

  async setGrants(id, orgIds) {
    this.#assertOrgIds(orgIds);
    await this.getById(id);
    await db.execute(this.sql.get('deleteGrantsForUser'), { userId: id });
    for (const orgId of orgIds) {
      await db.execute(this.sql.get('insertGrant'), { userId: id, orgId });
    }
    this.log.info(`업체 기관 권한 변경 id=${id} orgs=${orgIds.join(',')}`);
    return this.getById(id);
  }

  /* ------------------------------------------------------------ 토큰 */

  /** 이미 나간 토큰을 전부 끊는다. 업체 쪽은 다음 요청에서 401 을 받고 재로그인한다. */
  async revokeTokens(id) {
    const res = await db.execute(this.sql.get('revokeAllTokens'), { userId: id });
    this.log.info(`업체 토큰 폐기 id=${id} count=${res.rowsAffected ?? 0}`);
    return { id, revoked: res.rowsAffected ?? 0 };
  }

  /* ------------------------------------------------------------ 내부 */

  #assertOrgIds(orgIds) {
    if (!Array.isArray(orgIds)) throw fail(400, '기관 목록은 배열이어야 합니다');
    for (const orgId of orgIds) {
      if (!ORG_RE.test(String(orgId))) throw fail(400, `기관 식별자가 올바르지 않습니다: ${orgId}`);
    }
    if (new Set(orgIds).size !== orgIds.length) throw fail(400, '기관이 중복되었습니다');
  }
}
