module.exports = async function verifyEdition(context) {
  const edition = context.packager.config.extraMetadata?.aidotEdition;
  if (!['public', 'full'].includes(edition)) {
    throw new Error('Use npm run dist:win / dist:linux / pack so the edition policy is applied');
  }
  const fs = require('node:fs');
  const path = require('node:path');
  const root = context.packager.projectDir;
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.aidotEdition === 'public' && edition === 'full') throw new Error('A public source tree cannot build a full edition');
  const dir = edition === 'public' ? 'dist-public' : 'dist';
  const marker = JSON.parse(fs.readFileSync(path.join(root, 'admin-client', dir, 'aidot-edition.json'), 'utf8'));
  if (marker.edition !== edition || marker.version !== pkg.version) throw new Error('Console edition/version mismatch; rebuild the console');
  // This is a generated application directory. Remove leftovers before a new copy.
  const appDir = path.join(context.packager.getResourcesDir(context.appOutDir), 'app');
  const relative = path.relative(context.appOutDir, appDir);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Invalid package output directory');
  fs.rmSync(appDir, { recursive: true, force: true });
};
