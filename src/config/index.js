// .env 파일 로드 — 여러 위치를 순서대로 시도:
//   1) process.env.AIDOT_ENV_FILE      — 명시적 경로 (있으면 최우선)
//   2) ELECTRON_USER_DATA_PATH/.env    — Electron userData (canonical, 업그레이드 시 보존) ⭐
//   3) resourcesPath/.env              — packaged Electron 리소스 (인스톨러 fallback)
//   4) <cwd>/.env                      — 일반 개발 모드
//   5) <projectRoot>/.env              — 소스 루트 기본값
//
// 로드 전략 (중요 — 이전 버그의 핵심):
//   - 각 .env 에 대해 dotenv.config({ override: true }) 사용.
//     이유: 부모 셸 (Windows 환경변수, 상위 CMD) 에 이미 DB_PASSWORD 같은 값이
//     세팅되어 있는 경우, override:false 는 .env 를 무시하여 "파일은 로드됐지만 값이 반영 안 됨"
//     증상이 발생. 앱 .env 가 항상 이긴다.
//   - 후보 파일은 "우선순위 높은 것부터 낮은 것 순" 으로 reverse() 하여 로드.
//     즉 가장 우선순위 낮은 것(projectRoot) → 가장 우선순위 높은 것(userData) 순으로
//     덮어쓰기 처리. 최종적으로 우선순위 높은 값이 남는다.
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** 로드된 .env 파일의 절대경로 목록 — 진단 + ConfigService 가 "편집 대상" 경로로 사용. */
export const loadedEnvFiles = [];

/**
 * .env 파일을 인코딩 자동 감지해서 UTF-8 문자열로 반환.
 *
 * 지원 인코딩:
 *   - UTF-8 with BOM (EF BB BF)
 *   - UTF-16LE with BOM (FF FE)   ← Unicode NSIS 가 FileWrite 할 때 기본
 *   - UTF-16BE with BOM (FE FF)
 *   - UTF-8 (BOM 없음)
 *
 * 이 함수가 없으면 dotenv 는 UTF-16 파일을 완전히 무시하여 "DB 비밀번호 바꿔도
 * 반영 안 됨" 증상이 발생한다. (인스톨러가 NSIS 로 .env 를 쓸 때 UTF-16LE 로
 * 저장되기 때문.)
 */
function readEnvFileDecoded(filePath) {
  const buf = fs.readFileSync(filePath);
  // UTF-16LE BOM — NSIS Unicode installer 의 기본 출력
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    const text = buf.slice(2).toString('utf16le');
    // Self-heal: UTF-8 (no BOM) 으로 즉시 재저장 → 다음 로드부터는 UTF-8 경로로 감
    // + Dashboard 편집 저장 시에도 일관된 UTF-8 상태 유지
    try {
      fs.writeFileSync(filePath, text, 'utf8');
      console.log(`[config] ⚙ ${filePath} converted from UTF-16LE to UTF-8.`);
    } catch (e) {
      console.warn(`[config] UTF-8 conversion failed (ignored): ${e.message}`);
    }
    return text;
  }
  if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
    const swapped = Buffer.alloc(buf.length - 2);
    for (let i = 2; i < buf.length; i += 2) {
      swapped[i - 2]     = buf[i + 1] ?? 0;
      swapped[i - 2 + 1] = buf[i];
    }
    const text = swapped.toString('utf16le');
    try { fs.writeFileSync(filePath, text, 'utf8'); } catch {}
    return text;
  }
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return buf.slice(3).toString('utf8');
  }
  return buf.toString('utf8');
}

