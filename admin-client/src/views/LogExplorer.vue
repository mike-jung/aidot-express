<script setup>
/**
 * LogExplorer — 콘솔에서 로그를 자르는 화면. (v1.9.5)
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  설계 — 대표 질의는 버튼 한 번으로 끝나야 한다
 * ══════════════════════════════════════════════════════════════════════════
 *  CLI 는 "낱말을 나열한다" 로 문법을 없앴다. 화면에서는 그보다 더 나아갈 수 있다 —
 *  **자주 하는 질의는 아예 버튼으로 만든다.** 입력은 그다음이다.
 *
 *  ① 첫 화면에 **빠른 질의 버튼**이 있다. 누르면 바로 결과가 나온다.
 *  ② 거를 수 있는 값은 **지금 로그에 실제로 있는 것만** 개수와 함께 보여 준다.
 *     (`/logs/facets`) 필드 이름을 외우게 하지 않는다 — 발견이 암기를 이긴다.
 *  ③ 어떤 줄이든 눌러 **그 시각 앞뒤**를 편다. 조사는 거의 항상 그렇게 시작한다.
 *  ④ 같은 결과를 내는 **CLI 명령을 함께 보여 준다.** 서버에 ssh 로 붙어야 하는
 *     상황이 오면 그대로 쓸 수 있다 — 화면이 사용자를 가두지 않는다.
 *
 *  서버는 CLI 와 **같은 규칙**을 쓴다(LogsService.queryLogs). 규칙이 갈리면
 *  같은 조건인데 화면과 터미널의 결과가 달라져 어느 쪽을 믿을지 알 수 없게 된다.
 */
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
// ★ v1.10.5 — 다국어
import { useI18n } from '../composables/useI18n';

import http from '../api/http';
import { notifyError } from '../composables/useNotify';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();


/* ★ v1.11.3 — [요청 추적]에서 "이 요청의 로그 보기" 로 넘어오면 ?requestId= 가 붙는다.
   예전에는 route.query 를 아예 읽지 않아 링크를 눌러도 조건 없는 첫 화면이 열렸다. */
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const rows = ref([]);
const total = ref(0);
const scanned = ref(0);
const partial = ref(false);      // 읽기 상한 안에서만 찾은 결과인가
const note = ref('');            // 서버가 붙여 준 설명
const facets = ref({ kinds: [], levels: [], requests: [], total: 0, files: 0 });

/* 조건 */
const sel = ref({ kinds: [], levels: [], requestId: null, q: '', slowerThan: null,
  around: null, windowMs: 5000, sinceMs: null });

/** 자주 하는 질의 — 누르면 바로 결과가 나온다 */
/* ★ v1.10.5 — computed 로 감싼다. 그냥 배열이면 t() 가 **한 번만** 평가되어
   언어를 바꿔도 문구가 그대로 남는다 (메뉴에서 이미 겪었다). */
const QUICK = computed(() => ([
  { key: 'errors', label: t('logs.quickErrors'), icon: 'bi-x-octagon', tone: 'danger',
    apply: () => ({ levels: ['ERROR'] }) },
  { key: 'slow', label: t('logs.quickSlow'), icon: 'bi-hourglass-split', tone: 'warning',
    hint: '500ms↑', apply: () => ({ slowerThan: 500 }) },
  { key: 'sql', label: t('logs.quickSql'), icon: 'bi-database', tone: 'success',
    apply: () => ({ kinds: ['sql'] }) },
  { key: 'slowsql', label: t('logs.quickSlowSql'), icon: 'bi-database-exclamation', tone: 'success',
    apply: () => ({ kinds: ['sql'], slowerThan: 500 }) },
  { key: 'http', label: t('logs.quickHttp'), icon: 'bi-globe', tone: 'info',
    apply: () => ({ kinds: ['http'] }) },
  { key: 'auth', label: t('logs.quickAuth'), icon: 'bi-shield-lock', tone: 'secondary',
    apply: () => ({ kinds: ['auth'] }) },
  { key: 'recent', label: t('logs.quickRecent'), icon: 'bi-clock-history', tone: 'primary',
    apply: () => ({ sinceMs: 3600_000 }) },
]));
const activeQuick = ref('');

function runQuick(q) {
  activeQuick.value = q.key;
  sel.value = { kinds: [], levels: [], requestId: null, q: '', slowerThan: null,
    around: null, windowMs: 5000, sinceMs: null, ...q.apply() };
  search();
}

function toggle(field, value) {
  activeQuick.value = '';
  const list = sel.value[field];
  const i = list.indexOf(value);
  if (i >= 0) list.splice(i, 1); else list.push(value);
  search();
}

function clearAll() {
  activeQuick.value = '';
  sel.value = { kinds: [], levels: [], requestId: null, q: '', slowerThan: null,
    around: null, windowMs: 5000, sinceMs: null };
  search();
}

