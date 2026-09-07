/**
 * 다국어 시험. (v1.10.0)
 *
 *  ⚠ 여기서 지키는 것은 **인프라의 정확성**이다. 번역 진행률이 아니다.
 *    언어 결정 순서가 틀리면 설정이 고장 난 것처럼 보이고,
 *    폴백이 없으면 키 하나 빠졌을 때 화면이 빈다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'admin-client', 'src');

/* 브라우저 대역 — document 는 건드리지 않는다(Vue 의 DOM 감지를 깨뜨린다) */
globalThis.localStorage = {
  _d: {}, getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; },
};
Object.defineProperty(globalThis, 'navigator', { value: { language: 'ko-KR' }, configurable: true });

const en = (await import(path.join(SRC, 'locales/en.js'))).default;
const ko = (await import(path.join(SRC, 'locales/ko.js'))).default;
const I = await import(path.join(SRC, 'composables/useI18n.js'));

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));

test('★ 모든 언어의 키가 정확히 일치한다', () => {
  const E = flat(en); const K = flat(ko);
  assert.deepEqual(E.filter((k) => !K.includes(k)), [], 'ko 에 없는 키 — 조용히 영어가 섞인다');
  assert.deepEqual(K.filter((k) => !E.includes(k)), [], 'en 에 없는 키 — 폴백 기준이 무너진다');
  assert.ok(E.length > 100, `키가 ${E.length}개뿐이다`);
});

test('사전 값이 비어 있지 않다', () => {
  for (const [name, cat] of [['en', en], ['ko', ko]]) {
    const walk = (o, p = '') => {
      for (const [k, v] of Object.entries(o)) {
        if (v && typeof v === 'object') walk(v, `${p}${k}.`);
        else assert.ok(typeof v === 'string' && v.trim(), `${name}.${p}${k} 가 비었다`);
      }
    };
    walk(cat);
  }
});

test('영어가 최종 기본값이다', () => {
  assert.equal(I.FALLBACK_LOCALE, 'en');
});

test('★ 없는 키는 키 이름을 그대로 돌려준다 — 빈 화면보다 낫다', () => {
  assert.equal(I.t('does.not.exist'), 'does.not.exist');
  assert.equal(I.t(''), '');
});

test('★ 한쪽에만 있는 키는 영어로 폴백한다', () => {
  I.setLocale('ko');
  // en 에만 있고 ko 에 없는 키가 생겨도 화면이 비면 안 된다 (지금은 키가 일치하므로 직접 확인)
  const orig = ko.common.save;
  delete ko.common.save;
  assert.equal(I.t('common.save'), en.common.save, '영어로 폴백해야 한다');
  ko.common.save = orig;
});

test('파라미터를 치환한다', () => {
  I.setLocale('en');
  assert.equal(I.t('logs.lines', { n: 42 }), '42 lines');
  I.setLocale('ko');
  assert.equal(I.t('logs.lines', { n: 42 }), '42줄');
  assert.equal(I.t('logs.scanned', { n: 420, files: 4 }), '420줄 · 4파일');
});

test('파라미터가 빠지면 자리를 남긴다 — 무엇이 빠졌는지 보인다', () => {
  I.setLocale('ko');
  assert.equal(I.t('logs.lines'), '{n}줄');
  assert.equal(I.t('logs.lines', { wrong: 1 }), '{n}줄');
});

test('★ 사용자 선택이 서버 기본값을 이긴다', () => {
  I.resetLocale();
  I.applyServerDefault('en');
  assert.equal(I.locale.value, 'en', '서버 기본값이 브라우저 언어를 이겨야 한다');
  I.setLocale('ko');
  I.applyServerDefault('en');
  assert.equal(I.locale.value, 'ko',
    '개인 선택이 새로고침마다 되돌아가면 설정이 고장 난 것으로 보인다');
});

