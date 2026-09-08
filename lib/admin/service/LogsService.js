/**
 * LogsService — 서버 로그 파일 조회/검색/다운로드.
 *
 *  디렉토리 구조:
 *    log/
 *      general/  YYYY-MM/YYYY-MM-DD.log
 *      sql/      YYYY-MM/YYYY-MM-DD.log
 *
 *  보안:
 *   - 종류(kind) 는 화이트리스트 ('general' | 'sql')
 *   - file 파라미터는 상대 경로. `..` 를 포함하거나 절대 경로이면 거부
 *   - 모든 경로는 로그 루트 이하에 있어야 함 (path traversal 방지)
 */
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { Service, Log } from '../../../src/core/decorators.js';
import config from '../../../src/config/index.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..', '..');

const KIND_WHITELIST = ['general', 'sql'];


function isSafeRelative(rel) {
  if (!rel || typeof rel !== 'string') return false;
  if (rel.length > 200) return false;
  // 절대경로, 드라이브 접두어, `..` 포함 금지
  if (path.isAbsolute(rel)) return false;
  if (/(^|[\\/])\.\.([\\/]|$)/.test(rel)) return false;
  if (/^[A-Za-z]:/.test(rel)) return false;
  return true;
}

/** 파일의 실제 절대 경로를 계산하되, 루트 이하인지 검증. */
function resolveInside(rootAbs, rel) {
  const full = path.resolve(rootAbs, rel);
  const rootResolved = path.resolve(rootAbs);
  const rel2 = path.relative(rootResolved, full);
  if (rel2.startsWith('..') || path.isAbsolute(rel2)) {
    throw Object.assign(new Error('경로 탐색 차단'), { status: 400 });
  }
  return full;
}

/** 디렉토리 재귀 스캔 → { relPath, size, mtime } 배열 */
function scanDir(rootAbs) {
  const out = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) { walk(full); continue; }
      if (!ent.isFile()) continue;
      if (!ent.name.endsWith('.log')) continue;   // .log 파일만
      try {
        const st = fs.statSync(full);
        out.push({
          relPath: path.relative(rootAbs, full).replace(/\\/g, '/'),
          size: st.size,
          mtime: st.mtime.toISOString(),
        });
      } catch { /* 무시 */ }
    }
  }
  walk(rootAbs);
  // 최신 파일이 위로 오도록 mtime desc
  out.sort((a, b) => b.mtime.localeCompare(a.mtime));
  return out;
}

@Service('LogsService')
export default class LogsService {
  @Log log;

  /** log 루트 ex) /abs/.../log */
  get _logRoot() {
    return path.resolve(projectRoot, config.log?.dir || 'log');
  }
  _kindRoot(kind) {
    if (!KIND_WHITELIST.includes(kind)) {
      throw Object.assign(new Error(`unknown kind: ${kind}`), { status: 400 });
    }
    return path.join(this._logRoot, kind);
  }

  /** ★ v1.9.5 — kind 기반 질의. CLI(`npm run logs`)와 같은 규칙을 쓴다. (v1.11.3 부터 비동기·상한 있음) */
  query(q) {
    if (q?.q && q?.isRegex) assertSafeRegex(q.q);
    return runScan('queryLogs', [this._logRoot, { ...q, maxBytes: q?.maxBytes ?? config.logView?.queryMaxBytes }], { useWorker: this._useWorker(), timeoutMs: this._scanTimeout() });
  }

  /** ★ v1.9.5 — 거를 수 있는 값 (필드 이름을 외우게 하지 않기 위해) */
  facets(opts) { return runScan('logFacets', [this._logRoot, { ...(opts || {}), maxBytes: config.logView?.facetsMaxBytes }], { useWorker: this._useWorker(), timeoutMs: this._scanTimeout() }); }

  /** 지원되는 로그 종류 목록 + 각 종류의 파일 수 */
  listKinds() {
    return KIND_WHITELIST.map((k) => {
      const root = path.join(this._logRoot, k);
      const exists = fs.existsSync(root);
      const fileCount = exists ? scanDir(root).length : 0;
      return { kind: k, label: k === 'general' ? '일반' : 'SQL', fileCount, exists };
    });
  }

  /** 특정 kind 아래의 1단계 폴더 목록 + 각 폴더의 파일 수/최근수정시각.
   *  폴더가 아닌 루트 직접 파일들은 `(루트)` 가상 폴더로 묶어 반환.
   */
  listFolders({ kind } = {}) {
    const root = this._kindRoot(kind);
    if (!fs.existsSync(root)) return { folders: [] };

    const folders = [];
    let rootFiles = [];

    for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
      const full = path.join(root, ent.name);
      if (ent.isDirectory()) {
        // 폴더 안의 .log 파일만 집계 (재귀는 1단계까지만 — 통상 YYYY-MM 구조)
        const inner = scanDir(full);
        const latest = inner[0]?.mtime || null;
        folders.push({
          name: ent.name,
          fileCount: inner.length,
          lastModified: latest,
          isRoot: false,
        });
      } else if (ent.isFile() && ent.name.endsWith('.log')) {
        try {
          const st = fs.statSync(full);
          rootFiles.push({
            relPath: ent.name,
            size: st.size,
            mtime: st.mtime.toISOString(),
          });
        } catch { /* 무시 */ }
      }
    }

