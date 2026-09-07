#!/usr/bin/env node
/**
 * scripts/i18n-extract.mjs — 화면 하나의 한글을 뽑아 t() 로 바꾸고 사전에 넣는다
 *
 *  왜 도구를 만드나
 *    번역을 거치지 않은 한글이 881곳이었다. 손으로 옮기면 오타·누락이 반드시 생기고,
 *    무엇보다 **같은 실수를 반복**한다(치환이 조용히 빗나가는 것을 이미 여러 번 겪었다).
 *    기계가 할 수 있는 부분(찾기·바꾸기·키 만들기)은 기계에게 맡기고,
 *    사람은 **영어 문장**만 채운다.
 *
 *  쓰는 법
 *    1) 뽑기:   node scripts/i18n-extract.mjs <파일.vue> --dry     → 뭐가 바뀌는지 미리 본다
 *    2) 적용:   node scripts/i18n-extract.mjs <파일.vue> --apply   → 파일을 고치고 ko 사전에 넣는다
 *    3) 영어:   생성된 en 키의 값을 사람이 채운다 (자동 번역은 하지 않는다)
 *
 *  겪은 함정 (도구에 반영됨)
 *    · 이미 t('...') 안에 있는 문자열을 또 바꿔 `t('ns.k2t('ns.k14')...')` 가 만들어졌다
 *    · 값에 줄바꿈이 들어가 사전 파일이 통째로 깨졌다
 *    · 문장이 <code> 태그로 잘게 쪼개진 화면은 조각조각 잘려 뜻이 사라졌다
 *      → 그런 화면은 이 도구로 하지 말고 문장 단위로 손봐야 한다
 *
 *  안전장치
 *    · 주석·개발자 로그·이미 t() 를 거친 것은 건드리지 않는다
 *    · 바꾼 뒤 원문과 한 글자라도 다르면(공백 제외) 되돌린다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!file) { console.error('사용: node scripts/i18n-extract.mjs <파일.vue> [--apply]'); process.exit(2); }

const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
const src = fs.readFileSync(abs, 'utf8');
const base = path.basename(abs, '.vue');
/** 네임스페이스: SecureColumnsPage → secureColumns */
const ns = base.replace(/Page$|View$|Dialog$|Modal$/, '').replace(/^[A-Z]/, (c) => c.toLowerCase());

const KR = /[가-힣]/;
const items = [];       // { ko, key, kind }
const seen = new Map(); // ko → key

function keyFor(ko) {
  if (seen.has(ko)) return seen.get(ko);
  const k = `k${seen.size + 1}`;
  seen.set(ko, k);
  items.push({ ko, key: k });
  return k;
}

/** 템플릿 부분만 잘라 낸다 (주석 제외) */
const tplMatch = src.match(/<template>([\s\S]*)<\/template>/);
if (!tplMatch) { console.error('template 을 찾지 못했습니다'); process.exit(2); }
let tpl = tplMatch[1];
const tplStart = tplMatch.index + '<template>'.length;

/** ① 태그 사이의 순수 텍스트 (앞뒤 공백 보존) */
tpl = tpl.replace(/>([^<>{}]*[가-힣][^<>{}]*)</g, (m, text) => {
  if (!KR.test(text)) return m;
  const lead = text.match(/^\s*/)[0];
  const tail = text.match(/\s*$/)[0];
  const core = text.trim();
  if (!core || !KR.test(core)) return m;
  return `>${lead}{{ t('${ns}.${keyFor(core)}') }}${tail}<`;
});

/** ② 사용자에게 보이는 속성 (title · placeholder · label · aria-label · alt) */
tpl = tpl.replace(/(\s)(title|placeholder|label|aria-label|alt)="([^"]*[가-힣][^"]*)"/g,
  (m, sp, attr, val) => `${sp}:${attr}="t('${ns}.${keyFor(val)}')"`);

/** ③ 템플릿 식 안의 따옴표 문자열 — `{{ x ? '복사됨' : '복사' }}` 처럼
 *   ⚠ 이미 t('...') 로 감싸진 것은 건드리면 안 된다.
 *     처음에 이 조건을 빼먹어 `t('ns.k2t('ns.k14')mci.mciVarName')` 같은 것이 만들어져 화면이 깨졌다.
 *     그래서 t( 바로 뒤에 오는 따옴표는 지나친다. */
/*  ⚠ 백틱 문자열(`...${x}...`) 안은 건드리지 않는다.
 *    안에 들어가면 따옴표 짝이 어긋나 식이 통째로 깨진다
 *    (`막혀 있음 — ${...} || 't('ns.k13')이 컨트롤러를...'` 같은 것이 만들어졌다).
 *    백틱이 섞인 식은 뜻을 나눠야 해서 **사람이 손봐야 한다.** */
