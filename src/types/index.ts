/**
 * 프로젝트 공용 타입 정의.
 *
 * 이 파일은 런타임에는 아무 것도 하지 않습니다 (`export interface` / `type` 은
 * esbuild 가 변환 시점에 전부 제거). 순수하게 편집기 / 타입 체커용입니다.
 */
import type { Request, Response, NextFunction } from 'express';

/* =========================================================
 * 1) 요청 파라미터 타입
 *    query + body + params 를 병합한 객체.
 *    controllerLoader 의 mergeParams() 결과물과 대응됩니다.
 *
 *    Record<string, unknown> 는 "키는 임의의 문자열, 값은 아직 모름" 이라는 뜻.
 *    `any` 대신 `unknown` 을 쓰면 사용하는 쪽에서 반드시 타입 좁히기(narrowing)를
 *    강제하게 되어 실수를 줄여줍니다.
 * ========================================================= */
export type RequestParams = Record<string, unknown>;

/* =========================================================
 * 2) 핸들러 시그니처
 *    각 @GetMapping / @PostMapping 메서드의 시그니처.
 *    반환 타입이 Promise<T> | T 인 이유: 컨트롤러는 동기/비동기 둘 다 허용됩니다.
 * ========================================================= */
export type RouteHandler<TResult = unknown> = (
  params: RequestParams,
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<TResult> | TResult;

/* =========================================================
 * 3) 페이지네이션 공용 타입
 *    db.executeList() 가 반환하는 형태, 그리고 라우터가 최종 응답으로
 *    감싸주는 형태 두 가지.
 * ========================================================= */
export interface PageHeader {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/** db.execute() 반환 타입 */
export interface ListResult<T> {
  rows: T[];
}

/** db.executeList() 반환 타입 */
export interface PagedResult<T> {
  rows: T[];
  header: PageHeader;
}

/** 컨트롤러가 내려주는 최종 응답 래핑 타입 */
export interface PagedResponse<T> {
  ok: true;
  header: PageHeader;
  data: T[];
}

/* =========================================================
 * 4) 도메인 타입 (예시: User)
 *    DB 스키마와 대응되는 레코드 타입.
 * ========================================================= */
export interface User {
  id: number;
  name: string;
  email: string;
  created_at?: string;
}

/** 신규 생성 시 DTO (id 는 자동생성되면 optional) */
export type CreateUserDto = Pick<User, 'id' | 'name' | 'email'>;

// @Log 로 주입되는 logger 의 최소 인터페이스.
// logger 파일의 실제 구현과 일치하는 메서드만 선언.
export interface AppLogger {
  error(msg: unknown, meta?: Record<string, unknown>): void;
  warn(msg: unknown, meta?: Record<string, unknown>): void;
  info(msg: unknown, meta?: Record<string, unknown>): void;
  http(msg: unknown, meta?: Record<string, unknown>): void;
  debug(msg: unknown, meta?: Record<string, unknown>): void;
}

/** 페이지네이션 옵션 (query 에서 넘어온 원시값을 그대로 받음) */
export interface ListOptions {
  page?: number | string;
  perPage?: number | string;
}


export interface SignupInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface ClientMeta {
  userAgent?: string;
  ip?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: string;
  user: { id: number; name: string; username: string; email: string; role: string };
}
