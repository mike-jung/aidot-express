/**
 * AdminBootstrap — 최초 관리자 계정 생성 + 보안 상태 점검 (부팅 시 1회).
 *
 *  이전(v1.1.x): 마이그레이션 SQL 이 admin/admin123 을 고정 시드 → 운영 환경에도 공개된 비밀번호가 들어감.
 *  현재(v1.2.0): admin_users 가 비어 있을 때만 아래 규칙으로 생성한다.
 *
 *    development  : admin / admin1234  (must_change_password=1 → 콘솔 상단에 변경 안내 배너)
 *    production   : ADMIN_INITIAL_PASSWORD 가 있으면 그 값(must_change_password=1),
 *                   없으면 제한된 권한의 초기 자격증명 파일을 생성 (DB 에는 해시만 저장)
 *
 *  초기 파일은 첫 비밀번호 변경 뒤 삭제하며, 비밀번호를 로그로 전달하지 않는다.
 */
import argon2 from 'argon2';
import crypto from 'node:crypto';
import db from '../../../src/database/db.js';
import sqlRegistry from '../../../src/core/sqlLoader.js';
import config from '../../../src/config/index.js';
import { assessSecret } from '../../../src/core/tokens.js';
import { saveInitialCredential, clearInitialCredential } from '../../../src/core/bootstrapCredential.cjs';

const ARGON2_OPTS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const DEV_DEFAULT_ADMIN = Object.freeze({ username: 'admin', password: 'admin1234' });

/** 랜덤 비밀번호 — 혼동 문자(0/O, 1/l) 제외 20자 */
function randomPassword(len = 20) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  return out;
}

/**
 * 최초 관리자 생성. 반환: { created, username, generatedPassword? }
 */
export async function ensureInitialAdmin(logger) {
  const sql = sqlRegistry.getFile('admin_auth');
  const { rows } = await db.execute(sql.get('countAll'), {});
  const count = Number(rows?.[0]?.cnt ?? 0);
  if (count > 0) return { created: false };

  const isProd = config.env === 'production';
  const envPw = process.env.ADMIN_INITIAL_PASSWORD || '';
  let password;
  let source;
  if (envPw) { password = envPw; source = 'ADMIN_INITIAL_PASSWORD'; }
  else if (!isProd) { password = DEV_DEFAULT_ADMIN.password; source = 'development 기본값'; }
  else { password = randomPassword(); source = '1회용 랜덤'; }

  const username = process.env.ADMIN_INITIAL_USERNAME || DEV_DEFAULT_ADMIN.username;
  const password_hash = await argon2.hash(password, ARGON2_OPTS);
  const credentialPath = source === '1회용 랜덤' ? saveInitialCredential({ username, password }) : null;
  try { await db.execute(sql.get('insertBootstrapAdmin'), {
    name: 'Administrator',
    username: process.env.ADMIN_INITIAL_USERNAME || DEV_DEFAULT_ADMIN.username,
    email: process.env.ADMIN_INITIAL_EMAIL || 'admin@aidot.local',
    password_hash,
    must_change_password: 1,
  }); } catch (error) {
    if (credentialPath) clearInitialCredential(username);
    throw error;
  }

  const banner = [
    '',
    '╔══════════════════════════════════════════════════════════════════════╗',
    '║  [admin] 최초 관리자 계정을 생성했습니다                                ║',
    `║    아이디   : ${username.padEnd(54)}║`,
    `║    비밀번호 : (${source})${' '.repeat(Math.max(0, 52 - source.length))}║`,
    '║    ▶ 콘솔 로그인 후 [사용자 관리 → 내 비밀번호 변경] 으로 반드시 교체하세요  ║',
    '╚══════════════════════════════════════════════════════════════════════╝',
  ].join('\n');
  logger.warn(banner);
  if (credentialPath) logger.warn(`[admin] Initial credentials are available to the local account at: ${credentialPath}`);

  return { created: true, username, generatedPassword: source === '1회용 랜덤' };
}

/** v1.1.x 가 마이그레이션 SQL 로 고정 시드하던 옛 기본 비밀번호 */
export const LEGACY_DEFAULT_PASSWORDS = Object.freeze(['admin123']);

