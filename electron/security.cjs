const { pathToFileURL } = require('node:url');

function sameOrigin(url, expected) {
  try {
    const actual = new URL(url);
    const target = new URL(expected);
    return ['http:', 'https:'].includes(actual.protocol)
      && !actual.username && !actual.password && actual.origin === target.origin;
  } catch { return false; }
}

function trustedSender(event, win, expected, { file = false } = {}) {
  if (!win || win.isDestroyed() || event.sender !== win.webContents) return false;
  const frame = event.senderFrame;
  if (!frame || frame !== win.webContents.mainFrame) return false;
  if (file) {
    try { return new URL(frame.url).href === pathToFileURL(expected).href; } catch { return false; }
  }
  return sameOrigin(frame.url, expected);
}

function assertSender(event, win, expected, options) {
  if (!trustedSender(event, win, expected, options)) throw new Error('Untrusted IPC sender');
}

function lockLocalWindow(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.on('will-redirect', (event) => event.preventDefault());
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  win.webContents.session.setPermissionCheckHandler(() => false);
}

function validateSetup(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid setup settings');
  const out = {};
  for (const key of ['type', 'database', 'serverPort', 'dbfile', 'host', 'port', 'user', 'password']) {
    if (input[key] == null) continue;
    const value = String(input[key]);
    if (value.length > 1024 || /[\r\n\0]/.test(value)) throw new Error(`Invalid setup value: ${key}`);
    out[key] = value;
  }
  if (!['mariadb', 'mysql', 'sqlite', 'oracle'].includes(out.type)) throw new Error('Unsupported database type');
  for (const key of ['port', 'serverPort']) {
    if (out[key] && (!/^\d+$/.test(out[key]) || Number(out[key]) < 1 || Number(out[key]) > 65535)) throw new Error(`Invalid port: ${key}`);
  }
  if (Number(out.serverPort) === 65535) throw new Error('Server port must leave room for the control port');
  return out;
}

function parseAttachPort(value) {
  if (value == null || value === '') return null;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error('AIDOT_SERVER_PORT must be an explicit valid port');
  }
  return Number(value);
}

function envLine(key, input) {
  const value = String(input ?? '');
  if (!/^[A-Z][A-Z0-9_]*$/.test(key) || /[\r\n\0]/.test(value)) throw new Error('Invalid environment value');
  // dotenv does not unescape quotes: choose a delimiter absent from the value.
  if (/^[A-Za-z0-9_./:@+\-]*$/.test(value)) return `${key}=${value}`;
  for (const quote of ["'", '"', '`']) {
    if (!value.includes(quote) && !(quote === '"' && /\\[nr]/.test(value))) return `${key}=${quote}${value}${quote}`;
  }
  throw new Error('Value contains unsupported quote combinations');
}

module.exports = { sameOrigin, trustedSender, assertSender, lockLocalWindow, validateSetup, parseAttachPort, envLine };
