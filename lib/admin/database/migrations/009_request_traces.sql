-- @migration-options: non-blocking
--   요청 추적 저장소 (v1.8.0). 이 파일이 실패해도 서버 기능 자체는 동작해야 하므로
--   non-blocking 으로 둔다 — 추적은 관측 기능이지 필수 경로가 아니다.
-- ============================================================
--  ⚠ 요청/응답 본문은 저장하지 않는다. 경로의 숫자 ID 도 :id 로 마스킹해서 넣는다.
--     환자 정보가 섞이는 순간 추적 테이블 자체가 유출 경로가 된다.
-- ============================================================

CREATE TABLE IF NOT EXISTS request_traces (
  request_id   VARCHAR(64)  NOT NULL,
  trace_id     CHAR(32)     NOT NULL,
  ts           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  method       VARCHAR(10)  NOT NULL,
  path         VARCHAR(300) NOT NULL,
  route        VARCHAR(200) NULL,
  status       SMALLINT     NOT NULL DEFAULT 0,
  duration_ms  INT          NOT NULL DEFAULT 0,
  user_id      VARCHAR(64)  NULL,
  username     VARCHAR(100) NULL,
  user_kind    VARCHAR(20)  NULL,
  ip           VARCHAR(64)  NULL,
  user_agent   VARCHAR(200) NULL,
  step_count   INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_request_traces_ts       ON request_traces (ts);
CREATE INDEX idx_request_traces_user     ON request_traces (username, ts);
CREATE INDEX idx_request_traces_status   ON request_traces (status, ts);
CREATE INDEX idx_request_traces_trace    ON request_traces (trace_id);

CREATE TABLE IF NOT EXISTS request_steps (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  request_id  VARCHAR(64)  NOT NULL,
  seq         INT          NOT NULL,
  at_ms       INT          NOT NULL DEFAULT 0,
  kind        VARCHAR(20)  NOT NULL,
  name        VARCHAR(200) NOT NULL,
  ms          INT          NULL,
  ok          TINYINT      NOT NULL DEFAULT 1,
  rows_count  INT          NULL,
  detail      VARCHAR(500) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_request_steps_req ON request_steps (request_id, seq);
