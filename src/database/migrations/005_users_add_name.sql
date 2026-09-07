-- @migration-options: ignore-already-applied
-- v1.2.0: users.name 컬럼 — auth.sql(insertUser/findUserById) 와 user.sql 이 name 을 사용하지만
--   001/002 마이그레이션에는 컬럼이 없어 회원가입(POST /api/auth/signup)이 항상 실패했음.
--
-- ⚠ v1.7.2: `ADD COLUMN IF NOT EXISTS` (MariaDB 전용) → 표준 문법 + ignore-already-applied 로 교체.
ALTER TABLE users ADD COLUMN name VARCHAR(50) NULL AFTER id;
