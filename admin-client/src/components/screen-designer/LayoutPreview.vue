<script setup>
/**
 * LayoutPreview — 현재 레이아웃 설정값이 실시간 반영되는 미니어처 프리뷰.
 *
 *  Phase 28 (patch-07) 재작성: 9종 레이아웃 모두 고유한 미리보기 제공.
 *   이전에는 `hasSidebar` 하나로만 분기해서 7종이 기본 사이드바로 fallback 됐음.
 *
 *  각 kind 의 구조:
 *    sidebar-left   : 좌 사이드바 + 상단 타이틀 + 메인
 *    sidebar-dark   : 좌 사이드바(어두운 톤 기본) + 상단 타이틀 + 메인
 *    top-nav        : 상단 네비(메뉴) + 메인 (사이드바 없음)
 *    sidebar-right  : 상단 타이틀 + 메인 + 우 사이드바
 *    sidebar-both   : 좌 메인 사이드바 + 상단 타이틀 + 메인 + 우 보조 패널
 *    top-and-side   : 상단 네비 + 좌 서브 메뉴 + 메인 (2단계 네비)
 *    hero-landing   : 상단 네비 + Hero 영역 + 3 카드 섹션 (랜딩 페이지)
 *    split-panel    : 상단 타이틀 + 좌 리스트 + 우 디테일 (마스터-디테일)
 *    card-grid      : 상단 타이틀 + 3x2 카드 그리드 (대시보드)
 *
 *  색상은 실제 layout 설정 (title.bgColor / sidebar.bgColor / mainArea.bgColor) 을
 *  따라가므로 사용자의 색상 편집이 즉시 반영됨.
 */
import { computed } from 'vue';

const props = defineProps({
  layout: { type: Object, required: true },
});

const kind = computed(() => props.layout?.kind || 'sidebar-left');
const title = computed(() => props.layout?.title || {});
const sidebar = computed(() => props.layout?.sidebar || {});
const mainArea = computed(() => props.layout?.mainArea || {});
const menuItems = computed(() => sidebar.value.items || []);

// 미니어처 사이즈 (CSS 고정) — 내부 비율만 layout 의 실제 값으로 스케일.
const MINI_W = 400;   // px
const MINI_H = 240;   // px
const scaleY = computed(() => MINI_H / 600);
const scaleX = computed(() => MINI_W / 1000);

const miniTitleH = computed(() => Math.max(18, (title.value.height || 60) * scaleY.value));
const miniSidebarW = computed(() => Math.max(40, (sidebar.value.width || 220) * scaleX.value));
const miniPadding = computed(() => Math.max(4, (mainArea.value.padding || 16) * scaleX.value));

// kind 별 구조 카테고리 — 템플릿 단순화.
const structure = computed(() => {
  const k = kind.value;
  // 오른쪽 사이드바 — 상단 타이틀 + (메인 | 우 사이드바)
  if (k === 'sidebar-right') return 'sidebar-right';
  // 양쪽 사이드바 — 상단 타이틀 + (좌 사이드바 | 메인 | 우 보조 패널)
  if (k === 'sidebar-both') return 'sidebar-both';
  // 상단 + 좌측 서브 — 상단 네비(배경) + (좌 사이드바 | 메인)
  if (k === 'top-and-side') return 'top-and-side';
  // Hero 랜딩 — 상단 네비 + Hero 섹션 + 3개 카드
  if (k === 'hero-landing') return 'hero-landing';
  // 좌우 분할 — 상단 타이틀 + 50/50 분할
  if (k === 'split-panel') return 'split-panel';
  // 카드 그리드 — 상단 타이틀 + 3x2 그리드
  if (k === 'card-grid') return 'card-grid';
  // 상단 네비만 — 상단 네비(메뉴 포함) + 메인
  if (k === 'top-nav') return 'top-nav';
  // 기본: sidebar-left / sidebar-dark — 좌 사이드바 + 상단 타이틀 + 메인
  return 'sidebar-left';
});

// 메뉴 항목 중 처음 N 개만 (overflow 방지)
function firstN(arr, n) {
  return (arr || []).slice(0, n);
}
</script>

