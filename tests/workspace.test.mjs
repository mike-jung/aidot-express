/**
 * 작업 폴더 — 내가 만든 파일을 내 폴더에. (v1.10.42)
 *
 * ## 문제
 * `src/controller/` 에 예제가 13개 들어 있어, 튜토리얼을 따라 만든 파일이
 * **14개 중 하나**가 되어 찾기 어려웠다.
 *
 * ## 방법
 * `.env` 에 `APP_WORKSPACE=workspace` 를 적으면 그 안의
 * controller/ · service/ · sql/ 을 **추가로** 읽는다. 예제도 그대로 돈다.
 *
 * ⚠ 지정하지 않으면 예전과 **똑같이** 동작한다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('★ 경로 해석이 한 곳에 모여 있다', () => {
  const ap = read('src/core/appPaths.js');
  for (const fn of ['resolveDirs', 'existingDirs', 'writeDirFor', 'isWorkspaceFile', 'workspaceRoot']) {
    assert.match(ap, new RegExp(`export function ${fn}\\b`), `${fn} 가 없다`);
  }
});

test('★ 작업 폴더를 나중에 읽는다', () => {
  /* 같은 이름이 양쪽에 있으면 **나중에 읽은 것이 이긴다.**
     예제를 손대지 않고 고쳐 쓰려면 내 것이 나중이어야 한다. */
  const ap = read('src/core/appPaths.js');
  const basePos = ap.indexOf('// ① 기본 경로');
  const wsPos = ap.indexOf('// ② 작업 폴더');
  assert.ok(basePos > 0 && wsPos > basePos, '작업 폴더가 기본보다 먼저 들어간다');
});

test('★ 로더가 모든 폴더를 순회한다', () => {
  const cl = read('src/core/controllerLoader.js');
  const sl = read('src/core/sqlLoader.js');
  assert.match(cl, /for \(const dir of existingDirs\('controllers'\)\)/);
  assert.match(cl, /for \(const dir of existingDirs\('services'\)\)/);
  assert.match(sl, /for \(const dir of existingDirs\('sql'\)\)/);
});

test('★ 새 파일은 작업 폴더로, 스캔은 모든 폴더', () => {
  /* 쓰기와 스캔을 갈라야 한다. 스캔이 한 곳만 보면
     **콘솔에서 만든 파일이 목록에서 사라진다.** */
  for (const [f, kind] of [
    ['lib/admin/service/ControllerMetaService.js', 'controllers'],
    ['lib/admin/service/ServiceMetaService.js', 'services'],
    ['lib/admin/service/SqlMetaService.js', 'sql'],
  ]) {
    const s = read(f);
    assert.match(s, new RegExp(`writeDirFor\\('${kind}'\\)`), `${f}: 쓰기 경로`);
    assert.match(s, new RegExp(`existingDirs\\('${kind}'\\)`), `${f}: 스캔 경로`);
  }
});

test('★ 목록에 출처가 표시된다', () => {
  for (const f of ['ControllerMetaService', 'ServiceMetaService', 'SqlMetaService']) {
    const s = read(`lib/admin/service/${f}.js`);
    assert.match(s, /origin: isWorkspaceFile\(filePath\) \? 'workspace' : 'builtin'/, f);
    assert.match(s, /isWorkspaceFile/, `${f}: import`);
  }
});

test('★ 배포에서 빠지지 않는다', () => {
  /* Electron 은 **포함 목록** 방식이라 여기 없으면 설치본에서 빠진다.
     개발에서는 되는데 설치본에서 내 API 가 404 가 된다. */
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.build.files.includes('workspace/**/*'), 'Electron 빌드에 작업 폴더가 없다');
  // release.mjs 는 제외 목록 방식이라 자동 포함된다 — 제외되지 않았는지만 본다
  const rel = read('scripts/release.mjs');
  assert.equal(/EXCLUDE_DIRS[^\n]*workspace/.test(rel), false, '배포에서 제외되고 있다');
});

