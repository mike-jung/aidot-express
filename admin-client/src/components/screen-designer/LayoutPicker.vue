<script setup>
/**
 * LayoutPicker — 9가지 전체 레이아웃 구조 프리셋 선택 카드 (Phase 18 확장).
 *
 *  기본 3종 (Phase 2):
 *   sidebar-left  : 좌측 사이드바 (밝은 배경) + 상단 타이틀
 *   sidebar-dark  : 좌측 사이드바 (어두운 배경) + 상단 타이틀
 *   top-nav       : 상단 네비게이션만 (사이드바 없음)
 *
 *  Phase 18 추가 6종:
 *   sidebar-right : 우측 사이드바 (RTL 또는 콘텐츠 우선 배치)
 *   sidebar-both  : 좌우 양쪽 사이드바 (보조 패널 포함)
 *   top-and-side  : 상단 네비 + 좌측 서브 메뉴 (2단계 네비)
 *   hero-landing  : Hero 영역 + 스크롤 섹션 (랜딩 페이지용)
 *   split-panel   : 좌우 동일 분할 (master-detail)
 *   card-grid     : 전체 화면 카드 그리드 (대시보드)
 */
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';

const props = defineProps({
  modelValue: { type: String, default: 'sidebar-left' },
});
const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();

const presets = [
  { kind: 'sidebar-left',  labelKey: 'lay_sidebarLeft',descKey: 'lay_sidebarLeftD', category: 'admin' },
  { kind: 'sidebar-dark',  labelKey: 'lay_sidebarDark',descKey: 'lay_sidebarDarkD',         category: 'admin' },
  { kind: 'top-nav',       labelKey: 'lay_topNav',    descKey: 'lay_topNavD',     category: 'web' },
  { kind: 'sidebar-right', labelKey: 'lay_sidebarRight',descKey: 'lay_sidebarRightD',         category: 'admin' },
  { kind: 'sidebar-both',  labelKey: 'lay_sidebarBoth',descKey: 'lay_sidebarBothD',           category: 'admin' },
  { kind: 'top-and-side',  labelKey: 'lay_topAndSide',descKey: 'lay_topAndSideD', category: 'admin' },
  { kind: 'hero-landing',  labelKey: 'lay_heroLanding', descKey: 'lay_heroLandingD',   category: 'web' },
  { kind: 'split-panel',   labelKey: 'lay_splitPanel',descKey: 'lay_splitPanelD',           category: 'app' },
  { kind: 'card-grid',     labelKey: 'lay_cardGrid', descKey: 'lay_cardGridD',            category: 'app' },
];

function select(kind) {
  if (kind !== props.modelValue) emit('update:modelValue', kind);
}

const currentPreset = computed(() => presets.find((p) => p.kind === props.modelValue) || presets[0]);
defineExpose({ currentPreset, presets });
</script>

