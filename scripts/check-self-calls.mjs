#!/usr/bin/env node
/**
 * scripts/check-self-calls.mjs — 클래스 안에서 **없는 메서드를 부르는 곳**을 찾는다 (`npm run check:self`)
 *
 *  왜 필요한가 — 실제로 겪은 일:
 *    빠른 flush 를 넣으면서 `this._flush()` 라고 썼는데 진짜 이름은 `_flushQueue` 였다.
 *    · 문법 검사도 시험도 통과한다 (호출이 실행될 때만 터진다)
 *    · 그 자리는 타이머 안이라 **화면에는 아무 표시가 없고** 서버 로그에만
 *      `TypeError: this._flush is not a function` 이 조용히 쌓였다
 *    · 그래서 "빨라졌겠지" 하고 넘어갔는데 실은 한 번도 동작하지 않았다
 *
 *  자바스크립트는 이런 것을 실행 전에 알려 주지 않으므로, 이름 규칙이 뚜렷한 범위에서만
 *  가볍게 확인한다: **밑줄로 시작하는 내부 메서드**(this._xxx()) 가 그 파일 안에 정의돼 있는가.
 *  (밖에서 주입되거나 상속으로 들어오는 것은 밑줄 규칙을 쓰지 않는다는 전제)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['src', 'lib'];

/** 주석과 문자열을 지운다 — 설명 속 예시를 호출로 착각하지 않게 */
function strip(code) {
  let out = ''; let i = 0;
  while (i < code.length) {
    const two = code.slice(i, i + 2);
    if (two === '//') { const e = code.indexOf('\n', i); const s = e === -1 ? code.length : e; out += ' '.repeat(s - i); i = s; continue; }
    if (two === '/*') { const e = code.indexOf('*/', i + 2); const s = e === -1 ? code.length : e + 2; out += code.slice(i, s).replace(/[^\n]/g, ' '); i = s; continue; }
    const c = code[i];
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < code.length) { if (code[j] === '\\') { j += 2; continue; } if (code[j] === c) { j += 1; break; } j += 1; }
      out += code.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue;
    }
    out += c; i += 1;
  }
  return out;
}

const files = [];
for (const d of DIRS) {
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) files.push(p);
    }
  })(path.join(ROOT, d));
}

const problems = [];
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  if (!/\bclass\s+\w/.test(raw)) continue;              // 클래스가 없는 파일은 건너뛴다
  const code = strip(raw);
  /* ⚠ 정의부는 **원문에서** 모은다.
     주석·문자열을 지우는 청소기는 정규식 리터럴 안의 따옴표(예: /['"]/)를 문자열 시작으로 오해해
     그 뒤 코드를 통째로 지워 버린다. 그러면 멀쩡한 메서드가 "없는 것" 으로 잡힌다(오탐 14건을 겪었다).
     호출부만 청소된 코드에서 찾으면 주석 속 예시도 피하고 정의도 놓치지 않는다. */
  const defined = new Set([...raw.matchAll(/^\s{2,}(?:static\s+)?(?:async\s+)?([A-Za-z_][\w]*)\s*\(/gm)].map((m) => m[1]));
  // 필드로 담은 함수도 정의로 본다: _x = () => …  ·  _x = function
  for (const m of raw.matchAll(/^\s{2,}([A-Za-z_][\w]*)\s*=\s*(?:async\s*)?(?:\(|function)/gm)) defined.add(m[1]);
  /* 생성자에서 주입받는 것도 정의로 본다: this._httpPost = opts.httpPost || null
     (바깥에서 함수를 받아 두는 자리라 "없는 메서드" 가 아니다) */
  for (const m of raw.matchAll(/this\.(_[A-Za-z][\w]*)\s*=/g)) defined.add(m[1]);
  for (const m of code.matchAll(/this\.(_[A-Za-z][\w]*)\s*\(/g)) {
    if (!defined.has(m[1])) problems.push({ file: path.relative(ROOT, file), name: m[1] });
  }
}

const uniq = [...new Map(problems.map((p) => [`${p.file}:${p.name}`, p])).values()];
if (uniq.length) {
  console.error('그 파일에 없는 내부 메서드를 부르고 있습니다 — 실행될 때 TypeError 로 터집니다:');
  for (const p of uniq) console.error(`  ✗ ${p.file}  →  this.${p.name}()`);
  console.error(`self-calls: ok=${files.length - uniq.length} fail=${uniq.length}`);
  process.exit(1);
}
console.log(`self-calls: 클래스 파일 검사 — 문제 없음`);
