/**
 * tests/settings-workspace.test.mjs — 설정 대화상자의 작업 폴더 기능 (v1.12.0)
 *   ① ConfigService.getWorkspace — 현재 폴더·하위 폴더·파일 수·후보
 *   ② setWorkspace — .env 를 고치고 메모리 설정까지 반영, 폴더를 만들어 준다
 *   ③ 막아야 할 경로 — 프로젝트 밖 · 프레임워크 폴더 · 빈 값(끄기)
 *   ④ 대화상자 — 섹션 목록·검색·접근성·즉시 저장 (소스)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../src/config/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const { default: ConfigService } = await import('../lib/admin/service/ConfigService.js');

/** .env 와 config 를 건드리므로 원래대로 되돌린다 */
async function withSandboxEnv(fn) {
  const envPath = path.join(ROOT, '.env');
  const before = fs.existsSync(envPath) ? fs.readFileSync(envPath) : null;
  const prevWs = config.paths?.workspace;
  const prevEnv = process.env.APP_WORKSPACE;
  try { return await fn(); }   // ★ 비동기 본문이 끝난 뒤에 되돌린다
  finally {
    if (before !== null) fs.writeFileSync(envPath, before); 
    config.paths.workspace = prevWs;
    if (prevEnv === undefined) delete process.env.APP_WORKSPACE; else process.env.APP_WORKSPACE = prevEnv;
  }
}

test('① getWorkspace: 현재 폴더와 하위 폴더 상태', () => {
  const svc = new ConfigService();
  Object.defineProperty(svc, 'log', { value: { info() {}, warn() {}, error() {}, debug() {} } });
  const w = svc.getWorkspace();
  assert.equal(typeof w.configured, 'string');
  assert.equal(w.projectRoot, ROOT);
  assert.deepEqual(w.folders.map((f) => f.kind), ['controllers', 'services', 'sql', 'scenarios']);
  for (const f of w.folders) {
    assert.equal(typeof f.count, 'number');
    assert.ok(f.sub && (f.path === null || !path.isAbsolute(f.path)), '경로는 프로젝트 기준 상대');
  }
  assert.ok(w.candidates.includes('workspace'));
  assert.ok(w.defaultDirs.controllers === 'src/controller');
});

test('② setWorkspace: .env 와 메모리 설정을 함께 바꾸고 폴더를 만든다', async () => {
  const svc = new ConfigService();
  Object.defineProperty(svc, 'log', { value: { info() {}, warn() {}, error() {}, debug() {} } });
  const name = `ws-test-${Date.now().toString(36).slice(-5)}`;
  await withSandboxEnv(async () => {
    const r = await svc.setWorkspace({ dir: name, create: true });
    assert.equal(r.configured, name);
    assert.equal(config.paths.workspace, name, '메모리 설정도 즉시');
    assert.equal(process.env.APP_WORKSPACE, name);
    assert.match(read('.env'), new RegExp(`^APP_WORKSPACE=${name}$`, 'm'), '.env 한 줄만 고친다');
    for (const sub of ['controller', 'service', 'sql', 'scenarios']) {
      assert.ok(fs.existsSync(path.join(ROOT, name, sub)), `${sub} 폴더 생성`);
    }
    // appPaths 가 즉시 새 폴더를 쓴다
    const { writeDirFor } = await import('../src/core/appPaths.js');
    assert.equal(writeDirFor('controllers'), path.join(ROOT, name, 'controller'));
    // 끄기
    const off = await svc.setWorkspace({ dir: '' });
    assert.equal(off.enabled, false);
    assert.equal(config.paths.workspace, '');
    assert.match(read('.env'), /^APP_WORKSPACE=$/m);
  });
  fs.rmSync(path.join(ROOT, name), { recursive: true, force: true });
});

test('③ 막아야 할 경로', async () => {
  const svc = new ConfigService();
  Object.defineProperty(svc, 'log', { value: { info() {}, warn() {}, error() {}, debug() {} } });
  await withSandboxEnv(async () => {
    for (const bad of ['../outside', '../../etc', 'src', 'src/controller', 'lib/admin', 'node_modules/x', 'public/assets']) {
      await assert.rejects(() => svc.setWorkspace({ dir: bad }), (e) => e.status === 400, bad);
    }
    await assert.rejects(() => svc.setWorkspace({ dir: 'never-made-xyz', create: false }), (e) => e.status === 400, '없는 폴더 + create=false');
    assert.ok(!fs.existsSync(path.join(ROOT, 'never-made-xyz')));
  });
});

