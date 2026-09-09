import { rotateToken, revokeRefreshFamily } from '../../../src/core/refreshRotation.js';
/**
 * AdminAuthService — 어드민(개발도구) 영역 인증.
 * 일반 AuthService 와 동일한 로직이지만 admin_users / admin_refresh_tokens 사용.
 */
import argon2 from 'argon2';
import { unrevokeUser } from '../../../src/core/revokedUsers.js';   // ★ v1.11.9
import crypto from 'node:crypto';

import { Service, Sql, Log } from '../../../src/core/decorators.js';
import {
  REALMS,
  signAccessToken,
  createRefreshToken,
  parseRefreshToken,
  safeEqualHex,
} from '../../../src/core/tokens.js';
import db from '../../../src/database/db.js';
import config from '../../../src/config/index.js';
import container from '../../../src/core/container.js';

/** AccessLogService 를 lazy 하게 가져옴 (없으면 무시). */
function getAccessLog() {
  try {
    return container.has('AccessLogService') ? container.resolve('AccessLogService') : null;
  } catch { return null; }
}

const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

let DUMMY_HASH = null;
async function getDummyHash() {
  // 존재하지 않는 계정도 실제 argon2 검증 비용을 치르게 해 사용자명 열거(timing) 를 막는다.
  if (!DUMMY_HASH) DUMMY_HASH = await argon2.hash('aidot-dummy-' + crypto.randomUUID(), ARGON2_OPTS);
  return DUMMY_HASH;
}

@Service('AdminAuthService')
export default class AdminAuthService {

  @Sql('admin_auth') authSql;
  @Log log;

  async signup(input) {
    const passwordHash = await argon2.hash(input.password, ARGON2_OPTS);
    try {
      const res = await db.execute(this.authSql.get('insertUser'), {
        name: input.name,
        username: input.username,
        email: input.email,
        password_hash: passwordHash,
        role: 'admin',
      });
      const id = Number(res.insertId ?? 0);
      this.log.info(`[admin] sign-up ok id=${id} username=${input.username}`);
      return { id };
    } catch (e) {
      if (e?.code === 'ER_DUP_ENTRY' || /Duplicate/i.test(e?.message ?? '')) {
        throw Object.assign(new Error('username or email already exists'), { status: 409 });
      }
      throw e;
    }
  }

  async login(input, meta = {}) {
    // DB 접속 자체가 실패하면 "Invalid credentials" 가 아니라 원인을 명시해 반환.
    // 이렇게 해야 프론트엔드 로그인 화면에서 "비밀번호 틀림"과 "DB 접속 실패"를 구분할 수 있다.
    let rows;
    try {
      rows = (
        await db.execute(this.authSql.get('findUserByUsername'), { username: input.username })
      ).rows;
    } catch (e) {
      const msg = e?.code ? `${e.code}: ${e.message}` : (e?.message || String(e));
      this.log.error(`[admin] database connection failed during login: ${msg}`);
      throw Object.assign(new Error(`DB connection error: ${msg}`), {
        status: 503,
        code: 'DB_CONNECTION_ERROR',
      });
    }
    const user = rows[0];

    // 잠긴 계정: 비밀번호 정답 여부와 무관하게 동일한 423 응답 (정답 여부가 새지 않도록 검증 자체를 생략)
    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      this.log.warn(`[admin] sign-in attempt on a locked account id=${user.id}`);
      throw Object.assign(new Error('Account is locked. Try again later.'), { status: 423 });
    }

    const hashToCheck = user?.password_hash ?? await getDummyHash();
    let passwordOk = false;
    try { passwordOk = await argon2.verify(hashToCheck, input.password); } catch { passwordOk = false; }

    if (!user || !passwordOk || user.status !== 'active') {
      if (user) {
        await db.execute(this.authSql.get('incrementFailedAttempts'), {
          id: user.id,
          // v1.7.4: default.js 의 키는 maxFailedLogins 다. 예전엔 maxFailedAttempts 만 읽어서
          //   .env/설정으로 값을 바꿔도 반영되지 않았다 (fallback 5 와 값이 같아 증상이 없었음).
          max_attempts: config.auth.maxFailedLogins ?? config.auth.maxFailedAttempts ?? 5,
          lock_minutes: config.auth.lockMinutes ?? 15,
        });
      }
      this.log.warn(`[admin] sign-in failed username=${input.username}`);
      // 접속 통계: 로그인 실패 기록
      try {
        getAccessLog()?.recordLoginFailed({
          userId: user?.id || null,
          username: input.username,
          sessionKind: 'admin',
          ip: meta.ip ?? null,
          userAgent: meta.userAgent ?? null,
        });
      } catch { /* noop */ }
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }


