-- 013_user_sessions_idx.sql
-- ★ v1.18.1 — 무활동 청소와 활동 갱신이 인덱스를 타게 한다.
--   열린 세션 5만 건에서 재 보니 조건에 COALESCE 를 쓰면 10.02ms(전체 스캔),
--   last_seen_at 을 그대로 비교하면 1.12ms 였다.
--   활동 갱신(touch)은 user_id 로 찾으므로 그쪽 인덱스도 함께 만든다.
CREATE INDEX idx_user_sessions_touch ON user_sessions (user_id, ended_at);
CREATE INDEX idx_user_sessions_hint ON user_sessions (ended_at, leave_hint_at);
