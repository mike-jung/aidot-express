-- 어드민 인증 관련 SQL. 접근키: 'admin_auth:<n>'
-- 일반 인증과 같은 패턴이지만 admin_users / admin_refresh_tokens 사용

-- @name: findUserByUsername
SELECT id, name, username, email, password_hash, role, status, failed_attempts, locked_until,
       must_change_password
  FROM admin_users
 WHERE username = :username;

-- @name: findUserById
SELECT id, name, username, email, role, status, created_at, last_login_at, must_change_password
  FROM admin_users
 WHERE id = :id;

-- @name: insertUser
INSERT INTO admin_users (name, username, email, password_hash, role)
VALUES (:name, :username, :email, :password_hash, :role);

-- @name: incrementFailedAttempts
UPDATE admin_users
   SET failed_attempts = failed_attempts + 1,
       locked_until = CASE
         WHEN failed_attempts + 1 >= :max_attempts
         THEN DATE_ADD(NOW(), INTERVAL :lock_minutes MINUTE)
         ELSE locked_until
       END
 WHERE id = :id;

-- @name: resetFailedAttempts
UPDATE admin_users
   SET failed_attempts = 0,
       locked_until = NULL,
       last_login_at = NOW()
 WHERE id = :id;

-- @name: insertRefreshToken
INSERT INTO admin_refresh_tokens
  (user_id, token_hash, family_id, user_agent, ip_address, expires_at)
VALUES
  (:user_id, :token_hash, :family_id, :user_agent, :ip_address, :expires_at);

-- @name: findRefreshToken
SELECT id, user_id, token_hash, family_id, expires_at, revoked_at, replaced_by_id
  FROM admin_refresh_tokens
 WHERE token_hash = :token_hash;

-- @name: revokeRefreshToken
UPDATE admin_refresh_tokens
   SET revoked_at = NOW(),
       replaced_by_id = :replaced_by_id
 WHERE id = :id;

-- @name: revokeTokenFamily
UPDATE admin_refresh_tokens
   SET revoked_at = NOW()
 WHERE family_id = :family_id
   AND revoked_at IS NULL;

-- @name: revokeAllUserTokens
UPDATE admin_refresh_tokens
   SET revoked_at = NOW()
 WHERE user_id = :user_id
   AND revoked_at IS NULL;

-- @name: countActiveAdmins
SELECT COUNT(*) AS cnt FROM admin_users WHERE role = 'admin' AND status = 'active';

-- @name: countAll
SELECT COUNT(*) AS cnt FROM admin_users;

-- @name: insertBootstrapAdmin
INSERT INTO admin_users (name, username, email, password_hash, role, status, must_change_password)
VALUES (:name, :username, :email, :password_hash, 'admin', 'active', :must_change_password);

-- @name: resetToDefaultPassword
-- v1.7.4: v1.1.x 가 SQL 로 고정 시드하던 'admin123' 계정을 문서상 기본값으로 정렬할 때 사용.
--   must_change_password 를 1 로 세워 콘솔이 계속 변경을 안내하게 둔다.
UPDATE admin_users
   SET password_hash = :password_hash,
       failed_attempts = 0,
       locked_until = NULL,
       must_change_password = 1,
       password_changed_at = NOW()
 WHERE id = :id;
