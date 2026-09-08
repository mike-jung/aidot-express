/**
 * layoutGen — 프로젝트의 layout 설정에서 AppLayout/Header/Sidebar SFC 코드 생성.
 *
 *  Phase 28 (patch-07) 재작성:
 *   - 이전에는 9종 중 6종이 기본 3종으로 fallback 됐음 (`KIND_FALLBACK`).
 *   - 이제 9종 모두 고유한 AppLayout.vue 를 생성.
 *   - Metronic 의 경우 demo38 참고 구조 (data-kt-app-* body attr + app-* class) 반영.
 *     Bootstrap 의 경우 순수 utility class 만 사용.
 *
 *  9종 kind:
 *    sidebar-left   : 상단 타이틀 + 좌 사이드바 + 메인
 *    sidebar-dark   : 상단 타이틀 + 좌 어두운 사이드바 + 메인
 *    top-nav        : 상단 네비(메뉴 포함) + 메인 (사이드바 없음)
 *    sidebar-right  : 상단 타이틀 + 메인 + 우 사이드바
 *    sidebar-both   : 상단 타이틀 + 좌 메인 사이드바 + 메인 + 우 보조 패널
 *    top-and-side   : 상단 네비 + 좌 사이드바 + 메인 (2단계 네비)
 *    hero-landing   : 상단 네비 + Hero 섹션 + 메인 (랜딩)
 *    split-panel    : 상단 타이틀 + 좌 리스트 + 우 디테일 (메인 = 좌우 분할)
 *    card-grid      : 상단 타이틀 + 전체 메인이 카드 그리드 컨테이너
 *
 *  메뉴 유무:
 *    메뉴 있음 (사이드바): sidebar-left, sidebar-dark, sidebar-right, sidebar-both, top-and-side
 *    메뉴 있음 (상단)   : top-nav, top-and-side(상단), hero-landing
 *    메뉴 없음          : split-panel, card-grid
 */
import { escapeAttr } from '../screens/helpers.js';

/** 메뉴가 사이드바에 들어가는 kind. */
const SIDEBAR_KINDS = new Set([
  'sidebar-left', 'sidebar-dark', 'sidebar-right', 'sidebar-both', 'top-and-side',
]);
/** 메뉴가 상단 네비에 들어가는 kind. */
const TOP_NAV_KINDS = new Set([
  'top-nav', 'top-and-side', 'hero-landing',
]);
/** 보조 사이드바(우측)가 있는 kind. */
const AUX_SIDEBAR_KINDS = new Set(['sidebar-both']);

export function genLayout(layout, cssFramework = 'bootstrap') {
  const l = layout || {};
  const kind = l.kind || 'sidebar-left';
  const title = l.title || {};
  const sidebar = l.sidebar || {};
  const main = l.mainArea || {};

  const isMetronic = cssFramework === 'metronic';
  const files = [];

  files.push(genAppLayout(kind, title, sidebar, main, isMetronic));
  files.push(genAppHeader(title, isMetronic, kind));
  if (SIDEBAR_KINDS.has(kind)) {
    files.push(genAppSidebar(sidebar, /*dark*/ kind === 'sidebar-dark' || kind === 'sidebar-both', isMetronic));
  }
  if (TOP_NAV_KINDS.has(kind)) {
    files.push(genTopNav(sidebar, isMetronic, kind));
  }
  if (AUX_SIDEBAR_KINDS.has(kind)) {
    files.push(genAppAuxPanel(isMetronic));
  }

  return files;
}

/* ════════════════════════════ AppLayout.vue ════════════════════════════ */

function genAppLayout(kind, title, sidebar, main, isMetronic) {
  if (isMetronic) {
    return isMetronic_AppLayout(kind, title, sidebar, main);
  }
  return bootstrap_AppLayout(kind, title, sidebar, main);
}

