-- 접속 통계용 테이블 (SQLite)

CREATE TABLE IF NOT EXISTS access_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT    NOT NULL,
  user_id      INTEGER NULL,
  username     TEXT    NULL,
  session_kind TEXT    NULL,
  method       TEXT    NOT NULL,
  path         TEXT    NOT NULL,
  route_key    TEXT    NULL,
  controller   TEXT    NULL,
  handler      TEXT    NULL,
  status       INTEGER NOT NULL DEFAULT 0,
  duration_ms  INTEGER NOT NULL DEFAULT 0,
  ip           TEXT    NULL,
  user_agent   TEXT    NULL
);
CREATE INDEX IF NOT EXISTS idx_al_ts        ON access_logs(ts);
CREATE INDEX IF NOT EXISTS idx_al_user_ts   ON access_logs(username, ts);
CREATE INDEX IF NOT EXISTS idx_al_path_ts   ON access_logs(path, ts);
CREATE INDEX IF NOT EXISTS idx_al_route_ts  ON access_logs(route_key, ts);
CREATE INDEX IF NOT EXISTS idx_al_status_ts ON access_logs(status, ts);

CREATE TABLE IF NOT EXISTS user_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  username     TEXT    NOT NULL,
  session_kind TEXT    NOT NULL DEFAULT 'user',
  started_at   TEXT    NOT NULL,
  ended_at     TEXT    NULL,
  duration_sec INTEGER NULL,
  ip           TEXT    NULL,
  user_agent   TEXT    NULL
);
CREATE INDEX IF NOT EXISTS idx_us_user_started ON user_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_us_started      ON user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_us_ended        ON user_sessions(ended_at);

CREATE TABLE IF NOT EXISTS login_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT    NOT NULL,
  user_id      INTEGER NOT NULL,
  username     TEXT    NOT NULL,
  session_kind TEXT    NOT NULL DEFAULT 'user',
  event_type   TEXT    NOT NULL,
  session_id   INTEGER NULL,
  ip           TEXT    NULL,
  user_agent   TEXT    NULL
);
CREATE INDEX IF NOT EXISTS idx_le_user_ts  ON login_events(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_le_ts       ON login_events(ts);
CREATE INDEX IF NOT EXISTS idx_le_event_ts ON login_events(event_type, ts);
