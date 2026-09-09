import { createRefreshToken, signAccessToken } from './tokens.js';
import config from '../config/index.js';

/** Retry only database conflicts whose operation is known to have rolled back. */
export async function retryRefreshConflict(operation) {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); } catch (error) {
      if (![1205, 1213].includes(Number(error.errno)) || attempt >= 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt + Math.floor(Math.random() * 10)));
    }
  }
}

export function revokeRefreshFamily(db, sql, familyId) {
  return retryRefreshConflict(() => db.execute(sql.get('revokeTokenFamily'), { family_id: familyId }));
}

/** A conditional UPDATE claims a token before issuing its successor. */
export async function rotateToken(db, sql, previous, user, meta, realm) {
  const result = await retryRefreshConflict(() => db.transaction(async (tx) => {
    const claim = await tx.execute(sql.get('claimRefreshToken'), { id: previous.id });
    if (Number(claim.rowsAffected) !== 1) {
      // Return instead of throwing: the family revocation must COMMIT.
      await tx.execute(sql.get('revokeTokenFamily'), { family_id: previous.family_id });
      return null;
    }
    const next = createRefreshToken();
    const inserted = await tx.execute(sql.get('insertRefreshToken'), {
      user_id: user.id, token_version: Number(user.token_version ?? 0), token_hash: next.tokenHash, family_id: previous.family_id,
      user_agent: meta.userAgent ?? null, ip_address: meta.ip ?? null, expires_at: next.expiresAt,
    });
    await tx.execute(sql.get('revokeRefreshToken'), {
      id: previous.id, replaced_by_id: Number(inserted.insertId ?? 0),
    });
    return {
      accessToken: signAccessToken(user, { realm }),
      refreshToken: next.token, accessExpiresIn: config.auth.accessTokenTtl ?? '15m',
      user: {
        id: user.id, name: user.name, username: user.username, email: user.email, role: user.role,
        ...(realm === 'admin' ? { mustChangePassword: !!Number(user.must_change_password) } : {}),
      },
    };
  }));
  if (!result) throw Object.assign(new Error('Refresh token reuse detected. Token family revoked.'), { status: 401 });
  return result;
}
