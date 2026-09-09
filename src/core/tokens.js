/**
 * 토큰 발급 및 검증 유틸.
 *
 * 전략:
 *  - Access Token: JWT (HS256). 페이로드에 최소 정보만 (sub, role). 15분 만료.
 *    서명 검증 후 보호된 요청은 DB 계정 상태/버전을 확인.
 *  - Refresh Token: 크립토 랜덤 256bit (opaque). JWT 가 아님 — 크기 작고
 *    서버 측 상태(auth_sessions)와 함께 써야 rotation/revocation 가능.
 *    DB 에는 SHA-256 해시만 저장 (유출 대비).
 *
 *  Refresh token 포맷: "<jti>.<secret>"
 *    - jti: 세션 row ID (UUID). DB 조회 키.
 *    - secret: 32-byte 랜덤 base64url. 해시 비교.
 */
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import config from '../config/index.js';
import { isPlaceholderSecret } from './secretPolicy.cjs';

/** JWT 서명 알고리즘은 고정. 공격자가 'alg: none' 이나 비대칭↔대칭 혼동으로
 *  우회하는 것을 방지하기 위해 verify 시 algorithms 를 명시적으로 제한. */
const JWT_ALG = 'HS256';

/** 배포본/예제 파일에 들어 있던 플레이스홀더 값들 — 운영 중 절대 사용 금지 */
const KNOWN_WEAK_SECRETS = new Set([
  'CHANGE_ME_IN_ENV_FILE_MINIMUM_32_CHARS_LONG!',
  'dev-secret-change-me-please-0123456789abcdefghijklmnopqrstuvwxyz',
]);

/**
 * 시크릿 품질 검사. 결과는 { ok, reason } — 부팅 시 한 번 검사해 production 이면 중단, 개발이면 경고.
 *  - 길이 32자 미만
 *  - 알려진 플레이스홀더
 *  - 'dev-' / 'test-' / 'change' 접두·포함 같은 전형적인 자리표시
 *  - 서로 다른 문자 수가 16 미만 (반복 문자열, 키보드 나열 등 저엔트로피)
 */
export function assessSecret(s) {
  if (!s || typeof s !== 'string') return { ok: false, level: 'error', reason: 'AUTH_ACCESS_SECRET 이 비어 있습니다' };
  if (s.length < 32) return { ok: false, level: 'error', reason: `AUTH_ACCESS_SECRET 이 너무 짧습니다 (${s.length}자, 최소 32자)` };
  if (KNOWN_WEAK_SECRETS.has(s)) return { ok: false, level: 'error', reason: 'AUTH_ACCESS_SECRET 이 배포본의 기본값(플레이스홀더)입니다' };
  if (new Set(s).size < 8) return { ok: false, level: 'error', reason: 'AUTH_ACCESS_SECRET 의 문자 다양성이 너무 낮습니다 (랜덤 값을 사용하세요)' };
  if (/^(dev|test|sample|example)[-_]/i.test(s) || /change[-_ ]?me/i.test(s)) {
    return { ok: false, level: 'error', reason: 'AUTH_ACCESS_SECRET 이 개발용 자리표시 문자열로 보입니다 (dev-/test-/change-me). 운영 전 교체하세요' };
  }
  return { ok: true, level: 'ok' };
}

let _ephemeralSecret = null;
let _warnedEphemeral = false;

export function getAccessSecret() {
  const s = config.auth.accessSecret;
  const weak = isPlaceholderSecret(s) || KNOWN_WEAK_SECRETS.has(s);
  if (!weak) return s;

  if (config.env === 'production') {
    // 기본값/빈 값으로는 토큰을 절대 발급·검증하지 않는다 — 공개된 값이라 누구나 admin 토큰을 위조할 수 있음.
    throw new Error('AUTH_ACCESS_SECRET 이 비어 있거나 기본값입니다. .env 에 랜덤 값을 설정하세요: '
      + 'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"');
  }
  // development: 프로세스 수명 동안만 유효한 임시 시크릿 (재시작 시 모든 세션 무효). 기동은 막지 않되 크게 경고.
  if (!_ephemeralSecret) _ephemeralSecret = crypto.randomBytes(48).toString('base64url');
  if (!_warnedEphemeral) {
    _warnedEphemeral = true;
    process.stderr.write('[auth] ⚠ AUTH_ACCESS_SECRET 이 비어 있거나 기본값이라 임시 시크릿으로 기동합니다 (재시작 시 로그인 세션 전부 만료). '
      + '.env 에 AUTH_ACCESS_SECRET 을 설정하세요. (`npm start` 가 .env 를 자동 생성할 때는 랜덤 값이 들어갑니다)\n');
  }
  return _ephemeralSecret;
}

