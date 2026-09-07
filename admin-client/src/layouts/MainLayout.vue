<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
// ★ v1.10.0 — 다국어 (메뉴 라벨)
import { useI18n } from '../composables/useI18n';
import { useFormat } from '../composables/useFormat';
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { useUiFlagsStore } from '../stores/uiFlags';
// Phase 23: 전역 toast 알림
import ToastContainer from '../components/ToastContainer.vue';
// v1.7.5: 우측 상단 사용자 메뉴 → [설정]
import SettingsDialog from '../components/SettingsDialog.vue';
// v1.7.7: 전역 확인 대화상자 — useConfirm 을 쓰는 모든 화면이 이걸 통해 그려진다
import ConfirmDialog from '../components/ConfirmDialog.vue';
// v1.7.8: Ctrl/Cmd+K 빠른 이동
import CommandPalette from '../components/CommandPalette.vue';
import { PREF_KEYS, readPref, writePref } from '../utils/prefs';

// 사이드바 브랜드 로고 — 로그인 화면과 동일한 파란색 로고 (파란 라운드 배경 + 흰 3단 바 + 노란 번개)
const logoSvg = `<svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sb-lg-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563EB"/><stop offset="1" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="sb-lg-bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE066"/><stop offset="1" stop-color="#F5A623"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#sb-lg-bg)"/>
  <g>
    <rect x="13" y="15" width="38" height="7.5" rx="3.75" fill="#fff" opacity="0.95"/>
    <rect x="13" y="28.25" width="38" height="7.5" rx="3.75" fill="#fff" opacity="0.72"/>
    <rect x="13" y="41.5" width="38" height="7.5" rx="3.75" fill="#fff" opacity="0.5"/>
  </g>
  <path d="M38 9 L24 34 H33 L26 55 L46 27 H36 Z" fill="url(#sb-lg-bolt)" stroke="#1D4ED8" stroke-width="1.4" stroke-linejoin="round"/>
</svg>`;

// v1.7.5: [설정 → 화면] 에서 '사이드바 접힘 상태 기억' 을 켜면 새로고침해도 유지된다.
const { t } = useI18n();

const fmt = useFormat();
const rememberSidebar = ref(readPref(PREF_KEYS.rememberSidebar, false));
const collapsed = ref(rememberSidebar.value ? readPref(PREF_KEYS.sidebarCollapsed, false) : false);
watch(collapsed, (v) => { if (rememberSidebar.value) writePref(PREF_KEYS.sidebarCollapsed, v); });
const auth = useAuthStore();
const pwBannerDismissed = ref(false);   // 세션 내에서만 닫힘 (새로고침하면 다시 표시)

/* 서버 버전 — /health 는 인증이 필요 없고 build-info.json 의 값을 그대로 준다 */
const serverVersion = ref({ version: '…', channel: '', builtAt: null });
const versionTitle = computed(() => {
  const v = serverVersion.value;
  const when = v.builtAt ? fmt.dateTime(v.builtAt) : '개발 중 실행';
  /* ★ v1.32.0 — 라이선스도 함께 보여 준다.
     받아 쓰는 사람이 "이 소프트웨어를 어떤 조건으로 쓸 수 있는지" 를
     설치본 안에서 바로 확인할 수 있어야 한다. */
  return `aidot-express v${v.version} (${v.channel || 'dev'})\n빌드: ${when}`
    + `\n라이선스: Apache-2.0`;
});
onMounted(async () => {
  try {
    const r = await fetch('/health').then((x) => x.json());
    serverVersion.value = { version: r.version || '?', channel: r.channel || '', builtAt: r.builtAt || null };
  } catch { serverVersion.value = { version: '?', channel: '', builtAt: null }; }
});
const { user } = storeToRefs(auth);
const uiFlags = useUiFlagsStore();
const router = useRouter();
const route = useRoute();

// 메뉴 전환 시 스크롤을 최상단으로 되돌린다.
//
// 이 앱의 레이아웃은 보통 `.content` (overflow-y: auto) 가 스크롤 컨테이너지만,
// 특정 페이지에서 전역 body 가 스크롤되거나 `.content` 가 아닌 다른 영역이
// 스크롤될 수 있다. 세 곳을 모두 리셋해 어떤 구조에서도 동작.
//
// nextTick 이후에 실행 — RouterView 가 새 컴포넌트를 mount 한 뒤여야
// 재계산된 scrollHeight 로 제대로 작동.
const contentRef = ref(null);
watch(() => route.fullPath, async () => {
  await nextTick();
  // 1) .content div (주 스크롤 컨테이너)
  if (contentRef.value) {
    contentRef.value.scrollTop = 0;
  }
  // 2) window / document (페이지가 viewport 전체로 스크롤되는 경우)
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  } catch { /* 브라우저 지원 안 됨 무시 */ }
});