// ─────────────────────────────────────────────────────────────
//  Bootstrap 5 AppLayout — utility class 만 사용
// ─────────────────────────────────────────────────────────────
function bootstrap_AppLayout(kind, title, sidebar, main) {
  const sidebarWidth = Math.max(160, Math.min(320, Number(sidebar.width) || 220));
  const mainBg = main.bgColor || '#f5f7fa';
  const mainPadding = Math.max(0, Math.min(48, Number(main.padding) || 16));

  // 필요한 import 결정
  const imports = ['AppHeader'];
  if (SIDEBAR_KINDS.has(kind)) imports.push('AppSidebar');
  if (TOP_NAV_KINDS.has(kind)) imports.push('AppTopNav');
  if (AUX_SIDEBAR_KINDS.has(kind)) imports.push('AppAuxPanel');

  const importLines = imports.map((n) => `import ${n} from './components/${n}.vue';`).join('\n');

  // kind 별 template
  let tpl;
  switch (kind) {
    case 'sidebar-left':
    case 'sidebar-dark': {
      tpl = `
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${sidebarWidth}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${mainBg}; padding: ${mainPadding}px;">
        <RouterView />
      </main>
    </div>`;
      break;
    }

    case 'sidebar-right': {
      tpl = `
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <main class="flex-grow-1" style="background-color: ${mainBg}; padding: ${mainPadding}px;">
        <RouterView />
      </main>
      <aside class="border-start flex-shrink-0" style="width: ${sidebarWidth}px;">
        <AppSidebar />
      </aside>
    </div>`;
      break;
    }

    case 'sidebar-both': {
      const auxWidth = Math.round(sidebarWidth * 0.6);
      tpl = `
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${sidebarWidth}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${mainBg}; padding: ${mainPadding}px;">
        <RouterView />
      </main>
      <aside class="border-start flex-shrink-0" style="width: ${auxWidth}px;">
        <AppAuxPanel />
      </aside>
    </div>`;
      break;
    }

    case 'top-nav': {
      tpl = `
    <AppTopNav />
    <main class="flex-grow-1" style="background-color: ${mainBg}; padding: ${mainPadding}px;">
      <RouterView />
    </main>`;
      break;
    }

    case 'top-and-side': {
      // 상단 네비 + 좌 사이드바
      tpl = `
    <AppTopNav />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${sidebarWidth}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${mainBg}; padding: ${mainPadding}px;">
        <RouterView />
      </main>
    </div>`;
      break;
    }

    case 'hero-landing': {
      // 랜딩 — 메뉴는 상단에 최소한만 노출, main 이 직접 전체 페이지 Hero/섹션을 그림
      tpl = `
    <AppTopNav />
    <main class="flex-grow-1" style="background-color: ${mainBg};">
      <RouterView />
    </main>`;
      break;
    }

    case 'split-panel': {
      // 화면 내부가 좌/우 분할 구조라는 의미.
      // AppLayout 은 상단 타이틀 + 메인 구조만 담당. 분할은 개별 화면에서.
      tpl = `
    <AppHeader />
    <main class="flex-grow-1 d-flex" style="background-color: ${mainBg}; padding: ${mainPadding}px;">
      <RouterView />
    </main>`;
      break;
    }

    case 'card-grid': {
      // 카드 그리드 — main 이 container-fluid + padding 만 제공
      tpl = `
    <AppHeader />
    <main class="flex-grow-1 container-fluid" style="background-color: ${mainBg}; padding: ${mainPadding}px;">
      <RouterView />
    </main>`;
      break;
    }

    default: {
      // fallback (알 수 없는 kind) — sidebar-left 구조
      tpl = `
    <AppHeader />
    <div class="d-flex flex-grow-1">
      <aside class="border-end flex-shrink-0" style="width: ${sidebarWidth}px;">
        <AppSidebar />
      </aside>
      <main class="flex-grow-1" style="background-color: ${mainBg}; padding: ${mainPadding}px;">
        <RouterView />
      </main>
    </div>`;
    }
  }

  const content = `<script setup>
${importLines}
</script>

<template>
  <div class="d-flex flex-column min-vh-100" data-layout-kind="${kind}">${tpl}
  </div>
</template>
`;
  return { path: 'src/layouts/AppLayout.vue', content, source: 'scaffold' };
}

