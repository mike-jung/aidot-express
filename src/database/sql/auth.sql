-- 인증 관련 SQL. 접근키: 'auth:<n>'
-- 테이블 스키마: aidot_server.users, aidot_server.refresh_tokens

-- @name: findUserByUsername
SELECT id, token_version, name, username, email, password_hash, role, status, failed_attempts, locked_until
  FROM users 
 WHERE username = :username;

-- @name: findUserById
SELECT id, token_version, name, username, email, role, status, created_at, last_login_at
  FROM users
 WHERE id = :id;

-- @name: insertUser
INSERT INTO users (name, username, email, password_hash, role)
VALUES (:name, :username, :email, :password_hash, :role);

-- @name: incrementFailedAttempts
UPDATE users
   SET failed_attempts = failed_attempts + 1,
       locked_until = CASE
         WHEN failed_attempts + 1 >= :max_attempts
         THEN DATE_ADD(NOW(), INTERVAL :lock_minutes MINUTE)
         ELSE locked_until
       END
 WHERE id = :id;

-- @name: resetFailedAttempts
UPDATE users
   SET failed_attempts = 0,
       locked_until = NULL,
       last_login_at = NOW()
 WHERE id = :id;

-- @name: insertRefreshToken
INSERT INTO refresh_tokens
  (user_id, token_hash, family_id, user_agent, ip_address, expires_at, token_version)
VALUES
  (:user_id, :token_hash, :family_id, :user_agent, :ip_address, :expires_at, :token_version);

-- @name: findRefreshToken
SELECT id, user_id, token_hash, family_id, expires_at, revoked_at, replaced_by_id, token_version
  FROM refresh_tokens
 WHERE token_hash = :token_hash;

-- @name: revokeRefreshToken
UPDATE refresh_tokens
   SET revoked_at = NOW(),
       replaced_by_id = :replaced_by_id
 WHERE id = :id;

-- @name: revokeTokenFamily
UPDATE refresh_tokens
   SET revoked_at = NOW()
 WHERE family_id = :family_id
   AND revoked_at IS NULL;

-- @name: revokeAllUserTokens
UPDATE refresh_tokens
   SET revoked_at = NOW()
 WHERE user_id = :user_id
   AND revoked_at IS NULL;

-- @name: cleanupExpiredTokens
DELETE FROM refresh_tokens
 WHERE expires_at < NOW()
    OR (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY));

-- @name: claimRefreshToken
UPDATE refresh_tokens SET revoked_at = NOW()
 WHERE id = :id AND revoked_at IS NULL AND expires_at > NOW();

-- @name: invalidateAccessTokens
UPDATE users SET token_version = token_version + 1 WHERE id = :user_id;
