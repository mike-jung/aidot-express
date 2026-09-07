/**
 * wholeAppPreviewBuilder — 프로젝트 전체를 iframe 하나에 렌더하는 미리보기.
 *
 *  단일 화면 preview (compositePreviewBuilder) 는 "현재 편집 중인 composite 1개" 만 그리지만,
 *  이건 프로젝트 전체를 살아있는 앱처럼:
 *   - layout (sidebar / top-nav / title) 렌더
 *   - sidebar 메뉴에 등록된 screens 를 목록으로 표시
 *   - 메뉴 클릭 → 오른쪽 main 영역이 해당 composite 화면으로 전환
 *   - 각 화면은 실제로 widget 을 렌더 (endpoint 소스면 실제 fetch)
 *
 *  SPA-in-iframe 구조. Vue 3 를 CDN 에서 로드.
 *
 *  주의:
 *   - 생성된 코드처럼 vue-router 전체를 쓰진 않음 (iframe 안에서 route 가 복잡해짐)
 *   - 대신 "선택된 screen id" 를 ref 로 관리하는 간단 SPA
 *   - widget runtime 코드는 compositePreviewBuilder 의 것과 동일 (previewRuntimes.js 재사용)
 */
import { WIDGET_PREVIEW_CODE, WIDGET_PREVIEW_CSS } from '../widget-templates/previewRuntimes.js';

/* ★ v1.11.7 — Vue 를 CDN 이 아니라 이 서버(public/vendor)에서 가져온다. 인터넷이 없는 병원망에서 미리보기가
   빈 화면이었다(CORS/ERR_FAILED). 미리보기 iframe 은 같은 출처라 상대 경로면 된다. */
const VUE_CDN = '/public/vendor/vue.esm-browser.prod.js';
/* ★ v1.23.1 — 미리보기에도 **부트스트랩 CSS** 를 넣는다.
   여기까지 넣지 않아서, 위젯이 `btn btn-primary` 를 제대로 쓰고 있는데도
   미리보기에서는 밋밋한 기본 단추로 보였다(생성된 앱에서는 정상이었다).
   Vue 와 같은 자리에서 가져온다 — 인터넷이 없는 병원망에서도 미리보기가 살아 있어야 한다. */
const BOOTSTRAP_CSS = '/public/vendor/bootstrap.min.css';

/* ════════════════════════════ layout kind 분류 ════════════════════════════
 *  Phase 28 (patch-07): 이전에는 'top-nav' 인지 여부만 체크했으나 9종 레이아웃을
 *  각각 올바르게 렌더링하기 위해 세부 분류가 필요.
 */
const TOP_KINDS  = new Set(['top-nav', 'top-and-side', 'hero-landing']);
const LEFT_SIDEBAR_KINDS = new Set(['sidebar-left', 'sidebar-dark', 'sidebar-both', 'top-and-side']);
const NO_MENU_KINDS = new Set(['split-panel', 'card-grid']);

function isTopKind(kind) { return TOP_KINDS.has(kind); }
function isLeftSidebarKind(kind) { return LEFT_SIDEBAR_KINDS.has(kind); }
function hasAnyMenu(layout) { return !NO_MENU_KINDS.has(layout?.kind); }

