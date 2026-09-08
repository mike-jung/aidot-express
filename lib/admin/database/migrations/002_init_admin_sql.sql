-- ============================================================
-- 어드민 도구 - SQL 파일 메타 테이블
-- 실행: mysql -u root -p <DB> < lib/admin/database/migrations/002_init_admin_sql.sql
-- ============================================================

-- admin_sqls: 어드민 도구로 만든 SQL 파일 메타
CREATE TABLE IF NOT EXISTS admin_sqls (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(100)    NOT NULL COMMENT 'SQL 파일명. 예: product → product.sql',
  table_name   VARCHAR(100)    NULL COMMENT '대상 테이블명 (자동생성 시 사용)',
  description  VARCHAR(500)    NULL,
  content      MEDIUMTEXT      NOT NULL COMMENT 'SQL 파일 전체 내용',
  file_path    VARCHAR(500)    NOT NULL COMMENT '저장된 파일 경로 (프로젝트 루트 기준)',
  status       VARCHAR(20)     NOT NULL DEFAULT 'active',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_sqls_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
