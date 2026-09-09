#!/usr/bin/env node
/**
 * release-all.mjs — 빌드부터 공개판 갱신까지 한 번에. (`npm run all`)
 *
 *  순서에 이유가 있다:
 *
 *    1. dist:win        Windows 설치 파일 — 가장 오래 걸리고 가장 자주 쓰인다
 *    2. dist:linux      Linux — WSL/Docker 가 없으면 tar.gz 로 대신한다
 *    3. push            full(private) 저장소 — 소스가 먼저 안전한 곳에 있어야 한다
 *    4. release:github  설치 파일을 릴리스 초안으로
 *    5. sync:public     공개판 — 걸러내기 검사를 통과해야만 나간다
 *
 *  릴리스가 push **뒤**인 이유: 태그는 그 소스를 가리킨다. 올리지 않은 코드로
 *  릴리스를 만들면 태그가 가리키는 커밋이 GitHub 에 없다.
 *
 *  ⚠ 중간이 실패해도 **앞 단계 결과는 남는다.** 예전에 AppImage 가 먼저 죽어
 *    exe 까지 못 받은 적이 있어, 무거운 것부터 끝내고 넘어간다.
 *
 *  쓰는 법
 *    npm run all                  전부
 *    npm run all -- --dry-run     무엇이 올라갈지만 (빌드는 실제로 한다)
 *    npm run all -- --no-build    빌드는 건너뛰고 올리기만
 *    npm run all -- --no-publish  빌드만
 *    npm run all -- --no-release  릴리스는 빼고
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const noBuild = args.includes('--no-build');
const noPublish = args.includes('--no-publish');
const noRelease = args.includes('--no-release');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const started = Date.now();
const results = [];

function step(label, cmdArgs, { optional = false } = {}) {
  const t0 = Date.now();
  console.log(`\n${'─'.repeat(60)}\n▶ ${label}\n${'─'.repeat(60)}`);
  const r = spawnSync(npm, cmdArgs, {
    cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32',
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const ok = r.status === 0;
  results.push({ label, ok, secs, optional });
  if (!ok && !optional) {
    /* 여기서 멈춘다. 앞 단계 결과는 그대로 남아 있다. */
    report();
    console.error(`\n✗ Stopped at '${label}'. Fix the error above first.`);
    console.error('  Output from earlier steps is left in place.');
    process.exit(1);
  }
  if (!ok) console.log(`\n· '${label}' failed but is optional — moving on.`);
  return ok;
}

function report() {
  console.log(`\n${'═'.repeat(60)}`);
  for (const r of results) {
    const mark = r.ok ? '✓' : (r.optional ? '·' : '✗');
    console.log(`  ${mark} ${r.label.padEnd(34)} ${r.secs.padStart(4)}s`);
  }
  console.log(`  ${'total'.padEnd(36)} ${((Date.now() - started) / 1000).toFixed(0).padStart(4)}s`);
  console.log('═'.repeat(60));
}

/* ── 1·2. 빌드 ─────────────────────────────────────────────────── */
if (!noBuild) {
  step('Windows 설치 파일 (공개판)', ['run', 'dist:win']);
  /* Linux 는 WSL·Docker 가 없으면 tar.gz 로 대신한다 — 없다고 전체를 멈출 이유는 없다 */
  step('Linux 설치 파일 (공개판)', ['run', 'dist:linux'], { optional: true });
}

/* ── 3·4. 올리기 ───────────────────────────────────────────────── */
if (!noPublish) {
  const extra = dryRun ? ['--', '--dry-run'] : [];
  step('full 저장소에 올리기', ['run', 'push', ...extra]);

  /* 릴리스는 dist-electron 에 설치 파일이 있어야 한다.
     --no-build 로 돌렸거나 빌드가 실패했으면 올릴 것이 없으므로 선택 단계로 둔다. */
  if (!noRelease && !dryRun) {
    step('설치 파일 릴리스 (초안)', ['run', 'release:github'], { optional: true });
  } else if (!noRelease) {
    console.log('\n· --dry-run — skipping the release.');
  }

  step('공개판 갱신', ['run', 'sync:public', '--', dryRun ? '--dry-run' : '--push']);
}

report();
if (dryRun) console.log('\n--dry-run — nothing was uploaded.');
else if (!noPublish) console.log('\nNext: review the draft under GitHub → Releases and publish it.');
