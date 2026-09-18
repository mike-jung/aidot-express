/** Vue 3 teaching scaffold: preserve the WT-frontend directories and entry points. */
import { pascal } from '../screens/helpers.js';
import { routePathFor, viewName } from '../screens/compositeGen.js';

// npm latest stable, checked 2026-09-17. Exact versions keep classroom installs consistent.
export const FRONTEND_DEPENDENCIES = Object.freeze({
  '@eonasdan/tempus-dominus': '6.10.4',
  '@fortawesome/fontawesome-free': '7.3.1',
  axios: '1.20.0', bootstrap: '5.3.8', 'bootstrap-icons': '1.13.1',
  'chart.js': '4.5.1', 'chartjs-plugin-annotation': '3.1.0', moment: '2.31.0',
  pinia: '4.0.3', vue: '3.5.43', 'vue-chartjs': '5.3.4', 'vue-router': '5.3.1',
});
export const FRONTEND_DEV_DEPENDENCIES = Object.freeze({ '@vitejs/plugin-vue': '6.0.9', vite: '8.3.0' });
const file = (path, content) => ({ path, content, source: 'scaffold' });
const html = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function genScaffold(project, lang) {
  const metronic = project.config?.cssFramework === 'metronic';
  const name = String(project.name || 'generated-app').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[._-]+|[._-]+$/g, '').slice(0,80) || 'generated-app';
  return [
    file('package.json', JSON.stringify({ name, version: '0.1.0', private: true, type: 'module',
      engines: { node: '>=22.19.0' }, scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: FRONTEND_DEPENDENCIES, devDependencies: FRONTEND_DEV_DEPENDENCIES,
    }, null, 2) + '\n'),
    file('index.html', `<!DOCTYPE html>
<html lang="${String(lang || 'ko').startsWith('en') ? 'en' : 'ko'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${html(project.name || 'App')}</title>
${metronic ? `  <!-- Copy your licensed Metronic assets to public/assets, as in WT-frontend. -->
  <link rel="stylesheet" href="%BASE_URL%assets/plugins/global/plugins.bundle.css" />
  <link rel="stylesheet" href="%BASE_URL%assets/css/style.bundle.css" />` : ''}
</head>
<body${metronic ? ' id="kt_app_body" class="app-default"' : ''}>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
`),
    file('vite.config.js', `import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:7901';
  const apiBase = env.VITE_API_BASE_URL || '/api';
  const proxyPath = apiBase.startsWith('/') && !apiBase.startsWith('//') ? apiBase : '/api';
  return {
    base: env.VITE_APP_BASE || '/',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      // 개발 중 API 요청을 서버로 전달한다. HTTPS 인증서 검증은 유지한다.
      proxy: {
        [proxyPath]: {
          target,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
`),
    file('jsconfig.json', JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['./src/*'] } }, exclude: ['node_modules', 'dist'] }, null, 2) + '\n'),
    file('.gitignore', 'node_modules/\ndist/\n.env.local\n.env.*.local\n*.log\n'),
    file('.env', environment(project)),
    file('.env.example', environment(project)),
    file('src/main.js', `import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from '@/stores/auth';

// 모든 화면이 같은 Pinia와 Router 인스턴스를 사용한다.
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

async function start() {
  // 인증을 사용하는 프로젝트는 쿠키로 로그인 상태를 먼저 복원한다.
  if (import.meta.env.VITE_AUTH_ENABLED === 'true') {
    await useAuthStore(pinia).bootstrap();
  }

  await router.isReady();
  app.mount('#app');
}

start();
`),
    file('src/App.vue', `<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>

<script setup>
import { RouterView } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
</script>
`),
    file('src/assets/base.css', `:root { font-family: "Segoe UI", "Malgun Gothic", sans-serif; color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; }
button, input, select, textarea { font: inherit; }
button:focus-visible, a:focus-visible { outline: 3px solid #93b4fa; outline-offset: 3px; }
`),
    file('src/assets/main.css', `@import './base.css';

#app { min-height: 100dvh; width: 100%; }
main, .composite-view, .row > * { min-width: 0; }
.composite-view { width: 100%; }
.table-responsive { overscroll-behavior-x: contain; }
@media (max-width: 767px) {
  [data-layout-kind] > .d-flex.flex-grow-1 { flex-direction: column; }
  [data-layout-kind] > .d-flex.flex-grow-1 > aside { width: 100% !important; border-right: 0 !important; }
  [data-layout-kind] main { padding: 12px !important; }
}
/* Metronic's drawer normally needs its theme runtime. Keep mobile navigation
   usable with Vue and CSS, without a second Bootstrap/DOM runtime. */
@media (max-width: 991.98px) {
  #kt_app_wrapper { margin-left: 0 !important; margin-right: 0 !important; padding-left: 0 !important; padding-right: 0 !important; display: flex !important; flex-direction: column !important; }
  #kt_app_sidebar { display: flex !important; position: static !important; transform: none !important; width: 100% !important; height: auto !important; margin: 0 !important; }
  #kt_app_sidebar .app-sidebar-logo { display: none !important; }
  #kt_app_sidebar_menu_wrapper { margin: 8px 0 !important; }
  #kt_app_main { width: 100%; min-width: 0; margin: 0 !important; }
  #kt_app_header { left: 0 !important; right: 0 !important; width: auto !important; }
  #kt_app_content .app-container { padding: 12px !important; }
}
`),
    file('public/assets/README.md', `# Static assets\n\nKeep images, fonts and theme bundles here, matching WT-frontend.\nThey are served from /assets (or the configured VITE_APP_BASE).\n\nFor Metronic, copy your licensed WT-frontend public/assets contents here.\nRequired CSS: plugins/global/plugins.bundle.css and css/style.bundle.css.\nThe generator uses Vue for navigation and dialog state; do not add duplicate\nBootstrap, jQuery, charts or unused CDN scripts to index.html.\n`),
    file('src/views/WelcomeView.vue', `<script setup>
// The initial route when the project has no parameter-free screen.
</script>

<template><section class="card"><div class="card-body"><h1 class="h5">${html(project.name || 'App')}</h1><p class="text-secondary mb-0">${String(lang || '').startsWith('en') ? 'Choose a screen from the menu.' : '메뉴에서 화면을 선택해 주세요.'}</p></div></section></template>\n`),
    genReadme(project, lang),
  ];
}

