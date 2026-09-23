// Child process: Node's test runner treats deliberately unhandled promises as test
// failures even when the application contains them. Exercise the real process policy.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aidot-load-'));
const workspace = path.join(dir, 'workspace');
await fs.mkdir(path.join(workspace, 'controller'), { recursive: true });
await fs.mkdir(path.join(workspace, 'service'), { recursive: true });
await fs.mkdir(path.join(workspace, 'sql'), { recursive: true });
Object.assign(process.env, {
  NODE_ENV: 'development', DB_TYPE: 'sqlite', DB_FILE: path.join(dir, 'app.db'),
  APP_WORKSPACE: workspace, AIDOT_ENV_FILE: path.join(dir, 'test.env'), AIDOT_DATA_DIR: dir,
  AUTH_ACCESS_SECRET: crypto.randomBytes(48).toString('base64url'),
  LOG_DIR: path.join(dir, 'logs'), SECURE_ENABLED: 'false', MCI_ENABLED: 'false',
  EAI_ENABLED: 'false', HA_ENABLED: 'false', RATE_LIMIT_ENABLED: 'false',
});
await fs.writeFile(process.env.AIDOT_ENV_FILE, '');
const scenario = process.argv[2];
const source = `import { Controller, GetMapping, RequestMapping, Service, Autowired } from '@aidot/core/decorators.js';\n`;
const controller = (name, base, body = `return { value: 'old' };`, constructor = '') =>
  source + `@Controller('${base}') export default class ${name} { ${constructor}\n@GetMapping('/') async index() { ${body} } }\n`;
const service = (name, body = `value() { return 'old'; }`) =>
  source + `@Service('${name}') export default class ${name} { ${body} }\n`;
