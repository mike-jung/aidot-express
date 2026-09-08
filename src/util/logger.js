import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '../config/index.js';
import { currentRequestId } from '../core/requestContext.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..');
const logRoot = path.resolve(projectRoot, config.log.dir);   // log/
const logGeneralDir = path.join(logRoot, 'general');          // log/general/
const logSqlDir     = path.join(logRoot, 'sql');              // log/sql/
fs.mkdirSync(logGeneralDir, { recursive: true });
if (config.log.sql) fs.mkdirSync(logSqlDir, { recursive: true });

/**
 * 호출 스택을 파싱해 "파일명:라인:컬럼" 을 반환.
 * - file URL 은 fileURLToPath 로 OS 에 맞는 절대경로로 변환 (Windows D:/ 안전).
 * - 경로는 출력하지 않고 basename 만 사용.
 * - 로거 자신 / Node 빌트인 / node_modules 프레임은 건너뜀.
 */
function getCallerLocation() {
  const stack = new Error().stack;
  if (!stack) return '';
  const lines = stack.split('\n').slice(1);
  // 'at Foo (file:///D:/.../foo.js:10:5)' 또는 'at /abs/foo.js:10:5'
  const re = /\(?(file:\/\/[^)]+|\/[^\s()]+|[A-Za-z]:[\\/][^\s()]+):(\d+):(\d+)\)?$/;

  const isSkippable = (file) => {
    if (!file) return true;
    if (file.startsWith('node:')) return true;
    if (file.includes(`${path.sep}node_modules${path.sep}`)) return true;
    if (file.includes('/node_modules/')) return true;
    const base = path.basename(file);
    if (base.startsWith('logger.')) return true; // 로거 자신
    return false;
  };

  const toFsPath = (raw) => {
    if (raw.startsWith('file://')) {
      try { return fileURLToPath(raw); } catch { return raw; }
    }
    return raw;
  };

  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const file = toFsPath(m[1]);
    if (isSkippable(file)) continue;
    return `${path.basename(file)}:${m[2]}:${m[3]}`;
  }
  // 폴백: 어떤 프레임이라도
  for (const line of lines) {
    const m = line.match(re);
    if (m) {
      const file = toFsPath(m[1]);
      return `${path.basename(file)}:${m[2]}:${m[3]}`;
    }
  }
  return '';
}

// 일반 로그 파일 경로: log/general/YYYY-MM/YYYY-MM-DD.log
const dailyTransport = new DailyRotateFile({
  dirname: logGeneralDir,
  filename: '%DATE%',
  datePattern: 'YYYY-MM/YYYY-MM-DD',
  extension: '.log',
  maxFiles: config.log.maxFiles,
  /* ★ v1.11.3 — 크기 상한. 없으면 하루치 파일이 수백 MB 로 자라고(부하 시험 하루에 768MB 를 봤다),
     콘솔 [로그]·[로그 탐색] 이 그 파일을 읽을 때마다 몇 초씩 멈춘다. 넘치면 2026-08-27.1.log 처럼 이어진다. */
  ...(config.log.maxSize ? { maxSize: config.log.maxSize } : {}),
  level: config.log.level,
  zippedArchive: false,
});

/**
 * 콘솔 출력 포맷.
 *
 *  ⚠ v1.7.2 수정: 이전에는 winston 의 colorize 가 붙여 준 색상 코드까지 통째로 toUpperCase() 해서
 *    `ESC[32m` 이 `ESC[32M` 으로 바뀌었다. `ESC[...m` 은 색상(SGR)이지만 `ESC[...M` 은
 *    **줄 삭제(DL, Delete Line)** 제어문자다. 그래서 ANSI 를 해석하는 터미널(Windows Terminal,
 *    PowerShell 7 등)에서는 앞에 출력된 줄이 지워지고 로그가 깨져 보였다.
 *    → 색상은 여기서 직접 입히고, 대문자 변환은 순수 레벨 문자열에만 적용한다.
 */
const LEVEL_COLOR = { error: 31, warn: 33, info: 32, http: 36, debug: 90 };
// 색은 사람이 보는 터미널일 때만. 파일/파이프로 넘길 때는 제어문자를 넣지 않는다.
const useColor = !!process.stdout.isTTY && !process.env.NO_COLOR;

/* v1.8.0: 요청 상관 ID 를 모든 줄에 붙인다.
   requestContext 는 node 내장 모듈만 import 하므로 여기서 정적 import 해도 순환이 생기지 않는다.
   컨텍스트 밖(부팅·스케줄러)에서는 null 이고, 그때는 접두를 붙이지 않는다. */
