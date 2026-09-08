-- 핵심 샘플 — 튜토리얼이 실제로 쓰는 것. 항상 만들어집니다.
--   students : 페이지네이션(executeList) 예제 — 튜토리얼 11단계
--   (book · guestbook 은 003 · 006 에서 따로 만듭니다)

CREATE TABLE IF NOT EXISTS {{sample}}students (
  id         BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(100)    NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO {{sample}}students (id, name) SELECT * FROM (SELECT 1, '학생1') AS s WHERE NOT EXISTS (SELECT 1 FROM {{sample}}students WHERE id = 1);
INSERT INTO {{sample}}students (id, name) SELECT * FROM (SELECT 2, '학생2') AS s WHERE NOT EXISTS (SELECT 1 FROM {{sample}}students WHERE id = 2);

