const fs = require('node:fs');
const path = require('node:path');

function credentialFile(directory = process.env.ELECTRON_USER_DATA || path.resolve(__dirname, '../../data')) {
  return path.join(directory, 'initial-admin-credentials.json');
}
function saveInitialCredential({ username, password }, directory) {
  const file = credentialFile(directory);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify({ username, password }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return file;
}
function clearInitialCredential(username, directory) {
  const file = credentialFile(directory);
  if (!fs.existsSync(file)) return;
  const credential = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (credential.username === username) fs.unlinkSync(file);
}
module.exports = { credentialFile, saveInitialCredential, clearInitialCredential };
