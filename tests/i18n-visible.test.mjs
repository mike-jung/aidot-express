/**
 * 화면에 보이는 한글이 남아 있지 않은지.
 *
 *  ## 왜 이 시험이 필요했나
 *  "한글이 없다" 고 두 번 잘못 말했다. `.vue` 만 세고 `.js` 는 빼먹었고,
 *  주석과 화면 문구를 가르지 못해 493줄이 뭉뚱그려 나왔다. 숫자가 크니 손대기 어려워
 *  보였고, 정작 화면에 보이는 몇 줄이 그 안에 묻혔다.
 *
 *  ## 무엇을 세는가
 *  화면에 **실제로 보일 수 있는** 한글만 센다:
 *    · 템플릿의 글자         `<div>아직 화면이 없습니다.</div>`
 *    · 화면으로 가는 문자열   `return '사이드바 메뉴';`
 *
 *  다음은 세지 않는다 — 화면에 보이지 않기 때문이다:
 *    · 블록 주석 · 줄 주석 · 줄 끝 주석
 *    · 한글→영문 낱말 변환표 (`'학생': 'student'`) — 이름을 짓는 데 쓰는 표다
 *    · 사전 파일(locales) — 거기 한글이 있어야 정상이다
 *    · generator — 생성물에 들어가는 것이라 별도 규칙을 따른다(genStrings)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'admin-client', 'src');
const KO = /[\uAC00-\uD7A3]/;

/** 주석을 걷어낸다 — 줄 끝 주석까지 */
function stripComments(text) {
  let s = text.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  return s.split('\n').map((line) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*')) return '';
    /* 줄 끝 주석: 따옴표 밖의 `//` 부터 잘라 낸다 */
    let inS = null, prev = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inS) { if (c === inS && prev !== '\\') inS = null; }
      else if (c === '"' || c === "'" || c === '`') inS = c;
      else if (c === '/' && line[i + 1] === '/') return line.slice(0, i);
      prev = c;
    }
    return line;
  }).join('\n');
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'locales' || e.name === 'generator' || e.name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(vue|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

test('★ 화면에 보이는 한글이 남아 있지 않다', () => {
  const found = [];
  for (const file of walk(SRC)) {
    const body = stripComments(fs.readFileSync(file, 'utf8'));
    body.split('\n').forEach((line, i) => {
      if (!KO.test(line)) return;
      const t = line.trim();
      /* 한글→영문 낱말 변환표 — 이름을 짓는 데 쓴다. 화면에 보이지 않는다.
         ⚠ 한 줄에 여러 쌍이 오는 경우가 흔하다:
             '학생': 'student',   '사용자': 'user',     '회원': 'member',
           예전 규칙은 한 쌍짜리만 걸러 32줄을 잘못 셌다. */
      if (/^('[가-힣][^']*': *'[\w-]+',?\s*)+$/.test(t)) return;
      found.push(`${path.relative(SRC, file)}:${i + 1}  ${t.slice(0, 70)}`);
    });
  }
  /* ⚠ 새로 늘리지 않는 것이 목적이다. 남은 것은 아래 숫자로 묶어 둔다 —
     줄이면 이 숫자도 함께 줄여야 시험이 통과한다. */
  /* 지금 값은 370. 남은 것은 API 테스트·컨트롤러 편집 같은 화면들이다.
     이 숫자를 **늘리지 않는 것**이 목적이다 — 줄이면 함께 낮춰야 통과한다. */
  const LIMIT = 249;
  assert.ok(found.length <= LIMIT,
    `화면에 보이는 한글 ${found.length}줄 (상한 ${LIMIT})\n` + found.slice(0, 12).join('\n'));
});

test('★ 사전 두 벌의 키가 어긋나지 않는다', async () => {
  /* 한쪽에만 있는 키는 그 언어에서 키 이름이 그대로 화면에 뜬다 */
  const ko = (await import(path.join(SRC, 'locales/ko.js'))).default;
  const en = (await import(path.join(SRC, 'locales/en.js'))).default;
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
    (v && typeof v === 'object') ? flat(v, `${p}${k}.`) : [`${p}${k}`]);
  const a = new Set(flat(ko)), b = new Set(flat(en));
  assert.deepEqual([...a].filter((k) => !b.has(k)), [], 'en 에 빠진 키');
  assert.deepEqual([...b].filter((k) => !a.has(k)), [], 'ko 에 빠진 키');
});

test('★ 화면 문구가 사전을 거치지 않고 박혀 있지 않다', () => {
  /* 실제로 겪은 것: 사전에 키가 있는데도 화면이 한글을 직접 박아 두어
     English 로 두어도 한글이 보였다. `return '사이드바 메뉴';` 가 그랬다. */
  const suspects = [];
  for (const file of walk(SRC)) {
    const body = stripComments(fs.readFileSync(file, 'utf8'));
    for (const m of body.matchAll(/return '([^']*[\uAC00-\uD7A3][^']*)';/g)) {
      suspects.push(`${path.relative(SRC, file)}  return '${m[1].slice(0, 40)}'`);
    }
  }
  const LIMIT = 40;
  assert.ok(suspects.length <= LIMIT,
    `사전을 거치지 않는 return ${suspects.length}건 (상한 ${LIMIT})\n` + suspects.slice(0, 10).join('\n'));
});
