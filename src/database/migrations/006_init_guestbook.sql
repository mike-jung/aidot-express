-- @migration-options: non-blocking
--   샘플 데이터 파일입니다. 이 파일이 실패해도 뒤따르는 마이그레이션(users.name,
--   화면 프로젝트, admin 비밀번호 정책 등)은 계속 실행됩니다 — 샘플 하나 때문에
--   로그인/콘솔이 깨지지 않도록. 실패한 파일은 기록되지 않으므로 원인을 고치고
--   서버를 다시 시작하면 자동으로 재시도합니다.
-- ============================================================
-- v1.3.0: 방명록({{sample}}guestbook) 샘플 테이블 — MariaDB
--   설치 직후 바로 눌러 볼 수 있는 기본 예제입니다.
--   실습 문서(따라하기 ③)에서 학습자가 직접 만드는 snack / supply 와 이름이 겹치지 않습니다.
-- ============================================================
CREATE TABLE IF NOT EXISTS {{sample}}guestbook (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  writer     VARCHAR(30)     NOT NULL COMMENT '이름',
  message    VARCHAR(200)    NOT NULL COMMENT '남긴 한마디',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_guestbook_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO {{sample}}guestbook (writer, message)
SELECT * FROM (SELECT '아이닷', '방명록 예제입니다. 마음껏 눌러 보세요!') AS s
 WHERE NOT EXISTS (SELECT 1 FROM {{sample}}guestbook);
INSERT INTO {{sample}}guestbook (writer, message)
SELECT * FROM (SELECT '홍길동', '첫 번째 방문 기념!') AS s
 WHERE (SELECT COUNT(*) FROM {{sample}}guestbook) < 2;
