#!/usr/bin/env node
/**
 * scripts/check-vue-refs.mjs — 화면 코드에서 **가져오지 않고 쓴 것**을 찾는다 (`npm run check:refs`)
 *
 *  왜 필요한가 — 실제로 겪은 일:
 *    SettingsDialog.vue 가 `useUiFlagsStore()` 를 쓰는데 import 가 빠져 있었다.
 *    · Vite 빌드는 **성공**한다 (자바스크립트는 없는 이름을 컴파일 시점에 탓하지 않는다)
 *    · SFC 컴파일 검사도 통과한다 (문법은 맞으니까)
 *    · 브라우저에서 그 화면을 열어야 비로소 `ReferenceError: ... is not defined` 로 터진다
 *    설정 대화상자처럼 **가끔 여는 화면**이면 한참 뒤에나 발견된다.
 *
 *  그래서 자주 쓰는 이름 규칙(use*·컴포저블·스토어)에 한해, 호출은 하는데
 *  import 도 없고 그 파일 안에 선언도 없는 것을 찾아낸다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'admin-client', 'src');

/** 자바스크립트가 기본으로 아는 것들 — 이건 import 하지 않아도 된다 */
const GLOBALS = new Set([
  'window', 'document', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'fetch', 'Promise', 'JSON', 'Math', 'Date', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'Error', 'Map', 'Set', 'RegExp', 'Intl', 'URL', 'URLSearchParams', 'Blob', 'FormData', 'File',
  'FileReader', 'AbortController', 'navigator', 'location', 'history', 'localStorage', 'alert',
  'confirm', 'prompt', 'requestAnimationFrame', 'cancelAnimationFrame', 'structuredClone',
  'defineProps', 'defineEmits', 'defineExpose', 'withDefaults', 'useSlots', 'useAttrs', 'useTemplateRef',
]);

function scriptOf(src) {
  const m = src.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  return m ? m[1] : '';
}

/**
 * 주석과 문자열을 지운다.
 *  이걸 안 하면 **설명 주석 안의 예시 코드**나 **코드를 문자열로 찍어내는 생성기**를
 *  진짜 호출로 착각한다 (실제로 오탐 10건이 나왔다).
 *  지우는 대신 같은 길이의 공백으로 바꿔 줄 번호를 보존한다.
 */
function stripCommentsAndStrings(code) {
  let out = '';
  let i = 0;
  const blank = (n) => ' '.repeat(n);
  while (i < code.length) {
    const two = code.slice(i, i + 2);
    if (two === '//') {
      const end = code.indexOf('\n', i); const stop = end === -1 ? code.length : end;
      out += blank(stop - i); i = stop; continue;
    }
    if (two === '/*') {
      const end = code.indexOf('*/', i + 2); const stop = end === -1 ? code.length : end + 2;
      out += code.slice(i, stop).replace(/[^\n]/g, ' '); i = stop; continue;
    }
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === ch) { j += 1; break; }
        j += 1;
      }
      out += code.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue;
    }
    out += ch; i += 1;
  }
  return out;
}

function declaredNames(code) {
  const names = new Set();
  // import { a, b as c } from '…'  ·  import d from '…'  ·  import * as e from '…'
  for (const m of code.matchAll(/import\s+([^;]+?)\s+from\s+['"][^'"]+['"]/g)) {
    const spec = m[1];
    for (const part of spec.replace(/[{}]/g, ',').split(',')) {
      const t = part.trim();
      if (!t) continue;
      const as = t.match(/\bas\s+([A-Za-z_$][\w$]*)/);
      names.add(as ? as[1] : t.replace(/^\*\s*/, '').trim());
    }
  }
  // const/let/var/function/class 로 이 파일 안에서 만든 것
  for (const m of code.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  // 구조분해: const { a, b } = …
  for (const m of code.matchAll(/\b(?:const|let|var)\s*\{([^}]+)\}\s*=/g)) {
    for (const part of m[1].split(',')) {
      const t = part.split(':').pop().trim().replace(/=.*$/, '').trim();
      if (t) names.add(t);
    }
  }
  return names;
}

