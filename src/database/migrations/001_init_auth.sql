-- ============================================================
-- 인증 시스템 테이블 (MariaDB 10.5+ / MySQL 8.0+)
--
-- 사용 전 DB 접속 후 실행:
--   mysql -u root -p < src/database/migrations/001_init_auth.sql
-- 또는 MySQL Workbench / DBeaver 등에서 실행.
-- ============================================================

-- ------------------------------------------------------------
-- users: 사용자 계정
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)     NOT NULL,
  email         VARCHAR(200)    NOT NULL,
  -- argon2id 해시는 최대 ~128자. 여유롭게 255.
  password_hash VARCHAR(255)    NOT NULL,
  -- 역할: 'user' | 'admin' 등. 쉼표구분 문자열도 가능하지만 단일 역할 권장.
  role          VARCHAR(30)     NOT NULL DEFAULT 'user',
  -- 계정 상태: active / locked / disabled
  status        VARCHAR(20)     NOT NULL DEFAULT 'active',
  -- 로그인 실패 횟수 (brute force 방어용)
  failed_attempts INT UNSIGNED  NOT NULL DEFAULT 0,
  locked_until  DATETIME        NULL,
  last_login_at DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- refresh_tokens: 리프레시 토큰 저장소
--
--  - token_hash: SHA-256(raw_token) 을 저장. raw 토큰은 절대 저장하지 않음.
--  - family_id: 토큰 계열. 같은 로그인 세션에서 회전된 모든 토큰은 같은 family.
--               reuse 가 감지되면 같은 family_id 의 모든 토큰을 revoke.
--  - replaced_by_id: rotation 시 새 토큰의 id. 감사(audit) 용.
--  - revoked_at: 폐기 시점. NULL 이면 유효.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  token_hash      CHAR(64)        NOT NULL,  -- SHA-256 hex
  family_id       CHAR(36)        NOT NULL,  -- UUID
  user_agent      VARCHAR(255)    NULL,
  ip_address      VARCHAR(45)     NULL,      -- IPv6 대비
  expires_at      DATETIME        NOT NULL,
  revoked_at      DATETIME        NULL,
  replaced_by_id  BIGINT UNSIGNED NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_rt_token_hash (token_hash),
  KEY idx_rt_user (user_id),
  KEY idx_rt_family (family_id),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- (선택) 테스트용 기본 계정. 운영에서는 삭제.
-- password: "admin1234" (argon2id) → 앱 첫 기동 시 seed 스크립트로 생성 권장
-- ------------------------------------------------------------
-- INSERT INTO users (username, email, password_hash, role)
-- VALUES ('admin', 'admin@example.com', '$argon2id$...', 'admin');
