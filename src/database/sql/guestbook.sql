-- 방명록({{sample}}guestbook) 샘플 SQL
--   따라하기 ③ 에서 학습자가 만드는 snack.sql / supply.sql 과는 별개의 기본 예제입니다.

-- @name: findAll
SELECT id, writer, message, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
FROM {{sample}}guestbook
ORDER BY id DESC;

-- @name: findById
SELECT id, writer, message, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
FROM {{sample}}guestbook
WHERE id = :id;

-- @name: insert
INSERT INTO {{sample}}guestbook (writer, message)
VALUES (:writer, :message);

-- @name: updateName
UPDATE {{sample}}guestbook
   SET writer = :writer, message = :message
 WHERE id = :id;

-- @name: deleteById
DELETE FROM {{sample}}guestbook WHERE id = :id;
