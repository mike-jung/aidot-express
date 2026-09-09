/** Verify the materialized application, not just the builder's input glob list. */
module.exports = async function verifyPackedEdition(context) {
  const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
  const edition = context.packager.config.extraMetadata?.aidotEdition;
  const expected = JSON.parse(fs.readFileSync(path.join(context.packager.projectDir, `.electron-builder.${edition}.files.json`), 'utf8'));
  const app = path.join(context.packager.getResourcesDir(context.appOutDir), 'app');
  const allowed = new Set(expected.files.map((item) => item.path));
  const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  for (const item of expected.extraResources || []) {
    const file = path.join(context.packager.getResourcesDir(context.appOutDir), item.path);
    if (!fs.existsSync(file) || hash(file) !== item.sha256) throw new Error(`Package resource mismatch: ${item.path}`);
  }
  for (const item of expected.files) {
    const file = path.join(app, item.path);
    if (!fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink()) throw new Error(`Package file missing/unsafe: ${item.path}`);
    if (item.path !== 'package.json' && hash(file) !== item.sha256) throw new Error(`Package content mismatch: ${item.path}`);
  }
  const walk = (dir, prefix = '') => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const name = prefix + entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), name + '/');
      else if (!allowed.has(name)) throw new Error(`Unselected file in package: ${name}`);
    }
  };
  walk(app);
  const pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(context.packager.projectDir, 'package-lock.json'), 'utf8'));
  for (const name of Object.keys(pkg.dependencies || {})) {
    const installed = path.join(app, 'node_modules', name, 'package.json');
    const wanted = lock.packages?.[`node_modules/${name}`]?.version;
    if (!wanted || !fs.existsSync(installed)
      || JSON.parse(fs.readFileSync(installed, 'utf8')).version !== wanted) {
      throw new Error(`Packed runtime dependency missing or not locked: ${name}`);
    }
  }
  const marker = JSON.parse(fs.readFileSync(path.join(app, 'admin-client/dist/aidot-edition.json'), 'utf8'));
  if (pkg.aidotEdition !== edition || marker.edition !== edition || marker.version !== expected.version) throw new Error('Packed edition/version mismatch');
  fs.writeFileSync(path.join(app, 'AIDOT_PACKAGE_MANIFEST.json'), JSON.stringify({ ...expected, files: expected.files.map((item) => ({ path: item.path, sha256: hash(path.join(app, item.path)) })) }, null, 2));
  console.log(`Verified ${edition} package: ${expected.files.length} runtime files`);
};