<template>
  <div class="mini-wrapper" :style="{ width: MINI_W + 'px', height: MINI_H + 'px' }">

    <!-- ═══════════════════════════════════════════════════════════════
         1) sidebar-left / sidebar-dark : 좌 사이드바 + 상단 타이틀 + 메인
         ═══════════════════════════════════════════════════════════════ -->
    <template v-if="structure === 'sidebar-left'">
      <!-- 타이틀 영역 -->
      <div class="mini-title" :style="{
        height: miniTitleH + 'px',
        backgroundColor: title.bgColor || '#ffffff',
        color: title.fgColor || '#0f172a',
      }">
        <img v-if="title.logoUrl" :src="title.logoUrl" class="mini-logo" alt="logo" />
        <span class="mini-title-text">{{ title.text || 'My App' }}</span>
      </div>
      <div class="mini-body" :style="{ height: (MINI_H - miniTitleH) + 'px' }">
        <div class="mini-sidebar" :style="{
          width: miniSidebarW + 'px',
          backgroundColor: sidebar.bgColor || (kind === 'sidebar-dark' ? '#1e2a3a' : '#e2e8f0'),
          color: sidebar.fgColor || (kind === 'sidebar-dark' ? '#cfd6de' : '#334155'),
        }">
          <div v-for="(it, idx) in firstN(menuItems, 8)" :key="idx" class="mini-menu-item"
               :class="{ active: idx === 0 }"
               :style="{ backgroundColor: idx === 0 ? (sidebar.activeBg || '#0d6efd') : 'transparent' }">
            <i :class="it.icon" class="mini-menu-icon"></i>
            <span class="mini-menu-label">{{ it.label }}</span>
          </div>
          <div v-if="!menuItems.length" class="mini-menu-empty">(메뉴 없음)</div>
        </div>
        <div class="mini-main" :style="{
          backgroundColor: mainArea.bgColor || '#f5f7fa',
          padding: miniPadding + 'px',
        }">
          <div class="mini-card"></div>
          <div class="mini-card-row">
            <div class="mini-card half"></div>
            <div class="mini-card half"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         2) top-nav : 상단 네비만 (사이드바 없음)
         ═══════════════════════════════════════════════════════════════ -->
    <template v-else-if="structure === 'top-nav'">
      <div class="mini-title mini-title--nav" :style="{
        height: miniTitleH + 'px',
        backgroundColor: title.bgColor || '#ffffff',
        color: title.fgColor || '#0f172a',
      }">
        <img v-if="title.logoUrl" :src="title.logoUrl" class="mini-logo" alt="logo" />
        <span class="mini-title-text">{{ title.text || 'My App' }}</span>
        <div class="mini-topnav">
          <span v-for="(it, idx) in firstN(menuItems, 5)" :key="idx" class="mini-topnav-item">
            {{ it.label }}
          </span>
        </div>
      </div>
      <div class="mini-main mini-main--full" :style="{
        height: (MINI_H - miniTitleH) + 'px',
        backgroundColor: mainArea.bgColor || '#f5f7fa',
        padding: miniPadding + 'px',
      }">
        <div class="mini-card"></div>
        <div class="mini-card-row">
          <div class="mini-card half"></div>
          <div class="mini-card half"></div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         3) sidebar-right : 상단 타이틀 + 메인 + 우 사이드바
         ═══════════════════════════════════════════════════════════════ -->
    <template v-else-if="structure === 'sidebar-right'">
      <div class="mini-title" :style="{
        height: miniTitleH + 'px',
        backgroundColor: title.bgColor || '#ffffff',
        color: title.fgColor || '#0f172a',
      }">
        <img v-if="title.logoUrl" :src="title.logoUrl" class="mini-logo" alt="logo" />
        <span class="mini-title-text">{{ title.text || 'My App' }}</span>
      </div>
      <div class="mini-body" :style="{ height: (MINI_H - miniTitleH) + 'px' }">
        <div class="mini-main" :style="{
          backgroundColor: mainArea.bgColor || '#f5f7fa',
          padding: miniPadding + 'px',
        }">
          <div class="mini-card"></div>
          <div class="mini-card-row">
            <div class="mini-card half"></div>
            <div class="mini-card half"></div>
          </div>
        </div>
        <div class="mini-sidebar" :style="{
          width: miniSidebarW + 'px',
          backgroundColor: sidebar.bgColor || '#e2e8f0',
          color: sidebar.fgColor || '#334155',
        }">
          <div v-for="(it, idx) in firstN(menuItems, 8)" :key="idx" class="mini-menu-item"
               :class="{ active: idx === 0 }"
               :style="{ backgroundColor: idx === 0 ? (sidebar.activeBg || '#0d6efd') : 'transparent' }">
            <i :class="it.icon" class="mini-menu-icon"></i>
            <span class="mini-menu-label">{{ it.label }}</span>
          </div>
          <div v-if="!menuItems.length" class="mini-menu-empty">(메뉴 없음)</div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         4) sidebar-both : 좌 사이드바 + 상단 타이틀 + 메인 + 우 보조 패널
         ═══════════════════════════════════════════════════════════════ -->
    <template v-else-if="structure === 'sidebar-both'">
      <div class="mini-body" :style="{ height: MINI_H + 'px' }">
        <!-- 좌: 주 사이드바 (폭의 60%) -->
        <div class="mini-sidebar" :style="{
          width: miniSidebarW + 'px',
          backgroundColor: sidebar.bgColor || '#1e2a3a',
          color: sidebar.fgColor || '#cfd6de',
        }">
          <div v-for="(it, idx) in firstN(menuItems, 8)" :key="idx" class="mini-menu-item"
               :class="{ active: idx === 0 }"
               :style="{ backgroundColor: idx === 0 ? (sidebar.activeBg || '#0d6efd') : 'transparent' }">
            <i :class="it.icon" class="mini-menu-icon"></i>
            <span class="mini-menu-label">{{ it.label }}</span>
          </div>
          <div v-if="!menuItems.length" class="mini-menu-empty">(메뉴 없음)</div>
        </div>
        <!-- 중앙: 타이틀 + 메인 -->
        <div class="mini-center">
          <div class="mini-title" :style="{
            height: miniTitleH + 'px',
            backgroundColor: title.bgColor || '#ffffff',
            color: title.fgColor || '#0f172a',
          }">
            <span class="mini-title-text">{{ title.text || 'My App' }}</span>
          </div>
          <div class="mini-main" :style="{
            backgroundColor: mainArea.bgColor || '#f5f7fa',
            padding: miniPadding + 'px',
          }">
            <div class="mini-card"></div>
            <div class="mini-card-row">
              <div class="mini-card half"></div>
              <div class="mini-card half"></div>
            </div>
          </div>
        </div>
        <!-- 우: 보조 사이드바 (고정 폭) -->
        <div class="mini-sidebar mini-sidebar--aux" :style="{
          width: Math.min(miniSidebarW, 70) + 'px',
          backgroundColor: '#f1f5f9',
          color: '#64748b',
        }">
          <div class="mini-menu-item aux-dim">
            <div class="mini-menu-placeholder"></div>
          </div>
          <div class="mini-menu-item aux-dim">
            <div class="mini-menu-placeholder"></div>
          </div>
          <div class="mini-menu-item aux-dim">
            <div class="mini-menu-placeholder short"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         5) top-and-side : 상단 네비 + 좌 서브 메뉴 + 메인
         ═══════════════════════════════════════════════════════════════ -->
    <template v-else-if="structure === 'top-and-side'">
      <!-- 상단 네비 (어두운 배경 권장 — 타이틀의 bgColor 사용) -->
      <div class="mini-title mini-title--nav" :style="{
        height: miniTitleH + 'px',
        backgroundColor: title.bgColor || '#1e2a3a',
        color: title.fgColor || '#ffffff',
      }">
        <span class="mini-title-text">{{ title.text || 'My App' }}</span>
        <div class="mini-topnav">
          <span v-for="(it, idx) in firstN(menuItems, 3)" :key="idx" class="mini-topnav-item">
            {{ it.label }}
          </span>
        </div>
      </div>
      <div class="mini-body" :style="{ height: (MINI_H - miniTitleH) + 'px' }">
        <!-- 좌측 서브 메뉴 (상단 메뉴의 4번째 이후 항목을 하위 메뉴처럼) -->
        <div class="mini-sidebar" :style="{
          width: miniSidebarW + 'px',
          backgroundColor: sidebar.bgColor || '#e2e8f0',
          color: sidebar.fgColor || '#334155',
        }">
          <div v-for="(it, idx) in firstN(menuItems.slice(3), 6)" :key="idx" class="mini-menu-item mini-menu-item--sub"
               :class="{ active: idx === 0 }"
               :style="{ backgroundColor: idx === 0 ? (sidebar.activeBg || '#0d6efd') : 'transparent' }">
            <i :class="it.icon" class="mini-menu-icon"></i>
            <span class="mini-menu-label">{{ it.label }}</span>
          </div>
          <div v-if="menuItems.length <= 3" class="mini-menu-empty">(서브 메뉴)</div>
        </div>
        <div class="mini-main" :style="{
          backgroundColor: mainArea.bgColor || '#f5f7fa',
          padding: miniPadding + 'px',
        }">
          <div class="mini-card"></div>
          <div class="mini-card-row">
            <div class="mini-card half"></div>
            <div class="mini-card half"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         6) hero-landing : 상단 네비 + Hero 섹션 + 3개 feature 카드
         ═══════════════════════════════════════════════════════════════ -->
    <template v-else-if="structure === 'hero-landing'">
      <!-- 상단 네비 -->
      <div class="mini-title mini-title--nav mini-title--compact" :style="{
        backgroundColor: title.bgColor || '#ffffff',
        color: title.fgColor || '#0f172a',
      }">
        <span class="mini-title-text">{{ title.text || 'Landing' }}</span>
        <div class="mini-topnav">
          <span v-for="(it, idx) in firstN(menuItems, 4)" :key="idx" class="mini-topnav-item">
            {{ it.label }}
          </span>
          <span class="mini-topnav-cta">시작</span>
        </div>
      </div>
      <!-- Hero 영역 -->
      <div class="mini-hero" :style="{ backgroundColor: mainArea.bgColor || '#eef2ff' }">
        <div class="mini-hero-title"></div>
        <div class="mini-hero-sub"></div>
        <div class="mini-hero-buttons">
          <div class="mini-hero-btn primary"></div>
          <div class="mini-hero-btn"></div>
        </div>
      </div>
      <!-- 3 feature 카드 -->
      <div class="mini-landing-features">
        <div class="mini-landing-card"></div>
        <div class="mini-landing-card"></div>
        <div class="mini-landing-card"></div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         7) split-panel : 상단 타이틀 + 좌 리스트 + 우 디테일
         ═══════════════════════════════════════════════════════════════ -->
    <template v-else-if="structure === 'split-panel'">
      <div class="mini-title" :style="{
        height: miniTitleH + 'px',
        backgroundColor: title.bgColor || '#ffffff',
        color: title.fgColor || '#0f172a',
      }">
        <span class="mini-title-text">{{ title.text || 'My App' }}</span>
      </div>
      <div class="mini-split" :style="{
        height: (MINI_H - miniTitleH) + 'px',
        backgroundColor: mainArea.bgColor || '#f5f7fa',
        padding: miniPadding + 'px',
      }">
        <div class="mini-split-list">
          <div v-for="n in 5" :key="n" class="mini-split-row" :class="{ active: n === 1 }"></div>
        </div>
        <div class="mini-split-detail">
          <div class="mini-split-detail-title"></div>
          <div class="mini-split-detail-line"></div>
          <div class="mini-split-detail-line"></div>
          <div class="mini-split-detail-line"></div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         8) card-grid : 상단 타이틀 + 3x2 카드 그리드
         ═══════════════════════════════════════════════════════════════ -->
    <template v-else-if="structure === 'card-grid'">
      <div class="mini-title" :style="{
        height: miniTitleH + 'px',
        backgroundColor: title.bgColor || '#ffffff',
        color: title.fgColor || '#0f172a',
      }">
        <span class="mini-title-text">{{ title.text || 'My App' }}</span>
      </div>
      <div class="mini-grid" :style="{
        height: (MINI_H - miniTitleH) + 'px',
        backgroundColor: mainArea.bgColor || '#f5f7fa',
        padding: miniPadding + 'px',
      }">
        <div v-for="n in 6" :key="n" class="mini-grid-card">
          <div class="mini-grid-card-dot"></div>
          <div class="mini-grid-card-line"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mini-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  background: #fff;
  font-family: system-ui, sans-serif;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
