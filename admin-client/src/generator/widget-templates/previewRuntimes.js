/**
 * Widget runtime code for the preview iframe (Phase 8 enhanced).
 *
 *  기존 대비 변경:
 *   - ListWidget / DetailWidget / StatWidget / TextWidget 이 props.endpoint 를 받으면
 *     실제 fetch 로 서버 데이터를 가져옴 (mock 아님).
 *   - ListWidget 에 pagination 통합.
 *   - object/null cell 안전한 포맷.
 *   - primary 가 object 일 때 '[object Object]' 방지 (summary 표시).
 *
 *  endpoint prop 은 { method, path, resultKey } 형태.
 *  fetch 는 same-origin cookie 로 인증 (admin-client 와 동일 세션).
 */

export const WIDGET_PREVIEW_CODE = `
// ============================ 공용 유틸 ============================

// envelope 벗김: { code, message, data } → data
function unwrapEnvelope(body) {
  if (body && typeof body === 'object' && 'code' in body && 'data' in body) return body.data;
  return body;
}

// resultKey 적용 — 우선순위: 명시된 resultKey > rows > data > items > 배열 자체
function resolveRows(data, resultKey) {
  if (data == null) return { rows: [], total: 0, page: 1, perPage: 20, totalPages: 1 };
  if (resultKey && typeof data === 'object' && Array.isArray(data[resultKey])) {
    return pack(data, data[resultKey]);
  }
  if (Array.isArray(data)) return pack(null, data);
  if (Array.isArray(data.rows)) return pack(data, data.rows);
  if (Array.isArray(data.data)) return pack(data, data.data);
  if (Array.isArray(data.items)) return pack(data, data.items);
  return pack(data, []);
}
function pack(meta, rows) {
  return {
    rows,
    total: (meta && meta.total) || rows.length,
    page: (meta && meta.page) || 1,
    perPage: (meta && meta.perPage) || rows.length || 20,
    totalPages: (meta && meta.totalPages) || 1,
  };
}

// 셀 포매터: object/array/date/boolean/null 안전하게
function formatCell(value) {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? '✓' : '—';
  if (value instanceof Date) return value.toLocaleString('ko-KR');
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return '[object]'; }
  }
  if (typeof value === 'string' && /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}/.test(value)) {
    // ISO timestamp
    return value.slice(0, 19).replace('T', ' ');
  }
  return String(value);
}

// fetch helper — same-origin cookie, envelope unwrap 포함.
//
// Phase 31 (patch-10): row-level 입력 파라미터 지원.
//  path 에 '{paramName}' 템플릿이 있으면 rowContext.params 에서 값을 꺼내 치환.
//  값이 없는 placeholder 가 하나라도 남아있으면 fetch 를 건너뛰고 INPUT_PENDING 신호를 던짐.
//  ':param' 형식 (기존) 은 하위 호환으로 계속 지원 (queryParams 에서만 꺼냄).
const INPUT_PENDING = Symbol('awaiting-input');
/* ★ v1.11.7 — 화면 이동으로 넘어온 파라미터. 전체 앱 미리보기에서 목록의 행을 누르면
   { id: 3 } 처럼 채워지고 version 이 오른다. 위젯은 이것을 지켜보다 다시 읽는다.
   (예전에는 넘어온 값을 보관만 하고 아무 위젯도 쓰지 않아 상세 화면이 비어 있었다) */
const __previewNav = reactive({ params: {}, version: 0 });
window.__previewNav = __previewNav;
function resolveParam(name, rowContext, queryParams) {
  const fromRow = rowContext && rowContext.params ? rowContext.params[name] : null;
  if (fromRow != null && fromRow !== '') return fromRow;
  const fromNav = __previewNav.params ? __previewNav.params[name] : null;
  if (fromNav != null && fromNav !== '') return fromNav;
  const fromQuery = queryParams ? queryParams[name] : null;
  if (fromQuery != null && fromQuery !== '') return fromQuery;
  return null;
}
async function fetchEndpoint(endpoint, queryParams, rowContext) {
  const method = (endpoint.method || 'GET').toUpperCase();
  let url = endpoint.path;
  const init = {
    method,
    credentials: 'same-origin',
    headers: { 'Accept': 'application/json' },
  };
  // 토큰이 있으면 붙인다 — 인증이 걸린 API 도 미리보기에서 열리게 (부모가 넣어 준다)
  if (window.__previewToken) init.headers['Authorization'] = 'Bearer ' + window.__previewToken;
  // {paramName} · :paramName — 행 컨텍스트 → 화면 이동 파라미터 → 입력값 순으로 채운다
  let missing = false;
  url = url.replace(/\\{([a-zA-Z_][a-zA-Z0-9_]*)\\}/g, (_, name) => {
    const v = resolveParam(name, rowContext, queryParams);
    if (v == null) { missing = true; return '{' + name + '}'; }
    return encodeURIComponent(String(v));
  });
  url = url.replace(/\\/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
    const v = resolveParam(name, rowContext, queryParams);
    if (v == null) { missing = true; return '/:' + name; }
    return '/' + encodeURIComponent(String(v));
  });
  if (missing) {
    const e = new Error('waiting for input parameters');
    e.code = INPUT_PENDING;
    throw e;
  }

  // GET 이면 path 에 안 쓰인 queryParams 를 URL 쿼리로
  if (method === 'GET' && queryParams) {
    const qp = new URLSearchParams();
    for (const [k, v] of Object.entries(queryParams)) {
      if (endpoint.path.includes(':' + k) || endpoint.path.includes('{' + k + '}')) continue;
      if (v != null && v !== '') qp.set(k, v);
    }
    const qs = qp.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  } else if (queryParams) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(queryParams);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; }
  catch { body = text; }
  if (!res.ok) {
    const msg = (body && (body.message || body.error)) || 'HTTP ' + res.status;
    throw new Error(msg);
  }
  return unwrapEnvelope(body);
}

// row-level 공유 state 를 widget 들이 쓰도록 provide/inject 로 연결.
// rowContext = { params: reactive({}), setParams(obj), refreshTokens: reactive({<widgetId>: 0}), bumpRefresh(widgetId) }
const ROW_CONTEXT_KEY = Symbol('rowContext');
function createRowContext() {
  const params = reactive({});
  const refreshTokens = reactive({});
  return {
    params,
    setParams(obj) {
      Object.assign(params, obj || {});
    },
    refreshTokens,
    bumpRefresh(widgetId) {
      // null 이면 전체, 아니면 지정 widget 만
      if (widgetId == null) {
        for (const k of Object.keys(refreshTokens)) refreshTokens[k] = (refreshTokens[k] || 0) + 1;
      } else {
        refreshTokens[widgetId] = (refreshTokens[widgetId] || 0) + 1;
      }
    },
  };
}
function useRowContext() {
  return (typeof inject === 'function' ? inject(ROW_CONTEXT_KEY, null) : null);
}

// ============================ StatWidget ============================
const StatWidget = {
  props: ['label', 'value', 'format', 'color', 'endpoint', 'resultKey', 'widgetId'],
  setup(props) {
    const fetchedValue = ref(null);
    const loading = ref(false);
    const error = ref('');
    const awaitingInput = ref(false);
    const rowCtx = useRowContext();

    async function load() {
      if (!props.endpoint || !props.endpoint.path) return;
      loading.value = true;
      error.value = '';
      awaitingInput.value = false;
      try {
        const data = await fetchEndpoint(props.endpoint, {}, rowCtx);
        let v = data;
        if (props.resultKey && data && typeof data === 'object') {
          v = data[props.resultKey];
        }
        if (Array.isArray(v)) {
          fetchedValue.value = v.length;
        } else if (v && typeof v === 'object') {
          const keys = Object.keys(v);
          const preferred = keys.find((k) => /count|total|sum|avg|length/i.test(k) && typeof v[k] === 'number');
          const anyNum = keys.find((k) => typeof v[k] === 'number');
          const key = preferred || anyNum;
          fetchedValue.value = key ? v[key] : null;
        } else {
          fetchedValue.value = v;
        }
      } catch (e) {
        if (e.code === INPUT_PENDING) { awaitingInput.value = true; fetchedValue.value = null; }
        else error.value = e.message || String(e);
      } finally {
        loading.value = false;
      }
    }

    const effectiveValue = computed(() => props.endpoint ? fetchedValue.value : props.value);

    const displayValue = computed(() => {
      const v = effectiveValue.value;
      if (loading.value) return '…';
      if (error.value) return '!';
      if (v == null) return '—';
      // object 면 summary
      if (typeof v === 'object') {
        try { return Object.keys(v).length + ' fields'; } catch { return '[object]'; }
      }
      switch (props.format) {
        case 'currency': return '₩' + Number(v).toLocaleString('ko-KR');
        case 'percent':  return (Number(v) * 100).toFixed(1) + '%';
        case 'number':   return Number(v).toLocaleString('ko-KR');
        case 'raw':
        default:         return String(v);
      }
    });

    onMounted(load);
    watch(() => __previewNav.version, load);   // ★ v1.11.7 화면 이동 파라미터가 바뀌면 다시 읽는다
    if (rowCtx) {
      watch(() => JSON.stringify(rowCtx.params), load);
      watch(() => rowCtx.refreshTokens[props.widgetId], (v) => { if (v) load(); });
    }

    return { displayValue, error, awaitingInput };
  },
  template: \`<div class="card stat-widget" :class="'stat-' + (color || 'primary')">
    <div class="card-body">
      <div class="stat-label">{{ label }}</div>
      <div class="stat-value">{{ awaitingInput ? '…' : displayValue }}</div>
      <div v-if="error" class="stat-error" :title="error">{{ error }}</div>
    </div>
  </div>\`,
};

// ============================ ListWidget ============================
const ListWidget = {
  // ★ v1.9.1 — rowClickable: 화면 디자이너의 '눌렀을 때 → 화면 이동' 설정이 켜지면 true
  props: ['title', 'endpoint', 'resultKey', 'columns', 'maxRows', 'paginated', 'rows', 'loading', 'error', 'widgetId', 'rowClickable'],
  emits: ['row-click'],
  setup(props) {
    const rowsRef = ref(Array.isArray(props.rows) ? props.rows : []);
    const total = ref(rowsRef.value.length);
    const page = ref(1);
    const perPage = ref(Number(props.maxRows) || 20);
    const totalPages = ref(1);
    const loadingRef = ref(!!props.loading);
    const errorRef = ref(props.error || '');
    const awaitingInput = ref(false);
    const rowCtx = useRowContext();

    async function load(p) {
      if (!props.endpoint || !props.endpoint.path) return;
      loadingRef.value = true;
      errorRef.value = '';
      awaitingInput.value = false;
      try {
        const qp = {};
        if (props.paginated) {
          qp.page = p || page.value;
          qp.perPage = perPage.value;
        }
        const data = await fetchEndpoint(props.endpoint, qp, rowCtx);
        const packed = resolveRows(data, props.resultKey);
        rowsRef.value = packed.rows;
        total.value = packed.total;
        page.value = packed.page;
        perPage.value = packed.perPage;
        totalPages.value = packed.totalPages;
      } catch (e) {
        if (e.code === INPUT_PENDING) {
          awaitingInput.value = true;
          rowsRef.value = [];
        } else {
          errorRef.value = e.message || String(e);
          rowsRef.value = [];
        }
      } finally {
        loadingRef.value = false;
      }
    }

    const effectiveColumns = computed(() => {
      if (props.columns && props.columns.length) return props.columns;
      const first = rowsRef.value[0];
      if (!first || typeof first !== 'object') return [];
      return Object.keys(first).slice(0, 8).map((k) => ({ name: k, label: k }));
    });

    const displayRows = computed(() => {
      if (props.paginated) return rowsRef.value;
      return rowsRef.value.slice(0, Number(props.maxRows) || 20);
    });

    const hasPrev = computed(() => page.value > 1);
    const hasNext = computed(() => page.value < totalPages.value);

    // endpoint 있으면 load, 없으면 props.rows 를 그대로
    if (props.endpoint && props.endpoint.path) {
      onMounted(() => load(1));
      if (rowCtx) {
        watch(() => JSON.stringify(rowCtx.params), () => load(1));
        watch(() => rowCtx.refreshTokens[props.widgetId], (v) => { if (v) load(1); });
        watch(() => __previewNav.version, () => load(1));   // ★ v1.11.7
      }
    }

    return {
      rows: rowsRef, total, page, perPage, totalPages,
      loading: loadingRef, error: errorRef, awaitingInput,
      effectiveColumns, displayRows, hasPrev, hasNext,
      formatCell,
      reload: () => load(page.value),
      goPage: (p) => load(p),
    };
  },
  template: \`<div class="card list-widget">
    <div class="card-header d-flex align-items-center">
      <h3 class="card-title mb-0">{{ title }}</h3>
      <span v-if="total > 0" class="badge badge-light-primary ms-2">{{ total }}</span>
      <button class="btn-refresh" @click="reload()" title="Refresh">⟳</button>
    </div>
    <div class="card-body">
      <div v-if="awaitingInput" class="text-muted py-4 text-center">
        <i class="bi bi-cursor"></i> Fill in the form above.
      </div>
      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      <div class="table-responsive">
        <table class="table table-row-dashed align-middle mb-0">
          <thead>
            <tr class="text-start text-muted fw-bold text-uppercase fs-7">
              <th v-for="c in effectiveColumns" :key="c.name">{{ c.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="effectiveColumns.length || 1" class="text-center text-muted py-4">불러오는 중…</td>
            </tr>
            <tr v-else-if="!displayRows.length && !awaitingInput">
              <td :colspan="effectiveColumns.length || 1" class="text-center text-muted py-4">표시할 항목이 없습니다.</td>
            </tr>
            <tr v-else v-for="(row, i) in displayRows" :key="row.id != null ? row.id : i"
                :class="{ 'rt-clickable': rowClickable }"
                :tabindex="rowClickable ? 0 : undefined"
                :role="rowClickable ? 'button' : undefined"
                @click="rowClickable && $emit('row-click', row)"
                @keyup.enter="rowClickable && $emit('row-click', row)">
              <td v-for="c in effectiveColumns" :key="c.name">{{ formatCell(row[c.name]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="paginated && totalPages > 1" class="pager">
        <button :disabled="!hasPrev" @click="goPage(page - 1)">◀ Prev</button>
        <span class="pager-info">{{ page }} / {{ totalPages }}</span>
        <button :disabled="!hasNext" @click="goPage(page + 1)">Next ▶</button>
      </div>
    </div>
  </div>\`,
};

// ============================ DetailWidget ============================
const DetailWidget = {
  props: ['title', 'endpoint', 'resultKey', 'fields', 'widgetId'],
  setup(props) {
    const record = ref(null);
    const loading = ref(false);
    const error = ref('');
    const awaitingInput = ref(false);
    const rowCtx = useRowContext();

    async function load() {
      if (!props.endpoint || !props.endpoint.path) return;
      loading.value = true;
      error.value = '';
      awaitingInput.value = false;
      try {
        const data = await fetchEndpoint(props.endpoint, {}, rowCtx);
        let r = data;
        if (props.resultKey && data && typeof data === 'object') {
          r = data[props.resultKey];
        }
        if (Array.isArray(r)) r = r[0];
        record.value = r;
      } catch (e) {
        if (e.code === INPUT_PENDING) {
          awaitingInput.value = true;
          record.value = null;
        } else {
          error.value = e.message || String(e);
        }
      } finally {
        loading.value = false;
      }
    }

    const effectiveFields = computed(() => {
      if (props.fields && props.fields.length) return props.fields;
      const r = record.value;
      if (!r || typeof r !== 'object') return [];
      return Object.keys(r).slice(0, 20).map((k) => ({ name: k, label: k }));
    });

    onMounted(load);
    watch(() => __previewNav.version, load);   // ★ v1.11.7 화면 이동 파라미터(행 클릭 → 상세)가 바뀌면 다시 읽는다
    // rowContext 의 params 나 이 widget 의 refresh 토큰이 바뀌면 재로드
    if (rowCtx) {
      watch(() => JSON.stringify(rowCtx.params), load);
      watch(() => rowCtx.refreshTokens[props.widgetId], (v) => { if (v) load(); });
    }

    return { record, loading, error, awaitingInput, effectiveFields, formatCell };
  },
  template: \`<div class="card detail-widget">
    <div class="card-header"><h3 class="card-title mb-0">{{ title }}</h3></div>
    <div class="card-body">
      <div v-if="loading" class="text-muted py-4 text-center">불러오는 중…</div>
      <div v-else-if="awaitingInput" class="text-muted py-4 text-center">
        <i class="bi bi-cursor"></i> Fill in the form above.
      </div>
      <div v-else-if="error" class="alert alert-danger mb-0">{{ error }}</div>
      <div v-else-if="!record" class="text-muted py-4 text-center">데이터 없음.</div>
      <dl v-else class="detail-list">
        <template v-for="f in effectiveFields" :key="f.name">
          <dt>{{ f.label }}</dt>
          <dd>{{ formatCell(record[f.name]) }}</dd>
        </template>
      </dl>
    </div>
  </div>\`,
};

// ============================ TextWidget ============================
const TextWidget = {
  props: ['label', 'value', 'format', 'endpoint', 'resultKey'],
  setup(props) {
    const fetchedValue = ref(null);
    const loading = ref(false);
    const error = ref('');

    async function load() {
      if (!props.endpoint || !props.endpoint.path) return;
      loading.value = true;
      error.value = '';
      try {
        const data = await fetchEndpoint(props.endpoint, {});
        let v = data;
        if (props.resultKey && data && typeof data === 'object') v = data[props.resultKey];
        fetchedValue.value = v;
      } catch (e) {
        error.value = e.message || String(e);
      } finally {
        loading.value = false;
      }
    }

    const effectiveValue = computed(() => props.endpoint ? fetchedValue.value : props.value);

    const displayValue = computed(() => {
      if (loading.value) return '…';
      if (error.value) return '⚠ ' + error.value;
      const v = effectiveValue.value;
      if (v == null) return '—';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    });

    onMounted(load);
    watch(() => __previewNav.version, load);   // ★ v1.11.7
    return { displayValue };
  },
  template: \`<div class="card text-widget">
    <div class="card-body">
      <div v-if="label" class="text-label">{{ label }}</div>
      <div class="text-value">{{ displayValue }}</div>
    </div>
  </div>\`,
};

// ============================ MarkdownWidget ============================
const MarkdownWidget = {
  props: ['body'],
  template: \`<div class="card markdown-widget">
    <div class="card-body"><pre class="md-body">{{ body }}</pre></div>
  </div>\`,
};

// ============================ ListPagedWidget ============================
// Phase 9: full pagination 형태 (맨앞 / 이전 / 1~10 / 다음 / 맨뒤)
const ListPagedWidget = {
  props: ['title', 'endpoint', 'resultKey', 'perPage', 'columns'],
  setup(props) {
    const rows = ref([]);
    const total = ref(0);
    const page = ref(1);
    const effectivePerPage = ref(Number(props.perPage) || 10);
    const totalPages = ref(1);
    const loading = ref(false);
    const error = ref('');

    async function load(p) {
      if (!props.endpoint || !props.endpoint.path) return;
      loading.value = true;
      error.value = '';
      try {
        const qp = {
          page: p || page.value,
          perPage: effectivePerPage.value,
        };
        const data = await fetchEndpoint(props.endpoint, qp);
        const packed = resolveRows(data, props.resultKey);
        rows.value = packed.rows;
        total.value = packed.total;
        page.value = packed.page;
        effectivePerPage.value = packed.perPage;
        totalPages.value = packed.totalPages;
      } catch (e) {
        error.value = e.message || String(e);
        rows.value = [];
      } finally {
        loading.value = false;
      }
    }

    const effectiveColumns = computed(() => {
      if (props.columns && props.columns.length) return props.columns;
      const first = rows.value[0];
      if (!first || typeof first !== 'object') return [];
      return Object.keys(first).slice(0, 8).map((k) => ({ name: k, label: k }));
    });

    // Phase 10: 1페이지여도 [1] 반환 (UI 에서 항상 페이저 표시)
    const pageWindow = computed(() => {
      const tp = Math.max(1, totalPages.value);
      const windowSize = 10;
      const curr = page.value;
      let start = Math.max(1, curr - Math.floor(windowSize / 2));
      let end = start + windowSize - 1;
      if (end > tp) {
        end = tp;
        start = Math.max(1, end - windowSize + 1);
      }
      const arr = [];
      for (let i = start; i <= end; i++) arr.push(i);
      return arr;
    });

    const hasPrev = computed(() => page.value > 1);
    const hasNext = computed(() => page.value < totalPages.value);

    onMounted(() => load(1));
    watch(() => __previewNav.version, () => load(1));   // ★ v1.11.7

    return {
      rows, total, page, effectivePerPage, totalPages, loading, error,
      effectiveColumns, hasPrev, hasNext, pageWindow,
      formatCell,
      reload: () => load(page.value),
      goPage: (p) => {
        if (p < 1 || p > totalPages.value || p === page.value) return;
        load(p);
      },
      goFirst: () => load(1),
      goLast: () => load(totalPages.value),
      goPrev: () => { if (page.value > 1) load(page.value - 1); },
      goNext: () => { if (page.value < totalPages.value) load(page.value + 1); },
    };
  },
  template: \`<div class="card list-widget list-paged-widget">
    <div class="card-header d-flex align-items-center">
      <h3 class="card-title mb-0">{{ title }}</h3>
      <span v-if="total > 0" class="badge badge-light-primary ms-2">{{ total }}</span>
      <span v-if="totalPages > 1" class="badge badge-light-primary ms-1">
        {{ page }} / {{ totalPages }}
      </span>
      <button class="btn-refresh" @click="reload()" title="Refresh">⟳</button>
    </div>
    <div class="card-body">
      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      <div class="table-responsive">
        <table class="table table-row-dashed align-middle mb-0">
          <thead>
            <tr class="text-start text-muted fw-bold text-uppercase fs-7">
              <th v-for="c in effectiveColumns" :key="c.name">{{ c.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="effectiveColumns.length || 1" class="text-center text-muted py-4">불러오는 중…</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td :colspan="effectiveColumns.length || 1" class="text-center text-muted py-4">표시할 항목이 없습니다.</td>
            </tr>
            <tr v-else v-for="(row, i) in rows" :key="row.id != null ? row.id : i">
              <td v-for="c in effectiveColumns" :key="c.name">{{ formatCell(row[c.name]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Phase 10: 1페이지여도 항상 표시 -->
      <nav class="pager pager-full">
        <button :disabled="!hasPrev" @click="goFirst()" title="맨앞">«</button>
        <button :disabled="!hasPrev" @click="goPrev()" title="이전">‹</button>
        <button v-for="p in pageWindow" :key="p"
                :class="{ active: p === page }"
                @click="goPage(p)">{{ p }}</button>
        <button :disabled="!hasNext" @click="goNext()" title="다음">›</button>
        <button :disabled="!hasNext" @click="goLast()" title="맨뒤">»</button>
      </nav>
    </div>
  </div>\`,
};

// ============================ RowContext ============================
// Phase 31 (patch-10): 각 row 를 감싸는 provider component.
//  rowContext (params + refreshTokens) 를 같은 row 내 자식 widget 들에게 inject.
const RowContext = {
  props: ['rowClass', 'rowStyle'],
  setup(props, { slots }) {
    const ctx = createRowContext();
    provide(ROW_CONTEXT_KEY, ctx);
    return () => h('div', {
      class: props.rowClass || 'row',
      style: props.rowStyle || '',
    }, slots.default ? slots.default() : []);
  },
};

// ============================ QueryFormWidget ============================
// Phase 31 (patch-10): 입력값을 rowContext.params 에 넣고 "조회" 버튼으로
//   같은 row 의 target widget 을 트리거. endpoint path 의 {paramName} 템플릿이
//   이 값들로 치환됨.
//
//   config.fields: [{ name, label, type, required, default, placeholder }]
//   config.submitLabel: 버튼 텍스트 (default: '조회')
//   config.targetWidgetId: 조회 성공 후 bumpRefresh 할 widget. null 이면 전체.
const QueryFormWidget = {
  props: ['title', 'fields', 'submitLabel', 'targetWidgetId', 'endpointHint'],
  setup(props) {
    const rowCtx = useRowContext();
    // 각 필드의 현재 입력값 ref
    const values = reactive({});
    // 기본값 초기 세팅
    for (const f of (props.fields || [])) {
      values[f.name] = f.default != null ? f.default : '';
    }
    const localError = ref('');

    function onSubmit() {
      localError.value = '';
      // 필수 필드 검사
      for (const f of (props.fields || [])) {
        if (f.required && (values[f.name] == null || values[f.name] === '')) {
          localError.value = f.label + ' 값을 입력하세요.';
          return;
        }
      }
      if (!rowCtx) return;
      // type 변환
      const out = {};
      for (const f of (props.fields || [])) {
        let v = values[f.name];
        if (v === '' || v == null) continue;
        if (f.type === 'number') v = Number(v);
        if (f.type === 'boolean') v = v === true || v === 'true';
        out[f.name] = v;
      }
      rowCtx.setParams(out);
      rowCtx.bumpRefresh(props.targetWidgetId || null);
    }
    /* ★ v1.11.7 — 화면 이동으로 값이 넘어오면(목록 행 클릭 → 상세 id) 입력칸을 채우고 바로 조회한다.
       예전에는 "받은 값: id=13" 만 보이고 사용자가 다시 쳐야 했다. */
    function applyNav() {
      const np = __previewNav.params || {};
      let hit = false;
      for (const f of (props.fields || [])) {
        if (np[f.name] != null && np[f.name] !== '') { values[f.name] = np[f.name]; hit = true; }
      }
      if (hit) onSubmit();
    }
    onMounted(applyNav);
    watch(() => __previewNav.version, applyNav);

    return { values, onSubmit, localError };
  },
  template: \`<div class="card query-form-widget">
    <div class="card-header" v-if="title">
      <h3 class="card-title mb-0">{{ title }}</h3>
      <code v-if="endpointHint" class="qf-endpoint-hint">{{ endpointHint }}</code>
    </div>
    <div class="card-body">
      <div class="query-form-fields">
        <div v-for="f in (fields || [])" :key="f.name" class="qf-field">
          <label class="qf-label">
            <code class="qf-field-name">{{ f.label }}</code>
            <span v-if="f.required" style="color:#dc2626">*</span>
          </label>
          <input v-if="f.type === 'number'" type="number"
                 v-model.number="values[f.name]" :placeholder="f.placeholder || ''"
                 class="form-control form-control-sm"
                 @keyup.enter="onSubmit" />
          <select v-else-if="f.type === 'boolean'" v-model="values[f.name]" class="form-select form-select-sm">
            <option :value="true">true</option>
            <option :value="false">false</option>
          </select>
          <input v-else type="text"
                 v-model="values[f.name]" :placeholder="f.placeholder || ''"
                 class="form-control form-control-sm"
                 @keyup.enter="onSubmit" />
        </div>
        <button class="btn btn-primary btn-sm qf-submit" @click="onSubmit">
          {{ submitLabel || '조회' }}
        </button>
      </div>
      <div v-if="localError" class="alert alert-warning py-1 px-2 mt-2 mb-0" style="font-size:12px">
        {{ localError }}
      </div>
    </div>
  </div>\`,
};

// ============================ FormDialogWidget ============================
// Phase 31 (patch-10): 버튼 + 모달 다이얼로그 + 폼. 주로 create/update/delete 용.
//
//   config.buttonLabel:    버튼 텍스트 (default: '실행')
//   config.buttonVariant:  'primary' | 'success' | 'danger' | ...
//   config.dialogTitle:    모달 제목
//   config.fields:         [{ name, label, type, required, default }]
//   config.confirmBeforeSubmit: true 면 제출 전 confirm()
//   config.refreshTargetWidgetId: 성공 후 bumpRefresh 할 widget (목록 등)
//   endpoint:              실제 호출 대상 (method POST/PUT/DELETE + path)
const FormDialogWidget = {
  props: [
    'title', 'endpoint', 'buttonLabel', 'buttonVariant',
    'dialogTitle', 'fields', 'confirmBeforeSubmit', 'refreshTargetWidgetId',
  ],
  setup(props) {
    const rowCtx = useRowContext();
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

    function openDialog() {
      reset();
      open.value = true;
    }
    function closeDialog() {
      open.value = false;
    }

    async function submit() {
      error.value = '';
      for (const f of (props.fields || [])) {
        if (f.required && (values[f.name] == null || values[f.name] === '')) {
          error.value = f.label + ' 값을 입력하세요.';
          return;
        }
      }
      if (props.confirmBeforeSubmit && !confirm('계속 진행할까요?')) return;
      if (!props.endpoint || !props.endpoint.path) {
        error.value = 'endpoint 가 설정되지 않았습니다.';
        return;
      }
      submitting.value = true;
      try {
        const body = {};
        for (const f of (props.fields || [])) {
          let v = values[f.name];
          if (v === '' || v == null) continue;
          if (f.type === 'number') v = Number(v);
          if (f.type === 'boolean') v = v === true || v === 'true';
          body[f.name] = v;
        }
        await fetchEndpoint(props.endpoint, body, rowCtx);
        success.value = '완료되었습니다.';
        // 성공 후 target widget refresh (보통 목록)
        if (rowCtx) rowCtx.bumpRefresh(props.refreshTargetWidgetId || null);
        // 짧은 딜레이 후 닫기
        setTimeout(() => { open.value = false; }, 600);
      } catch (e) {
        error.value = e.message || String(e);
      } finally {
        submitting.value = false;
      }
    }

    return { open, values, submitting, error, success, openDialog, closeDialog, submit };
  },
  template: \`<div class="form-dialog-widget">
    <button :class="['btn', 'btn-' + (buttonVariant || 'primary')]" @click="openDialog">
      {{ buttonLabel || '실행' }}
    </button>
    <div v-if="open" class="fd-backdrop" @click.self="closeDialog">
      <div class="fd-modal">
        <div class="fd-header">
          <h5 class="mb-0">{{ dialogTitle || buttonLabel || '' }}</h5>
          <button class="fd-close" @click="closeDialog">&times;</button>
        </div>
        <div class="fd-body">
          <div v-for="f in (fields || [])" :key="f.name" class="fd-field">
            <label class="fd-label">{{ f.label }} <span v-if="f.required" style="color:#dc2626">*</span></label>
            <input v-if="f.type === 'number'" type="number"
                   v-model.number="values[f.name]" :placeholder="f.placeholder || ''"
                   class="form-control form-control-sm" />
            <select v-else-if="f.type === 'boolean'" v-model="values[f.name]" class="form-select form-select-sm">
              <option :value="true">true</option>
              <option :value="false">false</option>
            </select>
            <textarea v-else-if="f.type === 'text'" v-model="values[f.name]" rows="3"
                      class="form-control form-control-sm" :placeholder="f.placeholder || ''"></textarea>
            <input v-else type="text"
                   v-model="values[f.name]" :placeholder="f.placeholder || ''"
                   class="form-control form-control-sm" />
          </div>
          <div v-if="error" class="alert alert-danger py-1 px-2 mt-2 mb-0" style="font-size:12px">{{ error }}</div>
          <div v-if="success" class="alert alert-success py-1 px-2 mt-2 mb-0" style="font-size:12px">{{ success }}</div>
        </div>
        <div class="fd-footer">
          <button class="btn btn-sm btn-outline-secondary" @click="closeDialog" :disabled="submitting">취소</button>
          <button :class="['btn', 'btn-sm', 'btn-' + (buttonVariant || 'primary')]"
                  @click="submit" :disabled="submitting">
            <span v-if="submitting">…</span>
            <span v-else>{{ buttonLabel || '실행' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>\`,
};

// ============================ WIDGETS ============================
const WIDGETS = { StatWidget, ListWidget, ListPagedWidget, DetailWidget, TextWidget, MarkdownWidget, QueryFormWidget, FormDialogWidget, RowContext };
`;