function reqTag() {
  const id = currentRequestId();
  return id ? ` [${id}]` : '';
}

const consoleFormat = winston.format.printf(({ timestamp, level, message, location, ...meta }) => {
  const plain = String(level).replace(/\u001b\[[0-9;]*m/g, '');   // 혹시 색상이 붙어 있으면 벗긴다
  const upper = plain.toUpperCase();
  const label = useColor ? `\u001b[${LEVEL_COLOR[plain] ?? 39}m${upper}\u001b[39m` : upper;
  const loc = location ? ` [${location}]` : '';
  const rest = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `${timestamp} [${label}]${reqTag()}${loc} ${message}${rest}`;
});

/**
 * ★ v1.10.26 — 프레임워크 배관을 거르는 필터.
 *
 *  winston 의 format 단계에서 거릅니다. transport(콘솔·파일·SQL 전용)마다
 *  따로 거르면 한 곳을 빠뜨리기 쉽고, 실제로 그런 식으로 새어 나옵니다.
 *  **한 곳에서 걸러야 전부에 적용됩니다.**
 *
 *  `format.printf` 가 빈 문자열을 돌려주면 그 줄은 기록되지 않습니다.
 */
const dropInternal = winston.format((info) => {
  if (info.kind === 'internal' && config.log?.internal !== true) return false;
  return info;
});

const fileFormat = winston.format.printf(({ timestamp, level, message, location, kind, ...meta }) => {
  const loc = location ? `[${location}]` : '[-]';
  const rest = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  /* ★ v1.9.4 — 모든 줄에 `kind=` 를 붙인다.
     이게 이 설계의 핵심이다. 텍스트 안에 필드가 들어 있으면
     **도구 없이 `grep kind=sql` 만으로도 뽑힌다.** 폐쇄망에 ssh 로 붙어
     tail 하는 현장에서, 도구를 못 깔아도 최소한의 슬라이싱이 되는 것이 중요하다.
     (kind 를 못 정한 줄은 app 으로 — 빈 값이면 grep 이 어긋난다) */
  const k = kindOf(kind, level, location, message);
  return `${timestamp} [${level.toUpperCase()}]${reqTag()} kind=${k} ${loc} ${message}${rest}`;
});

/** 알려진 종류 — 실제로 따로 보게 되는 것만 둔다. 잘게 쪼개면 그것대로 못 쓴다. */
export const LOG_KINDS = ['internal', 'sql', 'http', 'auth', 'migration', 'boot', 'admin', 'app'];

/**
 * 줄의 종류를 정한다.
 *  명시 지정이 우선이고, 없으면 내용에서 추론한다 —
 *  기존 호출부 수백 곳을 전부 고치지 않고도 분류가 시작되게 하기 위해서다.
 */
function kindOf(kind, level, location, message) {
  if (kind && LOG_KINDS.includes(kind)) return kind;
  const m = String(message || '');
  if (/^\[DB:/.test(m)) return 'sql';
  if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /.test(m)) return 'http';
  if (/\[migration\]/.test(m)) return 'migration';
  if (/\[auth\]|로그인|비밀번호|토큰/.test(m)) return 'auth';
  if (/\[boot\]|기동|초기화/.test(m)) return 'boot';
  if (location && /lib[\\/]admin[\\/]/.test(String(location))) return 'admin';
  return 'app';
}

dailyTransport.format = winston.format.combine(
    dropInternal(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  fileFormat,
);

const baseLogger = winston.createLogger({
  level: config.log.level,
  format: winston.format.combine(
    dropInternal(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
    dropInternal(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        consoleFormat,
      ),
    }),
    dailyTransport,
  ],
});

function wrap(level) {
  return (msg, meta = {}) => {
    const location = getCallerLocation();
    if (msg instanceof Error) {
      baseLogger.log({ level, message: msg.message, location, stack: msg.stack, ...meta });
    } else if (typeof msg === 'object' && msg !== null) {
      baseLogger.log({ level, message: JSON.stringify(msg), location, ...meta });
    } else {
      baseLogger.log({ level, message: String(msg), location, ...meta });
    }
  };
}

const logger = {
  error: wrap('error'),
  warn: wrap('warn'),
  info: wrap('info'),
  http: wrap('http'),
  debug: wrap('debug'),
  // morgan 스트림: 클라이언트 요청 접근 로그.
  //   - level = 'debug'
  //   - location = 'server.js:125' (morgan 호출부의 고정 위치 — 파일/라인까지 표시)
  //   - admin 경로 요청 로그는 config.log.admin=false (기본) 이면 숨김
  //   - config.log.sql=true 면 SQL 전용 파일에도 동일 라인 기록
  stream: {
    write: (line) => {
      if (!config.log.admin && isAdminHttpLine(line)) return;
      /* ★ v1.11.3 — kind=http 를 명시한다. 예전에는 줄이 IP 로 시작해 kindOf 가 'app' 으로 분류했고,
         [로그 탐색] 의 [HTTP] 빠른 질의가 언제나 0건이었다. */
      baseLogger.log({ level: 'debug', message: line.trim(), location: 'server.js:129:7', kind: 'http' });
      if (_sqlLoggerRef) {
        _sqlLoggerRef.stream.write(line);
      }
    },
  },
};

// 아래에서 초기화되는 sqlLogger 를 스트림에서 참조하기 위한 헬퍼 변수
let _sqlLoggerRef = null;

/* ============================================================
 *  admin 관련 로그 구분용 유틸
 *
 *  - isAdminService(filePath) : lib/admin/service/ 아래의 서비스인지 판정
 *  - isAdminSql(sql)          : SQL 에 admin_* 테이블이 참조되는지 판정
 *  - isAdminHttpLine(morgan)  : morgan combined 로그가 /api/admin/ 요청인지 판정
 *  - forService(filePath)     : 서비스 파일 경로를 받아서 해당 서비스 전용
 *                               logger 래퍼를 반환. admin 서비스이고
 *                               config.log.admin 이 false 면 no-op 로거 제공.
 * ============================================================ */

const ADMIN_SVC_DIR_RE = /[\\/]lib[\\/]admin[\\/]service[\\/]/;
const ADMIN_CTRL_DIR_RE = /[\\/]lib[\\/]admin[\\/]controller[\\/]/;
// admin_* 로 시작하는 테이블 + 접속통계 전용 3개 테이블 + schema_migrations 는
// 모두 '관리 데이터' 로 분류하여 로그 억제 대상.
/**
 * ★ v1.10.26 — 프레임워크가 스스로 남기는 기록(=배관) 테이블.
 *
 *  개발자가 컨트롤러를 한 번 호출하면 프레임워크는 그 요청의 단계를
 *  `request_steps` 에 여러 건 적습니다. 그래서 로그가 이렇게 됩니다.
 *
 *      INSERT INTO request_steps ...   ← 프레임워크 배관
 *      INSERT INTO request_steps ...   ← 프레임워크 배관
 *      SELECT * FROM sample.book ...   ← 개발자가 보고 싶은 것
 *      INSERT INTO request_steps ...   ← 프레임워크 배관
 *
 *  실제로 재 보니 **로그의 26% 가 `request_steps`** 였습니다. 내가 부른
 *  컨트롤러의 SQL 을 찾으려면 이 사이를 헤집어야 합니다.
 *
 *  업계 권고도 같습니다 — "헬스체크·하트비트·폴링처럼 신호 없이 양만 늘리는
 *  반복 패턴은 **원천에서** 걸러라"(Grepr, 2026). 뒤에서 거르면 이미 늦습니다.
 *
 *  ⚠ 이름을 일일이 나열하면 새 테이블이 생길 때마다 또 빠뜨립니다.
 *    실제로 `request_steps`/`request_traces` 가 그렇게 빠져 있었습니다.
 *    그래서 **접두사 규칙**을 함께 둡니다: `admin_*` 과 `request_*` 는
 *    프레임워크 것이고, 나머지는 개발자 것입니다.
 */
const FRAMEWORK_TABLE_RE = new RegExp(
  '\\b(?:'
  + 'admin_[a-z_][a-z0-9_]*'      // 콘솔 운영
  + '|request_[a-z_][a-z0-9_]*'   // 요청 추적 (steps / traces)
  + '|access_logs|user_sessions|login_events|schema_migrations'
  + ')\\b', 'i');

/** @deprecated 이름이 admin 만 가리켜 오해를 부릅니다 — FRAMEWORK_TABLE_RE 를 쓰세요 */
const ADMIN_TABLE_RE = FRAMEWORK_TABLE_RE;

export function isAdminService(filePath) {
  if (!filePath) return false;
  return ADMIN_SVC_DIR_RE.test(filePath) || ADMIN_CTRL_DIR_RE.test(filePath);
}

/**
 * ★ v1.10.26 — 이 로그가 **프레임워크가 스스로 남긴 배관**인가?
 *
 *  개발자가 컨트롤러를 한 번 부르면 프레임워크는 그 요청의 단계를
 *  `request_steps` 에 여러 건 적고, 실시간 화면이 붙어 있으면 `[sse] 발행` 도
 *  계속 찍습니다. 실측하니 **로그의 26% 가 배관**이었고, 개발자가 보고 싶은
 *  SQL(27%)과 거의 1:1 로 섞여 있었습니다.
 *
 *  ⚠ **끄지 않고 나눕니다.** 추적 기능 자체가 이상할 때는 이 로그를 봐야
 *    하는데, 지워 버리면 그때 손쓸 방법이 없습니다. `LOG_INTERNAL=true`.
 */
export function isInternalKind(kind) {
  return kind === 'internal';
}

/** 프레임워크 로그를 지금 보여 줄 것인가 */
export function showInternal() {
  return config.log?.internal === true;
}

export function isAdminSql(sql) {
  if (!sql) return false;
  return ADMIN_TABLE_RE.test(sql);
}

/** morgan combined 포맷 한 줄에서 요청 URL 이 /api/admin/ 인지 추출 */
export function isAdminHttpLine(line) {
  if (!line) return false;
  // combined 포맷: `... "METHOD /path HTTP/1.1" ...`
  const m = line.match(/"([A-Z]+)\s+([^"\s]+)/);
  if (!m) return false;
  return m[2].startsWith('/api/admin/');
}

