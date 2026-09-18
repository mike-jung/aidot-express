/**
 * compositeGen — Composite 화면 spec → Vue SFC 코드 파일.
 *
 *  생성된 파일은 다음 구조:
 *    <script setup>
 *      import { ref, computed, onMounted } from 'vue';
 *      import { storeToRefs } from 'pinia';
 *      import { use<Pascal>Store } from '@/stores/<name>Store';   // 각 endpoint 마다
 *      // widget 에서 사용되는 store 인스턴스 + storeToRefs
 *      // customVars → computed
 *      // storeCompute 표현식 → computed
 *      // onMounted → 각 store.fetchList() 호출
 *    </script>
 *    <template>
 *      <div class="composite-view">
 *        (header)
 *        (rows × widgets 그리드)
 *      </div>
 *    </template>
 *    <style scoped>...</style>
 *
 *  POC 와 차이: resources[] parser 결과 없이, widget.source 만으로 어떤 store 가 필요한지 결정.
 */
import { pascal, camel, assembleSfc, escapeAttr, fileSafe, extractResourceName } from './helpers.js';
import { paramsFromPath } from './compositeSchema.js';   // ★ v1.11.7

/**
 * spec → { path, content } 파일 디스크립터
 *  resourceCollector : map<name, {endpointPath,method,resultKey}>  (출력 파라미터)
 *    compositeGen 이 이 map 에 자신이 참조하는 resource 들을 추가 → 호출자가 나중에
 *    genAllResourceStores 로 일괄 store 파일을 생성.
 */
/**
 * ★ v1.9.0 — 위젯 태그에 붙일 행 클릭 속성.
 *   설정이 없으면 **아무것도 붙이지 않는다** — 기존 화면의 생성 결과가 한 글자도 바뀌지 않는다.
 */
export function rowClickAttrs(widget) {
  const rc = widget?.onRowClick;
  if (!rc || rc.action !== 'navigate' || !rc.target) return '';
  return ` :row-clickable="true" @row-click="onRowClick_${widget.id}"`;
}

/**
 * ★ v1.9.0 — 화면의 <script setup> 에 넣을 행 클릭 핸들러들.
 * @returns {{ needsRouter: boolean, lines: string[] }}
 */
export function rowClickHandlers(spec, screens = []) {
  const lines = [];
  let needsRouter = false;
  for (const row of (spec?.rows || [])) {
    for (const w of (row.widgets || [])) {
      const rc = w?.onRowClick;
      if (!rc || rc.action !== 'navigate' || !rc.target) continue;
      needsRouter = true;
      const target = screens.find((sc) => sc.id === rc.target);
      const routeName = target ? pascal(viewName(target)) : pascal(rc.target);
      const entries = Object.entries(rc.params || {})
        .filter(([, v]) => v)
        .map(([k, v]) => (/^row\.([\w$]+)$/.test(v) ? `${k}: row.${/^row\.([\w$]+)$/.exec(v)[1]}` : `${k}: ${JSON.stringify(v)}`));
      lines.push('');
      lines.push(`/** 화면 디자이너: '${w.title || w.kind}' 행 클릭 → ${target?.title || rc.target} */`);
      lines.push(`function onRowClick_${w.id}(row) {`);
      lines.push(`  router.push({ name: '${routeName}'${entries.length ? `, params: { ${entries.join(', ')} }` : ''} });`);
      lines.push('}');
    }
  }
  return { needsRouter, lines };
}

export function genCompositeScreen(spec, { resourceCollector = new Map(), screens = [] } = {}) {
  const ctx = buildContext(spec, resourceCollector);
  /* ★ v1.11.7 — 행 클릭·버튼의 화면 이동 핸들러. rowClickHandlers 는 v1.9.0 에 있었지만 **아무도 부르지 않아**
     템플릿이 onRowClick_x 를 참조하는데 script 에 함수가 없는 코드가 나갔다(빌드 실패). */
  ctx.rowClick = rowClickHandlers(spec, screens);

  ctx.lifecycle = buildLifecyclePlan(ctx);
  ctx.formFields = new Map();
  for (const widget of (spec.rows || []).flatMap(row => row.widgets || [])) {
    if (['formDialog', 'queryForm'].includes(widget.kind)) {
      ctx.formFields.set(widget.id, {
        name: `formFields${ctx.formFields.size + 1}`,
        fields: widget.config?.fields || [],
      });
    }
  }

  const template = buildTemplate(ctx);
  const setup = buildSetup(ctx, template);
  const imports = buildImports(ctx, setup, template);

  const name = viewName(spec);
  return {
    path: `src/views/${name}.vue`,
    content: assembleSfc({
      imports,
      setup,
      template,
      style: COMPOSITE_STYLE,
    }),
    source: 'screen',
    specId: spec.id,
    kind: 'composite',
  };
}

