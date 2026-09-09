#!/usr/bin/env node
/** Build Linux releases using a fresh output directory and edition-specific collection. */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { linuxBuildInfo, collectLinuxArtifact, reportLinuxArtifact } from './linux-artifacts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const want = args.find((arg) => ['--wsl', '--docker', '--targz', '--native'].includes(arg));
const cfgIdx = args.indexOf('--config');
const configFile = cfgIdx >= 0 ? args[cfgIdx + 1] : undefined;
const isWin = process.platform === 'win32';
const needsShell = (cmd) => isWin && /^(npm|npx|yarn|pnpm)$/.test(cmd);
const has = (cmd, cmdArgs = ['--version']) => spawnSync(cmd, cmdArgs, { stdio: 'ignore', shell: needsShell(cmd) }).status === 0;
const run = (cmd, cmdArgs) => execFileSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: needsShell(cmd) });
export const shellQuote = (value) => "'" + String(value).replace(/'/g, "'\"'\"'") + "'";

function localOutput(info) {
  fs.mkdirSync(info.output, { recursive: true });
  return fs.mkdtempSync(path.join(info.output, `.linux-${info.edition}-build-`));
}

function buildLocal(format) {
  const info = linuxBuildInfo(ROOT, configFile, format);
  const output = localOutput(info);
  console.log(`Building ${info.edition} Linux ${format} v${info.version}`);
  try {
    // Invoke the installed CLI with Node so Windows paths never pass through cmd.exe.
    run(process.execPath, [path.join(ROOT, 'node_modules/electron-builder/out/cli/cli.js'), '--linux', format, '--x64', '--publish', 'never', '--config', configFile, `-c.directories.output=${output}`]);
    reportLinuxArtifact(collectLinuxArtifact({ source: output, destination: info.output, info }), info.output);
    fs.rmSync(output, { recursive: true, force: true });
  } catch (error) { throw new Error(`${error.message}\nBuild output retained at: ${output}`); }
}

function buildNative() { buildLocal('AppImage'); }
function buildTarGz() { buildLocal('tar.gz'); }

/** A new source tree avoids sharing output, removed files or editions between WSL runs. */
export function wslBuildScript({ source, destination, configName, edition }) {
  const q = shellQuote;
  return [
    'set -euo pipefail',
    'export PATH="$(printf %s "$PATH" | tr ":" "\\n" | grep -v "^/mnt/[a-z]/" | paste -sd: -)"',
    'command -v node >/dev/null || { echo "Linux Node is required inside WSL."; echo "Windows 의 Node 는 Linux 빌드에 쓸 수 없습니다"; echo "Install Linux Node 22.19+ (https://deb.nodesource.com/setup_22.x)."; exit 1; }',
    'case "$(command -v node)" in /mnt/*) echo "Windows 의 Node 는 Linux 빌드에 쓸 수 없습니다"; exit 1;; esac',
    'command -v make >/dev/null || { echo "Install build-essential and Python 3 inside WSL."; exit 1; }',
    'echo "Linux Node $(node -v) ($(command -v node))"',
    'mkdir -p "$HOME/.cache/aidot-express-linux-build/runs"',
    `aidotWorkDir=$(mktemp -d "$HOME/.cache/aidot-express-linux-build/runs/${edition}-XXXXXXXX")`,
    `trap 'aidotStatus=$?; if [ "$aidotStatus" -eq 0 ]; then rm -rf -- "$aidotWorkDir"; else echo "Failed build retained at: $aidotWorkDir"; fi' EXIT`,
    'echo "Isolated WSL build: $aidotWorkDir"',
    'if command -v rsync >/dev/null; then',
    '  rsync -a --exclude node_modules --exclude dist-electron --exclude dist-release --exclude .git \\',
    '    --exclude .env --exclude .env.local --exclude ".env.*.local" --exclude .patch-backups \\',
    '    --exclude data --exclude log --exclude logs --exclude .tmp --exclude .cache --exclude .build \\',
    `    ${q(source + '/')} "$aidotWorkDir/"`,
    'else',
    `  ( cd ${q(source)} && tar --exclude=node_modules --exclude=dist-electron --exclude=dist-release --exclude=.git \\`,
    '    --exclude=.env --exclude=.env.local --exclude=".env.*.local" --exclude=.patch-backups \\',
    '    --exclude=data --exclude=log --exclude=logs --exclude=.tmp --exclude=.cache --exclude=.build -cf - . ) | ( cd "$aidotWorkDir" && tar -xf - )',
    'fi',
    'cd "$aidotWorkDir"',
    'npm ci --no-audit --no-fund',
    `node node_modules/electron-builder/out/cli/cli.js --linux AppImage --x64 --publish never --config ${q(configName)} -c.directories.output=dist-electron`,
    `node scripts/linux-artifacts.mjs --source dist-electron --destination ${q(destination)} --config ${q(configName)}`,
  ].join('\n') + '\n';
}

