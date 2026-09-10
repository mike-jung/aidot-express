import fs from 'node:fs';
import path from 'node:path';

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
const normalized = value => JSON.stringify(Object.entries(value || {}).sort(([a], [b]) => a.localeCompare(b)));
function packagePath(root, location) {
  if (!/^node_modules\//.test(location) || /[\\:\x00-\x1f]/.test(location)
      || location.split('/').some(part => !part || part === '.' || part === '..')) return null;
  return path.join(root, location, 'package.json');
}

/** Check the installed npm tree, including required transitive versions, without reinstalling it. */
export function installedDependenciesMatch(root, { includeDev = false } = {}) {
  const pkg = readJson(path.join(root, 'package.json'));
  const lock = readJson(path.join(root, 'package-lock.json'));
  const installed = readJson(path.join(root, 'node_modules/.package-lock.json'));
  const declared = lock?.packages?.[''];
  if (!pkg || !declared || !installed?.packages) return false;
  for (const section of ['dependencies', 'optionalDependencies', ...(includeDev ? ['devDependencies'] : [])]) {
    if (normalized(pkg[section]) !== normalized(declared[section])) return false;
  }
  const direct = { ...pkg.dependencies, ...(includeDev ? pkg.devDependencies : {}) };
  for (const name of Object.keys(direct)) {
    if (Object.hasOwn(pkg.optionalDependencies || {}, name)) continue;
    if (!lock.packages[`node_modules/${name}`]) return false;
  }
  for (const [location, meta] of Object.entries(lock.packages)) {
    if (!location || meta.optional || (!includeDev && (meta.dev || meta.devOptional))) continue;
    const file = packagePath(root, location);
    if (!file || meta.link || !meta.version) return false;
    const actual = readJson(file);
    const recorded = installed.packages[location];
    if (actual?.version !== meta.version || recorded?.version !== meta.version
        || (meta.integrity && recorded.integrity !== meta.integrity)
        || (meta.resolved && recorded.resolved !== meta.resolved)) return false;
  }
  return true;
}

export function hasInstalledDevDependencies(root) {
  const pkg = readJson(path.join(root, 'package.json'));
  const lock = readJson(path.join(root, 'package-lock.json'));
  return Object.keys(pkg?.devDependencies || {}).some(name => {
    // A declared dev dependency (for example @types/node) can also be required
    // transitively at runtime. Its presence must not pull Electron into a server-only install.
    const meta = lock?.packages?.[`node_modules/${name}`];
    if (meta && !meta.dev && !meta.devOptional) return false;
    const file = packagePath(root, `node_modules/${name}`);
    return file && fs.existsSync(file);
  });
}

/** Invoke npm's JavaScript CLI through Node; never concatenate arguments through a shell. */
export function npmCommand(args, { env = process.env, execPath = process.execPath } = {}) {
  const candidates = [env.npm_execpath];
  const directories = new Set([path.dirname(execPath)]);
  try { directories.add(path.dirname(fs.realpathSync(execPath))); } catch {}
  const searchPath = Object.entries(env).find(([key]) => key.toLowerCase() === 'path')?.[1] || '';
  for (const directory of searchPath.split(path.delimiter).filter(Boolean)) directories.add(directory);
  for (const directory of directories) {
    candidates.push(path.join(directory, 'node_modules/npm/bin/npm-cli.js'));
    try { candidates.push(fs.realpathSync(path.join(directory, 'npm'))); } catch {}
  }
  for (const candidate of candidates) {
    if (!candidate || !path.isAbsolute(candidate) || !/^npm-cli\.(?:js|cjs)$/i.test(path.basename(candidate))) continue;
    try {
      if (fs.statSync(candidate).isFile()) return { command: execPath, args: [candidate, ...args], shell: false };
    } catch {}
  }
  throw new Error('Cannot locate npm-cli.js. Run npm start, or install Node.js with npm available on PATH.');
}
