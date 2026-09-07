-- 사용자 정보 SQL 정의 : src/database/sql/user.sql
-- 접근 키 형식 : '<파일명>:<쿼리명>' (ex. 'user:findById', 'user:findAll' ...)
-- 바인딩 변수 형식 : ':<변수명>' (ex. ':name' 스타일 사용)

-- @name: findById
SELECT id, name, email, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
  FROM users
 WHERE id = :id;

-- @name: findAll
SELECT id, name, username, email, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
  FROM users
 ORDER BY id DESC;

-- @name: insert
INSERT INTO users (id, name, username, email)
VALUES (:id, :name, :username, :email);

-- @name: updateName
UPDATE users
   SET name = :name
 WHERE id = :id;

-- @name: deleteById
DELETE FROM users WHERE id = :id;