test('★ 백업에도 담긴다', () => {
  const bs = read('lib/admin/service/BackupService.js');
  assert.match(bs, /workspaceRoot\(\)/);
  assert.match(bs, /\$\{rel\}\/controller`, `\$\{rel\}\/service`, `\$\{rel\}\/sql`/);
  // 복원 허용 경로도 넓혀야 한다 — 아니면 복원이 거부된다
  assert.match(bs, /allowedPrefixes\.push\(/);
});

test('복원 가드가 프로젝트 밖을 막는다', () => {
  const bs = read('lib/admin/service/BackupService.js');
  // 임의 경로 쓰기를 막는 보안 가드다 — 넓히되 밖으로 나가면 안 된다
  assert.match(bs, /!rel\.startsWith\('\.\.'\)/);
});

test('지정하지 않으면 예전과 같다', () => {
  const def = read('src/config/default.js');
  assert.match(def, /workspace: '',/, '기본은 빈 값이어야 한다');
});

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.10.43 — 생성 코드의 import 경로
   튜토리얼을 그대로 따라 하다 발견했다. 파일은 만들어졌는데 등록이 실패했다:

       Cannot find module '…/workspace/core/decorators.js'

   생성기가 `'../core/decorators.js'` 를 **고정으로** 박고 있었다.
   `src/service/` 에서는 맞지만 `workspace/service/` 는 깊이가 달라 틀린다.
   ══════════════════════════════════════════════════════════════════════════ */

test('★ 생성 코드의 import 를 대상 폴더 기준으로 계산한다', () => {
  const gen = read('lib/admin/service/codeGenerator.js');
  assert.match(gen, /export function frameworkImport\(targetDir, what\)/);
  // 고정 문자열이 남아 있으면 작업 폴더에서 모듈을 못 찾는다
  assert.equal(/from '\.\.\/core\/decorators\.js'/.test(gen), false,
    '고정 import 가 남아 있다');
  assert.equal(/from '\.\.\/database\/db\.js'/.test(gen), false,
    '고정 db import 가 남아 있다');
});

test('경로 계산이 깊이에 따라 달라진다', () => {
  const ROOT2 = ROOT;
  const calc = (targetDir, what) => {
    if (!targetDir) return `../${what}`;
    const abs = path.resolve(ROOT2, 'src', what);
    let rel = path.relative(targetDir, abs).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return rel;
  };
  assert.equal(calc(path.join(ROOT2, 'src/service'), 'core/decorators.js'),
    '../core/decorators.js');
  assert.equal(calc(path.join(ROOT2, 'workspace/service'), 'core/decorators.js'),
    '../../src/core/decorators.js');
  // 인자가 없으면 예전 동작 (기존 호출부가 깨지면 안 된다)
  assert.equal(calc(null, 'core/decorators.js'), '../core/decorators.js');
});

test('★ 생성기 호출부가 대상 폴더를 넘긴다', () => {
  const cm = read('lib/admin/service/ControllerMetaService.js');
  const sm = read('lib/admin/service/ServiceMetaService.js');
  assert.match(cm, /generateControllerCode\(meta, path\.dirname\(filePath\)\)/);
  assert.match(sm, /generateServiceCodeStandalone\(input, path\.dirname\(filePath\)\)/);
});

test('★ filePath 를 선언한 뒤에 쓴다', () => {
  /* 선언보다 앞에서 쓰면 ReferenceError 다 — 실제로 그렇게 넣었다가 잡았다. */
  for (const [f, decl, use] of [
    ['lib/admin/service/ControllerMetaService.js',
     'const filePath = this._controllerFilePath(meta.name);',
     'generateControllerCode(meta, path.dirname(filePath))'],
    ['lib/admin/service/ServiceMetaService.js',
     'const filePath = this._serviceFilePath(input.name);',
     'generateServiceCodeStandalone(input, path.dirname(filePath))'],
  ]) {
    const s = read(f);
    const d = s.indexOf(decl);
    const u = s.indexOf(use, d);      // 선언 이후에 사용이 있어야 한다
    assert.ok(d > 0 && u > d, `${f}: filePath 선언 전에 사용한다`);
  }
});
