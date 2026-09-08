-- ============================================================
-- 어드민 도구 - Service 클래스 메타 테이블
-- 실행: mysql -u root -p <DB> < lib/admin/database/migrations/003_init_admin_service.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_services (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL COMMENT '클래스명. 예: ProductService',
  sql_file      VARCHAR(100)    NULL COMMENT '주입받을 SQL 파일명 (예: product)',
  description   VARCHAR(500)    NULL,
  methods_json  TEXT            NULL COMMENT '메서드 목록 JSON (예: ["list","create"])',
  file_path     VARCHAR(500)    NOT NULL COMMENT '저장 파일 경로',
  status        VARCHAR(20)     NOT NULL DEFAULT 'active',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_services_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
