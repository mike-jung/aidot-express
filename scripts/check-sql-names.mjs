#!/usr/bin/env node
/**
 * scripts/check-sql-names.mjs — SQL 파일에 **같은 이름이 두 번** 정의됐는지 찾는다 (`npm run check:sqlnames`)
 *
 *  왜 필요한가 — 실제로 겪은 일:
 *    청소 쿼리를 세 갈래로 나누면서 옛 정의를 지우지 못해 `sweepIdleSessions` 가 두 번 남았다.
 *    · 뒤에 나온 옛 정의가 앞의 새 정의를 **조용히 덮어썼다**
 *    · 문법도 시험도 통과한다 — SQL 은 문법상 멀쩡하니까
 *    · 서버 로그에만 1분마다 "SQL 이 요구하는 값이 안 넘어와 null 로 채웠습니다: hint_before" 가 쌓였다
 *    같은 편집에서 countOpenSessions·markLeaveHint 도 중복돼 있었다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.sql')) files.push(p);
  }
})(ROOT + '/lib');
walk2(ROOT + '/src');
function walk2(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk2(p);
    else if (e.name.endsWith('.sql')) files.push(p);
  }
}

const problems = [];
for (const file of files) {
  const names = [...fs.readFileSync(file, 'utf8').matchAll(/^--\s*@name:\s*(\w+)/gm)].map((m) => m[1]);
  const seen = new Map();
  for (const n of names) seen.set(n, (seen.get(n) || 0) + 1);
  for (const [n, c] of seen) if (c > 1) problems.push({ file: path.relative(ROOT, file), name: n, count: c });
}

if (problems.length) {
  console.error('The same SQL name is defined more than once — the later one silently overrides the earlier:');
  for (const p of problems) console.error(`  ✗ ${p.file}  →  @name: ${p.name} (${p.count} times)`);
  process.exit(1);
}
console.log(`sql-names: ${files.length} files — no duplicate definitions`);