    // 폴더: 이름 desc (최신 월이 위로)
    folders.sort((a, b) => b.name.localeCompare(a.name));

    // 루트에 파일이 있으면 '(루트)' 가상 폴더를 맨 앞에 추가
    if (rootFiles.length) {
      rootFiles.sort((a, b) => b.mtime.localeCompare(a.mtime));
      folders.unshift({
        name: '(루트)',
        fileCount: rootFiles.length,
        lastModified: rootFiles[0].mtime,
        isRoot: true,
      });
    }

    return { folders };
  }

  /** 특정 kind / 특정 폴더 내 파일 목록 (페이지네이션).
   *  folder === '' 또는 '(루트)' 이면 kind 루트의 직접 파일만.
   *  folder 가 주어지면 해당 서브 폴더 내부만.
   *  folder 미지정 시 (호환): kind 전체 재귀 스캔 (과거 동작).
   */
  listFiles({ kind, folder, page = 1, perPage = 20 } = {}) {
    const root = this._kindRoot(kind);
    if (!fs.existsSync(root)) return { rows: [], total: 0 };

    let all;
    if (folder === undefined || folder === null) {
      // 호환: 전체 재귀
      all = scanDir(root);
    } else if (folder === '' || folder === '(루트)') {
      // 루트 직접 파일만
      all = [];
      for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
        if (!ent.isFile() || !ent.name.endsWith('.log')) continue;
        const full = path.join(root, ent.name);
        try {
          const st = fs.statSync(full);
          all.push({ relPath: ent.name, size: st.size, mtime: st.mtime.toISOString() });
        } catch { /* 무시 */ }
      }
      all.sort((a, b) => b.mtime.localeCompare(a.mtime));
    } else {
      // 폴더 검증 — 화이트리스트 영역 내에서만 + 단순 이름 (슬래시/.. 불가)
      if (!/^[\w.\-]+$/.test(folder)) {
        throw Object.assign(new Error('folder 이름이 올바르지 않습니다.'), { status: 400 });
      }
      const resolved = resolveInside(root, folder);  // 방어적 재확인
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        return { rows: [], total: 0 };
      }
      // scanDir 는 sub 기준 상대 경로를 주지만, 파일 조회/다운로드는 kind 루트 기준 경로가 필요.
      // 따라서 kind 루트 기준으로 relPath 를 다시 조립.
      const inner = scanDir(resolved);
      all = inner.map(it => ({
        ...it,
        relPath: `${folder}/${it.relPath}`.replace(/\\/g, '/'),
      }));
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const pp = Math.max(1, Math.min(200, parseInt(perPage, 10) || 20));
    const start = (p - 1) * pp;
    return {
      rows: all.slice(start, start + pp),
      total: all.length,
    };
  }

  /** 파일 내용 조회 — 필터링 + 페이지네이션 지원.
   *
   *  라인 단위 스트리밍으로 읽어 필터를 적용 후, 선택된 페이지 범위만 반환.
   *  10MB 정도의 파일도 라인 기반 처리로 메모리 부담이 작다.
   *
   *    kind        : general | sql
   *    file        : 상대 경로
   *    q           : 검색어 (대소문자 무시)
   *    isRegex     : q 를 정규식으로 해석
   *    level       : 'all' | 'debug' | 'http' | 'info' | 'warn' | 'error'
   *                  해당 level 의 라인만 필터 (대괄호 토큰 기준)
   *    onlyMatches : true 이면 검색 일치 라인만 반환 (q 없으면 무시됨)
   *    page        : 1부터 시작
   *    perPage     : 한 페이지 라인 수 (기본 500, 최대 2000)
   *
   *  반환: {
   *    content        : 페이지에 해당하는 라인들을 \n 으로 join
   *    fileSize       : 원본 파일 바이트 수
   *    totalLines     : 파일 전체 원본 라인 수
   *    filteredLines  : 필터 적용 후 라인 수 (페이지네이션 기준)
   *    matchedLines   : 검색어가 있을 때 일치 라인 수
   *    page, perPage, totalPages
   *    startLineNo, endLineNo : 페이지가 가리키는 원본 파일의 라인 번호 범위
   *    matchedLineNos         : 전체 일치 라인 번호 배열 (앞 5000개까지)
   *    origLineNos            : 페이지에 포함된 각 라인의 원본 라인 번호 배열 (라인과 1:1 매칭)
   *  }
   */
  async readFile({
    kind, file,
    q = '', isRegex = false,
    level = 'all',
    onlyMatches = false,
    page = 1, perPage = 500,
  } = {}) {
    const root = this._kindRoot(kind);
    if (!isSafeRelative(file)) throw Object.assign(new Error('파일 경로가 올바르지 않습니다.'), { status: 400 });
    const fullPath = resolveInside(root, file);
    if (!fs.existsSync(fullPath)) throw Object.assign(new Error('파일 없음'), { status: 404 });
    if (q && isRegex) assertSafeRegex(q);   // 빠른 거절은 메인에서
    /* ★ v1.11.4 — 정규식 검색은 워커 스레드에서(시간 초과 시 죽인다). 보통 검색·페이지 넘기기는 메인에서 캐시를 살려 즉시. */
    const args = [{ fullPath, maxBytes: config.logView?.fileMaxBytes || 32 * 1024 * 1024, q, isRegex, level, onlyMatches, page, perPage, useCache: !isRegex }];
    return runScan('readFileLines', args, { useWorker: this._useWorker() && !!(q && isRegex), timeoutMs: this._scanTimeout() });
  }

  _useWorker() { return config.logView?.worker !== false; }
  _scanTimeout() { return Number(config.logView?.scanTimeoutMs) || 15_000; }
  /** 파일들을 zip 으로 묶어 Buffer 반환.
   *    files: [{ kind, file }]
   *    filter (선택): { q, isRegex } — 내용에 일치하는 라인만 남긴 버전을 별도 .filtered.log 로 추가
   */
  buildZip({ files, filter = null } = {}) {
    if (!Array.isArray(files) || !files.length) {
      throw Object.assign(new Error('files 필요'), { status: 400 });
    }
    if (files.length > 500) {
      throw Object.assign(new Error('한 번에 최대 500 파일'), { status: 400 });
    }
    const zip = new AdmZip();
    let matcher = null;
    if (filter?.q) matcher = filter.isRegex ? assertSafeRegex(filter.q) : null;
    /* ★ v1.11.3 — zip 은 메모리에서 만든다. 파일 500개 × 50MB 를 그대로 받으면 프로세스가 죽는다. 합계 상한. */
    const MAX_TOTAL = 256 * 1024 * 1024;
    let total = 0;
    for (const { kind, file } of files) {
      if (!KIND_WHITELIST.includes(kind) || !isSafeRelative(file)) continue;
      try { total += fs.statSync(resolveInside(this._kindRoot(kind), file)).size; } catch { /* 없음 */ }
    }
    if (total > MAX_TOTAL) {
      throw Object.assign(new Error(`한 번에 내려받기에는 너무 큽니다 (${Math.round(total / 1048576)}MB > 256MB). 파일을 나누어 받으세요.`), { status: 413 });
    }

    for (const { kind, file } of files) {
      if (!KIND_WHITELIST.includes(kind)) continue;
      if (!isSafeRelative(file)) continue;
      const root = this._kindRoot(kind);
      const full = resolveInside(root, file);
      if (!fs.existsSync(full)) continue;

      const relInZip = `${kind}/${file}`;
      if (filter?.q) {
        // 일치 라인만 남기기
        const content = fs.readFileSync(full, 'utf8');
        const filtered = content.split(/\r?\n/).filter((ln) => {
          return filter.isRegex ? matcher.test(ln) : ln.toLowerCase().includes(filter.q.toLowerCase());
        }).join('\n');
        zip.addFile(relInZip.replace(/\.log$/, '.filtered.log'), Buffer.from(filtered, 'utf8'));
      } else {
        zip.addLocalFile(full, path.dirname(relInZip), path.basename(relInZip));
      }
    }
    return zip.toBuffer();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.9.5 — kind 기반 질의 (콘솔 [로그] 화면용)
   CLI(`npm run logs`)와 **같은 규칙**을 쓴다. 규칙이 갈리면 같은 조건인데
   화면과 터미널의 결과가 달라져, 어느 쪽을 믿어야 할지 알 수 없게 된다.
   ══════════════════════════════════════════════════════════════════════════ */

/* ★ v1.11.3 — 줄 문법은 src/util/logLine.js 하나로 (CLI 와 공유). 여기서는 다시 내보내기만 한다. */
export { parseLogLine, LINE_RE } from '../../../src/util/logLine.js';
import { parseLogLine } from '../../../src/util/logLine.js';
/* ★ v1.11.4 — 훑는 코드는 src/util/logScan.js (워커 스레드와 공유). 여기서는 다시 내보낸다 */
export { assertSafeRegex, queryLogs, logFacets, collectLogFiles } from '../../../src/util/logScan.js';
import { assertSafeRegex } from '../../../src/util/logScan.js';
import { runScan } from '../../../src/util/logScanRunner.js';

