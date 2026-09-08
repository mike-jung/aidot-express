-- @migration-options: ignore-already-applied
-- =====================================================================
-- users 테이블 마이그레이션
--
--   변경 내용:
--     1) password 컬럼 제거 (평문 비밀번호 컬럼 제거. password_hash 만 사용)
--     2) UNIQUE INDEX 수정 (uk_users_username 이 실제로는 name 컬럼에 걸려있던
--        버그 수정 — username 컬럼에 UNIQUE 를 거는 것이 맞음)
--
--   헤더 옵션 ignore-already-applied:
--     이 파일 안의 각 문장은 idempotent 하지 않지만 (DROP/ADD)
--     migrationRunner 가 "이미 원하는 상태" 관련 에러코드
--     (1060 Duplicate column, 1061 Duplicate index, 1091 Can't drop — 없음)
--     를 만나면 자동으로 넘기도록 지정.
--     → 신규 환경 / 기존 환경 모두에서 안전하게 통과.
-- =====================================================================

-- 1) password 컬럼 제거 (이미 없으면 1091 에러 → 헤더 옵션에 의해 무시)
ALTER TABLE users DROP COLUMN password;

-- 2) uk_users_username 인덱스 제거 (없으면 1091 무시)
ALTER TABLE users DROP INDEX uk_users_username;

-- 3) username 컬럼에 UNIQUE 재생성 (이미 있으면 1061 무시)
ALTER TABLE users ADD UNIQUE INDEX uk_users_username (username);


-- =====================================================================
-- refresh_tokens 테이블 (없으면 생성 — IF NOT EXISTS 로 완전 idempotent)
-- =====================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
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
  UNIQUE KEY uk_rt_token_hash (token_hash),
  KEY idx_rt_user (user_id),
  KEY idx_rt_family (family_id),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