const write = async (kind, name, text) => {
  const file = path.join(workspace, kind, name + '.js');
  await fs.writeFile(file, text);
  return file;
};
let server;
let child;
try {
  const loader = await import('../../src/core/controllerLoader.js');
  const { default: container } = await import('../../src/core/container.js');
  const { default: express } = await import('../../src/core/httpApp.js');
  const app = express();
  app.use(loader.dynamicRouter);
  app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (url) => {
    const res = await fetch(base + url);
    return { status: res.status, body: res.status === 404 ? null : await res.json() };
  };

  if (scenario === 'primitive') {
    const thrownValues = ['null', 'undefined', `'plain text'`, 'Object.create(null)',
      `Object.assign(new Error('modified message'), { message: null })`];
    for (const [i, value] of thrownValues.entries()) {
      await write('service', `A${i}BadService`, `throw ${value};`);
      await write('controller', `A${i}BadController`, `throw ${value};`);
    }
    await write('service', 'ZGoodService', service('ZGoodService'));
    await write('controller', 'ZGoodController', controller('ZGoodController', '/healthy'));
    await loader.loadServicesFromDir(path.join(workspace, 'service'));
    await loader.loadControllersFromDir(app, path.join(workspace, 'controller'));
    assert.equal(container.resolve('ZGoodService').value(), 'old');
    assert.equal((await get('/healthy')).status, 200);
    assert.equal(loader.bootProblems.length, thrownValues.length * 2);
    assert.ok(loader.bootProblems.every(p => typeof p.message === 'string' && p.file));
  } else if (scenario === 'controller') {
    const file = await write('controller', 'StableController', controller('StableController', '/stable'));
    await loader.loadSingleControllerFile(app, file);
    const badCandidates = [
      controller('StableController', '/stable', '', `constructor() { throw new Error('constructor probe'); }`),
      `export default class Undecorated {}`,
      `export default {};`,
      source + `@Controller('/stable') export default class Empty {}`,
      source + `@Controller('/stable') export default class InvalidRoute { @GetMapping('/bad/:') index() {} }`,
      source + `@Controller('/bad/:') export default class InvalidBase { @GetMapping('/') index() {} }`,
      source + `@Controller('/stable') export default class InvalidMethod { @RequestMapping({method:'use'}) index() {} }`,
      source + `@Controller('/stable') export default class InvalidHandler { @GetMapping('/') index = 1; }`,
      `const = syntaxError;`,
      `import './missing-dependency.js';`,
    ];
    for (const bad of badCandidates) {
      await fs.writeFile(file, bad);
      await assert.rejects(loader.loadSingleControllerFile(app, file));
      assert.equal((await get('/stable')).body.data.value, 'old');
      assert.equal(loader.listRegisteredControllers().filter(r => r.file === file).length, 1);
    }
    await fs.writeFile(file, controller('StableController', '/moved', `return { value: 'new' };`));
    await loader.loadSingleControllerFile(app, file);
    assert.equal((await get('/stable')).status, 404);
    assert.equal((await get('/moved')).body.data.value, 'new');
    assert.equal(loader.bootProblems.filter(p => p.file === file).length, 0);
    await fs.writeFile(file, controller('StableController', '/moved', 'throw null;'));
    await loader.loadSingleControllerFile(app, file);
    assert.equal((await get('/moved')).status, 500);
    // A frozen clock must not cause two reloads to reuse the same ESM module.
    const clock = Date.now;
    Date.now = () => 12345;
    try {
      for (const value of ['one', 'two']) {
        await fs.writeFile(file, controller('StableController', '/moved', `return { value: '${value}' };`));
        await loader.loadSingleControllerFile(app, file);
        assert.equal((await get('/moved')).body.data.value, value);
      }
    } finally { Date.now = clock; }
  } else if (scenario === 'service') {
    const file = await write('service', 'StableService', service('StableService'));
    await loader.loadSingleServiceFile(file);
    const old = container.resolve('StableService');
    await fs.writeFile(file, service('StableService', `value() { return 'broken'; }`) + 'throw null;');
    await assert.rejects(loader.loadSingleServiceFile(file));
    assert.equal(container.resolve('StableService'), old);
    await fs.writeFile(file, service('StableService', `constructor() { throw new Error('bad service constructor'); }`));
    await assert.rejects(loader.loadSingleServiceFile(file), /bad service constructor/);
    assert.equal(container.resolve('StableService'), old);
    await fs.writeFile(file, service('StableService', `value() { return 'new'; }`));
    await loader.loadSingleServiceFile(file);
    assert.equal(container.resolve('StableService').value(), 'new');
    await fs.writeFile(file, 'export default class MissingServiceDecorator {}');
    await assert.rejects(loader.loadSingleServiceFile(file), /no service registered/);
    assert.equal(container.resolve('StableService').value(), 'new');
    container.registerFactory('CycleA', () => container.resolve('CycleB'));
    container.registerFactory('CycleB', () => container.resolve('CycleA'));
    assert.throws(() => container.resolve('CycleA'), /Circular dependency: CycleA -> CycleB -> CycleA/);
    // A request during an awaited import must see the committed instance, not the staged one.
    const ready = container.resolve('StableService');
    await fs.writeFile(file, service('StableService', `value() { return 'candidate'; }`) +
      `await new Promise(r => setTimeout(r, 100)); throw new Error('late failure');`);
    const pending = loader.loadSingleServiceFile(file);
    const rejected = assert.rejects(pending, /late failure/);
    await delay(50);
    assert.equal(container.resolve('StableService'), ready);
    await rejected;
    assert.equal(container.resolve('StableService'), ready);
    const retryDir = path.join(dir, 'retry');
    await fs.mkdir(retryDir);
    const retryFile = path.join(retryDir, 'RetryService.js');
    await fs.writeFile(retryFile, service('RetryService') + 'throw undefined;');
    assert.equal((await loader.loadServicesFromDir(retryDir)).errors.length, 1);
    assert.equal(container.has('RetryService'), false);
    await fs.writeFile(retryFile, service('RetryService'));
    assert.equal((await loader.loadServicesFromDir(retryDir)).loaded.length, 1);
    assert.equal(container.resolve('RetryService').value(), 'old');
  } else if (scenario === 'async') {
    const file = await write('service', 'AsyncService', service('AsyncService') +
      `void (async () => { throw new Error('detached import probe'); })();`);
    await assert.rejects(loader.loadSingleServiceFile(file), /detached import probe/);
    assert.equal(container.has('AsyncService'), false);
    const late = await write('service', 'LateService', service('LateService') +
      `setTimeout(() => { Promise.reject(new Error('late detached probe')); }, 80);`);
    await loader.loadSingleServiceFile(late);
    await delay(180);
    assert.ok(loader.bootProblems.some(p => p.file === late && p.phase === 'async'));
    const good = await write('controller', 'AliveController', controller('AliveController', '/alive'));
    await loader.loadSingleControllerFile(app, good);
    assert.equal((await get('/alive')).status, 200);
  } else if (scenario === 'timeout') {
    process.env.CODE_LOAD_TIMEOUT_MS = '50';
    const file = await write('service', 'SlowService', source +
      `await new Promise(r => setTimeout(r, 140)); @Service('SlowService') export default class SlowService {}`);
    await assert.rejects(loader.loadSingleServiceFile(file), { code: 'CODE_LOAD_TIMEOUT' });
    await delay(220);
    assert.equal(container.has('SlowService'), false);
    await fs.writeFile(file, service('SlowService'));
    await loader.loadSingleServiceFile(file);
    assert.equal(container.resolve('SlowService').value(), 'old');
  } else if (scenario === 'framework-fatal') {
    const { installCodeRejectionHandler } = await import('../../src/core/codeLoadBoundary.js');
    installCodeRejectionHandler();
    Promise.reject(new Error('framework fatal probe'));
    await delay(1000);
    assert.fail('an unowned rejection was swallowed');
  } else if (scenario === 'bulk') {
    const { default: WorkspaceLoadService, setApp } = await import('../../lib/admin/service/WorkspaceLoadService.js');
    setApp(app);
    const svc = new WorkspaceLoadService();
    // Limit discovery to this disposable workspace so this test never writes source-tree metadata.
    const allFiles = svc._files.bind(svc);
    svc._files = (kind, extensions) => allFiles(kind, extensions).filter(f => f.file.startsWith(workspace + path.sep));
    const bad = await write('service', 'ABadService', 'throw null;');
    await write('service', 'GoodService', service('GoodService'));
    await write('controller', 'GoodController', controller('GoodController', '/bulk'));
    const first = await svc.loadAll();
    assert.equal(first.loaded.services, 1);
    assert.equal(first.errors.length, 1);
    assert.equal(first.errors[0].name, 'ABadService');
    await fs.writeFile(bad, service('ABadService'));
    const second = await svc.loadAll();
    assert.equal(second.errors.length, 0);
    assert.equal(container.resolve('ABadService').value(), 'old');
    assert.equal((await get('/bulk')).status, 200);
  } else if (scenario === 'metadata') {
    const { default: ControllerMetaService, setApp } = await import('../../lib/admin/service/ControllerMetaService.js');
    const { default: ServiceMetaService } = await import('../../lib/admin/service/ServiceMetaService.js');
    const { metaPathFor } = await import('../../lib/admin/service/metaStorage.js');
    setApp(app);
    const controllers = new ControllerMetaService();
    const services = new ServiceMetaService();
    const cMeta = { name: 'SavedController', basePath: '/saved', routes: [{ method: 'GET', path: '/', handler: 'index', type: 'custom' }] };
    const cSource = controller(cMeta.name, cMeta.basePath, `return { value: 'saved' };`,
      `constructor() { globalThis.__savedConstructions = (globalThis.__savedConstructions || 0) + 1; }`);
    const created = await controllers.create(cMeta, cSource);
    const oldMeta = await fs.readFile(metaPathFor(created.filePath), 'utf8');
    for (const rename of [false, true]) {
      const candidate = { ...cMeta, name: rename ? 'RenamedController' : cMeta.name, basePath: '/changed' };
      await assert.rejects(controllers.update(cMeta.name, candidate,
        controller(candidate.name, candidate.basePath, '', `constructor() { throw null; }`)), /동적 로딩 실패/);
      assert.equal(await fs.readFile(created.filePath, 'utf8'), cSource);
      assert.equal(await fs.readFile(metaPathFor(created.filePath), 'utf8'), oldMeta);
      assert.equal((await get('/saved')).body.data.value, 'saved');
      assert.equal((await get('/changed')).status, 404);
      assert.equal(globalThis.__savedConstructions, 1, 'rollback must not reconstruct the working controller');
      if (rename) await assert.rejects(fs.access(path.join(workspace, 'controller', candidate.name + '.js')));
    }
    const renamed = await controllers.update(cMeta.name, { ...cMeta, name: 'RenamedController', basePath: '/changed' },
      controller('RenamedController', '/changed', `return { value: 'renamed' };`));
    assert.equal((await get('/saved')).status, 404);
    assert.equal((await get('/changed')).body.data.value, 'renamed');
    assert.equal(renamed.registered, true);
    await assert.rejects(fs.access(created.filePath));
    const sMeta = { name: 'SavedService', sqlFile: 'test', methods: ['value'] };
    const sSource = service(sMeta.name);
    const saved = await services.create(sMeta, sSource);
    const sOldMeta = await fs.readFile(metaPathFor(saved.filePath), 'utf8');
    const instance = container.resolve(sMeta.name);
    for (const rename of [false, true]) {
      const candidate = { ...sMeta, name: rename ? 'RenamedService' : sMeta.name };
      await assert.rejects(services.update(sMeta.name, candidate, service(candidate.name) + 'throw undefined;'), /동적 로딩 실패/);
      assert.equal(await fs.readFile(saved.filePath, 'utf8'), sSource);
      assert.equal(await fs.readFile(metaPathFor(saved.filePath), 'utf8'), sOldMeta);
      assert.equal(container.resolve(sMeta.name), instance);
      if (rename) {
        await assert.rejects(fs.access(path.join(workspace, 'service', candidate.name + '.js')));
        assert.equal(container.has(candidate.name), false);
      }
    }
    await assert.rejects(services.create({ ...sMeta, name: 'FailedService' }, 'throw null;'));
    await assert.rejects(fs.access(path.join(workspace, 'service', 'FailedService.js')));
    await assert.rejects(fs.access(metaPathFor(path.join(workspace, 'service', 'FailedService.js'))));
  } else if (scenario === 'startup') {
    await write('service', 'ABadPrimitiveService', 'throw null;');
    await write('service', 'BBadAsyncService', 'await Promise.reject(undefined);');
    await write('service', 'CBadDetachedService', `void (async () => { throw new Error('detached boot failure'); })();`);
    await write('service', 'ConstructorService', service('ConstructorService', `constructor() { throw new Error('lazy constructor failure'); }`));
    await write('service', 'HealthyService', service('HealthyService', `value() { return 'healthy'; }`));
    await write('service', 'LateService', service('LateService') +
      `new Promise((_resolve, reject) => { globalThis.__loaderProbeReject = reject; });`);
    await write('controller', 'ABadSyntaxController', 'export default class { @GetMapping(;');
    await write('controller', 'BBadImportController', `import './nonexistent.js';`);
    await write('controller', 'CBadCtorController', controller('CBadCtorController', '/bad', '', 'constructor() { throw undefined; }'));
    await write('controller', 'HealthyController', source + `
      @Controller('/api/load-test') export default class HealthyController {
        @Autowired('HealthyService') healthy;
        @Autowired('ConstructorService') broken;
        @GetMapping('/') async index() { return { value: this.healthy.value(), pid: process.pid }; }
        @GetMapping('/broken') async failure() { return this.broken.value(); }
        @GetMapping('/primitive') async primitive() { throw null; }
        @GetMapping('/trigger') async trigger() { globalThis.__loaderProbeReject(new Error('late live failure')); return { triggered: true }; }
      }`);
    const port = server.address().port;
    await new Promise(resolve => server.close(resolve));
    server = null;
    let output = '';
    child = spawn(process.execPath, ['--import', './src/loader/register.mjs', 'src/app.js'], {
      cwd: root, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DB_SAMPLES: 'none' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', text => { output += text; });
    child.stderr.on('data', text => { output += text; });
    let ready = false;
    for (let i = 0; i < 200; i++) {
      if (child.exitCode !== null) throw new Error('Real server exited during loading:\n' + output);
      try {
        const response = await fetch(base + '/health/ready', { signal: AbortSignal.timeout(500) });
        if (response.ok) { ready = true; break; }
      } catch { /* server is still starting */ }
      await delay(100);
    }
    assert.ok(ready, 'Real server did not become ready:\n' + output);
    const health = await get('/health/live');
    assert.equal(health.body.pid, child.pid);
    assert.equal((await get('/api/load-test')).body.data.value, 'healthy');
    assert.equal((await get('/api/load-test/broken')).status, 500);
    assert.equal((await get('/api/load-test/primitive')).status, 500);
    assert.equal((await get('/api/load-test/trigger')).status, 200);
    await delay(150);
    assert.equal((await get('/health/live')).body.pid, health.body.pid, 'process must not restart');
    assert.equal((await get('/api/load-test')).body.data.pid, child.pid);
    const readiness = await get('/health/ready');
    assert.equal(readiness.status, 200);
    const failures = readiness.body.details.skippedFiles;
    for (const name of ['ABadPrimitiveService', 'BBadAsyncService', 'CBadDetachedService',
      'ABadSyntaxController', 'BBadImportController', 'CBadCtorController', 'LateService']) {
      assert.ok(failures.some(p => path.basename(p.file) === name + '.js'), 'Missing diagnostic: ' + name);
    }
    const exit = once(child, 'exit');
    child.kill('SIGTERM');
    const [code] = await exit;
    assert.equal(code, 0, 'Real server did not shut down cleanly:\n' + output);
  } else {
    throw new Error('Unknown scenario: ' + scenario);
  }
  console.log(`PASS ${scenario}`);
} finally {
  if (child && child.exitCode === null) child.kill('SIGKILL');
  if (server) { server.closeAllConnections?.(); await new Promise(resolve => server.close(resolve)); }
  await fs.rm(dir, { recursive: true, force: true });
}
