#!/usr/bin/env node
/**
 * scripts/git-release.mjs — 빌드 결과를 GitHub 릴리스로 올린다. (`npm run release:github`)
 *
 *  먼저 빌드해 두세요:
 *    npm run dist:win      Windows 설치 파일 (dist-electron/*.exe)
 *    npm run dist:linux    Linux AppImage    (dist-electron/*.AppImage)
 *    npm run dist:all      둘 다
 *
 *  ⚠ `-full` 이 붙은 설치 파일은 올리지 않습니다. 공개 릴리스이기 때문입니다.
 *    (Enterprise 업로드는 --to-full --allow-full 과 실제 private 저장소 확인이 필요합니다)
 *
 *  .env: GITHUB_TOKEN · PUBLIC_REPO (릴리스가 가는 곳) · GITHUB_REPO (--to-full 일 때)
 *  태그는 package.json 의 version 을 씁니다 — v1.32.0 처럼.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readEnv = () => {
  const out = {};
  const p = path.join(ROOT, '.env');
  if (fs.existsSync(p)) for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return { ...out, ...process.env };
};

const env = readEnv();
/* full 판 설치 파일은 기본으로 올리지 않는다 — 아래 isFull 참고 */
const allowFull = process.argv.slice(2).includes('--allow-full');
const token = env.GITHUB_TOKEN || env.GH_TOKEN;
/**
 * ★ v1.35.4 — 릴리스는 **공개 저장소**로 간다.
 *
 *  예전에는 GITHUB_REPO(= full, private)로 올렸다. 그쪽은 개발용이라
 *  사용자가 볼 수 없는 곳이다. 릴리스는 사람들이 설치 파일을 받는 자리이므로
 *  PUBLIC_REPO 여야 한다. 설치 파일 자체도 공개판만 만들어 올린다.
 *
 *  --to-full 을 주면 사내 배포용으로 full 저장소에 올릴 수 있다.
 */
const toFull = process.argv.slice(2).includes('--to-full');
const repo = toFull ? env.GITHUB_REPO : env.PUBLIC_REPO;
if (allowFull && !toFull) throw new Error('--allow-full requires --to-full and a private repository');
if (repo && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error('Invalid repository name');

if (!token || !repo) {
  console.error(`✗ .env needs GITHUB_TOKEN and ${toFull ? 'GITHUB_REPO' : 'PUBLIC_REPO'}.`);
  process.exit(1);
}

console.log(`Release target: ${repo}${toFull ? '  (--to-full · internal)' : '  (public repository)'}`);

const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const tag = `v${version}`;
/* ★ v1.33.3 — 빌드 산출물 폴더는 package.json 의 build.directories.output 을 따른다.
   여기에 'dist-release' 를 박아 두었는데 실제 설정은 'dist-electron' 이라 무조건 실패했다.
   한 곳(package.json)만 보고 정하도록 고친다. */
const buildCfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).build || {};
const distDir = path.join(ROOT, buildCfg.directories?.output || 'dist');
if (!fs.existsSync(distDir)) {
  console.error(`✗ ${distDir} does not exist.`);
  console.error('  Build first:  npm run dist:win   (or dist:linux · dist:all)');
  process.exit(1);
}

/* 올릴 파일 — 설치 파일만 (blockmap·yml 같은 부산물은 뺀다) */
const all = fs.readdirSync(distDir)
  .filter((f) => /\.(exe|AppImage|deb|rpm|zip|dmg)$/i.test(f) || /\.tar\.gz$/i.test(f));

/**
 * ★ v1.35.2 — **full 판은 절대 공개 릴리스에 올리지 않는다.**
 *
 *  `npm run dist:win:full` 을 한 번이라도 돌리면 `-full` 이 붙은 설치 파일이
 *  dist-electron 에 남는다. 예전에는 확장자만 보고 골랐기 때문에, 그 다음에
 *  release:github 을 돌리면 **MCI·이중화가 들어간 설치 파일이 공개 릴리스로 나갔다.**
 *
 *  파일 이름으로 거른다. 이름 규칙은 build-edition.mjs 가 붙이는 `-full` 이다.
 *  --allow-full 을 주면 올릴 수 있지만, 그때도 무엇이 올라가는지 크게 알린다.
 */
const isFull = (f) => /-full[-.]/i.test(f);

/**
 * ★ v1.35.3 — **이번 버전 파일만** 올린다.
 *
 *  dist-electron 은 빌드할 때마다 비워지지 않는다. 여러 번 빌드하면 옛 버전 설치 파일이
 *  그대로 쌓이고, 확장자만 보고 고르면 그것들도 함께 올라간다.
 *  실측: v1.30.0 · v1.31.0 을 섞어 두었더니 v1.35.2 릴리스에 3개가 올라갔다.
 *
 *  전자 빌더가 파일 이름에 버전을 넣으므로(artifactName), 이름으로 거른다.
 */