/** composite 화면들의 라우터 모듈 파일 */
/**
 * ★ v1.9.0 — 화면의 params 선언을 라우트 경로로 바꾼다.
 *   선언이 없으면 기존 경로 그대로 (기존 화면이 깨지지 않는다).
 */
export function routePathFor(spec) {
  const base = String(spec?.path || '/').replace(/\/+$/, '') || '/';
  const params = Array.isArray(spec?.params) ? spec.params : [];
  if (!params.length) return spec?.path || '/';
  /* ★ v1.11.7 — 경로에 이미 :id 가 있으면(화면을 /books/:id 로 만든 경우) 또 붙이지 않는다 → /books/:id/:id 방지 */
  const inPath = new Set([...String(spec?.path || '').matchAll(/(?:^|\/):([A-Za-z_][A-Za-z0-9_]*)\??/g)].map((m) => m[1]));
  const segs = params.filter((prm) => !inPath.has(prm.name)).map((prm) => `:${prm.name}${prm.required === false ? '?' : ''}`);
  if (!segs.length) return spec?.path || '/';
  return `${base === '/' ? '' : base}/${segs.join('/')}`;
}

export function genCompositeRouterModule(composites) {
  if (!composites.length) return null;
  const lines = [];
  lines.push('/**');
  lines.push(' * Composite 화면 라우트. 자동 생성됨.');
  lines.push(' */');
  lines.push('');
  lines.push('const routes = [');
  for (const spec of composites) {
    const name = viewName(spec);
    lines.push('  {');
    /* ★ v1.9.0 — 화면이 params 를 선언했으면 경로에 붙인다.
       `/snack-edit` + [{ name:'id' }] → `/snack-edit/:id`
       선택 파라미터는 `:from?` 로 — 없어도 화면이 열려야 한다. */
    lines.push(`    path: ${JSON.stringify(routePathFor(spec))},`);
    lines.push(`    name: ${JSON.stringify(pascal(name))},`);
    lines.push(`    props: true,   // route.params 를 props 로 받는다`);
    lines.push(`    component: () => import('@/views/${name}.vue'),`);
    lines.push('  },');
  }
  lines.push(']');
  lines.push('');
  lines.push('export default routes;');
  lines.push('');
  return {
    path: 'src/router/modules/composites.js',
    content: lines.join('\n'),
    source: 'router-module',
  };
}

/* ════════════════════════════ Context ════════════════════════════ */

/**
 * 화면 → 파일/라우트 이름.
 *
 *  ⚠ v1.9.0 에서 고침 — 한글 제목은 `fileSafe(pascal(...))` 를 거치며 통째로 사라져
 *    **모든 화면이 `ScreenView` 가 됐다.** 화면이 둘 이상이면 파일명과 라우트 이름이
 *    충돌해 뒤에 만든 것이 앞의 것을 덮어썼다. 화면 전환 기능은 라우트 이름으로
 *    이동하므로 이 결함을 먼저 고쳐야 성립한다.
 *
 *  이름을 못 만들면 **화면 id 를 뒤에 붙여** 반드시 구분되게 한다.
 *  (id 는 `composite_xxxx` 형태라 항상 있다)
 */
export function viewName(spec) {
  if (spec.generatedViewName) return spec.generatedViewName;
  const base = fileSafe(pascal(spec.title || ''));
  if (base && base.toLowerCase() !== 'screen') return base + 'View';

  /* ★ v1.20.1 — 제목이 한글이면 이름을 못 만들어 `ScreenC3z02lView` 같은 것이 나왔다.
     사람이 열어 보면 어느 화면인지 알 수 없고, 라우트 name 으로도 못 쓴다.
     **경로**를 먼저 쓴다 — 경로는 어차피 영문이어야 하고(`/book-list`), 화면마다 다르다.
     예: /book-list → BookListView · /books/:id → BooksIdView */
    const fromPath = fileSafe(pascal(
      String(spec.path || '')
        .replace(/:/g, '')                 // /books/:id → /books/id
        .split('/').filter(Boolean).join('-'),
    ));
  if (fromPath && fromPath.toLowerCase() !== 'screen') return fromPath + 'View';

  // 경로도 못 쓰면 id 꼬리로 구분 (마지막 수단 — 적어도 겹치지는 않는다)
  const tail = String(spec.id || '').replace(/[^\w]/g, '').slice(-6) || 'Main';
  return 'Screen' + pascal(tail) + 'View';
}

