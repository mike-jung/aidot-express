<script setup>
/**
 * TraceStepsDialog — 요청 하나가 **어떤 단계를 거쳤는지** 보여 준다 (v1.17.0)
 *
 *  집계 화면(경로별·컨트롤러별·사용자별)에서 줄 하나를 눌러 원본 기록을 보다가,
 *  “이 요청은 안에서 무슨 일이 있었지?” 로 이어질 수 있어야 한다.
 *  그 자리에서 컨트롤러 → 서비스 → SQL 의 실행 순서와 각 단계가 먹은 시간을 보여 준다.
 *
 *  ⚠ 대화상자 위의 대화상자
 *    이 컴포넌트는 **이미 열려 있는 대화상자 위에** 뜬다. 층이 어긋나면
 *    새 창이 뒤에 깔려 “눌러도 아무 일이 없는” 것처럼 보인다.
 *    그래서 z-index 를 한 곳에서 정한다:
 *      1080  집계 화면의 원본 기록 대화상자
 *      1100  이 단계 대화상자          ← 항상 위
 *    (부트스트랩 모달은 1055 이므로 그보다도 위다)
 */
import { ref, computed, watch, onMounted } from 'vue';
import http from '../api/http';
import { useI18n } from '../composables/useI18n';

const props = defineProps({
  requestId: { type: String, required: true },
});
defineEmits(['close']);

const { t } = useI18n();
const loading = ref(true);
const error = ref(null);
const data = ref(null);

async function load() {
  loading.value = true; error.value = null;
  try {
    const r = await http.get(`/api/admin/trace/${encodeURIComponent(props.requestId)}`);
    data.value = r.data?.data || null;
    if (!data.value) error.value = '이 요청의 추적 기록이 없습니다 (보관 기간이 지났을 수 있어요).';
  } catch (e) {
    error.value = e?.response?.data?.message || e.message;
  } finally { loading.value = false; }
}
onMounted(load);
watch(() => props.requestId, load);

/**
 * 단계 목록을 **호출 순서대로** 세운다.
 *
 *  ⚠ 서버가 주는 `at` 은 **그 단계가 끝난 시각**(요청 시작으로부터의 ms)이다.
 *    그래서 `at` 으로 줄을 세우면 안쪽에서 먼저 끝난 SQL 이 그것을 부른 서비스보다 앞에 온다
 *    (컨트롤러 → SQL → 서비스 처럼 보였다).
 *    시작 시각은 `at - ms` 로 구할 수 있으므로, **시작이 빠른 것 → 오래 걸린 것** 순으로 세우면
 *    실제 호출 순서(컨트롤러 → 서비스 → SQL)가 된다.
 *
 *  또한 바깥 단계의 구간이 안쪽 단계를 감싸므로, **감싸는 관계로 들여쓰기**를 만들어
 *  "누가 누구를 불렀는지" 가 눈에 보이게 한다.
 */
