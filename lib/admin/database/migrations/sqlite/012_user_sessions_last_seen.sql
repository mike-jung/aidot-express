-- 012_user_sessions_last_seen.sql
-- ★ v1.18.0 — 세션이 "언제 끝났는지" 를 알 수 있게 한다.
--
--   브라우저를 그냥 닫으면 서버는 알 방법이 없다. 그래서 세 겹으로 다룬다.
--     ① last_seen_at   요청이 올 때마다 갱신 — "언제까지 쓰고 있었나"
--     ② leave_hint_at  화면이 숨겨질 때 브라우저가 보내는 힌트 (신뢰하지 않고 참고만)
--     ③ end_reason     어떻게 끝났는지 (logout · logout_all · idle · closed · expired)
--   무활동 청소는 ended_at 을 **마지막 활동 시각**으로 잡는다 —
--   지금 시각으로 잡으면 아무도 안 쓴 시간까지 체류시간에 들어간다.
ALTER TABLE user_sessions ADD COLUMN last_seen_at TEXT;
ALTER TABLE user_sessions ADD COLUMN leave_hint_at TEXT;
ALTER TABLE user_sessions ADD COLUMN end_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_user_sessions_open ON user_sessions (ended_at, last_seen_at);
