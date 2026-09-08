/**
 * tests/workspace-existing.test.mjs — 작업 폴더(APP_WORKSPACE)가 켜진 상태에서
 *   · 새 파일은 작업 폴더로, **기존 파일은 있는 곳에서** 읽고·고치고·지우는가
 *   · MCI 생성기가 저장될 폴더 기준으로 import 경로를 만드는가
 *
 *  v1.11.1 에서 잡은 결함: 작업 폴더를 지정하면 src/controller 의 기존 파일이 목록에는 보이는데 열면 null/404,
 *  MCI 생성기는 '../core/decorators.js' 를 박아 넣어 작업 폴더에서 로드 실패.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import config from '../src/config/index.js';
import { findExistingFile, writeDirFor, existingDirs } from '../src/core/appPaths.js';
import { frameworkImport } from '../lib/admin/service/codeGenerator.js';
import { generateMciControllerCode, fixFrameworkImports } from '../lib/admin/service/mci/mciCodeGenerator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const withWorkspace = async (fn) => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-wsx-'));
  const prev = config.paths.workspace;
  config.paths.workspace = ws;
  try { await fn(ws); } finally { config.paths.workspace = prev; fs.rmSync(ws, { recursive: true, force: true }); }
};

const sampleMeta = () => ({
  type: 'type01', controllerName: 'XyzMciController', basePath: '/api/mci/xyz', description: 'd',
  interfaceId: 'mzd_xyz_l01', requestBlockName: 'mzs_xyz_001', responseBlockName: 'mzc_xyz_002', auth: true,
  inputMapping: [{ apiName: 'a', mciName: 'a', desc: '' }], outputMapping: [{ apiName: 'b', mciName: 'b', desc: '' }],
});

test('findExistingFile: 작업 폴더가 기본 폴더보다 먼저, 없으면 null', async () => {
  await withWorkspace((ws) => {
    fs.mkdirSync(path.join(ws, 'controller'), { recursive: true });
    assert.equal(findExistingFile('controllers', 'BookController.js'), path.join(ROOT, 'src', 'controller', 'BookController.js'), '기존 파일은 src 에서 찾는다');
    assert.equal(findExistingFile('controllers', 'NoSuchController.js'), null);
    fs.writeFileSync(path.join(ws, 'controller', 'BookController.js'), '// shadow');
    assert.equal(findExistingFile('controllers', 'BookController.js'), path.join(ws, 'controller', 'BookController.js'), '같은 이름이면 작업 폴더가 이긴다');
    assert.equal(findExistingFile('controllers', ['Nope.ts', 'BookController.js']), path.join(ws, 'controller', 'BookController.js'));
    assert.equal(writeDirFor('controllers'), path.join(ws, 'controller'));
    assert.ok(existingDirs('controllers').includes(path.join(ws, 'controller')));
  });
});

test('★ MCI 생성기: 저장 폴더 기준으로 decorators 를 import 한다', async () => {
  await withWorkspace((ws) => {
    const dir = path.join(ws, 'controller');
    const code = generateMciControllerCode(sampleMeta(), dir);
    const expected = frameworkImport(dir, 'core/decorators.js');
    assert.ok(code.includes(`from '${expected}';`), `기대 ${expected}\n${code.split('\n').slice(0, 15).join('\n')}`);
    assert.ok(!code.includes("from '../core/decorators.js'"));
    // 폴더를 안 주면 예전 동작 (src/controller 기준)
    assert.ok(generateMciControllerCode(sampleMeta()).includes("from '../core/decorators.js';"));
    // src/controller 를 주면 결과가 예전과 같다
    assert.ok(generateMciControllerCode(sampleMeta(), path.join(ROOT, 'src', 'controller')).includes("from '../core/decorators.js';"));
  });
});

test("사용자가 고친 템플릿이 '../core/…' 를 박아 넣어도 저장 폴더 기준으로 고쳐 준다", () => {
  const dir = path.join(ROOT, 'workspace', 'controller');
  const src = "import { A } from '../core/decorators.js';\nimport db from \"../database/db.js\";\nimport x from '../other/keep.js';";
  const out = fixFrameworkImports(src, dir);
  assert.ok(out.includes("from '../../src/core/decorators.js'"), out);
  assert.ok(out.includes('from "../../src/database/db.js"'), out);
  assert.ok(out.includes("from '../other/keep.js'"), '프레임워크 폴더가 아니면 손대지 않는다');
  assert.equal(fixFrameworkImports(src, null), src);
});

test('frameworkImport: 프로젝트 안 작업 폴더면 상대 경로, 폴더를 안 주면 예전 값', () => {
  assert.equal(frameworkImport(path.join(ROOT, 'workspace', 'controller'), 'core/decorators.js'), '../../src/core/decorators.js');
  assert.equal(frameworkImport(path.join(ROOT, 'src', 'controller'), 'core/decorators.js'), '../core/decorators.js');
  assert.equal(frameworkImport(null, 'core/decorators.js'), '../core/decorators.js');
  const abs = frameworkImport(path.join(os.tmpdir(), 'elsewhere'), 'core/decorators.js');
  assert.ok(abs.startsWith('.') || abs.startsWith('file://'), '프로젝트 밖이면 상대 경로(POSIX) 또는 file:// URL(Windows 다른 드라이브)');
  assert.equal(pathToFileURL(path.join(ROOT, 'src', 'core', 'decorators.js')).href.startsWith('file://'), true);
});

test('★ ControllerMetaService: 작업 폴더가 켜져도 기존 src/controller 파일을 찾고, 제자리에서 고친다', async () => {
  const { default: ControllerMetaService } = await import('../lib/admin/service/ControllerMetaService.js');
  const svc = new ControllerMetaService();
  await withWorkspace(async (ws) => {
    const found = await svc.findById('BookController');
    assert.ok(found, '기존 파일이 열려야 한다');
    assert.equal(found.origin ?? 'builtin', 'builtin');
    assert.equal(svc._existingControllerPath('BookController'), path.join(ROOT, 'src', 'controller', 'BookController.js'));
    assert.equal(svc._controllerFilePath('BookController'), path.join(ws, 'controller', 'BookController.js'), '새 파일 경로는 작업 폴더');
    // 같은 이름으로 새로 만들려 하면 409 — 작업 폴더에 만들면 src 의 것을 가린다
    await assert.rejects(
      svc.create({ name: 'BookController', basePath: '/api/books-dup', routes: [{ type: 'custom', method: 'get', path: '/', handlerName: 'list', auth: false }], controllerType: 'DB' }, '// x'),
      (e) => e.status === 409,
    );
  });
});

test('★ ControllerMetaService: customCode 가 함수면 저장 폴더를 받아 코드를 만든다', async () => {
  const { default: ControllerMetaService } = await import('../lib/admin/service/ControllerMetaService.js');
  const svc = new ControllerMetaService();
  await withWorkspace(async (ws) => {
    let seenDir = null;
    const r = await svc.create(
      { name: 'WsxProbeController', basePath: '/api/wsx-probe', routes: [{ type: 'custom', method: 'post', path: '/', handlerName: 'call', auth: false }], controllerType: 'MCI', auth: false, roles: [] },
      (dir) => { seenDir = dir; return `// generated for ${dir}\nexport default class WsxProbeController {}\n`; },
    );
    assert.equal(seenDir, path.join(ws, 'controller'));
    assert.equal(r.filePath, path.join(ws, 'controller', 'WsxProbeController.js'));
    assert.ok(fs.existsSync(r.filePath));
    assert.ok(fs.existsSync(path.join(ws, 'controller', 'meta', 'WsxProbeController.meta.json')));
    // 제자리 수정 · 삭제
    const u = await svc.update('WsxProbeController', { name: 'WsxProbeController', basePath: '/api/wsx-probe', routes: [{ type: 'custom', method: 'post', path: '/', handlerName: 'call', auth: false }], controllerType: 'MCI', auth: false, roles: [] }, '// v2\nexport default class WsxProbeController {}\n');
    assert.equal(u.filePath, r.filePath);
    assert.ok(fs.readFileSync(r.filePath, 'utf8').startsWith('// v2'));
    await svc.remove('WsxProbeController');
    assert.ok(!fs.existsSync(r.filePath));
  });
});

test('★ Service/SQL 메타도 작업 폴더가 켜진 채로 기존 파일을 찾는다', async () => {
  const { default: ServiceMetaService } = await import('../lib/admin/service/ServiceMetaService.js');
  const { default: SqlMetaService } = await import('../lib/admin/service/SqlMetaService.js');
  const ssvc = new ServiceMetaService();
  const qsvc = new SqlMetaService();
  await withWorkspace(async (ws) => {
    const s = await ssvc.findById('BookService');
    assert.ok(s, 'src/service 의 기존 서비스가 열려야 한다');
    assert.equal(ssvc._existingServiceFilePath('BookService'), path.join(ROOT, 'src', 'service', 'BookService.js'));
    assert.equal(ssvc._serviceFilePath('BookService'), path.join(ws, 'service', 'BookService.js'));
    const q = await qsvc.findById('book');
    assert.ok(q, 'src/database/sql 의 기존 SQL 이 열려야 한다');
    assert.equal(qsvc._existingSqlFilePath('book'), path.join(ROOT, 'src', 'database', 'sql', 'book.sql'));
    assert.equal(await ssvc.findById('NoSuchService'), null);
    assert.equal(await qsvc.findById('no_such_sql'), null);
  });
});
