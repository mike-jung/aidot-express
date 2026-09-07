/**
 * appPaths — 컨트롤러·서비스·SQL 을 **어느 폴더들에서** 읽을 것인가. (v1.10.42)
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  왜 필요한가
 * ══════════════════════════════════════════════════════════════════════════
 *  `src/controller/` 에는 예제가 13개 들어 있습니다. 튜토리얼을 따라
 *  `SnackController` 를 만들면 **14개 중 하나**가 되어 찾기 어렵습니다.
 *
 *  그래서 **작업 폴더**를 따로 둡니다.
 *
 *      .env:  APP_WORKSPACE=workspace
 *
 *      workspace/
 *        controller/     ← 내가 만드는 것
 *        service/
 *        sql/
 *
 *  서버는 **양쪽 다 읽습니다.** 예제도 그대로 돌아갑니다.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  순서가 중요합니다
 * ══════════════════════════════════════════════════════════════════════════
 *  작업 폴더를 **나중에** 읽습니다. 같은 이름이 양쪽에 있으면 나중에 읽은
 *  것이 이기므로, 내가 만든 것이 예제를 덮어씁니다 — 예제를 손대지 않고
 *  고쳐 쓰고 싶을 때 그게 자연스럽습니다.
 *
 *  ⚠ 폴더가 없으면 **만들지 않습니다.** 지정만 하고 안 만든 경우
 *    빈 폴더가 생기는 것보다, 기존 경로로 조용히 도는 편이 낫습니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(here, '..', '..');

/** 작업 폴더 안에서의 하위 폴더 이름 (설정 키 → 폴더명) */
const SUBDIR = { controllers: 'controller', services: 'service', sql: 'sql', scenarios: 'scenarios' };   // ★ v1.11.6 시나리오

/** `.env` 의 APP_WORKSPACE — 없으면 null */
export function workspaceRoot() {
  const raw = config?.paths?.workspace;
  if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
  return path.resolve(projectRoot, raw.trim());
}

/**
 * 어떤 종류(`controllers` | `services` | `sql`)를 읽을 폴더 목록.
 *
 * @returns {string[]} 절대 경로. **읽어야 할 순서대로** (기본 → 작업 폴더)
 */
export function resolveDirs(kind) {
  const out = [];

  // ① 기본 경로 — 배열도, 문자열 하나도 받는다
  const base = config?.paths?.[kind];
  for (const p of (Array.isArray(base) ? base : [base])) {
    if (!p) continue;
    const abs = path.resolve(projectRoot, p);
    if (!out.includes(abs)) out.push(abs);
  }

  // ② 작업 폴더 — **나중에** 넣어야 같은 이름일 때 내 것이 이긴다
  const ws = workspaceRoot();
  if (ws && SUBDIR[kind]) {
    const abs = path.join(ws, SUBDIR[kind]);
    if (!out.includes(abs)) out.push(abs);
  }
  return out;
}

/** 실제로 존재하는 폴더만 (없는 폴더를 읽으려다 죽지 않게) */
export function existingDirs(kind) {
  return resolveDirs(kind).filter((d) => {
    try { return fs.statSync(d).isDirectory(); } catch { return false; }
  });
}

/**
 * 새로 만드는 파일을 **어디에 쓸 것인가.**
 *
 *  작업 폴더가 지정돼 있고 실제로 있으면 거기에, 아니면 기존 경로에 씁니다.
 *  ⚠ 여기서는 폴더를 만들어 줍니다 — 파일을 쓰려는 시점이므로
 *    "지정만 하고 안 만든" 경우와 다릅니다.
 */
export function writeDirFor(kind) {
  const ws = workspaceRoot();
  if (ws && SUBDIR[kind]) {
    const abs = path.join(ws, SUBDIR[kind]);
    try { fs.mkdirSync(abs, { recursive: true }); return abs; } catch { /* 아래로 */ }
  }
  const dirs = resolveDirs(kind);
  return dirs[0] ?? path.resolve(projectRoot, 'src');
}

/**
 * ★ v1.11.1 — 이미 있는 파일을 **모든 폴더**에서 찾는다 (작업 폴더가 이기도록 뒤에서부터).
 *
 *  왜 필요한가
 *    v1.10.42 는 "새 파일은 작업 폴더에 쓴다" 를 넣으면서 findById/update/remove 까지 **쓰기 폴더만**
 *    보게 했다. 그래서 작업 폴더를 지정하는 순간 src/controller 의 기존 파일이 목록에는 보이는데
 *    열면 null/404 였고, 고치면 작업 폴더에 **사본**이 생겨 다음 기동 때 라우트가 겹칠 수 있었다.
 *    읽기·수정·삭제는 파일이 **있는 곳**에서, 새 파일만 작업 폴더에.
 *
 * @param {'controllers'|'services'|'sql'} kind
 * @param {string|string[]} fileNames  'Book.js' 또는 ['Book.js','Book.ts']
 * @returns {string|null} 절대 경로
 */
export function findExistingFile(kind, fileNames) {
  const names = Array.isArray(fileNames) ? fileNames : [fileNames];
  const dirs = existingDirs(kind).slice().reverse();
  for (const d of dirs) {
    for (const n of names) {
      const p = path.join(d, n);
      try { if (fs.statSync(p).isFile()) return p; } catch { /* 없음 */ }
    }
  }
  return null;
}

/** 이 파일이 작업 폴더 것인가 — 목록 화면에서 출처를 표시할 때 쓴다 */
export function isWorkspaceFile(absPath) {
  const ws = workspaceRoot();
  if (!ws || !absPath) return false;
  const rel = path.relative(ws, path.resolve(absPath));
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

export default { projectRoot, workspaceRoot, resolveDirs, existingDirs, writeDirFor, isWorkspaceFile, findExistingFile };
