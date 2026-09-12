import db from '../database/db.js';

/** Check persistent state so revocations survive restarts and cross process boundaries. */
export async function assertCurrentAccount(user, { executor = db } = {}) {
  const realm = user?.realm;
  if (!['admin', 'user'].includes(realm)) throw Object.assign(new Error('Invalid account realm'), { status: 401 });
  const id = Number(user.id ?? user.sub);
  if (!Number.isSafeInteger(id) || id <= 0) throw Object.assign(new Error('Invalid account'), { status: 401 });
  const table = realm === 'admin' ? 'admin_users' : 'users';
  let rows;
  try {
    ({ rows } = await executor.execute(`SELECT id, role, status, token_version${realm === 'admin' ? ', must_change_password' : ''} FROM ${table} WHERE id = :id`, { id }));
  } catch {
    throw Object.assign(new Error('Account verification unavailable'), { status: 503 });
  }
  const account = rows?.[0];
  if (!account || account.status !== 'active' || account.role !== user.role
    || Number(account.token_version) !== Number(user.ver ?? user.token_version ?? 0)) {
    throw Object.assign(new Error('Session revoked. Please sign in again.'), { status: 401, code: 'ACCOUNT_REVOKED' });
  }
  // Compatibility contract: must_change_password is an advisory console flag.
  // Keep it in the account/login/refresh data so the warning remains visible,
  // while authorized API, control and SSE operations continue to work.
  // Role, account status and token-version validation above still apply.
  return account;
}
