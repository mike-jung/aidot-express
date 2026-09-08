#!/usr/bin/env node
/**
 * apply-text.mjs — 번역문을 pptx 에 넣는다.
 *
 *  ⚠ XML 을 파서로 돌리지 않는다. OOXML 을 ElementTree 류로 왕복시키면
 *    이름공간 접두사가 바뀌어 PowerPoint 가 파일을 못 연다(pptx 스킬의 경고).
 *    그래서 `<a:t>…</a:t>` 안쪽만 문자열로 바꾼다 — 나머지 바이트는 손대지 않는다.
 *
 *  ★ v1.37.1 — **문단 단위**로 바꾼다. 번역문을 **첫 조각에 몰아 넣고 나머지를 비운다.**
 *    조각 단위로는 `따라하`/`기` 처럼 낱말이 갈려 번역이 되지 않았다.
 *    첫 조각의 서식이 문단에 적용되므로 굵게·색은 살아 있다.
 *
 *    npm run tut:apply -- docs/aidot-express-tutorial-v1.32.0.pptx
 *    npm run tut:apply -- ... --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const src = args.find((a) => !a.startsWith('--')) || 'docs/aidot-express-tutorial-v1.32.0.pptx';
const mapFile = 'docs/tutorial-i18n/strings.json';

const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const translated = Object.fromEntries(
  Object.entries(map).filter(([, v]) => v.en && v.en.trim()).map(([k, v]) => [k, v.en]));

const total = Object.keys(map).length;
const done = Object.keys(translated).length;
console.log(`translated ${done}/${total} (${Math.round(done / total * 100)}%)`);
if (!done) { console.log('No translations yet. Fill in the "en" fields in strings.json.'); process.exit(0); }

const tmp = fs.mkdtempSync('/tmp/tut-apply-');
execFileSync('python3', ['-c',
  'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', src, tmp]);

/** XML 특수문자 — 넣는 쪽도 이스케이프해야 파일이 깨지지 않는다 */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 뽑을 때 이스케이프된 것을 되돌린다 (키가 원문과 맞아야 한다) */
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const slideDir = path.join(tmp, 'ppt', 'slides');
const slides = fs.readdirSync(slideDir).filter((f) => /^slide\d+\.xml$/.test(f));
let replaced = 0, missed = 0;
const missing = new Set();

for (const f of slides) {
  const fp = path.join(slideDir, f);
  const before = fs.readFileSync(fp, 'utf8');

  /* 문단마다: 조각을 이어 키를 만들고, 번역문을 첫 조각에 넣고 나머지는 비운다 */
  const after = before.replace(/<a:p>([\s\S]*?)<\/a:p>/g, (whole, body) => {
    const runs = [...body.matchAll(/<a:t>([^<]*)<\/a:t>/g)];
    if (!runs.length) return whole;
    const key = unesc(runs.map((m) => m[1]).join(''));
    if (!/[\uAC00-\uD7A3]/.test(key)) return whole;
    const en = translated[key];
    if (!en) { missed += 1; missing.add(key); return whole; }

    replaced += 1;
    let i = 0;
    const newBody = body.replace(/<a:t>[^<]*<\/a:t>/g, () =>
      (i++ === 0 ? `<a:t>${esc(en)}</a:t>` : '<a:t></a:t>'));
    return `<a:p>${newBody}</a:p>`;
  });
  if (!dryRun && after !== before) fs.writeFileSync(fp, after, 'utf8');
}

console.log(`  ${replaced} paragraphs replaced · ${missed} still untranslated (${missing.size} distinct strings)`);

if (dryRun) {
  console.log('\n--dry-run — nothing written.');
  if (missing.size) {
    console.log('\nStill untranslated (first 5):');
    for (const k of [...missing].slice(0, 5)) console.log(`  ${k.slice(0, 50)}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(0);
}

const out = src;
fs.rmSync(out, { force: true });
execFileSync('bash', ['-c', `cd '${tmp}' && zip -Xrq '${path.resolve(out)}' .`]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n→ ${out}`);
console.log('  Next: npm run tut:check to look for overflow.');