export function buildWholeAppPreviewDoc({ project, authToken = '' } = {}) {
  if (!project) {
    return errorDoc('프로젝트 정보가 없습니다');
  }
  // ★ v1.11.7 — 로그인 토큰을 iframe 에 넘겨 인증이 걸린 API 도 미리보기에서 열리게 (같은 출처 srcdoc)
  const tokenScript = authToken ? `<script>window.__previewToken=${JSON.stringify(String(authToken))};</script>` : '';
  const layout = normalizeLayout(project.layout);
  const screens = (project.screens || []).filter((s) => s && s.kind === 'composite');

  // 각 화면마다 endpoint 변수 선언 모으기
  const allScreens = [];
  for (const screen of screens) {
    const endpointVars = [];
    const rowDescriptors = [];
    for (const row of screen.rows || []) {
      const widgets = [];
      for (let i = 0; i < (row.widgets || []).length; i++) {
        const w = row.widgets[i];
        const width = row.widths?.[i] || 12;
        let endpointVar = null;
        if (w.source?.type === 'endpoint' && w.source.path) {
          endpointVar = `ep_${String(w.id).replace(/[^a-zA-Z0-9_]/g, '_')}`;
          endpointVars.push({
            name: endpointVar,
            method: w.source.method || 'GET',
            path: w.source.path,
            resultKey: w.source.resultKey || null,
          });
        }
        widgets.push({ widget: w, width, endpointVar });
      }
      rowDescriptors.push({ row, widgets });
    }
    allScreens.push({ screen, rowDescriptors, endpointVars });
  }

  // menu items — layout.sidebar.items 우선, 비어 있으면 screens 에서 생성
  let menuItems = Array.isArray(layout.sidebar?.items) ? layout.sidebar.items : [];
  if (!menuItems.length) {
    menuItems = screens.map((s) => ({
      label: s.title || '무제',
      path: s.path || `/screen-${s.id}`,
      icon: 'bi-file-earmark',
      screenId: s.id,
    }));
  } else {
    // 이미 정의된 menu item 은 path 기반으로 screen 과 매칭
    menuItems = menuItems.map((m) => {
      const match = screens.find((s) => s.path === m.path);
      return { ...m, screenId: match?.id || null };
    });
  }

  // 각 화면의 endpoint 변수를 모두 수집 (전역 선언)
  const allEpDecls = [];
  const seenEpNames = new Set();
  for (const { endpointVars } of allScreens) {
    for (const ep of endpointVars) {
      if (seenEpNames.has(ep.name)) continue;
      seenEpNames.add(ep.name);
      const obj = { method: ep.method, path: ep.path };
      if (ep.resultKey) obj.resultKey = ep.resultKey;
      allEpDecls.push(`const ${ep.name} = ${JSON.stringify(obj)};`);
    }
  }

  // 메뉴 항목 JSON
  const menuJson = JSON.stringify(menuItems.map((m) => ({
    label: m.label, path: m.path, icon: m.icon || '', screenId: m.screenId,
  })));

  // 각 screen 의 렌더 마크업 (Vue 템플릿 내부에서 v-if 로 분기)
  const screenMarkups = allScreens.map((s) => screenMarkup(s)).join('\n');

  // 초기 선택: 첫 번째 screen
  const initialScreenId = screens[0]?.id || null;
  const initialPath = menuItems[0]?.path || '/';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(project.name || 'Preview')}</title>
<link rel="stylesheet" href="${BOOTSTRAP_CSS}" />
<style>
${BASE_CSS}
${WIDGET_PREVIEW_CSS}
${layoutCss(layout)}
</style>
</head>
<body>
<div id="app"></div>
${tokenScript}
<script type="module">
import { createApp, ref, computed, reactive, inject, provide, watch, onMounted, h } from '${VUE_CDN}';

// ---- Widget components ----
${WIDGET_PREVIEW_CODE}

// ---- Endpoint definitions (전역 공유) ----
${allEpDecls.join('\n')}

// ---- 메뉴 / 화면 라우팅 (간이 SPA) ----
const MENU = ${menuJson};
/* ★ v1.9.2 — 화면 id → 정보. 메뉴에는 없는 화면(수정 화면 등)으로도 이동해야 하므로
   MENU 가 아니라 전체 화면 목록으로 만든다. */
const SCREEN_INDEX = ${JSON.stringify(Object.fromEntries(
    screens.map((sc) => [sc.id, { id: sc.id, title: sc.title || sc.id, path: sc.path || '' }]),
  ))};
const currentScreenId = ref(${JSON.stringify(initialScreenId)});
const currentPath = ref(${JSON.stringify(initialPath)});

function navigate(item) {
  currentScreenId.value = item.screenId;
  currentPath.value = item.path;
}

