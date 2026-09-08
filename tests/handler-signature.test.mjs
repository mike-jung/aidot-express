/**
 * 컨트롤러 핸들러 인자 규약 시험. (v1.10.19)
 *
 * `controllerLoader` 는 핸들러를 이렇게 부릅니다.
 *
 *     handler(params, req, res, next)
 *
 * 첫 인자는 **병합된 쿼리/바디/경로 파라미터**이지 `req` 가 아닙니다.
 * `(req, res)` 로 받으면 한 칸씩 밀려 `res.json is not a function` 이 납니다.
 *
 * ⚠ 이 결함은 **실제로 호출해야만** 드러납니다 — 문법 검사도 단위 시험도
 *   잡지 못합니다. v1.10.7(LogsController) · v1.10.19(TraceController)에서
 *   두 번 겪었으므로 여기서 못 박습니다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['lib/admin/controller', 'src/controller'];

function handlersOf(src) {
  // @GetMapping 등 라우트 데코레이터가 붙은 메서드만 본다
  const out = [];
  const re = /@(?:Get|Post|Put|Patch|Delete)Mapping\([^)]*\)[\s\S]{0,400}?async\s+(\w+)\s*\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(src)) !== null) out.push({ name: m[1], args: m[2].trim() });
  return out;
}

test('★ 라우트 핸들러가 첫 인자로 req 를 받지 않는다', () => {
  const bad = [];
  for (const d of DIRS) {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).filter((x) => /\.(js|ts)$/.test(x))) {
      const src = fs.readFileSync(path.join(abs, f), 'utf8');
      for (const h of handlersOf(src)) {
        const first = h.args.split(',')[0].trim().replace(/\s*=.*$/, '');
        if (/^_?req$/.test(first)) bad.push(`${d}/${f}: ${h.name}(${h.args})`);
      }
    }
  }
  assert.deepEqual(bad, [], '첫 인자는 params 다 — req 로 받으면 res.json 이 없다');
});

test('★ res 를 쓰는 핸들러는 세 번째 인자로 받는다', () => {
  const bad = [];
  for (const d of DIRS) {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs).filter((x) => /\.(js|ts)$/.test(x))) {
      const src = fs.readFileSync(path.join(abs, f), 'utf8');
      for (const h of handlersOf(src)) {
        const args = h.args.split(',').map((x) => x.trim().replace(/\s*=.*$/, ''));
        const i = args.findIndex((a) => a === 'res');
        if (i >= 0 && i !== 2) bad.push(`${d}/${f}: ${h.name}(${h.args}) — res 는 3번째여야 한다`);
      }
    }
  }
  assert.deepEqual(bad, [], 'res 위치가 어긋나면 응답이 나가지 않는다');
});

test('TraceController 가 규약을 따른다', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/admin/controller/TraceController.js'), 'utf8');
  for (const h of handlersOf(src)) {
    const first = h.args.split(',')[0].trim().replace(/\s*=.*$/, '');
    assert.ok(!/^_?req$/.test(first), `${h.name} 이 req 를 첫 인자로 받는다`);
  }
  // 인자 이름과 지역 변수가 겹치면 "already been declared" 로 기동이 죽는다
  assert.equal(/async search\(q[^)]*\)[\s\S]{0,80}const q =/.test(src), false, '인자와 지역 변수가 충돌한다');
});

test('LogsController 도 규약을 따른다 (v1.10.7 회귀)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/admin/controller/LogsController.js'), 'utf8');
  assert.match(src, /async facets\(params = \{\}\)/);
  assert.match(src, /async query\(params = \{\}\)/);
});