const bars = computed(() => {
  const d = data.value;
  const raw = d?.steps || [];
  if (!raw.length) return [];
  const total = Math.max(1, Number(d.durationMs) || 1);

  const mapped = raw.map((s, i) => {
    const ms = Number(s.ms) || 0;
    const end = Number(s.at) || 0;
    return { ...s, i, ms, end, start: Math.max(0, end - ms) };
  });

  /* 한 단계가 **들어갈 때와 끝날 때** 두 줄로 남는다 ("X" 와 "X 완료").
     두 줄로 보여 주면 같은 것이 두 번 있는 것처럼 보이고 순서도 헷갈린다.
     → 하나로 합친다. 시작 시각은 들어간 줄에서, 걸린 시간은 끝난 줄에서 가져온다. */
  const byName = new Map(mapped.map((s) => [`${s.kind}:${s.name}`, s]));
  const merged = [];
  const consumed = new Set();
  for (const s of mapped) {
    const m = /^(.*)\s+완료$/.exec(s.name || '');
    if (m) {
      const entry = byName.get(`${s.kind}:${m[1]}`);
      if (entry) {
        consumed.add(entry.i);
        merged.push({ ...s, name: m[1], start: entry.start, ms: Math.max(s.ms, s.end - entry.start) });
        continue;
      }
    }
    merged.push(s);
  }

  const items = merged.filter((s) => !consumed.has(s.i))
    /* 같은 시각에 시작했으면 **시간이 없는 표시(메모 등)를 먼저**, 그다음 오래 걸린 것부터.
       그래야 바깥(컨트롤러) → 안쪽(서비스 → SQL) 순서로 읽힌다. */
    .sort((a, b) => (a.start - b.start)
      /* ⚠ 기록 시각이 1ms 단위라, 빨리 끝나는 요청에서는 컨트롤러·서비스·SQL 이
         모두 같은 시각으로 찍힌다(start 가 전부 같다). 시간만으로는 순서를 가릴 수 없다.
         그래서 같은 시각일 때는 **부르는 쪽이 위로** 오도록 계층 순서를 보조 기준으로 쓴다:
         컨트롤러 → 서비스 → SQL/EAI → 메모. (시간이 갈리면 시간이 우선한다) */
      || (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9)
      || (b.ms - a.ms)
      || (a.i - b.i));

  /* 감싸는 관계로 깊이 계산 — 열린 것들을 쌓아 두고, 내 시작이 그 끝보다 늦으면 닫는다 */
  /* 들여쓰기도 계층으로 준다 — 시간이 같아 감싸는 관계를 잴 수 없기 때문이다.
     컨트롤러 0칸 · 서비스 1칸 · SQL 2칸. "누가 누구를 불렀는지" 가 눈에 보이게. */
  return items.map((s) => {
    const depth = Math.min(KIND_ORDER[s.kind] ?? 0, 3);
    return {
      ...s,
      depth,
      /* ★ v1.18.2 — 막대는 **전체 시간 대비 그 단계의 비율**이다.
         예전에는 시작 위치까지 반영한 폭포수였는데, 기록이 1ms 단위라
         시작 위치가 죄다 같거나 튀어서 막대가 들쭉날쭉해 보였다.
         비율만 보여 주면 "무엇이 오래 걸렸나" 가 바로 읽힌다.
         (언제 시작했는지는 막대에 마우스를 올리면 나온다) */
      left: 0,
      width: Math.max(1.5, Math.min(100, (s.ms / total) * 100)),
      pct: Math.round((s.ms / total) * 100),
    };
  });
});

/** 같은 시각일 때 읽는 순서 — 부르는 쪽이 위 */
const KIND_ORDER = { controller: 0, service: 1, sql: 2, mci: 2, error: 3, note: 8 };

const KIND_STYLE = {
  controller: { color: '#3b5bdb', icon: 'bi-diagram-3', label: '컨트롤러' },
  service: { color: '#6f42c1', icon: 'bi-gear', label: '서비스' },
  sql: { color: '#2f9e44', icon: 'bi-database', label: 'SQL' },
  mci: { color: '#f59f00', icon: 'bi-plug', label: 'EAI' },
  error: { color: '#e03131', icon: 'bi-exclamation-octagon', label: '오류' },
  note: { color: '#94a3b8', icon: 'bi-sticky', label: '메모' },
};
const styleOf = (k) => KIND_STYLE[String(k || '').toLowerCase()] || { color: '#94a3b8', icon: 'bi-dot', label: k || '단계' };
const fmtMs = (n) => (n == null ? '—' : `${Math.round(Number(n))}ms`);
</script>