/**
 * ★ v1.17.1 — 화면(template)이 부르는데 스크립트에 **없는 이름**을 찾는다.
 *
 *  겪은 일: `@click="openSteps(x)"` 를 붙였는데 선언이 통째로 빠져 있었다.
 *  · 빌드도 SFC 검사도 통과한다 (템플릿은 없는 이름도 그냥 참조로 남긴다)
 *  · 화면도 멀쩡히 뜬다 — **그 단추를 누를 때서야** `openSteps is not a function`
 *  그래서 이벤트 핸들러(@click 등)에서 부르는 함수 이름만 골라 확인한다.
 *  (호출 형태 `이름(` 만 본다 — 값 바인딩까지 보면 오탐이 많아진다)
 */
function templateHandlerCalls(src) {
  const m = src.match(/<template>([\s\S]*)<\/template>/);
  if (!m) return [];
  const tpl = m[1];
  const names = new Set();
  for (const mm of tpl.matchAll(/(?:@|v-on:)[a-zA-Z.:-]+\s*=\s*"([^"]*)"/g)) {
    for (const call of mm[1].matchAll(/(?<![.\w$])([a-zA-Z_$][\w$]*)\s*\(/g)) names.add(call[1]);
  }
  return [...names];
}

/** 템플릿에서 부르지만 선언되지 않은 것 — 자바스크립트 기본 전역은 뺀다 */
const TPL_ALLOW = new Set([
  '$emit', '$event', '$refs', '$nextTick',
  'Number', 'String', 'Boolean', 'Array', 'Object', 'Math', 'Date', 'JSON',
  'parseInt', 'parseFloat', 'confirm', 'alert', 'console', 'setTimeout', 'clearTimeout',
  /* 문법 키워드 — `@click="if (x) …"` 처럼 쓰면 함수 호출처럼 보인다 */
  'if', 'for', 'while', 'switch', 'return', 'typeof', 'catch', 'new', 'await', 'in', 'of',
]);

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(vue|js)$/.test(e.name)) files.push(p);
  }
})(SRC);

