-- 어드민 SQL 파일 메타 SQL. 접근키: 'admin_sql:<n>'

-- @name: countSqls
SELECT COUNT(*) AS cnt
  FROM admin_sqls
 WHERE status = 'active';

-- @name: listSqlsPaged
SELECT id, name, table_name, description, file_path,
       created_at, updated_at
  FROM admin_sqls
 WHERE status = 'active'
 ORDER BY id DESC
 LIMIT :limit OFFSET :offset;

-- @name: listAllSqlNames
SELECT id, name, table_name, description
  FROM admin_sqls
 WHERE status = 'active'
 ORDER BY name ASC;

-- @name: findSqlById
SELECT id, name, table_name, description, content, file_path, status,
       created_at, updated_at
  FROM admin_sqls
 WHERE id = :id;

-- @name: findSqlByName
SELECT id, name
  FROM admin_sqls
 WHERE name = :name
   AND status = 'active';

-- @name: insertSql
INSERT INTO admin_sqls (name, table_name, description, content, file_path)
VALUES (:name, :table_name, :description, :content, :file_path);

-- @name: updateSql
UPDATE admin_sqls
   SET name = :name,
       table_name = :table_name,
       description = :description,
       content = :content,
       file_path = :file_path
 WHERE id = :id;

-- @name: softDeleteSql
UPDATE admin_sqls
   SET status = 'deleted'
 WHERE id = :id;
