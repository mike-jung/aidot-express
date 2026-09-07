<script setup>
/**
 * Home — {{ t('home.title') }}.
 *
 * 좌측 사이드바의 메뉴 구성(Monitoring / Channel / Test / Management)과 동일한 순서로
 * 네비게이션 카드를 배치. 각 그룹을 섹션으로 나누어 보여준다.
 */
import { RouterLink } from 'vue-router';
import { computed } from 'vue';
// ★ v1.10.6 — 다국어
import { useI18n } from '../composables/useI18n';
import { useUiFlagsStore } from '../stores/uiFlags';   // ★ v1.25.0

const { t } = useI18n();
const flags = useUiFlagsStore();

/* ★ v1.10.6 — computed 로 감싼다. 그냥 배열이면 t() 가 한 번만 평가되어
   언어를 바꿔도 문구가 그대로 남는다. */
const sections = computed(() => ([
  {
    group: 'Monitoring',
    icon:  'bi-activity',
    desc:  t('home.gMonitor'),
    items: [
      { path: '/dashboard',  icon: 'bi-speedometer2',       title: t('home.dashboard'),
        desc: t('home.dashboardDesc') },
      { path: '/monitoring', icon: 'bi-activity',           title: t('home.monitoring'),
        desc: t('home.monitoringDesc') },
    ],
  },
  {
    group: 'Channel',
    icon:  'bi-diagram-3',
    desc:  t('home.gDev'),
    items: [
      { path: '/controllers', icon: 'bi-diagram-3', title: t('home.controllers'),
        desc: t('home.controllersDesc') },
      { path: '/services',    icon: 'bi-gear',      title: t('home.services'),
        desc: t('home.servicesDesc') },
      { path: '/sqls',        icon: 'bi-database',  title: 'SQL',
        desc: t('home.sqlDesc') },
    ],
  },
  {
    group: 'Test',
    icon:  'bi-send',
    desc:  t('home.gTest'),
    items: [
      { path: '/api-tester', icon: 'bi-send',             title: t('home.apiTest'),
        desc: t('home.apiTestDesc') },
      { path: '/scenarios',  icon: 'bi-collection-play',  title: t('home.scenarioTest'),
        desc: t('home.scenarioTestDesc') },
    ],
  },
  {
    group: 'Management',
    icon:  'bi-sliders',
    desc:  t('home.grpManageDesc'),
    items: [
      { path: '/access-stats', icon: 'bi-graph-up-arrow', title: t('menu.accessStats'),
        desc: t('home.accessStatsDesc') },
      { path: '/openapi',      icon: 'bi-file-code',      title: t('menu.openapi'),
        desc: t('home.openapiDesc') },
      /* ★ v1.25.0 — 엔터프라이즈 카드는 서버가 켜 줬을 때만 (사이드바와 같은 기준) */
      ...(flags.backupEnabled ? [{ path: '/backup', icon: 'bi-archive', title: t('menu.backup'),
        desc: t('home.backupDesc') }] : []),
    ],
  },
]));
</script>

<template>
  <div class="home-page">
    <!-- 헤더 -->
    <div class="card mb-4">
      <div class="card-body">
        <h3 class="mb-2"><i class="bi bi-shield-lock-fill text-primary me-2"></i>{{ t('home.consoleTitle') }}</h3>
        <p class="text-secondary mb-0">
          {{ t('home.consoleIntro') }}
        </p>
      </div>
    </div>

    <!-- 그룹별 섹션 -->
    <div v-for="sec in sections" :key="sec.group" class="mb-4">
      <h5 class="section-header">
        <i class="bi" :class="sec.icon"></i>
        <span>{{ sec.group }}</span>
        <small class="text-secondary fw-normal ms-2">— {{ sec.desc }}</small>
      </h5>

      <div class="row g-3">
        <div v-for="it in sec.items" :key="it.path" class="col-md-6 col-lg-4">
          <RouterLink :to="it.path" class="text-decoration-none text-reset">
            <div class="card h-100 nav-card">
              <div class="card-body">
                <i class="bi fs-2 text-primary mb-2 d-block" :class="it.icon"></i>
                <h5 class="mb-1">{{ it.title }}</h5>
                <p class="text-secondary small mb-0">{{ it.desc }}</p>
              </div>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page { padding-bottom: 24px; }
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 2px solid #e9ecef;
}
.section-header i { color: var(--bs-primary, #0d6efd); }
.nav-card {
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  border: 1px solid #e9ecef;
}
.nav-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-color: #c0d5ff;
}
</style>
