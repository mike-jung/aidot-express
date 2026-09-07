#!/usr/bin/env node
/**
 * scripts/check-i18n-hardcoded.mjs — 화면에 **번역을 거치지 않은 한글**이 남아 있는지 찾는다
 *   (`npm run check:kr`)
 *
 *  언어를 English 로 바꿔도 한글이 그대로 보이는 곳을 찾아내기 위한 것이다.
 *  화면에 보이는 글자는 반드시 t('...') 를 거쳐야 한다.
 *
 *  무엇을 보나
 *   · <template> 안의 글자 (태그 사이 텍스트, title/placeholder/label 같은 속성)
 *   · <script setup> 안에서 화면으로 나가는 문자열 (라벨 배열·상수 등) — 주석은 제외
 *  무엇을 빼나
 *   · 주석 (설명은 한글로 쓰는 것이 맞다)
 *   · t('...') 안에 들어 있는 것, console/log 문구, 개발자용 오류 문구
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'admin-client', 'src');
const KR = /[가-힣]/;

/** 주석 제거 (한글 설명은 정상) */
function stripComments(s) {
  return s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    /* 줄 끝 주석도 지운다 — `windowSec: 60,  // 차트 가로축 길이` 처럼
       코드 뒤에 붙은 한글 설명을 화면 문구로 착각하지 않게. 문자열 안의 // 는 건드리지 않는다. */
    /* 줄 끝 주석 제거. 앞부분에 따옴표가 있어도(예: ref('')  // 설명) 지워야 하므로,
       따옴표 짝이 **맞은 뒤**에 나오는 // 만 자른다. */
    .replace(/^(.*?)\/\/[^\n]*$/gm, (m, head) => {
      const q = (c) => (head.split(c).length - 1) % 2 === 0;   // 짝이 맞는가
      return q("'") && q('"') && q('`') ? head : m;
    });
}

function templateOf(src) {
  const m = src.match(/<template>([\s\S]*)<\/template>/);
  return m ? m[1] : '';
}
function scriptOf(src) {
  const m = src.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  return m ? m[1] : '';
}

/** 한 줄에서 t(...) 로 감싸진 부분을 지운다 — 그 안의 한글은 기본값이라 정상 */
function stripT(line) {
  return line.replace(/\bt\(\s*['"][^'"]*['"][^)]*\)/g, 'T()');
}

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.vue')) files.push(p);
  }
})(SRC);

const findings = [];
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const tpl = stripComments(templateOf(raw));
  const scr = stripComments(scriptOf(raw));

  // ① 템플릿의 텍스트 노드와 사용자용 속성
  for (const line of tpl.split('\n')) {
    const l = stripT(line);
    if (!KR.test(l)) continue;
    // 태그 사이 텍스트 또는 사용자에게 보이는 속성만
    /* 태그가 앞줄에서 끝나고 **다음 줄이 순수 텍스트**인 경우도 잡는다.
       (`<span …>` 다음 줄의 `활성 알림 {{ n }}` 을 놓쳤다) */
    const bareText = /^\s*[^<>{}\s][^<>]*[가-힣]/.test(l);
    const shows = bareText || />\s*[^<>{]*[가-힣]/.test(l)
      || /\b(title|placeholder|label|aria-label|alt)\s*=\s*"[^"]*[가-힣]/.test(l)
      || /\{\{[^}]*['"][^'"]*[가-힣][^'"]*['"][^}]*\}\}/.test(l);
    if (shows) findings.push({ file: rel, where: 'template', text: line.trim().slice(0, 90) });
  }

  // ② 스크립트의 화면용 문자열 (라벨 배열·상수 등)
  for (const line of scr.split('\n')) {
    const l = stripT(line);
    if (!KR.test(l)) continue;
    if (/console\.|logger|notifyError\(\s*['"]|throw new Error/.test(l)) continue;   // 개발자용
    /* ⚠ 비교에 쓰이는 문자열은 **데이터 값**이지 화면 문구가 아니다.
       `f.kind === '항목'` 을 번역하면 비교가 깨진다 (서버가 주는 값이 바뀌는 게 아니므로). */
    if (/[=!]==?\s*['"][^'"]*[가-힣]/.test(l)) continue;
    /* ⚠ **한글이 키인 매핑표**도 화면 문구가 아니다.
       예: `'학생': 'student'` — 사용자가 입력한 한글을 영문 경로로 바꾸는 사전이다.
       번역하면 매핑이 깨져 기능이 망가진다. (한 줄에 `'한글': '영문'` 이 있으면 표로 본다) */
    if (/'[^']*[가-힣][^']*'\s*:\s*'[A-Za-z][\w-]*'/.test(l)) continue;
    if (/^\s*\*/.test(line)) continue;
    findings.push({ file: rel, where: 'script', text: line.trim().slice(0, 90) });
  }
}

const byFile = new Map();
for (const f of findings) byFile.set(f.file, (byFile.get(f.file) || 0) + 1);
const sorted = [...byFile.entries()].sort((a, b) => b[1] - a[1]);

if (process.argv.includes('--list')) {
  for (const f of findings) console.log(`${f.file}  [${f.where}]  ${f.text}`);
} else {
  for (const [file, n] of sorted) console.log(`  ${String(n).padStart(4)}  ${file}`);
}
console.log(`\n번역을 거치지 않은 한글: ${findings.length}곳 · ${sorted.length}개 화면`);
process.exit(findings.length ? 1 : 0);
