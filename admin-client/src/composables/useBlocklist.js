/**
 * useBlocklist — 컨트롤러·서비스·SQL 을 막고 푸는 공용 로직 (v1.13.0)
 *
 *  "구멍이 뚫린 컨트롤러를 지금 내려야 하는데 서버 전체를 내릴 수는 없다."
 *  삭제는 되돌릴 수 없어서 급할 때 쓰기 무섭다. 그래서 **끄기** 를 따로 둔다.
 *  막으면 ① 지금 라우트가 사라지고 ② 서버를 다시 켜도 그 파일을 읽지 않는다.
 */
import { ref } from 'vue';
import http from '../api/http';

const blocked = ref({ controllers: [], services: [], sqls: [] });
const loaded = ref(false);

async function refresh() {
  try {
    const r = await http.get('/api/admin/blocklist');
    const d = r.data?.data || {};
    blocked.value = { controllers: d.controllers || [], services: d.services || [], sqls: d.sqls || [] };
    loaded.value = true;
  } catch { /* 조회 실패는 조용히 — 목록 자체는 보여야 한다 */ }
}

export function useBlocklist(kind) {
  const isBlocked = (name) => (blocked.value[kind] || []).some((e) => e.name === name);
  const infoOf = (name) => (blocked.value[kind] || []).find((e) => e.name === name) || null;

  async function block(name, reason) {
    await http.post(`/api/admin/blocklist/${kind}/${encodeURIComponent(name)}`, { reason });
    await refresh();
  }
  async function unblock(name) {
    await http.delete(`/api/admin/blocklist/${kind}/${encodeURIComponent(name)}`);
    await refresh();
  }
  return { blocked, loaded, refresh, isBlocked, infoOf, block, unblock };
}

export default useBlocklist;
