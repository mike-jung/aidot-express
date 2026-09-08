/**
 * logScan.js — 로그 파일을 훑는 **순수 함수** 모음 (콘솔 LogsService 와 워커 스레드가 함께 쓴다).
 *
 *  ★ v1.11.4 — 워커 스레드에서 돌리기 위해 LogsService 에서 떼어 냈다.
 *    여기에는 데코레이터·config·logger 가 없다. 필요한 값(상한 등)은 인자로 받는다.
 *    ⚠ 이 파일을 고치면 워커(logScanWorker.js)도 같은 코드를 쓴다 — 별도 조치 없음.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseLogLine } from './logLine.js';
export { parseLogLine, LINE_RE } from './logLine.js';

/* ★ v1.11.3 — 사용자 정규식 검사.
   `(a+)+b` 처럼 **반복 안에 반복**이 있는 패턴은 긴 줄 하나에서 기하급수로 되돌아가며(catastrophic backtracking)
   이벤트 루프를 몇 초~몇 분 멈춘다. 관리자만 쓰는 화면이지만 실수 한 번으로 서버 전체가 서는 것은 곤란하다.
   보수적으로 거른다: 길이 상한 + 수량자가 붙은 그룹 안에 또 수량자가 있으면 거절. */
export function assertSafeRegex(pattern) {
  const src = String(pattern || '');
  if (src.length > 200) throw Object.assign(new Error('정규식이 너무 깁니다 (200자 이하)'), { status: 400 });
  // 그룹( ... 수량자 ... )수량자  — 안쪽 수량자가 있는 그룹에 바깥 수량자가 붙은 꼴
  const nested = /\((?:[^()\\]|\\.)*[*+][^()]*\)\s*(?:[*+]|\{\d*,?\d*\})|\((?:[^()\\]|\\.)*\{\d*,?\d*\}[^()]*\)\s*(?:[*+]|\{\d*,?\d*\})/;
  if (nested.test(src)) {
    throw Object.assign(new Error('중첩 반복 패턴(예: (a+)+ )은 서버를 멈출 수 있어 허용하지 않습니다'), { status: 400 });
  }
  // 갈래가 겹치는 반복 (a|aa)+ , (a|a)* — 한 갈래가 다른 갈래의 앞부분이면 같은 입력을 여러 방법으로 맞춰 본다
  for (const m of src.matchAll(/\(([^()]*\|[^()]*)\)\s*(?:[*+]|\{\d*,?\d*\})/g)) {
    const alts = m[1].split('|').map((a) => a.replace(/^\?:/, '').trim()).filter(Boolean);
    const plain = alts.every((a) => /^[\w\s\\.-]*$/.test(a));
    if (!plain) continue;
    for (let i = 0; i < alts.length; i++) for (let j = 0; j < alts.length; j++) {
      if (i !== j && alts[j].startsWith(alts[i])) {
        throw Object.assign(new Error('갈래가 겹치는 반복 패턴(예: (a|aa)+ )은 서버를 멈출 수 있어 허용하지 않습니다'), { status: 400 });
      }
    }
  }
  let re;
  try { re = new RegExp(src, 'i'); }
  catch (e) { throw Object.assign(new Error(`정규식 오류: ${e.message}`), { status: 400 }); }
  return re;
}

/** 파일 끝에서 maxBytes 만 읽는다 (Buffer). 줄 경계는 iterateLines 가 맞춘다 */
export async function readTailBuffer(fullPath, maxBytes) {
  const st = await fs.promises.stat(fullPath);
  if (st.size <= maxBytes) return { buf: await fs.promises.readFile(fullPath), truncated: false, size: st.size, read: st.size };
  const fh = await fs.promises.open(fullPath, 'r');
  try {
    const buf = Buffer.allocUnsafe(maxBytes);
    await fh.read(buf, 0, maxBytes, st.size - maxBytes);
    return { buf, truncated: true, size: st.size, read: maxBytes };
  } finally { await fh.close(); }
}
/** 예전 호출부용 — 문자열로 */
async function readTail(fullPath, maxBytes) {
  const r = await readTailBuffer(fullPath, maxBytes);
  let text = r.buf.toString('utf8');
  if (r.truncated) { const nl = text.indexOf('\n'); if (nl >= 0) text = text.slice(nl + 1); }
  return { text, truncated: r.truncated, size: r.size, read: r.read };
}
/**
 * ★ v1.11.3 — 큰 버퍼를 **조각내어** 줄로 만든다. 64MB 를 한 번에 toString+split 하면 그 자체가
 *   수백 ms 를 동기로 먹는다. 2MB 씩 디코드하고 조각 사이에 이벤트 루프에 자리를 내준다.
 *   (조각 경계에서 잘린 줄은 다음 조각 앞에 붙인다. 잘린 첫 줄은 버린다)
 */
