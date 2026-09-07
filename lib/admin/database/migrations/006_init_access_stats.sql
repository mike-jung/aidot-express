-- ============================================================
-- 접속 통계용 테이블
--   access_logs    : 요청 단위 접속 로그 (원천)
--   user_sessions  : 로그인~로그아웃 세션 단위 체류시간
--   login_events   : 로그인/로그아웃 이벤트 이력
-- ============================================================

-- 개별 요청의 접속 로그.
-- admin_* 경로도 동일하게 저장하되, 통계 UI 에서 선택적으로 필터링 한다.
CREATE TABLE IF NOT EXISTS access_logs (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ts           DATETIME(3)     NOT NULL COMMENT '요청 완료 시각',
  user_id      BIGINT UNSIGNED NULL    COMMENT '익명이면 NULL',
  username     VARCHAR(100)    NULL,
  session_kind VARCHAR(16)     NULL    COMMENT '''admin'' | ''user'' | NULL(익명)',
  method       VARCHAR(10)     NOT NULL,
  path         VARCHAR(500)    NOT NULL COMMENT 'req.originalUrl 또는 매칭된 라우트',
  route_key    VARCHAR(200)    NULL    COMMENT 'Controller.handler (매칭된 경우)',
  controller   VARCHAR(100)    NULL,
  handler      VARCHAR(100)    NULL,
  status       SMALLINT        NOT NULL DEFAULT 0,
  duration_ms  INT             NOT NULL DEFAULT 0,
  ip           VARCHAR(45)     NULL,
  user_agent   VARCHAR(255)    NULL,
  PRIMARY KEY (id),
  KEY idx_al_ts         (ts),
  KEY idx_al_user_ts    (username, ts),
  KEY idx_al_path_ts    (path(120), ts),
  KEY idx_al_route_ts   (route_key, ts),
  KEY idx_al_status_ts  (status, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 사용자 세션 (로그인 ~ 로그아웃 또는 토큰 만료).
CREATE TABLE IF NOT EXISTS user_sessions (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  username     VARCHAR(100)    NOT NULL,
  session_kind VARCHAR(16)     NOT NULL DEFAULT 'user' COMMENT '''admin'' | ''user''',
  started_at   DATETIME(3)     NOT NULL,
  ended_at     DATETIME(3)     NULL,
  duration_sec INT             NULL,
  ip           VARCHAR(45)     NULL,
  user_agent   VARCHAR(255)    NULL,
  PRIMARY KEY (id),
  KEY idx_us_user_started (user_id, started_at),
  KEY idx_us_started      (started_at),
  KEY idx_us_ended        (ended_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 로그인/로그아웃 이벤트 이력.
CREATE TABLE IF NOT EXISTS login_events (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ts           DATETIME(3)     NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  username     VARCHAR(100)    NOT NULL,
  session_kind VARCHAR(16)     NOT NULL DEFAULT 'user',
  event_type   VARCHAR(20)     NOT NULL COMMENT '''login'' | ''logout'' | ''logout_all'' | ''login_failed''',
  session_id   BIGINT UNSIGNED NULL COMMENT 'user_sessions.id 참조 (login 시 생성된 세션 id)',
  ip           VARCHAR(45)     NULL,
  user_agent   VARCHAR(255)    NULL,
  PRIMARY KEY (id),
  KEY idx_le_user_ts  (user_id, ts),
  KEY idx_le_ts       (ts),
  KEY idx_le_event_ts (event_type, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
