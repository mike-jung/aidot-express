/**
 * check-i18n.mjs — 다국어 상태 점검. `npm run check:i18n`
 *
 *  두 가지를 본다.
 *   ① **사전 키가 언어끼리 어긋나지 않는가** — 어긋나면 조용히 영어가 섞인다.
 *   ② **화면에 아직 하드코딩된 문구가 얼마나 남았는가** — 진행률을 정직하게 센다.
 *
 *  ⚠ ②를 "실패" 로 만들지 않는다. 2,000줄이 넘는 문구를 한 번에 옮길 수는 없고,
 *    빌드를 막으면 아무도 이 검사를 켜 두지 않는다. **보이게 하는 것**이 목적이다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'admin-client', 'src');
const LOCALES = path.join(SRC, 'locales');

/* ── ① 키 정합 ─────────────────────────────────────────────────────────── */
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));

const codes = fs.existsSync(LOCALES)
  ? fs.readdirSync(LOCALES).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3))
  : [];
if (!codes.includes('en')) {
  console.error('  en.js is missing — English is the fallback.');
  process.exit(1);
}

const cat = {};
for (const c of codes) {
  const raw = fs.readFileSync(path.join(LOCALES, `${c}.js`), 'utf8');
  for (const k of duplicateSections(raw)) {
    problems.push(`${c}.js: '${k}' 구역이 두 번 정의됐습니다 — 뒤의 것이 앞을 덮어 키가 사라집니다`);
  }
}

for (const c of codes) {
  cat[c] = flat((await import(pathToFileURL(path.join(LOCALES, `${c}.js`)).href)).default);
}
const base = cat.en;
const problems = [];

/* ── ①-f 같은 구역이 두 번 정의되지 않았는가 ──────────────────────────────
   JS 객체는 뒤의 것이 앞을 **통째로 덮는다.** `traceList` 를 두 번 쓰면
   앞 블록의 키가 전부 사라지는데, 문법 오류가 아니라 조용히 지나간다.
   실제로 그렇게 7개 키가 없어져 화면에 키 이름이 그대로 떴다. */