const versionPattern = new RegExp(`(?:^|-)${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=-|\\.(?:exe|AppImage|deb|rpm|zip|dmg|tar\\.gz)$)`, 'i');
const forThisVersion = (f) => versionPattern.test(f);
const stale = all.filter((f) => !forThisVersion(f));
const fullOnes = all.filter((f) => forThisVersion(f) && isFull(f));

const assets = all
  .filter(forThisVersion)
  .filter((f) => allowFull || !isFull(f))
  .map((f) => path.join(distDir, f));

if (stale.length) {
  console.log(`\n· skipping ${stale.length} files from other versions (this is v${version}):`);
  for (const f of stale.slice(0, 6)) console.log(`    ${f}`);
  if (stale.length > 6) console.log(`    … and ${stale.length - 6} more`);
  console.log('  For a clean build, delete dist-electron and rebuild.');
}

if (fullOnes.length && !allowFull) {
  console.log(`\n⚠ not uploading ${fullOnes.length} full-edition files (this is a public release):`);
  for (const f of fullOnes) console.log(`    ${f}`);
  console.log('  If someone needs the full edition, hand them the file directly.');
}
if (!assets.length) {
  /* ★ v1.41.4 — **왜** 없는지 말해 준다.
     "설치 파일이 없다" 만 보면 빌드가 깨진 줄 알지만, 대개는 원인이 다르다:
     package.json 을 올린 뒤 다시 빌드하지 않아 **옛 버전 파일만 남은 것**이다.
     실제로 그 상황을 에러로 오해한 적이 있다. 무엇을 하면 되는지까지 적는다. */
  const inFolder = fs.readdirSync(distDir);
  const installers = inFolder.filter((f) => /\.(exe|AppImage|dmg|deb|tar\.gz)$/i.test(f));

  if (installers.length) {
    console.error(`✗ ${distDir} has installers, but none for v${version}.`);
    console.error(`  Found: ${installers.join(', ')}`);
    console.error(`  These were built from an earlier version. Build this one first:`);
    console.error('     npm run dist:win        (or dist:linux · dist:all)');
    console.error('  Or run everything in order:  npm run all');
  } else {
    console.error(`✗ no installers in ${distDir}.`);
    console.error(`  What is in that folder: ${inFolder.slice(0, 10).join(', ') || '(empty)'}`);
    console.error('  Build first:  npm run dist:win');
  }
  process.exit(1);
}

console.log(`Release ${tag} — ${assets.length} files`);
for (const a of assets) console.log('  ', path.basename(a), `(${(fs.statSync(a).size / 1024 / 1024).toFixed(1)} MB)`);

const api = async (url, init = {}) => {
  const r = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text().catch(() => '')}`.slice(0, 200));
  return r.json();
};

if (toFull || allowFull) {
  const targetRepository = await api(`https://api.github.com/repos/${repo}`);
  if (targetRepository.private !== true) throw new Error('Enterprise releases require a verified private repository');
}

/**
 * ★ v1.33.4 — 릴리스 설명을 CHANGELOG 에서 만든다.
 *
 *  예전에는 "aidot-express v1.33.3" 한 줄뿐이라, 받는 사람이 무엇이 바뀌었는지 알 수 없었다.
 *  CHANGELOG 에 이미 이번 판 이야기가 있으므로 그 절만 잘라 쓴다 — 두 번 쓸 이유가 없다.
 *
 *  ⚠ 만들어진 설명은 GitHub 사이트에서 언제든 고칠 수 있다(Releases → Edit).
 *    여기서 만드는 것은 **초안**이지 최종본이 아니다.
 */
let notesFile = 'RELEASE_NOTES.md';

