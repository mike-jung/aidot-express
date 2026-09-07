/**
 * SystemInfoController — /api/admin/system/*
 *
 *  런타임 환경/설정 정보를 (민감 값 제외) 공개하는 엔드포인트.
 *
 *  엔드포인트:
 *   GET  /db-info         현재 DB 어댑터/호스트/DB명 등 연결 구성
 *   GET  /ui-flags        UI 가 조건부 렌더링에 쓰는 boolean flag 들
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Controller, GetMapping, PutMapping, Auth, Roles, Autowired, Log,
} from '../../../src/core/decorators.js';
import config from '../../../src/config/index.js';
import db from '../../../src/database/db.js';
import { summarizeMci } from '../../../src/server.js';
import { loopLagStats } from '../../../src/core/loopLag.js';

/**
 * ★ v1.34.2 — 그 화면이 실제로 번들에 들어 있는가.
 *
 *  공개판 빌드에는 MCI·이중화·백업·암호화 화면이 포함되지 않는다.
 *  그런데 설정(.env)만 보고 메뉴를 켜면, 눌렀을 때 빈 화면이 나온다.
 *  "설정이 켜졌는가" 와 "그 화면이 있는가" 는 다른 질문이다 — 둘 다 참이어야 메뉴를 보인다.
 *
 *  콘솔 번들은 화면 이름이 붙은 파일로 쪼개진다(예: HaPage-DwbgAx0V.js).
 *  결과는 한 번만 세고 기억한다 — 요청마다 폴더를 읽을 이유가 없다.
 */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const _screenCache = new Map();
function hasScreen(name) {
  if (_screenCache.has(name)) return _screenCache.get(name);
  let found = false;
  for (const dir of [
    path.join(projectRoot, 'public', 'assets'),
    path.join(projectRoot, 'admin-client', 'dist', 'assets'),
  ]) {
    try {
      if (fs.readdirSync(dir).some((f) => f.startsWith(`${name}-`) && f.endsWith('.js'))) { found = true; break; }
    } catch { /* 폴더가 없으면 다음 곳을 본다 */ }
  }
  _screenCache.set(name, found);
  return found;
}


@Controller('/api/admin/system')
export default class SystemInfoController {

  @Autowired('ConfigService') configService;

  @Log log;

  /**
   * GET /api/admin/system/health
   *
   *  인증 없이 호출 가능한 헬스체크. 로그인 화면 표시 전에 admin-client 가
   *  호출해서 "DB 가 준비됐는가?" 를 사용자에게 보여준다.
   *
   *  응답:
   *    { ok: true,  adapter, host, database }                       정상
   *    { ok: false, adapter, host, database, error }               DB 접속 실패
   */
  @GetMapping('/health')
  async health() {
    const adapter = db.currentAdapter();
    const c = config.db || {};
    const isProd = config.env === 'production';
    // 인증 없는 엔드포인트 — 운영 환경에서는 호스트/DB명/드라이버 에러 원문을 노출하지 않는다.
    /* ★ v1.10.0 — 콘솔 기본 언어를 함께 싣는다.
       로그인 화면은 이 엔드포인트를 이미 부르므로 왕복이 늘지 않는다.
       인증 없이 노출해도 되는 값이다(언어 설정은 비밀이 아니다).
       운영 환경에서도 내보낸다 — 로그인 화면 자체가 이 값으로 그려져야 한다. */
    const base = isProd
      ? { adapter, configuredType: c.type || null, locale: config.locale || 'en' }
      : {
          locale: config.locale || 'en',
          adapter,
          configuredType: c.type || null,
          host: c.host || null,
          port: c.port || null,
          database: c.database || null,
          service: c.service || null,
        };

    try {
      // 실제 connection 획득을 시도 — pool 에 문제가 있으면 여기서 throw
      await db.execute('SELECT 1 AS ok', {});
      return { data: { ok: true, ...base } };
    } catch (e) {
      return {
        data: {
          ok: false,
          ...base,
          error: isProd
            ? (e?.code ? String(e.code) : 'DB_UNAVAILABLE')
            : (e?.code ? `${e.code}: ${e.message}` : e?.message || String(e)),
          // 개발 모드에서는 화면에서 바로 조치할 수 있게 원인 후보를 함께 준다.
          //   (운영 모드에서는 내부 정보를 노출하지 않으므로 생략)
          hint: isProd ? undefined : dbFailureHint(e, c),
        },
      };
    }
  }

