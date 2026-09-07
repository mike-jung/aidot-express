/**
 * 환경 점검 스크립트 시험. (v1.10.21)
 *
 * ## 왜 만들었나
 * 단위 시험용 **가짜 드라이버(stub)** 가 `node_modules` 에 남으면 서버가
 * `Cannot read properties of undefined (reading 'createPool')` 로 죽습니다.
 * 원인이 코드에 있는 것처럼 보여 한참 헤매게 되고, 실제로 v1.10.18~20 검증 중
 * **세 번** 걸렸습니다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'scripts/verify-env.mjs'), 'utf8');

/** verify-env 의 판정 규칙 (같은 로직) */
function looksFake(mod, dir) {
  const src = String(mod?.createConnection ?? '') + String(mod?.createPool ?? '');
  if (/__FAKE|globalThis\./.test(src)) return '전역 훅';
  try {
    const files = fs.readdirSync(dir).filter((f) => f !== 'package.json');
    if (files.length <= 1 && files[0] === 'index.js') {
      const body = fs.readFileSync(path.join(dir, 'index.js'), 'utf8');
      if (body.length < 600) return '본문이 짧음';
    }
  } catch { /* 무시 */ }
  return null;
}

test('★ 전역 훅으로 넘기는 stub 을 잡는다', () => {
  const fake = {
    createConnection: (...a) => globalThis.__FAKE_MARIADB__.createConnection(...a),
    createPool: (...a) => globalThis.__FAKE_MARIADB__.createPool(...a),
  };
  assert.ok(looksFake(fake, '/nonexistent'), 'stub 을 놓쳤다');
});

test('★ 진짜 드라이버를 가짜로 오판하지 않는다', () => {
  // 오탐이 나면 아무도 이 점검을 켜 두지 않는다
  const real = {
    createConnection: function createConnection(opts) { return this._connect(opts); },
    createPool: function createPool(opts) { return this._pool(opts); },
  };
  assert.equal(looksFake(real, '/nonexistent'), null);
});

test('파일이 하나뿐이고 본문이 짧으면 stub 으로 본다', () => {
  const dir = path.join(ROOT, 'tests', `_stub_${process.pid}`);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), '{}');
    fs.writeFileSync(path.join(dir, 'index.js'), 'module.exports={createPool(){}};');
    assert.ok(looksFake({ createPool() {} }, dir));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('★ 고치지 않고 알려만 준다 — 자동 수정은 원인을 감춘다', () => {
  // rm -rf 를 실행하는 코드가 있으면 안 된다 (안내 문자열은 괜찮다)
  const body = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1');
  assert.equal(/execSync|spawnSync|rmSync|unlinkSync/.test(body), false,
    '점검 스크립트가 파일을 건드리면 안 된다');
});

test('세 가지를 점검한다', () => {
  assert.match(SRC, /드라이버/); assert.match(SRC, /DB 접속/); assert.match(SRC, /예제 스키마/);
  // 권한이 없을 때 실행할 SQL 을 알려 줘야 한다
  assert.match(SRC, /GRANT ALL ON/);
});

test('npm run check:env 로 등록되어 있다', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['check:env'], 'node scripts/verify-env.mjs');
});
