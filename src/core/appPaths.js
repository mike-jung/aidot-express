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

/**
 * ★ v1.36.3 — 작업 폴더를 **여러 개** 받는다. 그리고 설치본에서는
 *  쓸 수 있는 곳을 자동으로 더한다.
 *
 *  왜 필요한가
 *    설치본은 `C:\Program Files\...` 에 놓인다. 거기는 관리자 권한 없이 쓸 수 없다.
 *    그런데 서버가 부팅하면서 `src/service/meta/` 를 만들려다 죽었다:
 *
 *        EPERM: mkdir 'C:\Program Files\Aidot Express\resources\app\src\service\meta'
 *
 *    읽기 전용인 곳에 쓰려 한 것이 문제다. 파일을 만드는 일은 전부
 *    **사용자 폴더**(`%APPDATA%\Aidot Express\workspace`)에서 해야 한다.
 *
 *  설정
 *    APP_WORKSPACE=workspace                    한 곳 (예전과 같음)
 *    APP_WORKSPACE=workspace,C:\team\shared     여러 곳 (쉼표 · 세미콜론 · 경로구분자)
 *
 *    설치본에서는 여기에 적지 않아도 사용자 폴더가 **맨 뒤에** 자동으로 붙는다.
 *    맨 뒤여야 같은 이름일 때 내가 만든 것이 이긴다.
 */
function splitList(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(/[,;]|(?<=[^:]):(?![\\/])/).map((x) => x.trim()).filter(Boolean);
}

/** 설치본에서 쓸 수 있는 폴더 — Electron 이 알려 준다 (없으면 null) */
function userDataWorkspace() {
  const base = process.env.ELECTRON_USER_DATA;
  if (!base) return null;
  return path.join(base, 'workspace');
}

/**
 * 작업 폴더 목록. **읽는 순서대로** — 뒤에 오는 것이 이긴다.
 * @returns {string[]}
 */
export function workspaceRoots() {
  const out = [];
  for (const raw of splitList(config?.paths?.workspace)) {
    const abs = path.resolve(projectRoot, raw);
    if (!out.includes(abs)) out.push(abs);
  }
  /* 설치본의 사용자 폴더는 맨 뒤 — 내가 만든 것이 가장 세다 */
  const ud = userDataWorkspace();
  if (ud && !out.includes(ud)) out.push(ud);
  return out;
}