function environment(project) {
  let target = 'http://localhost:7901';
  let base = '/api';
  const configured = String(project.config?.apiBaseUrl || '').trim();
  if (configured) {
    if (/^https?:\/\//i.test(configured)) {
      const parsed = new URL(configured);
      if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('API URL must not include credentials, query or fragment');
      target = parsed.origin;
      if (parsed.pathname !== '/' && parsed.pathname !== '/api' && parsed.pathname !== '/api/') base = parsed.origin + parsed.pathname.replace(/\/$/, '');
    } else if (/^\/(?!\/)[^\r\n#'"`]*$/.test(configured)) base = configured.replace(/\/$/, '') || '/api';
    else throw new Error('Use an HTTP(S) server URL or an absolute API path');
  }
  return `# Public client configuration only; never put secrets in VITE_* variables.\nVITE_API_BASE_URL=${base}\nVITE_API_PROXY_TARGET=${target}\nVITE_API_TIMEOUT=15000\nVITE_AUTH_ENABLED=false\nVITE_APP_BASE=/\n# HTTPS private CA, if required for the Vite proxy: set NODE_EXTRA_CA_CERTS before npm run dev.\n`;
}

export function genRouterIndex(composites = []) {
  const routes = composites.map(spec => `    {
      path: ${JSON.stringify(routePathFor(spec))},
      name: ${JSON.stringify(pascal(viewName(spec)))},
      props: true,
      component: () => import('../views/${viewName(spec)}.vue'),
    },`);

  if (!composites.some(spec => routePathFor(spec) === '/')) {
    const firstStatic = composites.find(spec => !routePathFor(spec).includes(':'));
    routes.unshift(firstStatic
      ? `    { path: '/', redirect: ${JSON.stringify(routePathFor(firstStatic))} },`
      : `    {
      path: '/',
      name: 'Welcome',
      component: () => import('../views/WelcomeView.vue'),
    },`);
  }
  return file('src/router/index.js', `import { createRouter, createWebHistory } from 'vue-router';

// 화면은 처음 이동할 때 불러오고, 경로 파라미터는 props로 전달한다.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
${routes.join('\n')}
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
`);
}

function genReadme(project, lang) {
  const en = String(lang || '').startsWith('en');
  const text = en ? `# ${project.name || 'Generated project'}

Vue 3 + Vite, preserving the WT-frontend teaching structure. All Vue components
use JavaScript with script setup. Run with Node.js 22.19+ (Node 24 recommended).

\`npm install\` → \`npm run dev\`; production build: \`npm run build\`.
Commit the generated package-lock.json and use \`npm ci\` for subsequent installs.

- src/main.js and src/App.vue: application entry and RouterView.
- src/router/index.js: all routes, with lazy imports from src/views.
- src/api/axios.js: shared Axios instance, configuration, errors and authentication.
- src/stores: ref + defineStore setup stores; views use storeToRefs.
- src/views: generated screens. src/components: layouts and reusable widgets.
- src/assets/base.css and main.css: base and responsive application styles.
- public/assets: static images, fonts and optional licensed Metronic bundles.

Edit .env: VITE_API_PROXY_TARGET points to your API server. Development uses /api
through the Vite proxy; production must proxy /api as well, or set
VITE_API_BASE_URL to an explicit API origin and configure server CORS.
Set VITE_AUTH_ENABLED=true when using the application's /api/auth endpoints.
Do not put secrets in VITE_* variables. For a private HTTPS certificate, trust its
CA with NODE_EXTRA_CA_CERTS before running Vite; TLS verification stays enabled.

Stores preserve query/page state, cancel superseded reads and expose errors.
Writes reject on failure; a form closes only after the write succeeds.
Axios responses keep the normal res.data shape; unwrapResponse(res) extracts the
aidot-express envelope. /api is not duplicated when endpoint paths already have it.

Metronic selection: copy your licensed public/assets from WT-frontend into this
project before running it. No commercial theme binaries are redistributed here.
The supplied chart/date/icon packages remain available for your lesson code.

Reading the code: View → Store → api/axios.js → server.
The Axios module shares server settings, authentication and response helpers.
Stores own data/loading/error state; views bind that state and call actions.
A one-off request can also import the same api instance directly in a view.
Read actions handle errors in the store, so lifecycle calls need no void prefix.
Write actions reject on failure, so forms must await them before closing.
` : `# ${project.name || '생성된 프로젝트'}

WT-frontend의 강의용 기본 구조를 유지한 Vue3 + Vite 프로젝트입니다.
JavaScript와 script setup을 사용합니다. Node.js 22.19 이상에서 실행하세요.

\`npm install\` → \`npm run dev\`; 배포 빌드는 \`npm run build\`입니다.
처음 설치 후 생긴 package-lock.json을 보관하고 이후에는 \`npm ci\`를 사용하세요.

- src/main.js · src/App.vue: 앱 생성, Pinia/Router 등록, RouterView
- src/router/index.js: 화면 라우트와 views의 지연 로딩
- src/api/axios.js: 공통 Axios 인스턴스, 서버 주소, 오류·인증 처리
- src/stores: ref + defineStore 방식; 화면에서는 storeToRefs로 상태 사용
- src/views: 화면 파일; src/components: 공통 레이아웃과 위젯
- src/assets/base.css · main.css: 기본 스타일과 반응형 화면
- public/assets: 이미지·폰트·선택한 Metronic 테마

.env의 VITE_API_PROXY_TARGET에 서버 주소를 넣으세요. 개발 중 /api 요청은
Vite가 프록시합니다. 배포 시에도 /api를 서버로 프록시하거나
VITE_API_BASE_URL에 실제 API 주소를 넣고 서버의 CORS를 설정하세요.
일반 사용자 /api/auth 인증을 사용하면 VITE_AUTH_ENABLED=true로 설정합니다.
VITE_*에는 비밀 값을 넣지 마세요. 자체 HTTPS 인증서는 Vite 실행 전에
NODE_EXTRA_CA_CERTS로 신뢰할 CA를 지정합니다.

조회는 검색조건·페이지를 유지하고 이전 요청을 취소해 응답 역전을 막습니다.
저장은 실패 시 오류를 전달하며 대화상자는 성공한 뒤에 닫힙니다.
Axios의 res.data 형식은 그대로 유지하고, unwrapResponse(res)로 서버의
data를 꺼냅니다. /api가 중복되는 경로도 공통 모듈에서 처리합니다.

Metronic을 선택했다면 사용 권한이 있는 WT-frontend의 public/assets를
이 프로젝트의 public/assets로 복사하세요. 상용 테마 파일은 포함하지 않습니다.
참조 프로젝트의 차트·날짜·아이콘 패키지도 강의 코드에서 사용할 수 있습니다.

코드를 읽는 순서: View → Store → api/axios.js → 서버.
공통 Axios 모듈은 서버 주소·인증·응답 처리를, Store는 데이터·로딩·오류 상태를,
View는 화면 표시와 사용자 동작을 담당합니다. 한 화면에서만 쓰는 일회성 요청은
View에서도 같은 api 인스턴스를 가져와 호출할 수 있습니다.
조회 함수는 Store에서 오류를 처리하므로 생명주기 호출에 void가 필요하지 않습니다.
저장 함수는 실패를 호출자에게 전달하므로 폼에서는 await로 성공 여부를 확인합니다.
`;
  return file('README.md', text);
}
