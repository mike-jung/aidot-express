-- @migration-options: non-blocking
--   요청 추적 저장소 (v1.8.0) — SQLite 판
CREATE TABLE IF NOT EXISTS request_traces (
  request_id  TEXT PRIMARY KEY,
  trace_id    TEXT NOT NULL,
  ts          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  method      TEXT NOT NULL,
  path        TEXT NOT NULL,
  route       TEXT,
  status      INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  user_id     TEXT,
  username    TEXT,
  user_kind   TEXT,
  ip          TEXT,
  user_agent  TEXT,
  step_count  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_request_traces_ts     ON request_traces (ts);
CREATE INDEX IF NOT EXISTS idx_request_traces_user   ON request_traces (username, ts);
CREATE INDEX IF NOT EXISTS idx_request_traces_status ON request_traces (status, ts);
CREATE INDEX IF NOT EXISTS idx_request_traces_trace  ON request_traces (trace_id);

CREATE TABLE IF NOT EXISTS request_steps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  seq        INTEGER NOT NULL,
  at_ms      INTEGER NOT NULL DEFAULT 0,
  kind       TEXT NOT NULL,
  name       TEXT NOT NULL,
  ms         INTEGER,
  ok         INTEGER NOT NULL DEFAULT 1,
  rows_count INTEGER,
  detail     TEXT
);
CREATE INDEX IF NOT EXISTS idx_request_steps_req ON request_steps (request_id, seq);