/* ★ v1.9.2 — 행 클릭으로 화면 이동.
   전체 앱 미리보기는 iframe 안에서 currentScreenId 로 화면을 갈아 끼운다.
   생성 코드처럼 router.push 를 부르면 **콘솔 화면 자체가 이동하므로** 쓰지 않는다.

   ⚠ 뒤로 가기를 함께 넣는다. 없으면 수정 화면으로 넘어간 뒤 갇힌다 —
     메뉴에 없는 화면(수정 화면 등)으로 이동하면 돌아갈 길이 사라진다. */
const navStack = ref([]);
const navParams = ref({});

function __previewNavigate(targetScreenId, params, row) {
  const resolved = {};
  for (const [k, v] of Object.entries(params || {})) {
    /* 정규식 리터럴을 쓰지 않는다 — 이 코드는 템플릿 문자열을 거쳐 문서에 새겨지는데,
         그 과정에서 백슬래시가 먹혀 매칭이 어긋난다(실제로 값이 안 풀리고
         'row.id' 문자열이 그대로 넘어갔다). 문자열 조작이면 그 문제가 없다. */
    const sv = String(v);
    resolved[k] = sv.indexOf('row.') === 0 ? row?.[sv.slice(4)] : v;
  }
  const target = SCREEN_INDEX[targetScreenId];
  if (!target) {
    __previewToast("'" + targetScreenId + "' 화면을 찾을 수 없습니다 — 지워졌거나 이름이 바뀌었습니다");
    return;
  }
  navStack.value.push({ screenId: currentScreenId.value, path: currentPath.value, params: navParams.value });
  currentScreenId.value = targetScreenId;
  currentPath.value = target.path || '';
  navParams.value = resolved;
  /* ★ v1.11.7 — 위젯 런타임에 파라미터를 넘긴다. 상세 화면의 GET /api/books/:id 가 여기서 id 를 받는다 */
  if (window.__previewNav) { window.__previewNav.params = resolved; window.__previewNav.version++; }

  const desc = Object.entries(resolved).map(function (e) { return e[0] + ': ' + e[1]; }).join(', ');
  __previewToast('→ ' + (target.title || targetScreenId) + (desc ? ' (' + desc + ')' : ''));
}

function __previewBack() {
  const prev = navStack.value.pop();
  if (!prev) return;
  currentScreenId.value = prev.screenId;
  currentPath.value = prev.path;
  navParams.value = prev.params || {};
  if (window.__previewNav) { window.__previewNav.params = navParams.value; window.__previewNav.version++; }
}

function __previewToast(text) {
  let el = document.getElementById('__preview_toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '__preview_toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);' +
      'background:#1e2129;color:#fff;padding:9px 15px;border-radius:9px;font-size:13px;' +
      'z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.28);max-width:88%;transition:opacity .3s';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(el.__t);
  el.__t = setTimeout(function () { el.style.opacity = '0'; }, 2200);
}
window.__previewNavigate = __previewNavigate;
/* ★ v1.11.7 — 템플릿의 @click="__previewBack()" 는 setup 이 돌려준 값 중 _ 로 시작하는 이름을 못 본다(Vue 예약 접두어)
   → 전역에도 둔다. 예전에는 [← 뒤로] 를 누르면 ReferenceError 로 미리보기가 통째로 죽었다. */
window.__previewBack = __previewBack;

