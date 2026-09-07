-- 어드민 메타정보 SQL. 접근키: 'admin_meta:<n>'

-- @name: countControllers
SELECT COUNT(*) AS cnt
  FROM admin_controllers
 WHERE status = 'active';

-- @name: listControllersPaged
SELECT id, name, base_path, service_name, description, file_path,
       routes_json, created_at, updated_at
  FROM admin_controllers
 WHERE status = 'active'
 ORDER BY id DESC
 LIMIT :limit OFFSET :offset;

-- @name: findControllerById
SELECT id, name, base_path, service_name, description, file_path, routes_json, status,
       created_at, updated_at
  FROM admin_controllers
 WHERE id = :id;

-- @name: findControllerByName
SELECT id, name, base_path
  FROM admin_controllers
 WHERE name = :name;

-- @name: findControllerByBasePath
SELECT id, name, base_path
  FROM admin_controllers
 WHERE base_path = :base_path;

-- @name: insertController
INSERT INTO admin_controllers (name, base_path, service_name, description, routes_json, file_path)
VALUES (:name, :base_path, :service_name, :description, :routes_json, :file_path);

-- @name: updateController
UPDATE admin_controllers
   SET name = :name,
       base_path = :base_path,
       service_name = :service_name,
       description = :description,
       routes_json = :routes_json,
       file_path = :file_path
 WHERE id = :id;

-- @name: softDeleteController
UPDATE admin_controllers
   SET status = 'deleted'
 WHERE id = :id;
