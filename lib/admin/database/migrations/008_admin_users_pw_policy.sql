-- @migration-options: ignore-already-applied
-- ============================================================
-- v1.2.0: 관리자 계정 비밀번호 정책 컬럼
--   must_change_password : 1 이면 기본(초기) 비밀번호 사용 중 — 콘솔이 변경을 안내
--   password_changed_at  : 마지막 변경 시각 (감사용)
--
-- ⚠ v1.7.2 수정: 이전에는 `ADD COLUMN IF NOT EXISTS` 를 썼는데 이는 **MariaDB 전용 문법**이다.
--   MySQL(8.x 포함)이나 오래된 서버에서는 문법 오류(1064)가 나서 이 파일이 실패하고,
--   그 결과 admin_users 에 컬럼이 없는 채로 서버가 떠서 **로그인이 500 으로 실패**했다.
--   → 표준 문법으로 바꾸고, 이미 컬럼이 있는 경우(1060 ER_DUP_FIELDNAME)는
--     헤더 옵션 ignore-already-applied 로 무시한다. (MySQL·MariaDB 양쪽에서 안전)
-- ============================================================
ALTER TABLE admin_users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN password_changed_at DATETIME NULL;
