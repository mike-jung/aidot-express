-- admin_sqls (SQLite)
CREATE TABLE IF NOT EXISTS admin_sqls (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  table_name   TEXT NULL,
  description  TEXT NULL,
  content      TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_admin_sqls_name ON admin_sqls(name);
CREATE TRIGGER IF NOT EXISTS trg_admin_sqls_updated
AFTER UPDATE ON admin_sqls FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN UPDATE admin_sqls SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;
