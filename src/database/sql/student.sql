-- 학생 샘플 정보 SQL 정의 2 : src/database/sql/student.sql
-- @name: findById
SELECT id, name, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
  FROM {{sample}}students
 WHERE id = :id;

-- @name: findAll
SELECT id, name, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
  FROM {{sample}}students
 ORDER BY id DESC;

-- @name: insert
INSERT INTO {{sample}}students (id, name)
VALUES (:id, :name);

-- @name: updateName
UPDATE {{sample}}students
   SET name = :name
 WHERE id = :id;

-- @name: deleteById
DELETE FROM {{sample}}students WHERE id = :id;