/**
 * 기본 관리자 계정의 비밀번호 상태를 확인하고, 필요하면 문서상 기본값으로 정렬한다. (v1.7.4)
 *
 *  왜 필요한가:
 *    v1.1.x 는 마이그레이션 SQL 이 `admin` / `admin123` 을 고정 시드했다. v1.2.0 에서 그 시드를
 *    걷어내고 이 파일의 `ensureInitialAdmin()` 으로 옮기면서 dev 기본값을 `admin1234` 로 바꿨는데,
 *    `ensureInitialAdmin()` 은 **admin_users 가 비어 있을 때만** 계정을 만든다.
 *    → 옛 DB 를 그대로 이어 쓰면 계정은 `admin123` 인 채로 남고, 문서·안내는 `admin1234` 라고 해서
 *      "초기 비밀번호를 바꾼 적이 없는데 로그인이 안 되는" 상황이 된다.
 *
 *  안전장치:
 *    · **저장된 해시가 옛 기본값과 정확히 일치할 때만** 손댄다 (argon2.verify 로 확인).
 *      사용자가 한 번이라도 바꿨다면 아무것도 하지 않는다.
 *    · production 에서는 절대 바꾸지 않는다 — securityPreflight 가 치명 항목으로 올려 기동을 막는다.
 *    · `ADMIN_NORMALIZE_LEGACY_PASSWORD=false` 로 끌 수 있다.
 *    · 바꾼 뒤에도 must_change_password=1 을 유지해 콘솔이 계속 변경을 안내한다.
 *
 *  두 값 모두 공개된 기본값이라 이 정렬은 보안 수준을 낮추지 않는다 — 문서와 실제를 맞출 뿐이다.
 *
 * @returns {{exists:boolean, username:string, defaultPassword:string|null, normalized:boolean}}
 */
export async function ensureDefaultAdminPassword(logger) {
  const username = process.env.ADMIN_INITIAL_USERNAME || DEV_DEFAULT_ADMIN.username;
  const sql = sqlRegistry.getFile('admin_auth');

  let user;
  try {
    const { rows } = await db.execute(sql.get('findUserByUsername'), { username });
    user = rows?.[0];
  } catch (e) {
    logger.warn(`[admin] default-account check failed (ignored): ${e.message}`);
    return { exists: false, username, defaultPassword: null, normalized: false };
  }
  if (!user?.password_hash) {
    return { exists: false, username, defaultPassword: null, normalized: false };
  }

  const verify = (pw) => argon2.verify(user.password_hash, pw).catch(() => false);

  // 이미 문서상 기본값이면 그대로 보고만 한다.
  if (await verify(DEV_DEFAULT_ADMIN.password)) {
    return { exists: true, username, defaultPassword: DEV_DEFAULT_ADMIN.password, normalized: false };
  }

  for (const legacy of LEGACY_DEFAULT_PASSWORDS) {
    if (!(await verify(legacy))) continue;

    const isProd = config.env === 'production';
    const optOut = String(process.env.ADMIN_NORMALIZE_LEGACY_PASSWORD || '').toLowerCase() === 'false';
    if (isProd || optOut) {
      // 바꾸지 않는다 — 사실만 보고한다 (production 은 securityPreflight 가 기동을 막는다)
      return { exists: true, username, defaultPassword: legacy, normalized: false };
    }

    const password_hash = await argon2.hash(DEV_DEFAULT_ADMIN.password, ARGON2_OPTS);
    await db.execute(sql.get('resetToDefaultPassword'), { id: user.id, password_hash });
    logger.warn(
      `[admin] '${username}' 계정이 옛 기본 비밀번호('${legacy}', v1.1.x 시드)를 쓰고 있어 `
      + `문서상 기본값('${DEV_DEFAULT_ADMIN.password}')으로 맞췄습니다. `
      + '로그인 후 [사용자 관리 → 내 비밀번호 변경] 으로 반드시 교체하세요. '
      + '(원치 않으면 .env 에 ADMIN_NORMALIZE_LEGACY_PASSWORD=false)',
    );
    return { exists: true, username, defaultPassword: DEV_DEFAULT_ADMIN.password, normalized: true };
  }

  return { exists: true, username, defaultPassword: null, normalized: false };
}