(function loadEnvFiles() {
  const __filename = fileURLToPath(import.meta.url);
  const here = path.dirname(__filename);              // src/config/
  const projectRoot = path.resolve(here, '..', '..'); // 프로젝트 루트

  // 우선순위 높은 것부터 — 아래 reverse() 해서 로드 순서는 역방향.
  // resources/.env 는 의도적으로 제외: 사용자가 편집한 것과 혼동되는 두 번째 소스는 혼란만 키움.
  // 인스톨러도 v7 부터 resources/.env 를 쓰지 않으며, 기존 파일이 있으면 제거한다.
  const candidates = [];
  if (process.env.AIDOT_ENV_FILE) candidates.push(process.env.AIDOT_ENV_FILE);

  const userDataPath = process.env.ELECTRON_USER_DATA_PATH || '';
  if (userDataPath) candidates.push(path.join(userDataPath, '.env'));

  candidates.push(path.join(process.cwd(), '.env'));
  candidates.push(path.join(projectRoot, '.env'));

  // 중복 제거 (동일 절대 경로는 한 번만)
  const seen = new Set();
  const uniq = candidates.filter((p) => {
    if (!p) return false;
    const abs = path.resolve(p);
    if (seen.has(abs)) return false;
    seen.add(abs);
    return true;
  });

  // 로드 순서 역방향: 우선순위 낮은 것부터 → 높은 것이 마지막에 덮어쓰기
  const loadOrder = [...uniq].reverse();
  for (const p of loadOrder) {
    if (!fs.existsSync(p)) continue;
    try {
      // BOM/UTF-16 자동 감지 후 UTF-8 텍스트로 디코딩
      const text = readEnvFileDecoded(p);
      const parsed = dotenv.parse(text);                   // key-value 객체
      // override:true 동일 동작 — 기존 값 덮어쓰기
      for (const [k, v] of Object.entries(parsed)) {
        process.env[k] = v;
      }
      if (!loadedEnvFiles.includes(p)) loadedEnvFiles.push(p);
    } catch (e) {
      console.error(`[config] could not load .env: ${p}`);
      console.error(`[config]   ${e.message}`);
    }
  }
  // loadedEnvFiles 는 우선순위 높은 것이 먼저 오게 재정렬
  loadedEnvFiles.sort((a, b) => uniq.indexOf(a) - uniq.indexOf(b));

  // 진단 출력 — 기동 직후 어느 파일이 실제 로드됐는지 한눈에 확인.
  // console.log 는 Electron 의 stdout 패스스루 과정에서 누락될 수 있으므로
  // process.stderr.write 로 직접 출력 (supervisor 가 inherit 로 보장)
  const lines = [];
  if (loadedEnvFiles.length === 0) {
    lines.push('[config] ⚠ no .env file found — starting from defaults and environment variables only.');
    lines.push('[config]   looked in (priority order):');
    for (const p of uniq) lines.push(`[config]     - ${p}`);
  } else {
    lines.push(`[config] .env loaded (${loadedEnvFiles.length}, in priority order):`);
    for (const p of loadedEnvFiles) lines.push(`[config]   - ${p}`);
  }
  // 주요 .env 키의 존재 여부 (값은 마스킹)
  // Phase 36 (patch-15): MCI_HOST / MCI_PORT / MCI_TIMEOUT_MS 도 포함하여,
  //   사용자가 MCI 연결 이슈 디버깅할 때 .env 가 실제로 로드되었는지 한눈에 확인 가능.
  const keys = [
    'NODE_ENV', 'PORT', 'DB_TYPE', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'DB_SAMPLE_PREFIX',
    'MCI_HOST', 'MCI_PORT', 'MCI_TIMEOUT_MS', 'MCI_ENABLED',
  ];
  const envStatus = keys.map((k) => {
    const v = process.env[k];
    if (v === undefined) return `${k}=<unset>`;
    if (/PASSWORD|SECRET|TOKEN/i.test(k)) {
      return `${k}=<redacted>`;
    }
    return `${k}=${v}`;
  });
  lines.push(`[config] key values from process.env: ${envStatus.join(', ')}`);

  // ⚠ v1.7.2: 이전에는 stdout + stderr 양쪽에 같은 줄을 써서 터미널에 모든 줄이 두 번씩 보였다.
  //   한 곳에만 쓴다. Electron 처럼 stdout 이 유실될 수 있는 환경에서는 CONFIG_LOG_STDERR=1 로 전환.
  const writeLine = process.env.CONFIG_LOG_STDERR === '1'
    ? (l) => { try { process.stderr.write(l + '\n'); } catch { /* noop */ } }
    : (l) => console.log(l);
  for (const line of lines) writeLine(line);
})();

import defaultConfig from './default.js';
import { validateServerLimits } from '../core/httpLimits.js';

/** TRUST_PROXY 문자열 → express 'trust proxy' 설정값 */
function parseTrustProxy(v) {
  const t = String(v).trim().toLowerCase();
  if (t === '' || t === 'false' || t === '0' || t === 'off') return false;
  if (t === 'true' || t === 'on') return true;
  if (/^\d+$/.test(t)) return Number(t);
  return String(v).trim();   // 'loopback', '10.0.0.0/8,172.16.0.0/12' 등
}