export const WIDGET_PREVIEW_CSS = `
/* ---- 공용 그리드 ---- */
.composite-view .row {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.composite-view [class^="col-md-"] {
  flex-shrink: 0;
  padding: 0 6px;
  min-width: 0;
  display: flex;
}
.composite-view [class^="col-md-"] > * { flex: 1; min-width: 0; }
.composite-view .col-md-1  { flex: 0 0 8.333%;  max-width: 8.333%; }
.composite-view .col-md-2  { flex: 0 0 16.667%; max-width: 16.667%; }
.composite-view .col-md-3  { flex: 0 0 25%;     max-width: 25%; }
.composite-view .col-md-4  { flex: 0 0 33.333%; max-width: 33.333%; }
.composite-view .col-md-5  { flex: 0 0 41.667%; max-width: 41.667%; }
.composite-view .col-md-6  { flex: 0 0 50%;     max-width: 50%; }
.composite-view .col-md-7  { flex: 0 0 58.333%; max-width: 58.333%; }
.composite-view .col-md-8  { flex: 0 0 66.667%; max-width: 66.667%; }
.composite-view .col-md-9  { flex: 0 0 75%;     max-width: 75%; }
.composite-view .col-md-10 { flex: 0 0 83.333%; max-width: 83.333%; }
.composite-view .col-md-11 { flex: 0 0 91.667%; max-width: 91.667%; }
.composite-view .col-md-12 { flex: 0 0 100%;    max-width: 100%; }
@media (max-width: 768px) {
  .composite-view .row > [class^="col-"] { flex: 0 0 100%; max-width: 100%; }
}

/* ---- card ---- */
.card {
  background: #fff; border: 1px solid #e4e6ef; border-radius: 8px;
  overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 16px;
}
.card-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e4e6ef;
  display: flex;
  align-items: center;
}
.card-body { padding: 14px 16px; }
.card-title {
  font-size: 13.5px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
  flex: 1;
}

/* ---- table ---- */
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 6px 8px; text-align: left; font-size: 12px; }
.table-row-dashed tr { border-bottom: 1px dashed #e4e6ef; }
.table-row-dashed tr:last-child { border-bottom: none; }
.table th {
  background: #f8fafc;
  font-weight: 600;
  color: #64748b;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.fw-bold { font-weight: 600; }
.text-muted { color: #6b7280; }
.text-uppercase { text-transform: uppercase; }
.text-start { text-align: left; }
.text-center { text-align: center; }
.fs-7 { font-size: 11px; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.mb-0 { margin-bottom: 0; }
.ms-2 { margin-left: 0.5rem; }

.alert {
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 12px;
}
.alert-danger {
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.4;
}
.badge-light-primary {
  background: #dbeafe;
  color: #1d4ed8;
}

/* ---- stat ---- */
.stat-widget .card-body { padding: 16px 20px; }
.stat-widget .stat-label {
  font-size: 11px; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px;
}
.stat-widget .stat-value { font-size: 26px; font-weight: 700; color: #0f172a; }
.stat-primary .stat-value { color: #1d4ed8; }
.stat-success .stat-value { color: #059669; }
.stat-warning .stat-value { color: #b45309; }
.stat-danger .stat-value { color: #b91c1c; }

/* ---- detail ---- */
.detail-list {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 6px 12px;
  margin: 0;
  font-size: 12px;
}
.detail-list dt { color: #64748b; font-weight: 500; }
.detail-list dd { margin: 0; color: #0f172a; word-break: break-all; }

/* ---- text widget ---- */
.text-widget .card-body { padding: 12px 16px; }
.text-widget .text-label {
  font-size: 11px; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 2px;
}
.text-widget .text-value { font-size: 15px; color: #0f172a; font-weight: 500; }

/* ---- markdown ---- */
.markdown-widget .md-body {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  color: #1f2937;
  line-height: 1.6;
}

/* ---- refresh button ---- */
.btn-refresh {
  background: none;
  border: 1px solid #e4e6ef;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  padding: 0;
  cursor: pointer;
  color: #64748b;
  font-size: 12px;
}
.btn-refresh:hover { background: #f8fafc; color: #0f172a; }

/* ---- pager ---- */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 0 4px;
  margin-top: 8px;
  border-top: 1px solid #f1f5f9;
}
.pager button {
  background: #fff;
  border: 1px solid #e4e6ef;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #1f2937;
}
.pager button:hover:not(:disabled) { background: #f8fafc; }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }
.pager-info { font-size: 12px; color: #64748b; }

/* Phase 9: full pagination */
.pager-full { gap: 4px; flex-wrap: wrap; }
.pager-full button {
  min-width: 28px;
  padding: 3px 8px;
}
.pager-full button.active {
  background: #0d6efd;
  color: #fff;
  border-color: #0d6efd;
  font-weight: 600;
}

/* ---- QueryFormWidget ---- */
.query-form-widget .card-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.qf-endpoint-hint {
  font-size: 11px;
  padding: 2px 6px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 3px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  margin-left: auto;
}
.query-form-widget .card-body { padding: 12px 16px; }
.query-form-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
}
.qf-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1 1 140px;
  min-width: 100px;
}
.qf-label {
  font-size: 11px;
  font-weight: 600;
  color: #334155;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 3px;
}
.qf-field-name {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 11px;
  background: #eff6ff;
  color: #1e40af;
  padding: 1px 5px;
  border-radius: 3px;
}
.qf-submit {
  flex-shrink: 0;
  align-self: flex-end;
  min-width: 72px;
}

/* ---- FormDialogWidget ---- */
.form-dialog-widget { display: inline-block; }
.fd-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.fd-modal {
  background: #fff;
  border-radius: 8px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}
.fd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #e5e7eb;
}
.fd-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  line-height: 1;
}
.fd-body {
  padding: 14px 18px;
  overflow-y: auto;
}
.fd-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.fd-label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  margin: 0;
}
.fd-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid #e5e7eb;
}
`;