const CHUNK = 2 * 1024 * 1024;
export async function* iterateLines(buf, { dropFirst = false } = {}) {
  let carry = '';
  let first = dropFirst;
  for (let off = 0; off < buf.length; off += CHUNK) {
    let end = Math.min(off + CHUNK, buf.length);
    // UTF-8 다중바이트 글자가 조각 경계에 걸치지 않게 뒤로 조금 물린다
    if (end < buf.length) { let k = end; while (k > off && (buf[k] & 0xC0) === 0x80) k--; if (k > off) end = k; }
    const text = carry + buf.toString('utf8', off, end);
    const parts = text.split(/\r?\n/);
    carry = parts.pop();
    for (const ln of parts) {
      if (first) { first = false; continue; }
      yield ln;
    }
    await breathe();
    off = end - CHUNK;   // 다음 반복의 += CHUNK 로 end 부터 이어진다
  }
  if (carry && !first) yield carry;
}

/** 긴 루프 중간에 이벤트 루프에 자리를 내준다 (다른 요청·헬스체크가 굶지 않게) */
export const breathe = () => new Promise((r) => setImmediate(r));
export const YIELD_EVERY = 4000;   // 줄

/**
 * 로그를 조건으로 자른다.
 * @param {object} q { kinds[], levels[], requestId, q, slowerThan, around, windowMs, sinceMs, limit }
 */
