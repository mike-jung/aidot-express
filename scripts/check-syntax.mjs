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
const SKIP = new Set(['node_modules', 'dist', 'dist-electron', 'log', '.git', 'public', '.tmp', '.cache', 'data']);
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
let ok = 0, fail = 0;
for (const f of await walk(root)) {
  const src = await readFile(f, 'utf8');
  const ext = path.extname(f);
  try {
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
