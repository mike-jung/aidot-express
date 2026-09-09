/**
 * Node.js ESM 커스텀 로더.
 * - 프로젝트 내 .js / .mjs / .ts / .mts 파일을 로딩 직전에 esbuild 로 전처리.
 * - tsconfigRaw 로 레거시 데코레이터를 활성화해서 .js 파일에서도 @Controller 등이 동작.
 * - node_modules 는 건너뜀.
 * - 인라인 소스맵을 붙여서 스택트레이스(로거 호출 위치)가 원본 줄번호로 보이게 함.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { transform } from 'esbuild';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const tsconfigRaw = {
  compilerOptions: {
    target: 'ES2022',
    module: 'ESNext',
    useDefineForClassFields: false,
    experimentalDecorators: true,
    emitDecoratorMetadata: false,
  },
};

// CommonJS keeps native module.exports/require semantics; never rewrite it as ESM.
const TRANSFORM_EXT = new Set(['.js', '.mjs', '.ts', '.mts']);
const sep = path.sep;

export async function load(url, context, nextLoad) {
  if (!url.startsWith('file://')) return nextLoad(url, context);

  const filePath = fileURLToPath(url);
  const ext = path.extname(filePath).toLowerCase();

  if (!TRANSFORM_EXT.has(ext)) return nextLoad(url, context);
  if (filePath.includes(`${sep}node_modules${sep}`)) return nextLoad(url, context);

  const source = await readFile(filePath, 'utf8');

  // .ts / .mts 는 Node 가 기본 지원을 안 하므로 반드시 변환.
  // .js / .mjs 는 plain JS 일 가능성이 높지만, 데코레이터 / TS 문법이 있을 수도 있음.
  // 성능을 고려해 '@' 가 소스에 등장할 때만 변환, 그 외엔 pass-through.
  const needsTransform =
    ext === '.ts' || ext === '.mts' || source.includes('@') || source.includes('?.');

  if (!needsTransform) return nextLoad(url, context);

  const { code } = await transform(source, {
    loader: ext === '.ts' || ext === '.mts' ? 'ts' : 'ts',
    format: 'esm',
    target: 'es2022',
    tsconfigRaw,
    sourcefile: filePath,
    sourcemap: 'inline',
  });

  return {
    format: 'module',
    source: code,
    shortCircuit: true,
  };
}

/**
 * ★ v1.11.1 — 작업 폴더(APP_WORKSPACE) 안의 파일이 `'../core/decorators.js'` 처럼 **src/ 기준**으로 적은
 *   프레임워크 import 를 src/ 로 돌려준다.
 *
 *   왜: 튜토리얼과 예제는 `import { Service } from '../core/decorators.js'` 로 적혀 있다. 같은 파일을
 *   src/service/ 에 두면 되고 workspace/service/ 에 두면 `workspace/core/…` 를 찾다 실패한다.
 *   "폴더에 따라 import 를 다르게 적어라" 는 처음 배우는 사람에게 함정이다. 여기서 받아 준다.
 *   명시적으로 적은 `'../../src/core/…'` 도 그대로 동작한다 (여기 안 걸린다).
 *
 *   조건: import 하는 파일이 작업 폴더 안이고, 지정자가 `../<프레임워크 폴더>/` 로 시작할 때만.
 */
const FRAMEWORK_DIRS = new Set(['core', 'database', 'util', 'service', 'config', 'secure', 'controller', 'model', 'types']);
let _workspaceRoot;   // undefined = 아직 안 읽음, null = 지정 안 됨
function workspaceRootFromEnv() {
  if (_workspaceRoot !== undefined) return _workspaceRoot;
  const raw = process.env.APP_WORKSPACE;
  _workspaceRoot = raw && raw.trim() ? path.resolve(projectRoot, raw.trim()) : null;
  return _workspaceRoot;
}

export async function resolve(specifier, context, nextResolve) {
  const m = /^\.\.\/([^/]+)\/(.+)$/.exec(specifier);
  if (m && FRAMEWORK_DIRS.has(m[1]) && context.parentURL && context.parentURL.startsWith('file:')) {
    const ws = workspaceRootFromEnv();
    if (ws) {
      const parentPath = fileURLToPath(context.parentURL);
      const rel = path.relative(ws, parentPath);
      if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
        const target = path.resolve(projectRoot, 'src', m[1], m[2]);
        // 작업 폴더 안에 진짜로 그 파일이 있으면(예: workspace/service/X.js 에서 ../sql/…) 손대지 않는다
        const literal = path.resolve(path.dirname(parentPath), specifier);
        if (!fs.existsSync(literal) && fs.existsSync(target)) {
          return nextResolve(pathToFileURL(target).href, context);
        }
      }
    }
  }
  return nextResolve(specifier, context);
}
