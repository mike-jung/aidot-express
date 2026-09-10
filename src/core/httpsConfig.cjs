'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const { ENV_KEYS, tlsFromEnv } = require('./transport.cjs');

function decodeEnv(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2).toString('utf16le');
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return Buffer.from(bytes.subarray(2)).swap16().toString('utf16le');
  return bytes.toString('utf8').replace(/^\uFEFF/, '');
}
function readEnv(file) {
  try { return dotenv.parse(decodeEnv(fs.readFileSync(file))); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
}
function envPath(root = process.cwd(), env = process.env) {
  return path.resolve(env.AIDOT_ENV_FILE || path.join(env.ELECTRON_USER_DATA_PATH || root, '.env'));
}
function readTlsSettings(file, fallback = {}) { return tlsFromEnv(readEnv(file), fallback); }

// A private directory is protected before any key bytes are written. Windows chmod alone
// does not remove inherited read permissions, so use the current account SID with icacls.
function protectPath(target, directory = false) {
  if (process.platform !== 'win32') { fs.chmodSync(target, directory ? 0o700 : 0o600); return; }
  const who = spawnSync('whoami.exe', ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  const sid = /S-1-\d+(?:-\d+)+/.exec(who.stdout || '')?.[0];
  if (who.status !== 0 || !sid) throw new Error('Cannot determine the current Windows account for certificate permissions');
  const grants = [...new Set([sid, 'S-1-5-18', 'S-1-5-32-544'])].map(principal => `*${principal}:${directory ? '(OI)(CI)' : ''}F`);
  const acl = spawnSync('icacls.exe', [target, '/inheritance:r', '/grant:r', ...grants], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  if (acl.status !== 0) throw new Error('Cannot protect HTTPS files with Windows permissions');
}
function quoteValue(value) {
  value = String(value ?? '');
  if (/[\x00-\x1f\x7f]/.test(value)) throw new Error('HTTPS settings cannot contain control characters or newlines');
  for (const quote of ["'", '`', '"']) {
    if (value.includes(quote)) continue;
    const candidate = `${quote}${value}${quote}`;
    if (dotenv.parse(`VALUE=${candidate}`).VALUE === value) return candidate;
  }
  throw new Error('This value cannot be represented safely in a dotenv file');
}
function writePrivateFile(file, content) {
  // Windows ignores POSIX mode bits. Restrict the empty file before writing secrets.
  const descriptor = fs.openSync(file, 'wx', 0o600);
  try {
    protectPath(file);
    fs.writeFileSync(descriptor, content);
  } finally { fs.closeSync(descriptor); }
}
function saveTlsSettings(file, settings) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lock = `${file}.https-write.lock`;
  let fd;
  try { fd = fs.openSync(lock, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('Another HTTPS settings update is in progress'); throw error; }
  const tmp = `${file}.https-tmp-${randomBytes(8).toString('hex')}`;
  try {
    if (fs.existsSync(file) && (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink())) throw new Error('The active .env must be a regular file');
    const before = fs.existsSync(file) ? fs.readFileSync(file) : null;
    const lines = before ? decodeEnv(before).split(/\r?\n/) : [];
    const replacements = new Map(Object.entries(ENV_KEYS).map(([key, name]) => [name, `${name}=${quoteValue(key === 'enabled' ? !!settings.enabled : settings[key])}`]));
    // Remove duplicate active assignments to avoid an old trailing value winning.
    const result = lines.flatMap(line => {
      const key = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=/.exec(line)?.[1];
      if (!Object.values(ENV_KEYS).includes(key)) return [line];
      if (!replacements.has(key)) return [];
      const next = replacements.get(key); replacements.delete(key); return [next];
    });
    result.push(...replacements.values());
    const content = result.join('\n').replace(/\n*$/, '\n');
    if (before && decodeEnv(before) === content) return { envFile: file, changed: false, backup: null };
    writePrivateFile(tmp, content);
    const current = fs.existsSync(file) ? fs.readFileSync(file) : null;
    if ((before === null) !== (current === null) || (before && !before.equals(current))) throw new Error('The .env changed during this update. Reload settings and try again');
    let backup = null;
    if (before) {
      backup = `${file}.https-backup-${Date.now()}-${randomBytes(4).toString('hex')}`;
      writePrivateFile(backup, before);
    }
    // Atomic replacement only. A locked file is an error; never delete the original as a fallback.
    fs.renameSync(tmp, file);
    return { envFile: file, changed: true, backup };
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
    fs.closeSync(fd); fs.unlinkSync(lock);
  }
}
module.exports = { decodeEnv, readEnv, envPath, readTlsSettings, protectPath, saveTlsSettings };
