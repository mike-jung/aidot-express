-- 책장 관리를 위한 SQL
-- @name: findAll
SELECT id, title, author, price, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at 
FROM {{sample}}book 
ORDER BY id DESC;

-- @name: findById
SELECT id, title, author, price, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at 
FROM {{sample}}book
WHERE id = :id;

-- @name: insert
INSERT INTO {{sample}}book (title, author, price)
VALUES (:title, :author, :price);

-- @name: updateName
UPDATE {{sample}}book
   SET title = :title, author = :author, price = :price
 WHERE id = :id;

-- @name: deleteById
DELETE FROM {{sample}}book WHERE id = :id;
