/**
 * compositePreviewBuilder — Composite 화면을 iframe srcdoc 으로 빌드.
 *
 * admin-client 버전. POC 와의 주요 차이:
 *   - POC 는 resources[] (파서 결과) 를 받아 각 resource 의 model 로 realistic mock 생성
 *   - admin-client: endpoint.path 에서 리소스 이름만 추론해 fakeRowsFor() 로 mock 생성
 *   - customVars 는 spec.customVars 에서 computed 로 렌더
 *   - storeCompute 소스는 유지 (op/field/value 로 계산)
 *   - storeState 소스는 "Resource 를 몰라서" 그냥 endpoint 와 유사하게 처리
 *   - Metronic 번들 미지원 (Phase 7-c 에서)
 *
 * 생성되는 iframe 문서는 Vue 3 runtime-only 빌드를 CDN 으로 로드해서
 *   - WIDGETS 전역에 각 widget 컴포넌트 등록
 *   - mock refs 선언
 *   - customVars → computed
 *   - widget별 computed (storeCompute)
 *   - 루트 App.setup() 이 모든 mock + computed 를 expose
 *   - 템플릿이 row/widget 그리드 렌더
 */
import { WIDGET_PREVIEW_CODE, WIDGET_PREVIEW_CSS } from '../widget-templates/previewRuntimes.js';
import { fakeRowsFor, extractResourceName } from './previewMocks.js';

/* ★ v1.11.7 — Vue 를 CDN 이 아니라 이 서버(public/vendor)에서 가져온다. 인터넷이 없는 병원망에서 미리보기가
   빈 화면이었다(CORS/ERR_FAILED). 미리보기 iframe 은 같은 출처라 상대 경로면 된다. */
const VUE_CDN = '/public/vendor/vue.esm-browser.prod.js';