const problems = [];
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const code = file.endsWith('.vue') ? scriptOf(raw) : raw;
  if (!code.trim()) continue;
  const declared = declaredNames(code);
  const scan = stripCommentsAndStrings(code);   // 주석·문자열 속 예시 코드는 보지 않는다
  /* 검사 대상 ①: use로 시작하는 호출 (컴포저블·스토어 관례)
     검사 대상 ②: Vue 조합형 API — reactive·computed·watch 처럼 **이름이 use 로 시작하지 않는 것들**.
       ⚠ 목록에서 하나라도 빠지면 그 하나가 그대로 사고가 된다 — 처음에 ref 를 빠뜨려
       MetricChart 가 같은 오류(ref is not defined)로 통째로 사라졌다.
       실제로 이것 때문에 두 번째 사고가 났다: AccessStatsPage 가 reactive() 를 쓰면서 import 를
       빠뜨렸는데, 빌드도 SFC 검사도 통과하고 **화면을 열어야** ReferenceError 로 터졌다.
       그때 화면은 헤더만 남고 본문이 통째로 비어 버린다(원인을 찾기 어려운 증상). */
  const VUE_APIS = /(?<![.\w$])(ref|reactive|computed|watch|watchEffect|watchPostEffect|nextTick|provide|inject|toRef|toRefs|toRaw|markRaw|shallowRef|shallowReactive|readonly|customRef|defineAsyncComponent|onMounted|onUnmounted|onBeforeMount|onBeforeUnmount|onUpdated|onBeforeUpdate|onActivated|onDeactivated|onErrorCaptured|getCurrentInstance)\s*\(/g;
  for (const m of scan.matchAll(VUE_APIS)) {
    const name = m[1];
    if (declared.has(name) || GLOBALS.has(name)) continue;
    problems.push({ file: path.relative(ROOT, file), name });
  }
  for (const m of scan.matchAll(/(?<![.\w$])(use[A-Z][\w$]*)\s*\(/g)) {
    const name = m[1];
    if (declared.has(name) || GLOBALS.has(name)) continue;
    problems.push({ file: path.relative(ROOT, file), name });
  }
  /* ★ v1.20.0 — t() 를 쓰는데 **선언이 아예 없는** 파일을 찾는다.
     다국어 작업 중 t() 만 넣고 선언을 빠뜨려, 화면 디자이너 목록이 통째로 죽어 있었다.
     (화면은 뜨는데 그 안이 비어 보여서 알아채기 어렵다) */
  /* ⚠ **템플릿에서만** t() 를 쓰는 화면도 있다. 스크립트만 보면 놓친다
     (그래서 6개 파일을 뒤늦게 발견했다). 파일 전체에서 t( 사용을 보고,
     선언(const { t } = useI18n())이 있는지 확인한다. */
  if (file.endsWith('.vue')
      && /(?<![.\w$])t\(\s*['"]/.test(raw)
      && !/const \{[^}]*\bt\b[^}]*\} = useI18n\(\)/.test(raw)) {
    problems.push({ file: path.relative(ROOT, file), name: "t() 를 쓰는데 선언(const { t } = useI18n())이 없음" });
  }

  /* ★ v1.21.3 — **주석 안에 갇힌 선언**을 찾는다.
     선언을 옮기는 스크립트가 주석 블록 한가운데에 넣어, 세 화면이 조용히 죽어 있었다
     (`fmtInterval is not a function`). 화면은 뜨는데 그 안이 비어 보인다. */
  if (file.endsWith('.vue')) {
    const sm2 = /<script[^>]*>([\s\S]*?)<\/script>/.exec(raw);
    if (sm2) {
      for (const cm of sm2[1].matchAll(/\/\*[\s\S]*?\*\//g)) {
        const d = /^\s*const \{[^}]*\} = use[A-Z]\w*\(\);\s*$/m.exec(cm[0]);
        if (d) problems.push({ file: path.relative(ROOT, file), name: `${d[0].trim()} (주석 안에 갇힌 선언)` });
      }
    }
  }

  /* ★ v1.20.0 — **import 사이에 낀 선언**을 찾는다.
     `const { t } = useI18n();` 를 import 들 사이에 두면, import 만 끌어올려져
     그 줄보다 먼저 실행되는 코드가 생긴다 → 화면을 열자마자 "t is not defined".
     실제로 화면 디자이너 목록이 이것 때문에 통째로 죽어 있었다(21개 파일에 같은 구조).
     화면이 뜨기 때문에 눈에 잘 띄지도 않는다 — 그 화면만 조용히 비어 보인다. */
  if (file.endsWith('.vue')) {
    const sm = /<script[^>]*>([\s\S]*?)<\/script>/.exec(raw);
    if (sm) {
      const body = sm[1];
      const d = /\n(const \{[^}]*\} = use[A-Z][\w]*\(\);\n)/.exec(body);
      if (d && /^\s*import /m.test(body.slice(d.index + d[0].length))) {
        problems.push({ file: path.relative(ROOT, file), name: `${d[1].trim()} (import 사이에 낀 선언)` });
      }
    }
  }

  if (file.endsWith('.vue')) {
    for (const name of templateHandlerCalls(raw)) {
      if (declared.has(name) || GLOBALS.has(name) || TPL_ALLOW.has(name)) continue;
      problems.push({ file: path.relative(ROOT, file), name: `${name} (화면에서 부름)` });
    }
  }
}

const uniq = [...new Map(problems.map((p) => [`${p.file}:${p.name}`, p])).values()];
if (uniq.length) {
  console.error('가져오지 않고 쓴 것이 있습니다 — 그 화면을 열면 ReferenceError 로 터집니다:');
  for (const p of uniq) console.error(`  ✗ ${p.file}  →  ${p.name}() 호출, import 없음`);
  console.error(`vue-refs: ok=${files.length - uniq.length} fail=${uniq.length}`);
  process.exit(1);
}
console.log(`vue-refs: 검사 ${files.length}개 파일 — 문제 없음`);
