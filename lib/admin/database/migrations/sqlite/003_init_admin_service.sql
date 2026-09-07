-- admin_services (SQLite)
CREATE TABLE IF NOT EXISTS admin_services (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  sql_file      TEXT NULL,
  description   TEXT NULL,
  methods_json  TEXT NULL,
  file_path     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_admin_services_name ON admin_services(name);
CREATE TRIGGER IF NOT EXISTS trg_admin_services_updated
AFTER UPDATE ON admin_services FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN UPDATE admin_services SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;
