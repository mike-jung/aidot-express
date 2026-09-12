/**
 * widgetSfcTemplates — 생성된 프로젝트에 들어가는 widget SFC 파일들.
 *
 *  Phase 21 재작성:
 *   - 이전 버전은 각 widget 마다 커스텀 CSS (.stat-widget, .list-widget, ...) 를 20~30 줄씩 포함
 *     → Bootstrap/Metronic 의 card 디자인을 활용하지 않고 처음부터 스타일을 다시 그림
 *   - 이제 각 widget 이 Bootstrap `card` / `table` / `list-group` / `alert` / `spinner-border` /
 *     `badge` 같은 네이티브 class 를 활용. `text-muted / fw-bold / fs-7` 같은 utility 로 변형.
 *     Metronic 은 Bootstrap 기반이라 이 class 들을 모두 지원 + `card-title` 등을 자체 스타일로 강화.
 *     **커스텀 `<style>` 블록은 모두 제거** — 라이브러리 class 로 충분히 표현.
 *
 *  Widget 목록:
 *   - StatWidget     : 숫자/통계 카드 (아이콘 + 라벨 + 큰 숫자)
 *   - ListWidget     : 작은 table (header, rows, maxRows 로 잘라서 표시)
 *   - DetailWidget   : key-value 쌍 (dl/dt/dd 구조)
 *   - TextWidget     : 라벨 + 값
 *   - MarkdownWidget : 간단한 텍스트 블록
 *
 *  색상 매핑 (Bootstrap/Metronic 공통):
 *   - primary → text-primary
 *   - success → text-success
 *   - warning → text-warning
 *   - danger  → text-danger
 */

/**
 * ★ v1.40.0 — **선택된 언어의 문구를 코드 안에 박아** 내보낸다.
 *  내보낸 프로젝트는 이 콘솔과 무관하게 혼자 도므로 콘솔 사전을 쓸 수 없다.
 *  한국어로 만들면 `실시간`, English 로 만들면 `Live` 가 들어간 파일이 나온다.
 */
import { genStrings } from '../genStrings.js';

export function genWidgetSfcs(lang) {
  const S = genStrings(lang);
  return [
    { path: 'src/components/widgets/StatWidget.vue',     content: STAT_WIDGET,     source: 'widget' },
    { path: 'src/components/widgets/ListWidget.vue',     content: LIST_WIDGET(S),     source: 'widget' },
    { path: 'src/components/widgets/ListPagedWidget.vue', content: LIST_PAGED_WIDGET(S), source: 'widget' },
    { path: 'src/components/widgets/DetailWidget.vue',   content: DETAIL_WIDGET(S),   source: 'widget' },
    { path: 'src/components/widgets/TextWidget.vue',     content: TEXT_WIDGET(S),     source: 'widget' },
    { path: 'src/components/widgets/MarkdownWidget.vue', content: MARKDOWN_WIDGET, source: 'widget' },
    // Phase 33 (patch-12): QueryForm + FormDialog (Pattern A/B 용)
    { path: 'src/components/widgets/QueryFormWidget.vue',  content: QUERY_FORM_WIDGET(S),  source: 'widget' },
    { path: 'src/components/widgets/FormDialogWidget.vue', content: FORM_DIALOG_WIDGET(S), source: 'widget' },
  ];
}

/* ════════════════════════════ StatWidget ════════════════════════════ */

const STAT_WIDGET = `<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String], default: null },
  format: { type: String, default: 'number' },   // number | currency | percent | raw
  color: { type: String, default: 'primary' },   // primary | success | warning | danger
});

const displayValue = computed(() => {
  const v = props.value;
  if (v == null) return '—';
  switch (props.format) {
    case 'currency': return '₩' + Number(v).toLocaleString('ko-KR');
    case 'percent':  return (Number(v) * 100).toFixed(1) + '%';
    case 'number':   return Number(v).toLocaleString('ko-KR');
    case 'raw':
    default:         return String(v);
  }
});

const valueColorClass = computed(() => 'text-' + (props.color || 'primary'));
</script>

<template>
  <div class="card h-100">
    <div class="card-body">
      <div class="text-uppercase text-muted small fw-semibold mb-1">{{ label }}</div>
      <div class="fs-2 fw-bold" :class="valueColorClass">{{ displayValue }}</div>
    </div>
  </div>
</template>
`;

/* ════════════════════════════ ListWidget ════════════════════════════ */

