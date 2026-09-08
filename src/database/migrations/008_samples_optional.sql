-- 선택 샘플 — `.env` 의 DB_SAMPLES=all 일 때만 만들어집니다.
--   secure_member : 컬럼 단위 암복호화를 볼 때 쓰는 예제
-- 기본값(DB_SAMPLES=core)에서는 건너뜁니다 — 필요할 때만 켜세요.

CREATE TABLE IF NOT EXISTS {{sample}}secure_member (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name      VARCHAR(50)     NULL,
  ssn       VARCHAR(512)    NULL COMMENT '암호문',
  phone     VARCHAR(512)    NULL COMMENT '암호문',
  phone_ai  VARCHAR(64)     NULL COMMENT '검색용 색인',
  PRIMARY KEY (id),
  KEY idx_secure_member_phone_ai (phone_ai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

