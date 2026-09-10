// 기본 설정값. config/{NODE_ENV}.js 또는 .env 로 오버라이드 가능.
export default {
  server: {
    port: 3000,
    host: '0.0.0.0',
    tls: { enabled: false, keyFile: '', certFile: '', caFile: '', passphrase: '', serverName: '' },
    headersTimeoutMs: 15000,
    requestTimeoutMs: 120000,
    keepAliveTimeoutMs: 5000,
    maxRequestsPerSocket: 1000,
    bodyLimit: '10mb',
    // 리버스 프록시(Nginx/Caddy/IIS ARR) 뒤에 있을 때만 1/true/'loopback' 로. (.env TRUST_PROXY)
    //   기본 false: 프록시가 없는데 켜 두면 클라이언트가 X-Forwarded-For 를 위조해 rate-limit 을 우회하고
    //   접속 로그의 IP 를 속일 수 있다.
    trustProxy: false,
  },
  /**
   * Supervisor / Control 서버 설정.
   * supervisor 는 메인 서버를 자식 프로세스로 spawn 하고 별도 포트로 control API 를 제공한다.
   *   - GET  /api/control/status
   *   - POST /api/control/start | stop | restart
   * 이 API 는 메인 서버와 동일한 JWT 로 인증하며, admin role 만 허용한다.
   */
  /**
   * ★ v1.14.0 — 이중화(Active/Standby). 기본은 **꺼짐** — 한 대로 쓰는 곳에 영향이 없어야 한다.
   *   서버 2대가 각각 앱 + MariaDB 를 갖고, 평시에는 한쪽만 쓰기를 받는 구성을 위한 것.
   *   판단 논리는 src/core/ha/state.js 에 있고 그 설명이 곧 설계 문서다.
   */
  ha: {
    /**
     * ★ v1.14.2 — 운영 모드. **기본은 standalone(한 대)** 이다.
     *   standalone      한 대로 운영. 이중화 판정을 하지 않고 언제나 액티브처럼 동작한다.
     *   active-standby  두 대. 평시 한쪽만 쓰기를 받고, 장애 시 반대쪽이 인수한다.
     *   (active-active 는 세션·읽기 분산 설계가 더 필요해 아직 없다)
     *  옛 이름 HA_ENABLED=true 도 그대로 받는다 — 쓰던 설치본이 깨지면 안 된다.
     */
    mode: 'standalone',
    enabled: false,
    /** 이 서버 이름 (양쪽이 달라야 한다) */
    nodeId: 'node',
    /** 평시 액티브로 지정된 쪽인가 — 애매한 상황에서 이 쪽이 이긴다 */
    preferred: false,
    /** 상대 서버 주소 (예: http://10.0.0.12:7901) */
    peerUrl: '',
    /** 상대·witness 와 주고받을 때 쓰는 비밀문자열 */
    secret: '',
    /**
     * 바깥 기준점 — 'host:port' 목록. 게이트웨이·EMR·DNS 등 **이미 있는 것**을 쓴다.
     * 과반에 닿지 못하면 "고립된 쪽은 나다" 로 보고 스스로 물러난다.
     */
    anchors: [],
    /** 역할이 바뀔 때 부를 스크립트 (Windows NLB 조종 등). 비우면 부르지 않는다 */
    roleHook: '',
    /** 심판. mode: none | http | file  (없으면 시간 규칙만으로 간다) */
    witness: { mode: 'none', url: '', path: '' },
    timings: {
      tickMs: 1_000,
      demoteMs: 5_000,      // 자격을 잃으면 이 안에 스스로 멈춘다
      takeoverMs: 15_000,   // 반드시 demoteMs 의 2배 이상 (겹치면 양쪽이 쓴다)
      minHoldMs: 300_000,   // 전환 후 최소 유지 (플래핑 방지)
      maxReplicaLagSec: 30, // 이보다 밀렸으면 승격하지 않는다 (오래된 데이터 금지)
    },
  },

  control: {
    enabled: true,
    port: 7902,               // control server listen port
    host: '127.0.0.1',        // '0.0.0.0' 로 외부 노출 가능 (CONTROL_HOST)
    stopTimeoutMs: 10_000,    // SIGTERM 후 SIGKILL 까지 대기시간
    restartCooldownMs: 1_000, // restart 시 stop → start 사이 대기
    mainCommand: null,        // 기본: node --import ./src/loader/register.mjs src/app.js
    /**
     * ★ v1.11.0 — 생존 감시(watchdog). supervisor 가 메인 서버의 /health/live 를 주기적으로 찔러 보고,
     *   연속 failures 회 응답이 없으면 진단 로그를 남기고 **자동 재기동**한다. 프로세스가 죽어도(exit) 다시 띄운다.
     *   "MCI 가 멈춘 뒤 사람이 서버를 재시작할 때까지 아무것도 안 됐다" 를 사람 없이 끝내는 장치.
     *     intervalMs           확인 주기
     *     timeoutMs            한 번의 확인에서 기다리는 시간
     *     failures             연속 몇 번 실패하면 재기동할 것인가 (10초 × 6 = 약 1분 무응답)
     *     restartOnExit        메인이 스스로 죽었을 때(exit code≠0, 신호) 다시 띄울 것인가
     *     minRestartIntervalMs 재기동 사이 최소 간격 — 기동 직후 죽는 경우의 무한 반복 방지
     *     maxRestartsPerHour   한 시간에 이보다 많이 재기동했으면 멈추고 사람을 부른다 (0=무제한)
     *     hangDump             재기동 직전에 멈춘 지점의 JS 스택·process.report 를 꺼낼 것인가.
     *                          메인을 `--inspect-port=127.0.0.1:<inspectPort>` 로 띄운다 — 인스펙터는 평소 닫혀 있고
     *                          watchdog 이 필요할 때만 켠다 (localhost 전용). 보안 정책상 곤란하면 false.
     *     inspectPort          0 이면 메인 포트 + 2000 (7901 → 9901)
     *   .env: SUPERVISOR_WATCHDOG=false 로 끌 수 있다.
     */
    watchdog: {
      enabled: true,
      intervalMs: 10_000,
      timeoutMs: 3_000,
      failures: 6,
      restartOnExit: true,
      minRestartIntervalMs: 30_000,
      maxRestartsPerHour: 10,
      hangDump: true,
      hangDumpTimeoutMs: 5_000,
      inspectPort: 0,
    },
  },
  security: {
    csp: false,
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000,
      max: 1000,
    },
    // 인증 엔드포인트 전용 (더 엄격)
    authRateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 10, // 15분당 10번까지만 실패 허용
    },
  },
  auth: {
    // JWT 서명 비밀키 (반드시 .env 의 AUTH_ACCESS_SECRET 으로 오버라이드)
    accessSecret: 'CHANGE_ME_IN_ENV_FILE_MINIMUM_32_CHARS_LONG!',
    accessTokenTtl: '15m',
    refreshTokenTtl: '7d',
    issuer: 'aidot-express',
    // 로그인 잠금
    maxFailedLogins: 5,
    lockMinutes: 15,
    // Refresh cookie
    cookieSecure: false,        // production 에서 true (HTTPS 필수)
    cookieSameSite: 'strict',   // 'strict' | 'lax' | 'none'
    // 일반 사용자(users) 자가 회원가입 허용 여부 (.env AUTH_SIGNUP_OPEN). 샘플 클라이언트(client/)가 사용.
    registrationOpen: true,
    // 관리자 콘솔 계정(admin_users) 회원가입 API (/api/admin/auth/signup) 개방 여부 (.env ADMIN_SIGNUP_OPEN).
    //   false(기본): admin 역할 토큰으로만 호출 가능 (콘솔 [사용자 관리] 와 동일 권한).
    //   true: 무인증 가입 허용 — 폐쇄망 초기 구축 시에만 잠깐 켜고 즉시 끌 것.
    adminSignupOpen: false,
    // 새 비밀번호 최소 길이 (관리자 계정). NIST SP 800-63B: 길이 우선, 복잡도 규칙보다 유출 목록 차단 권장.
    minPasswordLength: 10,
  },
  cors: {
    // Empty list permits same-origin browser requests only.
    origin: [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  },
  /* ★ v1.10.0 — 콘솔 기본 언어.
     이 설치에서 콘솔을 어떤 말로 띄울지 운영자가 정합니다.
     사용자가 화면에서 고른 값은 이보다 우선합니다(개인 선택 > 조직 기본).
     .env 의 LOCALE=ko 로 바꿉니다. 지원: en · ko */
  locale: 'en',

  log: {
    /* ★ v1.10.26 — 프레임워크가 스스로 남기는 로그(요청 추적 단계, SSE 발행 등)를
       보여 줄 것인가. 기본은 false — 이것들이 로그의 26% 를 차지해
       개발자가 자기 컨트롤러의 SQL 을 찾기 어려웠습니다.
       추적 기능 자체를 디버깅할 때 `.env` 의 LOG_INTERNAL=true 로 켭니다. */
    internal: false,
    level: 'debug',
    dir: 'log',
    maxFiles: '30d',
    // ★ v1.11.3 — 파일 하나의 크기 상한 (winston-daily-rotate-file 표기: '50m', '1g'). 넘치면 .1.log 로 이어진다
    maxSize: '50m',
    // admin / monitoring 관련 로그를 출력할지 여부.
    // - true  : admin 라우트 요청 로그, admin 서비스의 this.log, admin_* 테이블 DB 로그를 모두 출력
    // - false : 모두 숨김 (기본값)
    // .env 의 LOG_ADMIN=true 로 임시 활성화 가능
    admin: false,
    // SQL 전용 로그 파일 생성 여부.
    //  true  → log/sql/YYYY-MM/YYYY-MM-DD.log 에 모든 SQL execute/전문/결과 로그를 기록
    //  false → 생성하지 않음 (기본값). 일반 로그에는 SQL 로그가 그대로 출력됨
    // .env 의 LOG_SQL=true 로 임시 활성화 가능
    sql: false,
  },
  access: {
    // 접속 로그 보관 기간 (일). 이 기간이 지난 access_logs / login_events / user_sessions 는 주기적으로 삭제됨.
    // .env 의 ACCESS_RETENTION_DAYS 로 오버라이드 가능.
    retentionDays: 365,
    // access_logs 테이블 레코드 수 한도. 이 값을 초과하면 오래된 순으로 삭제된다.
    // .env 의 ACCESS_MAX_RECORDS 로 오버라이드 가능. 0 이면 무제한.
    maxRecords: 1_000_000,
  },
  metrics: {
    // admin_metric_samples 테이블 레코드 수 한도. 이 값을 초과하면 오래된 순으로 삭제된다.
    // .env 의 METRICS_MAX_RECORDS 로 오버라이드 가능. 0 이면 무제한.
    maxRecords: 500_000,
    // 레코드 보관 기간(일). 이 기간이 지난 샘플은 주기적으로 삭제됨.
    retentionDays: 30,
  },
  /* ★ v1.10.44 — 요청 추적 설정. 부하 테스트에서 **읽는 쪽만 있고 정의가
     없다는 것**을 발견해 채웠습니다(shouldPersist 가 config.trace 를 봅니다).
       enabled   추적 기록 자체를 끌 수 있게 — 성능 비교·운영 판단용
       slowMs    이 시간을 넘으면 GET 이라도 남긴다
       sampleGet 익명의 빠른 GET 까지 남길 것인가 (기본 false — 잡음) */
  trace: {
    enabled: true,
    slowMs: 500,
    sampleGet: false,
    /* ★ v1.11.3 — 보관. 예전에는 지우는 코드가 없어 request_traces 가 끝없이 자랐다
       (로그인한 사용자의 GET 도 남기므로 하루 수천 건). retentionDays 를 넘긴 것과
       maxRecords 를 넘긴 오래된 것부터 지운다. 0 이면 그 기준은 끔. */
    retentionDays: 30,
    maxRecords: 200_000,
    ringMax: 1000,          // 메모리 링버퍼 (DB 저장 여부와 무관하게 최근 N건)
  },
  /* ★ v1.11.3 — 콘솔 [로그]·[로그 탐색] 이 읽는 양의 상한. 큰 로그 파일을 통째로 읽어 몇 초씩 멈추던 것을 막는다.
       queryMaxBytes  질의 한 번에 읽는 최대 바이트 (최신 파일부터, 파일은 끝에서부터)
       facetsMaxBytes 거름값(facets) 계산에 읽는 최대 바이트
       fileMaxBytes   [로그] 내용 보기가 한 파일에서 읽는 최대 바이트 (끝에서부터) */
  logView: {
    queryMaxBytes: 64 * 1024 * 1024,
    facetsMaxBytes: 16 * 1024 * 1024,
    fileMaxBytes: 32 * 1024 * 1024,
    // ★ v1.11.4 — 훑기를 워커 스레드에서 (메인 스레드 CPU 0, 시간 초과면 워커를 죽인다). false 면 메인에서.
    worker: true,
    scanTimeoutMs: 15_000,
    // ★ v1.11.4 — [로그] 화면을 볼 수 있는 역할. 로그에는 값이 섞여 있을 수 있어 기본은 admin 만.
    roles: ['admin'],
  },

  paths: {
    /* ★ v1.10.42 — 내가 만드는 파일을 둘 작업 폴더 (.env 의 APP_WORKSPACE).
       비워 두면 예전과 똑같이 동작합니다. 지정하면 그 안의
       controller/ · service/ · sql/ 을 **추가로** 읽습니다.
       ⚠ 폴더가 없어도 만들지 않습니다 — 파일을 쓸 때 만듭니다. */
    workspace: '',
    controllers: 'src/controller',
    services: 'src/service',
    sql: 'src/database/sql',
    publicDir: 'public',
    scenarios: 'src/scenarios',       // ★ v1.11.6 시나리오 테스트 (작업 폴더가 있으면 workspace/scenarios)
  },
  db: {
    // 기본 DB 는 MariaDB (11.8 LTS / 12.3 LTS 권장). SQLite 는 선택 사항 (.env DB_TYPE=sqlite — 외부 DB 없이 시험용).
    //   postgres 는 드라이버 연동이 미완성이라 선택 시 기동 단계에서 명시적으로 거부한다.
    type: 'mariadb',       // 'mariadb' | 'mysql' | 'sqlite' | 'oracle'
    // SQLite 전용 — 파일 경로 (상대 경로는 projectRoot 기준)
    //   생략 시: Electron packaged 환경에선 <userData>/app.db, 일반 실행에선 <projectRoot>/data/app.db
    //   ':memory:' 로 설정하면 인메모리 (프로세스 종료 시 사라짐 — 테스트용)
    file: null,
    // mariadb/mysql/postgres/oracle 용 접속 정보
    host: '127.0.0.1',
    port: 3306,
    user: 'aidot',
    password: '',
    database: 'aidot_express', // mariadb/mysql
    // 샘플/튜토리얼 테이블 접두사 (.env DB_SAMPLE_PREFIX). v1.7.3 신설.
    //   person / students / book / guestbook 같은 흔한 이름이 기존 DB 의 남의 테이블과
    //   부딪히는 사고를 막는다. SQL 원문의 `{{sample}}` 토큰이 이 값으로 치환된다.
    //   '' (빈 문자열) 로 두면 v1.7.2 이전과 동일한 이름을 쓴다 — 기존 설치본 탈출구.
    //   ⚠ users / refresh_tokens / admin_* 등 프레임워크 테이블에는 적용되지 않는다.
    samplePrefix: 'sample_',

    /* ★ v1.10.16 — 예제 테이블을 만들 것인가 (.env 의 DB_SAMPLES).
       첫 실행에서는 콘솔이 예제로 사용법을 보여 주므로 기본은 true.
       실제 프로젝트로 쓰기 시작하면 false 로 두면 스키마가 깨끗해집니다.
       ⚠ 이미 만들어진 예제 테이블을 **지우지는 않습니다** — 끄기만 합니다.
         지우는 것은 되돌릴 수 없으므로 사람이 직접 판단해야 합니다. */
    /* ★ v1.10.41 — 어디까지 만들 것인가. (.env 의 DB_SAMPLES)
         'core'  기본 — 튜토리얼이 실제로 쓰는 것만
                 (book · guestbook · students)
         'all'   선택·정리 대상까지 전부
                 (+ secure_member · person · weight_* · blood_*)
         'none'  예제를 아예 만들지 않음

       예전 값(true/false)도 그대로 받습니다 — true→'all', false→'none'.
       배포본을 받은 분이 .env 를 안 고쳐도 동작이 깨지지 않아야 합니다. */
    samples: 'core',

    /* ★ v1.10.17 — 예제를 별도 스키마에 둘 것인가 (MariaDB/MySQL 만).
       true 면 `sample.book` 처럼 스키마로 한정되어, 개발자가 운영 스키마를 열었을 때
       예제가 보이지 않습니다.
       ⚠ SQLite 는 스키마 개념이 없어 이 설정과 무관하게 접두사(sample_)를 씁니다. */
    sampleSchemaSeparate: true,
    /** 그때 쓸 스키마 이름 (.env 의 DB_SAMPLE_SCHEMA) */
    sampleSchema: 'sample',

    /* ★ v1.12.2 — 업무 테이블 스키마 (.env 의 DB_APP_SCHEMA).
       테이블은 세 종류다:
         ① 프레임워크 시스템 표  admin_* · access_logs · request_traces · refresh_tokens  → 접속 스키마(database)
         ② 프레임워크 예제 표    book · guestbook · students …                             → sampleSchema('sample')
         ③ **내가 만드는 업무 표**  snack · patient …                                       → 여기
       비워 두면 ③ 이 ① 과 같은 스키마에 섞인다(예전 동작). 이름을 넣으면 콘솔이 만드는 SQL 이
       `FROM aidot_app.snack` 처럼 그 스키마로 한정되고, 테이블 컬럼도 그 스키마에서 읽는다.
       ⚠ 이미 만든 테이블을 옮기지는 않는다 — 스키마를 정한 뒤 거기에 만들면 된다.
       ⚠ 'sample' 은 예제 전용이라 권하지 않는다 (예제 표가 같이 들어온다). */
    appSchema: '',
    // MariaDB 연결 옵션 (mariadb connector 3.5)
    ssl: false,            // .env DB_SSL=true → TLS (서버 인증서 검증 포함)
    timezone: 'local',     // 'local' | 'Z' | '+09:00'
    connectTimeout: 10_000,
    service: '',           // oracle
    connectionLimit: 10,
    acquireTimeout: 10000,
    // mariadb/postgres 초기 접속 실패 시 sqlite 로 자동 폴백할지 여부.
    //   false (기본): 명시적으로 지정한 DB 타입이 유지됨 → 접속 실패 시 에러 가시화.
    //   true: 개발 편의상 sqlite 자동 폴백 — 단 사용자가 "왜 sqlite 지?" 혼란 주므로 비권장.
    // .env 의 DB_FALLBACK_TO_SQLITE=true 로 명시적 활성화 가능.
    fallbackToSqlite: false,
    /* ★ v1.9.3 — MariaDB 스키마가 없으면 기동 시 만든다.
       빈 MariaDB 에는 우리 스키마가 없어 연결 자체가 실패한다(sqlite 는 파일을 알아서 만든다).
       운영에서 계정에 CREATE 권한을 주지 않는다면 false 로. */
    autoCreateDatabase: true,
  },
  /**
   * MCI (의료 통신 인터페이스) 소켓 서버 설정.
   *  전송 프로토콜: TCP, 요청/응답 모두 "10자리 ASCII zero-padded length" + UTF-8 JSON body
   *  예: "0000000342{\"cfs_sheader_001\":..." (총 10 + 342 = 352 바이트)
   *
   * .env 로 오버라이드:
   *   MCI_ENABLED, MCI_HOST, MCI_PORT, MCI_TIMEOUT_MS,
   *   MCI_POOL_MODE, MCI_POOL_MAX, MCI_POOL_ACQUIRE_TIMEOUT_MS, MCI_POOL_IDLE_TIMEOUT_MS
   */
  mci: {
    enabled: true,
    // Phase 36 (patch-15): 개발 환경 Mock MCI 서버 기본값을 localhost:7101 로.
    //   이전엔 host='127.0.0.1', port=9999 라서 Mock 서버 (localhost:7101) 와 달라
    //   처음 설치한 사용자가 Mock 띄워도 즉시 ECONNREFUSED 발생.
    //   .env 의 MCI_HOST / MCI_PORT 가 있으면 그 값이 최우선으로 오버라이드됨.
    //   운영 환경은 .env 또는 config/production.js 로 실제 MCI 서버 host/port 지정.
    host: 'localhost',
    port: 7101,
    timeoutMs: 10_000,       // 응답 대기 상한 (요청을 보낸 뒤 답이 올 때까지)
    /* ★ v1.11.0 — 연결 대기는 응답 대기와 **다른** 값이어야 한다.
       서버가 죽어 있을 때 "연결" 은 2초면 충분히 판정된다. 예전에는 둘 다 timeoutMs(10초)를
       써서, 죽은 서버에 요청 하나가 최대 20초를 기다렸다. (.env MCI_CONNECT_TIMEOUT_MS) */
    connectTimeoutMs: 2_000,
    lengthHeaderBytes: 10,   // 전문 길이 헤더 자릿수 (고정 10)
    encoding: 'utf8',        // JSON body 인코딩
    maxFrameBytes: 64 * 1024 * 1024,   // 응답 프레임 상한 — 길이 헤더가 깨져 "99억 바이트" 를 기다리는 사고 차단
    /**
     * 연결 풀 — 어떻게 연결하고, 언제 버리고, 얼마나 기다릴 것인가.
     *
     *   mode='per-request' (기본) 요청마다 새 TCP 연결. 죽은 연결이 생길 수 없다.
     *                             비용: 요청마다 handshake(LAN 1ms 미만), TIME_WAIT 회전.
     *   mode='keep-alive'         성공한 연결을 재사용. 아래 maxIdleMs/maxAgeMs 가 죽은 연결을 걸러내고,
     *                             하나가 끊기면 유휴 연결을 전부 버린다(서버 재시작으로 본다).
     *                             → MCI 서버가 한 연결에서 여러 전문을 받아 줄 때만.
     *
     *   maxConnections    동시 연결 상한 (세마포어)
     *   maxQueue          ★ 슬롯 대기열 상한 — 넘치면 **즉시** 503. 예전에는 무제한이라 밀리면 끝없이 쌓였다
     *   acquireTimeoutMs  슬롯을 기다리는 시간
     *   maxIdleMs         (keep-alive) 이보다 오래 논 연결은 재사용하지 않는다 — 예전 이름 idleTimeoutMs 도 받는다
     *   maxAgeMs          (keep-alive) 연결 수명 상한 — 하루 1회 재시작하는 서버에 오래된 연결을 남기지 않는다
     *   minIdle           (keep-alive) 기동 때 미리 열어 둘 연결 수 (0 이면 첫 요청 때 연다)
     *   keepAliveDelayMs  TCP keepalive 시작 지연 — 반대편이 말없이 사라진 연결을 OS 가 끊어 준다 (0 이면 끔)
     */
    pool: {
      mode: 'per-request',
      maxConnections: 10,
      maxQueue: 100,
      acquireTimeoutMs: 5_000,
      maxIdleMs: 15_000,
      maxAgeMs: 300_000,
      minIdle: 0,
      keepAliveDelayMs: 10_000,
    },
    /**
     * ★ v1.11.0 — 회로 차단기. 연속 실패가 failureThreshold 에 닿으면 openMs 동안 **기다리지 않고** 503 을 돌려준다.
     *   MCI 가 죽어 있는 동안 모든 요청이 타임아웃을 꽉 채워 기다리던 것이 "MCI 만 죽었는데 전체가
     *   느려지는" 첫 번째 통로였다. 시험 요청(half-open)이 실패할 때마다 창이 배로 늘어난다(최대 maxOpenMs).
     */
    breaker: {
      enabled: true,
      failureThreshold: 5,
      openMs: 5_000,
      maxOpenMs: 60_000,
    },
    /**
     * ★ v1.11.0 — 능동 탐침. 차단기가 열려 있는 동안 intervalMs 마다 TCP 연결만 시도해 본다.
     *   사용자 요청이 없어도 복구를 알아채고, 연결되면 다음 실제 요청 하나로 확인한 뒤 닫는다.
     */
    probe: {
      enabled: true,
      intervalMs: 2_000,
    },
    /**
     * ★ v1.11.0 — 재시도. 재사용한(유휴) 연결이 죽어 있었을 때 새 연결로 한 번 더 보낼 것인가.
     *   onStaleConnection
     *     'safe' (기본) 요청이 소켓에 쓰이기 **전에** 끊긴 것은 무조건, 쓰인 뒤면 멱등한 요청만
     *     'all'         쓰인 뒤 끊긴 것도 전부 (저장 인터페이스가 두 번 처리될 위험을 감수)
     *     'none'        재시도 없음
     *   idempotentInterfacePattern  인터페이스 ID 가 이 정규식에 맞으면 멱등(조회)으로 본다.
     *     기본 `_l\\d+$` — `mzd_deptmmt_l01` 처럼 `_l##` 로 끝나는 조회 계열. 빈 문자열이면 자동 판정 없음.
     *   ⚠ 응답 타임아웃은 어떤 설정에서도 재시도하지 않는다 — 서버가 느린 것이지 죽은 게 아닐 수 있다.
     */
    retry: {
      onStaleConnection: 'safe',
      idempotentInterfacePattern: '_l\\d+$',
    },
    /**
     * MCI 코드 생성기 도구 활성화 여부.
     *  - UI: "MCI 컨트롤러 생성" / "MCI 템플릿 편집" 메뉴 및 페이지
     *  - API: /api/admin/mci/* 엔드포인트 전체
     *  보안상 운영 환경에서는 false 유지. 개발/스테이징에서만 .env 로 활성화 권장.
     *  .env 의 EAI_ENABLED=true (옛 이름 MCI_GENERATOR_ENABLED 도 가능) 로 켤 수 있음.
     *  기본이 꺼짐인 이유: 처음 쓰는 사람에게는 EAI 메뉴가 무엇인지 알 수 없어 방해가 된다.
     */
    generatorEnabled: false,
  },

  /**
   * 컬럼 암호화 (aidot-securedb 내장, A 방식).
   *  - envelope 암호화 + 색인은 aidot-express 안에서 직접 수행.
   *  - 마스터키/KEK 관리·회전·감사는 aidot-kms 에 위임 (mode='kms').
   *  - aidot-kms 가 없으면 로컬 마스터 시크릿으로 폴백 (mode='local').
   *
   * .env 로 오버라이드:
   *   SECURE_ENABLED=true
   *   SECURE_MODE=kms                 # kms | local
   *   SECURE_DOMAIN=aidot-express-prod
   *   SECURE_KMS_URL=http://localhost:8077
   *   SECURE_KMS_API_KEY=ak_xxx.yyy
   *   SECURE_LOCAL_MASTER=<base64 32B+>   # 폴백/로컬 모드용
   */
  secure: {
    enabled: false,
    mode: 'local',                // kms | local
    domain: 'aidot-express',
    kmsUrl: '',                   // 예: http://localhost:8077
    apiKey: '',
    localMasterB64: '',           // 로컬/폴백 마스터 (없으면 local 모드 불가)
    cacheTtlMs: 5 * 60 * 1000,    // KEK/색인키 캐시 TTL
  },
};