const LIST_WIDGET = (S) => `<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: null },
  maxRows: { type: Number, default: 5 },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  // 실시간(SSE) 사용 여부 / 현재 연결 상태 — 화면 디자이너에서 [실시간 자동 갱신] 을 켜면 전달된다
  realtime: { type: Boolean, default: false },
  realtimeConnected: { type: Boolean, default: false },
  // ★ v1.9.0 — 화면 디자이너의 '눌렀을 때 → 화면 이동' 설정이 켜지면 true.
  //   꺼져 있으면 행에 아무 속성도 붙지 않아 예전과 똑같이 동작한다.
  rowClickable: { type: Boolean, default: false },
});
const emit = defineEmits(['row-click']);

const effectiveRows = computed(() => (props.rows || []).slice(0, Number(props.maxRows) || 5));
const effectiveColumns = computed(() => {
  if (props.columns && props.columns.length) return props.columns;
  const first = effectiveRows.value[0];
  if (!first || typeof first !== 'object') return [];
  return Object.keys(first)
    .filter((k) => typeof first[k] !== 'object')
    .slice(0, 6)
    .map((k) => ({ name: k, label: k }));
});

const formatCell = (value) => {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? '${S.yes}' : '${S.no}';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
};

const hiddenCount = computed(() => Math.max(0, (props.rows || []).length - effectiveRows.value.length));

/* 실시간으로 목록이 바뀌면 잠깐 표시해 준다 (사용자가 "방금 갱신됐다" 를 알 수 있게) */
const justUpdated = ref(false);
let flashTimer = null;
watch(() => props.rows, () => {
  if (!props.realtime) return;
  justUpdated.value = true;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { justUpdated.value = false; }, 1200);
}, { deep: false });
</script>

<template>
  <div class="card h-100">
    <div v-if="title || realtime" class="card-header d-flex align-items-center">
      <h3 class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
      <!-- 실시간 배지: 연결되면 초록, 끊기면 회색. 새 데이터가 오면 잠깐 "갱신됨" -->
      <span v-if="realtime" class="ms-auto d-inline-flex align-items-center small">
        <span class="rt-dot" :class="realtimeConnected ? 'on' : 'off'"></span>
        <span :class="realtimeConnected ? 'text-success' : 'text-muted'">
          {{ realtimeConnected ? '${S.live}' : '${S.disconnected}' }}
        </span>
        <span v-if="justUpdated" class="badge bg-primary ms-2">${S.refreshed}</span>
      </span>
    </div>
    <div class="card-body p-0">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>${S.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger m-3 mb-0">{{ error }}</div>
      <div v-else-if="!effectiveRows.length" class="text-center text-muted py-4">${S.noData}</div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="text-muted text-uppercase small">
            <tr>
              <th v-for="c in effectiveColumns" :key="c.name" class="fw-semibold">
                {{ c.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- ★ v1.9.0: 화면 디자이너에서 '눌렀을 때 → 화면 이동' 을 설정하면
                 rowClickable 이 켜지고 아래 핸들러가 붙는다.
                 ⚠ tabindex + keyup.enter — 클릭만 되면 키보드 사용자가 쓸 수 없다. -->
            <tr v-for="(row, i) in effectiveRows" :key="i"
                :class="{ 'rt-clickable': rowClickable }"
                :tabindex="rowClickable ? 0 : undefined"
                :role="rowClickable ? 'button' : undefined"
                @click="rowClickable && emit('row-click', row)"
                @keyup.enter="rowClickable && emit('row-click', row)">
              <td v-for="c in effectiveColumns" :key="c.name">{{ formatCell(row[c.name]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="hiddenCount > 0" class="text-muted small text-end px-3 py-2 border-top">
        +{{ hiddenCount }}${S.moreCount.replace("{n}", "")}
      </div>
    </div>
  </div>
</template>

<style scoped>
.rt-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 5px; }
/* ★ v1.9.0 — 누를 수 있다는 것이 보여야 누른다 */
.rt-clickable { cursor: pointer; }
.rt-clickable:focus-visible { outline: 2px solid var(--bs-primary, #0d6efd); outline-offset: -2px; }
.rt-dot.on { background: #12A150; }
.rt-dot.off { background: #9AA3BC; }
</style>
`;

/* ════════════════════════════ DetailWidget ════════════════════════════ */

