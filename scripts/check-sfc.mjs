/**
 * check-sfc.mjs — 모든 Vue SFC 를 **실제 컴파일러로** 통과시켜 본다. (v1.8.1)
 *
 *  ## 왜 별도 스크립트인가
 *  `npm run build:admin` 은 vite 전체(플러그인·번들링·에셋)를 돌리므로 느리고,
 *  CI 나 폐쇄망 검증 환경에서 항상 쓸 수 있는 것도 아니다.
 *  이 스크립트는 **`@vue/compiler-sfc` 하나만** 써서 SFC 문법·템플릿·스타일을 검사한다.
 *
 *  ## 무엇을 잡는가 (정규식 검사로는 못 잡던 것들)
 *   · 템플릿 표현식 문법 오류      `:class="{ a: }"` 같은 것
 *   · 잘못된 디렉티브 사용         `v-for` 없이 `:key`, `v-model` 대상이 표현식이 아닌 경우
 *   · `<script setup>` 매크로 오용  defineProps 를 조건문 안에서 부르는 등
 *   · CSS 파싱 오류                중괄호 불일치, 잘못된 선택자
 *   · 컴파일러 경고                미사용 지시자, 중복 속성
 *
 *  실행: node scripts/check-sfc.mjs [경로]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(process.argv[2] || path.join(root, 'admin-client', 'src'));

/* 이 스크립트는 프로젝트 루트에 있지만 컴파일러는 admin-client 쪽에 설치돼 있다.
   ESM 의 bare specifier 는 **호출한 모듈 위치** 기준으로 해석되므로, admin-client 를
   기준점으로 잡아 명시적으로 resolve 한다. */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

let compiler = null;
for (const base of [path.join(root, 'admin-client', 'package.json'), path.join(root, 'package.json')]) {
  try {
    const req = createRequire(base);
    compiler = await import(pathToFileURL(req.resolve('@vue/compiler-sfc')).href);
    break;
  } catch { /* 다음 후보 */ }
}
if (!compiler) {
  console.error('@vue/compiler-sfc 를 찾을 수 없습니다. admin-client 의존성을 먼저 설치하세요:');
  console.error('  cd admin-client && npm install');
  process.exit(2);
}
const { parse, compileScript, compileTemplate, compileStyle } = compiler;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.vue')) out.push(p);
  }
  return out;
}

const files = walk(target).sort();
const errors = [];
const warnings = [];
let ok = 0;

for (const file of files) {
  const rel = path.relative(root, file);
  const source = fs.readFileSync(file, 'utf8');
  const id = rel.replace(/[^\w]/g, '_');

  // ── 1) SFC 블록 분해 ────────────────────────────────────────────────
  const { descriptor, errors: parseErrors } = parse(source, { filename: file });
  if (parseErrors?.length) {
    errors.push({ file: rel, phase: 'parse', msg: parseErrors[0].message });
    continue;
  }

  // ── 2) <script setup> 컴파일 (매크로 해석 포함) ─────────────────────
  let script = null;
  if (descriptor.script || descriptor.scriptSetup) {
    try {
      script = compileScript(descriptor, { id, inlineTemplate: false });
    } catch (e) {
      errors.push({ file: rel, phase: 'script', msg: e.message.split('\n')[0] });
      continue;
    }
  }

  // ── 3) 템플릿 컴파일 — 여기서 대부분의 실수가 잡힌다 ────────────────
  if (descriptor.template) {
    try {
      const r = compileTemplate({
        source: descriptor.template.content,
        filename: file,
        id,
        // setup 바인딩을 넘겨야 "템플릿이 쓰는 이름이 script 에 있는가" 까지 검사된다
        compilerOptions: { bindingMetadata: script?.bindings, prefixIdentifiers: true },
      });
      if (r.errors?.length) {
        for (const e of r.errors) {
          const msg = typeof e === 'string' ? e : e.message;
          errors.push({ file: rel, phase: 'template', msg });
        }
        continue;
      }
      for (const t of (r.tips || [])) warnings.push({ file: rel, phase: 'template', msg: t });
    } catch (e) {
      errors.push({ file: rel, phase: 'template', msg: e.message.split('\n')[0] });
      continue;
    }
  }

  // ── 4) <style> 컴파일 (scoped 변환 포함) ────────────────────────────
  let styleBad = false;
  for (const st of descriptor.styles) {
    const r = compileStyle({
      source: st.content, filename: file, id: `data-v-${id}`, scoped: !!st.scoped,
    });
    if (r.errors?.length) {
      errors.push({ file: rel, phase: 'style', msg: String(r.errors[0].message || r.errors[0]).split('\n')[0] });
      styleBad = true;
    }
  }
  if (styleBad) continue;

  ok++;
}

console.log(`SFC 실제 컴파일: 통과 ${ok} / ${files.length}`);
if (warnings.length) {
  console.log(`\n경고 ${warnings.length}건`);
  for (const w of warnings.slice(0, 20)) console.log(`  WARN [${w.phase}] ${w.file}\n        ${w.msg}`);
}
if (errors.length) {
  console.log(`\n실패 ${errors.length}건`);
  for (const e of errors) console.log(`  FAIL [${e.phase}] ${e.file}\n        ${e.msg}`);
}
process.exit(errors.length ? 1 : 0);
