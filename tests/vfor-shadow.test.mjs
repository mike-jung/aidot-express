/**
 * v-for 변수가 t() 를 가리는 결함. (v1.10.39)
 *
 * ## 증상
 * 부하 모니터링 화면이 **흰 화면**이었다.
 *
 *     TypeError: t is not a function   at MonitoringPage
 *
 * ## 원인
 * ```html
 * <tr v-for="t in thresholds">           ← 반복 변수가 t
 *   <input :placeholder="t('mon3.x')" /> ← 번역 함수 t() 를 부르려는데
 * ```
 * **반복 변수 `t` 가 번역 함수 `t` 를 가려서**, 문자열을 함수처럼 부른다.
 *
 * ⚠ 빌드도 통과하고 SFC 컴파일도 통과한다. **브라우저를 열어야만** 드러난다.
 *   다국어 작업(v1.10.x)에서 화면마다 `t()` 를 심는 동안 생겼다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'admin-client', 'src');

function vueFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) vueFiles(p, out);
    else if (e.name.endsWith('.vue')) out.push(p);
  }
  return out;
}

/** v-for="t ..." 블록 안에서 t() 를 부르는 곳 */
function shadowed(vue) {
  const tpl = /<template>([\s\S]*)<\/template>/.exec(vue);
  if (!tpl) return [];
  const body = tpl[1];
  const out = [];
  const re = /<(\w[\w-]*)[^>]*v-for="\(?\s*t\s*[,)\s][^>]*>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const tag = m[1];
    let depth = 1;
    const close = new RegExp(`</?${tag}\\b`, 'g');
    close.lastIndex = m.index + m[0].length;
    let c, end = body.length;
    while ((c = close.exec(body)) !== null) {
      depth += c[0].startsWith('</') ? -1 : 1;
      if (depth === 0) { end = c.index; break; }
    }
    const calls = body.slice(m.index, end).match(/(?<![\w.])t\('[\w.]+'/g) || [];
    if (calls.length) out.push(calls[0]);
  }
  return out;
}

test('★ 어느 화면에서도 v-for 변수가 t() 를 가리지 않는다', () => {
  const bad = [];
  for (const f of vueFiles(SRC)) {
    const hits = shadowed(fs.readFileSync(f, 'utf8'));
    if (hits.length) bad.push(`${path.relative(SRC, f)} — ${hits[0]}`);
  }
  assert.deepEqual(bad, [], '그 화면은 통째로 빈다');
});

test('검출 로직이 실제로 잡는다', () => {
  // 일부러 깨진 예제를 넣어 본다 — 못 잡으면 시험이 무의미하다
  const broken = `<template><tr v-for="t in xs"><td :title="t('a.b')">{{ t.name }}</td></tr></template>`;
  assert.equal(shadowed(broken).length, 1);
  const fine = `<template><tr v-for="th in xs"><td :title="t('a.b')">{{ th.name }}</td></tr></template>`;
  assert.equal(shadowed(fine).length, 0);
});

test('★ 검사기(check:i18n)에도 들어 있다', () => {
  const chk = fs.readFileSync(path.join(ROOT, 'scripts/check-i18n.mjs'), 'utf8');
  assert.match(chk, /function forShadowsT\(vue\)/);
  // 출력되는 목록에 넣어야 실제로 보인다
  assert.match(chk, /bindingBugs\.push\(`\$\{path\.relative\(SRC, f\)\}: v-for/);
});

test('부하 모니터링이 안전한 이름을 쓴다', () => {
  const mp = fs.readFileSync(path.join(SRC, 'views/MonitoringPage.vue'), 'utf8');
  assert.match(mp, /v-for="\(th, idx\) in thresholds"/);
  assert.equal(/v-for="\(t, idx\) in thresholds"/.test(mp), false);
});
