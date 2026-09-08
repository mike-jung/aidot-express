#!/usr/bin/env node
/**
 * logs.mjs — 로그 슬라이싱. `npm run logs`
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  설계 원칙 — "필드 질의가 얼마나 쉬운가" 가 이 방식의 전부다
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  구조화 단일 스트림으로 가면, 값은 **얼마나 쉽게 잘라 보느냐**에 달린다.
 *  터미널 로그 도구의 최고봉인 lnav 조차 가장 흔한 지적이 "학습 곡선" 이다.
 *  질의 언어를 만들면 그 순간 배워야 할 것이 하나 늘고, 대개 안 쓰게 된다.
 *
 *  그래서 네 가지를 지킨다.
 *
 *  ① **형식 자체가 질의 인터페이스다.**
 *     로그 줄에 `kind=sql` 이 텍스트로 들어 있다(logfmt 관행).
 *     그래서 이 도구가 없어도 `grep kind=sql` 로 뽑힌다.
 *     도구를 못 깔거나 잊어버려도 **바닥이 무너지지 않는다.**
 *
 *  ② **문법이 없다.** 플래그가 아니라 낱말을 나열한다.
 *        npm run logs sql              (kind=sql)
 *        npm run logs errors today     (오류 + 오늘)
 *        npm run logs slow             (500ms 넘는 것)
 *     낱말은 순서가 상관없고, 복수형·대소문자를 가리지 않는다.
 *
 *  ③ **한 것을 보여 준다.** 매번 동등한 grep 명령을 함께 찍는다.
 *     쓰다 보면 도구 없이도 할 수 있게 된다 — 도구가 사용자를 가두지 않는다.
 *
 *  ④ **시간이 1급이다.** 조사는 거의 항상 "그 쯤에 뭐가 났나" 로 시작한다.
 *        npm run logs --around 14:30 --window 5s
 *     이건 **유형을 넘나들어야 해서 파일 분리로는 만들 수 없는** 기능이다.
 *     원본을 쪼개지 않은 이유가 바로 이것이다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ── 낱말 사전 — 사용자가 쓸 법한 말을 전부 받는다 ────────────────────── */
const KIND_WORDS = {
  sql: 'sql', queries: 'sql', query: 'sql', db: 'sql',
  http: 'http', request: 'http', requests: 'http', req: 'http', access: 'http',
  auth: 'auth', login: 'auth', 인증: 'auth', 로그인: 'auth',
  migration: 'migration', migrations: 'migration', 마이그레이션: 'migration',
  boot: 'boot', startup: 'boot', 기동: 'boot',
  admin: 'admin', app: 'app',
};
const LEVEL_WORDS = {
  error: 'ERROR', errors: 'ERROR', 오류: 'ERROR', 에러: 'ERROR',
  warn: 'WARN', warns: 'WARN', warning: 'WARN', warnings: 'WARN', 경고: 'WARN',
  info: 'INFO', debug: 'DEBUG',
};
const TIME_WORDS = { today: '1d', 오늘: '1d', yesterday: '2d', hour: '1h', 최근: '1h' };

import { parseLogLine as parseLine } from '../src/util/logLine.js';   // ★ v1.11.3 — 콘솔과 같은 함수

/* ── 인자 해석 ───────────────────────────────────────────────────────── */
function parseArgs(argv) {
  const q = { kinds: [], levels: [], since: null, around: null, window: 3000,
    request: null, grep: null, slower: null, limit: 200, fields: false, follow: false,
    files: 20 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fields') { q.fields = true; continue; }
    if (a === '-f' || a === '--follow') { q.follow = true; continue; }
    if (a === '--around') { q.around = argv[++i]; continue; }
    if (a === '--window') { q.window = toMs(argv[++i]); continue; }
    if (a === '--since') { q.since = argv[++i]; continue; }
    if (a === '--request' || a === '-r') { q.request = argv[++i]; continue; }
    if (a === '--grep' || a === '-g') { q.grep = argv[++i]; continue; }
    if (a === '--slower-than') { q.slower = Number(argv[++i]); continue; }
    if (a === '-n' || a === '--limit') { q.limit = Number(argv[++i]); continue; }
    if (a === '--files') { q.files = Number(argv[++i]); continue; }
    if (a.startsWith('-')) continue;

    // 문법 없는 낱말 — 순서 무관, 복수형·대소문자 무관
    const w = a.toLowerCase();
    if (KIND_WORDS[w]) { q.kinds.push(KIND_WORDS[w]); continue; }
    if (LEVEL_WORDS[w]) { q.levels.push(LEVEL_WORDS[w]); continue; }
    if (TIME_WORDS[w]) { q.since = TIME_WORDS[w]; continue; }
    if (w === 'slow' || w === '느린') { q.slower = q.slower ?? 500; continue; }
    if (/^[0-9a-f]{8}$/.test(w)) { q.request = w; continue; }   // 요청 ID 로 보인다
    q.grep = q.grep ? `${q.grep} ${a}` : a;                      // 나머지는 본문 검색
  }
  return q;
}

