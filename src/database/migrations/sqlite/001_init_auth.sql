-- ============================================================
-- 인증 시스템 테이블 (SQLite 방언)
-- patch-07: MariaDB 방언에서 SQLite 로 번역
--   - BIGINT UNSIGNED AUTO_INCREMENT → INTEGER PRIMARY KEY AUTOINCREMENT
--   - DATETIME DEFAULT CURRENT_TIMESTAMP → TEXT DEFAULT (CURRENT_TIMESTAMP)
--   - ON UPDATE CURRENT_TIMESTAMP 는 AFTER UPDATE 트리거로 구현
--   - UNIQUE KEY / KEY 는 CREATE UNIQUE INDEX / CREATE INDEX 로 분리
--   - ENGINE/CHARSET/COLLATE 절 제거
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT    NOT NULL,
  email           TEXT    NOT NULL,
  password_hash   TEXT    NOT NULL,
  role            TEXT    NOT NULL DEFAULT 'user',
  status          TEXT    NOT NULL DEFAULT 'active',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT    NULL,
  last_login_at   TEXT    NULL,
  created_at      TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at      TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_users_username ON users(username);
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_email    ON users(email);

-- ON UPDATE CURRENT_TIMESTAMP 대응 트리거
CREATE TRIGGER IF NOT EXISTS trg_users_updated
AFTER UPDATE ON users
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ------------------------------------------------------------
-- refresh_tokens
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  token_hash      TEXT    NOT NULL,
  family_id       TEXT    NOT NULL,
  user_agent      TEXT    NULL,
  ip_address      TEXT    NULL,
  expires_at      TEXT    NOT NULL,
  revoked_at      TEXT    NULL,
  replaced_by_id  INTEGER NULL,
  created_at      TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_rt_token_hash ON refresh_tokens(token_hash);
CREATE        INDEX IF NOT EXISTS idx_rt_user      ON refresh_tokens(user_id);
CREATE        INDEX IF NOT EXISTS idx_rt_family    ON refresh_tokens(family_id);
