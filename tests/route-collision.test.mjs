/**
 * 콘솔 라우트 충돌 시험. (v1.10.27)
 *
 * ## 문제
 * v1.9.5 에서 [로그 탐색](LogExplorer)을 추가하며 기존 [로그](LogsPage)와
 * `name: 'logs'` · `path: 'logs'` 가 겹쳤습니다. vue-router 는 뒤에 등록된 것이
 * 이기므로 **LogsPage(파일 브라우저)가 통째로 가려져** 있었습니다.
 *
 * 두 메뉴를 눌러도 같은 화면이 떴고, 튜토리얼이 설명하는 "폴더 → 파일 → 내용"
 * 방식은 아예 열 수 없는 상태였습니다.
 *
 * ⚠ 이 결함은 **실제로 눌러 봐야** 드러납니다 — 문법 검사도 단위 시험도
 *   잡지 못합니다. 튜토리얼을 실행 검증하다 발견했습니다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'admin-client', 'src');
const router = fs.readFileSync(path.join(SRC, 'router/index.js'), 'utf8');
const layout = fs.readFileSync(path.join(SRC, 'layouts/MainLayout.vue'), 'utf8');

/** 라우트 정의에서 { path, name } 쌍을 뽑는다 */
function routes(src) {
  return [...src.matchAll(/\{\s*path:\s*'([^']*)'\s*,\s*name:\s*'([^']+)'/g)]
    .map((m) => ({ path: m[1], name: m[2] }));
}

test('★ 라우트 이름이 겹치지 않는다', () => {
  const seen = new Map();
  const dup = [];
  for (const r of routes(router)) {
    if (seen.has(r.name)) dup.push(`${r.name} (${seen.get(r.name)} · ${r.path})`);
    seen.set(r.name, r.path);
  }
  assert.deepEqual(dup, [], '뒤에 등록된 것이 이겨 앞의 화면이 가려진다');
});

test('★ 라우트 경로가 겹치지 않는다', () => {
  const seen = new Map();
  const dup = [];
  for (const r of routes(router)) {
    if (seen.has(r.path)) dup.push(`${r.path} (${seen.get(r.path)} · ${r.name})`);
    seen.set(r.path, r.name);
  }
  assert.deepEqual(dup, [], '같은 경로면 한쪽은 절대 열리지 않는다');
});

test('두 로그 화면이 서로 다른 곳을 연다', () => {
  const rs = routes(router);
  const files = rs.find((r) => r.name === 'logFiles');
  const explorer = rs.find((r) => r.name === 'logs');
  assert.ok(files, '[로그] (파일 브라우저) 라우트가 있어야 한다');
  assert.ok(explorer, '[로그 탐색] 라우트가 있어야 한다');
  assert.notEqual(files.path, explorer.path);
  assert.match(router, /log-files[\s\S]{0,120}LogsPage\.vue/);
  assert.match(router, /'logs'[\s\S]{0,120}LogExplorer\.vue/);
});

test('★ 메뉴가 가리키는 이름이 라우터에 실제로 있다', () => {
  // 메뉴에만 있고 라우터에 없으면 눌러도 아무 일이 없다
  const known = new Set(routes(router).map((r) => r.name));
  const script = /<script setup>([\s\S]*?)<\/script>/.exec(layout)[1];
  const bad = [];
  for (const m of script.matchAll(/\{\s*name:\s*'([^']+)'\s*,\s*path:\s*'([^']*)'/g)) {
    if (!known.has(m[1])) bad.push(`${m[1]} → ${m[2]}`);
  }
  assert.deepEqual(bad, [], '메뉴가 없는 라우트를 가리킨다');
});

test('메뉴 경로와 라우터 경로가 일치한다', () => {
  const byName = Object.fromEntries(routes(router).map((r) => [r.name, r.path]));
  const script = /<script setup>([\s\S]*?)<\/script>/.exec(layout)[1];
  const bad = [];
  for (const m of script.matchAll(/\{\s*name:\s*'([^']+)'\s*,\s*path:\s*'([^']*)'/g)) {
    const want = byName[m[1]];
    if (want === undefined) continue;
    if (m[2].replace(/^\//, '') !== want.replace(/^\//, '')) {
      bad.push(`${m[1]}: 메뉴 ${m[2]} vs 라우터 ${want}`);
    }
  }
  assert.deepEqual(bad, [], '경로가 어긋나면 메뉴 강조가 틀어진다');
});