/** 어떤 줄이든 눌러 그 시각 앞뒤를 편다 — 조사는 거의 항상 그렇게 시작한다 */
function openAround(row) {
  activeQuick.value = '';
  sel.value = { kinds: [], levels: [], requestId: null, q: '', slowerThan: null,
    around: row.at, windowMs: sel.value.windowMs || 5000, sinceMs: null };
  search();
}

function openRequest(id) {
  if (!id) return;
  activeQuick.value = '';
  sel.value = { ...sel.value, requestId: id, around: null, kinds: [], levels: [] };
  search();
}
/** ★ v1.11.3 — 로그 줄의 요청 ID 에서 [요청 추적] 상세로 (양방향 연결) */
function openTrace(id) {
  if (!id) return;
  router.push({ name: 'trace', query: { id } });
}

async function search() {
  loading.value = true;
  try {
    const s = sel.value;
    const params = { limit: 300 };
    if (s.kinds.length) params.kinds = s.kinds.join(',');
    if (s.levels.length) params.levels = s.levels.join(',');
    if (s.requestId) params.requestId = s.requestId;
    if (s.q) params.q = s.q;
    if (s.slowerThan != null) params.slowerThan = s.slowerThan;
    if (s.around) { params.around = s.around; params.windowMs = s.windowMs; }
    if (s.sinceMs) params.sinceMs = s.sinceMs;

    const r = await http.get('/api/admin/logs/query', { params });
    const d = r.data?.data || {};
    rows.value = d.rows || [];
    total.value = d.total || 0;
    scanned.value = d.scanned || 0;
    partial.value = !!d.partial;
    note.value = d.note || '';
  } catch (e) {
    notifyError('로그 조회 실패', e);
  } finally {
    loading.value = false;
  }
}

const EMPTY_FACETS = { kinds: [], levels: [], requests: [], total: 0, files: 0 };

async function loadFacets() {
  try {
    const d = (await http.get('/api/admin/logs/facets')).data?.data;
    /* ⚠ 서버가 일부 필드만 주거나 옛 판이면 undefined 가 섞인다.
       `facets.total.toLocaleString()` 한 번에 화면이 통째로 깨진다 —
       실제로 렌더 검사에서 이걸 잡았다. 항상 온전한 모양으로 맞춘다. */
    facets.value = { ...EMPTY_FACETS, ...(d || {}) };
    for (const k of ['kinds', 'levels', 'requests']) {
      if (!Array.isArray(facets.value[k])) facets.value[k] = [];
    }
    facets.value.total = Number(facets.value.total) || 0;
    facets.value.files = Number(facets.value.files) || 0;
  } catch {
    facets.value = { ...EMPTY_FACETS };   // 없어도 화면은 떠야 한다
  }
}

/** 같은 결과를 내는 CLI 명령 — 서버에 ssh 로 붙어야 할 때 그대로 쓴다 */
const cliCommand = computed(() => {
  const s = sel.value;
  const w = [];
  for (const k of s.kinds) w.push(k);
  for (const l of s.levels) w.push(l.toLowerCase());
  if (s.requestId) w.push(s.requestId);
  if (s.slowerThan === 500) w.push('slow');
  const flags = [];
  if (s.slowerThan != null && s.slowerThan !== 500) flags.push(`--slower-than ${s.slowerThan}`);
  if (s.around) {
    const t = new Date(s.around);
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    const ss = String(t.getSeconds()).padStart(2, '0');
    flags.push(`--around ${hh}:${mm}:${ss}`, `--window ${s.windowMs}ms`);
  }
  if (s.sinceMs) flags.push(`--since ${Math.round(s.sinceMs / 3600_000)}h`);
  if (s.q) flags.push(`-g "${s.q}"`);
  if (!w.length && !flags.length) return 'npm run logs';
  return `npm run logs${w.length ? ' ' + w.join(' ') : ''}${flags.length ? ' -- ' + flags.join(' ') : ''}`;
});

const copyCli = () => navigator.clipboard?.writeText(cliCommand.value);

const KIND_TONE = { sql: 'success', http: 'info', auth: 'primary', migration: 'warning',
  boot: 'secondary', admin: 'secondary', app: 'dark' };
const lvTone = (l) => (l === 'ERROR' ? 'danger' : l === 'WARN' ? 'warning' : l === 'DEBUG' ? 'secondary' : 'info');
const shortTs = (ts) => String(ts || '').slice(11);
const hasFilter = computed(() => {
  const s = sel.value;
  return !!(s.kinds.length || s.levels.length || s.requestId || s.q || s.slowerThan != null
    || s.around || s.sinceMs);
});

