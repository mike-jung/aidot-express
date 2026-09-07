-- v1.2.0: 관리자 계정 비밀번호 정책 컬럼 (SQLite 변형)
ALTER TABLE admin_users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN password_changed_at TEXT NULL;