/**
 * spec 을 훑어 어떤 store 가 필요한지 (resourceCollector),
 * 각 widget 의 binding 이 어떻게 생성될지 수집.
 *
 *  반환:
 *   {
 *     spec,
 *     usedResources: Map<camelKey, {PascalKey, endpointPath, method, resultKey}>,
 *     widgetBindings: Map<widgetId, {primary, rowsExpr, loading, error}>,
 *     computedDecls: string[],   // widget별 storeCompute 의 computed 선언
 *     exposed: Set<string>,      // setup 에 등장하는 식별자 이름 (중복 선언 방지)
 *   }
 */
export function collectEndpointResources(screens, resourceCollector) {
  const widgets = screens.flatMap(spec => (spec.rows || []).flatMap(row => row.widgets || []))
    .filter(widget => widget.source?.type === 'endpoint');
  const priority = widget => !['GET', 'HEAD'].includes(String(widget.source.method || 'GET').toUpperCase()) ? 3
    : /[{:]/.test(widget.source.path || '') ? 2 : ['list', 'listPaged'].includes(widget.kind) ? 0 : 1;
  // A storeState resource name refers to its list even if the create/detail screen was added first.
  widgets.sort((a, b) => priority(a) - priority(b));
  buildContext({ rows: [{ widgets }] }, resourceCollector);
}

function buildContext(spec, resourceCollector) {
  const usedResources = new Map();   // c → {Pascal, endpointPath, method, resultKey}
  const widgetBindings = new Map();
  const computedDecls = [];
  const exposed = new Set();
  let ccount = 0;

  function ensureResource(name, endpointInfo) {
    let c = camel(name);
    if (!c) return null;
    if (endpointInfo) {
      const signature = info => JSON.stringify([info.method.toUpperCase(), info.endpointPath, info.resultKey || null]);
      const match = [...resourceCollector.entries()].find(([, info]) => signature(info) === signature(endpointInfo));
      if (match) c = match[0];
      else if (resourceCollector.has(c)) {
        const suffix = pascal(endpointInfo.method.toLowerCase()) + pascal(endpointInfo.endpointPath.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, ''));
        const base = c + suffix;
        c = base;
        let n = 2;
        while (resourceCollector.has(c)) c = base + n++;
      }
    }
    if (!resourceCollector.has(c)) {
      resourceCollector.set(c, {
        key: c, Pascal: pascal(c),
        endpointPath: endpointInfo?.endpointPath || `/api/${c}s`,
        method: endpointInfo?.method || 'GET',
        resultKey: endpointInfo?.resultKey || null,
        // 실시간(SSE): 데이터 소스에서 [실시간 자동 갱신] 을 켠 경우에만 채워진다
        realtime: !!endpointInfo?.realtime && !!endpointInfo?.streamPath,
        streamPath: endpointInfo?.streamPath || null,
      });
    }
    const info = resourceCollector.get(c);
    if (endpointInfo?.realtime && endpointInfo.streamPath) {
      info.realtime = true;
      info.streamPath = endpointInfo.streamPath;
    }
    usedResources.set(c, info);
    return c;
  }

  function resolveWidget(widget) {
    const defaults = { primary: 'null', rowsExpr: '[]', loading: 'false', error: "''" };
    const s = widget.source;
    if (!s) return defaults;

    if (s.type === 'endpoint') {
      const name = extractResourceName(s.path || '');
      const c = ensureResource(name, {
        endpointPath: s.path,
        method: s.method || 'GET',
        resultKey: s.resultKey || null,
        realtime: s.realtime,
        streamPath: s.streamPath,
      });
      if (!c) return defaults;
      const rtOn = !!(s.realtime && s.streamPath);
      return {
        storePrefix: c,
        primary: `${c}CurrentItem`,
        rowsExpr: `${c}Rows`,
        loading: `${c}Loading`,
        error: `${c}Error`,
        // 실시간이 켜진 소스면 위젯에 연결 상태를 넘겨 배지로 보여 준다
        realtime: rtOn,
        realtimeConnectedExpr: rtOn ? `${c}Store.realtimeConnected` : null,
      };
    }

    if (s.type === 'storeState') {
      if (!s.resourceKey || !s.stateName) return defaults;
      const c = ensureResource(s.resourceKey, null);
      if (!c) return defaults;
      const primary = `${c}${pascal(s.stateName)}`;
      return {
        storePrefix: c,
        primary,
        rowsExpr: `${c}Rows`,
        loading: `${c}Loading`,
        error: `${c}Error`,
      };
    }

    if (s.type === 'storeCompute') {
      if (!s.resourceKey || !s.stateName) return defaults;
      const c = ensureResource(s.resourceKey, null);
      if (!c) return defaults;
      const srcExpr = `${c}${pascal(s.stateName)}`;
      const cid = `c${++ccount}`;
      computedDecls.push(`const ${cid} = computed(() => ${computeExpr(srcExpr, s)});`);
      return {
        storePrefix: c,
        primary: cid,
        rowsExpr: srcExpr,
        loading: `${c}Loading`,
        error: `${c}Error`,
      };
    }

    if (s.type === 'customVar') {
      if (!s.varName) return defaults;
      return { primary: s.varName, rowsExpr: s.varName, loading: 'false', error: "''" };
    }

    return defaults;
  }

  // Register endpoint bindings before dependent storeState/storeCompute widgets.
  for (const row of spec.rows || []) {
    for (const widget of row.widgets || []) {
      if (widget.source?.type === 'endpoint') widgetBindings.set(widget.id, resolveWidget(widget));
    }
  }
  for (const row of spec.rows || []) {
    for (const widget of row.widgets || []) {
      if (!widgetBindings.has(widget.id)) widgetBindings.set(widget.id, resolveWidget(widget));
    }
  }

  return { spec, usedResources, widgetBindings, computedDecls, exposed };
}