/**
 * 부팅 시 보안 설정 점검. production 에서 치명적 항목이 있으면 throw 로 기동을 중단한다.
 *  - AUTH_ACCESS_SECRET 품질
 *  - CORS origin:true + production (모든 Origin 반사)
 *  - 기본 관리자 비밀번호(admin1234/admin123) 가 여전히 사용 중인지 (해시 검증)
 */
export async function securityPreflight(logger, known = null) {
  const isProd = config.env === 'production';
  const problems = [];
  const warnings = [];

  const sec = assessSecret(config.auth.accessSecret);
  if (!sec.ok) (sec.level === 'error' ? problems : warnings).push(sec.reason);

  if (config.cors?.origin === true) {
    warnings.push('CORS_ORIGIN 이 지정되지 않아 모든 Origin 을 반사합니다. 운영에서는 CORS_ORIGIN=https://도메인 으로 화이트리스트를 지정하세요.');
  }
  if (config.server?.trustProxy && config.server.trustProxy !== false) {
    warnings.push(`TRUST_PROXY=${config.server.trustProxy} — 실제로 리버스 프록시(Nginx/IIS ARR) 뒤에 있을 때만 켜세요. 아니면 X-Forwarded-For 위조로 rate-limit 우회가 가능합니다.`);
  }
  if (!config.auth.cookieSecure && isProd) {
    warnings.push('AUTH_COOKIE_SECURE=false — HTTPS 운영 환경에서는 true 로 설정하세요.');
  }

  // 기본 비밀번호 탐지 — ensureDefaultAdminPassword() 가 이미 확인했으면 그 결과를 쓴다.
  //   (argon2 verify 는 의도적으로 느리므로 부팅에서 두 번 돌리지 않는다)
  try {
    let found = known?.defaultPassword ?? undefined;
    let username = known?.username ?? 'admin';
    if (found === undefined) {
      const sql = sqlRegistry.getFile('admin_auth');
      const { rows } = await db.execute(sql.get('findUserByUsername'), { username });
      const admin = rows?.[0];
      found = null;
      if (admin?.password_hash) {
        for (const pw of [DEV_DEFAULT_ADMIN.password, ...LEGACY_DEFAULT_PASSWORDS]) {
          if (await argon2.verify(admin.password_hash, pw).catch(() => false)) { found = pw; break; }
        }
      }
    }
    if (found) {
      /* ★ v1.36.0 — 기본 비밀번호로 **부팅을 막지 않는다.**
       *
       *  막았더니 벗어날 길이 없는 교착이 됐다. 설치본은 production 으로 도는데,
       *  DB 에 기본 비밀번호 계정이 있으면 서버가 안 뜬다. 서버가 안 뜨니 로그인할 수 없고,
       *  로그인할 수 없으니 비밀번호를 바꿀 수 없다. 실측으로 재현했다 — health=000.
       *
       *  대신 **로그인한 뒤 반드시 바꾸게** 한다(must_change_password). 그쪽이 안전하면서
       *  사용자가 실제로 빠져나올 수 있는 길이다. 경고는 계속 크게 남긴다.
       */
      warnings.push(
        `관리자 '${username}' 계정이 기본 비밀번호('${found}')를 사용 중입니다. `
        + `로그인 직후 변경을 요구합니다 — 지금 바꾸세요.`);
      try {
        const authSql = sqlRegistry.getFile('admin_auth');
        await db.execute(authSql.get('setMustChangePassword'), { username });
      } catch (e) {
        warnings.push(`비밀번호 변경 요구 표시 실패(무시): ${e.message}`);
      }
    }
  } catch (e) {
    warnings.push(`기본 비밀번호 점검 실패(무시): ${e.message}`);
  }

  for (const w of warnings) logger.warn(`[security] ⚠ ${w}`);
  if (problems.length) {
    for (const p of problems) logger.error(`[security] ✖ ${p}`);
    if (isProd) {
      throw new Error(`[security] production 보안 점검 실패 ${problems.length}건 — 위 항목을 수정한 뒤 다시 기동하세요.`);
    }
  }
  return { problems, warnings };
}

/** production 이면 치명(problems), 아니면 경고(warnings) 로 분류 */
function problems_or_warnings(isProd, problems, warnings, msg) {
  (isProd ? problems : warnings).push(msg);
}
