#!/usr/bin/env node
/**
 * scripts/ensure-build-deps.mjs — 빌드에 필요한 것이 실제로 있는지 보고, 없으면 설치한다.
 *
 *  왜 필요한가
 *    `dist:win` 은 `build:admin && electron-builder` 였다. `build:admin` 은
 *    **admin-client 폴더만** `npm install` 하므로, 루트에 `npm install` 을 한 적이 없으면
 *    콘솔 빌드는 잘 끝나고 마지막 줄에서만 이렇게 죽는다:
 *
 *      'electron-builder'은(는) 내부 또는 외부 명령ㆍ실행할 수 있는 프로그램이 아닙니다.
 *
 *    3~4분을 기다린 뒤에야 알게 되는 데다, 메시지만 봐서는 무엇을 해야 할지 알기 어렵다.
 *    (electron 은 200MB 가 넘어 처음 설치가 오래 걸리므로, 미리 확인해 주는 편이 낫다.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
/** npm 을 돌린다. 실패하면 **무엇을 해야 하는지** 말하고 멈춘다 —
 *  npm 의 원본 오류만 던지면 무슨 일인지 알기 어렵다. */
function run(args, cwd, what) {
  try {
    execFileSync(npm, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  } catch {
    console.error(`\n✗ Could not install ${what}.`);
    console.error(`  Try it in that folder yourself:  cd ${cwd} && npm install`);
    console.error('  · On a corporate network you may need a proxy (npm config get proxy)');
    console.error('  · electron is over 200MB, so the first download takes a while');
    process.exit(1);
  }
}

/** 그 폴더에 의존성이 실제로 설치돼 있는가 (package.json 이 아니라 node_modules 를 본다) */
function needsInstall(dir, probes) {
  if (!fs.existsSync(path.join(dir, 'node_modules'))) return true;
  return probes.some((p) => !fs.existsSync(path.join(dir, 'node_modules', p)));
}

/* ① 루트 — electron-builder 는 여기 있다 */
if (needsInstall(ROOT, ['electron-builder', 'electron', '.bin'])) {
  console.log('▶ Installing root dependencies (electron is large — this may take a few minutes) …');
  run(['install'], ROOT, '루트 의존성');
} else {
  console.log('· root dependencies OK');
}

/* ② 콘솔 */
const ADMIN = path.join(ROOT, 'admin-client');
if (needsInstall(ADMIN, ['vite', 'vue'])) {
  console.log('▶ Installing console (admin-client) dependencies …');
  run(['install'], ADMIN, '콘솔(admin-client) 의존성');
} else {
  console.log('· console dependencies OK');
}

/* ③ 그래도 없으면, 무엇이 문제인지 분명히 말하고 멈춘다 */
const bin = path.join(ROOT, 'node_modules', '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder');
if (!fs.existsSync(bin)) {
  console.error('\n✗ electron-builder not found.');
  console.error('  Run `npm install` once in the project root, then try again.');
  console.error(`  (found at: ${bin})`);
  process.exit(1);
}
console.log('· electron-builder ready\n');
