/**
 * 인증 관련 API 처리 컨트롤러
 * (Typescript 사용)
 *
 * 보안 요약:
 *  - 모든 입력은 Zod 로 엄격 검증
 *  - refresh token 은 httpOnly + secure + sameSite=strict 쿠키로만 전송
 *  - rotation 시 새 토큰이 다시 쿠키로 세팅됨
 *  - /me 는 @Auth 로 보호됨
 */

import type { Request, Response } from 'express';


declare global {
  namespace Express {
    interface Request {
      user?: { id: string | number;[key: string]: any };
    }
  }
}

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

import type AuthService from '../service/AuthService.js';
import type { AppLogger } from '../types/index.js';


/* ================ Zod 스키마 ================ */
import { z } from 'zod';

const signupSchema = z
  .object({
    requestCode: z
      .string()
      .trim()
      .min(3),
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

type SignupInput = z.infer<typeof signupSchema>;
type LoginInput = z.infer<typeof loginSchema>;


// 인증 관련 API 컨트롤러
// 기본 경로를 '/api/auth'로 설정하고 메서드에는 상대 경로만 지정

@Controller('/api/auth2')
export default class AuthController2 {

  // 서비스 주입
  @Autowired('AuthService2') authService!: AuthService;

  // 로그 주입
  @Log log!: AppLogger;


  // 클라이언트 요청 처리 메서드 : 새로운 사용자 생성 POST 방식으로 /api/auth/signup 경로에서 처리
  // 요청 파라미터는 params 객체로 전달받고, 응답 객체 res를 사용하여 직접 응답을 전송
  // POST /api/auth/signup
  @PostMapping('/signup')
  @Validate(signupSchema)
  async signup(params: SignupInput, _req: Request, res: Response): Promise<void> {
    this.log.info(`AuthController::signup 호출됨 -> params=${JSON.stringify(params)}`);

    const result = await this.authService.signup(params);

    // 응답 직접 전송 (HTTP 상태 코드 201, JSON 형태의 응답 본문)
    const output = {
      code: 201,
      message: 'Created',
      header: {
        requestCode: params.requestCode || null,
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' '),
      },
      data: {
        user: {
          id: result.id,
          name: params.name,
          username: params.username
        }
      }
    };

    res
      .status(201)
      .json(output);
  }

  // 클라이언트 요청 처리 메서드 : 사용자 로그인 POST 방식으로 /api/auth/login 경로에서 처리
  // 요청 파라미터는 params 객체로 전달받고, 응답 객체 res를 사용하여 직접 응답을 전송
  // POST /api/auth/login
  @PostMapping('/login')
  @Validate(loginSchema)
  async login(params: LoginInput, req: Request, res: Response): Promise<void> {
    this.log.info(`AuthController::login 호출됨 -> params=${JSON.stringify(params)}`);

    const pair = await this.authService.login(params, {
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
    });
    res.cookie(REFRESH_COOKIE_NAME, pair.refreshToken, refreshCookieOptions('/api/auth2'));

    const output = {
      code: 200,
      message: 'OK',
      header: {
        requestCode: params.requestCode || null,
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' '),
      },
      data: {
        accessToken: pair.accessToken,
        accessExpiresIn: pair.accessExpiresIn,
        user: pair.user,
      },
    };
    res.json(output);
  }

  // 클라이언트 요청 처리 메서드 : refresh token 갱신 POST 방식으로 /api/auth/refresh 경로에서 처리
  // 요청 파라미터는 params 객체로 전달받고, 응답 객체 res를 사용하여 직접 응답을 전송
  // POST /api/auth/refresh
  @PostMapping('/refresh')
  async refresh(params: any, req: Request, res: Response): Promise<void> {
    this.log.info(`AuthController::refresh 호출됨 -> params=${JSON.stringify(params)}`);

    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!raw || typeof raw !== 'string') {
      res.status(401).json({ ok: false, message: 'Missing refresh token' });
      return;
    }
    const pair = await this.authService.rotate(raw, {
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
    });
    res.cookie(REFRESH_COOKIE_NAME, pair.refreshToken, refreshCookieOptions('/api/auth2'));

    const output = {
      code: 200,
      message: 'OK',
      header: {
        requestCode: params?.requestCode || null,
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' '),
      },
      data: {
        accessToken: pair.accessToken,
        accessExpiresIn: pair.accessExpiresIn,
        user: pair.user,
      },
    };
    res.json(output);
  }

  // 클라이언트 요청 처리 메서드 : 사용자 로그아웃 POST 방식으로 /api/auth/logout 경로에서 처리
  // 요청 파라미터는 params 객체로 전달받고, 응답 객체 res를 사용하여 직접 응답을 전송
  // POST /api/auth/logout
  @PostMapping('/logout')
  async logout(params: any, req: Request, res: Response): Promise<void> {
    this.log.info(`AuthController::logout 호출됨 -> params=${JSON.stringify(params)}`);

    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.authService.logout(raw);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth2' });

    res.json({
      code: 200,
      message: 'OK',
      header: {
        requestCode: params?.requestCode || null,
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' '),
      }
    });
  }

  // 클라이언트 요청 처리 메서드 : 모든 세션 로그아웃 POST 방식으로 /api/auth/logout-all 경로에서 처리 (인증 필요)
  // 요청 파라미터는 params 객체로 전달받고, 응답 객체 res를 사용하여 직접 응답을 전송
  // POST /api/auth/logout-all
  @PostMapping('/logout-all')
  @Auth()
  async logoutAll(params: any, req: Request, res: Response): Promise<void> {
    this.log.info(`AuthController::logoutAll 호출됨 -> params=${JSON.stringify(params)}`);

    await this.authService.logoutAll(Number(req.user!.id));
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth2' });

    res.json({
      code: 200,
      message: 'OK',
      header: {
        requestCode: params?.requestCode || null,
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' '),
      }
    });
  }

  // 클라이언트 요청 처리 메서드 : 현재 사용자 정보 조회 GET 방식으로 /api/auth/me 경로에서 처리 (인증 필요)
  // 요청 파라미터는 params 객체로 전달받음
  // GET /api/auth/me
  @GetMapping('/me')
  @Auth()
  async me(params: any, req: Request): Promise<unknown> {
    this.log.info(`AuthController::me 호출됨 -> params=${JSON.stringify(params)}`);

    return {
      code: 200,
      message: 'OK',
      header: {
        requestCode: params?.requestCode || null,
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' '),
      },
      data: { user: req.user },
    };
  }
}