    await db.execute(this.authSql.get('resetFailedAttempts'), { id: user.id });
    /* ★ v1.11.9 — 로그인에 성공했다는 것은 계정이 살아 있고 비밀번호가 맞다는 뜻이다.
       강제 종료·비활성으로 걸어 둔 차단 표시를 여기서 지운다 (비활성 계정은 위에서 이미 막힌다). */
    unrevokeUser(user.id);
    const pair = await this._issueNewPair(user, meta, crypto.randomUUID());
    // 접속 통계: 로그인 성공 기록 + 세션 생성
    try {
      await getAccessLog()?.recordLogin({
        userId: user.id,
        username: user.username,
        sessionKind: 'admin',
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });
    } catch { /* noop */ }
    return pair;
  }

  async rotate(rawToken, meta = {}) {
    const parsed = parseRefreshToken(rawToken);
    if (!parsed) throw Object.assign(new Error('Invalid refresh token'), { status: 401 });

    const rows = (
      await db.execute(this.authSql.get('findRefreshToken'), { token_hash: parsed.hash })
    ).rows;
    const rt = rows[0];

    if (!rt) throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    if (!safeEqualHex(rt.token_hash, parsed.hash)) {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }
    if (new Date(rt.expires_at) < new Date()) {
      throw Object.assign(new Error('Refresh token expired'), { status: 401 });
    }
    if (rt.revoked_at) {
      this.log.error(`[admin] refresh token reuse detected user=${rt.user_id} family=${rt.family_id}`);
      await revokeRefreshFamily(db, this.authSql, rt.family_id);
      throw Object.assign(new Error('Refresh token reuse detected. All sessions revoked.'), { status: 401 });
    }

    const userRows = (
      await db.execute(this.authSql.get('findUserById'), { id: rt.user_id })
    ).rows;
    const user = userRows[0];
    if (!user || user.status !== 'active' || Number(rt.token_version ?? 0) !== Number(user.token_version ?? 0)) {
      throw Object.assign(new Error('User not available'), { status: 401 });
    }

    return rotateToken(db, this.authSql, rt, user, meta, REALMS.ADMIN);

  }

  async logout(rawToken) {
    if (!rawToken) return;
    const parsed = parseRefreshToken(rawToken);
    if (!parsed) return;
    const rows = (
      await db.execute(this.authSql.get('findRefreshToken'), { token_hash: parsed.hash })
    ).rows;
    const rt = rows[0];
    if (rt && !rt.revoked_at) {
      await db.execute(this.authSql.get('revokeRefreshToken'), { id: rt.id, replaced_by_id: null });
      // 접속 통계: 해당 user 의 미종료 세션 종료
      try {
        const userRows = (await db.execute(this.authSql.get('findUserById'), { id: rt.user_id })).rows;
        const u = userRows[0];
        if (u) {
          getAccessLog()?.recordLogout({
            userId: rt.user_id,
            username: u.username,
            sessionKind: 'admin',
          });
        }
      } catch { /* noop */ }
    }
  }

  async logoutAll(userId) {
    await db.execute(this.authSql.get('invalidateAccessTokens'), { user_id: userId });
    await db.execute(this.authSql.get('revokeAllUserTokens'), { user_id: userId });
    // 접속 통계: 전체 세션 종료
    try {
      const userRows = (await db.execute(this.authSql.get('findUserById'), { id: userId })).rows;
      const u = userRows[0];
      if (u) {
        getAccessLog()?.recordLogout({
          userId,
          username: u.username,
          sessionKind: 'admin',
          all: true,
        });
      }
    } catch { /* noop */ }
  }

  async _issueNewPair(user, meta, familyId) {
    const newRt = createRefreshToken();
    await db.execute(this.authSql.get('insertRefreshToken'), {
      user_id: user.id,
      token_hash: newRt.tokenHash,
      token_version: Number(user.token_version ?? 0),
      family_id: familyId,
      user_agent: meta.userAgent ?? null,
      ip_address: meta.ip ?? null,
      expires_at: newRt.expiresAt,
    });
    const accessToken = signAccessToken({ id: user.id, token_version: user.token_version, role: user.role, username: user.username }, { realm: REALMS.ADMIN });
    return {
      accessToken,
      refreshToken: newRt.token,
      accessExpiresIn: config.auth.accessTokenTtl ?? '15m',
      user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role,
                mustChangePassword: !!Number(user.must_change_password) },
    };
  }
}
