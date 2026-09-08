-- ============================================================
-- admin 영역 테이블 (SQLite 방언 — patch-07)
-- ============================================================

-- admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  username        TEXT    NOT NULL,
  email           TEXT    NOT NULL,
  password_hash   TEXT    NOT NULL,
  role            TEXT    NOT NULL DEFAULT 'admin',
  status          TEXT    NOT NULL DEFAULT 'active',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT    NULL,
  last_login_at   TEXT    NULL,
  created_at      TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at      TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_admin_users_username ON admin_users(username);
CREATE UNIQUE INDEX IF NOT EXISTS uk_admin_users_email    ON admin_users(email);
CREATE TRIGGER IF NOT EXISTS trg_admin_users_updated
AFTER UPDATE ON admin_users FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN UPDATE admin_users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;

-- admin_refresh_tokens
CREATE TABLE IF NOT EXISTS admin_refresh_tokens (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  token_hash      TEXT    NOT NULL,
  family_id       TEXT    NOT NULL,
  user_agent      TEXT    NULL,
  ip_address      TEXT    NULL,
  expires_at      TEXT    NOT NULL,
  revoked_at      TEXT    NULL,
  replaced_by_id  INTEGER NULL,
  created_at      TEXT    NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_art_token_hash ON admin_refresh_tokens(token_hash);
CREATE        INDEX IF NOT EXISTS idx_art_user      ON admin_refresh_tokens(user_id);
CREATE        INDEX IF NOT EXISTS idx_art_family    ON admin_refresh_tokens(family_id);

-- admin_controllers — service_name 컬럼을 여기서 바로 포함 (기존 004 는 sqlite 에선 불필요)
CREATE TABLE IF NOT EXISTS admin_controllers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  base_path    TEXT NOT NULL,
  service_name TEXT NULL,
  description  TEXT NULL,
  routes_json  TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_admin_ctrl_name      ON admin_controllers(name);
CREATE UNIQUE INDEX IF NOT EXISTS uk_admin_ctrl_base_path ON admin_controllers(base_path);
CREATE TRIGGER IF NOT EXISTS trg_admin_ctrl_updated
AFTER UPDATE ON admin_controllers FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN UPDATE admin_controllers SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;
