import { assertCurrentAccount } from '../../../src/core/accountState.js';
/**
 * AdminAuthController — 어드민(개발도구) 영역 인증.
 * 일반 AuthController 와 동일하지만 /api/admin/auth/* 경로 사용.
 */

import {
  Controller, GetMapping, PostMapping, Autowired, Validate, Auth, Log,
} from '../../../src/core/decorators.js';
import {
  REFRESH_COOKIE_NAME, refreshCookieOptions,
} from '../../../src/core/tokens.js';
import { z } from 'zod';
import config from '../../../src/config/index.js';
import { verifyAccessToken, REALMS } from '../../../src/core/tokens.js';
import db from '../../../src/database/db.js';
import sqlRegistry from '../../../src/core/sqlLoader.js';

const ADMIN_COOKIE_PATH = '/api/admin/auth';

const signupSchema = z.object({
  requestCode: z.string().trim().min(3).optional().default('admin-signup'),
  name: z.string().trim().min(1).max(50),
  username: z.string().trim().min(3).max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'username 은 영문/숫자/_/- 만 허용'),
  email: z.string().trim().min(5).max(200)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'invalid email'),
  password: z.string().min(10, '비밀번호는 10자 이상이어야 합니다').max(200)
    .regex(/[A-Za-z]/, 'password 는 영문자를 포함해야 합니다')
    .regex(/[0-9]/, 'password 는 숫자를 포함해야 합니다'),
}).strip();

const loginSchema = z.object({
  requestCode: z.string().trim().min(3).optional().default('admin-login'),
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(200),
}).strip();

function makeHeader(params) {
  return {
    requestCode: params?.requestCode || null,
    timestamp: new Date()
      .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false })
      .replace('T', ' '),
  };
}

@Controller('/api/admin/auth')
export default class AdminAuthController {

  @Autowired('AdminAuthService') authService;
  @Log log;

  /**
   * POST /api/admin/auth/signup — 관리자 콘솔 계정 생성.
   *
   *  v1.1.x 까지는 무인증으로 열려 있어 누구나 admin 역할 계정을 만들 수 있었다 (치명).
   *  v1.2.0 부터 다음 중 하나일 때만 허용:
   *    (a) 호출자가 realm='admin' + role='admin' 토큰을 제시 (콘솔 [사용자 관리] 와 동일 권한)
   *    (b) admin_users 테이블이 비어 있음 (최초 부트스트랩 — 보통은 AdminBootstrap 이 먼저 채움)
   *    (c) .env ADMIN_SIGNUP_OPEN=true (폐쇄망 초기 구축용, 기본 false)
   */
  @PostMapping('/signup')
  @Validate(signupSchema)
  async signup(params, req, res) {
    const allowed = await this._signupAllowed(req);
    if (!allowed.ok) {
      this.log.warn(`[admin] sign-up refused (${allowed.reason}) ip=${req.ip} username=${params.username}`);
      res.status(403).json({
        code: 403,
        message: '관리자 계정 생성은 관리자만 할 수 있습니다 (콘솔 [사용자 관리] 메뉴를 이용하세요)',
        header: makeHeader(params),
      });
      return;
    }
    this.log.info(`AdminAuthController::signup -> ${params.username} (by ${allowed.reason})`);
    const result = await this.authService.signup(params);
    res.status(201).json({
      code: 201, message: 'Created', header: makeHeader(params),
      data: { user: { id: result.id, name: params.name, username: params.username } },
    });
  }

  @PostMapping('/login')
  @Validate(loginSchema)
  async login(params, req, res) {
    this.log.info(`AdminAuthController::login -> ${params.username}`);
    const pair = await this.authService.login(params, {
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
    });
    res.cookie(REFRESH_COOKIE_NAME, pair.refreshToken, refreshCookieOptions(ADMIN_COOKIE_PATH));
    res.json({
      code: 200, message: 'OK', header: makeHeader(params),
      data: {
        accessToken: pair.accessToken,
        accessExpiresIn: pair.accessExpiresIn,
        user: pair.user,
      },
    });
  }

  @PostMapping('/refresh')
  async refresh(params, req, res) {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!raw || typeof raw !== 'string') {
      res.status(401).json({ code: 401, message: 'Missing refresh token', header: makeHeader(params) });
      return;
    }
    const pair = await this.authService.rotate(raw, {
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
    });
    res.cookie(REFRESH_COOKIE_NAME, pair.refreshToken, refreshCookieOptions(ADMIN_COOKIE_PATH));
    res.json({
      code: 200, message: 'OK', header: makeHeader(params),
      data: {
        accessToken: pair.accessToken,
        accessExpiresIn: pair.accessExpiresIn,
        user: pair.user,
      },
    });
  }

  @PostMapping('/logout')
  async logout(params, req, res) {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(raw);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: ADMIN_COOKIE_PATH });
    res.json({ code: 200, message: 'OK', header: makeHeader(params) });
  }

  @PostMapping('/logout-all')
  @Auth()
  async logoutAll(params, req, res) {
    await this.authService.logoutAll(Number(req.user.id));
    res.clearCookie(REFRESH_COOKIE_NAME, { path: ADMIN_COOKIE_PATH });
    res.json({ code: 200, message: 'OK', header: makeHeader(params) });
  }

  @GetMapping('/me')
  @Auth()
  async me(params, req) {
    return {
      code: 200, message: 'OK', header: makeHeader(params),
      data: { user: req.user },
    };
  }

  /* 내부: signup 허용 여부 판정 */
  async _signupAllowed(req) {
    if (config.auth?.adminSignupOpen === true) return { ok: true, reason: 'ADMIN_SIGNUP_OPEN' };
    const m = /^Bearer\s+(.+)$/i.exec(req.headers?.authorization || '');
    if (m) {
      try {
        const payload = verifyAccessToken(m[1]);
        if (payload.realm === REALMS.ADMIN && payload.role === 'admin') {
          await assertCurrentAccount(payload, { method: req.method, path: req.path });
          return { ok: true, reason: `admin:${payload.username || payload.sub}` };
        }
        return { ok: false, reason: 'insufficient role/realm' };
      } catch {
        return { ok: false, reason: 'invalid token' };
      }
    }
    try {
      const { rows } = await db.execute(sqlRegistry.getFile('admin_auth').get('countAll'), {});
      if (Number(rows?.[0]?.cnt ?? 0) === 0) return { ok: true, reason: 'bootstrap(empty admin_users)' };
    } catch { /* DB 오류는 거부로 */ }
    return { ok: false, reason: 'no credentials' };
  }
}