// ─────────────────────────────────────────────────────────────
//  Metronic AppLayout — demo38 의 app-* 구조 재현
//
//  Metronic 은 body 의 data-kt-app-* attribute 와 HTML 구조 조합으로 layout 모양을
//  결정. 각 kind 별로 적절한 data-attribute 와 app-container 구조를 생성.
//
//  참고: demo38/index.html (sidebar-left 기본), landing.html (hero-landing),
//        layouts.html (top-nav 가이드) 의 구조를 기반으로 했음.
// ─────────────────────────────────────────────────────────────
function isMetronic_AppLayout(kind, title, sidebar, main) {
  // Metronic 의 body attribute 는 main.js 에서 런타임 세팅되므로
  // 여기서는 AppLayout 템플릿에서 useBodyAttrs 를 호출하도록.
  // 하지만 단순화를 위해 AppLayout.vue 가 mount 될 때 document.body 에 직접 설정하는 방식 사용.

  const imports = ['AppHeader'];
  if (SIDEBAR_KINDS.has(kind)) imports.push('AppSidebar');
  if (TOP_NAV_KINDS.has(kind)) imports.push('AppTopNav');
  if (AUX_SIDEBAR_KINDS.has(kind)) imports.push('AppAuxPanel');
  const importLines = imports.map((n) => `import ${n} from './components/${n}.vue';`).join('\n');

  // kind 별 body 의 data-kt-app-* 속성 구성.
  //  Metronic 규칙:
  //   - data-kt-app-sidebar-enabled=true 면 사이드바 활성
  //   - data-kt-app-aside-enabled=true 면 보조 패널 활성
  //   - data-kt-app-toolbar-enabled=true 면 상단 툴바 표시
  const bodyAttrs = metronicBodyAttrs(kind);

  // 내부 구조 — demo38 를 기반으로 kind 별 다르게 구성.
  let innerTpl;
  switch (kind) {
    case 'sidebar-left':
    case 'sidebar-dark':
      // demo38/index.html 기본 구조: header + sidebar + main.
      innerTpl = `
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <AppSidebar />
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`;
      break;

    case 'sidebar-right':
      // 같은 구조지만 body attr 로 사이드바를 오른쪽으로.
      innerTpl = `
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
        <AppSidebar />
      </div>`;
      break;

    case 'sidebar-both':
      // 좌 사이드바 + 메인 + 우 보조 패널.
      innerTpl = `
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <AppSidebar />
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
        <AppAuxPanel />
      </div>`;
      break;

    case 'top-nav':
      // 사이드바 없이 상단 네비만.
      innerTpl = `
      <AppHeader />
      <AppTopNav />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`;
      break;

    case 'top-and-side':
      // 상단 네비 + 좌 사이드바.
      innerTpl = `
      <AppHeader />
      <AppTopNav />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <AppSidebar />
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`;
      break;

    case 'hero-landing':
      // 랜딩 — Metronic landing.html 패턴. header 와 main 만, container 생략.
      // Hero 섹션은 개별 화면이 그림.
      innerTpl = `
      <AppTopNav />
      <div class="flex-column-fluid" id="kt_app_content">
        <RouterView />
      </div>`;
      break;

    case 'split-panel':
      // 좌우 분할 — 메인만 2-column.
      innerTpl = `
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column-fluid">
            <div class="app-content flex-column-fluid d-flex" id="kt_app_content">
              <div class="app-container container-xxl d-flex">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`;
      break;

    case 'card-grid':
      // card-grid — container-fluid 로 공간을 넓게 확보.
      innerTpl = `
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-fluid">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`;
      break;

    default:
      // fallback → sidebar-left
      innerTpl = `
      <AppHeader />
      <div class="app-wrapper flex-column flex-row-fluid" id="kt_app_wrapper">
        <AppSidebar />
        <div class="app-main flex-column flex-row-fluid" id="kt_app_main">
          <div class="d-flex flex-column flex-column-fluid">
            <div class="app-content flex-column-fluid" id="kt_app_content">
              <div class="app-container container-xxl">
                <RouterView />
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  const attrPairs = Object.entries(bodyAttrs)
    .map(([k, v]) => `[${JSON.stringify(k)}, ${JSON.stringify(v)}]`).join(', ');

  const content = `<script setup>
// Metronic 은 body 의 data-kt-app-* attribute 조합으로 layout 모양을 결정합니다.
// demo38 의 body 를 참고하여 mount 시점에 적절한 속성을 설정합니다.
import { onMounted, onBeforeUnmount } from 'vue';
${importLines}

const BODY_ATTRS = [${attrPairs}];
const prevAttrs = new Map();

onMounted(() => {
  const body = document.body;
  for (const [k, v] of BODY_ATTRS) {
    prevAttrs.set(k, body.getAttribute(k));
    body.setAttribute(k, v);
  }
  body.classList.add('app-default');
});

onBeforeUnmount(() => {
  const body = document.body;
  for (const [k, prev] of prevAttrs.entries()) {
    if (prev === null) body.removeAttribute(k);
    else body.setAttribute(k, prev);
  }
  body.classList.remove('app-default');
});
</script>

<template>
  <div class="d-flex flex-column flex-root app-root" id="kt_app_root" data-layout-kind="${kind}">
    <div class="app-page flex-column flex-column-fluid" id="kt_app_page">${innerTpl}
    </div>
  </div>
</template>
`;
  return { path: 'src/layouts/AppLayout.vue', content, source: 'scaffold' };
}

/** Metronic 의 body data-kt-app-* 세팅. demo38/index.html 의 body attr 참고. */
function metronicBodyAttrs(kind) {
  // 공통 기본값 (demo38 index.html)
  const base = {
    'data-kt-app-layout': 'dark-sidebar',   // 'dark-sidebar' | 'light-sidebar' | 'dark-header'
    'data-kt-app-header-fixed': 'true',
    'data-kt-app-header-fixed-mobile': 'true',
    'data-kt-app-sidebar-enabled': 'true',
    'data-kt-app-sidebar-fixed': 'true',
    'data-kt-app-sidebar-hoverable': 'true',
    'data-kt-app-sidebar-push-header': 'true',
    'data-kt-app-sidebar-push-toolbar': 'true',
    'data-kt-app-sidebar-push-footer': 'true',
    'data-kt-app-toolbar-enabled': 'true',
  };

  switch (kind) {
    case 'sidebar-left':
      return { ...base, 'data-kt-app-layout': 'light-sidebar' };
    case 'sidebar-dark':
      return { ...base, 'data-kt-app-layout': 'dark-sidebar' };
    case 'sidebar-right':
      return { ...base, 'data-kt-app-layout': 'light-sidebar', 'data-kt-app-sidebar-position': 'end' };
    case 'sidebar-both':
      return { ...base, 'data-kt-app-layout': 'dark-sidebar', 'data-kt-app-aside-enabled': 'true' };
    case 'top-nav':
      return {
        'data-kt-app-layout': 'dark-header',
        'data-kt-app-header-fixed': 'true',
        'data-kt-app-sidebar-enabled': 'false',
        'data-kt-app-toolbar-enabled': 'true',
      };
    case 'top-and-side':
      return { ...base, 'data-kt-app-layout': 'dark-header' };
    case 'hero-landing':
      return {
        'data-kt-app-layout': 'blank',
        'data-kt-app-sidebar-enabled': 'false',
        'data-kt-app-header-fixed': 'false',
      };
    case 'split-panel':
      return { ...base, 'data-kt-app-layout': 'light-sidebar', 'data-kt-app-sidebar-enabled': 'false' };
    case 'card-grid':
      return { ...base, 'data-kt-app-layout': 'light-sidebar', 'data-kt-app-sidebar-enabled': 'false' };
    default:
      return base;
  }
}

/* ════════════════════════════ AppHeader.vue ════════════════════════════ */

function genAppHeader(title, isMetronic, kind) {
  const text = title.text || '';
  const logo = title.logoUrl || '';
  const height = Math.max(40, Math.min(120, Number(title.height) || 60));

  if (isMetronic) {
    // Metronic — app-header + app-container. 랜딩은 landing-header.
    const isLanding = kind === 'hero-landing';
    if (isLanding) {
      const content = `<script setup></script>

<template>
  <div class="landing-header" data-kt-sticky="true" data-kt-sticky-name="landing-header" data-kt-sticky-offset="{default: '200px', lg: '300px'}">
    <div class="container">
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center flex-equal">
          ${logo ? `<img alt="logo" src="${escapeAttr(logo)}" class="h-40px" />` : ''}
          <span class="h3 m-0 ms-3 fw-bold">${text}</span>
        </div>
      </div>
    </div>
  </div>
</template>
`;
      return { path: 'src/layouts/components/AppHeader.vue', content, source: 'scaffold' };
    }

    const content = `<script setup></script>

<template>
  <div class="app-header" id="kt_app_header">
    <div class="app-container container-xxl d-flex align-items-stretch justify-content-between">
      <div class="d-flex align-items-center">
        ${logo ? `<img src="${escapeAttr(logo)}" alt="logo" class="h-40px me-3" />` : ''}
        <h3 class="app-header-title m-0 fw-bold">${text}</h3>
      </div>
    </div>
  </div>
</template>
`;
    return { path: 'src/layouts/components/AppHeader.vue', content, source: 'scaffold' };
  }

  const bg = title.bgColor || '#ffffff';
  const fg = title.fgColor || '#0f172a';

  const content = `<script setup></script>

<template>
  <header class="d-flex align-items-center border-bottom px-3"
          style="height: ${height}px; background-color: ${bg}; color: ${fg};">
    ${logo ? `<img src="${escapeAttr(logo)}" alt="logo" class="me-2" style="max-height: ${height - 16}px;" />` : ''}
    <h1 class="h5 m-0">${text}</h1>
  </header>
</template>
`;
  return { path: 'src/layouts/components/AppHeader.vue', content, source: 'scaffold' };
}

/* ════════════════════════════ AppSidebar.vue ════════════════════════════ */

function genAppSidebar(sidebar, dark, isMetronic) {
  const items = Array.isArray(sidebar.items) ? sidebar.items : [];

  if (isMetronic) {
    const menuItems = items.map((it) => {
      const lbl = escapeAttr(it.label || '');
      const path = escapeAttr(it.path || '#');
      const icon = it.icon || 'bi-circle';
      return `        <div class="menu-item">
          <RouterLink to="${path}" class="menu-link">
            <span class="menu-icon">
              <i class="bi ${icon}"></i>
            </span>
            <span class="menu-title">${lbl}</span>
          </RouterLink>
        </div>`;
    }).join('\n');

    const content = `<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <div id="kt_app_sidebar"
       class="app-sidebar flex-column"
       data-kt-drawer="true"
       data-kt-drawer-name="app-sidebar"
       data-kt-drawer-activate="{default: true, lg: false}"
       data-kt-drawer-overlay="true"
       data-kt-drawer-width="225px"
       data-kt-drawer-direction="start"
       data-kt-drawer-toggle="#kt_app_sidebar_mobile_toggle">
    <div class="app-sidebar-logo px-6 py-4" id="kt_app_sidebar_logo">
      <RouterLink to="/" class="d-flex align-items-center">
        <span class="fs-3 fw-bold text-white">${escapeAttr(sidebar.brand || 'App')}</span>
      </RouterLink>
    </div>
    <div class="app-sidebar-menu overflow-hidden flex-column-fluid">
      <div id="kt_app_sidebar_menu_wrapper"
           class="app-sidebar-wrapper hover-scroll-overlay-y my-5">
        <div class="menu menu-column menu-rounded menu-sub-indention px-3">
${menuItems || '          <!-- 메뉴 항목 없음 -->'}
        </div>
      </div>
    </div>
  </div>
</template>
`;
    return { path: 'src/layouts/components/AppSidebar.vue', content, source: 'scaffold' };
  }

  // Bootstrap 5
  const bgClass = dark ? 'bg-dark text-white' : 'bg-light';
  const menuItems = items.map((it) => {
    const lbl = escapeAttr(it.label || '');
    const path = escapeAttr(it.path || '#');
    const icon = it.icon || 'bi-file-earmark';
    return `    <li class="nav-item">
      <RouterLink to="${path}" class="nav-link ${dark ? 'text-white-50' : ''}">
        <i class="bi ${icon} me-2"></i>${lbl}
      </RouterLink>
    </li>`;
  }).join('\n');

  const content = `<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <nav class="d-flex flex-column h-100 ${bgClass} p-2">
    <ul class="nav flex-column">
${menuItems || '      <!-- 메뉴 항목 없음 -->'}
    </ul>
  </nav>
</template>
`;
  return { path: 'src/layouts/components/AppSidebar.vue', content, source: 'scaffold' };
}

/* ════════════════════════════ AppTopNav.vue ════════════════════════════ */

function genTopNav(sidebar, isMetronic, kind) {
  const items = Array.isArray(sidebar.items) ? sidebar.items : [];
  // top-and-side 의 경우 top 에는 상위 메뉴만 (첫 3개), 사이드에 서브.
  // 간단화를 위해 동일 items 공유.

  if (isMetronic) {
    // 랜딩 페이지: landing-menu 스타일
    if (kind === 'hero-landing') {
      const links = items.map((it) => {
        const lbl = escapeAttr(it.label || '');
        const path = escapeAttr(it.path || '#');
        return `      <div class="menu-item">
        <RouterLink to="${path}" class="menu-link nav-link py-3 px-4 px-xxl-6">
          <span class="menu-title">${lbl}</span>
        </RouterLink>
      </div>`;
      }).join('\n');

      const content = `<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="landing-menu-wrapper d-flex align-items-center flex-equal flex-lg-end" data-kt-drawer="true" data-kt-drawer-name="landing-menu">
    <div class="menu menu-rounded menu-column menu-lg-row menu-title-gray-500 menu-state-title-primary fw-semibold fs-6" id="kt_landing_menu">
${links || '      <!-- 메뉴 항목 없음 -->'}
    </div>
  </div>
</template>
`;
      return { path: 'src/layouts/components/AppTopNav.vue', content, source: 'scaffold' };
    }

    const links = items.map((it) => {
      const lbl = escapeAttr(it.label || '');
      const path = escapeAttr(it.path || '#');
      return `      <div class="menu-item">
        <RouterLink to="${path}" class="menu-link">
          <span class="menu-title">${lbl}</span>
        </RouterLink>
      </div>`;
    }).join('\n');

    const content = `<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="app-navbar app-container container-xxl">
    <div class="menu menu-rounded menu-column menu-lg-row menu-state-bg
                menu-title-gray-700 menu-state-icon-primary menu-state-bullet-primary
                menu-arrow-gray-400 fw-semibold my-5 my-lg-0 align-items-stretch">
${links || '      <!-- 메뉴 항목 없음 -->'}
    </div>
  </div>
</template>
`;
    return { path: 'src/layouts/components/AppTopNav.vue', content, source: 'scaffold' };
  }

  // Bootstrap 5 top navigation
  const links = items.map((it) => {
    const lbl = escapeAttr(it.label || '');
    const path = escapeAttr(it.path || '#');
    return `      <li class="nav-item">
        <RouterLink to="${path}" class="nav-link">${lbl}</RouterLink>
      </li>`;
  }).join('\n');

  // hero-landing 은 약간 다른 스타일 (투명/고정 헤더)
  if (kind === 'hero-landing') {
    const content = `<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary border-bottom sticky-top">
    <div class="container">
      <div class="navbar-nav d-flex flex-row gap-3">
${links || '        <!-- 메뉴 항목 없음 -->'}
      </div>
    </div>
  </nav>
</template>
`;
    return { path: 'src/layouts/components/AppTopNav.vue', content, source: 'scaffold' };
  }

  const content = `<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <nav class="border-bottom px-3 py-1 bg-body-tertiary">
    <ul class="nav nav-pills">
${links || '      <!-- 메뉴 항목 없음 -->'}
    </ul>
  </nav>
</template>
`;
  return { path: 'src/layouts/components/AppTopNav.vue', content, source: 'scaffold' };
}

/* ════════════════════════════ AppAuxPanel.vue ════════════════════════════ */
/**
 * Phase 28: sidebar-both 의 우측 보조 패널. 빈 placeholder 로 시작.
 *  사용자가 export 후 이 파일에 필요한 위젯을 직접 배치.
 */
function genAppAuxPanel(isMetronic) {
  if (isMetronic) {
    const content = `<script setup></script>

<template>
  <div class="app-aside flex-column" id="kt_app_aside" data-kt-app-aside-enabled="true">
    <div class="app-aside-wrapper p-5">
      <h6 class="text-muted">보조 패널</h6>
      <p class="text-muted small">이 영역에 알림 · 퀵 액션 등을 배치할 수 있습니다.</p>
    </div>
  </div>
</template>
`;
    return { path: 'src/layouts/components/AppAuxPanel.vue', content, source: 'scaffold' };
  }

  const content = `<script setup></script>

<template>
  <div class="d-flex flex-column h-100 bg-body-tertiary p-3">
    <h6 class="text-muted mb-2">보조 패널</h6>
    <p class="text-muted small mb-0">이 영역에 알림 · 퀵 액션 등을 배치할 수 있습니다.</p>
  </div>
</template>
`;
  return { path: 'src/layouts/components/AppAuxPanel.vue', content, source: 'scaffold' };
}