/* ─── 공통 요소 ─── */
.mini-title {
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 13px;
  gap: 8px;
  overflow: hidden;
  white-space: nowrap;
  flex-shrink: 0;
}
.mini-title--nav {
  padding-right: 8px;
}
.mini-title--compact {
  height: 24px !important;
  font-size: 11px;
}
.mini-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
}
.mini-title-text { flex-shrink: 0; }
.mini-topnav {
  margin-left: auto;
  display: flex;
  gap: 10px;
  font-size: 10px;
  opacity: 0.85;
  font-weight: 500;
}
.mini-topnav-item { white-space: nowrap; }
.mini-topnav-cta {
  background: #0d6efd;
  color: #fff;
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 9px;
}

.mini-body {
  display: flex;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.mini-center {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.mini-sidebar {
  flex-shrink: 0;
  padding: 6px 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 10px;
}
.mini-sidebar--aux {
  border-left: 1px solid #e5e7eb;
}
.mini-menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 3px;
}
.mini-menu-item--sub {
  padding-left: 12px;
  font-size: 9px;
}
.mini-menu-item.active { color: #fff; }
.mini-menu-item.aux-dim { padding: 4px 6px; }
.mini-menu-placeholder {
  width: 100%;
  height: 6px;
  background: #cbd5e1;
  border-radius: 2px;
}
.mini-menu-placeholder.short {
  width: 60%;
}
.mini-menu-icon {
  font-size: 10px;
  width: 12px;
  flex-shrink: 0;
}
.mini-menu-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mini-menu-empty {
  padding: 8px;
  font-size: 10px;
  opacity: 0.5;
  font-style: italic;
}
.mini-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.mini-main--full { width: 100%; }
.mini-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  flex: 1;
  min-height: 0;
}
.mini-card-row {
  display: flex;
  gap: 6px;
  flex: 1;
  min-height: 0;
}
.mini-card.half { flex: 1; }

/* ─── 6) hero-landing ─── */
.mini-hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 12px;
  min-height: 0;
}
.mini-hero-title {
  width: 60%; height: 10px;
  background: #0f172a; border-radius: 3px;
}
.mini-hero-sub {
  width: 80%; height: 5px;
  background: #94a3b8; border-radius: 2px;
}
.mini-hero-buttons {
  display: flex; gap: 6px; margin-top: 4px;
}
.mini-hero-btn {
  width: 32px; height: 10px;
  border-radius: 2px;
  background: #fff; border: 1px solid #0d6efd;
}
.mini-hero-btn.primary {
  background: #0d6efd; border-color: #0d6efd;
}
.mini-landing-features {
  display: flex; gap: 6px;
  padding: 8px;
  background: #fff;
  flex-shrink: 0;
  border-top: 1px solid #e5e7eb;
}
.mini-landing-card {
  flex: 1;
  height: 36px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
}

/* ─── 7) split-panel ─── */
.mini-split {
  display: flex;
  gap: 8px;
  overflow: hidden;
}
.mini-split-list {
  width: 38%;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.mini-split-row {
  height: 12px;
  background: #f1f5f9;
  border-radius: 2px;
}
.mini-split-row.active {
  background: #dbeafe;
  border-left: 2px solid #0d6efd;
}
.mini-split-detail {
  flex: 1;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 3px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mini-split-detail-title {
  width: 60%; height: 8px;
  background: #0f172a; border-radius: 2px;
}
.mini-split-detail-line {
  width: 90%; height: 4px;
  background: #94a3b8; border-radius: 2px;
}

/* ─── 8) card-grid ─── */
.mini-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
}
.mini-grid-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  padding: 6px;
  /* 3 cards per row, 2 rows — account for 8px gap × 2 = 16px */
  width: calc((100% - 16px) / 3);
  height: calc((100% - 8px) / 2);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mini-grid-card-dot {
  width: 16px; height: 16px;
  background: #dbeafe;
  border-radius: 50%;
}
.mini-grid-card-line {
  width: 70%; height: 4px;
  background: #cbd5e1;
  border-radius: 2px;
}
</style>