// 깊은 병합
function deepMerge(base, override) {
  if (override === undefined || override === null) return base;
  if (typeof base !== 'object' || typeof override !== 'object') return override;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override)) {
    out[key] = deepMerge(base[key], override[key]);
  }
  return out;
}

const env = process.env.NODE_ENV || 'development';

let envConfig = {};
try {
  const mod = await import(`./${env}.js`);
  envConfig = mod.default ?? {};
} catch {
  // 환경별 config 파일이 없으면 무시
}

// .env 에서 들어오는 값 매핑
const dotenvOverrides = {
  /* ★ v1.10.42 — 내가 만드는 파일을 둘 작업 폴더.
     `.env` 에 APP_WORKSPACE=workspace 로 지정하면 그 안의
     controller/ · service/ · sql/ 을 **추가로** 읽습니다.
     비워 두면 예전과 똑같이 동작합니다. */
  // ★ v1.10.44 — TRACE_ENABLED=false 로 요청 추적 기록을 끕니다 (성능 비교용)
  trace: {
    enabled: process.env.TRACE_ENABLED !== undefined
      ? !/^(0|false|no|off)$/i.test(String(process.env.TRACE_ENABLED))
      : undefined,
    slowMs: process.env.TRACE_SLOW_MS ? Number(process.env.TRACE_SLOW_MS) : undefined,
    sampleGet: process.env.TRACE_SAMPLE_GET !== undefined
      ? /^(1|true|yes|on)$/i.test(String(process.env.TRACE_SAMPLE_GET))
      : undefined,
    retentionDays: process.env.TRACE_RETENTION_DAYS ? Number(process.env.TRACE_RETENTION_DAYS) : undefined,
    maxRecords: process.env.TRACE_MAX_RECORDS ? Number(process.env.TRACE_MAX_RECORDS) : undefined,
    ringMax: process.env.TRACE_RING_MAX ? Number(process.env.TRACE_RING_MAX) : undefined,
  },
  logView: {
    queryMaxBytes: process.env.LOG_QUERY_MAX_MB ? Number(process.env.LOG_QUERY_MAX_MB) * 1024 * 1024 : undefined,
    facetsMaxBytes: process.env.LOG_FACETS_MAX_MB ? Number(process.env.LOG_FACETS_MAX_MB) * 1024 * 1024 : undefined,
    fileMaxBytes: process.env.LOG_FILE_MAX_MB ? Number(process.env.LOG_FILE_MAX_MB) * 1024 * 1024 : undefined,
    worker: process.env.LOG_SCAN_WORKER !== undefined ? !/^(0|false|no|off)$/i.test(String(process.env.LOG_SCAN_WORKER)) : undefined,
    scanTimeoutMs: process.env.LOG_SCAN_TIMEOUT_MS ? Number(process.env.LOG_SCAN_TIMEOUT_MS) : undefined,
    roles: process.env.LOG_VIEW_ROLES ? String(process.env.LOG_VIEW_ROLES).split(',').map((x) => x.trim()).filter(Boolean) : undefined,
  },

  paths: {
    workspace: process.env.APP_WORKSPACE,
  },

  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    host: process.env.HOST || undefined,
    headersTimeoutMs: process.env.HTTP_HEADERS_TIMEOUT_MS ? Number(process.env.HTTP_HEADERS_TIMEOUT_MS) : undefined,
    requestTimeoutMs: process.env.HTTP_REQUEST_TIMEOUT_MS ? Number(process.env.HTTP_REQUEST_TIMEOUT_MS) : undefined,
    keepAliveTimeoutMs: process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS ? Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS) : undefined,
    maxRequestsPerSocket: process.env.HTTP_MAX_REQUESTS_PER_SOCKET ? Number(process.env.HTTP_MAX_REQUESTS_PER_SOCKET) : undefined,
    // TRUST_PROXY=false | true | 1 | 2 | loopback | 10.0.0.0/8
    trustProxy: process.env.TRUST_PROXY !== undefined ? parseTrustProxy(process.env.TRUST_PROXY) : undefined,
    bodyLimit: process.env.BODY_LIMIT || undefined,
  },
  // ★ v1.10.0 — LOCALE=en|ko (없으면 default.js 의 'en')
  locale: (() => {
    const v = String(process.env.LOCALE || '').trim().toLowerCase();
    return ['en', 'ko'].includes(v) ? v : undefined;
  })(),

  log: {
    // ★ v1.10.26 — LOG_INTERNAL=true 로 프레임워크 내부 로그를 봅니다
    internal: process.env.LOG_INTERNAL !== undefined
      ? /^(1|true|yes|on)$/i.test(String(process.env.LOG_INTERNAL))
      : undefined,
    level: process.env.LOG_LEVEL,
    // LOG_DIR: 절대경로 가능. Electron 설치본은 server-bridge 가 <userData>/log 를 주입한다
    //   (설치 폴더가 읽기전용이거나 재설치로 지워져도 로그가 살아남도록).
    dir: process.env.LOG_DIR || undefined,
    maxSize: process.env.LOG_MAX_SIZE || undefined,
    admin: process.env.LOG_ADMIN !== undefined
      ? (process.env.LOG_ADMIN === 'true' || process.env.LOG_ADMIN === '1')
      : undefined,
    sql: process.env.LOG_SQL !== undefined
      ? (process.env.LOG_SQL === 'true' || process.env.LOG_SQL === '1')
      : undefined,
  },
  access: {
    retentionDays: process.env.ACCESS_RETENTION_DAYS
      ? Number(process.env.ACCESS_RETENTION_DAYS)
      : undefined,
    maxRecords: process.env.ACCESS_MAX_RECORDS !== undefined
      ? Number(process.env.ACCESS_MAX_RECORDS)
      : undefined,
  },
  metrics: {
    maxRecords: process.env.METRICS_MAX_RECORDS !== undefined
      ? Number(process.env.METRICS_MAX_RECORDS)
      : undefined,
    retentionDays: process.env.METRICS_RETENTION_DAYS
      ? Number(process.env.METRICS_RETENTION_DAYS)
      : undefined,
  },
  /* ★ v1.25.0 — 엔터프라이즈 기능 켜기/끄기.
   *  백업/복원 · DB 컬럼 암호화 · 이중화는 모든 설치에 필요한 것이 아니다.
   *  기본은 **감춤**이고, 쓰겠다고 설정한 곳에서만 메뉴에 나타난다 (MCI 와 같은 방식).
   *  ⚠ 이 플래그는 메뉴를 가릴 뿐이다 — 이중화 에이전트 자체는 HA_MODE 로 켜고 끈다. */
  features: {
    backup:        process.env.FEATURE_BACKUP === 'true' || process.env.FEATURE_BACKUP === '1',
    secureColumns: process.env.FEATURE_SECURE_COLUMNS === 'true' || process.env.FEATURE_SECURE_COLUMNS === '1',
    ha:            process.env.FEATURE_HA === 'true' || process.env.FEATURE_HA === '1',
  },
  ha: {
    mode: process.env.HA_MODE || undefined,
    enabled: process.env.HA_ENABLED === 'true' || process.env.HA_ENABLED === '1',
    nodeId: process.env.HA_NODE_ID || undefined,
    preferred: process.env.HA_PREFERRED === 'true' || process.env.HA_PREFERRED === '1',
    peerUrl: process.env.HA_PEER_URL || undefined,
    secret: process.env.HA_SECRET || undefined,
    roleHook: process.env.HA_ROLE_HOOK || undefined,
    anchors: process.env.HA_ANCHORS ? process.env.HA_ANCHORS.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    witness: {
      mode: process.env.HA_WITNESS_MODE || undefined,
      url: process.env.HA_WITNESS_URL || undefined,
      path: process.env.HA_WITNESS_PATH || undefined,
    },
    timings: {
      tickMs: process.env.HA_TICK_MS ? Number(process.env.HA_TICK_MS) : undefined,
      demoteMs: process.env.HA_DEMOTE_MS ? Number(process.env.HA_DEMOTE_MS) : undefined,
      takeoverMs: process.env.HA_TAKEOVER_MS ? Number(process.env.HA_TAKEOVER_MS) : undefined,
      minHoldMs: process.env.HA_MIN_HOLD_MS ? Number(process.env.HA_MIN_HOLD_MS) : undefined,
      maxReplicaLagSec: process.env.HA_MAX_LAG_SEC ? Number(process.env.HA_MAX_LAG_SEC) : undefined,
    },
  },

  control: {
    enabled: process.env.CONTROL_ENABLED !== undefined
      ? (process.env.CONTROL_ENABLED === 'true' || process.env.CONTROL_ENABLED === '1')
      : undefined,
    port: process.env.CONTROL_PORT ? Number(process.env.CONTROL_PORT) : undefined,
    host: process.env.CONTROL_HOST || undefined,
    // ★ v1.11.0 — 생존 감시 (supervisor)
    watchdog: {
      enabled: process.env.SUPERVISOR_WATCHDOG !== undefined
        ? (process.env.SUPERVISOR_WATCHDOG === 'true' || process.env.SUPERVISOR_WATCHDOG === '1')
        : undefined,
      intervalMs: process.env.SUPERVISOR_WATCHDOG_INTERVAL_MS ? Number(process.env.SUPERVISOR_WATCHDOG_INTERVAL_MS) : undefined,
      timeoutMs: process.env.SUPERVISOR_WATCHDOG_TIMEOUT_MS ? Number(process.env.SUPERVISOR_WATCHDOG_TIMEOUT_MS) : undefined,
      failures: process.env.SUPERVISOR_WATCHDOG_FAILURES ? Number(process.env.SUPERVISOR_WATCHDOG_FAILURES) : undefined,
      restartOnExit: process.env.SUPERVISOR_RESTART_ON_EXIT !== undefined
        ? (process.env.SUPERVISOR_RESTART_ON_EXIT === 'true' || process.env.SUPERVISOR_RESTART_ON_EXIT === '1')
        : undefined,
      maxRestartsPerHour: process.env.SUPERVISOR_MAX_RESTARTS_PER_HOUR ? Number(process.env.SUPERVISOR_MAX_RESTARTS_PER_HOUR) : undefined,
      hangDump: process.env.SUPERVISOR_HANG_DUMP !== undefined
        ? (process.env.SUPERVISOR_HANG_DUMP === 'true' || process.env.SUPERVISOR_HANG_DUMP === '1')
        : undefined,
      inspectPort: process.env.SUPERVISOR_INSPECT_PORT ? Number(process.env.SUPERVISOR_INSPECT_PORT) : undefined,
    },
  },
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
  },
  db: {
    type: process.env.DB_TYPE,
    file: process.env.DB_FILE,  // SQLite 파일 경로 오버라이드
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    samplePrefix: process.env.DB_SAMPLE_PREFIX,
    // ★ v1.10.16 — DB_SAMPLES=false 로 예제 테이블 생성을 끕니다
    /* ★ v1.10.41 — 'core' | 'all' | 'none'.
       옛 표기(true/false)도 받는다 — 기존 .env 가 깨지면 안 된다. */
    samples: (() => {
      const raw = process.env.DB_SAMPLES;
      if (raw === undefined) return undefined;
      const v = String(raw).trim().toLowerCase();
      if (/^(0|false|no|off|none)$/.test(v)) return 'none';
      if (/^(1|true|yes|on|all)$/.test(v)) return 'all';
      if (v === 'core') return 'core';
      return undefined;   // 알 수 없는 값이면 기본값(core)을 쓴다
    })(),
    // ★ v1.10.17 — 예제 스키마 분리 (MariaDB/MySQL)
    sampleSchemaSeparate: process.env.DB_SAMPLE_SCHEMA_SEPARATE !== undefined
      ? !/^(0|false|no|off)$/i.test(String(process.env.DB_SAMPLE_SCHEMA_SEPARATE))
      : undefined,
    sampleSchema: process.env.DB_SAMPLE_SCHEMA,
    appSchema: process.env.DB_APP_SCHEMA,   // ★ v1.12.2 업무 테이블 스키마
    service: process.env.DB_SERVICE,
    connectionLimit: process.env.DB_CONN_LIMIT ? Number(process.env.DB_CONN_LIMIT) : undefined,
    ssl: process.env.DB_SSL !== undefined
      ? (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1')
      : undefined,
    timezone: process.env.DB_TIMEZONE || undefined,
    connectTimeout: process.env.DB_CONNECT_TIMEOUT_MS ? Number(process.env.DB_CONNECT_TIMEOUT_MS) : undefined,
    acquireTimeout: process.env.DB_ACQUIRE_TIMEOUT_MS ? Number(process.env.DB_ACQUIRE_TIMEOUT_MS) : undefined,
    fallbackToSqlite: process.env.DB_FALLBACK_TO_SQLITE !== undefined
      ? (process.env.DB_FALLBACK_TO_SQLITE === 'true' || process.env.DB_FALLBACK_TO_SQLITE === '1')
      : undefined,
    // ★ v1.9.3 — DB_AUTO_CREATE_DATABASE=false 로 끌 수 있다
    autoCreateDatabase: process.env.DB_AUTO_CREATE_DATABASE !== undefined
      ? !/^(0|false|no|off)$/i.test(String(process.env.DB_AUTO_CREATE_DATABASE))
      : undefined,
  },
  // v1.7.6: default.js 에 있으면서 .env 매핑이 없어 조정 자체가 불가능하던 운영 항목들.
  //   폐쇄망 고객이 소스를 고치지 않고는 rate-limit / CSP / 로그 보관을 바꿀 수 없었다.
  security: {
    csp: process.env.SECURITY_CSP !== undefined
      ? (process.env.SECURITY_CSP === 'true' || process.env.SECURITY_CSP === '1')
      : undefined,
    rateLimit: (process.env.RATE_LIMIT_MAX || process.env.RATE_LIMIT_WINDOW_MIN || process.env.RATE_LIMIT_ENABLED) ? {
      enabled: process.env.RATE_LIMIT_ENABLED !== undefined
        ? (process.env.RATE_LIMIT_ENABLED === 'true' || process.env.RATE_LIMIT_ENABLED === '1')
        : undefined,
      windowMs: process.env.RATE_LIMIT_WINDOW_MIN ? Number(process.env.RATE_LIMIT_WINDOW_MIN) * 60_000 : undefined,
      max: process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : undefined,
    } : undefined,
    authRateLimit: (process.env.AUTH_RATE_LIMIT_MAX || process.env.AUTH_RATE_LIMIT_WINDOW_MIN) ? {
      windowMs: process.env.AUTH_RATE_LIMIT_WINDOW_MIN ? Number(process.env.AUTH_RATE_LIMIT_WINDOW_MIN) * 60_000 : undefined,
      max: process.env.AUTH_RATE_LIMIT_MAX ? Number(process.env.AUTH_RATE_LIMIT_MAX) : undefined,
    } : undefined,
  },
  auth: {
    accessSecret: process.env.AUTH_ACCESS_SECRET,
    issuer: process.env.AUTH_ISSUER,
    accessTokenTtl: process.env.AUTH_ACCESS_TTL,
    refreshTokenTtl: process.env.AUTH_REFRESH_TTL,
    cookieSecure: process.env.AUTH_COOKIE_SECURE
      ? process.env.AUTH_COOKIE_SECURE === 'true'
      : undefined,
    cookieSameSite: process.env.AUTH_COOKIE_SAMESITE || undefined,
    registrationOpen: process.env.AUTH_SIGNUP_OPEN !== undefined
      ? (process.env.AUTH_SIGNUP_OPEN === 'true' || process.env.AUTH_SIGNUP_OPEN === '1')
      : undefined,
    adminSignupOpen: process.env.ADMIN_SIGNUP_OPEN !== undefined
      ? (process.env.ADMIN_SIGNUP_OPEN === 'true' || process.env.ADMIN_SIGNUP_OPEN === '1')
      : undefined,
    minPasswordLength: process.env.AUTH_MIN_PASSWORD_LENGTH ? Number(process.env.AUTH_MIN_PASSWORD_LENGTH) : undefined,
    // v1.7.4: default.js 에는 있었지만 .env 매핑이 없어 조정 자체가 불가능했다.
    maxFailedLogins: process.env.AUTH_MAX_FAILED_LOGINS ? Number(process.env.AUTH_MAX_FAILED_LOGINS) : undefined,
    lockMinutes: process.env.AUTH_LOCK_MINUTES ? Number(process.env.AUTH_LOCK_MINUTES) : undefined,
  },
  mci: {
    enabled: process.env.MCI_ENABLED !== undefined
      ? (process.env.MCI_ENABLED === 'true' || process.env.MCI_ENABLED === '1')
      : undefined,
    host: process.env.MCI_HOST || undefined,
    port: process.env.MCI_PORT ? Number(process.env.MCI_PORT) : undefined,
    timeoutMs: process.env.MCI_TIMEOUT_MS ? Number(process.env.MCI_TIMEOUT_MS) : undefined,
    connectTimeoutMs: process.env.MCI_CONNECT_TIMEOUT_MS ? Number(process.env.MCI_CONNECT_TIMEOUT_MS) : undefined,
    pool: {
      mode: process.env.MCI_POOL_MODE || undefined,             // 'per-request' | 'keep-alive'
      maxConnections: process.env.MCI_POOL_MAX
        ? Number(process.env.MCI_POOL_MAX) : undefined,
      maxQueue: process.env.MCI_POOL_MAX_QUEUE
        ? Number(process.env.MCI_POOL_MAX_QUEUE) : undefined,
      acquireTimeoutMs: process.env.MCI_POOL_ACQUIRE_TIMEOUT_MS
        ? Number(process.env.MCI_POOL_ACQUIRE_TIMEOUT_MS) : undefined,
      // ★ v1.11.0 — MCI_POOL_IDLE_TIMEOUT_MS 는 예전 이름. 둘 다 받는다 (새 이름 우선)
      maxIdleMs: (process.env.MCI_POOL_MAX_IDLE_MS || process.env.MCI_POOL_IDLE_TIMEOUT_MS)
        ? Number(process.env.MCI_POOL_MAX_IDLE_MS || process.env.MCI_POOL_IDLE_TIMEOUT_MS) : undefined,
      maxAgeMs: process.env.MCI_POOL_MAX_AGE_MS ? Number(process.env.MCI_POOL_MAX_AGE_MS) : undefined,
      minIdle: process.env.MCI_POOL_MIN_IDLE ? Number(process.env.MCI_POOL_MIN_IDLE) : undefined,
      keepAliveDelayMs: process.env.MCI_POOL_KEEPALIVE_MS ? Number(process.env.MCI_POOL_KEEPALIVE_MS) : undefined,
    },
    breaker: {
      enabled: process.env.MCI_BREAKER_ENABLED !== undefined
        ? (process.env.MCI_BREAKER_ENABLED === 'true' || process.env.MCI_BREAKER_ENABLED === '1')
        : undefined,
      failureThreshold: process.env.MCI_BREAKER_FAILURES ? Number(process.env.MCI_BREAKER_FAILURES) : undefined,
      openMs: process.env.MCI_BREAKER_OPEN_MS ? Number(process.env.MCI_BREAKER_OPEN_MS) : undefined,
      maxOpenMs: process.env.MCI_BREAKER_MAX_OPEN_MS ? Number(process.env.MCI_BREAKER_MAX_OPEN_MS) : undefined,
    },
    probe: {
      enabled: process.env.MCI_PROBE_ENABLED !== undefined
        ? (process.env.MCI_PROBE_ENABLED === 'true' || process.env.MCI_PROBE_ENABLED === '1')
        : undefined,
      intervalMs: process.env.MCI_PROBE_INTERVAL_MS ? Number(process.env.MCI_PROBE_INTERVAL_MS) : undefined,
    },
    retry: {
      onStaleConnection: process.env.MCI_RETRY_ON_STALE || undefined,               // safe | all | none
      // 빈 문자열도 의미가 있다(자동 판정 끔) — undefined 와 구분
      idempotentInterfacePattern: process.env.MCI_RETRY_IDEMPOTENT_PATTERN !== undefined
        ? process.env.MCI_RETRY_IDEMPOTENT_PATTERN : undefined,
    },
    /* ★ v1.13.3 — 콘솔에 EAI(전문 연동) 메뉴를 보일 것인가. 기본은 **꺼짐**.
       처음 쓰는 사람에게 "MCI 컨트롤러 생성" 은 무엇인지 알 수 없는 메뉴였다.
       필요한 곳에서 .env 의 EAI_ENABLED=true (또는 콘솔 [설정] → [EAI 연동]) 로 켠다.
       옛 이름 MCI_GENERATOR_ENABLED 도 그대로 받는다 — 쓰던 설치본이 깨지면 안 된다. */
    /* ⚠ 두 이름을 `??` 로 이으면 안 된다.
       `EAI_ENABLED=false` 가 .env 에 한 줄 있으면 그것이 정의된 값이라
       뒤의 옛 이름(MCI_GENERATOR_ENABLED=true)을 **아예 보지 않는다.**
       v1.13.3 에서 기본값으로 EAI_ENABLED=false 를 넣은 뒤로 옛 이름이 죽어 있었고,
       그 이름으로 켜는 검사 스크립트(npm run mci:gen-check)가 404 로 실패했다.
       → 둘 중 **하나라도 켜면 켜진다**(OR). 둘 다 없으면 기본값을 쓴다. */
    generatorEnabled: (() => {
      const on = (v) => v === 'true' || v === '1';
      const a = process.env.EAI_ENABLED;
      const b = process.env.MCI_GENERATOR_ENABLED;
      if (a === undefined && b === undefined) return undefined;
      return on(a) || on(b);
    })(),
  },
  secure: {
    enabled: process.env.SECURE_ENABLED !== undefined
      ? (process.env.SECURE_ENABLED === 'true' || process.env.SECURE_ENABLED === '1')
      : undefined,
    mode: process.env.SECURE_MODE || undefined,         // 'kms' | 'local'
    domain: process.env.SECURE_DOMAIN || undefined,
    kmsUrl: process.env.SECURE_KMS_URL || undefined,
    apiKey: process.env.SECURE_KMS_API_KEY || undefined,
    localMasterB64: process.env.SECURE_LOCAL_MASTER || undefined,
    cacheTtlMs: process.env.SECURE_CACHE_TTL_MS
      ? Number(process.env.SECURE_CACHE_TTL_MS) : undefined,
  },
};

