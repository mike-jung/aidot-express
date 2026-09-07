/**
 * AdminUserService — 어드민 사용자 관리 (role: admin).
 *
 *  기능:
 *    - 목록 조회 (pagination)
 *    - 사용자 추가/수정/삭제
 *    - 비밀번호 변경 (본인 또는 관리자)
 *    - 잠금 해제
 */
import argon2 from 'argon2';
import { revokeUser, unrevokeUser } from '../../../src/core/revokedUsers.js';   // ★ v1.11.8
import { Service, Sql, Log } from '../../../src/core/decorators.js';
import db from '../../../src/database/db.js';
import config from '../../../src/config/index.js';
import sqlRegistry from '../../../src/core/sqlLoader.js';

/** 가장 흔한 비밀번호 — NIST 800-63B 의 '유출/사전 목록 차단' 최소 구현 */
const WEAK_PASSWORDS = new Set([
  'admin1234', 'admin123', 'administrator', 'password', 'password1', 'password12', 'password123', 'passw0rd',
  '1234567890', '12345678901', 'qwertyuiop', 'qwerty1234', 'qwerty12345', 'iloveyou12', 'abc1234567',
  'aidot12345', 'aidotexpress', 'admin12345', 'changeme123', 'welcome123', 'letmein123',
]);

const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Service('AdminUserService')
export default class AdminUserService {

  @Log log;

  @Sql('admin_user') userSql;

  /** 페이지네이션된 사용자 목록 조회 */
  async listPaged({ page = 1, perPage = 20 } = {}) {
    const p = Math.max(1, Number(page) || 1);
    const pp = Math.max(1, Math.min(100, Number(perPage) || 20));
    const offset = (p - 1) * pp;

    const [rowsRes, countRes] = await Promise.all([
      db.execute(this.userSql.get('listPaged'), { limit: pp, offset }),
      db.execute(this.userSql.get('countAll'), {}),
    ]);

    const total = Number(countRes.rows[0]?.cnt ?? 0);
    return {
      rows: rowsRes.rows,
      header: { total, page: p, perPage: pp, totalPages: Math.max(1, Math.ceil(total / pp)) },
    };
  }

  /** 단일 사용자 조회 */
  async getById(id) {
    const { rows } = await db.execute(this.userSql.get('findById'), { id });
    if (!rows[0]) throw Object.assign(new Error('사용자를 찾을 수 없습니다.'), { status: 404 });
    return rows[0];
  }

  /**
   * ★ v1.11.8 — 비밀번호 규칙을 한 곳에서. 예전에는 **만들 때는 6자만 넘으면 통과**하고
   *   바꿀 때만 10자·영문+숫자·흔한 것·아이디 포함 금지를 따졌다. 실행 검증에서
   *   `abc123` · `password123` 계정이 그대로 만들어지는 것을 확인했다.
   */
  assertPasswordPolicy(password, username) {
    const minLen = Number(config.auth?.minPasswordLength) || 10;
    if (typeof password !== 'string' || password.length < minLen || password.length > 200) {
      throw Object.assign(new Error(`비밀번호는 ${minLen}자 이상 200자 이하여야 합니다.`), { status: 400 });
    }
    if (WEAK_PASSWORDS.has(password.toLowerCase())) {
      throw Object.assign(new Error('너무 흔한 비밀번호입니다. 다른 비밀번호를 사용하세요.'), { status: 400 });
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw Object.assign(new Error('비밀번호에는 영문자와 숫자가 모두 포함되어야 합니다.'), { status: 400 });
    }
    if (username && password.toLowerCase().includes(String(username).toLowerCase())) {
      throw Object.assign(new Error('비밀번호에 아이디를 포함할 수 없습니다.'), { status: 400 });
    }
  }

  /** 사용자 추가 */
  async create({ name, username, email, password, role = 'admin', status = 'active' }) {
    this._validateRequired({ name, username, email, password });
    this.assertPasswordPolicy(password, username);   // ★ v1.11.8 바꿀 때와 같은 규칙
    await this._assertUsernameNotExists(username);
    await this._assertEmailNotExists(email);

    const password_hash = await argon2.hash(password, ARGON2_OPTS);
    /* ★ v1.11.8 — 관리자가 정해 준 비밀번호는 본인이 한 번 바꾸게 한다 (must_change_password=1).
       관리자가 아는 비밀번호를 계속 쓰면 "누가 했는지" 를 가릴 수 없다. 로그인하면 콘솔이 띠로 알린다. */
    const res = await db.execute(this.userSql.get('insertUser'), {
      name, username, email, password_hash, role, status, must_change_password: 1,
    });
    this.log.info(`[admin] 사용자 추가: ${username} (role=${role}, 최초 로그인 시 비밀번호 변경 필요)`);
    return { id: res.insertId, username, mustChangePassword: true };
  }

