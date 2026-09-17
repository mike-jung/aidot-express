'use strict';
const transport = require('../src/core/transport.cjs');
const { randomPassword } = require('../src/core/bootstrapPassword.cjs');

// Use the existing authenticated password-change API; never expose a reset endpoint.
function createPasswordClient({ prepared, port, minLength = 20 }) {
  async function request(method, path, body, token, cookie) {
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = transport.localRequest(prepared, { port, path, method, headers: {
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload),
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}),
      } }, res => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { text += chunk; if (text.length > 65536) req.destroy(new Error('Response too large')); });
        res.on('error', reject);
        res.on('end', () => {
          let data;
          try { data = JSON.parse(text); } catch { reject(new Error('Invalid server response')); return; }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const message = res.statusCode === 429 ? '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
              : res.statusCode === 401 || res.statusCode === 400 ? '계정 또는 비밀번호를 확인하지 못했습니다. 로그인 화면에서 확인해 주세요.'
              : '비밀번호를 변경하지 못했습니다. 서버 상태를 확인해 주세요.';
            reject(Object.assign(new Error(message), { status: res.statusCode })); return;
          }
          resolve({ data: data.data, cookie: (res.headers['set-cookie'] || []).map(value => value.split(';')[0]).join('; ') });
        });
      });
      req.setTimeout(15000, () => req.destroy(new Error('Server request timed out')));
      req.on('error', reject);
      req.end(payload);
    });
  }
  const login = credential => request('POST', '/api/admin/auth/login', credential);
  const logout = session => session?.cookie
    ? request('POST', '/api/admin/auth/logout', {}, null, session.cookie).catch(() => {}) : Promise.resolve();

  return { async regenerate(credential) {
    const password = randomPassword(minLength, credential.username);
    const next = { username: credential.username, password };
    const session = await login(credential);
    try {
      if (!session.data?.accessToken) throw new Error('Invalid sign-in response');
      try {
        await request('PUT', '/api/admin/users/me/password', { currentPassword: credential.password, newPassword: password }, session.data.accessToken);
      } catch (error) {
        if (error.status) throw error;
        // A lost response may follow a committed update. Confirm which password works.
        try { await logout(await login(next)); }
        catch { throw Object.assign(new Error('서버 응답을 확인하지 못했습니다. 아래 비밀번호를 복사한 뒤 로그인 화면에서 확인해 주세요.'), { candidate: next }); }
      }
      return next;
    } finally { await logout(session); }
  } };
}
module.exports = { createPasswordClient };
