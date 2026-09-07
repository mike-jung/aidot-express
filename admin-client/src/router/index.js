import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useUiFlagsStore } from '../stores/uiFlags';

/**
 * EAI 라우트 공통 가드 — generatorEnabled flag 가 꺼져있으면 /controllers 로 리다이렉트.
 *  메뉴 숨김만으로는 직접 URL 입력을 막지 못하므로 라우팅 단계에서도 차단한다.
 *  (서버 측에서도 404 처리되므로 이중 방어)
 */
async function mciGeneratorGuard() {
  const flags = useUiFlagsStore();
  if (!flags.loaded) await flags.load();
  if (!flags.mciGeneratorEnabled) {
    return { name: 'controllers' };
  }
  return true;
}

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home',                  component: () => import('../views/Home.vue') },
      { path: 'dashboard', name: 'dashboard',     component: () => import('../views/DashboardPage.vue') },
      { path: 'controllers', name: 'controllers', component: () => import('../views/ControllerList.vue') },
      { path: 'controllers/mci/new', name: 'mci-controller-new',
        component: () => import('../views/MciControllerNew.vue'),
        beforeEnter: mciGeneratorGuard },
      { path: 'controllers/mci/:id/edit', name: 'mci-controller-edit',
        component: () => import('../views/MciControllerNew.vue'),
        beforeEnter: mciGeneratorGuard },
      { path: 'controllers/mci/templates', name: 'mci-templates',
        component: () => import('../views/MciTemplateEditor.vue'),
        beforeEnter: mciGeneratorGuard },
      { path: 'controllers/mci/abbreviations', name: 'mci-abbreviations',
        component: () => import('../views/MciAbbreviationsEditor.vue'),
        beforeEnter: mciGeneratorGuard },
      { path: 'services', name: 'services',       component: () => import('../views/ServiceList.vue') },
      { path: 'sqls', name: 'sqls',               component: () => import('../views/SqlList.vue') },
      { path: 'secure-columns', name: 'secure-columns', component: () => import('../views/SecureColumnsPage.vue') },
      { path: 'api-tester', name: 'api-tester',   component: () => import('../views/ApiTesterPage.vue') },
      { path: 'monitoring', name: 'monitoring',   component: () => import('../views/MonitoringPage.vue') },
      { path: 'access-stats', name: 'access-stats', component: () => import('../views/AccessStatsPage.vue') },
      { path: 'log-files', name: 'logFiles',      component: () => import('../views/LogsPage.vue') },
      // v1.8.0: 요청 추적 — 로그 바로 옆에 둔다 (같은 조사 흐름에서 오간다)
      { path: 'trace', name: 'trace',             component: () => import('../views/TraceExplorer.vue') },
      { path: 'logs',  name: 'logs',              component: () => import('../views/LogExplorer.vue') },
      { path: 'ha', name: 'ha',                component: () => import('../views/HaPage.vue'),
        meta: { title: 'ha' } },
      { path: 'users', name: 'users',             component: () => import('../views/UserList.vue'),
        meta: { requiresAuth: true, requiresRole: 'admin' } },
      { path: 'scenarios', name: 'scenarios',                  component: () => import('../views/ScenarioList.vue') },
      { path: 'scenarios/:id/edit', name: 'scenario-edit',     component: () => import('../views/ScenarioEditor.vue') },
      { path: 'scenarios/:id/run',  name: 'scenario-run',      component: () => import('../views/ScenarioRun.vue') },
      { path: 'backup',  name: 'backup',  component: () => import('../views/BackupPage.vue') },
      { path: 'openapi', name: 'openapi', component: () => import('../views/OpenApiPage.vue') },

      // Screen Designer — 화면 디자이너 (프로젝트 기반 Vue3 코드 제너레이터)
      //   /screen-designer                                 — 프로젝트 목록
      //   /screen-designer/:id                             — 프로젝트 편집 (Layout/Screens/Preview/Export 탭)
      //   /screen-designer/:id/screen/:screenId            — 단일 화면 Composite Studio
      { path: 'screen-designer', name: 'screen-projects',
        component: () => import('../views/screen-designer/ProjectListView.vue') },
      { path: 'screen-designer/:id', name: 'screen-project-edit',
        component: () => import('../views/screen-designer/ProjectEditorView.vue') },
      { path: 'screen-designer/:id/screen/:screenId', name: 'screen-studio',
        component: () => import('../views/screen-designer/ScreenStudioView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'home' };
  }
  // role 가드 — meta.requiresRole 이 지정된 페이지는 해당 role 사용자만
  if (to.meta.requiresRole) {
    const userRole = auth.user?.role;
    if (userRole !== to.meta.requiresRole) {
      return { name: 'home' };
    }
  }
  return true;
});

export default router;
