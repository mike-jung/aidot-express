/**
 * AuthService — 회원가입, 로그인, 토큰 회전(rotation), 로그아웃.
 *
 * 순수 JavaScript 버전 (.js).
 * TypeScript 버전과 100% 동일한 기능. esbuild 로더가 .js 의 데코레이터도 변환해줌.
 *
 * 보안 설계:
 *  - 비밀번호: argon2id (OWASP 2026 권장, m=19456, t=2, p=1)
 *  - 로그인 실패 시 원인 구분 없는 일반 메시지 (계정 열거 방어)
 *  - 존재하지 않는 계정도 더미 해시로 argon2.verify 수행 (timing attack 완화)
 *  - 실패 횟수 누적으로 계정 잠금 (brute force 방어)
 *  - Refresh token 은 "jti.secret" 형태. DB 에는 sha256(token) 만 저장
 *  - Refresh token rotation + reuse detection → 탈취 감지 시 family revoke
 */
import argon2 from 'argon2';
import { unrevokeUser } from '../core/revokedUsers.js';   // ★ v1.11.9
import crypto from 'node:crypto';

import { Service, Sql, Log } from '../core/decorators.js';
import {
  REALMS,
  signAccessToken,
  createRefreshToken,
  parseRefreshToken,
  safeEqualHex,
} from '../core/tokens.js';
import db from '../database/db.js';
import container from '../core/container.js';

function getAccessLog() {
  try {
    return container.has('AccessLogService') ? container.resolve('AccessLogService') : null;
  } catch { return null; }
}
import config from '../config/index.js';

// OWASP 2026 Argon2id 최소 파라미터
const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

// 응답 시간 균일화를 위한 더미 해시 (timing attack 완화)
let DUMMY_HASH = null;
async function getDummyHash() {
  // 존재하지 않는 계정도 실제 argon2 검증 비용을 치르게 해 사용자명 열거(timing) 를 막는다.
  if (!DUMMY_HASH) DUMMY_HASH = await argon2.hash('aidot-dummy-' + crypto.randomUUID(), ARGON2_OPTS);
  return DUMMY_HASH;
}


// 인증 API 서비스 (JS 버전)
// @Service 데코레이터로 컨테이너에 'AuthService'라는 이름으로 등록
@Service('AuthService')
export default class AuthService {

  // SqlFile 객체 주입
  @Sql('auth') authSql;

  // Log 객체 주입
  @Log log;


  /* ==================== 회원가입 ==================== */
  async signup(input) {
    if (config.auth.registrationOpen === false) {
      throw Object.assign(new Error('Registration is disabled'), { status: 403 });
    }
    const passwordHash = await argon2.hash(input.password, ARGON2_OPTS);
    try {
      const res = await db.execute(this.authSql.get('insertUser'), {
        name: input.name,
        username: input.username,
        email: input.email,
        password_hash: passwordHash,
        role: 'user',
      });
      const id = Number(res.insertId ?? 0);
      this.log.info(`sign-up ok id=${id} username=${input.username}`);
      return { id };
    } catch (e) {
      if (e?.code === 'ER_DUP_ENTRY' || /Duplicate/i.test(e?.message ?? '')) {
        throw Object.assign(new Error('username or email already exists'), { status: 409 });
      }
      throw e;
    }
  }

  /* ==================== 로그인 ==================== */
  async login(input, meta = {}) {
    // DB 접속 자체가 실패하면 "Invalid credentials" 가 아니라 원인을 명시해 반환.
    let rows;
    try {
      rows = (
        await db.execute(this.authSql.get('findUserByUsername'), {
          username: input.username,
        })
      ).rows;
    } catch (e) {
      const msg = e?.code ? `${e.code}: ${e.message}` : (e?.message || String(e));
      this.log.error(`[auth] database connection failed during login: ${msg}`);
      throw Object.assign(new Error(`DB connection error: ${msg}`), {
        status: 503,
        code: 'DB_CONNECTION_ERROR',
      });
    }
    const user = rows[0];

    // 잠긴 계정: 비밀번호 정답 여부와 무관하게 동일한 423 응답 (정답 여부가 새지 않도록 검증 자체를 생략)
    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      this.log.warn(`sign-in attempt on a locked account id=${user.id}`);
      throw Object.assign(new Error('Account is locked. Try again later.'), { status: 423 });
    }

    // 존재하지 않아도 더미 해시로 검증 → 응답 시간 유사화
    const hashToCheck = user?.password_hash ?? await getDummyHash();
    let passwordOk = false;
    try {
      passwordOk = await argon2.verify(hashToCheck, input.password);
    } catch {
      passwordOk = false;
    }

    if (!user || !passwordOk || user.status !== 'active') {
      if (user) {
        await db.execute(this.authSql.get('incrementFailedAttempts'), {
          id: user.id,
          max_attempts:
            config.auth.maxFailedLogins ?? config.auth.maxFailedAttempts ?? 5,
          lock_minutes: config.auth.lockMinutes ?? 15,
        });
      }
      this.log.warn(`sign-in failed username=${input.username}`);
      try {
        getAccessLog()?.recordLoginFailed({
          userId: user?.id || null,
          username: input.username,
          sessionKind: 'user',
          ip: meta.ip ?? null,
          userAgent: meta.userAgent ?? null,
        });
      } catch { /* noop */ }
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }


    await db.execute(this.authSql.get('resetFailedAttempts'), { id: user.id });
    unrevokeUser(user.id);   // ★ v1.11.9 로그인 성공 → 차단 표시 해제 (비활성 계정은 위에서 이미 막힌다)
    const pair = await this._issueNewPair(user, meta, crypto.randomUUID());
    try {
      await getAccessLog()?.recordLogin({
        userId: user.id,
        username: user.username,
        sessionKind: 'user',
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      });
    } catch { /* noop */ }
    return pair;
  }

  /* ==================== 토큰 회전 ==================== */
  async rotate(rawToken, meta = {}) {
    const parsed = parseRefreshToken(rawToken);
    if (!parsed) {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }

    const rows = (
      await db.execute(this.authSql.get('findRefreshToken'), {
        token_hash: parsed.hash,
      })
    ).rows;
    const rt = rows[0];

    if (!rt) {
      this.log.warn('unknown refresh token used');
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }
    if (!safeEqualHex(rt.token_hash, parsed.hash)) {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }
    if (new Date(rt.expires_at) < new Date()) {
      throw Object.assign(new Error('Refresh token expired'), { status: 401 });
    }
    if (rt.revoked_at) {
      this.log.error(
        `refresh token 재사용 감지 user=${rt.user_id} family=${rt.family_id} — family revoke`,
      );
      await db.execute(this.authSql.get('revokeTokenFamily'), {
        family_id: rt.family_id,
      });
      throw Object.assign(
        new Error('Refresh token reuse detected. All sessions revoked.'),
        { status: 401 },
      );
    }

    const userRows = (
      await db.execute(this.authSql.get('findUserById'), { id: rt.user_id })
    ).rows;
    const user = userRows[0];
    if (!user || user.status !== 'active') {
      throw Object.assign(new Error('User not available'), { status: 401 });
    }

    return db.transaction(async (tx) => {
      const newRt = createRefreshToken();
      const insRes = await tx.execute(this.authSql.get('insertRefreshToken'), {
        user_id: user.id,
        token_hash: newRt.tokenHash,
        family_id: rt.family_id, // 같은 family 유지
        user_agent: meta.userAgent ?? null,
        ip_address: meta.ip ?? null,
        expires_at: newRt.expiresAt,
      });
      const newId = Number(insRes.insertId ?? 0);

      await tx.execute(this.authSql.get('revokeRefreshToken'), {
        id: rt.id,
        replaced_by_id: newId,
      });

      const accessToken = signAccessToken({
        id: user.id,
        role: user.role,
        username: user.username,
      }, { realm: REALMS.USER });
      return {
        accessToken,
        refreshToken: newRt.token,
        accessExpiresIn: config.auth.accessTokenTtl ?? '15m',
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
    });
  }

  /* ==================== 로그아웃 (현재 세션) ==================== */
  async logout(rawToken) {
    if (!rawToken) return;
    const parsed = parseRefreshToken(rawToken);
    if (!parsed) return;
    const rows = (
      await db.execute(this.authSql.get('findRefreshToken'), {
        token_hash: parsed.hash,
      })
    ).rows;
    const rt = rows[0];
    if (rt && !rt.revoked_at) {
      await db.execute(this.authSql.get('revokeRefreshToken'), {
        id: rt.id,
        replaced_by_id: null,
      });
      try {
        const userRows = (await db.execute(this.authSql.get('findUserById'), { id: rt.user_id })).rows;
        const u = userRows[0];
        if (u) {
          getAccessLog()?.recordLogout({
            userId: rt.user_id,
            username: u.username,
            sessionKind: 'user',
          });
        }
      } catch { /* noop */ }
    }
  }

  /* ==================== 전체 세션 로그아웃 ==================== */
  async logoutAll(userId) {
    await db.execute(this.authSql.get('revokeAllUserTokens'), {
      user_id: userId,
    });
    try {
      const userRows = (await db.execute(this.authSql.get('findUserById'), { id: userId })).rows;
      const u = userRows[0];
      if (u) {
        getAccessLog()?.recordLogout({
          userId,
          username: u.username,
          sessionKind: 'user',
          all: true,
        });
      }
    } catch { /* noop */ }
  }

  /* ==================== 내부: 새 토큰 쌍 발급 ==================== */
  async _issueNewPair(user, meta, familyId) {
    const newRt = createRefreshToken();

    await db.execute(this.authSql.get('insertRefreshToken'), {
      user_id: user.id,
      token_hash: newRt.tokenHash,
      family_id: familyId,
      user_agent: meta.userAgent ?? null,
      ip_address: meta.ip ?? null,
      expires_at: newRt.expiresAt,
    });

    const accessToken = signAccessToken({ id: user.id, role: user.role, username: user.username }, { realm: REALMS.USER });

    return {
      accessToken,
      refreshToken: newRt.token,
      accessExpiresIn: config.auth.accessTokenTtl ?? '15m',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }
}