function releaseNotes(version) {
  /* ★ v1.35.4 — 릴리스 설명은 **RELEASE_NOTES.md** 에서 가져온다.
     예전에는 CHANGELOG.md 를 썼는데, 그것은 한글 사내 기록이라
     공개 릴리스 화면에 한글이 그대로 나갔다. CHANGELOG 는 공개 저장소에도
     나가지 않는 파일인데 그 내용만 릴리스로 새어 나간 셈이다.
     RELEASE_NOTES.md 는 영문이고, 사용자가 알아차릴 변화만 적는다. */
  const head = `## v${version} `;
  try {
    notesFile = fs.existsSync(path.join(ROOT, 'RELEASE_NOTES.md'))
      ? 'RELEASE_NOTES.md' : 'CHANGELOG.md';
    const md = fs.readFileSync(path.join(ROOT, notesFile), 'utf8');
    const start = md.indexOf(head);
    if (start < 0) return null;
    /* 다음 판 제목 전까지가 이번 판이다 */
    const next = md.indexOf('\n## ', start + head.length);
    let body = md.slice(start, next < 0 ? undefined : next).trim();
    /* 첫 줄(제목)은 릴리스 이름으로 따로 쓰므로 본문에서는 뺀다 */
    const nl = body.indexOf('\n');
    const title = body.slice(0, nl).replace(/^##\s*/, '').trim();
    body = body.slice(nl + 1).trim();
    return { title, body };
  } catch { return null; }
}

/* 이미 있으면 그것을 쓰고, 없으면 만든다 (다시 돌려도 안전하게) */
const notes = releaseNotes(version);
if (notes) console.log(`Description comes from the "${notes.title}" section of ${notesFile}.`);
else console.log('⚠ RELEASE_NOTES.md has no section for this version — using a default description. Please add one.');

/** GitHub 이 거절했을 때, 무엇이 문제인지 알려 준다 */
function explain(e) {
  const m = String(e.message || '');
  if (m.startsWith('401')) return '토큰이 잘못됐거나 만료됐습니다. .env 의 GITHUB_TOKEN 을 확인하세요.';
  if (m.startsWith('403')) return '토큰에 권한이 없습니다. 이 저장소에 Contents: Read and write 를 주세요.';
  if (m.startsWith('404')) return `저장소를 찾지 못했습니다: ${repo} (이름과 접근 권한을 확인하세요)`;
  if (m.startsWith('422')) return '같은 태그가 이미 다른 커밋에 붙어 있을 수 있습니다.';
  return m.slice(0, 160);
}

let release;
try {
  release = await api(`https://api.github.com/repos/${repo}/releases/tags/${tag}`);
  console.log(`\nAdding to the existing release: ${tag}`);
} catch {
  try {
  release = await api(`https://api.github.com/repos/${repo}/releases`, {
    method: 'POST',
    body: JSON.stringify({
      tag_name: tag,
      name: notes?.title || tag,
      body: (notes?.body || `aidot-express ${tag}`)
        /* ★ v1.35.4 — 이 안내도 릴리스 화면에 그대로 보인다. 영문이어야 한다. */
        + `\n\n---\n\n### Downloads\n`
        + `\n**Windows** — download the \`.exe\` and run it.`
        + `\n\n**Linux** — \`.AppImage\`: make it executable and run it.`
        + `\n\n\`\`\`bash\nchmod +x 'Aidot Express-${version}.AppImage'\n./'Aidot Express-${version}.AppImage'\n\`\`\``
        + `\n\n\`.tar.gz\`: unpack it and run the binary inside.`
        + `\n\nThe console opens at http://localhost:7901. Use your configured initial credentials and complete the required password change.`
        + ` \`.tar.gz\` 는 풀어서 안의 실행 파일을 실행`,
      /* 초안으로 만든다 — 내용을 확인하고 사이트에서 Publish 를 눌러야 공개된다.
         잘못 올린 릴리스를 되돌리는 것보다, 한 번 보고 내보내는 편이 안전하다. */
      draft: true,
      prerelease: false,
    }),
  });
  console.log(`\nDraft release created: ${tag}`);
  } catch (e) {
    console.error(`\n✗ Could not create the release — ${explain(e)}`);
    process.exit(1);
  }
}

for (const file of assets) {
  const name = path.basename(file);
  /* 같은 이름이 이미 있으면 지우고 다시 올린다 — 반쯤 올라간 파일을 남기지 않는다 */
  const dup = (release.assets || []).find((a) => a.name === name);
  if (dup) await api(`https://api.github.com/repos/${repo}/releases/assets/${dup.id}`, { method: 'DELETE' }).catch(() => {});
  process.stdout.write(`  uploading ${name} … `);
  const up = release.upload_url.replace(/\{.*$/, '') + `?name=${encodeURIComponent(name)}`;
  try {
    await api(up, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(fs.statSync(file).size) },
      body: fs.readFileSync(file),
    });
    console.log('done');
  } catch (e) {
    console.log('failed');
    console.error(`   → ${explain(e)}`);
    process.exitCode = 1;
  }
}
console.log(`\nDone → https://github.com/${repo}/releases`);
console.log('  It is still a **draft**. Review it and press [Publish release] to make it public.');
console.log('  You can change the description, title and files on that page any time.');