const DETAIL_WIDGET = (S) => `<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  record: { type: Object, default: null },
  fields: { type: Array, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

const effectiveFields = computed(() => {
  if (props.fields && props.fields.length) return props.fields;
  if (!props.record || typeof props.record !== 'object') return [];
  return Object.keys(props.record)
    .filter((k) => typeof props.record[k] !== 'object' || props.record[k] == null)
    .slice(0, 10)
    .map((k) => ({ name: k, label: k }));
});

const formatCell = (value) => {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? '${S.yes}' : '${S.no}';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
};
</script>

<template>
  <div class="card h-100">
    <div v-if="title" class="card-header">
      <h3 class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
    </div>
    <div class="card-body">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>${S.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger mb-0">{{ error }}</div>
      <div v-else-if="!record" class="text-center text-muted py-4">${S.noSelection}</div>
      <dl v-else class="row mb-0 small">
        <template v-for="f in effectiveFields" :key="f.name">
          <dt class="col-sm-4 text-muted fw-normal">{{ f.label }}</dt>
          <dd class="col-sm-8 mb-2">{{ formatCell(record[f.name]) }}</dd>
        </template>
      </dl>
    </div>
  </div>
</template>
`;

/* ════════════════════════════ TextWidget ════════════════════════════ */

const TEXT_WIDGET = (S) => `<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [Number, String, Boolean], default: null },
  format: { type: String, default: 'auto' },
});

const display = computed(() => {
  const v = props.value;
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? '${S.yes}' : '${S.no}';
  if (props.format === 'number') return Number(v).toLocaleString('ko-KR');
  return String(v);
});
</script>

<template>
  <div class="card h-100">
    <div class="card-body">
      <div v-if="label" class="text-uppercase text-muted small mb-1">{{ label }}</div>
      <div class="fs-5 fw-semibold">{{ display }}</div>
    </div>
  </div>
</template>
`;

/* ════════════════════════════ MarkdownWidget ════════════════════════════ */

const MARKDOWN_WIDGET = `<script setup>
const props = defineProps({
  body: { type: String, default: '' },
});
</script>

<template>
  <div class="card h-100">
    <div class="card-body">
      <pre class="mb-0" style="white-space: pre-wrap; word-break: break-word;
                                font-family: inherit; font-size: 13px; line-height: 1.6;">{{ body }}</pre>
    </div>
  </div>
</template>
`;

/* ════════════════════════════ ListPagedWidget (Phase 33/patch-12) ════════════════════════════ */

const LIST_PAGED_WIDGET = (S) => `<script setup>
/**
 * ListPagedWidget — 페이지네이션 내장 목록 위젯.
 *   상위 컴포넌트가 store 의 rows / page / perPage / totalPages / total 을 전달.
 *   페이지 버튼 클릭 시 @change-page 이벤트를 emit 해서 상위가 store.fetchList 재호출.
 */
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: null },
  page: { type: Number, default: 1 },
  perPage: { type: Number, default: 10 },
  totalPages: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  defaultPerPage: { type: Number, default: 10 },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
});
const emit = defineEmits(['change-page']);

const effectiveColumns = computed(() => {
  if (props.columns && props.columns.length) return props.columns;
  const first = (props.rows || [])[0];
  if (!first || typeof first !== 'object') return [];
  return Object.keys(first)
    .filter((k) => typeof first[k] !== 'object')
    .slice(0, 6)
    .map((k) => ({ name: k, label: k }));
});

const pageWindow = computed(() => {
  const tp = Math.max(1, props.totalPages);
  const size = 10;
  let start = Math.max(1, props.page - Math.floor(size / 2));
  let end = start + size - 1;
  if (end > tp) { end = tp; start = Math.max(1, end - size + 1); }
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
});

const hasPrev = computed(() => props.page > 1);
const hasNext = computed(() => props.page < props.totalPages);

function go(p) {
  if (p < 1 || p > props.totalPages || p === props.page) return;
  emit('change-page', p);
}

const formatCell = (v) => {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? '${S.yes}' : '${S.no}';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
};
</script>

<template>
  <div class="card h-100">
    <div v-if="title" class="card-header d-flex align-items-center">
      <h3 class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
      <span v-if="total > 0" class="badge bg-secondary ms-2">${S.totalCount.replace("{n}", "")}{{ total }}</span>
      <span v-if="totalPages > 1" class="text-muted small ms-auto">{{ page }} / {{ totalPages }}</span>
    </div>
    <div class="card-body p-0">
      <div v-if="loading" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2"></div>${S.loading}
      </div>
      <div v-else-if="error" class="alert alert-danger m-3 mb-0">{{ error }}</div>
      <div v-else-if="!(rows || []).length" class="text-center text-muted py-4">${S.noData}</div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="text-muted text-uppercase small">
            <tr><th v-for="c in effectiveColumns" :key="c.name" class="fw-semibold">{{ c.label }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i">
              <td v-for="c in effectiveColumns" :key="c.name">{{ formatCell(row[c.name]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav v-if="totalPages > 1" class="d-flex gap-1 justify-content-center p-2 border-top">
        <button class="btn btn-sm btn-outline-secondary" :disabled="!hasPrev" @click="go(1)">«</button>
        <button class="btn btn-sm btn-outline-secondary" :disabled="!hasPrev" @click="go(page - 1)">‹</button>
        <button v-for="p in pageWindow" :key="p"
                class="btn btn-sm"
                :class="p === page ? 'btn-primary' : 'btn-outline-secondary'"
                @click="go(p)">{{ p }}</button>
        <button class="btn btn-sm btn-outline-secondary" :disabled="!hasNext" @click="go(page + 1)">›</button>
        <button class="btn btn-sm btn-outline-secondary" :disabled="!hasNext" @click="go(totalPages)">»</button>
      </nav>
    </div>
  </div>
</template>
`;

