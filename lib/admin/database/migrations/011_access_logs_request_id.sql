-- 011_access_logs_request_id.sql
-- ★ v1.17.0 — 접속 통계의 한 줄에서 **그 요청의 처리 과정**(서비스·SQL)으로 건너뛰려면
--   두 기록을 잇는 열쇠가 있어야 한다. 요청 번호를 함께 적어 둔다.
--   (예전 기록은 비어 있다 — 그 줄에서는 과정 보기 단추가 꺼진다)
ALTER TABLE access_logs ADD COLUMN request_id VARCHAR(64) NULL;
CREATE INDEX idx_access_logs_request_id ON access_logs (request_id);