onMounted(async () => {
  // 다른 화면에서 넘어온 조건 — ?requestId= (요청 추적) · ?q= (본문 검색)
  const rq = route.query.requestId ? String(route.query.requestId) : '';
  const q0 = route.query.q ? String(route.query.q) : '';
  if (rq) sel.value = { ...sel.value, requestId: rq };
  else if (q0) sel.value = { ...sel.value, q: q0 };
  await loadFacets();
  await search();
});
</script>

<template>
  <div>
    <!-- ① 빠른 질의 — 누르면 바로 결과 -->
    <div class="card mb-3">
      <div class="card-body py-3">
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <button v-for="q in QUICK" :key="q.key"
                  class="btn btn-sm"
                  :class="activeQuick === q.key ? `btn-${q.tone}` : `btn-outline-${q.tone}`"
                  @click="runQuick(q)">
            <i class="bi me-1" :class="q.icon"></i>{{ q.label }}
            <span v-if="q.hint" class="opacity-75 ms-1" style="font-size:.72rem">{{ q.hint }}</span>
          </button>

          <div class="ms-auto d-flex gap-2 align-items-center">
            <div class="input-group input-group-sm" style="width:230px">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input v-model="sel.q" class="form-control" :placeholder="t('logExplorer.k2')"
                     @keyup.enter="activeQuick=''; search()" />
            </div>
            <button class="btn btn-sm btn-outline-secondary" :disabled="!hasFilter" @click="clearAll">
              <i class="bi bi-x-lg me-1"></i>{{ t('logs.clearFilters') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <!-- ② 거를 수 있는 값 — 지금 로그에 실제로 있는 것만 -->
      <div class="col-12 col-lg-3">
        <div class="card">
          <div class="card-header py-2">
            <i class="bi bi-funnel me-1"></i>{{ t('logs.filters') }}
            <small class="text-secondary ms-1">{{ t('logs3.nLines', { n: (facets.total || 0).toLocaleString() }) }} · {{ t('logs3.nFiles', { n: facets.files }) }}<span v-if="facets.sampled" :title="t('logs.sampledHint')"> · {{ t('logs.sampled') }}</span></small>
          </div>
          <div class="card-body py-2">
            <div v-if="!facets.kinds.length" class="text-secondary small py-2">
              {{ t('logs.empty') }}
            </div>

            <template v-else>
              <div class="facet-title">{{ t('logs.kinds') }}</div>
              <button v-for="k in facets.kinds" :key="k.value"
                      class="facet-row" :class="{ on: sel.kinds.includes(k.value) }"
                      @click="toggle('kinds', k.value)">
                <span class="badge" :class="`bg-${KIND_TONE[k.value] || 'secondary'}`">{{ k.value }}</span>
                <span class="cnt">{{ (k.count || 0).toLocaleString() }}</span>
              </button>

              <div class="facet-title mt-3">{{ t('logs.levels') }}</div>
              <button v-for="l in facets.levels" :key="l.value"
                      class="facet-row" :class="{ on: sel.levels.includes(l.value) }"
                      @click="toggle('levels', l.value)">
                <span class="badge" :class="`bg-${lvTone(l.value)}`">{{ l.value }}</span>
                <span class="cnt">{{ (l.count || 0).toLocaleString() }}</span>
              </button>

              <div class="facet-title mt-3">{{ t('logExplorer.k1') }} <small class="text-secondary">{{ t('logs.byCount') }}</small></div>
              <button v-for="r in facets.requests.slice(0, 8)" :key="r.value"
                      class="facet-row" :class="{ on: sel.requestId === r.value }"
                      @click="openRequest(r.value)">
                <code class="small">{{ r.value }}</code>
                <span class="cnt">{{ r.count }}</span>
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- 결과 -->
      <div class="col-12 col-lg-9">
        <div class="card">
          <div class="card-header py-2 d-flex align-items-center flex-wrap gap-2">
            <i class="bi bi-list-ul me-1"></i>
            <span>{{ t('logs3.nLines', { n: (total || 0).toLocaleString() }) }}</span>
            <small v-if="rows.length < total" class="text-secondary">{{ t('logs3.lastNShown', { n: rows.length }) }}</small>
            <span v-if="partial" class="badge bg-warning text-dark ms-1" :title="note">{{ t('logs.partial') }}</span>

            <!-- 시간 창 조작 — around 상태일 때만 -->
            <template v-if="sel.around">
              <span class="badge bg-primary ms-2">
                <i class="bi bi-clock me-1"></i>{{ shortTs(rows[0]?.ts) }} 앞뒤
              </span>
              <div class="btn-group btn-group-sm">
                <button v-for="w in [1000, 5000, 30000]" :key="w"
                        class="btn" :class="sel.windowMs === w ? 'btn-primary' : 'btn-outline-secondary'"
                        @click="sel.windowMs = w; search()">
                  {{ w >= 1000 ? (w / 1000) + t('logExplorer.k6') : w + 'ms' }}
                </button>
              </div>
            </template>

            <!-- ④ 같은 결과를 내는 CLI — 화면이 사용자를 가두지 않는다 -->
            <div class="ms-auto d-flex align-items-center gap-1">
              <code class="cli">{{ cliCommand }}</code>
              <button class="btn btn-sm btn-link p-0" :title="t('logExplorer.k3')" @click="copyCli">
                <i class="bi bi-clipboard"></i>
              </button>
            </div>
          </div>

          <div class="log-body">
            <div v-if="loading" class="text-center text-secondary py-5">
              <span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}
            </div>
            <div v-else-if="!rows.length" class="text-center text-secondary py-5">
              <template v-if="sel.requestId">
                {{ t('logs.noLinesForRequest', { id: sel.requestId }) }}
                <div class="small mt-1">{{ t('logs.noLinesForRequestHint') }}</div>
              </template>
              <template v-else>
                {{ t('logs.noMatch') }}
                <div class="small mt-1">{{ t('logs.noMatchHint') }}</div>
              </template>
            </div>

            <div v-else>
              <div v-for="(r, i) in rows" :key="i" class="log-line"
                   :class="{ err: r.level === 'ERROR' }">
                <button class="ts" :title="t('logExplorer.k4')" @click="openAround(r)">{{ shortTs(r.ts) }}</button>
                <span class="badge lv" :class="`bg-${lvTone(r.level)}`">{{ r.level }}</span>
                <span class="badge kd" :class="`bg-${KIND_TONE[r.kind] || 'secondary'}`">{{ r.kind }}</span>
                <button v-if="r.requestId" class="rq" :title="t('logExplorer.k5')"
                        @click="openRequest(r.requestId)">{{ r.requestId }}</button>
                <span v-else class="rq empty">—</span>
                <button v-if="r.requestId" class="tr" :title="t('logs.openTrace')" @click="openTrace(r.requestId)">
                  <i class="bi bi-diagram-3"></i>
                </button>
                <span class="msg">{{ r.rest }}</span>
                <span v-if="r.ms != null" class="ms" :class="{ slow: r.ms >= 500 }">{{ r.ms }}ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.facet-title { font-size: .7rem; font-weight: 700; color: var(--ax-text-muted, #6b7280);
  text-transform: uppercase; letter-spacing: .03em; margin-bottom: 4px; }
.facet-row {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 4px 6px; margin-bottom: 2px; border: 1px solid transparent; border-radius: 6px;
  background: transparent; cursor: pointer; text-align: left;
}
.facet-row:hover { background: var(--ax-hover, #f1f5f9); }
.facet-row.on { border-color: var(--primary-color, #1b84ff);
  background: color-mix(in srgb, var(--primary-color, #1b84ff) 8%, transparent); }
.facet-row .cnt { margin-left: auto; font-size: .72rem; color: var(--ax-text-muted, #6b7280);
  font-variant-numeric: tabular-nums; }

.log-body { max-height: 620px; overflow: auto; }
.log-line {
  display: flex; align-items: baseline; gap: 7px; padding: 3px 10px;
  font-family: var(--ax-font-mono, monospace); font-size: .76rem;
  border-bottom: 1px solid var(--ax-grid-line, #f1f3f6); white-space: nowrap;
}
.log-line:hover { background: var(--ax-hover, #f8fafc); }
.log-line.err { background: color-mix(in srgb, #dc3545 5%, transparent); }
.log-line .ts { border: 0; background: none; padding: 0; cursor: pointer;
  color: var(--ax-text-muted, #6b7280); font: inherit; flex-shrink: 0; }
.log-line .ts:hover { color: var(--primary-color, #1b84ff); text-decoration: underline; }
.log-line .lv, .log-line .kd { font-size: .62rem; flex-shrink: 0; }
.log-line .rq { border: 0; background: none; padding: 0; cursor: pointer;
  color: #8b5cf6; font: inherit; flex-shrink: 0; }
.log-line .rq:hover { text-decoration: underline; }
.log-line .rq.empty { color: var(--ax-border, #c8cdd6); cursor: default; }
.log-line .msg { overflow: hidden; text-overflow: ellipsis; flex: 1; }
.log-line .ms { margin-left: auto; flex-shrink: 0; color: var(--ax-text-muted, #6b7280);
  font-variant-numeric: tabular-nums; }
.log-line .ms.slow { color: #dc3545; font-weight: 600; }

.cli { font-size: .7rem; color: var(--ax-text-muted, #6b7280);
  background: var(--ax-grid-line, #f1f3f6); padding: 2px 7px; border-radius: 5px;
  max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log-line .tr { border: 0; background: transparent; color: #6c757d; padding: 0 2px; font-size: .8rem; }
.log-line .tr:hover { color: #0d6efd; }
</style>