const toMs = (v) => {
  const m = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(String(v || '').trim());
  if (!m) return 3000;
  return Number(m[1]) * ({ ms: 1, s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2] || 's']);
};

/** `14:30` · `2026-08-25 14:30:11` · `14:30:11.482` 를 모두 받는다 */
function toTime(v, base = new Date()) {
  const s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return Date.parse(s.replace(' ', 'T'));
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(s);
  if (!m) return NaN;
  const d = new Date(base);
  d.setHours(Number(m[1]), Number(m[2]), Number(m[3] || 0), Number(m[4] || 0));
  return d.getTime();
}

/* ── 파일 수집 ───────────────────────────────────────────────────────── */
/**
 * 로그 파일 목록 — **수정 시각** 오름차순.
 *
 *  ⚠ 경로 정렬로는 안 된다. 로그가 크기 상한에 걸리면 `2026-08-25.1.log`,
 *    `.2.log` … 로 회전하는데, 경로 정렬에서는 `.1` 이 본체(`2026-08-25.log`)보다
 *    **앞**에 온다('1' < 'l'). 그 상태로 "최근 N개" 를 자르면 **가장 최신 파일이 잘린다.**
 *    파일이 언제 쓰였는지는 mtime 이 안다.
 */
function logFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.log$/.test(e.name)) {
        let mtime = 0;
        try { mtime = fs.statSync(p).mtimeMs; } catch { /* 사라진 파일 */ }
        out.push({ p, mtime });
      }
    }
  })(dir);
  return out.sort((a, b) => a.mtime - b.mtime).map((x) => x.p);
}

/* ── 실행 ────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { usage(); process.exit(0); }

const q = parseArgs(argv);
const dir = process.env.LOG_DIR || path.join(ROOT, 'log');
const files = logFiles(dir).filter((f) => !/[\\/]sql[\\/]/.test(f));  // 파생 파일은 중복이라 뺀다

if (!files.length) {
  console.log(`No log files in ${dir}`);
  console.log('They appear once the server has run — npm start');
  process.exit(0);
}

const lines = [];
for (const f of files.slice(-q.files)) {               // 최근 파일부터 (기본 20개, --files 로 조정)
  let last = null;                                     // ⚠ 파일 안에서만 이어 붙인다
  for (const raw of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const p = parseLine(raw);
    if (p) { lines.push(p); last = p; }
    else if (last) last.raw += '\n' + raw;             // SQL 전문 같은 이어진 줄
    // 파일 첫 줄이 이어진 줄이면 앞 파일 마지막에 붙이지 않는다 — 다른 시각의 다른 사건이다
  }
}
lines.sort((a, b) => a.at - b.at);

/* --fields : 무엇으로 거를 수 있는지 **실제 로그에서** 보여 준다.
   필드 이름을 외우게 하는 대신 지금 있는 것을 보여 준다 — 발견이 암기를 이긴다. */