// undefined 값은 제거해서 오버라이드 누수 방지
function prune(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = prune(obj[k]);
    if (v !== undefined && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)) {
      out[k] = v;
    }
  }
  return out;
}

const config = deepMerge(deepMerge(defaultConfig, envConfig), prune(dotenvOverrides));
config.env = env;
// Desktop loopback listeners must not accept a DNS-rebinding host name.
config.server.allowedHosts = process.env.ALLOWED_HOSTS
  ? process.env.ALLOWED_HOSTS.split(',').map((host) => host.trim().toLowerCase()).filter(Boolean)
  : process.env.ELECTRON_USER_DATA ? ['localhost', '127.0.0.1', '[::1]'] : [];
if (config.server.allowedHosts.some((host) => !/^(?:[a-z0-9.-]+|\[::1\])$/.test(host))) throw new Error('ALLOWED_HOSTS must contain exact hostnames without schemes or ports');
const editionPackage = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
config.edition = editionPackage.aidotEdition || 'full';
if (config.edition === 'public') {
  config.mci.enabled = false;
  config.mci.generatorEnabled = false;
  config.features = { backup: false, secureColumns: false, ha: false };
  config.ha.enabled = false;
  config.ha.mode = 'standalone';
  config.secure.enabled = false;
  if (config.mciGenerator) config.mciGenerator.enabled = false;
}
validateServerLimits(config.server);
if (config.cors.origin === true || config.cors.origin === '*' || config.cors.origin?.includes?.('*')) {
  throw new Error('CORS_ORIGIN requires exact origins; remove * or list trusted URLs');
}
if (config.auth.cookieSameSite === 'none' && !config.auth.cookieSecure) {
  throw new Error('SameSite=None requires AUTH_COOKIE_SECURE=true');
}