/** 예전 이름 — 첫 번째 작업 폴더 (없으면 null) */
export function workspaceRoot() {
  return workspaceRoots()[0] ?? null;
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

  // ② 작업 폴더들 — **나중에** 넣어야 같은 이름일 때 내 것이 이긴다
  if (SUBDIR[kind]) {
    for (const ws of workspaceRoots()) {
      const abs = path.join(ws, SUBDIR[kind]);
      if (!out.includes(abs)) out.push(abs);
    }
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
  /* ★ v1.36.3 — **쓸 수 있는 곳**을 찾는다. 뒤에서부터 보는 이유:
     작업 폴더 목록은 "뒤가 이긴다" 순서이고, 설치본의 사용자 폴더가 맨 뒤다.
     예전에는 첫 번째만 보고, 실패하면 기본 경로(= Program Files)로 떨어져
     EPERM 으로 죽었다. */
  if (SUBDIR[kind]) {
    for (const ws of [...workspaceRoots()].reverse()) {
      const abs = path.join(ws, SUBDIR[kind]);
      if (canWrite(abs)) return abs;
    }
  }
  for (const d of [...resolveDirs(kind)].reverse()) if (canWrite(d)) return d;
  /* 어디에도 못 쓰면 그 사실을 분명히 알린다 — 조용히 실패하면 원인을 못 찾는다 */
  throw Object.assign(
    new Error(`쓸 수 있는 폴더가 없습니다 (${kind}). APP_WORKSPACE 를 쓰기 가능한 경로로 지정하세요.`),
    { code: 'NO_WRITABLE_DIR', kind, tried: resolveDirs(kind) });
}

/** 만들 수 있고 쓸 수 있는가 — 실제로 해 본다. 권한은 짐작하면 틀린다. */
export function canWrite(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.w${process.pid}`);
    fs.writeFileSync(probe, '');
    fs.rmSync(probe, { force: true });
    return true;
  } catch { return false; }
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

/**
 * ★ v1.38.2 — 화면에 보여 줄 경로. **어느 실행 방식이든 짧고 뜻이 통하게.**
 *
 *  예전에는 언제나 projectRoot 기준 상대 경로였다. `npm start` 로 띄우면
 *  `workspace/sql/snack.sql` 로 깔끔했지만, 설치본에서는 프로젝트가
 *  `C:\Program Files\...` 이고 파일은 `%APPDATA%` 라 서로 밖에 있어
 *  이런 모양이 됐다:
 *
 *      ../../../../Users/mikej/AppData/Roaming/Aidot Express/workspace/sql/snack.sql
 *
 *  틀린 경로는 아니지만 읽을 수가 없다. 상대 경로는 **같은 뿌리 아래일 때만**
 *  쓸모가 있다.
 *
 *  그래서 기준을 하나 더 둔다:
 *    ① 프로젝트 안이면      projectRoot 기준  → `workspace/sql/snack.sql`  (예전 그대로)
 *    ② 작업 폴더 안이면      그 폴더 기준      → `workspace/sql/snack.sql`  (설치본도 같음)
 *    ③ 둘 다 아니면         절대 경로 그대로   — 짐작해서 줄이면 더 헷갈린다
 *
 *  ②가 핵심이다. 설치본이든 개발이든 사용자에게는 **같은 글자**로 보인다.
 */
export function displayPath(abs) {
  if (!abs) return '';
  const norm = (p) => p.replace(/\\/g, '/');

  const inside = (base) => {
    if (!base) return null;
    const rel = path.relative(base, abs);
    /* `..` 로 시작하면 그 아래가 아니다 — 상대 경로가 의미를 잃는 지점이다 */
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return norm(rel);
  };

  const byProject = inside(projectRoot);
  if (byProject) return byProject;

  for (const ws of workspaceRoots()) {
    const r = inside(ws);
    /* 작업 폴더 이름을 앞에 붙여 어디의 것인지 알아볼 수 있게 한다 */
    if (r) return `${path.basename(ws)}/${r}`;
  }
  return norm(abs);
}

/**
 * ★ v1.39.0 — 지금 어떤 방식으로 돌고 있는가.
 *
 *  설치본 서버를 켜 둔 채 콘솔만 `npm start` 로 띄우면, **화면이 똑같아서**
 *  어느 쪽을 보고 있는지 알 수가 없다. 실제로 그것 때문에 한참 헤맸다 —
 *  "설치본에서 안 된다" 고 본 것이 사실은 개발 서버였다.
 *
 *  판단 재료
 *    ELECTRON_USER_DATA   Electron 이 자식에게 준다 → 설치본이 띄운 서버
 *    NODE_ENV=production  빌드된 것을 직접 실행 (npm start --production 등)
 *    그 밖                 개발
 *
 *  @returns {{id:'installed'|'release'|'dev', label:string, hint:string}}
 */
export function runMode() {
  if (process.env.ELECTRON_USER_DATA) {
    return {
      id: 'installed',
      label: 'Installed',
      hint: 'Started by the installed app (settings and files under your user profile)',
    };
  }
  /* ⚠ `.env` 가 NODE_ENV 를 덮어쓰므로 process.env 만 보면 놓친다 —
     실제로 release 가 dev 로 잡혔다. config 가 최종 결론이다. */
  if ((config?.env ?? process.env.NODE_ENV) === 'production') {
    return {
      id: 'release',
      label: 'Release',
      hint: 'Running a production build from this folder',
    };
  }
  return {
    id: 'dev',
    label: 'Dev',
    hint: 'Running from source with npm start',
  };
}
