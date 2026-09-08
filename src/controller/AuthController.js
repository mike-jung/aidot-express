/**
 * 인증 관련 API 처리 컨트롤러 (순수 JavaScript 버전)
 *
 * 기본 경로: /api/auth
 *
 * 보안 요약:
 *  - 모든 입력은 Zod 로 엄격 검증
 *  - refresh token 은 httpOnly + secure + sameSite=strict 쿠키로만 전송
 *  - rotation 시 새 토큰이 다시 쿠키로 세팅됨
 *  - /me, /logout-all 은 @Auth 로 보호됨
 */

import {
  Controller,
  GetMapping,
  PostMapping,
  Autowired,
  Validate,
  Auth,
  Log,
} from '../core/decorators.js';

import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '../core/tokens.js';

import { z } from 'zod';


/* ================ Zod 스키마 ================ */

const signupSchema = z
  .object({
    requestCode: z.string().trim().min(3),
    name: z.string().trim().min(1).max(50),
    username: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9_-]+$/, 'username 은 영문/숫자/_/- 만 허용'),
    email: z
      .string()
      .trim()
      .min(5)
      .max(200)
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'invalid email'),
    password: z
      .string()
      .min(8)
      .max(200)
      .regex(/[A-Za-z]/, 'password 는 영문자를 포함해야 합니다')
      .regex(/[0-9]/, 'password 는 숫자를 포함해야 합니다'),
  })
  .strip();

const loginSchema = z
  .object({
    requestCode: z.string().trim().min(3),
    username: z.string().trim().min(1).max(50),
    password: z.string().min(1).max(200),
  })
  .strip();


// 공통 응답 헤더 생성 헬퍼
function makeHeader(params) {
  return {
    requestCode: params?.requestCode || null,
    timestamp: new Date()
      .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false })
      .replace('T', ' '),
  };
}


// 인증 API 컨트롤러 (JS 버전)
// 기본 경로 '/api/auth' — 클라이언트는 이쪽으로 접근

@Controller('/api/auth')
export default class AuthController {

  // 서비스 주입 (JS 버전 AuthService)
  @Autowired('AuthService') authService;

  // 로그 주입
  @Log log;


  // POST /api/auth/signup
  @PostMapping('/signup')
  @Validate(signupSchema)
  async signup(params, _req, res) {
    this.log.info(`AuthController::signup called -> params=${JSON.stringify({ ...params, password: '***' })}`);

    const result = await this.authService.signup(params);

    res.status(201).json({
      code: 201,
      message: 'Created',
      header: makeHeader(params),
      data: {
        user: { id: result.id, name: params.name, username: params.username },
      },
    });
  }

  // POST /api/auth/login
  @PostMapping('/login')
  @Validate(loginSchema)
  async login(params, req, res) {
    this.log.info(`AuthController::login called -> username=${params.username}`);

    const pair = await this.authService.login(params, {
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
    });
    res.cookie(REFRESH_COOKIE_NAME, pair.refreshToken, refreshCookieOptions('/api/auth'));

    res.json({
      code: 200,
      message: 'OK',
      header: makeHeader(params),
      data: {
        accessToken: pair.accessToken,
        accessExpiresIn: pair.accessExpiresIn,
        user: pair.user,
      },
    });
  }

  // POST /api/auth/refresh
  @PostMapping('/refresh')
  async refresh(params, req, res) {
    this.log.info(`AuthController::refresh called`);

    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!raw || typeof raw !== 'string') {
      res.status(401).json({
        code: 401,
        message: 'Missing refresh token',
        header: makeHeader(params),
      });
      return;
    }
    const pair = await this.authService.rotate(raw, {
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
    });
    res.cookie(REFRESH_COOKIE_NAME, pair.refreshToken, refreshCookieOptions('/api/auth'));

    res.json({
      code: 200,
      message: 'OK',
      header: makeHeader(params),
      data: {
        accessToken: pair.accessToken,
        accessExpiresIn: pair.accessExpiresIn,
        user: pair.user,
      },
    });
  }

  // POST /api/auth/logout
  @PostMapping('/logout')
  async logout(params, req, res) {
    this.log.info(`AuthController::logout called`);

    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(raw);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });

    res.json({
      code: 200,
      message: 'OK',
      header: makeHeader(params),
    });
  }

  // POST /api/auth/logout-all (인증 필요)
  @PostMapping('/logout-all')
  @Auth()
  async logoutAll(params, req, res) {
    this.log.info(`AuthController::logoutAll called -> userId=${req.user?.id}`);

    await this.authService.logoutAll(Number(req.user.id));
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });

    res.json({
      code: 200,
      message: 'OK',
      header: makeHeader(params),
    });
  }

  // GET /api/auth/me (인증 필요)
  @GetMapping('/me')
  @Auth()
  async me(params, req) {
    this.log.info(`AuthController::me called -> userId=${req.user?.id}`);

    return {
      code: 200,
      message: 'OK',
      header: makeHeader(params),
      data: { user: req.user },
    };
  }
}
