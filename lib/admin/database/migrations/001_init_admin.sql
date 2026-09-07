-- ============================================================
-- 어드민(개발도구) 영역 테이블
-- 실행: mysql -u root -p <DB> < lib/admin/database/migrations/001_init_admin.sql
-- ============================================================

-- admin_users: 개발도구 로그인 계정 (일반 users 와 분리)
CREATE TABLE IF NOT EXISTS admin_users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(50)     NOT NULL,
  username        VARCHAR(50)     NOT NULL,
  email           VARCHAR(200)    NOT NULL,
  password_hash   VARCHAR(255)    NOT NULL,
  role            VARCHAR(30)     NOT NULL DEFAULT 'admin',
  status          VARCHAR(20)     NOT NULL DEFAULT 'active',
  failed_attempts INT UNSIGNED    NOT NULL DEFAULT 0,
  locked_until    DATETIME        NULL,
  last_login_at   DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_users_username (username),
  UNIQUE KEY uk_admin_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- admin_refresh_tokens
CREATE TABLE IF NOT EXISTS admin_refresh_tokens (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  token_hash      CHAR(64)        NOT NULL,
  family_id       CHAR(36)        NOT NULL,
  user_agent      VARCHAR(255)    NULL,
  ip_address      VARCHAR(45)     NULL,
  expires_at      DATETIME        NOT NULL,
  revoked_at      DATETIME        NULL,
  replaced_by_id  BIGINT UNSIGNED NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_art_token_hash (token_hash),
  KEY idx_art_user (user_id),
  KEY idx_art_family (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- admin_controllers: 개발도구로 만든 컨트롤러의 메타 정보
CREATE TABLE IF NOT EXISTS admin_controllers (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(100)    NOT NULL COMMENT '클래스명. 예: ProductController',
  base_path    VARCHAR(200)    NOT NULL COMMENT '기본 요청경로. 예: /api/products',
  description  VARCHAR(500)    NULL,
  routes_json  TEXT            NOT NULL COMMENT '라우팅 함수 정의 배열의 JSON',
  file_path    VARCHAR(500)    NOT NULL COMMENT '저장된 파일 경로 (프로젝트 루트 기준)',
  status       VARCHAR(20)     NOT NULL DEFAULT 'active',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_ctrl_name (name),
  UNIQUE KEY uk_admin_ctrl_base_path (base_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