/* ════════════════════════════ QueryFormWidget (Phase 33/patch-12) ════════════════════════════ */

const QUERY_FORM_WIDGET = (S) => `<script setup>
/**
 * QueryFormWidget — 입력값을 입력받아 상위에 @submit 이벤트로 전달.
 *   사용자 코드에서 이 이벤트를 받아 store.fetchOne(params) 를 호출.
 */
import { ref, reactive } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  fields: { type: Array, default: () => [] },       // [{ name, label, type, required, default, placeholder }]
  submitLabel: { type: String, default: '${S.submitQuery}' },
  endpointHint: { type: String, default: '' },
});
const emit = defineEmits(['submit']);

const values = reactive({});
for (const f of (props.fields || [])) {
  values[f.name] = f.default != null ? f.default : '';
}
const localError = ref('');

function onSubmit() {
  localError.value = '';
  for (const f of (props.fields || [])) {
    if (f.required && (values[f.name] == null || values[f.name] === '')) {
      localError.value = f.label + '${S.valueRequired}';
      return;
    }
  }
  const out = {};
  for (const f of (props.fields || [])) {
    let v = values[f.name];
    if (v === '' || v == null) continue;
    if (f.type === 'number') v = Number(v);
    if (f.type === 'boolean') v = v === true || v === 'true';
    out[f.name] = v;
  }
  emit('submit', out);
}
</script>

<template>
  <div class="card h-100">
    <div v-if="title || endpointHint" class="card-header d-flex align-items-center flex-wrap gap-2">
      <h3 v-if="title" class="card-title fs-6 fw-bold mb-0">{{ title }}</h3>
      <code v-if="endpointHint" class="ms-auto text-muted small px-2 py-1 bg-light rounded">{{ endpointHint }}</code>
    </div>
    <div class="card-body">
      <div class="d-flex flex-wrap gap-2 align-items-end">
        <div v-for="f in (fields || [])" :key="f.name" class="d-flex flex-column" style="min-width: 120px; flex: 1;">
          <label class="form-label small mb-1">
            <code class="small px-1 bg-primary bg-opacity-10 text-primary rounded">{{ f.label }}</code>
            <span v-if="f.required" class="text-danger">*</span>
          </label>
          <input v-if="f.type === 'number'" type="number" class="form-control form-control-sm"
                 v-model.number="values[f.name]" :placeholder="f.placeholder || ''"
                 @keyup.enter="onSubmit" />
          <select v-else-if="f.type === 'boolean'" class="form-select form-select-sm" v-model="values[f.name]">
            <option :value="true">true</option>
            <option :value="false">false</option>
          </select>
          <input v-else type="text" class="form-control form-control-sm"
                 v-model="values[f.name]" :placeholder="f.placeholder || ''"
                 @keyup.enter="onSubmit" />
        </div>
        <button class="btn btn-primary btn-sm" style="min-width: 72px;" @click="onSubmit">{{ submitLabel }}</button>
      </div>
      <div v-if="localError" class="alert alert-warning py-1 px-2 mt-2 mb-0 small">{{ localError }}</div>
    </div>
  </div>
</template>
`;

