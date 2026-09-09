const fs = require('node:fs');
const crypto = require('node:crypto');

function isPlaceholderSecret(value) {
  return typeof value !== 'string' || value.length < 32
    || /change[-_ ]?me|^(?:dev|test|sample|example)[-_]/i.test(value);
}

/** Used before starting either HTTP process, including the installed desktop app. */
function ensureEnvSecret(file) {
  if (!fs.existsSync(file)) return null;
  const bytes = fs.readFileSync(file);
  let text;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) text = bytes.subarray(2).toString('utf16le');
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = Buffer.from(bytes.subarray(2));
    if (swapped.length % 2) throw new Error('Invalid UTF-16 environment file');
    swapped.swap16(); text = swapped.toString('utf16le');
  } else text = bytes.toString('utf8').replace(/^\uFEFF/, '');
  // Bootstrap runs before npm has installed dependencies. Only this one scalar is read.
  const raw = /^\s*(?:export\s+)?AUTH_ACCESS_SECRET\s*=(.*)$/m.exec(text)?.[1]?.trim();
  const quoted = raw?.match(/^(['"`])(.*)\1\s*(?:#.*)?$/);
  const current = quoted ? quoted[2] : raw?.split('#')[0].trim();
  if (!isPlaceholderSecret(current)) return null;
  const secret = crypto.randomBytes(48).toString('base64url');
  const line = `AUTH_ACCESS_SECRET=${secret}`;
  const re = /^\s*(?:export\s+)?AUTH_ACCESS_SECRET\s*=.*$/gm;
  const updated = re.test(text) ? text.replace(re, () => line) : `${text.trimEnd()}\n${line}\n`;
  fs.writeFileSync(file, updated, { encoding: 'utf8', mode: 0o600 });
  if (process.platform !== 'win32') fs.chmodSync(file, 0o600);
  return current === undefined ? 'added' : 'replaced';
}

module.exports = { isPlaceholderSecret, ensureEnvSecret };