const App = {
  components: WIDGETS,
  setup() {
    // Phase 31 (patch-10): 전역 row context (queryForm ↔ 결과 widget 연결용)
    provide(ROW_CONTEXT_KEY, createRowContext());
    return {
      menu: MENU,
      currentScreenId,
      currentPath,
      navigate,
      __previewNavigate,
      __previewBack,
      navStack,
      navParams,
      ${allEpDecls.map((l) => l.match(/const (\w+)/)?.[1]).filter(Boolean).join(',\n      ')}
    };
  },
  template: \`
    <div class="app-shell layout-kind-${layout.kind}">
      <!-- 상단 네비 (kind: top-nav / top-and-side / hero-landing) -->
      <header v-if="${isTopKind(layout.kind)}" class="app-topbar">
        <div class="header-title">${escapeHtml(layout.title?.text || '')}</div>
        <nav class="topnav">
          <button v-for="m in menu" :key="m.path"
                  class="topnav-item"
                  :class="{ active: currentPath === m.path }"
                  @click="navigate(m)">{{ m.label }}</button>
        </nav>
      </header>

      <div class="app-body">
        <!-- 좌 사이드바 (kind: sidebar-left / sidebar-dark / sidebar-both / top-and-side) -->
        <aside v-if="${isLeftSidebarKind(layout.kind)}" class="app-sidebar app-sidebar-left">
          ${layout.kind !== 'top-and-side' ? `<div class="sidebar-brand">${escapeHtml(layout.title?.text || project.name || 'App')}</div>` : ''}
          <nav class="sidebar-nav">
            <button v-for="m in menu" :key="m.path"
                    class="sidebar-item"
                    :class="{ active: currentPath === m.path }"
                    @click="navigate(m)">
              <i v-if="m.icon" :class="'bi ' + m.icon"></i>
              <span>{{ m.label }}</span>
            </button>
          </nav>
        </aside>

        <!-- 메인 (공통) -->
        <div class="app-main">
          <!-- 상단 타이틀 — top-kind 가 아닐 때만 (top-kind 는 header 가 외부에 있음) -->
          <header v-if="${!isTopKind(layout.kind)}" class="app-header">
            <div class="header-title">${escapeHtml(layout.title?.text || '')}</div>
          </header>
          <main class="app-content ${layout.kind === 'split-panel' ? 'is-split' : ''} ${layout.kind === 'card-grid' ? 'is-grid' : ''}">
            <!-- ★ v1.9.2 — 행 클릭으로 넘어왔을 때만 뜨는 뒤로 가기.
                 수정 화면은 메뉴에 없는 경우가 많아, 없으면 그 화면에 갇힌다. -->
            <div v-if="navStack.length" class="d-flex align-items-center gap-2 mb-2">
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="__previewBack()">
                ← 뒤로
              </button>
              <small class="text-muted" v-if="Object.keys(navParams).length">
                받은 값:
                <code v-for="(v, k) in navParams" :key="k" class="me-1">{{ k }}={{ v }}</code>
              </small>
            </div>
${screenMarkups}
            <div v-if="!currentScreenId" class="text-center text-muted py-5">
              ${hasAnyMenu(layout) ? '사이드바에서' : ''}화면을 선택하세요.
            </div>
          </main>
        </div>

        <!-- 우 사이드바 (kind: sidebar-right) -->
        <aside v-if="${layout.kind === 'sidebar-right'}" class="app-sidebar app-sidebar-right">
          <div class="sidebar-brand">${escapeHtml(layout.title?.text || project.name || 'App')}</div>
          <nav class="sidebar-nav">
            <button v-for="m in menu" :key="m.path"
                    class="sidebar-item"
                    :class="{ active: currentPath === m.path }"
                    @click="navigate(m)">
              <i v-if="m.icon" :class="'bi ' + m.icon"></i>
              <span>{{ m.label }}</span>
            </button>
          </nav>
        </aside>

        <!-- 우 보조 패널 (kind: sidebar-both) -->
        <aside v-if="${layout.kind === 'sidebar-both'}" class="app-aux-panel">
          <div class="aux-title">보조 패널</div>
          <div class="aux-body">알림 · 퀵 액션 영역</div>
        </aside>
      </div>
    </div>
  \`,
};

const app = createApp(App);
app.config.errorHandler = (err) => {
  document.getElementById('app').innerHTML =
    '<div style="padding:32px;color:#b91c1c;font-family:monospace;white-space:pre-wrap">' +
    'Preview 오류:<br>' +
    String(err && err.stack || err).replace(/</g, '&lt;') + '</div>';
};
app.mount('#app');
</script>
</body>
</html>`;
}

/* ════════════════════════════ per-screen markup ════════════════════════════ */

