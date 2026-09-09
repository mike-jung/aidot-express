#!/usr/bin/env node
/**
 * scripts/check-syntax.mjs — 프로젝트 전체 JS/TS 구문 검증 (`npm run check`)
 *  런타임 로더(src/loader/esbuild-loader.mjs)와 동일한 esbuild 설정으로 변환한 뒤 V8 로 컴파일만 수행.
 *  실행: node --experimental-vm-modules --no-warnings scripts/check-syntax.mjs [dir]
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const SKIP = new Set(['node_modules', 'dist', 'dist-public', 'dist-electron', 'log', '.git', 'public', '.tmp', '.cache', 'data']);
const tsconfigRaw = { compilerOptions: { target: 'ES2022', module: 'ESNext', useDefineForClassFields: false, experimentalDecorators: true } };

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (/\.(m?js|cjs|ts|mts)$/.test(e.name)) out.push(p);
  }
  return out;
}
/**
 * ★ v1.42.0 — esbuild 가 잡아 주지 못하는 것: **같은 이름을 두 번 선언**한 것.
 *
 *  `import { projectRoot } ...` 와 `const projectRoot = ...` 가 한 파일에 있었는데
 *  esbuild 가 변환하며 조용히 정리해 이 검사를 통과했고, 실제로 실행할 때야 죽었다.
 *  ESM 에서는 SyntaxError 라 그 파일을 쓰는 화면이 통째로 열리지 않는다.
 *
 *  변환 **전** 소스에서 최상위 import 이름과 최상위 const/let/function 이름이
 *  겹치는지 직접 본다.
 */
function findDuplicateTopLevel(src) {
  /* ⚠ 생성기는 코드를 **문자열로** 만든다. 백틱 안의 `import router …` 는 생성될 코드지
     이 파일의 선언이 아니다. 처음에 그것을 잡아 오탐 셋을 냈다 — 문자열과 주석을 걷어낸다. */
  src = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`/g, '``');
  const names = new Map();
  const add = (name, kind) => {
    if (!name) return;
    const prev = names.get(name);
    if (prev && prev !== kind) throw new Error(`'${name}' is declared twice (${prev} and ${kind})`);
    names.set(name, kind);
  };
  for (const m of src.matchAll(/^import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?[^;]*from/gm)) {
    add(m[1], 'import');
    for (const part of (m[2] || '').split(',')) {
      const nm = part.trim().split(/\s+as\s+/).pop().trim();
      if (nm) add(nm, 'import');
    }
  }
  for (const m of src.matchAll(/^(?:export\s+)?(?:const|let|var|function|class)\s+(\w+)/gm)) add(m[1], 'declaration');
}

let ok = 0, fail = 0;
for (const f of await walk(root)) {
  const src = await readFile(f, 'utf8');
  const ext = path.extname(f);
  try {
    if (ext !== '.cjs') findDuplicateTopLevel(src);
    const isCjs = ext === '.cjs' || (ext === '.js' && /[\\/]legacy[\\/]/.test(f));
    if (isCjs) {
      // CommonJS: 모듈 래퍼 안에서 컴파일 (top-level return 허용). 문자열 결합으로 감싸야 소스의 백틱이 깨지지 않음.
      const body = src.startsWith('#!') ? src.slice(src.indexOf('\n')) : src;   // shebang 제거
      new vm.Script('(function (exports, require, module, __filename, __dirname) {' + body + '\n})', { filename: f });
    } else {
      const { code } = await transform(src, { loader: 'ts', format: 'esm', target: 'es2022', tsconfigRaw, sourcefile: f });
      new vm.SourceTextModule(code, { identifier: f });
    }
    ok++;
  } catch (e) {
    fail++;
    console.log(`✗ ${path.relative(root, f)}: ${String(e.message).split('\n')[0]}`);
  }
}
console.log(`syntax-check: ok=${ok} fail=${fail}`);
process.exit(fail ? 1 : 0);
