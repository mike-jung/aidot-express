/**
 * 시나리오 저장소 — ★ v1.11.6 서버(파일)에 저장한다.
 *
 *  예전: localStorage('scenario::<id>') — 팀원과 공유되지 않고, 브라우저를 바꾸면 사라지고, 백업에도 빠졌다.
 *  지금: /api/admin/scenarios (workspace/scenarios/<id>.json). 처음 목록을 열 때 브라우저에 남아 있던
 *        시나리오를 서버로 **한 번** 옮기고 표시를 남긴다 (실패하면 다음에 다시 시도).
 *  모든 함수가 비동기다.
 */
import http from '../api/http';

const INDEX_KEY = 'scenario::__index';
const MIGRATED_KEY = 'scenario::__migrated';

function readLocalIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]'); } catch { return []; }
}

/** 브라우저에 남은 시나리오를 서버로 옮긴다 (1회). 옮긴 것은 로컬에서 지운다 */
export async function migrateLocalScenarios() {
  if (typeof localStorage === 'undefined') return { moved: 0 };
  if (localStorage.getItem(MIGRATED_KEY)) return { moved: 0 };
  const idx = readLocalIndex();
  let moved = 0;
  for (const meta of idx) {
    let sc = null;
    try { sc = JSON.parse(localStorage.getItem(`scenario::${meta.id}`) || 'null'); } catch { /* skip */ }
    if (!sc || !Array.isArray(sc.steps)) continue;
    try {
      await http.put(`/api/admin/scenarios/${encodeURIComponent(sc.id || 'new')}`, { ...sc, migratedFrom: 'localStorage' });
      localStorage.removeItem(`scenario::${meta.id}`);
      moved++;
    } catch { return { moved, partial: true }; }   // 서버가 없으면 다음에
  }
  localStorage.removeItem(INDEX_KEY);
  localStorage.setItem(MIGRATED_KEY, String(Date.now()));
  return { moved };
}

/** 모든 시나리오 메타 (목록 화면용) */
export async function listScenarios() {
  await migrateLocalScenarios();
  const r = await http.get('/api/admin/scenarios');
  return r.data?.data || [];
}

/** 단건 조회 (없으면 null) */
export async function getScenario(id) {
  try { const r = await http.get(`/api/admin/scenarios/${encodeURIComponent(id)}`); return r.data?.data || null; }
  catch (e) { if (e?.response?.status === 404) return null; throw e; }
}

/** 저장 (신규 또는 갱신) — 서버가 id 를 발급한다 */
export async function saveScenario(scenario) {
  const r = await http.put(`/api/admin/scenarios/${encodeURIComponent(scenario.id || 'new')}`, scenario);
  return r.data?.data;
}

/** 삭제 */
export async function deleteScenario(id) {
  await http.delete(`/api/admin/scenarios/${encodeURIComponent(id)}`);
}

/** JSON 으로 export (백업/공유용) */
export async function exportScenarioJson(id) {
  const sc = await getScenario(id);
  if (!sc) return null;
  return JSON.stringify(sc, null, 2);
}

/** JSON 에서 import — 같은 id 가 있으면 새 id 로 (덮어쓰지 않는다) */
export async function importScenarioJson(json) {
  const obj = JSON.parse(json);
  if (!obj || !Array.isArray(obj.steps)) throw new Error('시나리오 형식이 아닙니다 (steps 배열이 필요)');
  const existing = obj.id ? await getScenario(obj.id) : null;
  const { id, ...rest } = obj;
  return saveScenario(existing ? { ...rest, name: `${rest.name || '시나리오'} (가져옴)` } : { ...rest, id });
}