/**
 * 사이드바 메뉴 구조.
 *   - 최상단 '홈' 은 그룹 없음
 *   - 이후 4개 그룹 (Monitoring / Channel / Test / Management)
 *   - 각 그룹 사이에 separator 렌더
 *   - item.requiresFlag 가 있으면 해당 플래그가 true 일 때만 표시
 */
/* ★ v1.10.0 — computed 로 감싼다.
   그냥 배열이면 t() 가 **한 번만** 평가되어, 언어를 바꿔도 메뉴가 그대로 남는다.
   Vue 의 반응성은 computed 를 통해야 locale ref 변경을 따라온다. */
const menuGroups = computed(() => ([
  { group: null, items: [
    { name: 'home', path: '/', label: t('menu.home'), icon: 'bi-house-door' },
  ]},
  { group: 'Monitoring', items: [
    { name: 'dashboard',  path: '/dashboard',  label: t('menu.dashboard'),    icon: 'bi-speedometer2' },
    { name: 'monitoring', path: '/monitoring', label: t('menu.monitoring'), icon: 'bi-activity' },
  ]},
  { group: 'Channel', items: [
    { name: 'controllers', path: '/controllers', label: t('menu.controller'), icon: 'bi-diagram-3' },
    { name: 'services',    path: '/services',    label: t('menu.service'),   icon: 'bi-gear' },
    { name: 'sqls',        path: '/sqls',        label: t('menu.sql'),     icon: 'bi-database' },
  ]},
  { group: 'MCI Channel', items: [
    { name: 'mci-controller-new', path: '/controllers/mci/new', label: t('menu.mciController'), icon: 'bi-plug-fill',
      requiresFlag: 'mciGeneratorEnabled' },
    { name: 'mci-templates', path: '/controllers/mci/templates', label: t('menu.mciTemplate'), icon: 'bi-file-earmark-code',
      requiresFlag: 'mciGeneratorEnabled' },
    { name: 'mci-abbreviations', path: '/controllers/mci/abbreviations', label: t('menu.mciAbbrev'), icon: 'bi-journal-bookmark',
      requiresFlag: 'mciGeneratorEnabled' },
  ]},
  { group: 'Screen', items: [
    { name: 'screen-projects', path: '/screen-designer', label: t('menu.screenDesigner'), icon: 'bi-easel2' },
  ]},
  { group: 'Test', items: [
    { name: 'api-tester', path: '/api-tester', label: t('menu.apiTest'),    icon: 'bi-send' },
    { name: 'scenarios',  path: '/scenarios',  label: t('menu.scenarioTest'), icon: 'bi-collection-play' },
  ]},
  { group: 'Management', items: [
    { name: 'access-stats', path: '/access-stats', label: t('menu.accessStats'),   icon: 'bi-graph-up-arrow' },
    { name: 'logFiles',     path: '/log-files',    label: t('menu.logFiles'),        icon: 'bi-journal-text' },
        { name: 'logs',         path: '/logs',         label: t('menu.logs'),   icon: 'bi-journal-text', requiresRole: 'admin' },
{ name: 'trace',        path: '/trace',        label: t('menu.trace'),   icon: 'bi-crosshair', requiresRole: 'admin' },
    { name: 'openapi',      path: '/openapi',      label: t('menu.openapi'), icon: 'bi-file-code' },
    { name: 'backup',       path: '/backup',       label: t('menu.backup'),    icon: 'bi-archive',
      requiresFlag: 'backupEnabled' },
    { name: 'secure-columns', path: '/secure-columns', label: t('menu.secureColumns'), icon: 'bi-shield-lock',
      requiresFlag: 'secureColumnsEnabled' },
    { name: 'ha',           path: '/ha',           label: t('menu.ha'),      icon: 'bi-diagram-2',
      requiresFlag: 'haEnabled' },
    { name: 'users',        path: '/users',        label: t('menu.users'),   icon: 'bi-people',
      requiresRole: 'admin' },
  ]},
]));

