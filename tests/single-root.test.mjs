/**
 * 화면 컴포넌트의 루트가 새어 나오지 않는지. (v1.10.31)
 *
 * ## 문제
 * `SettingsDialog` 의 template 루트가 **둘**이었고, 첫째(언어 선택 블록)에는
 * `v-if` 가 없었습니다.
 *
 *     <template>
 *       <div class="mb-3"> …언어 선택… </div>   ← v-if 없음 → 항상 그려짐
 *       <div v-if="open"> …모달… </div>
 *     </template>
 *
 * 그래서 **설정 창을 열지 않아도** 콘솔 화면 오른쪽에 언어 버튼이 그대로
 * 나타났습니다. Vue 3 는 루트가 여러 개여도 오류를 내지 않으므로
 * **조용히 새어 나왔습니다** — 빌드도 통과하고 검사기도 잡지 못했습니다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'admin-client', 'src');

/** template 의 최상위 요소들을 센다 */
function rootElements(vue) {
  const m = /<template>([\s\S]*)<\/template>/.exec(vue);
  if (!m) return [];
  const body = m[1].replace(/<!--[\s\S]*?-->/g, '');
  const roots = [];
  let depth = 0, i = 0;
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let t;
  while ((t = tagRe.exec(body)) !== null) {
    const [, closing, name, attrs, selfClose] = t;
    if (closing) { depth--; continue; }
    if (depth === 0) roots.push({ name, attrs });
    if (!selfClose && !/^(br|hr|img|input|meta|link)$/i.test(name)) depth++;
  }
  return roots;
}

test('★ 대화상자 컴포넌트의 루트가 하나다', () => {
  // 루트가 여럿이면 v-if 가 없는 쪽이 항상 그려져 화면에 새어 나온다
  const dialogs = fs.readdirSync(path.join(SRC, 'components'))
    .filter((f) => /Dialog|Modal/.test(f) && f.endsWith('.vue'));
  const bad = [];
  for (const f of dialogs) {
    const roots = rootElements(fs.readFileSync(path.join(SRC, 'components', f), 'utf8'));
    if (roots.length > 1) {
      // 여러 루트여도 **전부** 조건부라면 새어 나오지 않는다
      const unconditional = roots.filter((r) => !/\bv-(if|else|else-if|show)\b/.test(r.attrs));
      if (unconditional.length) bad.push(`${f}: 조건 없는 루트 ${unconditional.length}개`);
    }
  }
  assert.deepEqual(bad, [], '설정 창을 열지 않아도 화면에 그려진다');
});

test('SettingsDialog 는 open 일 때만 그려진다', () => {
  /* ★ v1.12.0 — 대화상자를 <Teleport to="body"> 로 감쌌다(스크롤·z-index 문제를 없애는 요즘 방식).
     루트는 Teleport 하나이고, 그 **안쪽** 층에 v-if="open" 이 있어야 한다 — 안 그러면 닫혀 있어도 화면에 그려진다. */
  const src = fs.readFileSync(path.join(SRC, 'components/SettingsDialog.vue'), 'utf8');
  const roots = rootElements(src);
  assert.equal(roots.length, 1, `루트가 ${roots.length}개다`);
  assert.match(roots[0].name, /^Teleport$/i, '루트는 Teleport');
  const teleAt = src.indexOf('<Teleport');
  const layerAt = src.indexOf('class="settings-layer"');
  assert.ok(layerAt > teleAt, 'Teleport 안에 대화상자 층이 있다');
  assert.match(src.slice(teleAt, layerAt + 200), /v-if="open"/, '열렸을 때만 그린다');
});

test('★ 언어 선택이 모달 안에 있다', () => {
  const src = fs.readFileSync(path.join(SRC, 'components/SettingsDialog.vue'), 'utf8');
  const dialogAt = src.indexOf('class="settings-dialog"');
  const paneEnd = src.indexOf('</section>');
  const langAt = src.indexOf('language.label');
  assert.ok(dialogAt > 0 && langAt > dialogAt && langAt < paneEnd, '언어 블록이 대화상자 안(설정 내용 영역)에 있어야 한다');
});
