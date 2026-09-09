/** Collect only artifacts from the current Linux build, preserving earlier releases. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function linuxBuildInfo(root, configFile, format = 'AppImage') {
  if (!['AppImage', 'tar.gz'].includes(format)) throw new Error('Unsupported Linux artifact format');
  if (!configFile) throw new Error('Run Linux builds through npm run dist:linux or dist:linux:full');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const config = JSON.parse(fs.readFileSync(path.resolve(root, configFile), 'utf8'));
  const edition = config.extraMetadata?.aidotEdition;
  if (!['public', 'full'].includes(edition)) throw new Error('Missing Linux build edition');
  const product = config.productName || pkg.build?.productName || pkg.name;
  const template = config.linux?.artifactName || '${productName}-${version}.${ext}';
  const values = { productName: product, name: pkg.name, version: pkg.version, arch: 'x64', ext: format };
  const name = template.replace(/\$\{([^}]+)\}/g, (_, key) => values[key] ?? '${' + key + '}');
  if (/[\\/:\x00-\x1f]/.test(name) || name.includes('${') || !name.endsWith('.' + format)) throw new Error('Unsupported Linux artifact name');
  return { edition, product, version: pkg.version, format, name, output: path.resolve(root, config.directories?.output || 'dist-electron') };
}

function plainDirectory(dir) {
  for (let part = path.resolve(dir); ; part = path.dirname(part)) {
    if (fs.existsSync(part) && (!fs.lstatSync(part).isDirectory() || fs.lstatSync(part).isSymbolicLink())) throw new Error(`Artifact directory is not a plain directory: ${part}`);
    if (part === path.dirname(part)) break;
  }
}

const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function collectLinuxArtifact({ source, destination, info }) {
  if (!['public', 'full'].includes(info.edition) || !['AppImage', 'tar.gz'].includes(info.format) || /[\\/:\x00-\x1f]/.test(info.name) || info.name === '.' || info.name === '..') throw new Error('Invalid Linux artifact identity');
  source = path.resolve(source);
  destination = path.resolve(destination);
  if (source === destination) throw new Error('Linux build output must be isolated from the release directory');
  plainDirectory(source);
  plainDirectory(destination);
  const input = path.join(source, info.name);
  const stat = fs.lstatSync(input);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0) throw new Error(`Current Linux artifact missing or invalid: ${info.name}`);
  const sha256 = hash(input);
  fs.mkdirSync(destination, { recursive: true });
  const receiptName = `linux-${info.edition}-${info.format === 'AppImage' ? 'appimage' : 'targz'}-latest.json`;
  const receiptPath = path.join(destination, receiptName);
  if (fs.existsSync(receiptPath) && !fs.lstatSync(receiptPath).isFile()) throw new Error('Unsafe Linux build receipt');
  if (fs.existsSync(receiptPath) && fs.lstatSync(receiptPath).isSymbolicLink()) throw new Error('Unsafe Linux build receipt');
  const previousReceipt = fs.existsSync(receiptPath) ? fs.readFileSync(receiptPath) : null;
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const family = new RegExp(`^${escape(info.product)}-\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?${info.edition === 'full' ? '-full' : ''}\\.${escape(info.format)}$`);
  const old = fs.readdirSync(destination).filter((name) => name === info.name || (family.test(name) && (info.edition === 'full' || !name.endsWith(`-full.${info.format}`))));
  for (const name of old) {
    const item = fs.lstatSync(path.join(destination, name));
    if (!item.isFile() || item.isSymbolicLink()) throw new Error(`Unsafe existing artifact: ${name}`);
  }
  const stage = fs.mkdtempSync(path.join(destination, `.linux-${info.edition}-collect-`));
  const temporary = path.join(stage, info.name);
  const moved = [];
  let archive;
  let installed = false;
  try {
    fs.copyFileSync(input, temporary);
    fs.chmodSync(temporary, stat.mode & 0o777);
    if (hash(temporary) !== sha256) throw new Error('Linux artifact copy verification failed');
    if (old.length) {
      const parent = path.join(destination, 'archive', info.edition);
      plainDirectory(parent);
      fs.mkdirSync(parent, { recursive: true });
      archive = fs.mkdtempSync(path.join(parent, `${new Date().toISOString().replace(/[:.]/g, '-')}-`));
      for (const name of old) {
        fs.renameSync(path.join(destination, name), path.join(archive, name));
        moved.push(name);
      }
    }
    fs.renameSync(temporary, path.join(destination, info.name));
    installed = true;
    const receipt = { version: info.version, edition: info.edition, format: info.format, createdAt: new Date().toISOString(), files: [{ name: info.name, bytes: stat.size, sha256 }], archived: moved.map((name) => path.relative(destination, path.join(archive, name)).split(path.sep).join('/')) };
    writeReceipt(path.join(stage, receiptName), receipt);
    fs.renameSync(path.join(stage, receiptName), receiptPath);
    return receipt;
  } catch (error) {
    if (installed) fs.rmSync(path.join(destination, info.name), { force: true });
    for (const name of moved.reverse()) fs.renameSync(path.join(archive, name), path.join(destination, name));
    if (previousReceipt) fs.writeFileSync(receiptPath, previousReceipt);
    else fs.rmSync(receiptPath, { force: true });
    throw error;
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

function writeReceipt(file, receipt) { fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n'); }

export function reportLinuxArtifact(receipt, destination) {
  console.log(`Linux artifact ready: ${path.join(destination, receipt.files[0].name)}`);
  console.log(`SHA-256: ${receipt.files[0].sha256}`);
  if (receipt.archived.length) console.log(`Preserved ${receipt.archived.length} previous artifact(s) under ${path.join(destination, 'archive', receipt.edition)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const get = (key) => args[args.indexOf(key) + 1];
    if (!['--source', '--destination', '--config'].every(key => args.includes(key) && get(key) && !get(key).startsWith('--'))) throw new Error('Expected --source, --destination and --config');
    const info = linuxBuildInfo(process.cwd(), get('--config'), args.includes('--targz') ? 'tar.gz' : 'AppImage');
    const destination = get('--destination');
    reportLinuxArtifact(collectLinuxArtifact({ source: get('--source'), destination, info }), destination);
  } catch (error) { console.error(`Linux artifact collection failed: ${error.message}`); process.exitCode = 1; }
}
