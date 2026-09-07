-- 011_access_logs_request_id.sql (sqlite)
-- ★ v1.17.0 — 접속 기록에서 그 요청의 처리 과정으로 건너뛰기 위한 열쇠.
--   MariaDB 쪽 011 과 짝이다.
ALTER TABLE access_logs ADD COLUMN request_id TEXT;
CREATE INDEX IF NOT EXISTS idx_access_logs_request_id ON access_logs (request_id);