tpl = tpl.split('\n').map((line) => {
  /* 백틱·역슬래시가 있는 줄은 건너뛴다.
     ⚠ 이미 t( 가 들어 있는 줄도 건너뛴다 — 한 문장이 t() 를 품고 있으면
       그 앞뒤 조각만 따로 바꿔 봐야 뜻이 깨지고, 중첩 치환까지 난다
       (`t('logs.k1t('logs.k18')logs2.search')` 가 만들어졌다). */
  if (line.includes('`') || line.includes('\\') || /\bt\(/.test(line)) return line;
  return line.replace(/(\bt\(\s*)?'([^'\n]*[가-힣][^'\n]*)'/g,
    (m, tPrefix, val) => (tPrefix ? m : `t('${ns}.${keyFor(val)}')`));
}).join('\n');

/* ④ 스크립트의 화면용 문자열 — 대화상자 문구·버튼 라벨 등.
     ⚠ 아무 문자열이나 바꾸면 안 된다. 다음만 손댄다:
        · 객체 속성 값 중 화면에 쓰이는 이름 (title · html · confirmText · cancelText · label · text · desc · placeholder)
        · 기본값 매개변수 (confirmText = '확인')
     console·logger·throw 가 있는 줄과 주석은 건드리지 않는다. */
const scrMatch = src.match(/<script[^>]*>([\s\S]*?)<\/script>/);
let scr = scrMatch ? scrMatch[1] : '';
const scrStart = scrMatch ? scrMatch.index + scrMatch[0].indexOf('>') + 1 : -1;
const UI_PROPS = /\b(title|html|confirmText|cancelText|label|text|desc|description|placeholder|okText|message)\s*([:=])\s*'([^'\n]*[가-힣][^'\n]*)'/g;   // t( 로 시작하는 값은 애초에 따옴표로 시작하지 않아 안전하다
if (scr) {
  scr = scr.split('\n').map((line) => {
    if (/console\.|logger|throw new Error|^\s*\*|^\s*\/\//.test(line)) return line;
    if (line.includes('`')) return line;               // 백틱 줄은 사람이 손본다 (위 설명 참고)
    /* ⚠ 역슬래시가 있는 줄도 건너뛴다 — 정규식 안의 이스케이프를 문자열로 착각해
       `replace(/[.*+?^${}()|[\]\\]/g, '\\` 처럼 줄이 통째로 잘려 파일이 깨졌다. */
    if (line.includes('\\')) return line;
    return line.replace(UI_PROPS, (m, prop, sep, val) => `${prop}${sep} t('${ns}.${keyFor(val)}')`);
  }).join('\n');
}

if (!items.length) { console.log('바꿀 한글이 없습니다.'); process.exit(0); }

let out = src.slice(0, tplStart) + tpl + src.slice(tplStart + tplMatch[1].length);
if (scr && scrStart >= 0) {
  /* 템플릿을 바꾼 뒤라 위치가 달라졌다 — 원문에서 스크립트 부분만 다시 찾아 바꾼다 */
  /* ⚠ 치환 문자열 안의 `$&` `$'` 같은 것은 **특수 기호로 해석된다.**
     정규식이 들어 있는 코드를 그대로 넣었더니 줄이 잘려 파일이 깨졌다(SqlEditor 두 번).
     함수로 돌려주면 해석하지 않는다. */
  out = out.replace(scrMatch[1], () => scr);
}

console.log(`${path.relative(ROOT, abs)} — ${items.length}개`);
for (const it of items) console.log(`  ${ns}.${it.key}  ${it.ko}`);

if (!APPLY) { console.log('\n(미리보기입니다. 적용하려면 --apply)'); process.exit(0); }

fs.writeFileSync(abs, out, 'utf8');

/** ko 사전에 넣는다 (en 은 사람이 채운다 — 자동 번역은 하지 않는다) */
const koPath = path.join(ROOT, 'admin-client/src/locales/ko.js');
const enPath = path.join(ROOT, 'admin-client/src/locales/en.js');
/* ⚠ 값에 줄바꿈이 들어가면 사전 파일이 통째로 깨진다(실제로 겪었다).
     여러 줄 텍스트는 한 줄로 접어서 담는다. */
const esc = (s) => s.replace(/\s*\n\s*/g, ' ').trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const koBlock = `  ${ns}: {\n${items.map((i) => `    ${i.key}: '${esc(i.ko)}',`).join('\n')}\n  },\n`;
const enBlock = `  ${ns}: {\n${items.map((i) => `    ${i.key}: 'TODO: ${esc(i.ko)}',`).join('\n')}\n  },\n`;
for (const [p, block] of [[koPath, koBlock], [enPath, enBlock]]) {
  let s = fs.readFileSync(p, 'utf8');
  if (new RegExp(`\\n  ${ns}: \\{`).test(s)) {
    /* ⚠ 여기서 그냥 넘어가면 **화면에는 키가, 사전에는 값이 없는** 상태가 된다.
       실제로 그래서 화면에 `controllerList.k1` 이 그대로 보였다. 크게 알린다. */
    console.error(`\n⚠⚠ ${ns} 블록이 이미 있어 사전에 넣지 못했습니다.`);
    console.error(`   화면에는 t('${ns}.kN') 이 들어갔는데 사전에 값이 없으면 **키가 그대로 보입니다.**`);
    console.error(`   아래 목록을 ${path.basename(p)} 의 ${ns} 블록에 손으로 합치거나,`);
    console.error(`   **겹치지 않는 다른 이름**(예: ${ns}Msg)을 쓰세요.`);
    console.error(`   ⚠ ${ns}2 처럼 숫자를 붙이는 것도 이미 쓰이고 있을 수 있습니다 — 반드시 확인하세요.\n`);
    continue;
  }
  s = s.replace(/^export default \{\n/m, (m) => m + block);
  fs.writeFileSync(p, s, 'utf8');
}
console.log(`\n적용했습니다. en.js 의 "TODO:" 를 영어로 바꾸세요 (${items.length}개).`);
