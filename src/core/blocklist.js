/**
 * blocklist.js — 특정 컨트롤러·서비스·SQL 을 **막는다** (v1.13.0)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  왜 필요한가
 * ═══════════════════════════════════════════════════════════════════════════
 *  "이 컨트롤러에 구멍이 있으니 지금 당장 내려야 한다. 그런데 서버 전체를 내릴 수는 없다."
 *  지금까지 방법은 **삭제뿐**이었다. 삭제는 되돌릴 수 없고, 급한 상황에서 파일을 지우는 것은
 *  사고로 이어진다(잘못 지우면 복구는 백업에서). 그래서 "끄기" 를 따로 만든다.
 *
 *  두 가지를 동시에 만족해야 한다.
 *   ① **지금** 막힌다 — 운영 중에 라우트가 즉시 사라진다 (재기동 없이)
 *   ② **다시 켜도** 막혀 있다 — 기동할 때 그 파일을 아예 읽지 않는다
 *
 *  ②가 없으면 새벽에 감시가 서버를 재기동하는 순간 구멍이 다시 열린다.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  어디에 적히나
 * ═══════════════════════════════════════════════════════════════════════════
 *  `src/config/blocked.json` — 한 파일이다. 콘솔이 고치고, 기동할 때 로더가 읽는다.
 *  DB 가 아니라 파일인 이유: **DB 가 죽어 있어도 막혀 있어야** 하고, 기동 순서상
 *  컨트롤러 로딩이 DB 연결보다 앞설 수 있기 때문이다.
 *
 *  형식:
 *    {
 *      "controllers": [{ "name": "SnackController", "reason": "…", "by": "admin", "at": "2026-08-29T…" }],
 *      "services":    [ … ],
 *      "sqls":        [ … ]
 *    }
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = process.env.AIDOT_DATA_DIR ? path.join(process.env.AIDOT_DATA_DIR, 'blocked.json')
  : path.join(projectRoot, 'src', 'config', 'blocked.json');
const KINDS = ['controllers', 'services', 'sqls'];

let cache = null;
let cacheAt = 0;
const TTL_MS = 1_000;   // 로딩 루프에서 파일을 수백 번 읽지 않도록

function empty() { return { controllers: [], services: [], sqls: [] }; }

/** 파일을 읽는다 (없거나 깨졌으면 빈 목록 — 막는 파일이 깨졌다고 서버가 안 뜨면 안 된다) */
export function load({ force = false } = {}) {
  if (!force && cache && Date.now() - cacheAt < TTL_MS) return cache;
  let data = empty();
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      for (const k of KINDS) {
        data[k] = Array.isArray(parsed?.[k])
          ? parsed[k].filter((e) => e && typeof e.name === 'string' && e.name.trim())
          : [];
      }
    }
  } catch {
    data = empty();
  }
  cache = data; cacheAt = Date.now();
  return data;
}

/** 이 이름이 막혀 있나 — 파일명(확장자 없이)이나 클래스명으로 본다 */
export function isBlocked(kind, name) {
  if (!name) return false;
  const list = load()[kind] || [];
  const n = String(name).replace(/\.(m?js|ts|sql)$/i, '');
  return list.some((e) => e.name === n);
}

/** 막힌 이유 (없으면 null) */
export function blockInfo(kind, name) {
  const n = String(name || '').replace(/\.(m?js|ts|sql)$/i, '');
  return (load()[kind] || []).find((e) => e.name === n) || null;
}

/** 전체 목록 */
export function list() { return load({ force: true }); }

/** 막는다 (이미 막혀 있으면 사유만 갱신) */
export function block(kind, name, { reason = '', by = '' } = {}) {
  if (!KINDS.includes(kind)) throw Object.assign(new Error(`알 수 없는 종류: ${kind}`), { status: 400 });
  const n = String(name || '').trim().replace(/\.(m?js|ts|sql)$/i, '');
  if (!n || !/^[A-Za-z0-9_.-]+$/.test(n)) throw Object.assign(new Error('이름이 올바르지 않습니다'), { status: 400 });
  const data = load({ force: true });
  const at = new Date().toISOString();
  const found = data[kind].find((e) => e.name === n);
  if (found) { found.reason = reason || found.reason; found.by = by || found.by; found.at = at; }
  else data[kind].push({ name: n, reason, by, at });
  save(data);
  return blockInfo(kind, n);
}

/** 다시 켠다 */
export function unblock(kind, name) {
  if (!KINDS.includes(kind)) throw Object.assign(new Error(`알 수 없는 종류: ${kind}`), { status: 400 });
  const n = String(name || '').trim().replace(/\.(m?js|ts|sql)$/i, '');
  const data = load({ force: true });
  const before = data[kind].length;
  data[kind] = data[kind].filter((e) => e.name !== n);
  save(data);
  return before !== data[kind].length;
}

function save(data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  cache = data; cacheAt = Date.now();
}

export const BLOCKLIST_FILE = FILE;
export default { load, list, isBlocked, blockInfo, block, unblock, BLOCKLIST_FILE };
