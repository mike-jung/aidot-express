#!/usr/bin/env node
/**
 * fetch-deps.mjs — `npm install` 없이 레지스트리에서 직접 패키지를 받아 설치한다.
 *
 *  ## 언제 쓰는가
 *  `npm install` 이 **정책이나 프록시로 막혀 있는데 레지스트리 HTTP 는 열려 있는** 환경이 있다.
 *  (사내 프록시가 npm 클라이언트만 차단하거나, CI 러너에 npm 자격이 없는 경우 등)
 *  그럴 때 메타데이터를 읽고 tarball 을 받아 node_modules 에 푸는 최소 설치기다.
 *
 *  ⚠ 정식 설치의 대체재가 아니다. lockfile·peerDependencies·설치 스크립트를 처리하지 않고,
 *    네이티브 빌드가 필요한 패키지(better-sqlite3, argon2 …)는 대상 밖이다.
 *    **검증 도구를 굴리기 위한 임시 수단**으로만 쓴다. 운영 설치는 반드시 `npm ci` 로.
 *
 *  사용: node scripts/fetch-deps.mjs <설치경로> <패키지@범위> [...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REGISTRY = 'https://registry.npmjs.org';
const [, , targetDir, ...specs] = process.argv;

if (!targetDir || specs.length === 0) {
  console.error('Usage: node scripts/fetch-deps.mjs <dir> <pkg[@range]> ...');
  process.exit(2);
}

const modules = path.resolve(targetDir, 'node_modules');
fs.mkdirSync(modules, { recursive: true });

const installed = new Map();   // name -> version
const skipped = [];

/** semver 범위에서 "가장 그럴듯한" 버전을 고른다 — 정식 해석 대신 최소 구현 */
function pickVersion(meta, range) {
  const versions = Object.keys(meta.versions || {});
  if (!range || range === '*' || range === 'latest') return meta['dist-tags']?.latest;
  if (versions.includes(range)) return range;

  const m = /^([\^~>=]*)\s*(\d+)\.(\d+)\.(\d+)/.exec(range);
  if (!m) return meta['dist-tags']?.latest;
  const [, op, MA, MI, PA] = m;
  const want = [Number(MA), Number(MI), Number(PA)];

  const parsed = versions
    .map((v) => ({ v, p: v.split('.').map(Number), pre: v.includes('-') }))
    .filter((x) => !x.pre && x.p.length === 3 && x.p.every((n) => Number.isFinite(n)));

  const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);
  let ok = parsed.filter((x) => cmp(x.p, want) >= 0);
  if (op.startsWith('^')) ok = ok.filter((x) => x.p[0] === want[0]);
  else if (op.startsWith('~')) ok = ok.filter((x) => x.p[0] === want[0] && x.p[1] === want[1]);
  ok.sort((a, b) => cmp(b.p, a.p));
  return ok[0]?.v ?? meta['dist-tags']?.latest;
}

function getJson(url) {
  const out = execFileSync('curl', ['-sSL', '--max-time', '60', url], {
    maxBuffer: 256 * 1024 * 1024, encoding: 'utf8',
  });
  return JSON.parse(out);
}

function install(name, range, depth = 0) {
  if (installed.has(name)) return;
  let meta;
  try {
    meta = getJson(`${REGISTRY}/${name.replace('/', '%2f')}`);
  } catch (e) {
    skipped.push(`${name} (메타데이터 실패)`);
    return;
  }
  const version = pickVersion(meta, range);
  const v = meta.versions?.[version];
  if (!v?.dist?.tarball) { skipped.push(`${name}@${range} (버전 해석 실패)`); return; }

  const dest = path.join(modules, ...name.split('/'));
  fs.mkdirSync(dest, { recursive: true });
  const tgz = path.join('/tmp', `${name.replace(/[^\w.-]/g, '_')}-${version}.tgz`);
  execFileSync('curl', ['-sSL', '--max-time', '120', '-o', tgz, v.dist.tarball]);
  // npm tarball 은 항상 package/ 한 겹으로 감싸여 있다
  execFileSync('tar', ['-xzf', tgz, '-C', dest, '--strip-components=1']);
  fs.rmSync(tgz, { force: true });

  installed.set(name, version);
  console.log(`${'  '.repeat(depth)}✓ ${name}@${version}`);

  for (const [dep, r] of Object.entries(v.dependencies || {})) {
    install(dep, r, depth + 1);
  }
}

for (const spec of specs) {
  const at = spec.lastIndexOf('@');
  const name = at > 0 ? spec.slice(0, at) : spec;
  const range = at > 0 ? spec.slice(at + 1) : 'latest';
  install(name, range);
}

console.log(`\n${installed.size} installed, ${skipped.length} skipped`);
for (const s of skipped) console.log(`  SKIP ${s}`);
