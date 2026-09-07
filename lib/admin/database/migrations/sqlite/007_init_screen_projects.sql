-- admin_screen_projects (SQLite)
-- 화면 디자이너 프로젝트 테이블. 각 설정은 TEXT(JSON) 으로 저장.
CREATE TABLE IF NOT EXISTS admin_screen_projects (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  description  TEXT NULL,
  config_json  TEXT NOT NULL,   -- { apiBaseUrl, cssFramework, theme }
  layout_json  TEXT NOT NULL,   -- { kind, title, sidebar, mainArea }
  screens_json TEXT NOT NULL,   -- ScreenSpec[]
  vars_json    TEXT NOT NULL,   -- 사용자 정의 변수
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS idx_admin_screen_projects_status  ON admin_screen_projects(status);
CREATE INDEX IF NOT EXISTS idx_admin_screen_projects_updated ON admin_screen_projects(updated_at);

-- updated_at 자동 갱신 (MySQL 의 ON UPDATE CURRENT_TIMESTAMP 대응)
CREATE TRIGGER IF NOT EXISTS trg_admin_screen_projects_updated
AFTER UPDATE ON admin_screen_projects FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN UPDATE admin_screen_projects SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id; END;