export async function queryLogs(rootAbs, q = {}) {
  /* ★ v1.11.3 — 예전에는 최근 20개 파일을 **전부 동기로** 읽어 모든 줄을 객체로 만든 뒤 걸렀다.
     200MB 파일 하나에 질의 한 번이 이벤트 루프를 7.6초 멈췄고 메모리도 줄 수만큼 들었다.
     지금은
       · 최신 파일부터, 파일은 끝에서부터 maxBytes 안에서만 읽는다
       · 조건에 맞는 줄만 모으고, limit 만큼 모이면 더 오래된 파일은 열지 않는다
       · 4,000줄마다 이벤트 루프에 자리를 내준다
     결과의 의미는 같다 — "조건에 맞는 것 중 최신 limit 건". 다만 total 은 읽은 범위 안의 개수다(partial). */
  /* LOG_SQL=true 면 sql/ 폴더는 general/ 에 있는 SQL·HTTP 줄의 **사본**이다 (시각이 몇 ms 다를 뿐).
     둘 다 훑으면 같은 줄이 두 번 나온다 — general/ 이 있으면 거기만 본다. */
  const scanRoot = fs.existsSync(path.join(rootAbs, 'general')) ? path.join(rootAbs, 'general') : rootAbs;
  const filesAsc = collectLogFiles(scanRoot).slice(-(Number(q.files) || 20));
  const files = filesAsc.slice().reverse();                     // 최신 → 오래된
  const limit = Math.min(Number(q.limit) || 300, 2000);
  const maxBytes = Math.max(1024 * 1024, Number(q.maxBytes) || 64 * 1024 * 1024);
  const needle = q.q ? String(q.q).toLowerCase() : null;
  const around = q.around ? Number(q.around) : null;
  const win = Number(q.windowMs) || 3000;
  const since = q.sinceMs ? Date.now() - Number(q.sinceMs) : null;

  const pass = (r) => {
    if (q.kinds?.length && !q.kinds.includes(r.kind)) return false;
    if (q.levels?.length && !q.levels.includes(r.level)) return false;
    if (q.requestId && r.requestId !== q.requestId) return false;
    if (q.slowerThan != null && !(r.ms != null && r.ms >= Number(q.slowerThan))) return false;
    if (since && r.at < since) return false;
    if (around && Number.isFinite(around) && Math.abs(r.at - around) > win) return false;
    return true;
  };
  const textPass = (r) => !needle || r.raw.toLowerCase().includes(needle);

  const picked = [];        // 최신 파일의 결과가 앞에 오도록 파일 단위로 앞에 붙인다
  const seen = new Set();
  let scanned = 0, budget = maxBytes, filesRead = 0, partial = false, bytesRead = 0;
  for (const f of files) {
    if (budget <= 0) { partial = true; break; }
    // 시간 조건으로 파일을 건너뛸 수 있으면 건너뛴다 (mtime 이 시작 시각보다 이르면 그 파일에는 없다)
    try {
      const mt = fs.statSync(f).mtimeMs;
      if (since && mt < since - 60_000) continue;
      if (around && mt < around - win - 60_000) continue;
    } catch { continue; }
    let tail;
    try { tail = await readTailBuffer(f, budget); } catch { continue; }
    filesRead++; bytesRead += tail.read; budget -= tail.read;
    if (tail.truncated) partial = true;
    const fileRows = [];
    let last = null;
    let i = 0;
    for await (const raw of iterateLines(tail.buf, { dropFirst: tail.truncated })) {
      if (++i % YIELD_EVERY === 0) await breathe();
      if (!raw.trim()) continue;
      const p = parseLogLine(raw);
      if (p) {
        scanned++;
        last = p;
        if (pass(p)) {
          /* LOG_SQL=true 면 HTTP 줄이 general/ 과 sql/ 양쪽에 있다 — 같은 줄은 한 번만 */
          const key = `${p.level}|${p.requestId}|${p.kind}|${p.rest.replace(/^\[[^\]]*\]\s*/, '').slice(0, 160)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          p._keep = true; fileRows.push(p);
        }
      } else if (last) {
        last.raw += '\n' + raw;                  // 이어지는 줄(스택)은 앞 항목에 붙인다 — 파일 안에서만
      }
    }
    // 본문 검색은 이어 붙인 뒤에 본다 (스택 안의 낱말도 잡히게)
    const matched = fileRows.filter((r) => { delete r._keep; return textPass(r); });
    picked.unshift(...matched);
    if (picked.length >= limit) { if (files.indexOf(f) < files.length - 1) partial = true; break; }
  }
  picked.sort((a, b) => a.at - b.at);
  return {
    total: picked.length,
    scanned,
    files: filesRead,
    bytesRead,
    partial,
    note: partial ? `최신 ${Math.round(bytesRead / 1048576)}MB 안에서 찾은 결과입니다 — 더 오래된 것은 [로그] 화면에서 파일을 직접 여세요` : null,
    rows: picked.slice(-limit),
  };
}

/** 무엇으로 거를 수 있는지 — 실제 로그에 있는 값만 (필드 이름을 외우게 하지 않는다) */
export async function logFacets(rootAbs, { files = 20, maxBytes = 16 * 1024 * 1024 } = {}) {
  /* ★ v1.11.3 — 화면을 열 때마다 최근 20개 파일 전체를 동기로 읽었다(200MB 에서 6.6초 정지).
     이제 최신 파일부터 maxBytes 안에서만, 비동기로 센다. 값의 "종류" 를 보여 주는 용도라 표본으로 충분하다. */
  const scanRoot = fs.existsSync(path.join(rootAbs, 'general')) ? path.join(rootAbs, 'general') : rootAbs;
  const list = collectLogFiles(scanRoot).slice(-Number(files)).reverse();
  const kinds = new Map(); const levels = new Map(); const reqs = new Map();
  let total = 0, budget = maxBytes, sampled = false, filesRead = 0;
  for (const f of list) {
    if (budget <= 0) { sampled = true; break; }
    let tail;
    try { tail = await readTailBuffer(f, budget); } catch { continue; }
    filesRead++; budget -= tail.read; if (tail.truncated) sampled = true;
    let i = 0;
    for await (const ln of iterateLines(tail.buf, { dropFirst: tail.truncated })) {
      if (++i % YIELD_EVERY === 0) await breathe();
      const p = parseLogLine(ln);
      if (!p) continue;
      total += 1;
      kinds.set(p.kind, (kinds.get(p.kind) || 0) + 1);
      levels.set(p.level, (levels.get(p.level) || 0) + 1);
      if (p.requestId) reqs.set(p.requestId, (reqs.get(p.requestId) || 0) + 1);
    }
  }
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([value, count]) => ({ value, count }));
  return { total, files: filesRead, sampled, kinds: top(kinds, 20), levels: top(levels, 10), requests: top(reqs, 30) };
}

/**
 * 로그 파일 목록 — **수정 시각** 오름차순.
 *  ⚠ 경로 정렬로는 안 된다. 크기 상한에 걸려 회전하면 `2026-08-25.1.log` 가 생기는데,
 *    경로 정렬에서는 `.1` 이 본체보다 앞에 온다('1' < 'l'). 그 상태로 "최근 N개" 를
 *    자르면 가장 최신 파일이 잘린다.
 */
export function collectLogFiles(rootAbs) {
  if (!fs.existsSync(rootAbs)) return [];
  const out = [];
  (function walk(d) {
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.log$/.test(e.name)) {
        let mtime = 0;
        try { mtime = fs.statSync(p).mtimeMs; } catch { /* 사라짐 */ }
        out.push({ p, mtime });
      }
    }
  })(rootAbs);
  return out.sort((a, b) => a.mtime - b.mtime).map((x) => x.p);
}

/* ★ v1.11.4 — [로그] 내용 보기의 핵심. 파일 끝 maxBytes 안에서 수준·검색·정규식·일치만·페이지.
   cache 를 주면(메인 스레드에서 부를 때) 같은 파일의 다음 페이지는 다시 디코드하지 않는다.
   워커에서 부를 때는 cache 가 없다(스레드가 끝나면 버려진다). */
let _lineCache = null;   // { key, at, truncated, allLines }
export async function readFileLines({ fullPath, maxBytes, q = '', isRegex = false, level = 'all', onlyMatches = false, page = 1, perPage = 500, useCache = true }) {
  const st = fs.statSync(fullPath);
  let regex = null;
  if (q && isRegex) regex = assertSafeRegex(q);
  const qLower = (q && !isRegex) ? String(q).toLowerCase() : null;
  const levelNorm = String(level || 'all').toLowerCase();
  const levelActive = levelNorm !== 'all';
  const LEVEL_RE = /\[(?:\x1b\[[0-9;]*m)?([A-Z]+)(?:\x1b\[[0-9;]*m)?\]/;
  const matchLevel = (line) => { if (!levelActive) return true; const m = line.match(LEVEL_RE); return !!m && m[1].toLowerCase() === levelNorm; };
  const matchSearch = (line) => { if (!q) return true; if (regex) return regex.test(line); return line.toLowerCase().includes(qLower); };
  const pp = Math.max(10, Math.min(2000, parseInt(perPage, 10) || 500));
  const pnum = Math.max(1, parseInt(page, 10) || 1);
  const MAX_BYTES = Number(maxBytes) || 32 * 1024 * 1024;

  const cacheKey = `${fullPath}|${st.mtimeMs}|${st.size}|${MAX_BYTES}`;
  let truncated, allLines;
  if (useCache && _lineCache && _lineCache.key === cacheKey && Date.now() - _lineCache.at < 60_000) {
    ({ truncated, allLines } = _lineCache);
  } else {
    const tail = await readTailBuffer(fullPath, MAX_BYTES);
    truncated = tail.truncated;
    allLines = [];
    for await (const ln of iterateLines(tail.buf, { dropFirst: truncated })) allLines.push(ln);
    if (useCache) _lineCache = { key: cacheKey, at: Date.now(), truncated, allLines };
  }
  const totalLines = allLines.length;
  const matchedLineNos = [];
  let matchedLines = 0;
  const filteredIdx = [];
  for (let i = 0; i < totalLines; i++) {
    if (i % YIELD_EVERY === 0 && i > 0) await breathe();
    const line = allLines[i].length > 4000 && regex ? allLines[i].slice(0, 4000) : allLines[i];
    if (!matchLevel(line)) continue;
    const okSearch = matchSearch(line);
    if (okSearch && q) { matchedLines++; if (matchedLineNos.length < 5000) matchedLineNos.push(i + 1); }
    if (onlyMatches && q) { if (okSearch) filteredIdx.push(i); } else filteredIdx.push(i);
  }
  const filteredLines = filteredIdx.length;
  const totalPages = Math.max(1, Math.ceil(filteredLines / pp));
  const clampPage = Math.min(pnum, totalPages);
  const start = (clampPage - 1) * pp;
  const end = Math.min(start + pp, filteredLines);
  const pageIdxSlice = filteredIdx.slice(start, end);
  const origLineNos = pageIdxSlice.map((i) => i + 1);
  return {
    content: pageIdxSlice.map((i) => allLines[i]).join('\n'),
    fileSize: st.size, totalLines, filteredLines, matchedLines, matchedLineNos, origLineNos,
    page: clampPage, perPage: pp, totalPages,
    startLineNo: origLineNos[0] || 0, endLineNo: origLineNos[origLineNos.length - 1] || 0,
    truncated,
    truncatedNote: truncated ? `파일이 커서 끝에서 ${Math.round(MAX_BYTES / 1048576)}MB 만 읽었습니다 (${Math.round(st.size / 1048576)}MB)` : null,
    level: levelNorm, q, isRegex, onlyMatches: !!(onlyMatches && q),
  };
}