  /**
   * ★ v1.11.0 — GET /api/admin/system/mci
   *  MCI 연결 풀·차단기 상태. 대시보드의 [MCI 연결] 카드가 5~30초마다 읽는다.
   *  설정(호스트·포트·모드·타임아웃)과 실시간 상태(active/idle/queued, 차단기, 누적 카운터, 마지막 오류)를 함께 준다.
   */
  @GetMapping('/mci')
  @Auth()
  async mci() {
    const c = config.mci || {};
    const live = summarizeMci();
    return {
      data: {
        ...live,
        config: {
          enabled: !!c.enabled, host: c.host, port: c.port,
          mode: c.pool?.mode, maxConnections: c.pool?.maxConnections, maxQueue: c.pool?.maxQueue,
          connectTimeoutMs: c.connectTimeoutMs, responseTimeoutMs: c.timeoutMs,
          maxIdleMs: c.pool?.maxIdleMs, maxAgeMs: c.pool?.maxAgeMs, minIdle: c.pool?.minIdle,
          breaker: c.breaker, probe: c.probe, retry: c.retry,
        },
        loopLag: loopLagStats(),
        ts: Date.now(),
      },
    };
  }

  /* GET /api/admin/system/db-info */
  @GetMapping('/db-info')
  @Auth()
  async dbInfo() {
    const adapter = db.currentAdapter();
    const c = config.db || {};

    // ★ 민감 정보(password, connectString 전체) 는 제외 또는 마스킹
    const data = {
      adapter,                     // 'sqlite' | 'mariadb' | 'oracle' | 'postgres'
      configuredType: c.type || null,
      host: c.host || null,
      port: c.port || null,
      user: c.user ? maskUser(c.user) : null,
      database: c.database || null,     // mariadb/mysql
      service:  c.service  || null,     // oracle
      connectionLimit: c.connectionLimit ?? null,
      acquireTimeout:  c.acquireTimeout ?? null,
      fallbackActive: (c.type && c.type.toLowerCase() !== adapter),
      env: config.env,
    };
    return { data };
  }

  /**
   * GET /api/admin/system/ui-flags
   *
   *  admin-client 가 메뉴/라우트 조건부 렌더에 쓰는 feature flag 모음.
   *  값은 boolean 만 포함 (민감 정보 없음). 추가 플래그가 생기면 여기에 확장.
   */
  /**
   * ★ v1.26.0 — 엔터프라이즈 기능 켜기/끄기 (설정 화면용).
   *  ui-flags 는 "지금 무엇이 보이는가" 를 주고, 이쪽은 그것을 **바꾼다**.
   */
  @GetMapping('/features')
  @Roles('admin')
  async getFeatures() {
    return { data: this.configService.getFeatures() };
  }

  @PutMapping('/features')
  @Roles('admin')
  async setFeatures(params, req) {
    const data = await this.configService.setFeatures(req.body || {});
    this.log.warn(`[system] 기능 설정 변경 by ${req.user?.username || '-'}`);
    return { data };
  }

  @GetMapping('/ui-flags')
  @Auth()
  async uiFlags() {
    return {
      data: {
        /* ★ v1.34.2 — 화면이 번들에 없으면 메뉴도 켜지 않는다.
           공개판 빌드에는 MCI·이중화·백업·암호화 화면이 들어 있지 않다.
           설정만 보고 메뉴를 켜면 눌렀을 때 빈 화면이 나온다 —
           "설정이 켜졌는가" 와 "그 화면이 있는가" 는 다른 질문이다. */
        mciGeneratorEnabled: !!config.mci?.generatorEnabled && hasScreen('MciControllerNew'),
        /* ★ v1.25.0 — 엔터프라이즈 메뉴 (기본 감춤) */
        backupEnabled:        !!config.features?.backup && hasScreen('BackupPage'),
        secureColumnsEnabled: !!config.features?.secureColumns && hasScreen('SecureColumnsPage'),
        haEnabled:            !!config.features?.ha && hasScreen('HaPage'),
      },
    };
  }
}

/** 사용자명을 중간 일부 마스킹 (예: admin -> a***n, ab -> a*) */
function maskUser(u) {
  if (!u) return null;
  if (u.length <= 2) return u[0] + '*';
  return u[0] + '***' + u[u.length - 1];
}

/** DB 접속 실패 원인 후보 한 줄 — 로그인 화면 배지의 툴팁/안내에 쓰인다 */
function dbFailureHint(err, dbConf = {}) {
  const msg = `${err?.code || ''} ${err?.message || ''}`;
  const pw = String(dbConf.password ?? '');
  if (['여기에_DB_비밀번호', 'CHANGE_ME', 'your_password'].some((v) => pw.includes(v))) {
    return '.env 의 DB_PASSWORD 가 예제값 그대로입니다 — 실제 비밀번호로 바꾸고 서버를 다시 시작하세요.';
  }
  if (!pw) return '.env 의 DB_PASSWORD 가 비어 있습니다.';
  if (/ECONNREFUSED/i.test(msg)) return `${dbConf.host}:${dbConf.port} 에서 DB 가 실행 중인지 확인하세요.`;
  if (/Access denied|1045/i.test(msg)) return `계정 '${dbConf.user}' 의 비밀번호·권한을 확인하세요.`;
  if (/Unknown database|1049/i.test(msg)) return `데이터베이스 '${dbConf.database}' 를 먼저 만들어야 합니다.`;
  return 'DB 접속 정보(.env)를 확인하세요. 바로 써 보려면 DB_TYPE=sqlite 로 바꿔도 됩니다.';
}
