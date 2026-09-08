#!/usr/bin/env node
/**
 * extract-text.mjs — pptx 에서 번역할 문자열을 뽑는다.
 *
 *  왜 스크립트인가
 *    75쪽 · 조각 1,946개다. 손으로 옮기면 어디까지 했는지 잃어버리고,
 *    같은 말이 슬라이드마다 다르게 번역된다.
 *
 *  ★ v1.37.1 — **문단(`<a:p>`) 단위**로 뽑는다.
 *
 *    처음에는 조각(`<a:t>`) 단위로 뽑았는데, PowerPoint 는 한 문장도 굵게·색이
 *    바뀔 때마다 조각을 나눈다. 실제로 `따라하` / `기` 처럼 **한 낱말이 둘로**
 *    갈려 있었다 — 3자 이하 조각만 374개였다. 조각마다 번역하면 문장이 되지 않는다.
 *
 *    그래서 문단으로 이어 붙여 뽑고, 넣을 때는 **첫 조각에 몰아 넣고 나머지를 비운다.**
 *    첫 조각의 서식이 문단 전체에 적용되므로 굵게·색은 살아 있다.
 *    (문단 안에서 낱말마다 색이 다른 경우는 그 색을 잃는다 — 튜토리얼에는 없었다)
 *
 *    npm run tut:extract -- docs/aidot-express-tutorial-v1.32.0.pptx
 *      → docs/tutorial-i18n/strings.json  (없으면 만들고, 있으면 새 것만 더한다)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const src = process.argv[2] || 'docs/aidot-express-tutorial-v1.32.0.pptx';
const outDir = 'docs/tutorial-i18n';
const outFile = path.join(outDir, 'strings.json');

const tmp = fs.mkdtempSync('/tmp/tut-');
execFileSync('python3', ['-c',
  'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', src, tmp]);

const slideDir = path.join(tmp, 'ppt', 'slides');
const slides = fs.readdirSync(slideDir)
  .filter((f) => /^slide\d+\.xml$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const KO = /[\uAC00-\uD7A3]/;
/* 번역하지 않을 것 — 코드·경로·명령은 그대로 두어야 따라 할 수 있다 */
const SKIP = [
  /^[\s\d.,:;/\\|()[\]{}<>=+*&^%$#@!~`'"-]*$/,   /* 기호·숫자만 */
  /^(npm|node|git|curl|cd|mkdir|SELECT|INSERT|UPDATE|DELETE|CREATE)\b/i,
];

const existing = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const out = { ...existing };
let found = 0, added = 0;

for (const f of slides) {
  const n = Number(f.match(/\d+/)[0]);
  const xml = fs.readFileSync(path.join(slideDir, f), 'utf8');
  /* 문단 하나가 곧 한 문장이다 */
  for (const p of xml.split('<a:p>').slice(1)) {
    const body = p.split('</a:p>')[0];
    const t = [...body.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((x) => x[1]).join('')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    if (!t.trim()) continue;
    if (!KO.test(t)) continue;                 /* 한글이 없으면 그대로 둔다 */
    if (SKIP.some((re) => re.test(t))) continue;
    found += 1;
    if (!(t in out)) { out[t] = { en: '', slides: [n] }; added += 1; }
    else if (!out[t].slides.includes(n)) out[t].slides.push(n);
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
fs.rmSync(tmp, { recursive: true, force: true });

const done = Object.values(out).filter((v) => v.en).length;
console.log(`${slides.length} slides · ${found} Korean paragraphs`);
console.log(`  ${Object.keys(out).length} distinct strings (${added} new)`);
console.log(`  ${done} translated · ${Object.keys(out).length - done} remaining`);
console.log(`\n→ fill in the "en" fields in ${outFile}.`);