/* ════════════════════════════ FormDialogWidget (Phase 33/patch-12) ════════════════════════════ */

const FORM_DIALOG_WIDGET = (S) => `<script setup>
/**
 * FormDialogWidget — 버튼 + 모달 + 폼.
 *   [버튼] 클릭 → 모달 열림 → 사용자 입력 → [제출] → @submit(params) 이벤트.
 *   상위 코드에서 store.submitForm(method, params) 호출하고, 성공 시 @success 이벤트로 refresh 유도.
 */
import { ref, reactive } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  buttonLabel: { type: String, default: '${S.submitRun}' },
  buttonVariant: { type: String, default: 'primary' },
  dialogTitle: { type: String, default: '' },
  fields: { type: Array, default: () => [] },
  confirmBeforeSubmit: { type: Boolean, default: false },
  method: { type: String, default: 'POST' },
});
const emit = defineEmits(['submit', 'success']);

const open = ref(false);
const values = reactive({});
const submitting = ref(false);
const error = ref('');
const success = ref('');

function reset() {
  for (const f of (props.fields || [])) {
    values[f.name] = f.default != null ? f.default : '';
  }
  error.value = '';
  success.value = '';
}
function openDialog() { reset(); open.value = true; }
function closeDialog() { open.value = false; }

async function doSubmit() {
  error.value = '';
  for (const f of (props.fields || [])) {
    if (f.required && (values[f.name] == null || values[f.name] === '')) {
      error.value = f.label + '${S.valueRequired}';
      return;
    }
  }
  if (props.confirmBeforeSubmit && !confirm('${S.confirmProceed}')) return;
  submitting.value = true;
  try {
    const out = {};
    for (const f of (props.fields || [])) {
      let v = values[f.name];
      if (v === '' || v == null) continue;
      if (f.type === 'number') v = Number(v);
      if (f.type === 'boolean') v = v === true || v === 'true';
      out[f.name] = v;
    }
    // 상위가 store.submitForm 을 호출 — await 가능하도록 Promise 반환 계약.
    await Promise.resolve(emit('submit', out));
    success.value = '${S.done}';
    emit('success');
    setTimeout(() => { open.value = false; }, 600);
  } catch (e) {
    error.value = e?.message || String(e);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="d-inline-block">
    <button :class="'btn btn-' + (buttonVariant || 'primary')" @click="openDialog">{{ buttonLabel }}</button>
    <div v-if="open"
         class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
         style="background: rgba(15, 23, 42, 0.45); z-index: 2000;"
         @click.self="closeDialog">
      <div class="card" style="width: 100%; max-width: 480px;">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">{{ dialogTitle || buttonLabel }}</h5>
          <button class="btn-close" @click="closeDialog"></button>
        </div>
        <div class="card-body">
          <div v-for="f in (fields || [])" :key="f.name" class="mb-2">
            <label class="form-label small mb-1">
              {{ f.label }} <span v-if="f.required" class="text-danger">*</span>
            </label>
            <input v-if="f.type === 'number'" type="number" class="form-control form-control-sm"
                   v-model.number="values[f.name]" :placeholder="f.placeholder || ''" />
            <select v-else-if="f.type === 'boolean'" class="form-select form-select-sm" v-model="values[f.name]">
              <option :value="true">true</option>
              <option :value="false">false</option>
            </select>
            <textarea v-else-if="f.type === 'text'" class="form-control form-control-sm" rows="3"
                      v-model="values[f.name]" :placeholder="f.placeholder || ''"></textarea>
            <input v-else type="text" class="form-control form-control-sm"
                   v-model="values[f.name]" :placeholder="f.placeholder || ''" />
          </div>
          <div v-if="error" class="alert alert-danger py-1 px-2 mt-2 mb-0 small">{{ error }}</div>
          <div v-if="success" class="alert alert-success py-1 px-2 mt-2 mb-0 small">{{ success }}</div>
        </div>
        <div class="card-footer d-flex justify-content-end gap-2">
          <button class="btn btn-sm btn-outline-secondary" @click="closeDialog" :disabled="submitting">${S.cancel}</button>
          <button :class="'btn btn-sm btn-' + (buttonVariant || 'primary')"
                  @click="doSubmit" :disabled="submitting">
            <span v-if="submitting">…</span>
            <span v-else>{{ buttonLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
`;