function buildWsl() {
  const info = linuxBuildInfo(ROOT, configFile);
  const distro = (() => {
    try { return execFileSync('wsl.exe', ['-l', '-q'], { encoding: 'utf16le' }).split(/\r?\n/).map(value => value.trim()).find(Boolean); }
    catch { return null; }
  })();
  if (!distro) throw new Error('WSL distribution unavailable. Install with: wsl --install -d Ubuntu');
  if (path.dirname(path.resolve(ROOT, configFile)) !== ROOT) throw new Error('WSL requires the generated config in the project root');
  const wslPath = (file) => execFileSync('wsl.exe', ['-d', distro, '--', 'wslpath', '-a', file.replace(/\\/g, '/')], { encoding: 'utf8' }).trim();
  const script = wslBuildScript({ source: wslPath(ROOT), destination: wslPath(info.output), configName: path.basename(configFile), edition: info.edition });
  const parent = path.join(ROOT, '.tmp');
  fs.mkdirSync(parent, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(parent, 'linux-build-'));
  const tmpWin = path.join(temporary, 'run.sh');
  fs.writeFileSync(tmpWin, script, 'utf8');
  try {
    const tmpWsl = wslPath(tmpWin);
    console.log(`Building inside WSL (${distro}): ${info.name}`);
    run('wsl.exe', ['-d', distro, '--', 'bash', '-l', tmpWsl]);
  } finally {
    fs.rmSync(tmpWin, { force: true });
    fs.rmdirSync(temporary);
  }
}

function buildDocker() {
  const info = linuxBuildInfo(ROOT, configFile);
  const relative = path.relative(ROOT, info.output);
  if (relative.startsWith('..') || path.isAbsolute(relative) || path.dirname(path.resolve(ROOT, configFile)) !== ROOT) throw new Error('Docker output and generated config must be within the mounted project');
  const output = localOutput(info);
  const containerOutput = '/project/' + path.relative(ROOT, output).split(path.sep).join('/');
  const inner = [
    'set -euo pipefail',
    'cd /project',
    'npm ci --no-audit --no-fund',
    `node node_modules/electron-builder/out/cli/cli.js --linux AppImage --x64 --publish never --config ${shellQuote(path.basename(configFile))} ${shellQuote('-c.directories.output=' + containerOutput)}`,
  ].join('\n');
  try {
    run('docker', ['run', '--rm', '-v', `${ROOT}:/project`,
      '-v', 'aidot-express-node-modules:/project/node_modules',
      '-v', 'aidot-express-admin-node-modules:/project/admin-client/node_modules',
      '-v', 'aidot-electron-cache:/root/.cache/electron',
      '-v', 'aidot-builder-cache:/root/.cache/electron-builder',
      'electronuserland/builder:latest', '/bin/bash', '-c', inner]);
    reportLinuxArtifact(collectLinuxArtifact({ source: output, destination: info.output, info }), info.output);
    fs.rmSync(output, { recursive: true, force: true });
  } catch (error) { throw new Error(`${error.message}\nBuild output retained at: ${output}`); }
}

function main() {
  if (want === '--native' || (!want && !isWin)) buildNative();
  else if (want === '--wsl') buildWsl();
  else if (want === '--docker') buildDocker();
  else if (want === '--targz') buildTarGz();
  else if (has('wsl.exe', ['-l', '-q'])) buildWsl();
  else if (has('docker')) buildDocker();
  else {
    console.log('No WSL or Docker found; building tar.gz. AppImage requires a Linux environment.');
    buildTarGz();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error(`Linux build failed: ${error.message}`);
    console.error('Try npm run dist:linux -- --wsl, --docker or --targz after correcting the error.');
    process.exitCode = 1;
  }
}