function screenMarkup({ screen, rowDescriptors, endpointVars }) {
  const lines = [];
  // Phase 10-hotfix: v-if 속성의 JS literal 은 single-quote 로 (HTML attr 을 "..." 로 감쌌으므로).
  //   bug 이전: `v-if="currentScreenId === ${JSON.stringify(screen.id)}"`
  //            → JSON.stringify 는 "s1" 처럼 double-quote 를 포함해 HTML attr 이 깨짐.
  const idLiteral = "'" + String(screen.id).replace(/'/g, "\\'") + "'";
  lines.push(`          <div v-if="currentScreenId === ${idLiteral}" class="composite-view">`);

  // Header
  if (screen.header && screen.header.kind !== 'none') {
    const title = escapeHtml(screen.header.title || screen.title || '');
    const sub = escapeHtml(screen.header.subtitle || '');
    lines.push('            <div class="composite-header">');
    lines.push(`              <h2 class="composite-title">${title}</h2>`);
    if (sub) lines.push(`              <div class="composite-subtitle">${sub}</div>`);
    lines.push('            </div>');
  }

  for (const { row, widgets } of rowDescriptors) {
    const rStyle = row.style || {};
    const rowStyleStr = `gap:${rStyle.gap ?? 16}px`;
    // Phase 31 (patch-10): rowContext 는 App.setup() 에서 provide — 단순 div.
    lines.push(`            <div class="row" style="${rowStyleStr}">`);
    for (const { widget, width, endpointVar } of widgets) {
      lines.push(`              <div class="col-md-${width}">`);
      lines.push(`                ${widgetMarkup(widget, endpointVar)}`);
      lines.push('              </div>');
    }
    lines.push('            </div>');
  }

  lines.push('          </div>');
  return lines.join('\n');
}

/** ★ v1.9.2 — 전체 앱 미리보기의 행 클릭 속성 */
function appRowClickAttrs(widget) {
  const rc = widget?.onRowClick;
  if (!rc || rc.action !== 'navigate' || !rc.target) return '';
  const pairs = Object.entries(rc.params || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: '${String(v).replace(/'/g, '')}'`)
    .join(', ');
  const target = String(rc.target).replace(/'/g, '');
  return ` :row-clickable="true" @row-click="(row) => __previewNavigate('${target}', { ${pairs} }, row)"`;
}

function widgetMarkup(widget, endpointVar) {
  const title = widget.title || '';
  const cfg = widget.config || {};
  const s = widget.source;
  const attr = (v) => `"${String(v).replace(/"/g, '&quot;')}"`;
  const hasEp = endpointVar && s?.type === 'endpoint';
  const resultKeyAttr = (s && s.resultKey) ? `result-key=${attr(s.resultKey)}` : '';
  // Phase 31 (patch-10) — widget-id 는 expression 평가 안 함 (플레인 문자열).
  const widgetIdAttr = widget.id ? `widget-id=${attr(widget.id)}` : '';

  switch (widget.kind) {
    case 'stat':
      if (hasEp) return `<StatWidget label=${attr(title)} :endpoint="${endpointVar}" ${resultKeyAttr} format=${attr(cfg.format || 'number')} color=${attr(cfg.color || 'primary')} ${widgetIdAttr} />`;
      return `<StatWidget label=${attr(title)} :value="null" format=${attr(cfg.format || 'number')} color=${attr(cfg.color || 'primary')} />`;
    case 'list':
      if (hasEp) {
        return `<ListWidget title=${attr(title)} :endpoint="${endpointVar}" ${resultKeyAttr} :max-rows="${Number(cfg.maxRows) || 20}" ${widgetIdAttr}${appRowClickAttrs(widget)} />`;
      }
      return `<ListWidget title=${attr(title)} :rows="[]" :max-rows="${Number(cfg.maxRows) || 5}"${appRowClickAttrs(widget)} />`;
    case 'listPaged':
      if (hasEp) {
        return `<ListPagedWidget title=${attr(title)} :endpoint="${endpointVar}" ${resultKeyAttr} :per-page="${Number(cfg.perPage) || 10}" ${widgetIdAttr} />`;
      }
      return `<ListPagedWidget title=${attr(title)} :endpoint="null" :per-page="${Number(cfg.perPage) || 10}" />`;
    case 'detail':
      if (hasEp) return `<DetailWidget title=${attr(title)} :endpoint="${endpointVar}" ${resultKeyAttr} ${widgetIdAttr} />`;
      return `<DetailWidget title=${attr(title)} :record="null" />`;
    case 'text':
      if (hasEp) return `<TextWidget label=${attr(title)} :endpoint="${endpointVar}" ${resultKeyAttr} format=${attr(cfg.format || 'auto')} ${widgetIdAttr} />`;
      return `<TextWidget label=${attr(title)} :value="null" format=${attr(cfg.format || 'auto')} />`;
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
      // Phase 32 (patch-11): endpointHint 표시
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
      const endpointAttr = hasEp ? `:endpoint="${endpointVar}"` : '';
      return `<FormDialogWidget title=${attr(title)} ${endpointAttr} button-label=${attr(btnLabel)} button-variant=${attr(btnVariant)} dialog-title=${attr(dlgTitle)} :fields='${fieldsJson}' :confirm-before-submit="${confirm}" refresh-target-widget-id=${attr(refreshId)} />`;
    }

    case 'button': {
      /* ★ v1.11.7 — 버튼: 눌렀을 때 동작(화면 이동). 예전에는 자리만 차지하는 그림이었다 */
      const label = String(title || cfg.label || '버튼');   // 제목이 곧 버튼 글자
      const variant = String(cfg.variant || 'primary');
      const rc = widget.onRowClick;
      const click = (rc && rc.action === 'navigate' && rc.target)
        ? ` @click="__previewNavigate('${String(rc.target).replace(/'/g, '')}', {}, null)"` : '';
      return `<div class="card h-100"><div class="card-body d-flex align-items-center"><button type="button" class="btn btn-${variant}"${click}>${label.replace(/</g, '&lt;')}</button></div></div>`;
    }
    default:
      return `<!-- unknown widget kind: ${widget.kind} -->`;
  }
}