<template>
  <div class="row g-3">
    <div v-for="p in presets" :key="p.kind" class="col-md-4 col-sm-6">
      <div class="pick-card h-100"
           :class="{ selected: modelValue === p.kind }"
           @click="select(p.kind)"
           tabindex="0" role="button"
           @keyup.enter="select(p.kind)">
        <div class="schematic">
          <svg viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
            <rect width="120" height="70" fill="#f8fafc" rx="3" />

            <!-- sidebar-left / sidebar-dark -->
            <template v-if="p.kind === 'sidebar-left' || p.kind === 'sidebar-dark'">
              <rect x="0" y="0" width="30" height="70" :fill="p.kind === 'sidebar-dark' ? '#1e2a3a' : '#e2e8f0'" rx="3" />
              <rect x="5" y="8"  width="20" height="3" rx="1" :fill="p.kind === 'sidebar-dark' ? '#64748b' : '#94a3b8'" />
              <rect x="5" y="14" width="20" height="3" rx="1" :fill="p.kind === 'sidebar-dark' ? '#64748b' : '#94a3b8'" />
              <rect x="5" y="20" width="20" height="3" rx="1" :fill="p.kind === 'sidebar-dark' ? '#64748b' : '#94a3b8'" />
              <rect x="30" y="0" width="90" height="10" fill="#ffffff" />
              <line x1="30" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="36" y="3" width="30" height="4" rx="1" fill="#0f172a" />
              <rect x="36" y="16" width="78" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="36" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="77" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
            </template>

            <!-- top-nav -->
            <template v-else-if="p.kind === 'top-nav'">
              <rect x="0" y="0" width="120" height="12" fill="#ffffff" />
              <line x1="0" y1="12" x2="120" y2="12" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="6" y="4" width="24" height="4" rx="1" fill="#0f172a" />
              <rect x="50" y="5" width="12" height="2" rx="1" fill="#64748b" />
              <rect x="66" y="5" width="12" height="2" rx="1" fill="#64748b" />
              <rect x="82" y="5" width="12" height="2" rx="1" fill="#64748b" />
              <rect x="98" y="5" width="12" height="2" rx="1" fill="#64748b" />
              <rect x="6"  y="18" width="108" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="6"  y="42" width="52"  height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="62" y="42" width="52"  height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
            </template>

            <!-- sidebar-right -->
            <template v-else-if="p.kind === 'sidebar-right'">
              <rect x="0" y="0" width="90" height="10" fill="#ffffff" />
              <line x1="0" y1="10" x2="90" y2="10" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="6" y="3" width="30" height="4" rx="1" fill="#0f172a" />
              <rect x="90" y="0" width="30" height="70" fill="#e2e8f0" rx="3" />
              <rect x="95" y="8"  width="20" height="3" rx="1" fill="#94a3b8" />
              <rect x="95" y="14" width="20" height="3" rx="1" fill="#94a3b8" />
              <rect x="95" y="20" width="20" height="3" rx="1" fill="#94a3b8" />
              <rect x="6" y="16" width="78" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="6" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="47" y="40" width="37" height="25" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
            </template>

            <!-- sidebar-both -->
            <template v-else-if="p.kind === 'sidebar-both'">
              <rect x="0" y="0" width="24" height="70" fill="#1e2a3a" rx="3" />
              <rect x="4" y="8"  width="16" height="3" rx="1" fill="#64748b" />
              <rect x="4" y="14" width="16" height="3" rx="1" fill="#64748b" />
              <rect x="4" y="20" width="16" height="3" rx="1" fill="#64748b" />
              <rect x="96" y="0" width="24" height="70" fill="#f1f5f9" rx="3" />
              <rect x="100" y="8" width="16" height="3" rx="1" fill="#94a3b8" />
              <rect x="100" y="14" width="16" height="3" rx="1" fill="#94a3b8" />
              <rect x="24" y="0" width="72" height="10" fill="#ffffff" />
              <line x1="24" y1="10" x2="96" y2="10" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="28" y="3" width="22" height="4" rx="1" fill="#0f172a" />
              <rect x="28" y="16" width="64" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="28" y="42" width="64" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
            </template>

            <!-- top-and-side -->
            <template v-else-if="p.kind === 'top-and-side'">
              <rect x="0" y="0" width="120" height="10" fill="#1e2a3a" />
              <rect x="6" y="3" width="22" height="4" rx="1" fill="#fff" />
              <rect x="50" y="4" width="10" height="2" rx="1" fill="#94a3b8" />
              <rect x="64" y="4" width="10" height="2" rx="1" fill="#94a3b8" />
              <rect x="78" y="4" width="10" height="2" rx="1" fill="#94a3b8" />
              <rect x="0" y="10" width="28" height="60" fill="#e2e8f0" />
              <rect x="4" y="16" width="20" height="3" rx="1" fill="#64748b" />
              <rect x="4" y="22" width="20" height="3" rx="1" fill="#64748b" />
              <rect x="4" y="28" width="20" height="3" rx="1" fill="#64748b" />
              <rect x="32" y="14" width="84" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="32" y="38" width="84" height="28" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
            </template>

            <!-- hero-landing -->
            <template v-else-if="p.kind === 'hero-landing'">
              <rect x="0" y="0" width="120" height="10" fill="#ffffff" />
              <rect x="6" y="3" width="18" height="4" rx="1" fill="#0f172a" />
              <rect x="80" y="5" width="10" height="2" rx="1" fill="#64748b" />
              <rect x="92" y="5" width="10" height="2" rx="1" fill="#64748b" />
              <rect x="104" y="4" width="12" height="4" rx="1" fill="#0d6efd" />
              <rect x="0" y="10" width="120" height="32" fill="#f1f5f9" />
              <rect x="20" y="18" width="80" height="5" rx="1" fill="#0f172a" />
              <rect x="30" y="26" width="60" height="3" rx="1" fill="#64748b" />
              <rect x="42" y="33" width="18" height="5" rx="2" fill="#0d6efd" />
              <rect x="62" y="33" width="18" height="5" rx="2" fill="#fff" stroke="#0d6efd" stroke-width="0.5" />
              <rect x="6"  y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="43" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="80" y="46" width="34" height="20" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
            </template>

            <!-- split-panel -->
            <template v-else-if="p.kind === 'split-panel'">
              <rect x="0" y="0" width="120" height="10" fill="#ffffff" />
              <rect x="6" y="3" width="24" height="4" rx="1" fill="#0f172a" />
              <line x1="0" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="6" y="16" width="52" height="50" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="10" y="20" width="44" height="3" rx="1" fill="#94a3b8" />
              <rect x="10" y="26" width="44" height="3" rx="1" fill="#94a3b8" />
              <rect x="10" y="32" width="44" height="3" rx="1" fill="#94a3b8" />
              <rect x="10" y="38" width="44" height="3" rx="1" fill="#94a3b8" />
              <rect x="62" y="16" width="52" height="50" rx="2" fill="#eff6ff" stroke="#bfdbfe" stroke-width="0.5" />
              <rect x="66" y="22" width="30" height="4" rx="1" fill="#0f172a" />
              <rect x="66" y="30" width="44" height="2" rx="1" fill="#64748b" />
              <rect x="66" y="35" width="44" height="2" rx="1" fill="#64748b" />
              <rect x="66" y="40" width="44" height="2" rx="1" fill="#64748b" />
            </template>

            <!-- card-grid -->
            <template v-else-if="p.kind === 'card-grid'">
              <rect x="0" y="0" width="120" height="10" fill="#ffffff" />
              <rect x="6" y="3" width="24" height="4" rx="1" fill="#0f172a" />
              <line x1="0" y1="10" x2="120" y2="10" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="6"  y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="43" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="80" y="16" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="6"  y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="43" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="80" y="42" width="34" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" stroke-width="0.5" />
              <rect x="10" y="20" width="10" height="2" rx="1" fill="#64748b" />
              <rect x="47" y="20" width="10" height="2" rx="1" fill="#64748b" />
              <rect x="84" y="20" width="10" height="2" rx="1" fill="#64748b" />
              <rect x="10" y="46" width="10" height="2" rx="1" fill="#64748b" />
              <rect x="47" y="46" width="10" height="2" rx="1" fill="#64748b" />
              <rect x="84" y="46" width="10" height="2" rx="1" fill="#64748b" />
            </template>
          </svg>
        </div>

        <div class="pick-body">
          <div class="d-flex align-items-center mb-1">
            <span class="fw-semibold">{{ t('designer.' + p.labelKey) }}</span>
            <span v-if="modelValue === p.kind" class="badge bg-primary ms-auto">
              <i class="bi bi-check-lg"></i>
            </span>
            <span v-else class="badge bg-light text-secondary ms-auto small">{{ p.category }}</span>
          </div>
          <p class="small text-secondary mb-0">{{ t('designer.' + p.descKey) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pick-card {
  border: 1.5px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.1s, box-shadow 0.1s, transform 0.1s;
  overflow: hidden;
}
.pick-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}
.pick-card.selected {
  border-color: #0d6efd;
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
}
.schematic {
  padding: 0.5rem;
  background: #f1f5f9;
  border-bottom: 1px solid #e5e7eb;
}
.schematic svg {
  width: 100%;
  height: auto;
  display: block;
}
.pick-body {
  padding: 0.75rem 1rem;
}
</style>
