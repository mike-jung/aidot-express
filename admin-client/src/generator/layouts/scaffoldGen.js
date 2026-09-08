/**
 * scaffoldGen — 프로젝트의 고정 스캐폴드 파일들 (entry point, router, config).
 *
 *  생성되는 파일:
 *   - index.html
 *   - package.json
 *   - vite.config.js
 *   - src/main.js
 *   - src/App.vue
 *   - src/router/index.js
 *   - README.md
 */
import { pascal, fileSafe } from '../screens/helpers.js';
import { genStrings } from '../genStrings.js';

export function genScaffold(project, lang) {
  const name = project.name || 'my-app';
  const cssFramework = project.config?.cssFramework || 'bootstrap';
  return [
    genIndexHtml(project, cssFramework),
    genPackageJson(name),
    genViteConfig(),
    genMainJs(cssFramework),
    genAppVue(),
    genReadme(project, lang),
  ];
}

export function genRouterIndex(composites = []) {
  const routeImports = composites.length
    ? `import compositeRoutes from './modules/composites';\n`
    : '';
  const spread = composites.length ? '  ...compositeRoutes,\n' : '';

  const content = `import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layouts/AppLayout.vue';
${routeImports}
const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [
${spread}    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
`;
  return { path: 'src/router/index.js', content, source: 'scaffold' };
}

function genIndexHtml(project, cssFramework) {
  const title = (project.name || 'App').replace(/</g, '');
  const isMetronic = cssFramework === 'metronic';

  // Phase 20: Metronic 선택 시 Metronic 의 실제 body class 와 data 속성 반영.
  //   Metronic 은 bootstrap 기반이지만 여러 추가 class 와 data-kt-app-* 속성으로
  //   layout / theme 를 제어한다. 그 규칙을 생성 코드에 반영.
  //
  // CDN 경로:
  //   - Metronic 은 상용 라이선스라 공식 CDN 이 없다. 사용자가 번들을 public/metronic/
  //     아래 배치하는 것을 가정한다 (POC 의 metronic store 와 통합하는 건 다음 phase).
  //   - Bootstrap / Metronic 아이콘은 KeenIcons (Metronic) 또는 Bootstrap Icons 로 분기.
  const cssLinks = isMetronic
    ? `<!-- Metronic v8 — bundle 은 public/metronic/assets/ 에 배치 -->
    <link rel="stylesheet" href="/metronic/assets/plugins/global/plugins.bundle.css" />
    <link rel="stylesheet" href="/metronic/assets/css/style.bundle.css" />`
    : `<!-- Bootstrap 5 · Bootstrap Icons 는 main.js 에서 패키지로 import 한다 (CDN 없이 동작) -->`;

  // Metronic 은 body 에 layout / theme / sidebar state 제어용 data-* 속성을 둔다.
  const bodyAttrs = isMetronic
    ? `id="kt_app_body"
      data-kt-app-layout="dark-sidebar"
      data-kt-app-header-fixed="true"
      data-kt-app-sidebar-enabled="true"
      data-kt-app-sidebar-fixed="true"
      data-kt-app-sidebar-hoverable="true"
      data-kt-app-sidebar-minimize-desktop-hoverable="true"
      data-kt-app-toolbar-enabled="true"
      class="app-default"`
    : '';

  const content = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${cssLinks}
</head>
<body ${bodyAttrs}>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
`;
  return { path: 'index.html', content, source: 'scaffold' };
}

function genPackageJson(name) {
  const safe = fileSafe(name.toLowerCase()) || 'my-app';
  const content = JSON.stringify({
    name: safe,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      vue: '^3.4.0',
      'vue-router': '^4.3.0',
      pinia: '^2.1.7',
      axios: '^1.7.0',
      /* ★ v1.11.7 — main.js 가 bootstrap.bundle.min.js 를 import 하는데 의존성에 없어 `npm run dev` 가
         "Rollup failed to resolve import bootstrap/..." 로 바로 실패했다 (실제로 빌드해 보고 잡았다).
         CSS·아이콘도 CDN 대신 패키지에서 — 인터넷이 없는 병원망에서도 뜨게. */
      bootstrap: '^5.3.3',
      'bootstrap-icons': '^1.11.3',
    },
    devDependencies: {
      '@vitejs/plugin-vue': '^5.0.4',
      vite: '^5.2.0',
    },
  }, null, 2);
  return { path: 'package.json', content, source: 'scaffold' };
}

function genViteConfig() {
  const content = `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  server: { port: 5180 },
});
`;
  return { path: 'vite.config.js', content, source: 'scaffold' };
}

function genMainJs(cssFramework) {
  // Metronic 이면 JS 번들도 필요
  const metronicScripts = cssFramework === 'metronic'
    ? `// Metronic 번들은 public/metronic 에 함께 배치됐다고 가정.
