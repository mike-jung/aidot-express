/**
 * AuthService — 회원가입, 로그인, 토큰 회전(rotation), 로그아웃.
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

import { Service, Sql, Log } from '../core/decorators.js';
import {
  signAccessToken,
  createRefreshToken,
  parseRefreshToken,
  safeEqualHex,
} from '../core/tokens.js';
import db from '../database/db.js';
import config from '../config/index.js';
import crypto from 'node:crypto';
import type { SqlFile } from '../core/sqlLoader.js';

import type {
  SignupInput,
  LoginInput,
  TokenPair,
  ClientMeta,
  AppLogger,
} from '../types/index.js';


// OWASP 2026 Argon2id 최소 파라미터
const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

// 응답 시간 균일화를 위한 더미 해시 (timing attack 완화)
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0ZHVtbXlzYWx0$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';


// 인증 API 서비스
// @Service 데코레이터로 컨테이너에 'AuthService'라는 이름으로 등록

@Service('AuthService2')
export default class AuthService2 {
  @Sql('auth') authSql!: SqlFile;
  @Log log!: AppLogger;

  /* ==================== 회원가입 ==================== */
  async signup(input: SignupInput): Promise<{ id: number }> {
    if (config.auth.registrationOpen === false) {
      throw Object.assign(new Error('Registration is disabled'), { status: 403 });
    }
    const passwordHash = await argon2.hash(input.password, ARGON2_OPTS);
    try {
      const res = await db.execute(this.authSql.get('insertUser'), {
        name: (input as any).name,
        username: input.username,
        email: input.email,
        password_hash: passwordHash,
        role: 'user',
      });
      const id = Number(res.insertId ?? 0);
      this.log.info(`회원가입 성공 id=${id} username=${input.username}`);
      return { id };
    } catch (e: any) {
      if (e?.code === 'ER_DUP_ENTRY' || /Duplicate/i.test(e?.message ?? '')) {
        throw Object.assign(new Error('username or email already exists'), {
          status: 409,
        });
      }
      throw e;
    }
  }

  /* ==================== 로그인 ==================== */
  async login(input: LoginInput, meta: ClientMeta = {}): Promise<TokenPair> {
    const rows = (
      await db.execute(this.authSql.get('findUserByUsername'), {
        username: input.username,
      })
    ).rows as any[];
    const user = rows[0];

    const hashToCheck = user?.password_hash ?? DUMMY_HASH;
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
      this.log.warn(`로그인 실패 username=${input.username}`);
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      this.log.warn(`잠긴 계정 로그인 시도 id=${user.id}`);
      throw Object.assign(new Error('Account is locked. Try again later.'), {
        status: 423,
      });
    }

    await db.execute(this.authSql.get('resetFailedAttempts'), { id: user.id });
    return this._issueNewPair(user, meta, crypto.randomUUID());
  }

  /* ==================== 토큰 회전 ==================== */
  async rotate(rawToken: string, meta: ClientMeta = {}): Promise<TokenPair> {
    const parsed = parseRefreshToken(rawToken);
    if (!parsed) {
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }

    const rows = (
      await db.execute(this.authSql.get('findRefreshToken'), {
        token_hash: parsed.hash,
      })
    ).rows as any[];
    const rt = rows[0];

    if (!rt) {
      this.log.warn('알려지지 않은 refresh token 사용 시도');
      throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
    }
    // timing-safe 해시 비교 (위조된 해시 충돌 방어)
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
    ).rows as any[];
    const user = userRows[0];
    if (!user || user.status !== 'active') {
      throw Object.assign(new Error('User not available'), { status: 401 });
    }

    // 트랜잭션: 새 토큰 insert → 기존 토큰 revoke
    return db.transaction(async (tx: any) => {
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
      });
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
  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;
    const parsed = parseRefreshToken(rawToken);
    if (!parsed) return;
    const rows = (
      await db.execute(this.authSql.get('findRefreshToken'), {
        token_hash: parsed.hash,
      })
    ).rows as any[];
    const rt = rows[0];
    if (rt && !rt.revoked_at) {
      await db.execute(this.authSql.get('revokeRefreshToken'), {
        id: rt.id,
        replaced_by_id: null,
      });
    }
  }

  /* ==================== 전체 세션 로그아웃 ==================== */
  async logoutAll(userId: number): Promise<void> {
    await db.execute(this.authSql.get('revokeAllUserTokens'), {
      user_id: userId,
    });
  }

  /* ==================== 내부: 새 토큰 쌍 발급 ==================== */
  private async _issueNewPair(
    user: any,
    meta: ClientMeta,
    familyId: string,
  ): Promise<TokenPair> {
    const newRt = createRefreshToken();

    await db.execute(this.authSql.get('insertRefreshToken'), {
      user_id: user.id,
      token_hash: newRt.tokenHash,
      family_id: familyId,
      user_agent: meta.userAgent ?? null,
      ip_address: meta.ip ?? null,
      expires_at: newRt.expiresAt,
    });

    const accessToken = signAccessToken({ id: user.id, role: user.role, username: user.username });

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