function duplicateSections(text) {
  const seen = new Map();
  const dup = [];
  for (const m of text.matchAll(/(?:^|\n)  (\w+): \{/g)) {
    const k = m[1];
    if (seen.has(k)) dup.push(k); else seen.set(k, true);
  }
  return [...new Set(dup)];
}

for (const c of codes) {
  if (c === 'en') continue;
  const miss = base.filter((k) => !cat[c].includes(k));
  const extra = cat[c].filter((k) => !base.includes(k));
  if (miss.length) problems.push(`${c}: 누락 ${miss.length}개 — ${miss.slice(0, 5).join(', ')}${miss.length > 5 ? ' …' : ''}`);
  if (extra.length) problems.push(`${c}: en 에 없는 키 ${extra.length}개 — ${extra.slice(0, 5).join(', ')}`);
}

/* ★ v1.10.24 — 파라미터가 언어끼리 어긋나지 않는가.
   `{label}` 이 한쪽에만 있으면, 그 언어에서는 값이 빠지거나
   `{label}` 이 그대로 화면에 뜬다. 키 이름은 일치하므로 ①이 놓친다. */
const dig = (o, k) => k.split('.').reduce((a, x) => (a == null ? a : a[x]), o);
const paramsOf = (v) => new Set(String(v ?? '').match(/\{(\w+)\}/g) || []);
for (const c of codes) {
  if (c === 'en') continue;
  const raw = (await import(pathToFileURL(path.join(LOCALES, `${c}.js`)).href)).default;
  const enRaw = (await import(pathToFileURL(path.join(LOCALES, 'en.js')).href)).default;
  for (const k of base) {
    const a = paramsOf(dig(enRaw, k));
    const b = paramsOf(dig(raw, k));
    if (a.size !== b.size || [...a].some((x) => !b.has(x))) {
      problems.push(`${c}: ${k} — 파라미터 불일치 en{${[...a]}} ${c}{${[...b]}}`);
    }
  }
}

console.log(`\n  dictionaries  ${codes.join(' · ')}  ·  ${base.length} keys`);
if (problems.length) for (const p of problems) console.log(`  FAIL  ${p}`);
else console.log('  OK    keys match across all languages');

/* ── ①-b 흔한 실수: 바인딩 표현식 안의 {{ }} ──────────────────────────────
   `:title="a ? '{{ t('x') }}' : ..."` 처럼 **이미 JS 표현식인 속성** 안에
   머스태시를 넣으면 파싱이 깨진다. 옮기다가 실제로 한 번 냈다.
   문법 검사(check:sfc)가 잡아 주지만, 여기서 잡으면 원인이 바로 보인다. */
function mustacheInBinding(text) {
  const hits = [];
  const re = /(?::|v-bind:|@)[\w.:-]+="([^"]*\{\{[^"]*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const expr = m[1];
    /* ⚠ 오탐 주의: 안내 문구가 Handlebars 문법을 **설명**하는 경우가 있다
         (`:placeholder="'… {{변수}}, {{#if x}} …'"`). 그건 정상이다.
       실제 문제는 `{{ t('x') }}` 처럼 **머스태시 안에서 t() 를 부르는** 경우다 —
       속성값은 이미 JS 표현식이라 머스태시가 그대로 문자열에 박혀 파싱이 깨진다. */
    if (!/\{\{\s*t\s*\(/.test(expr)) continue;
    hits.push(m[0].slice(0, 70));
  }
  return hits;
}

/* ── ①-c 흔한 실수: <script> 안의 머스태시 ────────────────────────────────
   `<script>` 블록 안의 HTML 문자열까지 일괄 치환하면 `{{ t('x') }}` 가 박힌다.
   템플릿 밖이라 **머스태시가 동작하지 않고**, 작은따옴표 문자열 안에 t(') 가
   들어가 문법까지 깨진다. 옮기다가 실제로 한 번 냈다. */
function mustacheInScript(text) {
  const m = /<script setup>([\s\S]*?)<\/script>/.exec(text);
  if (!m) return [];
  /* 주석은 뺀다 — 개발자가 읽는 글이라 동작에 영향이 없다.
     다만 줄 번호는 유지해야 하므로 **길이를 보존하며** 지운다. */
  const body = m[1]
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (c, p1) => p1 + ' '.repeat(c.length - p1.length));
  const hits = [];
  const re = /\{\{\s*t\s*\(/g;
  let x;
  while ((x = re.exec(body)) !== null) {
    hits.push(`script:${body.slice(0, x.index).split('\n').length}`);
  }
  return hits;
}

/* ── ①-d 흔한 실수: 단어 치환이 문장을 쪼갬 ──────────────────────────────
   `적용` 을 치환했더니 `적용됩니다` 가 `{{ t('common.apply') }}됩니다` 가 됐다.
   문장이 반으로 갈라지고, 어순이 다른 영어에서는 말이 안 된다.
   조각을 이어 붙이지 말고 **문장 전체를 한 키**로 넣어야 한다. */
function splitSentence(text) {
  const m = /<template>([\s\S]*)<\/template>/.exec(text);
  if (!m) return [];
  const body = m[1].replace(/<!--[\s\S]*?-->/g, '');
  const hits = [];
  // t() 머스태시 **바로 뒤**에 한글이 이어지면 단어가 쪼개진 것이다
  const re = /\{\{\s*t\([^}]*\)\s*\}\}[가-힣]/g;
  let x;
  while ((x = re.exec(body)) !== null) {
    hits.push(body.slice(Math.max(0, x.index - 30), x.index + 26).replace(/\s+/g, ' ').trim());
  }
  return hits;
}

/* ── ①-e 화면이 쓰는 키가 사전에 있는가 ──────────────────────────────────
   `t('access3.sec5')` 처럼 **없는 키**를 쓰면 폴백이 키 이름을 그대로 보여 준다.
   화면이 깨지지는 않지만 사용자에게 `access3.sec5` 가 노출된다.
   키 정합 검사(①)는 en/ko 사이만 보므로 이 경우를 놓친다. */
function usedKeys(text) {
  // 주석 안의 예시(`t('common.save') → 'Save'`)는 실제 사용이 아니다
  const body = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1');
  return [...body.matchAll(/\bt\(\s*(['"])([\w.]+)\1\s*(?=[,)])/g)].map((m) => m[2]);
}

/* ── ② 남은 하드코딩 문구 ──────────────────────────────────────────────── */
const KO = /[가-힣]/;
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'locales'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(vue|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 주석은 번역 대상이 아니다 — 개발자가 읽는 글이다 */
function stripComments(s) {
  return s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1');
}

const rows = [];
const bindingBugs = [];
let totalKo = 0;
let totalBinding = 0;

/* ★ v1.10.13 — 바인딩·인라인 형태도 센다.
   `>텍스트<` 만 세면 아래 두 형태가 빠져 **진행률이 과대평가된다.**
     ① 머스태시 안의 삼항   {{ x ? '활성' : '비활성' }}
     ② 머스태시와 섞인 인라인  큐 {{ n }}
   실제로 37개 파일·181곳이 이렇게 숨어 있었다. */
function bindingKorean(text) {
  const m = /<template>([\s\S]*)<\/template>/.exec(text);
  if (!m) return 0;
  const body = m[1].replace(/<!--[\s\S]*?-->/g, '');
  const tern = body.match(/\{\{[^}]*'[^']*[가-힣][^']*'[^}]*\}\}/g) || [];
  const inline = body.match(/>[^<>]*[가-힣][^<>]*\{\{[^}]*\}\}[^<>]*</g) || [];
  return tern.length + inline.length;
}
/* ── ①-g v-for 변수가 t() 를 가리지 않는가 ──────────────────────────────
   `v-for="t in items"` 는 그 블록 안에서 **번역 함수 `t` 를 가린다.**
   그러면 `t('key')` 가 문자열을 함수처럼 부르게 되어
   `TypeError: t is not a function` → **화면이 통째로 빈다.**
   빌드도 통과하고 SFC 컴파일도 통과하므로, 브라우저를 열어야만 드러난다.
   실제로 부하 모니터링 화면이 이것 때문에 흰 화면이었다. */
function forShadowsT(vue) {
  const tpl = /<template>([\s\S]*)<\/template>/.exec(vue);
  if (!tpl) return [];
  const body = tpl[1];
  const out = [];
  const re = /<(\w[\w-]*)[^>]*v-for="\(?\s*t\s*[,)\s][^>]*>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const tag = m[1];
    let depth = 1, i = m.index + m[0].length;
    const close = new RegExp(`</?${tag}\\b`, 'g');
    close.lastIndex = i;
    let c, end = body.length;
    while ((c = close.exec(body)) !== null) {
      depth += c[0].startsWith('</') ? -1 : 1;
      if (depth === 0) { end = c.index; break; }
    }
    const seg = body.slice(m.index, end);
    const calls = seg.match(/(?<![\w.])t\('([\w.]+)'/g) || [];
    if (calls.length) out.push(calls.slice(0, 3).join(', '));
  }
  return out;
}

for (const f of walk(SRC)) {
  const src = fs.readFileSync(f, 'utf8');
  for (const hit of forShadowsT(src)) {
    bindingBugs.push(`${path.relative(SRC, f)}: v-for 의 변수 't' 가 번역 함수 t() 를 가립니다 (${hit}) `
      + '— 반복 변수 이름을 바꾸세요. 그대로 두면 화면이 통째로 빕니다.');
  }
}

for (const f of walk(SRC)) {
  const raw = fs.readFileSync(f, 'utf8');
  const body = stripComments(raw);
  const n = body.split('\n').filter((l) => KO.test(l)).length;
  const uses = (raw.match(/\bt\(['"]/g) || []).length;
  for (const h of mustacheInBinding(raw)) {
    bindingBugs.push(`${path.relative(SRC, f)}  ${h}`);
  }
  for (const k of usedKeys(raw)) {
    if (!base.includes(k)) {
      bindingBugs.push(`${path.relative(SRC, f)}  t('${k}') — 사전에 없는 키입니다`);
    }
  }
  for (const h of splitSentence(raw)) {
    bindingBugs.push(`${path.relative(SRC, f)}  …${h}… — 단어 치환이 문장을 쪼갰습니다`);
  }
  for (const h of mustacheInScript(raw)) {
    bindingBugs.push(`${path.relative(SRC, f)}  ${h} — script 안에서는 머스태시가 동작하지 않습니다`);
  }
  const bind = bindingKorean(raw);
  totalBinding += bind;
  if (n || uses || bind) {
    rows.push({ f: path.relative(SRC, f), ko: n, t: uses, bind });
    totalKo += n;
  }
}
rows.sort((a, b) => b.ko - a.ko);

const done = rows.filter((r) => r.t > 0 && r.ko === 0).length;
const partial = rows.filter((r) => r.t > 0 && r.ko > 0).length;
const todo = rows.filter((r) => r.t === 0 && r.ko > 0).length;

console.log(`\n  screen text  ${totalKo} hard-coded lines · ${totalBinding} bindings/inline left`);
console.log(`             done ${done}  ·  in progress ${partial}  ·  not started ${todo}  (by file)`);
rows.sort((a, b) => (b.ko + b.bind) - (a.ko + a.bind));
if (rows.some((r) => r.ko > 0 || r.bind > 0)) {
  console.log('\n  top 10 remaining');
  for (const r of rows.filter((x) => x.ko > 0 || x.bind > 0).slice(0, 10)) {
    console.log(`    ${String(r.ko).padStart(4)} lines${r.bind ? ` +${String(r.bind).padStart(3)}곳` : '     '}  ${r.t ? `(t() ${r.t}회) ` : ''}${r.f}`);
  }
}
console.log('');

if (bindingBugs.length) {
  console.log('  {{ }} inside a binding expression — parsing breaks');
  for (const b of bindingBugs.slice(0, 10)) console.log(`    FAIL ${b}`);
  console.log('');
}

// 키 정합과 파싱 오류만 실패로 본다 — 번역 진행률로 빌드를 막지 않는다
process.exit(problems.length || bindingBugs.length ? 1 : 0);