// Phase 36 (patch-15): 기동 시 최종 해결된 MCI 설정을 한 줄 로깅.
//   사용자가 "왜 .env 를 넣었는데 다른 IP 로 연결되나?" 를 즉시 진단할 수 있도록.
try {
  const m = config.mci || {};
  // 각 MCI 값의 출처 추적 — .env (process.env) / env-specific / default 중 어느 레이어에서 왔는가?
  const traceSource = (envKey, envConfigPath) => {
    if (process.env[envKey] !== undefined) return '.env';
    if (envConfigPath !== undefined) return `${env}.js`;
    return 'default.js';
  };
  const hostSrc    = traceSource('MCI_HOST',       envConfig?.mci?.host);
  const portSrc    = traceSource('MCI_PORT',       envConfig?.mci?.port);
  const timeoutSrc = traceSource('MCI_TIMEOUT_MS', envConfig?.mci?.timeoutMs);
  const mciLine = `[config] MCI resolved: host=${m.host}(${hostSrc}) port=${m.port}(${portSrc}) timeout=${m.timeoutMs}ms(${timeoutSrc}) enabled=${m.enabled}`;
  if (process.env.CONFIG_LOG_STDERR === '1') { try { process.stderr.write(mciLine + '\n'); } catch { /* noop */ } }
  else console.log(mciLine);

  // .env 파일이 없거나 MCI_HOST 가 OS 환경변수로만 왔는데 예상과 다른 경우 경고
  if (loadedEnvFiles.length === 0 && hostSrc === '.env') {
    const warn = `[config] ⚠ .env 파일을 찾지 못했지만 process.env.MCI_HOST 가 설정되어 있습니다 (OS 환경변수). 예상한 값과 다르면 셸/서비스에서 해당 변수를 unset 하고 .env 로 관리하세요.`;
    console.warn(warn);
  }
} catch {}

export default config;