test('resetLocale 이 사용자 선택을 지운다', () => {
  I.setLocale('ko');
  I.resetLocale();
  assert.equal(I.locale.value, 'en', '서버 기본값(en)으로 돌아가야 한다');
});

test('지원하지 않는 언어는 무시한다', () => {
  I.setLocale('ko');
  I.setLocale('fr');
  assert.equal(I.locale.value, 'ko', '없는 언어로 바꾸면 화면이 전부 키 이름이 된다');
  I.applyServerDefault('zz');
  assert.equal(I.locale.value, 'ko');
});

/* ── 서버 설정 ────────────────────────────────────────────────────────── */

test('.env 의 LOCALE 이 매핑되어 있다', () => {
  const idx = fs.readFileSync(path.join(ROOT, 'src/config/index.js'), 'utf8');
  const def = fs.readFileSync(path.join(ROOT, 'src/config/default.js'), 'utf8');
  assert.match(def, /locale:\s*'en'/, '기본은 영어여야 한다');
  assert.match(idx, /process\.env\.LOCALE/, 'env 매핑이 없으면 .env 로 바꿀 수 없다');
  const env = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  assert.match(env, /^LOCALE=/m, '.env.example 에 안내가 있어야 한다');
});

test('서버가 언어를 로그인 전에 알려 준다', () => {
  const c = fs.readFileSync(path.join(ROOT, 'lib/admin/controller/SystemInfoController.js'), 'utf8');
  assert.match(c, /locale: config\.locale/, '로그인 화면이 이 값으로 그려진다');
  // 운영 환경에서도 내보내야 한다 — 안 그러면 운영에서만 영어로 뜬다
  const prodBranch = /isProd\s*\?\s*\{([^}]*)\}/.exec(c);
  assert.ok(prodBranch && /locale/.test(prodBranch[1]), '운영 분기에도 locale 이 있어야 한다');
});

/* ── 화면 연결 ────────────────────────────────────────────────────────── */

test('★ 언어를 고를 수 있는 곳이 세 군데다', () => {
  const login = fs.readFileSync(path.join(SRC, 'views/Login.vue'), 'utf8');
  const settings = fs.readFileSync(path.join(SRC, 'components/SettingsDialog.vue'), 'utf8');
  assert.match(login, /setLocale/, '로그인 화면 — 영어로 뜬 화면에서 헤매지 않도록');
  assert.match(settings, /setLocale/, '설정 화면');
  assert.match(settings, /resetLocale/, '서버 기본값으로 되돌리기');
  // 세 번째는 .env (위 시험에서 확인)
});