<template>
  <div class="ts-backdrop" @mousedown.self="$emit('close')">
    <div class="ts-dialog">
      <div class="d-flex align-items-center gap-2 mb-2">
        <h6 class="mb-0"><i class="bi bi-diagram-3 me-2"></i>처리 과정</h6>
        <code class="small">{{ requestId }}</code>
        <button type="button" class="btn-close ms-auto" @click="$emit('close')"></button>
      </div>

      <div v-if="loading" class="text-secondary small py-4">
        <span class="spinner-border spinner-border-sm me-2"></span>불러오는 중…
      </div>
      <div v-else-if="error" class="alert alert-warning py-2 px-3 small mb-0">{{ error }}</div>

      <template v-else>
        <!-- 요약 -->
        <div class="d-flex flex-wrap gap-3 small mb-3 pb-2 border-bottom">
          <span><span class="badge text-bg-light border">{{ data.method }}</span>
                <code class="ms-1">{{ data.path }}</code></span>
          <span :class="data.status >= 400 ? 'text-danger fw-semibold' : 'text-success'">{{ data.status }}</span>
          <span class="text-secondary">전체 {{ fmtMs(data.durationMs) }}</span>
          <span v-if="data.username" class="text-secondary"><i class="bi bi-person me-1"></i>{{ data.username }}</span>
          <span class="text-secondary ms-auto">{{ String(data.ts || '').replace('T', ' ').slice(0, 19) }}</span>
        </div>

        <div v-if="!bars.length" class="text-secondary small py-3">
          단계 기록이 없습니다 — 이 요청은 컨트롤러 안에서 바로 끝났거나, 단계 기록이 꺼져 있었습니다.
        </div>

        <!-- 폭포수: 언제 시작해 얼마나 걸렸는지 -->
        <div v-else class="ts-body">
          <div v-for="(s, i) in bars" :key="i" class="ts-row" :class="{ 'ts-fail': s.ok === false }">
            <div class="ts-name" :style="{ paddingLeft: (s.depth * 14) + 'px' }">
              <i class="bi me-1" :class="styleOf(s.kind).icon" :style="{ color: styleOf(s.kind).color }"></i>
              <span class="ts-kind" :style="{ color: styleOf(s.kind).color }">{{ styleOf(s.kind).label }}</span>
              <span class="ts-label" :title="s.name">{{ s.name || '—' }}</span>
              <!-- ★ v1.18.2 — 예전에는 그냥 "3건" 이라 **SQL 이 3번 돌았나** 로 읽혔다.
                   이 값은 그 쿼리가 **가져온 행 수**다. 말을 바꾸고 설명도 붙인다. -->
              <span v-if="s.rows != null" class="ts-rows" :title="t('traceSteps.rowsHint')">
                {{ t('traceSteps.rows', { n: s.rows }) }}
              </span>
            </div>
            <div class="ts-track">
              <div class="ts-bar" :style="{ left: s.left + '%', width: s.width + '%', background: styleOf(s.kind).color }"
                   :title="`${fmtMs(s.ms)} · 전체의 ${s.pct}% · 시작 +${s.start}ms`"></div>
            </div>
            <!-- 걸린 시간. 시간이 없는 단계(표시용 메모 등)는 시작 지점만 알려 준다 -->
            <div class="ts-ms">
              <span v-if="s.ms > 0">{{ fmtMs(s.ms) }}</span>
              <span v-else class="ts-at">+{{ s.start }}ms</span>
            </div>
          </div>
        </div>

        <!-- 자세한 내용 (SQL 문 등)은 접어 둔다 — 필요할 때만 편다 -->
        <details v-if="bars.length" class="mt-3 small">
          <summary class="text-secondary">단계별 자세히 ({{ bars.length }})</summary>
          <div v-for="(s, i) in bars" :key="'d' + i" class="mt-2 p-2 rounded ts-detail">
            <div class="fw-semibold">
              <span :style="{ color: styleOf(s.kind).color }">{{ styleOf(s.kind).label }}</span>
              <span class="ms-2">{{ s.name }}</span>
              <span class="text-secondary ms-2">{{ s.ms > 0 ? fmtMs(s.ms) : '시작 +' + s.start + 'ms' }}</span>
              <span v-if="s.rows != null" class="text-secondary ms-2" :title="t('traceSteps.rowsHint')">{{ t('traceSteps.rows', { n: s.rows }) }}</span>
              <span v-if="s.ok === false" class="badge text-bg-danger ms-2">실패</span>
            </div>
            <pre v-if="s.detail" class="ts-pre mb-0">{{ s.detail }}</pre>
          </div>
        </details>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* 대화상자 위의 대화상자 — 층을 여기서 정한다 (원본 기록 1080 < 이 창 1100) */
.ts-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, .5); z-index: 1100;
  display: grid; place-items: center; padding: 24px; }
.ts-dialog { background: var(--bs-body-bg, #fff); border-radius: 12px; padding: 16px;
  width: min(920px, 100%); max-height: 82vh; overflow-y: auto;
  box-shadow: 0 24px 60px rgba(2, 6, 23, .35); }
.ts-body { display: flex; flex-direction: column; gap: 6px; }
.ts-row { display: grid; grid-template-columns: 260px 1fr 64px; align-items: center; gap: 10px; }
.ts-name { display: flex; align-items: center; gap: 4px; font-size: 12px; min-width: 0; }
.ts-kind { font-weight: 600; font-size: 11px; }
.ts-label { color: var(--bs-secondary-color, #6b7280); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ts-track { position: relative; height: 16px; background: #f1f3f5; border-radius: 4px; }
.ts-bar { position: absolute; top: 2px; height: 12px; border-radius: 3px; min-width: 3px; }
.ts-rows { font-size: 10.5px; color: #2f9e44; margin-left: 6px; }
.ts-at { opacity: .55; }
.ts-fail .ts-label { color: #d0323f; }
.ts-ms { font-size: 11.5px; text-align: right; font-variant-numeric: tabular-nums;
  color: var(--bs-secondary-color, #6b7280); }
.ts-detail { background: var(--bs-tertiary-bg, #f8f9fb); border: 1px solid var(--bs-border-color, #e6e9ee); }
.ts-pre { font-size: 11px; white-space: pre-wrap; margin-top: 4px; color: var(--bs-secondary-color, #556); }
</style>
