-- @migration-options: non-blocking
--   샘플 데이터 파일입니다. 이 파일이 실패해도 뒤따르는 마이그레이션(users.name,
--   화면 프로젝트, admin 비밀번호 정책 등)은 계속 실행됩니다 — 샘플 하나 때문에
--   로그인/콘솔이 깨지지 않도록. 실패한 파일은 기록되지 않으므로 원인을 고치고
--   서버를 다시 시작하면 자동으로 재시도합니다.
-- ============================================================
-- Book 샘플 테이블 (MariaDB). src/controller/BookController.js / src/service/BookService.js 가 사용.
--   v1.1.x 까지는 sqlite/ 폴더에만 있어 MariaDB(기본 DB)에서 GET /api/books 가 "Table doesn't exist" 였음.
-- ============================================================
CREATE TABLE IF NOT EXISTS {{sample}}book (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title      VARCHAR(200)    NOT NULL,
  author     VARCHAR(512)    NULL COMMENT '컬럼 암호화 정책 적용 시 암호문 저장 → 넉넉히',
  author_ai  VARCHAR(64)     NULL COMMENT '검색 색인 (aidot-securedb)',
  price      INT             NOT NULL DEFAULT 0,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_book_author_ai (author_ai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO {{sample}}book (title, author, price)
SELECT * FROM (SELECT '어린왕자', '생텍쥐페리', 12000) AS s
 WHERE NOT EXISTS (SELECT 1 FROM {{sample}}book WHERE title = '어린왕자');
INSERT INTO {{sample}}book (title, author, price)
SELECT * FROM (SELECT '데미안', '헤르만 헤세', 14000) AS s
 WHERE NOT EXISTS (SELECT 1 FROM {{sample}}book WHERE title = '데미안');
INSERT INTO {{sample}}book (title, author, price)
SELECT * FROM (SELECT '해리포터 1권', 'J.K. 롤링', 18000) AS s
 WHERE NOT EXISTS (SELECT 1 FROM {{sample}}book WHERE title = '해리포터 1권');