  /** 사용자 수정 (비밀번호 제외 — 별도 API) */
  async update(id, { name, email, role, status }) {
    if (!name || !email) {
      throw Object.assign(new Error('name, email 은 필수입니다.'), { status: 400 });
    }
    const existing = await this.getById(id);
    if (email !== existing.email) {
      await this._assertEmailNotExists(email);
    }
    const nextStatus = status || existing.status;
    await db.execute(this.userSql.get('updateUser'), {
      id, name, email,
      role: role || existing.role,
      status: nextStatus,
    });
    /* ★ v1.11.8 — 계정을 비활성으로 바꾸면 **지금 있는 세션도 끊는다**.
       예전에는 로그인만 막히고, 이미 발급된 access 토큰은 만료(15분)까지 그대로 통했다(실행 검증에서 확인). */
    if (nextStatus !== 'active' && existing.status === 'active') {
      revokeUser(id);
      try { await db.execute(sqlRegistry.getFile('admin_auth').get('revokeAllUserTokens'), { user_id: id }); }
      catch (e) { this.log.warn(`[admin] 세션 폐기 실패(무시): ${e.message}`); }
      this.log.info(`[admin] 사용자 비활성 → 세션 즉시 차단: id=${id}`);
    } else if (nextStatus === 'active' && existing.status !== 'active') {
      unrevokeUser(id);
    }
    this.log.info(`[admin] 사용자 수정: id=${id}`);
    return { id };
  }

  /** 비밀번호 변경 — 본인(currentPassword 확인) 또는 관리자(확인 없음) */
  async changePassword(id, { currentPassword, newPassword, skipCurrentCheck = false } = {}) {
    const { rows: who } = await db.execute(this.userSql.get('findById'), { id });
    this.assertPasswordPolicy(newPassword, who[0]?.username);   // ★ v1.11.8 만들 때와 같은 규칙

    if (!skipCurrentCheck) {
      if (!currentPassword) {
        throw Object.assign(new Error('현재 비밀번호를 입력하세요.'), { status: 400 });
      }
      const { rows } = await db.execute(this.userSql.get('findForPasswordCheck'), { id });
      if (!rows[0]) throw Object.assign(new Error('사용자를 찾을 수 없습니다.'), { status: 404 });
      const ok = await argon2.verify(rows[0].password_hash, currentPassword).catch(() => false);
      if (!ok) throw Object.assign(new Error('현재 비밀번호가 일치하지 않습니다.'), { status: 400 });
    }
    const password_hash = await argon2.hash(newPassword, ARGON2_OPTS);
    /* ★ v1.11.8 — 관리자가 남의 비밀번호를 정해 준 경우(skipCurrentCheck)는 본인이 로그인해서 다시 바꾸게 한다 */
    await db.execute(this.userSql.get(skipCurrentCheck ? 'updatePasswordForceChange' : 'updatePassword'), { id, password_hash });
    // 비밀번호 변경 시 기존 refresh 세션 전부 폐기 (탈취된 세션 차단). 현재 access token 은 만료(15m)까지 유효.
    try {
      await db.execute(sqlRegistry.getFile('admin_auth').get('revokeAllUserTokens'), { user_id: id });
    } catch (e) { this.log.warn(`[admin] 세션 폐기 실패(무시): ${e.message}`); }
    this.log.info(`[admin] 비밀번호 변경: id=${id}`);
    return { id, sessionsRevoked: true };
  }

  /** 사용자 삭제 */
  async remove(id, opts = {}) {
    const user = await this.getById(id);
    if (opts.actorId != null && Number(opts.actorId) === Number(id)) {
      throw Object.assign(new Error('자기 자신의 계정은 삭제할 수 없습니다.'), { status: 400 });
    }
    if (user?.role === 'admin' && user?.status === 'active') {
      const { rows } = await db.execute(sqlRegistry.getFile('admin_auth').get('countActiveAdmins'), {});
      if (Number(rows?.[0]?.cnt ?? 0) <= 1) {
        throw Object.assign(new Error('마지막 활성 관리자 계정은 삭제할 수 없습니다.'), { status: 400 });
      }
    }
    // 최소 안전장치: admin 이 1명뿐이면 삭제 차단
    const { rows } = await db.execute(this.userSql.get('countAll'), {});
    if (Number(rows[0]?.cnt ?? 0) <= 1) {
      throw Object.assign(new Error('마지막 관리자는 삭제할 수 없습니다.'), { status: 400 });
    }
    await db.execute(this.userSql.get('deleteById'), { id });
    revokeUser(id);   // ★ v1.11.8 삭제된 계정의 토큰도 즉시 막는다
    try { await db.execute(sqlRegistry.getFile('admin_auth').get('revokeAllUserTokens'), { user_id: id }); } catch { /* noop */ }
    this.log.info(`[admin] 사용자 삭제: id=${id} (${user.username})`);
    return { id };
  }

  /** 잠금 해제 */
  async unlock(id) {
    await this.getById(id);
    await db.execute(this.userSql.get('unlockUser'), { id });
    return { id };
  }

  /* ---------- 내부 검증 ---------- */

  _validateRequired({ name, username, email, password }) {
    const missing = [];
    if (!name) missing.push('name');
    if (!username) missing.push('username');
    if (!email) missing.push('email');
    if (!password) missing.push('password');
    if (missing.length > 0) {
      throw Object.assign(new Error(`필수 필드 누락: ${missing.join(', ')}`), { status: 400 });
    }
  }

  async _assertUsernameNotExists(username) {
    const { rows } = await db.execute(this.userSql.get('existsByUsername'), { username });
    if (Number(rows[0]?.cnt ?? 0) > 0) {
      throw Object.assign(new Error('이미 사용 중인 username 입니다.'), { status: 409 });
    }
  }

  async _assertEmailNotExists(email) {
    const { rows } = await db.execute(this.userSql.get('existsByEmail'), { email });
    if (Number(rows[0]?.cnt ?? 0) > 0) {
      throw Object.assign(new Error('이미 사용 중인 email 입니다.'), { status: 409 });
    }
  }
}