export function buildCompositePreviewDoc({ spec, skinCss = '', title = 'Preview', authToken = '' } = {}) {
  const tokenScript = authToken ? `<script>window.__previewToken=${JSON.stringify(String(authToken))};</script>` : '';   // ★ v1.11.7
  // Phase 32 (patch-11): spec 이 null/undefined 거나 rows 가 없으면 친절한 placeholder.
  //  이전에는 `spec.rows.length` 가 null-deref 으로 "Cannot read properties of null (reading 'rows')" 에러.
  if (!spec || typeof spec !== 'object') {
    return buildErrorDoc('이 화면은 아직 로드되지 않았습니다.');
  }
  if (!Array.isArray(spec.rows)) {
    spec = { ...spec, rows: [] };
  }
  const ctx = buildPreviewContext(spec);
  const mockSetup = ctx.mockDeclarations.join('\n');
  const customFns = ctx.customFns.map(fnDecl).join('\n\n');
  const customVars = ctx.customVars.map(varDecl).join('\n');
  const widgetComputeds = ctx.widgetComputeds.join('\n');
  const appTemplate = buildTemplate(spec, ctx);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/public/vendor/bootstrap.min.css" />
<style>
/* ★ v1.9.1 — 누를 수 있다는 것이 보여야 누른다 */
.rt-clickable { cursor: pointer; }
.rt-clickable:focus-visible { outline: 2px solid #0d6efd; outline-offset: -2px; }

${BASE_CSS}
${WIDGET_PREVIEW_CSS}
${skinCss}
</style>
</head>
<body>
<div id="app"></div>
${tokenScript}
<script type="module">
import { createApp, ref, computed, reactive, inject, provide, watch, onMounted, h } from '${VUE_CDN}'

// ---- Widget components (inlined) ----
${WIDGET_PREVIEW_CODE}

// ---- Mock data ----
${mockSetup || '// (no mock refs needed)'}

// ---- User-defined functions ----
${customFns || '// (none)'}

// ---- User-defined computed vars ----
${customVars || '// (none)'}

// ---- Widget-level computeds (storeCompute sources) ----
${widgetComputeds || '// (none)'}

const App = {
  components: WIDGETS,
  setup() {
    // Phase 31 (patch-10): composite 전체에 공유되는 default row context.
    //  RowContext 컴포넌트로 감싸지지 않은 위젯들은 이 context 를 사용하므로,
    //  queryForm 과 결과 widget 이 다른 row 에 있어도 params 가 공유됨.
    provide(ROW_CONTEXT_KEY, createRowContext());
    return {
      __previewNavigate,
      ${ctx.exposedBindings.join(',\n      ') || '_noop: true'}
    }
  },
  template: \`${escapeBackticks(appTemplate)}\`
}

/**
 * ★ v1.9.1 — 미리보기에서의 화면 이동.
 *
 *  한 화면 미리보기에는 갈 곳이 없다. 그렇다고 아무 일도 안 일어나면
 *  사용자는 "설정이 틀렸나" 하고 오해한다 — **무슨 일이 일어날지 말해 준다.**
 *  전체 앱 미리보기에서는 부모(WholeAppPreview)가 이 메시지를 받아 실제로 화면을 바꾼다.
 */
/* ⚠ 자식 컴포넌트(ListWidget)의 템플릿에서 부른다.
   App 의 setup() 에서 return 해도 **자식은 그 스코프를 볼 수 없다.**
   그래서 전역에 올리고 app.config.globalProperties 로도 노출한다. */
function __previewNavigate(target, params, row) {
  const resolved = {};
  for (const [k, v] of Object.entries(params || {})) {
    /* 정규식 리터럴을 쓰지 않는다 — 이 코드는 템플릿 문자열을 거쳐 문서에 새겨지는데,
         그 과정에서 백슬래시가 먹혀 매칭이 어긋난다(실제로 값이 안 풀리고
         'row.id' 문자열이 그대로 넘어갔다). 문자열 조작이면 그 문제가 없다. */
    const sv = String(v);
    resolved[k] = sv.indexOf('row.') === 0 ? row?.[sv.slice(4)] : v;
  }
  // 전체 앱 미리보기(iframe 부모)가 듣고 있으면 그쪽이 실제로 화면을 바꾼다
  try {
    window.parent?.postMessage(
      { type: 'aidot:preview-navigate', target, params: resolved }, '*');
  } catch (e) { /* 다른 출처면 무시 */ }

  const desc = Object.entries(resolved).map(([k, v]) => k + ': ' + v).join(', ');
  __previewToast('→ ' + target + ' 화면으로 이동' + (desc ? ' (' + desc + ')' : ''));
}

/** 미리보기 전용 안내 — 화면 아래에 잠깐 떴다 사라진다 */
function __previewToast(text) {
  let el = document.getElementById('__preview_toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '__preview_toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);' +
      'background:#1e2129;color:#fff;padding:9px 15px;border-radius:9px;font-size:13px;' +
      'z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.28);max-width:88%;';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(el.__t);
  el.__t = setTimeout(() => { el.style.opacity = '0'; }, 2200);
  el.style.transition = 'opacity .3s';
}

window.__previewNavigate = __previewNavigate

const app = createApp(App)
app.config.globalProperties.__previewNavigate = __previewNavigate
app.config.errorHandler = (err) => {
  document.getElementById('app').innerHTML =
    '<div style="padding:32px;color:#b91c1c;font-family:monospace;white-space:pre-wrap">' +
    'Composite preview error:<br>' +
    String(err && err.stack || err).replace(/</g, '&lt;') +
    '</div>'
}
app.mount('#app')
</script>
</body>
</html>`;
}

/* ════════════════════════════ context 구성 ════════════════════════════ */

/**
 * spec 전체를 훑어 iframe 에 필요한 mock ref, computed, customVar/Fn 를 수집.
 *
 * 반환 shape:
 *   {
 *     mockDeclarations: string[],
 *     widgetComputeds: string[],
 *     customVars: [{name, expression}],
 *     customFns:  [{name, params, body}],
 *     exposedBindings: string[],        // setup() 이 return 할 이름들
 *     widgetBindings: Map<widgetId, {primary, rowsExpr, loading, error}>,
 *   }
 */
function buildPreviewContext(spec) {
  const mockDeclarations = [];
  const widgetComputeds = [];
  const exposedBindings = new Set();
  const createdMocks = new Set();  // 키: resource name
  const widgetBindings = new Map();
  const widgetEndpoints = new Map();   // widgetId → endpoint 변수 이름 (Phase 8b)
  let computedCounter = 0;

  /**
   * Phase 8b: endpoint source 전용 변수 선언 — 실제 fetch 를 위해 widget 에 endpoint 객체를 전달.
   *  exposeBindings 로 setup() 에서 return → template 에서 widget 의 :endpoint="w_xxx" 로 참조.
   */
  function declareEndpoint(widget) {
    const s = widget.source;
    if (!s || s.type !== 'endpoint' || !s.path) return null;
    const name = 'ep_' + String(widget.id).replace(/[^a-zA-Z0-9_]/g, '_');
    const ep = { method: s.method || 'GET', path: s.path };
    if (s.resultKey) ep.resultKey = s.resultKey;
    mockDeclarations.push(`const ${name} = ${JSON.stringify(ep)}`);
    exposedBindings.add(name);
    widgetEndpoints.set(widget.id, name);
    return name;
  }

  function ensureResourceMocks(resourceName) {
    if (!resourceName) return null;
    const p = camel(resourceName);
    if (createdMocks.has(p)) return p;
    createdMocks.add(p);
    const rows = fakeRowsFor(resourceName, 8);
    const rowsJson = JSON.stringify(rows);
    mockDeclarations.push(
      `const ${p}Rows = ref(${rowsJson})`,
      `const ${p}CurrentItem = ref(${p}Rows.value[0] || null)`,
      `const ${p}Loading = ref(false)`,
      `const ${p}Error = ref('')`,
      `const ${p}Total = ref(${p}Rows.value.length)`,
      `const ${p}Page = ref(1)`,
      `const ${p}PerPage = ref(10)`,
      `const ${p}TotalPages = ref(1)`,
    );
    ['Rows', 'CurrentItem', 'Loading', 'Error', 'Total', 'Page', 'PerPage', 'TotalPages']
      .forEach((s) => exposedBindings.add(p + s));
    return p;
  }

  // customVars 의 표현식에서 참조되는 이름을 긁어 mock 미리 생성.
  // 대충 `\b(\w+)Rows|Total|CurrentItem\b` 형태.
  const exprText = [
    ...(spec.customVars || []).map((v) => v.expression),
    ...(spec.customFns  || []).map((f) => f.body),
  ].join('\n');
  const mockRefRegex = /\b([a-z][a-zA-Z0-9]*?)(Rows|Total|CurrentItem|Loading|Error|Page|PerPage|TotalPages)\b/g;
  let match;
  while ((match = mockRefRegex.exec(exprText)) !== null) {
    ensureResourceMocks(match[1]);
  }

  // 각 widget 의 source 에 따라 binding 결정
  for (const row of spec.rows || []) {
    for (const widget of row.widgets || []) {
      // Phase 8b: endpoint source 면 endpoint 변수 선언 (실제 fetch 용)
      declareEndpoint(widget);

      const binding = resolveWidgetBinding(widget, ensureResourceMocks, widgetComputeds,
        () => ++computedCounter, exposedBindings);
      widgetBindings.set(widget.id, binding);
    }
  }

  return {
    mockDeclarations,
    widgetComputeds,
    customVars: spec.customVars || [],
    customFns:  spec.customFns  || [],
    exposedBindings: [...exposedBindings],
    widgetBindings,
    widgetEndpoints,   // Phase 8b
  };
}

/**
 * 개별 widget 의 source 를 해석해서 "primary value 표현식 / rows 표현식 / loading / error"
 * 를 만들어준다. Template 이 widget tag 의 속성으로 이걸 바인딩함.
 */
function resolveWidgetBinding(widget, ensureResourceMocks, widgetComputeds, nextComputedId, exposedBindings) {
  const defaults = { primary: 'null', rowsExpr: '[]', loading: 'false', error: "''" };
  const s = widget.source;
  if (!s) return defaults;

  if (s.type === 'endpoint') {
    // Phase 8b: endpoint 소스는 widget 이 실제 fetch 하므로 mock 불필요.
    // binding 기본값 반환 — widget 은 endpoint 변수를 직접 참조 (widgetMarkup 에서 처리).
    return defaults;
  }

  if (s.type === 'storeState') {
    if (!s.resourceKey || !s.stateName) return defaults;
    const p = ensureResourceMocks(s.resourceKey);
    const primary = `${p}${pascal(s.stateName)}`;
    return {
      primary,
      rowsExpr: s.stateName === 'rows' ? primary : `${p}Rows`,
      loading: `${p}Loading`,
      error: `${p}Error`,
    };
  }

  if (s.type === 'storeCompute') {
    if (!s.resourceKey || !s.stateName) return defaults;
    const p = ensureResourceMocks(s.resourceKey);
    const srcExpr = `${p}${pascal(s.stateName)}`;
    const cid = `c${nextComputedId()}`;
    widgetComputeds.push(
      `const ${cid} = computed(() => ${computeExpr(srcExpr, s)})`
    );
    exposedBindings.add(cid);
    return {
      primary: cid,
      rowsExpr: srcExpr,
      loading: `${p}Loading`,
      error: `${p}Error`,
    };
  }

  if (s.type === 'customVar') {
    if (!s.varName) return defaults;
    // customVars 는 이미 App.setup() 에 computed 로 선언됨 — 이름 그대로 노출.
    exposedBindings.add(s.varName);
    return {
      primary: s.varName,
      rowsExpr: s.varName,
      loading: 'false',
      error: "''",
    };
  }

  return defaults;
}

/** compute op 를 JS 표현식으로 */
function computeExpr(srcExpr, source) {
  const op = source.op || 'count';
  const field = source.field;
  const value = source.value;
  const v = srcExpr;
  const esc = (f) => String(f).replace(/[^a-zA-Z0-9_$]/g, '');
  const lit = (x) => {
    const s = String(x ?? '');
    if (s === 'true') return 'true';
    if (s === 'false') return 'false';
    if (s !== '' && !isNaN(Number(s))) return String(Number(s));
    return JSON.stringify(s);
  };
  switch (op) {
    case 'count':       return `(${v} || []).length`;
    case 'sum':         return field ? `(${v} || []).reduce((a, r) => a + Number(r?.${esc(field)} || 0), 0)` : `0`;
    case 'avg':         return field ? `((${v} || []).length === 0 ? 0 : (${v} || []).reduce((a, r) => a + Number(r?.${esc(field)} || 0), 0) / (${v} || []).length)` : `0`;
    case 'min':         return field ? `Math.min(...((${v} || []).map((r) => Number(r?.${esc(field)} || 0))))` : `0`;
    case 'max':         return field ? `Math.max(...((${v} || []).map((r) => Number(r?.${esc(field)} || 0))))` : `0`;
    case 'filterCount': return field ? `(${v} || []).filter((r) => r?.${esc(field)} === ${lit(value)}).length` : `(${v} || []).length`;
    case 'pluck':       return field ? `((${v} || {})?.${esc(field)})` : v;
    case 'custom':      return source.fnName ? `${source.fnName}(${v})` : 'null';
    default: return 'null';
  }
}

/* ════════════════════════════ Template ════════════════════════════ */

function buildTemplate(spec, ctx) {
  const lines = [];
  lines.push('<div class="composite-view">');

  // Header
  if (spec.header && spec.header.kind !== 'none') {
    const title = escapeHtml(spec.header.title || spec.title || '');
    const sub = escapeHtml(spec.header.subtitle || '');
    lines.push('  <div class="composite-header">');
    lines.push(`    <h2 class="composite-title">${title}</h2>`);
    if (sub) lines.push(`    <div class="composite-subtitle">${sub}</div>`);
    lines.push('  </div>');
  }

  // Phase 32 (patch-11): rows 가 없을 수도 있음 — 방어적 guard.
  const rows = Array.isArray(spec.rows) ? spec.rows : [];
  if (!rows.length) {
    lines.push('  <div class="text-muted text-center py-4">이 화면에 row 가 없습니다.</div>');
    lines.push('</div>');
    return lines.join('\n');
  }

  for (const row of rows) {
    const rStyle = row.style || {};
    // Phase 31 (patch-10): rowContext 는 App.setup() 에서 composite-level 로 provide.
    //  따라서 row 는 단순 <div> — queryForm 과 결과 widget 이 다른 row 에 있어도 params 공유.
    const rowStyleStr = `gap:${rStyle.gap ?? 16}px; padding:${rStyle.padding ?? 0}px; background-color:${rStyle.bgColor || 'transparent'}`;
    lines.push(`  <div class="row" style="${rowStyleStr}">`);
    // Phase 32 (patch-11): row.widgets 와 row.widths 도 방어적 guard.
    const widgets = Array.isArray(row.widgets) ? row.widgets : [];
    const widths = Array.isArray(row.widths) ? row.widths : [];
    for (let i = 0; i < widgets.length; i++) {
      const widget = widgets[i];
      const width = widths[i] || 12;
      const binding = ctx.widgetBindings.get(widget.id)
        || { primary: 'null', rowsExpr: '[]', loading: 'false', error: "''" };
      const endpointVar = ctx.widgetEndpoints?.get(widget.id) || null;
      const widgetStyle = widgetStyleAttr(widget);
      lines.push(`    <div class="col-md-${width}" ${widgetStyle}>`);
      lines.push(`      ${widgetMarkup(widget, binding, endpointVar)}`);
      lines.push('    </div>');
    }
    lines.push('  </div>');
  }

  lines.push('</div>');
  return lines.join('\n');
}

function widgetStyleAttr(widget) {
  const s = widget.style || {};
  const parts = [];
  if (s.height && s.height !== 'auto') parts.push(`min-height:${s.height}px`);
  if (typeof s.padding === 'number') parts.push(`--w-padding:${s.padding}px`);
  if (s.bgColor) parts.push(`--w-bg:${s.bgColor}`);
  if (s.shadow === 'sm') parts.push('--w-shadow:0 1px 2px rgba(0,0,0,0.05)');
  else if (s.shadow === 'md') parts.push('--w-shadow:0 4px 6px -1px rgba(0,0,0,0.1)');
  if (s.border === false) parts.push('--w-border:transparent');
  return parts.length ? `style="${parts.join('; ')}"` : '';
}

/**
 * ★ v1.9.1 — 미리보기에서의 행 클릭.
 *
 *  ⚠ 생성 코드처럼 `router.push` 를 부르면 **콘솔 화면 자체가 이동한다.**
 *    미리보기는 iframe 안의 가짜 환경이고 vue-router 도 없다.
 *    그래서 이동 대신 `__previewNavigate` 를 부르고, 그 함수가 안내만 띄운다.
 *
 *  한 화면 미리보기에는 갈 곳이 없다. 조용히 아무 일도 안 일어나면
 *  사용자는 설정이 틀렸다고 오해하므로 **무슨 일이 일어날지 말해 준다.**
 */
function previewRowClickAttrs(widget) {
  const rc = widget?.onRowClick;
  if (!rc || rc.action !== 'navigate' || !rc.target) return '';
  // 템플릿 속성 안에 들어가므로 큰따옴표를 쓸 수 없다 — 작은따옴표 JSON 으로 만든다
  const pairs = Object.entries(rc.params || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: '${String(v).replace(/'/g, "")}'`)
    .join(', ');
  const target = String(rc.target).replace(/'/g, '');
  return ` :row-clickable="true" @row-click="(row) => __previewNavigate('${target}', { ${pairs} }, row)"`;
}

function widgetMarkup(widget, binding, endpointVar) {
  const title = widget.title || '';
  const cfg = widget.config || {};
  const s = widget.source;
  const attr = (v) => `"${String(v).replace(/"/g, '&quot;')}"`;

  // Phase 8b: endpoint 소스면 설치된 endpoint 변수를 :endpoint="ep_xyz" 로 참조.
  // Vue 가 이걸 expression 으로 평가해 setup() 이 노출한 실제 객체를 prop 으로 전달.
  const hasEndpoint = !!(s && s.type === 'endpoint' && s.path && endpointVar);
  const resultKeyAttr = (s && s.resultKey) ? `result-key=${attr(s.resultKey)}` : '';
  const paginatedAttr = (hasEndpoint && /\/paged\b/.test(s.path)) ? ':paginated="true"' : '';

  // Phase 31 (patch-10): widgetId 는 rowContext.refreshTokens 에서 이 widget 을 식별하는 키.
  //  Vue 의 ':' prefix 는 expression 평가를 의미하므로, 여기선 단순 문자열 속성으로.
  const widgetIdAttr = widget.id ? `widget-id=${attr(widget.id)}` : '';

  switch (widget.kind) {
    case 'stat':
      if (hasEndpoint) {
        return `<StatWidget label=${attr(title)} :endpoint="${endpointVar}" format=${attr(cfg.format || 'number')} color=${attr(cfg.color || 'primary')} ${resultKeyAttr} ${widgetIdAttr} />`;
      }
      return `<StatWidget label=${attr(title)} :value="${binding.primary}" format=${attr(cfg.format || 'number')} color=${attr(cfg.color || 'primary')} />`;

    case 'list':
      if (hasEndpoint) {
        const maxRows = Number(cfg.maxRows) || 20;
        return `<ListWidget title=${attr(title)} :endpoint="${endpointVar}" ${resultKeyAttr} ${paginatedAttr} :max-rows="${maxRows}" ${widgetIdAttr}${previewRowClickAttrs(widget)} />`;
      }
      return `<ListWidget title=${attr(title)} :rows="${binding.rowsExpr}" :loading="${binding.loading}" :error="${binding.error}" :max-rows="${Number(cfg.maxRows) || 5}"${previewRowClickAttrs(widget)} />`;

    case 'listPaged':
      if (hasEndpoint) {
        const perPage = Number(cfg.perPage) || 10;
        const columnsAttr = (Array.isArray(cfg.columns) && cfg.columns.length)
          ? `:columns='${JSON.stringify(cfg.columns).replace(/'/g, "\\'")}'`
          : '';
        return `<ListPagedWidget title=${attr(title)} :endpoint="${endpointVar}" ${resultKeyAttr} :per-page="${perPage}" ${columnsAttr} ${widgetIdAttr} />`;
      }
      return `<ListPagedWidget title=${attr(title)} :endpoint="null" :per-page="${Number(cfg.perPage) || 10}" />`;

    case 'detail':
      if (hasEndpoint) {
        return `<DetailWidget title=${attr(title)} :endpoint="${endpointVar}" ${resultKeyAttr} ${widgetIdAttr} />`;
      }
      return `<DetailWidget title=${attr(title)} :record="${binding.primary}" :loading="${binding.loading}" :error="${binding.error}" />`;

    case 'text':
      if (hasEndpoint) {
        return `<TextWidget label=${attr(title)} :endpoint="${endpointVar}" ${resultKeyAttr} format=${attr(cfg.format || 'auto')} ${widgetIdAttr} />`;
      }
      return `<TextWidget label=${attr(title)} :value="${binding.primary}" format=${attr(cfg.format || 'auto')} />`;

    case 'markdown': {
      const body = String(cfg.body || '');
      if (!body) return '<MarkdownWidget body="" />';
      return `<MarkdownWidget :body='${JSON.stringify(body).replace(/'/g, "\\'")}' />`;
    }

    // Phase 31 (patch-10): 새 widget kinds
    case 'queryForm': {
      const fieldsJson = JSON.stringify(cfg.fields || []).replace(/'/g, "\\'");
      const submitLabel = cfg.submitLabel || '조회';
      const targetId = cfg.targetWidgetId || '';
      // Phase 32 (patch-11): endpointHint 가 있으면 "METHOD /path" 힌트 카드 헤더에 표시.
      const hintAttr = cfg.endpointHint ? `endpoint-hint=${attr(cfg.endpointHint)}` : '';
      return `<QueryFormWidget title=${attr(title)} :fields='${fieldsJson}' submit-label=${attr(submitLabel)} target-widget-id=${attr(targetId)} ${hintAttr} />`;
    }

    case 'formDialog': {
      const fieldsJson = JSON.stringify(cfg.fields || []).replace(/'/g, "\\'");
      const btnLabel = cfg.buttonLabel || '실행';
      const btnVariant = cfg.buttonVariant || 'primary';
      const dlgTitle = cfg.dialogTitle || title || btnLabel;
      const confirm = !!cfg.confirmBeforeSubmit;
      const refreshId = cfg.refreshTargetWidgetId || '';
      const endpointAttr = hasEndpoint ? `:endpoint="${endpointVar}"` : '';
      return `<FormDialogWidget title=${attr(title)} ${endpointAttr} button-label=${attr(btnLabel)} button-variant=${attr(btnVariant)} dialog-title=${attr(dlgTitle)} :fields='${fieldsJson}' :confirm-before-submit="${confirm}" refresh-target-widget-id=${attr(refreshId)} />`;
    }

    default:
      return `<!-- unknown widget kind: ${widget.kind} -->`;
  }
}

/* ════════════════════════════ Helpers ════════════════════════════ */

function fnDecl(fn) {
  const body = (fn.body || '').split('\n').map((l) => '  ' + l).join('\n');
  return `function ${fn.name}(${(fn.params || []).join(', ')}) {\n${body}\n}`;
}

function varDecl(v) {
  return `const ${v.name} = computed(() => (${v.expression || 'null'}))`;
}

function escapeBackticks(s) {
  return String(s).replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Phase 32 (patch-11): spec 이 null 이거나 로드 전 일 때 친절한 placeholder HTML.
 */
function buildErrorDoc(msg) {
  return `<!DOCTYPE html><html lang="ko"><body style="margin:0;padding:32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;color:#64748b;background:#f8fafc;">
<div style="max-width:420px;margin:60px auto;text-align:center;">
<div style="font-size:48px;margin-bottom:12px;">⏳</div>
<div style="font-size:14px;">${escapeHtml(msg)}</div>
</div></body></html>`;
}

function pascal(s) {
  return String(s || '').replace(/(?:^|[-_\s])(.)/g, (_, c) => c.toUpperCase());
}
function camel(s) {
  const p = pascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

const BASE_CSS = `
html, body {
  margin: 0; padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
  background: #f5f6f8;
  color: #1f2937;
  font-size: 13px;
  line-height: 1.5;
}
#app { padding: 20px; max-width: 1400px; margin: 0 auto; }

.composite-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e6ef;
}
.composite-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
}
.composite-subtitle {
  font-size: 13px;
  color: #64748b;
}

/* Widget 공통 style 변수로부터 카드 스타일 적용 */
.composite-view [class^="col-md-"] > * {
  box-shadow: var(--w-shadow, 0 1px 3px rgba(0,0,0,0.04));
  background: var(--w-bg, #fff);
  border: 1px solid var(--w-border, #e4e6ef);
  border-radius: 8px;
  overflow: hidden;
}
.composite-view [class^="col-md-"] .card-body {
  padding: var(--w-padding, 14px) 16px;
}
`;
