-- 모니터링 관련 테이블 (SQLite)
-- DATETIME(3) 을 별도 표현하지 않음 — SQLite 의 TEXT 에 ISO-8601 millis 문자열을 그대로 저장.

CREATE TABLE IF NOT EXISTS admin_metric_samples (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  ts     TEXT    NOT NULL,
  kind   TEXT    NOT NULL,
  metric TEXT    NOT NULL,
  value  REAL    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ams_ts_kind           ON admin_metric_samples(ts, kind);
CREATE INDEX IF NOT EXISTS idx_ams_kind_metric_ts    ON admin_metric_samples(kind, metric, ts);

CREATE TABLE IF NOT EXISTS admin_metric_thresholds (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT    NOT NULL,
  metric        TEXT    NOT NULL,
  comparator    TEXT    NOT NULL DEFAULT '>',
  threshold     REAL    NOT NULL,
  duration_sec  INTEGER NOT NULL DEFAULT 30,
  enabled       INTEGER NOT NULL DEFAULT 1,
  label         TEXT    NULL,
  created_at    TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at    TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_amt_kind_metric ON admin_metric_thresholds(kind, metric);
CREATE TRIGGER IF NOT EXISTS trg_amt_updated
AFTER UPDATE ON admin_metric_thresholds FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN UPDATE admin_metric_thresholds SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;

-- SQLite 는 INSERT IGNORE 대신 INSERT OR IGNORE 사용
INSERT OR IGNORE INTO admin_metric_thresholds (kind, metric, comparator, threshold, duration_sec, enabled, label) VALUES
  ('os',   'cpu_pct',  '>',  85,   30, 1, 'CPU 사용률 85% 초과'),
  ('os',   'mem_pct',  '>',  90,   60, 1, '메모리 사용률 90% 초과'),
  ('http', 'avg_ms',   '>',  1000, 30, 1, 'HTTP 평균 응답시간 1초 초과'),
  ('http', 'err_pct',  '>',  10,   30, 1, 'HTTP 에러율 10% 초과'),
  ('db',   'avg_ms',   '>',  500,  30, 1, 'DB 평균 쿼리시간 500ms 초과'),
  ('db',   'err_pct',  '>',  5,    30, 1, 'DB 에러율 5% 초과');

CREATE TABLE IF NOT EXISTS admin_metric_alerts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  triggered_at   TEXT    NOT NULL,
  resolved_at    TEXT    NULL,
  kind           TEXT    NOT NULL,
  metric         TEXT    NOT NULL,
  comparator     TEXT    NOT NULL,
  threshold      REAL    NOT NULL,
  peak_value     REAL    NOT NULL,
  duration_sec   INTEGER NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'active',
  label          TEXT    NULL
);
CREATE INDEX IF NOT EXISTS idx_ama_status_triggered       ON admin_metric_alerts(status, triggered_at);
CREATE INDEX IF NOT EXISTS idx_ama_kind_metric_triggered  ON admin_metric_alerts(kind, metric, triggered_at);