test('★ 메뉴가 computed 라 언어 전환에 따라온다', () => {
  const ml = fs.readFileSync(path.join(SRC, 'layouts/MainLayout.vue'), 'utf8');
  assert.match(ml, /const menuGroups = computed\(/,
    '그냥 배열이면 t() 가 한 번만 평가되어 언어를 바꿔도 메뉴가 그대로 남는다');
  // computed 를 script 에서 쓸 때 .value 를 빼먹으면 메뉴가 통째로 사라진다
  const script = /<script setup>([\s\S]*?)<\/script>/.exec(ml)[1];
  for (const line of script.split('\n')) {
    if (line.includes('menuGroups') && !line.includes('const menuGroups')) {
      assert.ok(line.includes('menuGroups.value'), `.value 가 빠졌다: ${line.trim()}`);
    }
  }
});

test('로그인 화면의 주요 문구가 사전을 쓴다', () => {
  const login = fs.readFileSync(path.join(SRC, 'views/Login.vue'), 'utf8');
  for (const key of ['login.title', 'login.username', 'login.password', 'login.signIn']) {
    assert.ok(login.includes(`'${key}'`), `${key} 가 연결되지 않았다`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.2 — 옮기다가 실제로 낸 실수를 못 박는다
   ══════════════════════════════════════════════════════════════════════════ */

/** 속성값은 이미 JS 표현식이다 — 머스태시를 넣으면 문자열에 그대로 박혀 파싱이 깨진다 */
function mustacheCalls(text) {
  const out = [];
  const re = /(?::|v-bind:|@)[\w.:-]+="([^"]*\{\{[^"]*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (/\{\{\s*t\s*\(/.test(m[1])) out.push(m[0].slice(0, 60));
  }
  return out;
}

test('★ 바인딩 표현식 안에 {{ t() }} 를 넣지 않는다 — 실제로 한 번 깨뜨렸다', () => {
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', 'dist'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.vue')) files.push(p);
    }
  })(SRC);
  const bad = [];
  for (const f of files) {
    for (const h of mustacheCalls(fs.readFileSync(f, 'utf8'))) {
      bad.push(`${path.relative(SRC, f)}: ${h}`);
    }
  }
  assert.deepEqual(bad, [], '속성값 안에서는 t() 를 직접 부른다');
});

test('검사기가 안내 문구의 Handlebars 를 오탐하지 않는다', () => {
  // `:placeholder="'… {{변수}} …'"` 는 정상이다 — 문법을 설명하는 문구다
  assert.deepEqual(mustacheCalls(`:placeholder="'템플릿 — {{변수}}, {{#if x}}'"`), []);
  // 진짜 문제만 잡는다
  assert.equal(mustacheCalls(`:title="a ? '{{ t('x') }}' : b"`).length, 1);
});

test('모니터링 화면과 차트가 사전을 쓴다', () => {
  const mon = fs.readFileSync(path.join(SRC, 'views/MonitoringPage.vue'), 'utf8');
  const chart = fs.readFileSync(path.join(SRC, 'components/MetricChart.vue'), 'utf8');
  for (const k of ['monitoring.chartOs', 'monitoring.chartHttp', 'monitoring.title']) {
    assert.ok(mon.includes(`'${k}'`), `${k} 가 연결되지 않았다`);
  }
  for (const k of ['chart.waiting', 'chart.trendUp']) {
    assert.ok(chart.includes(`'${k}'`), `${k} 가 연결되지 않았다`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.4 — script 블록 안의 머스태시
   일괄 치환이 <script> 안의 HTML 문자열까지 건드리면
   `{{ t('x') }}` 가 박힌다. 템플릿 밖이라 **동작하지 않고**,
   작은따옴표 문자열 안에 t(') 가 들어가 문법까지 깨진다.
   ══════════════════════════════════════════════════════════════════════════ */

/** 주석은 제외한다 — 개발자가 읽는 글이라 동작에 영향이 없다 */
function mustacheInScript(text) {
  const m = /<script setup>([\s\S]*?)<\/script>/.exec(text);
  if (!m) return [];
  const body = m[1]
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (c, p1) => p1 + ' '.repeat(c.length - p1.length));
  return [...body.matchAll(/\{\{\s*t\s*\(/g)].map((x) => body.slice(0, x.index).split('\n').length);
}

test('★ script 블록 안에 {{ t() }} 가 없다 — 옮기다가 두 번 냈다', () => {
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', 'dist'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.vue')) files.push(p);
    }
  })(SRC);
  const bad = [];
  for (const f of files) {
    for (const line of mustacheInScript(fs.readFileSync(f, 'utf8'))) {
      bad.push(`${path.relative(SRC, f)}:${line}`);
    }
  }
  assert.deepEqual(bad, [], 'script 안에서는 머스태시가 동작하지 않는다');
});

test('검사기가 주석 안의 머스태시는 오탐하지 않는다', () => {
  const withComment = `<script setup>\n/** {{ t('x') }} 설명 */\nconst a = 1;\n</script>`;
  assert.deepEqual(mustacheInScript(withComment), [], '주석은 동작에 영향이 없다');
  const real = `<script setup>\nconst h = '<b>{{ t('x') }}</b>';\n</script>`;
  assert.equal(mustacheInScript(real).length, 1, '진짜 문제는 잡아야 한다');
});

test('세 화면이 사전을 쓴다', () => {
  const pairs = [
    ['views/SecureColumnsPage.vue', 'secure.title'],
    ['views/MciControllerNew.vue', 'mci.analysis'],
    ['views/AccessStatsPage.vue', 'access.totalRequests'],
  ];
  for (const [f, key] of pairs) {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8');
    assert.ok(src.includes(`'${key}'`), `${f}: ${key} 가 연결되지 않았다`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.5 — 실행 검증이 잡은 것들
   실제로 띄워 화면 텍스트를 읽어 보니, 검사기 3종이 전부 통과시킨 결함이 있었다:
   **사전에 키는 있는데 화면이 그 키를 쓰지 않는** 경우다.
   ══════════════════════════════════════════════════════════════════════════ */

test('★ 메뉴 라벨이 하나도 하드코딩되어 있지 않다', () => {
  // v1.10.0 에서 매핑한 이름과 실제 라벨이 달랐다 (사전 '백업' vs 코드 '백업/복원').
  // 그 결과 5개 메뉴가 모든 화면에 한글로 남았고, 검사기는 전부 통과시켰다.
  const ml = fs.readFileSync(path.join(SRC, 'layouts/MainLayout.vue'), 'utf8');
  const hard = [...ml.matchAll(/label:\s*'([^']*[가-힣][^']*)'/g)].map((m) => m[1]);
  assert.deepEqual(hard, [], `하드코딩된 메뉴 라벨: ${hard.join(', ')}`);
});

test('★ 상수 배열의 문구는 computed 안에 있다', () => {
  // 그냥 배열이면 t() 가 한 번만 평가되어 언어를 바꿔도 문구가 그대로 남는다.
  for (const [f, name] of [
    ['layouts/MainLayout.vue', 'menuGroups'],
    ['views/LogExplorer.vue', 'QUICK'],
    ['views/TraceExplorer.vue', 'MODES'],
  ]) {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8');
    assert.match(src, new RegExp(`const ${name} = computed\\(`),
      `${f}: ${name} 이 computed 가 아니다 — 언어 전환에 따라오지 않는다`);
  }
});

test('★ computed 로 감싼 뒤 script 안에서 .value 를 빼먹지 않았다', () => {
  // MainLayout 에서 실제로 두 곳이 남아 메뉴가 통째로 사라질 뻔했다
  for (const [f, name] of [
    ['layouts/MainLayout.vue', 'menuGroups'],
    ['views/LogExplorer.vue', 'QUICK'],
    ['views/TraceExplorer.vue', 'MODES'],
  ]) {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8');
    const script = /<script setup>([\s\S]*?)<\/script>/.exec(src)[1];
    for (const line of script.split('\n')) {
      if (!line.includes(name) || line.includes(`const ${name}`)) continue;
      if (line.trim().startsWith('*') || line.trim().startsWith('//')) continue;
      assert.ok(line.includes(`${name}.value`), `${f}: .value 누락 — ${line.trim().slice(0, 60)}`);
    }
  }
});

test('t() 선언이 그것을 쓰는 상수보다 앞에 온다', () => {
  for (const [f, name] of [['views/TraceExplorer.vue', 'MODES'], ['views/LogExplorer.vue', 'QUICK']]) {
    const script = /<script setup>([\s\S]*?)<\/script>/.exec(
      fs.readFileSync(path.join(SRC, f), 'utf8'))[1];
    assert.ok(script.indexOf('const { t }') < script.indexOf(`const ${name}`),
      `${f}: t 선언이 ${name} 보다 뒤에 있다`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.9 — 날짜·숫자 로캘 포맷
   화면 문구를 전부 영어로 옮겨도 `toLocaleString('ko-KR')` 이 하드코딩돼 있으면
   "Last sign-in  2026. 8. 26. 오후 4:48" 이 됩니다.
   번역 사전으로는 풀리지 않습니다 — 문구가 아니라 **포맷**이기 때문입니다.
   ══════════════════════════════════════════════════════════════════════════ */

test("★ 화면 코드에 'ko-KR' 이 하드코딩되어 있지 않다", () => {
  const bad = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', 'dist', 'locales'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.vue')) continue;
      const src = fs.readFileSync(p, 'utf8');
      // 주석은 제외 — 설명 글에 등장할 수 있다
      const body = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
      if (/'ko-KR'/.test(body)) bad.push(path.relative(SRC, p));
    }
  })(SRC);
  assert.deepEqual(bad, [], `언어를 바꿔도 한국식 날짜가 나온다: ${bad.join(', ')}`);
});

test('포맷 헬퍼가 언어를 따라간다', async () => {
  // useFormat 은 vue 를 쓰므로 확장자를 붙인 사본으로 불러온다
  const dir = path.join(SRC, 'composables');
  const tmp = path.join(dir, `_fmt_${process.pid}.js`);
  fs.writeFileSync(tmp, fs.readFileSync(path.join(dir, 'useFormat.js'), 'utf8')
    .replace("from './useI18n'", "from './useI18n.js'"));
  try {
    const { useFormat } = await import(tmp);
    const f = useFormat();
    const d = '2026-08-26T16:48:11.482Z';
    I.setLocale('en');
    const en = f.dateTime(d);
    I.setLocale('ko');
    const ko = f.dateTime(d);
    assert.notEqual(en, ko, '언어를 바꿔도 표기가 같으면 헬퍼가 동작하지 않는 것');
    assert.match(en, /2026/);

    // 정렬 가능한 형식은 언어와 무관해야 한다 (로그·파일명용)
    I.setLocale('en'); const isoEn = f.iso(d);
    I.setLocale('ko'); const isoKo = f.iso(d);
    assert.equal(isoEn, isoKo, 'iso() 는 언어를 타면 안 된다');
    assert.match(isoEn, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  } finally { fs.rmSync(tmp, { force: true }); }
});

test('★ 잘못된 입력에 던지지 않는다 — 날짜 한 칸 때문에 화면이 깨지면 안 된다', async () => {
  const dir = path.join(SRC, 'composables');
  const tmp = path.join(dir, `_fmt2_${process.pid}.js`);
  fs.writeFileSync(tmp, fs.readFileSync(path.join(dir, 'useFormat.js'), 'utf8')
    .replace("from './useI18n'", "from './useI18n.js'"));
  try {
    const f = (await import(tmp)).useFormat();
    for (const bad of [null, undefined, '', 'not-a-date', {}, NaN]) {
      assert.doesNotThrow(() => f.dateTime(bad));
      assert.doesNotThrow(() => f.time(bad));
      assert.doesNotThrow(() => f.number(bad));
      assert.doesNotThrow(() => f.iso(bad));
    }
    assert.equal(f.dateTime(null), '');
    assert.equal(f.dateTime('not-a-date'), 'not-a-date', '파싱 실패하면 원본을 돌려준다');
    assert.equal(f.duration('x'), '—');
  } finally { fs.rmSync(tmp, { force: true }); }
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.12 — 단어 치환이 문장을 쪼개는 실수
   `적용` 을 치환했더니 `적용됩니다` 가 `{{ t('common.apply') }}됩니다` 가 됐다.
   문장이 반으로 갈라지고, 어순이 다른 영어에서는 말이 되지 않는다.
   조각을 이어 붙이지 말고 **문장 전체를 한 키**로 넣어야 한다.
   ══════════════════════════════════════════════════════════════════════════ */

function splitSentences(text) {
  const m = /<template>([\s\S]*)<\/template>/.exec(text);
  if (!m) return [];
  const body = m[1].replace(/<!--[\s\S]*?-->/g, '');
  return [...body.matchAll(/\{\{\s*t\([^}]*\)\s*\}\}[가-힣]/g)]
    .map((x) => body.slice(Math.max(0, x.index - 24), x.index + 22).replace(/\s+/g, ' ').trim());
}

test('★ 단어 치환이 문장을 쪼개지 않았다', () => {
  const bad = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', 'dist'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.vue')) continue;
      for (const h of splitSentences(fs.readFileSync(p, 'utf8'))) {
        bad.push(`${path.relative(SRC, p)}: …${h}…`);
      }
    }
  })(SRC);
  assert.deepEqual(bad, [], '문장 전체를 한 키로 넣어야 한다');
});

test('검사기가 쪼개진 문장을 실제로 잡는다', () => {
  const broken = `<template><p>{{ t('common.apply') }}됩니다.</p></template>`;
  assert.equal(splitSentences(broken).length, 1);
  // 머스태시 뒤에 공백이나 태그가 오는 것은 정상이다
  const ok = `<template><p>{{ t('common.apply') }} now</p><b>{{ t('a.b') }}</b></template>`;
  assert.deepEqual(splitSentences(ok), []);
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.20 — 문장 조각은 블록 통째로 옮긴다
   태그(<b>, <code>)가 문장 중간에 박힌 안내문을 조각별로 치환하면
   문장이 갈라지고, 어순이 다른 언어에서 말이 되지 않는다.
   강조를 포기하더라도 **문장을 온전히** 두는 편이 낫다.
   ══════════════════════════════════════════════════════════════════════════ */

test('★ 긴 안내문이 문장 전체로 옮겨졌다', () => {
  const pairs = [
    ['views/SecureColumnsPage.vue', ['notes.secureDisabled', 'notes.secureSizing',
      'notes.kmsManaged', 'notes.localKeyScope', 'notes.keyMismatchDetail', 'notes.newKeyOnce']],
    ['views/ControllerEditor.vue', ['notes.mciUseWizard', 'notes.mciEditableFields',
      'notes.sseWhatItDoes', 'notes.sseTryIt', 'notes.sseAuthTicket',
      'notes.noRoutesHint']],
  ];
  for (const [f, keys] of pairs) {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const k of keys) {
      assert.ok(src.includes(`'${k}'`), `${f}: ${k} 가 연결되지 않았다`);
    }
  }
});

test('안내문 키가 한 문장으로 온전하다', async () => {
  const en = (await import(path.join(SRC, 'locales/en.js'))).default;
  const ko = (await import(path.join(SRC, 'locales/ko.js'))).default;
  for (const [name, cat] of [['en', en], ['ko', ko]]) {
    for (const [k, v] of Object.entries(cat.notes || {})) {
      assert.equal(typeof v, 'string', `${name}.notes.${k}`);
      // 조각이면 아주 짧다 — 문장은 최소한의 길이가 있다
      if (!/^(sseOpen|sseClosed|sseConnecting|sseError|keyMatch|keyMismatch)$/.test(k)) {
        assert.ok(v.length > 20, `${name}.notes.${k} 가 조각처럼 짧다: ${v}`);
      }
    }
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.23 — 사전에 없는 키
   `t('access3.sec5')` 처럼 없는 키를 쓰면 폴백이 **키 이름을 그대로** 보여 준다.
   화면이 깨지지는 않지만 사용자에게 `access3.sec5` 가 노출된다.
   키 정합 검사는 en/ko 사이만 보므로 이 경우를 놓친다 —
   실제로 이 검사를 만들자마자 숨어 있던 4종이 드러났다.
   ══════════════════════════════════════════════════════════════════════════ */

function usedKeys(text) {
  const body = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1');
  /* ★ v1.19.5 — 키를 **이어 붙여 만드는** 자리는 검사에서 뺀다.
     예: t('configFiles.' + f.descKey) — 서버가 준 값에 따라 달라지므로 여기서 알 수 없다.
     (그런 자리는 사전에 그 묶음의 키들이 다 있는지 사람이 확인한다) */
  return [...body.matchAll(/\bt\(\s*'([\w.]+)'\s*[,)]/g)].map((m) => m[1]);
}

test('★ 화면이 쓰는 키가 모두 사전에 있다', async () => {
  const en = (await import(path.join(SRC, 'locales/en.js'))).default;
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
    (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
  const known = new Set(flat(en));
  const bad = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', 'dist', 'locales'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(vue|js)$/.test(e.name)) continue;
      for (const k of usedKeys(fs.readFileSync(p, 'utf8'))) {
        if (!known.has(k)) bad.push(`${path.relative(SRC, p)}: t('${k}')`);
      }
    }
  })(SRC);
  assert.deepEqual([...new Set(bad)], [], '없는 키는 화면에 키 이름이 그대로 뜬다');
});

test('주석 안의 예시는 사용으로 세지 않는다', () => {
  const withComment = "/** t('common.save') → 'Save' */\nconst a = 1;";
  assert.deepEqual(usedKeys(withComment), []);
  assert.deepEqual(usedKeys("const x = t('real.key');"), ['real.key']);
});

test('★ 시간 단위는 파라미터로 쓴다 — 값마다 키를 만들지 않는다', () => {
  const mon = fs.readFileSync(path.join(SRC, 'views/MonitoringPage.vue'), 'utf8');
  assert.match(mon, /t\('access3\.sec', \{ n: \d+ \}\)/);
  // sec5, min10 처럼 값이 박힌 키가 있으면 새 주기를 추가할 때마다 사전을 고쳐야 한다
  assert.equal(/t\('access3\.(sec|min)\d+'\)/.test(mon), false, '값이 박힌 키가 남아 있다');
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.24 — 파라미터가 언어끼리 어긋나는 경우
   `{label}` 이 한쪽에만 있으면 그 언어에서는 값이 빠지거나
   `{label}` 이 그대로 화면에 뜬다. **키 이름은 일치**하므로 기존 검사가 놓친다.
   실제로 `screenCreate.createdAs` 가 그 상태였다 —
   화면이 `선택한 <strong>{label}</strong> 구조의 …` 로 앞뒤를 나누고 있었는데,
   영어 어순(`… with the {label} layout`)과 맞지 않았다.
   ══════════════════════════════════════════════════════════════════════════ */

test('★ 모든 키의 파라미터가 언어끼리 일치한다', async () => {
  const en = (await import(path.join(SRC, 'locales/en.js'))).default;
  const ko = (await import(path.join(SRC, 'locales/ko.js'))).default;
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
    (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const paramsOf = (v) => new Set(String(v ?? '').match(/\{(\w+)\}/g) || []);
  const koMap = Object.fromEntries(flat(ko));
  const bad = [];
  for (const [k, v] of flat(en)) {
    const a = paramsOf(v); const b = paramsOf(koMap[k]);
    if (a.size !== b.size || [...a].some((x) => !b.has(x))) {
      bad.push(`${k}: en{${[...a]}} ko{${[...b]}}`);
    }
  }
  assert.deepEqual(bad, [], '파라미터가 어긋나면 한쪽 언어에서 값이 빠진다');
});

test('★ 파라미터가 든 문장은 강조 태그로 쪼개지 않는다', () => {
  // `선택한 <strong>{{ x }}</strong> {{ t('key') }}` 는 영어 어순과 맞지 않는다
  const src = fs.readFileSync(path.join(SRC, 'components/screen-designer/ScreenCreateModal.vue'), 'utf8');
  assert.match(src, /t\('screenCreate\.createdAs', \{ label:/,
    '문장 전체를 한 키로 두고 파라미터로 받아야 한다');
  assert.equal(/<strong>\{\{ selectedPreset\.label \}\}<\/strong>\s*\{\{ t\(/.test(src), false);
});
