'use strict';
const { randomInt } = require('node:crypto');

const DEFAULT_ADMIN_PASSWORD = 'admin1234';

function randomPassword(length = 20, username = '') {
  length = Math.max(20, Math.ceil(Number(length) || 20));
  if (length > 200) throw new Error('Password length must not exceed 200 characters');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  for (let attempt = 0; attempt < 100; attempt++) {
    const password = Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('');
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[2-9]/.test(password)
        && (!username || !password.toLowerCase().includes(username.toLowerCase()))) return password;
  }
  throw new Error('Could not generate a password matching the account policy');
}

function initialPassword({ env = process.env, production = false } = {}) {
  const desktop = env.IS_ELECTRON === '1' && !!env.ELECTRON_USER_DATA;
  if (env.ADMIN_INITIAL_PASSWORD) return { password: env.ADMIN_INITIAL_PASSWORD, source: 'ADMIN_INITIAL_PASSWORD', disclose: desktop, generated: false };
  if (desktop || !production) return { password: DEFAULT_ADMIN_PASSWORD, source: desktop ? '데스크톱 기본값' : 'development 기본값', disclose: desktop, generated: false };
  return { password: randomPassword(), source: '1회용 랜덤', disclose: true, generated: true };
}

module.exports = { DEFAULT_ADMIN_PASSWORD, randomPassword, initialPassword };