export const REALMS = Object.freeze({ USER: 'user', ADMIN: 'admin' });

export function signAccessToken(user, opts = {}) {
  const realm = opts.realm ?? user.realm ?? REALMS.USER;
  if (realm !== REALMS.USER && realm !== REALMS.ADMIN) {
    throw new Error(`알 수 없는 토큰 realm: ${realm}`);
  }
  const payload = {
    sub: String(user.id),
    ver: Number(user.token_version ?? user.ver ?? 0),
    role: user.role ?? 'user',
    // realm: 어느 계정 테이블(users | admin_users)에서 발급됐는지.
    //   controllerLoader 의 @Auth 가드가 lib/admin 컨트롤러에는 realm='admin' 을 강제한다.
    realm,
  };
  // 접속 통계 / 감사 로그용. username 이 있으면 payload 에 포함 (최대 100자 제한, 토큰 크기 보호)
  if (user.username) {
    payload.username = String(user.username).slice(0, 100);
  }
  return jwt.sign(
    payload,
    getAccessSecret(),
    {
      algorithm: JWT_ALG,
      expiresIn: config.auth.accessTokenTtl, // 예: '15m'
      issuer: config.auth.issuer,
    },
  );
}

/**
 * Access Token 검증.
 * 실패 시 throw (jwt.TokenExpiredError | jwt.JsonWebTokenError).
 * @param {string} token
 * @returns {{sub:string, role:string, iat:number, exp:number}}
 */
export function verifyAccessToken(token) {
  const payload = jwt.verify(token, getAccessSecret(), {
    algorithms: [JWT_ALG],              // ← 반드시 명시
    issuer: config.auth.issuer,
    clockTolerance: 5,                  // 5초 클럭 스큐 허용
  });
  // v1.2.0 이전 토큰에는 realm 이 없다 → 'user' 로 간주 (권한이 낮은 쪽으로 해석).
  //   관리자 콘솔은 재로그인하면 realm='admin' 토큰을 받는다.
  if (payload && typeof payload === 'object' && !payload.realm) payload.realm = REALMS.USER;
  return payload;
}

/**
 * Refresh Token 새로 생성.
 * @returns {{ token: string, jti: string, secret: string, tokenHash: string, expiresAt: Date }}
 */
export function createRefreshToken() {
  const jti = crypto.randomUUID();
  const secret = crypto.randomBytes(32).toString('base64url');
  const token = `${jti}.${secret}`;
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + parseDuration(config.auth.refreshTokenTtl));
  return { token, jti, secret, tokenHash, expiresAt };
}

/** "<jti>.<secret>" 파싱. 형식이 틀리면 null. */
export function parseRefreshToken(str) {
  if (typeof str !== 'string') return null;
  const dot = str.indexOf('.');
  if (dot <= 0 || dot === str.length - 1) return null;
  const jti = str.slice(0, dot);
  const secret = str.slice(dot + 1);
  // UUID 형식 체크 (SQL injection 방어 + 빠른 실패)
  if (!/^[0-9a-f-]{36}$/i.test(jti)) return null;
  return { jti, secret, hash: sha256(str) };
}

/** 타이밍 공격 방어용 상수 시간 비교 */
export function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

/** "15m", "7d" 같은 문자열을 밀리초로. 간단한 파서. */
export function parseDuration(s) {
  if (typeof s === 'number') return s;
  const m = /^(\d+)\s*([smhd])$/.exec(String(s).trim());
  if (!m) throw new Error(`잘못된 duration: ${s}`);
  const n = Number(m[1]);
  const unit = m[2];
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  return n * mult;
}

/* =========================================================
 * Cookie / Bearer 헬퍼
 * ========================================================= */
export const REFRESH_COOKIE_NAME = 'rt';

/**
 * refresh token 을 담을 쿠키의 옵션.
 * @param {string} [cookiePath] 쿠키 path. 기본 '/api/auth'.
 *                              AuthController2 처럼 다른 경로의 컨트롤러는 '/api/auth2' 등을 넘김.
 */
export function refreshCookieOptions(cookiePath = '/api/auth') {
  return {
    httpOnly: true,
    secure: config.auth.cookieSecure === true || config.env === 'production',
    sameSite: config.auth.cookieSameSite ?? 'strict',
    path: cookiePath,
    maxAge: parseDuration(config.auth.refreshTokenTtl),
  };
}

/** Authorization: Bearer <token> 에서 토큰만 뽑아냄 */
export function extractBearerToken(req) {
  const h = req.headers.authorization;
  if (!h || typeof h !== 'string') return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}
