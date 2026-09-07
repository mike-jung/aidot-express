-- 어드민 Service 메타 SQL. 접근키: 'admin_service:<n>'

-- @name: countServices
SELECT COUNT(*) AS cnt
  FROM admin_services
 WHERE status = 'active';

-- @name: listServicesPaged
SELECT id, name, sql_file, description, methods_json, file_path,
       created_at, updated_at
  FROM admin_services
 WHERE status = 'active'
 ORDER BY id DESC
 LIMIT :limit OFFSET :offset;

-- @name: listAllServiceNames
SELECT id, name, sql_file, description
  FROM admin_services
 WHERE status = 'active'
 ORDER BY name ASC;

-- @name: findServiceById
SELECT id, name, sql_file, description, methods_json, file_path, status,
       created_at, updated_at
  FROM admin_services
 WHERE id = :id;

-- @name: findServiceByName
SELECT id, name
  FROM admin_services
 WHERE name = :name
   AND status = 'active';

-- @name: insertService
INSERT INTO admin_services (name, sql_file, description, methods_json, file_path)
VALUES (:name, :sql_file, :description, :methods_json, :file_path);

-- @name: updateService
UPDATE admin_services
   SET name = :name,
       sql_file = :sql_file,
       description = :description,
       methods_json = :methods_json,
       file_path = :file_path
 WHERE id = :id;

-- @name: softDeleteService
UPDATE admin_services
   SET status = 'deleted'
 WHERE id = :id;
