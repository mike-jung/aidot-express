-- @migration-options: non-blocking
--   샘플 데이터 파일입니다. 이 파일이 실패해도 뒤따르는 마이그레이션(users.name,
--   화면 프로젝트, admin 비밀번호 정책 등)은 계속 실행됩니다 — 샘플 하나 때문에
--   로그인/콘솔이 깨지지 않도록. 실패한 파일은 기록되지 않으므로 원인을 고치고
--   서버를 다시 시작하면 자동으로 재시도합니다.
-- v1.3.0: 방명록({{sample}}guestbook) 샘플 테이블 — SQLite 변형
CREATE TABLE IF NOT EXISTS {{sample}}guestbook (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  writer     TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_guestbook_created ON {{sample}}guestbook (created_at);

INSERT INTO {{sample}}guestbook (writer, message)
SELECT '아이닷', '방명록 예제입니다. 마음껏 눌러 보세요!' WHERE NOT EXISTS (SELECT 1 FROM {{sample}}guestbook);
INSERT INTO {{sample}}guestbook (writer, message)
SELECT '홍길동', '첫 번째 방문 기념!' WHERE (SELECT COUNT(*) FROM {{sample}}guestbook) < 2;