/** flag 또는 role 기준으로 item 가시 여부 */
function itemVisible(item) {
  if (item.requiresFlag && !uiFlags[item.requiresFlag]) return false;
  if (item.requiresRole) {
    const userRole = auth.user?.role;
    if (userRole !== item.requiresRole) return false;
  }
  return true;
}

/** flag 필터가 적용된 메뉴 (템플릿에서 사용). 그룹 안이 모두 숨겨지면 그룹도 숨김 */
const visibleMenuGroups = computed(() =>
  menuGroups.value
    .map((g) => ({ ...g, items: g.items.filter(itemVisible) }))
    .filter((g) => g.items.length > 0)
);

/** 전체 아이템을 평탄화한 리스트 — 현재 라우트 매칭용 (숨김 상관없이 항상 매칭) */
const allItems = computed(() => menuGroups.value.flatMap(g => g.items));

// v1.7.8: 커맨드 팔레트에 넘길 목록 — 권한/플래그로 걸러진 것만 (숨긴 메뉴로 점프하면 안 된다)
const allVisibleItems = computed(() => visibleMenuGroups.value.flatMap((g) => g.items));

/**
 * 자식 라우트 → 부모 메뉴 이름 매핑.
 * 예: 'scenario-edit' 는 '시나리오 테스트' 메뉴 하위이므로 상단 제목을 '시나리오 테스트' 로 표시.
 * 여기에 키-값을 추가하면 해당 라우트도 같은 제목을 쓰도록 할 수 있다.
 */
const CHILD_ROUTE_TO_PARENT = {
  'scenario-edit':       'scenarios',
  'scenario-run':        'scenarios',
  'controller-edit':     'controllers',
  'controller-new':      'controllers',
  'mci-controller-new':  'controllers',
  'mci-controller-edit': 'controllers',
  'mci-templates':       'controllers',
  'mci-abbreviations':   'controllers',
  'service-edit':        'services',
  'service-new':         'services',
  'sql-edit':            'sqls',
  'sql-new':             'sqls',
  // 화면 디자이너의 자식 라우트 — 상단 제목은 항상 '화면 디자이너'
  'screen-project-edit': 'screen-projects',
  'screen-studio':       'screen-projects',
};

const pageTitle = computed(() => {
  // 1) 메뉴에 직접 있는 라우트
  let m = allItems.value.find((x) => x.name === route.name);
  if (m) return m.label;
  // 2) 자식 라우트 → 부모 메뉴로 매핑
  const parentName = CHILD_ROUTE_TO_PARENT[route.name];
  if (parentName) {
    m = allItems.value.find((x) => x.name === parentName);
    if (m) return m.label;
  }
  return 'Aidot Express';
});

// 로그아웃 확인 Bootstrap 모달 — 실수 클릭 방지
const showLogoutConfirm = ref(false);
const logoutConfirmBtn = ref(null);   // 모달 열릴 때 '로그아웃' 버튼에 자동 focus
const loggingOut = ref(false);

/* ── v1.7.8: Ctrl/Cmd+K 커맨드 팔레트 ─────────────────────────────────── */
const paletteOpen = ref(false);

function onGlobalKeydown(e) {
  // 입력 중에도 열려야 한다 (검색창에서 바로 다른 화면으로 점프하는 게 흔한 패턴)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    paletteOpen.value = !paletteOpen.value;
  }
}
onMounted(() => window.addEventListener('keydown', onGlobalKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown));

/* ── v1.7.8: 좁은 화면용 사이드바 드로어 ──────────────────────────────────
   992px 이하에서는 사이드바가 본문 위로 뜨는 오버레이가 된다 (admin.css @media).
   그때 상단바 토글은 '접기' 가 아니라 '열기/닫기' 로 동작해야 한다. */
const drawerOpen = ref(false);
const isNarrow = ref(false);
function syncNarrow() { isNarrow.value = window.innerWidth <= 992; }
onMounted(() => { syncNarrow(); window.addEventListener('resize', syncNarrow); });
onBeforeUnmount(() => window.removeEventListener('resize', syncNarrow));

function onToggleSidebar() {
  if (isNarrow.value) drawerOpen.value = !drawerOpen.value;
  else collapsed.value = !collapsed.value;
}
// 화면을 옮기면 드로어는 닫는다 (모바일에서 메뉴가 남아 본문을 가리는 것 방지)
watch(() => route.fullPath, () => { drawerOpen.value = false; });

/* ── v1.7.8: 다크 모드 ────────────────────────────────────────────────────
   Bootstrap 5.3 의 [data-bs-theme] 를 <html> 에 붙이면 card/table/modal/form 이 따라온다.
   커스텀 영역(사이드바·상단바)은 admin.css 의 --ax-* 변수로 함께 전환된다. */
