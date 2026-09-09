-- 어드민 사용자 관리 SQL. 접근키: 'admin_user:<n>'
-- admin_users 테이블에 대한 CRUD. 인증용 SQL 은 admin_auth 에 있고, 이 파일은 "사용자 관리" 전용.

-- @name: listPaged
SELECT id, name, username, email, role, status, failed_attempts, locked_until,
       last_login_at, created_at, updated_at
  FROM admin_users
 ORDER BY id DESC
 LIMIT :limit OFFSET :offset;

-- @name: countAll
SELECT COUNT(*) AS cnt FROM admin_users;

-- @name: findById
SELECT id, name, username, email, role, status, failed_attempts, locked_until,
       last_login_at, created_at, updated_at, must_change_password, password_changed_at
  FROM admin_users
 WHERE id = :id;

-- @name: existsByUsername
SELECT COUNT(*) AS cnt FROM admin_users WHERE username = :username;

-- @name: existsByEmail
SELECT COUNT(*) AS cnt FROM admin_users WHERE email = :email;

-- @name: insertUser
--   ★ v1.11.8 must_change_password=1 — 관리자가 정해 준 비밀번호는 본인이 첫 로그인에 바꾸게 한다
INSERT INTO admin_users (name, username, email, password_hash, role, status, must_change_password)
VALUES (:name, :username, :email, :password_hash, :role, :status, :must_change_password);

-- @name: updateUser
UPDATE admin_users
   SET name = :name,
       email = :email,
       role = :role,
       status = :status,
       token_version = token_version + 1
 WHERE id = :id;

-- @name: updatePasswordForceChange
--   ★ v1.11.8 관리자가 남의 비밀번호를 정해 준 경우 — 본인이 로그인해서 한 번 바꾸게 한다
UPDATE admin_users
   SET password_hash = :password_hash,
       failed_attempts = 0,
       locked_until = NULL,
       must_change_password = 1,
       password_changed_at = NOW(),
       token_version = token_version + 1
 WHERE id = :id;

-- @name: updatePassword
UPDATE admin_users
   SET password_hash = :password_hash,
       failed_attempts = 0,
       locked_until = NULL,
       must_change_password = 0,
       password_changed_at = NOW(),
       token_version = token_version + 1
 WHERE id = :id;

-- @name: deleteById
DELETE FROM admin_users WHERE id = :id;

-- @name: unlockUser
UPDATE admin_users
   SET failed_attempts = 0,
       locked_until = NULL
 WHERE id = :id;

-- @name: findForPasswordCheck
SELECT id, password_hash
  FROM admin_users
 WHERE id = :id;
