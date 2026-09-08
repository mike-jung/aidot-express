-- @migration-options: non-blocking
--   ★ v1.11.4 — SQLite 판: ts 는 TEXT 라 바꿀 것이 없다. 번호를 맞추기 위한 자리.
CREATE TABLE IF NOT EXISTS request_traces_ts_ms_marker (id INTEGER PRIMARY KEY);
DROP TABLE IF EXISTS request_traces_ts_ms_marker;