function applyTheme(mode) {
  const m = mode === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-bs-theme', m);
}
applyTheme(readPref(PREF_KEYS.theme, 'light'));

/* v1.7.9: 표 밀도 — 분석용 사용자와 가벼운 사용자의 적정 행 높이는 다르다.
   admin.css 의 [data-density] 가 --ax-row-py / --ax-fs-body 를 갈아끼운다. */
function applyDensity(mode) {
  const m = ['compact', 'comfortable', 'spacious'].includes(mode) ? mode : 'comfortable';
  document.documentElement.setAttribute('data-density', m);
}
applyDensity(readPref(PREF_KEYS.density, 'comfortable'));

/* v1.7.5: 우측 상단 사용자 메뉴 (아이콘 클릭 → 설정 / 로그아웃) */
const userMenuOpen = ref(false);
const showSettings = ref(false);

function toggleUserMenu() { userMenuOpen.value = !userMenuOpen.value; }
function closeUserMenu() { userMenuOpen.value = false; }

function openSettings() {
  closeUserMenu();
  showSettings.value = true;
}

/** 설정 대화상자에서 표시 설정이 바뀌면 즉시 반영 */
function onPrefsChanged(p) {
  rememberSidebar.value = !!p.rememberSidebar;
  if (rememberSidebar.value) writePref(PREF_KEYS.sidebarCollapsed, collapsed.value);
  if (p.theme) applyTheme(p.theme);
  if (p.density) applyDensity(p.density);
}

function onLogout() {
  closeUserMenu();
  // [설정 → 화면] 에서 확인을 껐다면 바로 로그아웃
  if (!readPref(PREF_KEYS.confirmLogout, true)) { confirmLogout(); return; }
  showLogoutConfirm.value = true;
  // 다음 tick 에 버튼으로 포커스 (Enter 키로 바로 확인 가능)
  setTimeout(() => { logoutConfirmBtn.value?.focus(); }, 50);
}

async function confirmLogout() {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await auth.logout();
    // auth.logout 내부에서 clearLocal → uiFlags.clear() 호출됨
    showLogoutConfirm.value = false;
    router.push('/login');
  } finally {
    loggingOut.value = false;
  }
}

function cancelLogout() {
  if (loggingOut.value) return;
  showLogoutConfirm.value = false;
}

// 로그인된 상태에서 MainLayout 진입 시 한 번만 플래그 로드
onMounted(() => {
  if (auth.isLoggedIn && !uiFlags.loaded) {
    uiFlags.load();
  }
});
</script>