test('④ 설정 대화상자 — 섹션 목록 · 검색 · 접근성 · 즉시 저장', () => {
  const ui = read('admin-client/src/components/SettingsDialog.vue');
  assert.match(ui, /const SECTIONS = \[/, '왼쪽 섹션 목록');
  assert.match(ui, /key: 'workspace'/, '작업 폴더 섹션');
  assert.match(ui, /visibleSections/, '검색으로 거른다');
  assert.match(ui, /role="dialog" aria-modal="true" aria-labelledby="settingsTitle"/);
  assert.match(ui, /function trapTab/, '포커스 가두기');
  assert.match(ui, /Escape/, 'Esc 로 닫기');
  assert.match(ui, /lastFocused\.focus\(\);/, '닫으면 원래 자리로');
  assert.match(ui, /prefers-reduced-motion/, '움직임 줄이기 존중');
  assert.match(ui, /backdrop-filter/, '유리 배경');
  assert.match(ui, /flashSaved\(\)/, '바꾸면 저장됨 표시');
  assert.match(ui, /config\/workspace/, '작업 폴더 API 사용');
  const ctrl = read('lib/admin/controller/ConfigController.js');
  assert.match(ctrl, /@GetMapping\('\/workspace'\)/);
  assert.match(ctrl, /@PutMapping\('\/workspace'\)[\s\S]{0,80}@Roles\('admin'\)/, '변경은 admin 만');
});

/* ══ v1.12.1 ══ */
test('⑤ 이름 조회는 서버에서 — 세 목록 모두, 페이지 밖의 이름도 찾는다', () => {
  for (const f of ['lib/admin/service/ControllerMetaService.js', 'lib/admin/service/ServiceMetaService.js', 'lib/admin/service/SqlMetaService.js']) {
    const src = read(f);
    assert.match(src, /const needle = String\(opts\.q \?\? ''\)/, f);
    assert.match(src, /byOrigin\.filter\(/, f + ' — 조회는 origin 필터 뒤에');
  }
  for (const f of ['lib/admin/controller/ControllerMetaController.js', 'lib/admin/controller/ServiceMetaController.js', 'lib/admin/controller/SqlMetaController.js']) {
    assert.match(read(f), /q: params\.q/, f);
  }
  for (const f of ['admin-client/src/views/ControllerList.vue', 'admin-client/src/views/ServiceList.vue', 'admin-client/src/views/SqlList.vue']) {
    const ui = read(f);
    assert.match(ui, /placeholder="?[^"]*serviceList\.filterByName/, f + ' — 검색란이 있다');
    assert.match(ui, /q: q\.value\.trim\(\) \|\| undefined/, f + ' — 서버로 보낸다');
    assert.match(ui, /page\.value = 1; load\(\);/, f + ' — 조회하면 1쪽부터');
  }
  // 화면 안에서만 거르던 옛 코드가 남아 있으면 안 된다
  for (const f of ['admin-client/src/views/ServiceList.vue', 'admin-client/src/views/SqlList.vue']) {
    assert.equal(/rows\.value\.filter\(\(r\) => String\(r\.name/.test(read(f)), false, f + ' — 페이지 안 필터 제거');
  }
});

test('⑥ 문구 — MCI 서버 연결 · 이름으로 조회하기', () => {
  const ko = read('admin-client/src/locales/ko.js');
  const en = read('admin-client/src/locales/en.js');
  // v1.13.3 에서 화면 용어를 EAI 로 바꿨다 (저장 값 MCI 는 그대로)
  assert.match(ko, /mciTitle: 'EAI 서버 연결'/);
  assert.match(en, /mciTitle: 'EAI server connection'/);
  assert.match(ko, /filterByName: '이름으로 조회하기'/);
  assert.match(en, /filterByName: 'Search by name'/);
});

/* ══ v1.12.2 — 업무 테이블 스키마 ══ */
import { appSchemaName, qualifyAppTable } from '../src/database/tablePrefix.js';
import { generateSqlFromTable } from '../lib/admin/service/codeGenerator.js';

test('⑦ qualifyAppTable: 정해 두면 스키마를 붙이고, 이미 붙어 있으면 그대로', () => {
  const prev = config.db.appSchema; const prevType = config.db.type;
  try {
    config.db.type = 'mariadb';
    config.db.appSchema = '';
    assert.equal(appSchemaName(), '');
    assert.equal(qualifyAppTable('snack'), 'snack', '비우면 예전 동작 (접속 스키마)');
    config.db.appSchema = 'aidot_app';
    assert.equal(appSchemaName(), 'aidot_app');
    assert.equal(qualifyAppTable('snack'), 'aidot_app.snack');
    assert.equal(qualifyAppTable('sample.book'), 'sample.book', '이미 스키마가 있으면 손대지 않는다');
    assert.equal(qualifyAppTable(''), '');
    config.db.appSchema = '나쁜 이름';
    assert.throws(() => appSchemaName(), /DB_APP_SCHEMA/);
    config.db.type = 'sqlite'; config.db.appSchema = 'aidot_app';
    assert.equal(appSchemaName(), '', 'SQLite 는 스키마 개념이 달라 쓰지 않는다');
  } finally { config.db.appSchema = prev; config.db.type = prevType; }
});

test('⑧ 생성되는 SQL 이 스키마로 한정된다', () => {
  const cols = [{ name: 'id', isPk: true, insertable: false }, { name: 'name' }, { name: 'price' }];
  const sql = generateSqlFromTable({ fileName: 'snack', tableName: 'aidot_app.snack', columns: cols, description: '간식' });
  for (const kw of ['FROM aidot_app.snack', 'INSERT INTO aidot_app.snack', 'UPDATE aidot_app.snack', 'DELETE FROM aidot_app.snack']) {
    assert.ok(String(sql).includes(kw), kw);
  }
});

test('⑨ 스키마 설정 — API·검증·화면', () => {
  const svc = read('lib/admin/service/ConfigService.js');
  assert.match(svc, /async getAppSchema\(\)/);
  assert.match(svc, /async setAppSchema\(/);
  assert.match(svc, /information_schema\.SCHEMATA/, '있는 스키마 목록을 준다');
  assert.match(svc, /시스템 스키마는 쓸 수 없습니다/);
  assert.match(svc, /DB_APP_SCHEMA=/, '.env 한 줄만 고친다');
  const ctrl = read('lib/admin/controller/ConfigController.js');
  assert.match(ctrl, /@GetMapping\('\/app-schema'\)/);
  assert.match(ctrl, /@PutMapping\('\/app-schema'\)[\s\S]{0,80}@Roles\('admin'\)/, '변경은 admin 만');
  const meta = read('lib/admin/service/SqlMetaService.js');
  assert.match(meta, /qualifyAppTable\(input\.tableName\)/, '생성기가 스키마를 붙인다');
  assert.match(meta, /appSchemaName\(\) \|\| null/, '컬럼도 그 스키마에서 읽는다');
  const ui = read('admin-client/src/components/SettingsDialog.vue');
  assert.match(ui, /config\/app-schema/);
  assert.match(ui, /scWarnSample/, 'sample 을 고르면 경고');
});

test('⑪ 콘솔 문구도 Table 은 "테이블" — 설정 대화상자·한국어 사전', () => {
  /* 한국 개발자에게 table 은 "테이블" 이다. "표" 로 두면 화면(도표)과 헷갈린다. */
  const bare = /(?<![가-힣])표(?![시현준기본])/;
  const ko = read('admin-client/src/locales/ko.js');
  const set2 = ko.slice(ko.indexOf('  set2: {'), ko.indexOf('\n  },', ko.indexOf('  set2: {')));
  assert.equal(bare.test(set2), false, `설정 사전에 "표" 가 남아 있다: ${(set2.match(bare) || [])[0] || ''}`);
  assert.match(set2, /시스템 테이블/); assert.match(set2, /예제 테이블/); assert.match(set2, /업무 테이블/);
  assert.equal(bare.test(read('admin-client/src/components/SettingsDialog.vue')), false, '대화상자 소스에도 남아 있으면 안 된다');
  assert.match(ko, /density: '테이블 밀도'/);
});

test('⑩ .env.example — 사용자 설명만, 중복 키 없음, 업무 스키마 기본값', () => {
  const env = read('.env.example');
  // 변경 이력·버전 딱지는 설정 파일에 남기지 않는다 (그건 CHANGELOG 의 몫)
  assert.equal(/★|v1\.\d+\.\d+|예전에는|신설/.test(env), false, '변경 이력 주석이 남아 있으면 안 된다');
  /* ★ v1.34.3 — 공개용 .env.example 은 영문이므로 한글 표기 검사는 필요 없다.
     대신 한글이 아예 없어야 한다 — 공개 저장소는 세계 어디서나 읽힌다. */
  assert.equal(/[가-힣]/.test(env), false, '공개용 .env.example 에 한글이 남으면 안 된다');
  /* ★ v1.34.3 — 공개용 .env.example 은 영문이다 */
  assert.match(env, /Framework tables/);
  assert.match(env, /Sample tables/);
  assert.match(env, /Your tables/);
  // 같은 키가 두 번 나오면 뒤엣것이 이겨서 의도와 달라진다
  const keys = env.split('\n').map((l) => /^([A-Z][A-Z0-9_]*)=/.exec(l.trim())?.[1]).filter(Boolean);
  const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
  assert.deepEqual([...new Set(dup)], [], '중복된 키');
  // 업무 테이블 스키마 기본값
  assert.match(env, /^DB_APP_SCHEMA=aidot_app$/m);
  // 기동할 때 스키마를 만들어 주므로 기본값이 안전하다
  assert.match(read('src/database/db.js'), /appSchemaName\(\)/, '기동 시 업무 스키마 생성');
});