/* ════════════════════════════ layout + css ════════════════════════════ */

function normalizeLayout(layout) {
  const l = layout || {};
  return {
    kind: l.kind || 'sidebar-left',
    title: {
      text: l.title?.text || '',
      bgColor: l.title?.bgColor || '#ffffff',
      fgColor: l.title?.fgColor || '#0f172a',
      height: Number(l.title?.height) || 60,
      ...l.title,
    },
    sidebar: {
      items: Array.isArray(l.sidebar?.items) ? l.sidebar.items : [],
      bgColor: l.sidebar?.bgColor || '#1e2a3a',
      fgColor: l.sidebar?.fgColor || '#cfd6de',
      width: Number(l.sidebar?.width) || 220,
      activeBg: l.sidebar?.activeBg || '#0d6efd',
      ...l.sidebar,
    },
    mainArea: {
      bgColor: l.mainArea?.bgColor || '#f5f7fa',
      padding: Number(l.mainArea?.padding) || 16,
      ...l.mainArea,
    },
  };
}

function layoutCss(layout) {
  const t = layout.title;
  const s = layout.sidebar;
  const m = layout.mainArea;
  return `
/* ════════════════════════════ 공통 shell ════════════════════════════ */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
}
.app-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ────────── 공통 사이드바 ────────── */
.app-sidebar {
  width: ${s.width}px;
  flex-shrink: 0;
  background: ${s.bgColor};
  color: ${s.fgColor};
  display: flex;
  flex-direction: column;
}
.app-sidebar-right { order: 2; }       /* sidebar-right 에서 flex order 로 오른쪽 배치 */

.sidebar-brand {
  padding: 16px 20px;
  font-weight: 700;
  font-size: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  color: #fff;
}
.sidebar-nav {
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  color: ${s.fgColor};
  background: none;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.sidebar-item:hover { background: rgba(255, 255, 255, 0.05); }
.sidebar-item.active { background: ${s.activeBg}; color: #fff; }
.sidebar-item i { width: 16px; text-align: center; font-size: 14px; }

/* ────────── 우측 보조 패널 (sidebar-both 전용) ────────── */
.app-aux-panel {
  width: ${Math.round(s.width * 0.6)}px;
  flex-shrink: 0;
  background: #f8fafc;
  border-left: 1px solid #e5e7eb;
  padding: 16px;
  color: #64748b;
  order: 3;
}
.aux-title { font-weight: 600; color: #0f172a; margin-bottom: 8px; }
.aux-body { font-size: 13px; }

/* ────────── 메인 영역 ────────── */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  order: 1;
}

/* ────────── 상단 헤더 (좌 사이드바형) ────────── */
.app-header {
  height: ${t.height}px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: ${t.bgColor};
  color: ${t.fgColor};
  border-bottom: 1px solid #e5e7eb;
  gap: 20px;
}
.header-title { font-weight: 600; font-size: 16px; }

/* ────────── 상단 네비 막대 (top-kind 전용) ────────── */
.app-topbar {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: ${t.height}px;
  background: ${t.bgColor};
  color: ${t.fgColor};
  border-bottom: 1px solid #e5e7eb;
  gap: 20px;
  flex-shrink: 0;
}
.topnav {
  display: flex;
  gap: 4px;
  align-items: center;
}
.topnav-item {
  padding: 6px 14px;
  color: inherit;
  background: none;
  border: none;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
}
.topnav-item:hover { background: rgba(0,0,0,0.05); }
.topnav-item.active {
  background: rgba(13, 110, 253, 0.12);
  color: #0d6efd;
  font-weight: 600;
}

/* ────────── 메인 콘텐츠 ────────── */
.app-content {
  flex: 1;
  background: ${m.bgColor};
  padding: ${m.padding}px;
  overflow-y: auto;
}
.app-content.is-split {
  display: flex;
  gap: 16px;
  overflow: hidden;
}
.app-content.is-split .composite-view { flex: 1; overflow-y: auto; }
.app-content.is-grid .composite-view {
  max-width: none;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-content: flex-start;
}
.app-content.is-grid .composite-view > .composite-header {
  flex: 0 0 100%;
}
.app-content.is-grid .composite-view > *:not(.composite-header) {
  flex: 1 1 300px;
  max-width: 100%;
}

/* ════════════════════════════ kind-specific 오버라이드 ════════════════════════════ */

/* sidebar-right: app-body 내 flex order 로 메인 왼쪽 + 사이드바 오른쪽 */
.layout-kind-sidebar-right .app-sidebar-right { border-left: 1px solid #e5e7eb; border-right: none; }

/* sidebar-both: 좌 사이드바 + 메인 + 우 aux 순서 */
.layout-kind-sidebar-both .app-sidebar-left { order: 0; }
.layout-kind-sidebar-both .app-main { order: 1; }
.layout-kind-sidebar-both .app-aux-panel { order: 2; }

/* top-and-side: 상단 네비 + 좌 서브메뉴 + 메인 — 좌 사이드바는 상단 헤더 없이 */
.layout-kind-top-and-side .app-sidebar { padding-top: 8px; }

/* hero-landing: 상단 네비 고정 + 메인은 전체 폭 */
.layout-kind-hero-landing .app-topbar {
  background: transparent;
  border-bottom: none;
  position: sticky;
  top: 0;
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
}
.layout-kind-hero-landing .app-content { max-width: none; padding: 0; }
.layout-kind-hero-landing .composite-view { max-width: 1200px; margin: 0 auto; padding: ${m.padding}px; }

/* split-panel: 메인 영역 2분할 (composite-view 내부 구성은 화면이 담당) */
.layout-kind-split-panel .app-content { padding: ${m.padding}px; }

/* card-grid: 메인 영역 그리드는 위의 .app-content.is-grid 규칙이 담당 */

/* ════════════════════════════ composite-view 공통 ════════════════════════════ */
.composite-view {
  max-width: 1400px;
  margin: 0 auto;
}
.composite-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e6ef;
}
.composite-title { margin: 0 0 4px; font-size: 20px; font-weight: 600; color: #0f172a; }
.composite-subtitle { font-size: 13px; color: #64748b; }
`;
}

/* ════════════════════════════ utilities ════════════════════════════ */

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function errorDoc(msg) {
  return `<!DOCTYPE html><html><body style="padding:32px;font-family:sans-serif;color:#b91c1c">${escapeHtml(msg)}</body></html>`;
}

const BASE_CSS = `
* { box-sizing: border-box; }
body { margin: 0; }
`;
