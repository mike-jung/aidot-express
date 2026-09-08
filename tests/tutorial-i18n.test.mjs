/**
 * 튜토리얼 영문화 도구.
 *
 *  75쪽 · 문자열 1,218개다. 한 번에 못 하므로 나눠서 하고, 도구가 남은 것을 기억한다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

test('한글 원본이 _ko 로 보존돼 있다', () => {
  /* 원본을 덮어쓰기 전에 사본을 먼저 만든다 — 되돌릴 수 없는 작업이다 */
  assert.ok(fs.existsSync('docs/aidot-express-tutorial-v1.32.0_ko.pptx'));
  assert.ok(fs.existsSync('docs/aidot-express-tutorial-v1.32.0_ko.pdf'));
});

test('문단 단위로 뽑고 넣는다', () => {
  /* 처음에는 조각(<a:t>) 단위였는데, PowerPoint 는 서식이 바뀔 때마다 조각을 나눈다.
     실제로 한 낱말이 `따라하` + `기` 로 갈려 있었다 — 3자 이하 조각만 374개.
     조각마다 번역하면 문장이 되지 않는다. */
  const ex = read('scripts/tutorial/extract-text.mjs');
  assert.match(ex, /xml\.split\('<a:p>'\)/, '문단으로 나눈다');
  assert.match(ex, /3자 이하 조각만 374개였다/, '왜 그렇게 했는지 남긴다');

  const ap = read('scripts/tutorial/apply-text.mjs');
  assert.ok(ap.includes('<a:p>([\\s\\S]*?)<\\/a:p>'), '문단 단위로 바꾼다');
  /* 첫 조각에 몰아 넣고 나머지를 비운다 — 첫 조각의 서식이 문단에 적용된다 */
  assert.ok(ap.includes("i++ === 0 ?"), '첫 조각에 몰아 넣는다');
  assert.ok(ap.includes("'<a:t></a:t>'"), '나머지는 비운다');
});

test('XML 을 파서로 왕복시키지 않는다', () => {
  /* OOXML 을 ElementTree 류로 왕복하면 이름공간 접두사가 바뀌어 파일이 열리지 않는다 */
  const ap = read('scripts/tutorial/apply-text.mjs');
  assert.match(ap, /XML 을 파서로 돌리지 않는다/);
  assert.match(ap, /const esc = /, '넣는 쪽도 이스케이프해야 파일이 깨지지 않는다');
});

test('넘침 검사는 어림값이고, 그것을 밝힌다', () => {
  /* 영문은 한글보다 1.5~2배 길어진다. 75쪽을 눈으로 볼 수는 없으므로
     의심 목록을 좁히는 것이 목적이다. 문턱 20%는 실측으로 잡았다 —
     35쪽 +65% 는 실제로 넘쳤고, 7~12% 는 멀쩡했다. */
  const ck = read('scripts/tutorial/check-overflow.mjs');
  assert.match(ck, /hIn \* 1\.20/, '문턱 20%');
  assert.match(ck, /실측: 35쪽 \+65% 는 실제로 넘쳤고/);
  assert.match(ck, /an estimate/, '정확하지 않다는 것을 말한다');
  /* 자동 축소가 켜진 상자는 PowerPoint 가 알아서 줄인다 */
  assert.match(ck, /normAutofit/);
});

test('세 명령이 등록돼 있다', () => {
  const s = JSON.parse(read('package.json')).scripts;
  for (const k of ['tut:extract', 'tut:apply', 'tut:check']) {
    assert.ok(s[k], `${k} 가 있어야 한다`);
  }
});
