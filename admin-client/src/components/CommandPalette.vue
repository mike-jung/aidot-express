<script setup>
/**
 * CommandPalette — Ctrl/Cmd+K 로 열리는 화면·리소스 점프. (v1.7.8)
 *
 *  이 콘솔의 실사용 패턴은 `SQL → 서비스 → 컨트롤러 → API 테스트` 를 하루에 수십 번 오가는 것인데,
 *  이동 수단이 사이드바 클릭뿐이었다 (v1.7.6 검토: 전역 단축키 1개).
 *
 *  검색 대상
 *    · 메뉴 화면 — MainLayout 이 넘겨 주는 목록 (권한/플래그로 걸러진 것만)
 *    · 컨트롤러 / 서비스 / SQL 파일 — 열릴 때 한 번만 불러와 캐시
 *
 *  키보드: ↑↓ 이동 · Enter 이동 · Esc 닫기 · 그 외는 입력으로
 */
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();
import { useRouter } from 'vue-router';
import http from '../api/http';

const props = defineProps({
  open: { type: Boolean, default: false },
  /** [{ name, path, label, icon, group }] — MainLayout 이 이미 걸러 놓은 메뉴 */
  menu: { type: Array, default: () => [] },
});
const emit = defineEmits(['close']);

const router = useRouter();
const q = ref('');
const cursor = ref(0);
const inputRef = ref(null);
const loading = ref(false);
const loaded = ref(false);
const resources = ref([]);   // { kind, name, sub, to }

/** 리소스 목록은 팔레트를 처음 열 때 한 번만 가져온다 (실패해도 메뉴 검색은 동작) */
async function loadResources() {
  if (loaded.value || loading.value) return;
  loading.value = true;
  try {
    const [c, s, q1] = await Promise.allSettled([
      http.get('/api/admin/controllers/paged', { params: { page: 1, perPage: 200 } }),
      http.get('/api/admin/services/all'),
      http.get('/api/admin/sqls/all'),
    ]);
    const out = [];
    if (c.status === 'fulfilled') {
      for (const r of (c.value.data?.data || [])) {
        out.push({ kind: t('designer.cmd_controller'), name: r.name, sub: r.base_path || r.basePath || '',
          to: { name: 'controllers' } });
      }
    }
    if (s.status === 'fulfilled') {
      for (const r of (s.value.data?.data || [])) {
        out.push({ kind: t('designer.cmd_service'), name: r.name, sub: r.sql_file || r.sqlFile || '',
          to: { name: 'services' } });
      }
    }
    if (q1.status === 'fulfilled') {
      for (const r of (q1.value.data?.data || [])) {
        out.push({ kind: 'SQL', name: r.name, sub: r.table_name || r.tableName || '',
          to: { name: 'sqls' } });
      }
    }
    resources.value = out;
    loaded.value = true;
  } catch {
    /* 리소스를 못 불러와도 메뉴 이동은 계속 쓸 수 있어야 한다 */
  } finally {
    loading.value = false;
  }
}

/** 아주 단순한 부분일치 점수 — 앞에서 시작할수록, 짧을수록 위로 */
function score(text, needle) {
  const t = String(text || '').toLowerCase();
  const n = needle.toLowerCase();
  const i = t.indexOf(n);
  if (i < 0) return -1;
  return 1000 - i * 10 - t.length;
}

const items = computed(() => {
  const needle = q.value.trim();
  const menuItems = props.menu.map((m) => ({
    kind: t('designer.cmd_screen'), name: m.label, sub: m.path, icon: m.icon || 'bi-arrow-right-short', to: { name: m.name },
  }));
  const all = [...menuItems, ...resources.value.map((r) => ({ ...r, icon: iconFor(r.kind) }))];
  if (!needle) return menuItems.slice(0, 12);
  return all
    .map((it) => ({ it, s: Math.max(score(it.name, needle), score(it.sub, needle) - 200) }))
    .filter((x) => x.s > -1)
    .sort((a, b) => b.s - a.s)
    .slice(0, 30)
    .map((x) => x.it);
});

function iconFor(kind) {
  return { 컨트롤러: 'bi-diagram-3', 서비스: 'bi-gear', SQL: 'bi-database' }[kind] || 'bi-dot';
}

/** 그룹 헤더를 붙이기 위한 표시용 목록 */
const grouped = computed(() => {
  const out = []; let last = null;
  items.value.forEach((it, idx) => {
    if (it.kind !== last) { out.push({ header: it.kind }); last = it.kind; }
    out.push({ it, idx });
  });
  return out;
});

function go(it) {
  if (!it) return;
  emit('close');
  router.push(it.to).catch(() => {});
}

function onKeydown(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); cursor.value = Math.min(cursor.value + 1, items.value.length - 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); cursor.value = Math.max(cursor.value - 1, 0); }
  else if (e.key === 'Enter') { e.preventDefault(); go(items.value[cursor.value]); }
  else if (e.key === 'Escape') { e.preventDefault(); emit('close'); }
}

watch(() => props.open, async (v) => {
  if (!v) return;
  q.value = ''; cursor.value = 0;
  loadResources();
  await nextTick();
  inputRef.value?.focus();
});
watch(q, () => { cursor.value = 0; });
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="cmdk-backdrop" @mousedown.self="emit('close')">
      <div class="cmdk-panel" role="dialog" aria-modal="true" :aria-label="t('designer.cmd_quickJump')">
        <div class="cmdk-input-row">
          <i class="bi bi-search text-secondary"></i>
          <input ref="inputRef"
                 v-model="q"
                 class="cmdk-input"
                 type="text"
                 placeholder="화면 · 컨트롤러 · 서비스 · SQL 이름으로 이동"
                 autocomplete="off"
                 @keydown="onKeydown" />
          <span v-if="loading" class="spinner-border spinner-border-sm text-secondary"></span>
        </div>

        <div class="cmdk-list">
          <template v-if="items.length">
            <template v-for="(row, i) in grouped" :key="i">
              <div v-if="row.header" class="cmdk-group">{{ row.header }}</div>
              <button v-else
                      class="cmdk-item"
                      :class="{ active: row.idx === cursor }"
                      @click="go(row.it)"
                      @mouseenter="cursor = row.idx">
                <i class="bi" :class="row.it.icon"></i>
                <span class="text-truncate">{{ row.it.name }}</span>
                <span v-if="row.it.sub" class="cmdk-sub text-truncate">{{ row.it.sub }}</span>
              </button>
            </template>
          </template>
          <div v-else class="cmdk-empty">
            <i class="bi bi-search d-block fs-4 mb-2 opacity-50"></i>
            "{{ q }}" 와(과) 맞는 항목이 없습니다.
          </div>
        </div>

        <div class="cmdk-foot">
          <span><span class="cmdk-key">↑</span> <span class="cmdk-key">↓</span> 이동</span>
          <span><span class="cmdk-key">Enter</span> 열기</span>
          <span><span class="cmdk-key">Esc</span> 닫기</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