if (q.fields) {
  const count = (get) => {
    const m = new Map();
    for (const l of lines) { const v = get(l); if (v) m.set(v, (m.get(v) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  console.log(`\n  ${lines.length.toLocaleString()} lines · ${files.length} files · ${dir}\n`);
  console.log('  kind');
  for (const [k, n] of count((l) => l.kind)) console.log(`    ${k.padEnd(10)} ${String(n).padStart(7)}    npm run logs ${k}`);
  console.log('\n  level');
  for (const [k, n] of count((l) => l.level)) console.log(`    ${k.padEnd(10)} ${String(n).padStart(7)}    npm run logs ${k.toLowerCase()}`);
  const reqs = count((l) => l.requestId);
  console.log(`\n  request IDs  ${reqs.length} — e.g. npm run logs -r ${reqs[0]?.[0] || 'a3f9c210'}`);
  console.log('\n  time     npm run logs --around 14:30 --window 5s   ← everything around that moment\n');
  process.exit(0);
}

let sel = lines;
const why = [];
if (q.kinds.length) { sel = sel.filter((l) => q.kinds.includes(l.kind)); why.push(`kind=${q.kinds.join('|')}`); }
if (q.levels.length) { sel = sel.filter((l) => q.levels.includes(l.level)); why.push(`level=${q.levels.join('|')}`); }
if (q.request) { sel = sel.filter((l) => l.requestId === q.request); why.push(`요청 ${q.request}`); }
if (q.slower != null) { sel = sel.filter((l) => l.ms != null && l.ms >= q.slower); why.push(`${q.slower}ms 이상`); }
if (q.grep) { const re = new RegExp(q.grep, 'i'); sel = sel.filter((l) => re.test(l.raw)); why.push(`"${q.grep}"`); }
if (q.since) { const from = Date.now() - toMs(q.since); sel = sel.filter((l) => l.at >= from); why.push(`최근 ${q.since}`); }

if (q.around) {
  const t = toTime(q.around, lines.length ? new Date(lines[lines.length - 1].at) : new Date());
  if (Number.isNaN(t)) { console.error(`Cannot read that time: ${q.around}`); process.exit(1); }
  sel = sel.filter((l) => Math.abs(l.at - t) <= q.window);
  why.push(`${new Date(t).toLocaleTimeString('ko-KR')} 앞뒤 ${q.window}ms`);
}

/* ── 출력 ────────────────────────────────────────────────────────────── */
const shown = sel.slice(-q.limit);
const C = { sql: '\x1b[32m', http: '\x1b[36m', auth: '\x1b[35m', migration: '\x1b[33m',
  boot: '\x1b[34m', admin: '\x1b[90m', app: '' };
const R = '\x1b[0m';
const tty = process.stdout.isTTY;

console.log(`\n  ${why.length ? why.join(' · ') : 'all'} — ${sel.length.toLocaleString()} lines`
  + (sel.length > shown.length ? ` (마지막 ${shown.length}줄만 표시, -n 으로 조정)` : ''));

// ★ 동등한 grep 을 함께 보여 준다 — 도구가 사용자를 가두지 않는다
const eq = grepEquivalent(q, dir);
if (eq) console.log(`  ≡ ${eq}\n`);
else console.log('');

for (const l of shown) {
  if (!tty) { console.log(l.raw); continue; }
  console.log(`${C[l.kind] || ''}${l.raw}${R}`);
}

if (!shown.length) {
  console.log('  No lines match.');
  console.log('  To see what you can filter on:  npm run logs -- --fields\n');
}

/**
 * 같은 결과를 내는 grep 명령.
 *  전부를 표현할 수는 없다(시간 창은 grep 으로 못 한다) —
 *  **표현할 수 없으면 보여 주지 않는다.** 틀린 명령을 주는 것보다 안 주는 게 낫다.
 */
function grepEquivalent(qq, logDir) {
  if (qq.around || qq.slower != null || qq.since) return null;
  const parts = [];
  if (qq.kinds.length === 1) parts.push(`kind=${qq.kinds[0]}`);
  if (qq.levels.length === 1) parts.push(`\\[${qq.levels[0]}`);
  if (qq.request) parts.push(`\\[${qq.request}\\]`);
  if (qq.grep) parts.push(qq.grep);
  if (!parts.length) return null;
  const rel = path.relative(process.cwd(), logDir) || 'log';
  return parts.map((p, i) => (i === 0 ? `grep -r '${p}' ${rel}/` : `grep '${p}'`)).join(' | ');
}

function usage() {
  console.log(`
  Log viewer — no syntax to memorise. Just list words.

    npm run logs sql                 SQL only
    npm run logs errors today        today's errors
    npm run logs slow                anything over 500ms
    npm run logs sql slow            slow queries
    npm run logs a3f9c210            everything from that request

  ★ By time (impossible if the file was split)

    npm run logs -- --around 14:30 --window 5s     5s either side of that moment, any kind

  See what you can filter on

    npm run logs -- --fields         the values actually present in the log

  Words are order-free; plurals, case and Korean are all accepted.
    sql=queries=db · errors=오류 · today=오늘 · slow=느린

  Options
    -r <request id>      that request only     -g <text>       search the body
    --slower-than <ms>   slow ones only        -n <count>      lines to show (default 200)
    --since 1h|1d        recent period         --fields        filterable values
`);
}