<template>
  <div class="app-shell">
    <!-- 사이드바 -->
    <!-- 좁은 화면에서 드로어가 열려 있으면 본문을 덮는 백드롭 -->
    <div v-if="isNarrow && drawerOpen" class="sidebar-backdrop" @click="drawerOpen = false"></div>

    <aside class="sidebar" :class="{ collapsed, 'drawer-open': drawerOpen }">
      <div class="brand">
        <div class="brand-logo" v-html="logoSvg"></div>
        <span>Aidot Express</span>
        <!-- ★ v1.15.4 — 접기 단추는 **접히는 쪽(사이드바)** 안에 둔다.
             본문 쪽에 있으면 "무엇을 접는 단추인지" 가 헷갈린다. -->
        <button v-if="!isNarrow" class="rail-toggle" @click="onToggleSidebar"
                :title="collapsed ? t('mainLayout.k11') : t('mainLayout.k12')"
                :aria-label="collapsed ? t('mainLayout.k11') : t('mainLayout.k12')">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <!-- 왼쪽 벽(고정) + 접히는 화살표. 접힌 상태에서는 좌우가 뒤집힌다 -->
            <rect x="3" y="4" width="2.6" height="16" rx="1.1" fill="currentColor" opacity=".9" />
            <rect x="7.6" y="4" width="13.4" height="16" rx="2.4" fill="none"
                  stroke="currentColor" stroke-width="1.6" opacity=".45" />
            <path :d="collapsed ? 'M11.4 8.6 L15 12 L11.4 15.4' : 'M16.6 8.6 L13 12 L16.6 15.4'"
                  fill="none" stroke="currentColor" stroke-width="1.9"
                  stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <nav class="menu">
        <template v-for="(g, gi) in visibleMenuGroups" :key="gi">
          <!-- 그룹 구분선 (첫 그룹 제외) -->
          <hr v-if="gi > 0" class="menu-sep" />
          <!-- 그룹 헤더 (이름 있을 때만) -->
          <div v-if="g.group" class="menu-group-header">{{ g.group }}</div>
          <!-- 그룹 아이템 -->
          <RouterLink
            v-for="m in g.items"
            :key="m.name"
            :to="m.path"
            class="menu-item"
            :class="{ active: route.name === m.name }"
          >
            <i class="bi" :class="m.icon"></i>
            <span>{{ m.label }}</span>
          </RouterLink>
        </template>
      </nav>

      <!-- 버전 표시 — 지금 돌고 있는 서버가 어떤 빌드인지 항상 보이게 -->
      <div class="sidebar-version" :title="versionTitle">
        <i class="bi bi-box-seam me-1"></i>
        <span v-if="!collapsed">v{{ serverVersion.version }}</span>
        <span v-else>{{ serverVersion.version }}</span>
        <span v-if="!collapsed && serverVersion.channel && serverVersion.channel !== 'release'"
              class="badge bg-secondary ms-1">{{ serverVersion.channel }}</span>
      </div>
    </aside>

    <!-- 메인 -->
    <div class="main">
      <div class="topbar">
        <!-- 좁은 화면에서는 사이드바가 서랍으로 뜨므로 여는 단추가 본문 쪽에 있어야 한다 -->
        <button v-if="isNarrow" class="toggle-btn" @click="onToggleSidebar"
                :title="drawerOpen ? t('mainLayout.k13') : t('mainLayout.k14')">
          <i class="bi bi-list"></i>
        </button>
        <h5>{{ pageTitle }}</h5>
        <button class="btn btn-sm btn-outline-secondary me-2 d-none d-md-inline-flex align-items-center"
                :title="t('mainLayout.k7')" @click="paletteOpen = true">
          <i class="bi bi-search me-1"></i><span class="cmdk-key">Ctrl</span><span class="cmdk-key ms-1">K</span>
        </button>
        <!-- v1.7.5: 사용자 아이콘 → 드롭다운(설정 / 로그아웃). 로그아웃 버튼은 이 안으로 옮겼다. -->
        <div class="user-area">
          <button class="user-btn" type="button" @click="toggleUserMenu"
                  :aria-expanded="userMenuOpen" aria-haspopup="menu" :title="t('mainLayout.k8')">
            <i class="bi bi-person-circle"></i>
            <span class="user-name">{{ user?.name || user?.username || user?.sub }}</span>
            <i class="bi bi-chevron-down user-caret" :class="{ open: userMenuOpen }"></i>
            <span v-if="auth.user?.mustChangePassword" class="user-dot" :title="t('mainLayout.k9')"></span>
          </button>

          <!-- 바깥 클릭으로 닫기 — 커스텀 디렉티브 없이 투명 백드롭으로 처리 -->
          <div v-if="userMenuOpen" class="user-menu-backdrop" @click="closeUserMenu"></div>
          <div v-if="userMenuOpen" class="user-menu shadow" role="menu">
            <div class="user-menu-head">
              <div class="fw-semibold text-truncate">{{ user?.name || user?.username }}</div>
              <div class="small text-secondary text-truncate">{{ user?.email || user?.username }}</div>
            </div>
            <button class="user-menu-item" role="menuitem" @click="openSettings">
              <i class="bi bi-gear me-2"></i>{{ t('mainLayout.k1') }}
              <span v-if="auth.user?.mustChangePassword"
                    class="badge bg-warning text-dark ms-auto">{{ t('mainLayout.k2') }}</span>
            </button>
            <div class="user-menu-sep"></div>
            <button class="user-menu-item text-danger" role="menuitem" @click="onLogout">
              <i class="bi bi-box-arrow-right me-2"></i>{{ t('mainLayout.k3') }}
            </button>
          </div>
        </div>
      </div>
      <div class="content" ref="contentRef">
        <!-- v1.2.0: 초기(기본) 비밀번호 사용 중 안내 — 변경 전까지 모든 화면 상단에 표시 -->
        <div v-if="auth.user?.mustChangePassword && !pwBannerDismissed"
             class="alert alert-warning d-flex align-items-center py-2 px-3 mb-3 shadow-sm" role="alert">
          <i class="bi bi-shield-exclamation me-2" style="font-size:1.2rem;"></i>
          <div class="flex-grow-1 small">
            <strong>{{ t('menu.pwBanner') }}</strong>
            {{ t('menu.pwBannerAction') }} —
            <button type="button" class="btn btn-link alert-link p-0 align-baseline"
                    @click="openSettings">{{ t('menu.pwBannerPath') }}</button>
            <span class="text-muted">{{ t('menu.pwBannerRule') }}</span>
          </div>
          <button type="button" class="btn-close ms-2" :aria-label="t('mainLayout.k10')" @click="pwBannerDismissed = true"></button>
        </div>
        <RouterView />
      </div>
    </div>

    <!-- v1.7.5: 설정 대화상자 -->
    <SettingsDialog :open="showSettings" @close="showSettings = false" @prefs-changed="onPrefsChanged" />

    <!-- v1.7.8: 빠른 이동 팔레트 -->
    <CommandPalette :open="paletteOpen" :menu="allVisibleItems" @close="paletteOpen = false" />

    <!-- v1.7.7: 전역 확인 대화상자 (window.confirm 대체) -->
    <ConfirmDialog />

    <!-- Phase 23: 전역 toast 알림 컨테이너 -->
    <ToastContainer />

    <!-- 로그아웃 확인 Bootstrap 모달 -->
    <div v-if="showLogoutConfirm"
         class="modal fade show d-block logout-modal"
         tabindex="-1"
         role="dialog"
         aria-modal="true"
         aria-labelledby="logoutModalTitle"
         @keydown.esc="cancelLogout"
         @mousedown.self="cancelLogout">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content shadow">
          <div class="modal-header">
            <h5 id="logoutModalTitle" class="modal-title">
              <i class="bi bi-box-arrow-right text-primary me-2"></i>{{ t('mainLayout.k3') }}
            </h5>
            <button type="button"
                    class="btn-close"
                    :aria-label="t('mainLayout.k10')"
                    :disabled="loggingOut"
                    @click="cancelLogout"></button>
          </div>
          <div class="modal-body">
            <div class="d-flex align-items-start">
              <i class="bi bi-question-circle-fill text-warning fs-3 me-3"></i>
              <div>
                <p class="mb-1 fw-semibold">{{ t('mainLayout.k4') }}</p>
                <p class="mb-0 small text-secondary">
                  {{ t('mainLayout.k5') }}
                </p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button"
                    class="btn btn-secondary"
                    :disabled="loggingOut"
                    @click="cancelLogout">
              {{ t('mainLayout.k6') }}
            </button>
            <button ref="logoutConfirmBtn"
                    type="button"
                    class="btn btn-primary"
                    :disabled="loggingOut"
                    @click="confirmLogout"
                    @keydown.enter="confirmLogout">
              <span v-if="loggingOut" class="spinner-border spinner-border-sm me-2"
                    role="status" aria-hidden="true"></span>
              <i v-else class="bi bi-box-arrow-right me-1"></i>
              {{ loggingOut ? t('mainLayout.k15') : t('mainLayout.k3') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 사이드바 헤더 오른쪽 끝의 접기 단추 */
.rail-toggle {
  margin-left: auto; display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: 0; border-radius: 8px;
  background: transparent; color: currentColor; opacity: .62; cursor: pointer;
  transition: background .15s ease, opacity .15s ease, transform .15s ease;
}
.rail-toggle:hover { background: rgba(255, 255, 255, .12); opacity: 1; }
.rail-toggle:active { transform: scale(.94); }
/* 접힌 상태에서는 로고 아래로 내려 가운데 정렬 (폭이 좁아 나란히 둘 수 없다) */
.sidebar.collapsed .brand { flex-wrap: wrap; justify-content: center; }
.sidebar.collapsed .rail-toggle { margin: 6px auto 0; }

/* 로그아웃 모달 — 배경 반투명 덮기 (Bootstrap 기본 modal 은 backdrop 이 별도 DOM) */
.logout-modal {
  background: rgba(0, 0, 0, 0.45);
  z-index: 1060;
}
/* 사이드바 브랜드 로고 (SVG) — 기존 아이콘 자리 대체 */
.brand-logo {
  width: 28px; height: 28px; flex-shrink: 0; margin-right: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 7px; overflow: hidden;
  box-shadow: 0 2px 6px rgba(29,78,216,0.35);
}
.brand-logo :deep(svg) { display: block; width: 100%; height: 100%; }
.sidebar-version {
  margin-top: auto;
  padding: 8px 12px;
  font-size: 11px;
  color: #8892a6;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
  overflow: hidden;
}
</style>
