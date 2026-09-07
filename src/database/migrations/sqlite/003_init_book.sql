-- @migration-options: non-blocking
--   샘플 데이터 파일입니다. 이 파일이 실패해도 뒤따르는 마이그레이션(users.name,
--   화면 프로젝트, admin 비밀번호 정책 등)은 계속 실행됩니다 — 샘플 하나 때문에
--   로그인/콘솔이 깨지지 않도록. 실패한 파일은 기록되지 않으므로 원인을 고치고
--   서버를 다시 시작하면 자동으로 재시도합니다.
-- patch-16: Book 샘플용 테이블 (SQLite).
-- aidot-express 가 ship 하는 src/controller/BookController.js, src/service/BookService.js 가
-- 이 테이블을 사용. 마이그레이션이 없어 GET /api/books 가 "no such table" 로 실패하던 문제 수정.
CREATE TABLE IF NOT EXISTS {{sample}}book (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  author     TEXT,
  price      INTEGER DEFAULT 0,
  created_at TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
);

-- 데모용 시드 데이터 (튜토리얼에서 즉시 GET 으로 결과를 볼 수 있도록)
INSERT INTO {{sample}}book (title, author, price) VALUES ('어린왕자',     '생텍쥐페리', 12000);
INSERT INTO {{sample}}book (title, author, price) VALUES ('데미안',       '헤르만 헤세', 14000);
INSERT INTO {{sample}}book (title, author, price) VALUES ('해리포터 1권', 'J.K. 롤링',   18000);