/* ════════════════════════════ imports ════════════════════════════ */

function buildImports(ctx, setup, template) {
  const imports = [];
  const vueNames = ['ref', 'computed', 'watch', 'onMounted', 'onBeforeUnmount']
    .filter(name => new RegExp(`\\b${name}\\s*\\(`).test(setup));

  if (vueNames.length) {
    imports.push(`import { ${vueNames.join(', ')} } from 'vue';`);
  }
  if (ctx.rowClick?.needsRouter) {
    imports.push(`import { useRouter } from 'vue-router';`);
  }
  if (setup.includes('storeToRefs(')) {
    imports.push(`import { storeToRefs } from 'pinia';`);
  }

  for (const [key, info] of ctx.usedResources) {
    imports.push(`import { use${info.Pascal}Store } from '@/stores/${key}Store';`);
  }

  const widgets = [
    'StatWidget', 'ListWidget', 'ListPagedWidget', 'DetailWidget',
    'TextWidget', 'MarkdownWidget', 'QueryFormWidget', 'FormDialogWidget',
  ];

  for (const name of widgets) {
    if (new RegExp(`<${name}\\s`).test(template)) {
      imports.push(`import ${name} from '@/components/widgets/${name}.vue';`);
    }
  }

  return imports;
}

// 어느 API를 자동으로 읽을지 먼저 정해 템플릿과 생명주기 코드가 같은 계획을 쓴다.
function buildLifecyclePlan(ctx) {
  const screenParams = ctx.spec.params?.length ? ctx.spec.params : paramsFromPath(ctx.spec.path);
  const widgetsFor = key => (ctx.spec.rows || [])
    .flatMap(row => row.widgets || [])
    .filter(widget => ctx.widgetBindings.get(widget.id)?.storePrefix === key);
  const usesParam = info => screenParams.some(param =>
    new RegExp(`(\\{${param.name}\\}|/:${param.name}(?![A-Za-z0-9_]))`).test(info.endpointPath || ''),
  );
  const readResources = [...ctx.usedResources]
    .filter(([key]) => widgetsFor(key).some(widget => widget.kind !== 'formDialog'));
  const autoResources = readResources.filter(([key, info]) =>
    ['GET', 'HEAD'].includes(info.method.toUpperCase())
    && widgetsFor(key).some(widget => widget.kind !== 'queryForm')
    && (!/[{:]/.test(info.endpointPath) || usesParam(info)),
  );
  const realtimeKeys = readResources
    .filter(([, info]) => info.realtime && ['GET', 'HEAD'].includes(info.method.toUpperCase()))
    .map(([key]) => key);
  const hasForm = (ctx.spec.rows || []).some(row =>
    (row.widgets || []).some(widget => widget.kind === 'formDialog'),
  );

  return {
    screenParams,
    widgetsFor,
    usesParam,
    autoResources,
    realtimeKeys,
    cleanupKeys: readResources.map(([key]) => key),
    refreshAfterSave: hasForm && autoResources.length > 0,
  };
}

/* ════════════════════════════ setup 본문 ════════════════════════════ */

function buildSetup(ctx, template) {
  const lines = [];
  if (ctx.rowClick?.needsRouter) lines.push('const router = useRouter();', '');

  const customCode = [
    ...(ctx.spec.customFns || []).map(fn => fn.body),
    ...(ctx.spec.customVars || []).map(variable => variable.expression),
    ...ctx.computedDecls,
  ].join('\n');
  const usedCode = template + '\n' + customCode;
  const stateNames = ['rows', 'currentItem', 'loading', 'error', 'total', 'page', 'perPage', 'totalPages'];

  if (ctx.usedResources.size) {
    lines.push('// 화면에 필요한 상태만 Store에서 꺼낸다. storeToRefs는 반응성을 유지한다.');
  }

  for (const [key, info] of ctx.usedResources) {
    lines.push(`const ${key}Store = use${info.Pascal}Store();`);
    const fields = stateNames.filter(name =>
      new RegExp(`\\b${key}${pascal(name)}\\b`).test(usedCode),
    );

    if (fields.length) {
      lines.push('const {');
      for (const name of fields) {
        lines.push(`  ${name}: ${key}${pascal(name)},`);
      }
      lines.push(`} = storeToRefs(${key}Store);`);
    }

    lines.push('');
  }

  for (const { name, fields } of ctx.formFields.values()) {
    lines.push('// 폼의 필드 이름은 서버가 받는 파라미터 이름과 맞춘다.');
    const value = JSON.stringify(fields, null, 2).replace(/</g, '\\u003c');
    lines.push(`const ${name} = ${value};`, '');
  }

  // customFns
  if (ctx.spec.customFns?.length) {
    lines.push('');
    lines.push('// 디자이너에서 추가한 사용자 함수');
    for (const fn of ctx.spec.customFns) {
      const params = (fn.params || []).join(', ');
      const body = (fn.body || 'return null;').split('\n').map((l) => '  ' + l).join('\n');
      lines.push(`function ${fn.name}(${params}) {`);
      lines.push(body);
      lines.push('}');
    }
  }

  // customVars
  if (ctx.spec.customVars?.length) {
    lines.push('');
    lines.push('// 다른 상태에서 계산한 화면 값');
    for (const v of ctx.spec.customVars) {
      lines.push(`const ${v.name} = computed(() => (${v.expression || 'null'}));`);
    }
  }

  // widget-level computeds (storeCompute)
  if (ctx.computedDecls.length) {
    lines.push('');
    lines.push('// 위젯에서 사용하는 계산 값');
    for (const d of ctx.computedDecls) lines.push(d);
  }

  const {
    screenParams, widgetsFor, usesParam, autoResources,
    realtimeKeys, cleanupKeys, refreshAfterSave,
  } = ctx.lifecycle;
  const hasParamRead = autoResources.some(([, info]) => usesParam(info));

  if (screenParams.length && (hasParamRead || /\bprops\b/.test(usedCode))) {
    lines.push('// router의 props: true 설정으로 경로 파라미터를 전달받는다.');
    lines.push('const props = defineProps({');
    for (const param of screenParams) {
      lines.push(`  ${param.name}: {`);
      lines.push('    type: [String, Number],');
      lines.push('    default: null,');
      lines.push('  },');
    }
    lines.push('});', '');
  }

  const mounted = [];
  for (const [key, info] of autoResources) {
    if (screenParams.length && usesParam(info)) {
      const args = screenParams.map(param => `${param.name}: props.${param.name}`).join(', ');
      lines.push('// 같은 상세 화면에서 id만 바뀌는 경우에도 다시 조회한다.');
      lines.push('watch(');
      lines.push(`  () => [${screenParams.map(param => `props.${param.name}`).join(', ')}],`);
      lines.push('  () => {');
      lines.push(`    ${key}Store.fetchOne({ ${args} });`);
      lines.push('  },');
      lines.push('  { immediate: true },');
      lines.push(');', '');
    } else {
      const onlyDetail = widgetsFor(key).every(widget => ['detail', 'queryForm'].includes(widget.kind));
      const paged = widgetsFor(key).find(widget => widget.kind === 'listPaged');
      const initial = paged ? `{ perPage: ${Math.max(1, Number(paged.config?.perPage) || 10)} }` : '';
      mounted.push(`  ${key}Store.${onlyDetail ? 'fetchOne' : 'fetchList'}(${initial});`);
    }
  }
  for (const key of realtimeKeys) {
    mounted.push(`  ${key}Store.subscribeRealtime();`);
  }
  if (mounted.length) {
    lines.push('// 화면이 열리면 조회한다. 조회 오류는 Store의 error 상태에 표시된다.');
    lines.push('onMounted(() => {', ...mounted, '});', '');
  }
  if (cleanupKeys.length) {
    lines.push('// 화면을 떠나면 진행 중인 조회와 실시간 구독을 정리한다.');
    lines.push('onBeforeUnmount(() => {');
    for (const key of cleanupKeys) lines.push(`  ${key}Store.cancelReads();`);
    for (const key of realtimeKeys) lines.push(`  ${key}Store.unsubscribeRealtime();`);
    lines.push('});', '');
  }
  if (refreshAfterSave) {
    lines.push('// 저장이 성공한 뒤 현재 화면의 데이터를 갱신한다.');
    lines.push('function refreshData() {');
    if (autoResources.length === 1) {
      lines.push(`  return ${autoResources[0][0]}Store.refresh();`);
    } else {
      lines.push('  return Promise.all([');
      for (const [key] of autoResources) lines.push(`    ${key}Store.refresh(),`);
      lines.push('  ]);');
    }
    lines.push('}', '');
  }

  if (ctx.rowClick?.lines?.length) lines.push(...ctx.rowClick.lines);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ════════════════════════════ template ════════════════════════════ */

function buildTemplate(ctx) {
  const { spec } = ctx;
  const lines = [];
  // Phase 21: Bootstrap container utility 활용. custom composite-view class 제거.
  lines.push('<div class="container-fluid py-3">');

  // Header — Bootstrap utility class 로
  if (spec.header && spec.header.kind !== 'none') {
    const title = escapeAttr(spec.header.title || spec.title || '');
    const sub = escapeAttr(spec.header.subtitle || '');
    lines.push('  <div class="mb-3 pb-2 border-bottom">');
    lines.push(`    <h2 class="h4 mb-1 fw-semibold">${title}</h2>`);
    if (sub) lines.push(`    <div class="text-muted small">${sub}</div>`);
    lines.push('  </div>');
  }

  if (!spec.rows?.length) {
    lines.push('  <div class="text-muted text-center py-4">(빈 화면)</div>');
    lines.push('</div>');
    return lines.join('\n');
  }

  for (const row of spec.rows) {
    const rStyle = row.style || {};
    // Phase 21: Bootstrap g-3 (gutter) 활용. 사용자 설정 gap 이 있을 때만 inline style.
    const customGap = rStyle.gap != null && rStyle.gap !== 16;
    const rowClass = customGap ? 'row mb-3' : 'row g-3 mb-3';
    const extraStyle = [];
    if (customGap) extraStyle.push(`gap: ${rStyle.gap}px`);
    if (rStyle.padding) extraStyle.push(`padding: ${rStyle.padding}px`);
    if (rStyle.bgColor) extraStyle.push(`background-color: ${rStyle.bgColor}`);
    const styleAttr = extraStyle.length ? ` style="${extraStyle.join('; ')}"` : '';

    lines.push(`  <div class="${rowClass}"${styleAttr}>`);
    for (let i = 0; i < row.widgets.length; i++) {
      const widget = row.widgets[i];
      const width = row.widths[i];
      const binding = ctx.widgetBindings.get(widget.id)
        || { primary: 'null', rowsExpr: '[]', loading: 'false', error: "''" };
      const widgetStyle = widgetStyleAttr(widget);
      lines.push(`    <div class="col-md-${width}"${widgetStyle}>`);
      const markup = widgetMarkup(
        widget, binding, ctx.usedResources.keys().next().value || null,
        ctx.lifecycle.refreshAfterSave, ctx.formFields.get(widget.id)?.name,
      );
      lines.push(...formatWidgetTag(markup).split('\n').map(line => '      ' + line));
      lines.push(`    </div>`);
    }
    lines.push('  </div>');
  }

  lines.push('</div>');
  return lines.join('\n');
}

// 생성기가 만든 컴포넌트 태그는 속성을 한 줄씩 배치한다.
function formatWidgetTag(markup) {
  const tag = /^<([A-Z][A-Za-z0-9]*)\s+([\s\S]*?)\s*\/>$/.exec(markup);
  if (!tag || markup.length < 100) return markup;

  const attributes = tag[2].match(/[^\s=]+(?:=(?:"[^"]*"|'[^']*'))?/g) || [];
  return [`<${tag[1]}`, ...attributes.map(attribute => '  ' + attribute), '/>'].join('\n');
}

function widgetStyleAttr(widget) {
  // Phase 21: 사용자가 inline 색/높이 지정한 경우에만 style 속성 출력.
  //   이전엔 모든 widget 이 --w-bg, --w-shadow 같은 CSS var 로 감싸져서 custom CSS 없이는 렌더 불가했음.
  //   이제는 card 컴포넌트가 Bootstrap 의 .card 스타일을 그대로 쓰므로 inline 불필요.
  const s = widget.style || {};
  const parts = [];
  if (s.height && s.height !== 'auto') parts.push(`min-height: ${s.height}px`);
  return parts.length ? ` style="${parts.join('; ')}"` : '';
}

function widgetMarkup(widget, binding, fallbackPrefix = null, refreshAfterSave = false, fieldsName = null) {
  const title = escapeAttr(widget.title || '');
  const cfg = widget.config || {};
  // Phase 24: 신규 widget kind (chart/progress/timeline/form/button/search/image) 는
  //   fallbackKind 로 runtime 렌더. WIDGET_KINDS 의 fallbackKind 속성을 참고.
  //
  // Phase 33 (patch-12): listPaged / queryForm / formDialog 는 독립 widget 으로 export.
  //   - listPaged: ListPagedWidget.vue 로 export (페이저 UI 내장)
  //   - queryForm: QueryFormWidget.vue — 입력값을 store.fetchOne() 에 전달
  //   - formDialog: FormDialogWidget.vue — 버튼+모달+폼 (create/update/delete)
  const FALLBACK = {
    chart:    'list',
    progress: 'stat',
    timeline: 'list',
    form:     'detail',
    button:   'markdown',
    search:   'text',
    image:    'markdown',
  };
  const effectiveKind = FALLBACK[widget.kind] || widget.kind;
  switch (effectiveKind) {
    case 'stat':
      return `<StatWidget label="${title}" :value="${binding.primary}" format="${escapeAttr(cfg.format || 'number')}" color="${escapeAttr(cfg.color || 'primary')}" />`;
    case 'list': {
      const rtAttr = binding.realtime
        ? ` :realtime="true" :realtime-connected="${binding.realtimeConnectedExpr}"`
        : '';
      return `<ListWidget title="${title}" :rows="${binding.rowsExpr}" :loading="${binding.loading}" :error="${binding.error}" :max-rows="${Number(cfg.maxRows) || 5}"${rtAttr}${rowClickAttrs(widget)} />`;
    }
    case 'listPaged': {
      // Phase 33 (patch-12): store 가 fetchList({page, perPage}) 을 이미 지원하므로
      //   paginated list 는 store 의 page/perPage/totalPages 를 widget 에 바인딩.
      const perPage = Number(cfg.perPage) || 10;
      // binding 의 context 에서 store 접두사 추출 — rowsExpr 이 보통 `bookRows` 형태이므로
      //   앞부분 (`book`) 을 뽑아서 `bookStore.fetchList` 호출.
      /* ★ v1.22.0 — rowsExpr 이 `bookRows` 면 `book` 이 접두사다.
         비어 있거나 배열 리터럴(`[]`)이면 그 화면이 쓰는 store 로 떨어진다.
         예전의 `'resource'` 는 만들어지지 않는 store 라 부르는 순간 죽었다. */
      const fromRows = /^[A-Za-z_$][\w$]*Rows$/.test(String(binding.rowsExpr))
        ? String(binding.rowsExpr).replace(/Rows$/, '')
        : null;
      const storePrefix = binding.storePrefix || fromRows || fallbackPrefix;
      if (!storePrefix) return `<ListPagedWidget title="${title}" :rows="${binding.rowsExpr}" :default-per-page="${perPage}" />`;
      return `<ListPagedWidget title="${title}" :rows="${binding.rowsExpr}" :loading="${binding.loading}" :error="${binding.error}" :page="${storePrefix}Page" :per-page="${storePrefix}PerPage" :total-pages="${storePrefix}TotalPages" :total="${storePrefix}Total" :default-per-page="${perPage}" @change-page="(p) => ${storePrefix}Store.fetchList({ page: p, perPage: ${storePrefix}PerPage })"${rowClickAttrs(widget)} />`;
    }
    case 'detail':
      return `<DetailWidget title="${title}" :record="${binding.primary}" :loading="${binding.loading}" :error="${binding.error}" />`;
    case 'text':
      return `<TextWidget label="${title}" :value="${binding.primary}" format="${escapeAttr(cfg.format || 'auto')}" />`;
    case 'queryForm': {
      // Phase 33 (patch-12): 사용자가 필드에 입력 후 '조회' → store.fetchOne(params).
      //   binding.rowsExpr 이 없으므로 store 접두사는 widget 의 targetWidgetId 로 추론 어려움.
      //   대신, widget.source 에서 추출한 resource 를 사용.
      const storePrefix = binding.storePrefix || fallbackPrefix;
      const fieldsJson = fieldsName || escapeAttr(JSON.stringify(cfg.fields || []));
      const submitLabel = escapeAttr(cfg.submitLabel || '조회');
      const endpointHint = cfg.endpointHint ? ` endpoint-hint="${escapeAttr(cfg.endpointHint)}"` : '';
      /* store 가 없으면 제출 핸들러를 만들지 않는다 — 죽는 코드보다 조용한 편이 낫다 */
      const onSubmit = storePrefix ? ` @submit="(params) => ${storePrefix}Store.fetchOne(params)"` : '';
      return `<QueryFormWidget title="${title}" :fields="${fieldsJson}" submit-label="${submitLabel}"${endpointHint} ${onSubmit} />`;
    }
    case 'formDialog': {
      // Phase 33 (patch-12): 버튼+모달+폼. 제출 시 store.submitForm(params) → 성공 후 fetchList 재호출.
      const storePrefix = binding.storePrefix || fallbackPrefix;
      const fieldsJson = fieldsName || escapeAttr(JSON.stringify(cfg.fields || []));
      const btnLabel = escapeAttr(cfg.buttonLabel || '실행');
      const btnVariant = escapeAttr(cfg.buttonVariant || 'primary');
      const dlgTitle = escapeAttr(cfg.dialogTitle || widget.title || btnLabel);
      const confirm = !!cfg.confirmBeforeSubmit;
      const method = escapeAttr(widget.source?.method || 'POST');
      return `<FormDialogWidget title="${title}" button-label="${btnLabel}" button-variant="${btnVariant}" dialog-title="${dlgTitle}" :fields="${fieldsJson}" :confirm-before-submit="${confirm}" method="${method}"${storePrefix ? ` :submit-action="(params) => ${storePrefix}Store.submitForm('${method}', params)"` : ''}${refreshAfterSave ? ' @success="refreshData"' : ''} />`;
    }
    case 'markdown': {
      // button / image / kanban placeholder 를 markdown 으로 렌더할 때 약간의 힌트 추가
      let body = String(cfg.body || '');
      if (widget.kind === 'button') {
        const label = String(widget.title || cfg.label || '버튼');   // 제목이 곧 버튼 글자
        const variant = String(cfg.variant || 'primary');
        const rc = widget.onRowClick;
        const click = (rc && rc.action === 'navigate' && rc.target) ? ` @click="onRowClick_${widget.id}({})"` : '';   // ★ v1.11.7 화면 이동
        return `<div class="card h-100"><div class="card-body"><button type="button" class="btn btn-${variant}"${click}>${escapeAttr(label)}</button></div></div>`;
      }
      if (widget.kind === 'image') {
        return `<div class="card h-100"><div class="card-body text-center"><i class="bi bi-image fs-1 text-muted"></i><div class="small text-muted">(image widget — placeholder)</div></div></div>`;
      }
      if (!body && widget.kind !== 'markdown') body = `[${widget.kind} widget — Phase 24 beta]`;
      if (!body) return '<MarkdownWidget body="" />';
      return `<MarkdownWidget :body="${escapeAttr(JSON.stringify(body))}" />`;
    }
    default:
      return `<!-- unknown widget kind: ${widget.kind} -->`;
  }
}

/**
 * Phase 33 (patch-12): widget.source 의 path 에서 resource camelCase key 추출.
 *   extractResourceName 과 동일 로직을 사용해 'paged'/'search' 등 route-type 키워드 건너뜀.
 *   예: '/api/books/{id}' → 'book',  '/api/books/paged' → 'book'
 *   이걸 `${key}Store`, `${key}Rows` 등의 식별자 prefix 로 사용.
 */
function widgetStorePrefix(widget) {
  const p = widget?.source?.path || '';
  if (!p) return null;
  return extractResourceName(p) || null;
}

/**
 * ★ v1.22.0 — 데이터 소스가 없는 위젯의 store 를 정한다.
 *
 *  예전에는 `'resource'` 로 떨어뜨렸는데, **그 이름의 store 는 만들어지지 않는다.**
 *  그래서 생성된 화면이 `resourceStore.fetchOne(...)` 을 부르고
 *  그 폼을 제출하는 순간 `resourceStore is not defined` 로 죽었다.
 *  (문법은 멀쩡해서 빌드도 통과한다 — 눌러 봐야 드러난다)
 *
 *  이제 **그 화면이 이미 쓰는 store** 로 떨어진다. 화면에 store 가 하나도 없으면
 *  호출 자체를 만들지 않는다(죽는 코드보다 아무것도 안 하는 편이 낫다).
 */
function fallbackStorePrefix(spec) {
  for (const row of spec?.rows || []) {
    for (const w of row?.widgets || []) {
      const pre = widgetStorePrefix(w);
      if (pre) return pre;
    }
  }
  return null;
}

/* ════════════════════════════ compute op ════════════════════════════ */

function computeExpr(srcExpr, source) {
  const op = source.op || 'count';
  const field = source.field;
  const value = source.value;
  const v = srcExpr + '.value';  // storeToRefs 로 가져온 ref 라 .value 접근
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

/* ════════════════════════════ styles ════════════════════════════ */

// Phase 21: 더 이상 custom composite CSS 를 생성하지 않는다.
//   이전 버전은 .composite-view, .col-md-*, .row 같은 grid 규칙과 card 래퍼까지
//   직접 정의 (~50 줄) → Bootstrap 의 row/col/card 를 무시.
//   이제 Bootstrap 의 네이티브 grid 와 .card 스타일을 그대로 사용하므로 style 블록 불필요.
const COMPOSITE_STYLE = '';
