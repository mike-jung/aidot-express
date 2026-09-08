-- ============================================================
-- 서버 부하 모니터링 관련 테이블
-- ============================================================

-- admin_metric_samples: 시계열 샘플 (집계 단위 flush)
--   kind:   'os'  | 'http' | 'db'
--   metric: kind 내의 세부 지표 (예: 'cpu_pct', 'mem_pct', 'rps', 'avg_ms', 'qps', 'err_pct')
CREATE TABLE IF NOT EXISTS admin_metric_samples (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ts          DATETIME(3)     NOT NULL COMMENT '샘플 시각 (ms 정밀도)',
  kind        VARCHAR(16)     NOT NULL,
  metric      VARCHAR(32)     NOT NULL,
  value       DOUBLE          NOT NULL,
  PRIMARY KEY (id),
  KEY idx_ams_ts_kind (ts, kind),
  KEY idx_ams_kind_metric_ts (kind, metric, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- admin_metric_thresholds: 알림 임계값 설정
--   comparator: '>'  | '<'  | '>='  | '<='
--   duration_sec: 조건이 이 시간 동안 연속 유지되어야 알림 발생
CREATE TABLE IF NOT EXISTS admin_metric_thresholds (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind          VARCHAR(16)     NOT NULL,
  metric        VARCHAR(32)     NOT NULL,
  comparator    VARCHAR(4)      NOT NULL DEFAULT '>',
  threshold     DOUBLE          NOT NULL,
  duration_sec  INT             NOT NULL DEFAULT 30,
  enabled       TINYINT(1)      NOT NULL DEFAULT 1,
  label         VARCHAR(100)    NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_amt_kind_metric (kind, metric)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 임계값 시드 (이미 있으면 skip)
INSERT IGNORE INTO admin_metric_thresholds (kind, metric, comparator, threshold, duration_sec, enabled, label) VALUES
  ('os',   'cpu_pct',  '>',  85,   30, 1, 'CPU 사용률 85% 초과'),
  ('os',   'mem_pct',  '>',  90,   60, 1, '메모리 사용률 90% 초과'),
  ('http', 'avg_ms',   '>',  1000, 30, 1, 'HTTP 평균 응답시간 1초 초과'),
  ('http', 'err_pct',  '>',  10,   30, 1, 'HTTP 에러율 10% 초과'),
  ('db',   'avg_ms',   '>',  500,  30, 1, 'DB 평균 쿼리시간 500ms 초과'),
  ('db',   'err_pct',  '>',  5,    30, 1, 'DB 에러율 5% 초과');

-- admin_metric_alerts: 알림 이력
--   status: 'active' (발생 중) | 'resolved' (해제됨)
CREATE TABLE IF NOT EXISTS admin_metric_alerts (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  triggered_at   DATETIME(3)     NOT NULL,
  resolved_at    DATETIME(3)     NULL,
  kind           VARCHAR(16)     NOT NULL,
  metric         VARCHAR(32)     NOT NULL,
  comparator     VARCHAR(4)      NOT NULL,
  threshold      DOUBLE          NOT NULL,
  peak_value     DOUBLE          NOT NULL,
  duration_sec   INT             NOT NULL,
  status         VARCHAR(16)     NOT NULL DEFAULT 'active',
  label          VARCHAR(200)    NULL,
  PRIMARY KEY (id),
  KEY idx_ama_status_triggered (status, triggered_at),
  KEY idx_ama_kind_metric_triggered (kind, metric, triggered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
