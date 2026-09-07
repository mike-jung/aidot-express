/**
 * useLoadState — 각 줄이 서버에 올라와 있는지 알려 주고, 안 올라온 것만 걸러 본다.
 *
 *  컨트롤러·서비스·SQL 세 화면이 같은 것을 필요로 하므로 한 곳에 모은다.
 *  서버의 /api/admin/workspace/files 는 셋을 같은 모양으로 준다:
 *    { controllers: [{name, loaded}], services: [...], sql: [...], unloaded: N }
 */
import { ref, reactive, computed } from 'vue';
import http from '../api/http';

export function useLoadState(kind) {
  const KEY = { controller: 'controllers', service: 'services', sql: 'sql' }[kind];
  const loadedNames = ref(new Set());
  const knownNames = ref(new Set());
  const unloadedCount = ref(0);
  const onlyUnloaded = ref(false);
  let retried = false;

  /** 서버에서 상태를 다시 읽는다 */
  async function refresh() {
    try {
      const r = await http.get('/api/admin/workspace/files');
      const list = r.data?.data?.[KEY] || [];
      loadedNames.value = new Set(list.filter((x) => x.loaded).map((x) => x.name));
      knownNames.value = new Set(list.map((x) => x.name));
      unloadedCount.value = list.filter((x) => !x.loaded).length;
    } catch (e) {
      /* ★ v1.31.0 — 401 은 **아직 토큰이 붙기 전**일 수 있다.
         로그인 직후 화면이 뜨자마자 부르면 그렇게 되고, 예전에는 조용히 빈 값으로 두어
         상태 배지도 필터 스위치도 나타나지 않았다(실측에서 발견).
         그 경우에는 잠깐 뒤 한 번 더 시도한다. 그래도 안 되면 조용히 넘어간다 —
         관리자가 아닐 수도 있고, 그때도 목록 자체는 보여야 한다. */
      if (e?.response?.status === 401 && !retried) {
        retried = true;
        await new Promise((r) => setTimeout(r, 600));
        return refresh();
      }
      knownNames.value = new Set();
      unloadedCount.value = 0;
    }
  }

  /** 이 줄이 올라와 있는가.
   *  ⚠ 목록에 없는 이름(빌트인 등 파일이 아닌 것)은 **올라온 것으로 본다** —
   *    상태를 모르는 것을 "안 올라옴" 으로 표시하면 겁을 주게 된다. */
  const isLoaded = (name) => !knownNames.value.has(name) || loadedNames.value.has(name);

  /** 화면에 그릴 줄만 남긴다 */
  const filterRows = (rows, nameOf = (r) => r.name ?? r.id) =>
    (onlyUnloaded.value ? rows.filter((r) => !isLoaded(nameOf(r))) : rows);

  const busy = ref(false);
  const lastError = ref('');
  const notice = ref('');                                   // 끝난 뒤 알려 줄 말
  const progress = reactive({ done: 0, total: 0, current: '' });   // 진행률

  /** ★ v1.30.0 — 안 올라온 것을 **이 종류만** 한꺼번에 올린다.
   *  하나씩 누르는 것도 남겨 둔다 — 여러 개 중 하나만 올리고 싶을 때가 있다.
   *  전부 올리기 API(/load)는 세 종류를 모두 건드리므로, 여기서는 이 화면의 것만 돈다. */
  async function loadAllOfKind() {
    busy.value = true; lastError.value = '';
    const failed = [];
    progress.done = 0; progress.total = 0; progress.current = '';
    try {
      const r = await http.get('/api/admin/workspace/files');
      const targets = (r.data?.data?.[KEY] || []).filter((x) => !x.loaded);
      progress.total = targets.length;
      for (const t of targets) {
        progress.current = t.name;
        try { await http.post('/api/admin/workspace/load-one', { kind, name: t.name }); }
        catch (e) { failed.push(`${t.name}: ${e?.response?.data?.message || e.message}`); }
        progress.done += 1;
      }
      await refresh();
      if (failed.length) lastError.value = failed.join(' · ');

      /* ★ v1.31.0 — 다 올리고 나면 "안 올라온 것만" 에는 남는 것이 없다.
         그대로 두면 **빈 화면**이 된다. 목록이 사라진 것으로 오해하기 쉽다.
         남은 것이 없으면 필터를 스스로 끄고, 그 사실을 말해 준다. */
      if (onlyUnloaded.value && unloadedCount.value === 0) {
        onlyUnloaded.value = false;
        notice.value = failed.length
          ? `${targets.length - failed.length}개를 올렸습니다. ${failed.length}개는 실패했습니다 — 전체 목록으로 돌아갑니다.`
          : `${targets.length}개를 모두 올렸습니다. 더 올릴 것이 없어 전체 목록으로 돌아갑니다.`;
      }
      return { total: targets.length, failed: failed.length };
    } catch (e) {
      lastError.value = e?.response?.data?.message || String(e.message || e);
      return { total: 0, failed: 0 };
    } finally { busy.value = false; progress.current = ''; }
  }

  const hasUnloaded = computed(() => unloadedCount.value > 0);

  return { refresh, isLoaded, filterRows, onlyUnloaded, unloadedCount, hasUnloaded,
           loadAllOfKind, busy, lastError, notice, progress };
}
