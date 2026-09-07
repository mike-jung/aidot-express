-- 013_user_sessions_idx.sql (sqlite)
CREATE INDEX IF NOT EXISTS idx_user_sessions_touch ON user_sessions (user_id, ended_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_hint ON user_sessions (ended_at, leave_hint_at);
