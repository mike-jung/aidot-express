#!/usr/bin/env node
/**
 * check-overflow.mjs — 번역 뒤 글자가 상자를 넘치는지 본다.
 *
 *  왜 필요한가
 *    영문은 한글보다 보통 1.5~2배 길어진다. 넣고 나면 상자를 넘치거나 잘리는데,
 *    75쪽을 눈으로 보는 것은 현실적이지 않다. **넘칠 만한 곳만 먼저 골라 낸다.**
 *
 *  어떻게 재나
 *    PowerPoint 가 실제로 어떻게 줄바꿈할지는 렌더링해 봐야 안다. 그래서 두 단계다:
 *      ① 빠른 추정 — 상자 너비와 글꼴 크기로 들어갈 글자 수를 어림한다 (이 스크립트)
 *      ② 실제 확인 — 의심스러운 쪽만 PDF 로 뽑아 눈으로 본다
 *
 *    ①은 정확하지 않다. 어림잡아 **의심 목록을 좁히는 것**이 목적이다.
 *    잘못 짚어도 ②에서 걸러지고, 놓친 것은 ②에서 보인다.
 *
 *    npm run tut:check -- docs/aidot-express-tutorial-v1.32.0.pptx
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const src = process.argv[2] || 'docs/aidot-express-tutorial-v1.32.0.pptx';
const EMU_PER_INCH = 914400;

const tmp = fs.mkdtempSync('/tmp/tut-check-');
execFileSync('python3', ['-c',
  'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', src, tmp]);

const slideDir = path.join(tmp, 'ppt', 'slides');
const slides = fs.readdirSync(slideDir)
  .filter((f) => /^slide\d+\.xml$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

/**
 * 글꼴 크기(pt)에서 글자 하나의 너비를 어림한다.
 *  본문 글꼴은 대체로 0.5em 안팎이다. 영문 소문자 기준으로 잡는다.
 */
const charWidthInch = (pt) => (pt * 0.5) / 72;

const suspects = [];

for (const f of slides) {
  const n = Number(f.match(/\d+/)[0]);
  const xml = fs.readFileSync(path.join(slideDir, f), 'utf8');

  /* 도형 하나씩 — 상자 크기와 그 안의 글이 함께 있는 단위다 */
  for (const sp of xml.split('<p:sp>').slice(1)) {
    const ext = /<a:ext cx="(\d+)" cy="(\d+)"/.exec(sp);
    if (!ext) continue;
    const wIn = Number(ext[1]) / EMU_PER_INCH;
    const hIn = Number(ext[2]) / EMU_PER_INCH;
    if (wIn < 0.3 || hIn < 0.15) continue;              /* 너무 작으면 글상자가 아니다 */

    /* 자동 축소가 켜져 있으면 PowerPoint 가 알아서 줄인다 — 넘치지 않는다 */
    if (/<a:normAutofit/.test(sp)) continue;

    const text = [...sp.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join('');
    if (!text.trim()) continue;
    if (/[\uAC00-\uD7A3]/.test(text)) continue;          /* 아직 한글 — 번역 전이다 */

    /* 글꼴 크기: sz 는 100배 값이다 (1800 = 18pt). 없으면 본문 기본값으로 본다 */
    const szs = [...sp.matchAll(/sz="(\d+)"/g)].map((m) => Number(m[1]) / 100);
    const pt = szs.length ? Math.max(...szs) : 18;

    const perLine = Math.max(1, Math.floor(wIn / charWidthInch(pt)));
    const lines = Math.ceil(text.length / perLine);
    const lineHeightIn = (pt * 1.25) / 72;               /* 줄 간격 1.25 로 어림 */
    const neededIn = lines * lineHeightIn;

    /* ★ 문턱을 20% 로 잡는다.
       실측: 35쪽 +65% 는 실제로 넘쳤고(순서 줄이 상자 밖), +7~12% 는 멀쩡했다.
       어림값이므로 낮게 잡으면 멀쩡한 곳까지 불러 목록이 쓸모없어진다. */
    if (neededIn > hIn * 1.20) {
      suspects.push({
        slide: n,
        text: text.slice(0, 46) + (text.length > 46 ? '…' : ''),
        chars: text.length,
        box: `${wIn.toFixed(1)}×${hIn.toFixed(1)}"`,
        need: `${neededIn.toFixed(1)}"`,
        over: Math.round((neededIn / hIn - 1) * 100),
      });
    }
  }
}

fs.rmSync(tmp, { recursive: true, force: true });

suspects.sort((a, b) => b.over - a.over);
if (!suspects.length) {
  console.log(`${slides.length} slides — nothing looks like it will overflow.`);
  console.log('  (an estimate — render to PDF and check by eye to be sure.)');
  process.exit(0);
}

console.log(`${slides.length} slides · ${suspects.length} likely overflows\n`);
for (const s of suspects.slice(0, 25)) {
  /* 넘침 정도로 나눈다 — 50% 넘으면 거의 확실하다 */
  const mark = s.over >= 50 ? '⚠ 확실' : '· 의심';
  console.log(`  ${mark}  ${String(s.slide).padStart(3)}  +${String(s.over).padStart(3)}%  ${s.box} → ${s.need}`);
  console.log(`        ${s.text}`);
}
if (suspects.length > 25) console.log(`\n  … and ${suspects.length - 25} more`);

const pages = [...new Set(suspects.map((s) => s.slide))].sort((a, b) => a - b);
console.log(`\nSlides to check: ${pages.join(' ')}`);
console.log('  Render to PDF and look at just those — this is an estimate.');
process.exit(1);