// 필요 시 index.html 이나 main.js 에서 script import 추가.\n`
    : `import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';\n`;

  const content = `import { createApp } from 'vue';
import { createPinia } from 'pinia';
${metronicScripts}import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
`;
  return { path: 'src/main.js', content, source: 'scaffold' };
}

function genAppVue() {
  const content = `<script setup>
// 루트 App — 라우터가 모든 뷰를 담당.
</script>

<template>
  <RouterView />
</template>
`;
  return { path: 'src/App.vue', content, source: 'scaffold' };
}

function genReadme(project, lang) {
  /* ★ v1.40.0 — README 도 선택한 언어로 낸다.
     받는 사람이 읽지 못하는 안내는 없느니만 못하다. */
  const en = String(lang || '').startsWith('en');
  const name = project.name || (en ? 'Generated project' : '생성된 프로젝트');
  const isMetronic = project.cssFramework === 'metronic';

  const metronicKo = `
## ⚠️ Metronic 번들 배치 (필수)

이 프로젝트는 **Metronic v8** 을 사용하므로 번들을 수동으로 배치해야 합니다:

\`\`\`
public/metronic/
└─ assets/          ← Metronic demo 의 assets 폴더를 그대로 복사
\`\`\`

1. Metronic 공식 사이트에서 HTML demo (예: demo38) 를 다운로드
2. 압축을 풀고 \`demo*/assets/\` 폴더 전체를 \`public/metronic/assets/\` 로 복사
3. \`npm run dev\` 실행

번들 없이 실행하면 스타일이 적용되지 않아 빈 화면이 뜹니다.
`;
  const metronicEn = `
## ⚠️ Metronic bundle (required)

This project uses **Metronic v8**, so you have to place the bundle yourself:

\`\`\`
public/metronic/
└─ assets/          ← copy the assets folder from a Metronic demo
\`\`\`

1. Download an HTML demo (for example demo38) from the Metronic site
2. Unpack it and copy the whole \`demo*/assets/\` folder to \`public/metronic/assets/\`
3. Run \`npm run dev\`

Without the bundle no styles load and the page comes up blank.
`;

  if (en) {
    return { path: 'README.md', content: `# ${name}

${project.description || 'A Vue 3 project generated by the screen designer.'}
${isMetronic ? metronicEn : ''}
## Running it

\`\`\`bash
npm install
npm run dev
\`\`\`

## Building

\`\`\`bash
npm run build
\`\`\`

## Stack

- Vue 3 (script setup) + Vite
- Vue Router + Pinia
- Axios (wrapped as apiClient)
- ${isMetronic ? 'Metronic v8 (commercial licence required)' : 'Bootstrap 5'}

## What was generated

\`\`\`
src/
├─ api/client.js           axios instance, unwraps the response envelope
├─ stores/                 Pinia stores
│  ├─ auth.js              authentication
│  └─ <n>Store.js          one per resource (list fetch and state)
├─ layouts/                layout (AppLayout with header and sidebar or top nav)
├─ components/widgets/     the widgets your screens use
└─ views/                  one file per screen
\`\`\`
` };
  }

  return { path: 'README.md', content: `# ${name}

${project.description || 'Screen Designer 로 자동 생성된 Vue3 프로젝트입니다.'}
${isMetronic ? metronicKo : ''}
## 실행

\`\`\`bash
npm install
npm run dev
\`\`\`

## 빌드

\`\`\`bash
npm run build
\`\`\`

## 스택

- Vue 3 (script setup) + Vite
- Vue Router + Pinia
- Axios (apiClient 래퍼)
- ${isMetronic ? 'Metronic v8 (상용 라이선스 필요)' : 'Bootstrap 5'}

## 생성된 구조

\`\`\`
src/
├─ api/client.js           axios 인스턴스 + envelope unwrap
├─ stores/                 Pinia 스토어
│  ├─ auth.js              인증
│  └─ <n>Store.js          각 resource 별 스토어 (list fetch + state)
├─ layouts/                레이아웃 (AppLayout + Header + Sidebar/TopNav)
├─ components/widgets/     화면이 쓰는 위젯들
└─ views/                  화면마다 한 파일
\`\`\`
` };
}
