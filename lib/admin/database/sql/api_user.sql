-- api_user.sql
-- 연동 업체 계정 관리 (관리 콘솔 전용)
--
--  대상은 users 테이블에서 role='vendor' 인 행이다.
--  관리자 콘솔 계정(admin_users)과는 테이블부터 분리되어 있고,
--  realm 이 달라 서로의 API 를 호출할 수 없다.

-- @name: countVendors
SELECT COUNT(*) AS total
  FROM users
 WHERE role = 'vendor';

-- @name: listVendorsPaged
SELECT id, name, username, email, role, status,
       failed_attempts, locked_until, last_login_at, created_at
  FROM users
 WHERE role = 'vendor'
 ORDER BY id DESC
 LIMIT :limit OFFSET :offset;

-- @name: findVendorById
SELECT id, name, username, email, role, status,
       failed_attempts, locked_until, last_login_at, created_at
  FROM users
 WHERE id = :id
   AND role = 'vendor';

-- @name: findByUsername
SELECT id, role FROM users WHERE username = :username;

-- @name: insertVendor
INSERT INTO users (name, username, email, password_hash, role, status)
VALUES (:name, :username, :email, :password_hash, 'vendor', :status);

-- @name: updateVendor
UPDATE users
   SET name = :name, email = :email, status = :status
 WHERE id = :id
   AND role = 'vendor';

-- @name: updateVendorPassword
UPDATE users
   SET password_hash = :password_hash, failed_attempts = 0, locked_until = NULL
 WHERE id = :id
   AND role = 'vendor';

-- @name: unlockVendor
UPDATE users
   SET failed_attempts = 0, locked_until = NULL
 WHERE id = :id
   AND role = 'vendor';

-- @name: deleteVendor
DELETE FROM users
 WHERE id = :id
   AND role = 'vendor';

-- ------------------------------------------------------------
-- 기관 권한
-- ------------------------------------------------------------

-- @name: listGrants
SELECT user_id AS userId, org_id AS orgId
  FROM eicu_org_grant
 ORDER BY user_id, org_id;

-- @name: listGrantsForUser
SELECT org_id AS orgId
  FROM eicu_org_grant
 WHERE user_id = :userId
 ORDER BY org_id;

-- @name: insertGrant
INSERT INTO eicu_org_grant (user_id, org_id)
VALUES (:userId, :orgId);

-- @name: deleteGrant
DELETE FROM eicu_org_grant
 WHERE user_id = :userId
   AND org_id = :orgId;

-- @name: deleteGrantsForUser
DELETE FROM eicu_org_grant
 WHERE user_id = :userId;

-- ------------------------------------------------------------
-- 토큰 폐기
--  계정을 정지하거나 비밀번호를 재설정하면 이미 나간 토큰도 끊어야 한다.
-- ------------------------------------------------------------

-- @name: revokeAllTokens
UPDATE refresh_tokens
   SET revoked_at = NOW()
 WHERE user_id = :userId
   AND revoked_at IS NULL;

-- @name: countActiveTokens
SELECT COUNT(*) AS active
  FROM refresh_tokens
 WHERE user_id = :userId
   AND revoked_at IS NULL
   AND expires_at > NOW();