/**
 * 특정 파일(주로 서비스/컨트롤러)에서 사용할 logger 를 반환.
 *  - admin 파일이 아니면 기본 logger 그대로 반환 (오버헤드 0)
 *  - admin 파일이고 config.log.admin=false 면 no-op logger 반환
 *  - admin 파일이고 config.log.admin=true  면 기본 logger 반환
 */
const NOOP = () => {};
const noopLogger = {
  error: NOOP, warn: NOOP, info: NOOP, http: NOOP, debug: NOOP,
  stream: { write: NOOP },
};

export function forService(filePath) {
  if (!isAdminService(filePath)) return logger;
  return config.log.admin ? logger : noopLogger;
}

/* ============================================================
 *  SQL 전용 로거
 *   - config.log.sql === true  → log/sql/YYYY-MM/YYYY-MM-DD.log 에 기록
 *   - config.log.sql === false → no-op (일반 로거에 그대로 흘러감)
 *
 *  db.js 에서 SQL 실행/결과 로그를 sqlLogger 로 출력하면:
 *    - sql=true  : 전용 파일에만 기록 (일반 로그에는 안 보임)
 *    - sql=false : 일반 logger 로 폴백 (기존 동작 유지)
 * ============================================================ */
let _sqlLogger;
if (config.log.sql) {
  const sqlTransport = new DailyRotateFile({
    dirname: logSqlDir,
    filename: '%DATE%',
    datePattern: 'YYYY-MM/YYYY-MM-DD',
    extension: '.log',
    maxFiles: config.log.maxFiles,
    level: 'debug',
    zippedArchive: false,
  });
  sqlTransport.format = winston.format.combine(
    dropInternal(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    fileFormat,
  );
  const sqlWinston = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
    dropInternal(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    ),
    transports: [sqlTransport],  // 콘솔 미포함 — 파일만
  });
  const sqlWrap = (level) => (msg, meta = {}) => {
    const location = getCallerLocation();
    sqlWinston.log({
      level,
      message: typeof msg === 'string' ? msg : JSON.stringify(msg),
      location,
      ...meta,
    });
  };
  _sqlLogger = {
    error: sqlWrap('error'),
    warn:  sqlWrap('warn'),
    info:  sqlWrap('info'),
    http:  sqlWrap('http'),
    debug: sqlWrap('debug'),
    stream: {
      write: (line) => sqlWinston.log({ level: 'debug', message: line.trim(), location: 'server.js' }),
    },
  };
} else {
  // SQL 전용 로거 비활성화 → db.js 가 일반 logger 로 폴백하도록 null 반환
  _sqlLogger = null;
}

/** SQL 전용 로거. config.log.sql=false 면 null 반환 → 호출측이 일반 logger 로 폴백. */
export const sqlLogger = _sqlLogger;
// morgan 스트림이 SQL 파일에도 쓸 수 있도록 참조 주입
_sqlLoggerRef = _sqlLogger;

export { logger };

export default logger;
