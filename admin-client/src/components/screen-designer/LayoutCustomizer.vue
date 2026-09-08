<script setup>
/**
 * LayoutCustomizer — 레이아웃 세부 편집.
 *
 *  구조: Bootstrap 5 의 accordion 사용. 3개 섹션.
 *   1) 타이틀 영역: 텍스트 / 로고 URL / 배경색 / 글자색 / 높이
 *   2) 사이드바: 배경색 / 글자색 / 활성 색 / 폭 / 메뉴 항목 리스트 CRUD
 *      (layout.kind === 'top-nav' 이면 이 섹션 숨김)
 *   3) 메인 영역: 배경색 / 패딩
 *
 *  v-model:layout 형태로 부모와 양방향 바인딩. 내부 수정 시 반드시 **깊은 복사** 없이
 *  객체의 필드만 바꾸도록 주의 (Phase 3 의 savePatch 가 전체 layout 객체를 보내는 구조이므로
 *  상위에서 watch deep 으로 디바운스 저장한다).
 */
import { computed, ref } from 'vue';
import { useI18n } from '../../composables/useI18n';

/* ★ v1.20.0 — t() 를 쓰면 선언도 있어야 한다. 없으면 화면을 여는 순간 죽는다. */
const { t } = useI18n();

const props = defineProps({
  layout: { type: Object, required: true },
});
const emit = defineEmits(['update:layout']);

// 부모에 항상 새 객체를 보내지 않고, 내부 필드만 조작해도 watch deep 로 잡히도록
// patch 헬퍼 제공 — 자식 섹션들은 각 필드를 v-model 로 직접 바인딩할 수 있음.
const layoutRef = computed({
  get: () => props.layout,
  set: (v) => emit('update:layout', v),
});

/**
 * 메뉴 편집 섹션을 표시할지 여부.
 *
 *  Phase 27 (patch-06) 수정:
 *   - 이전에는 `sidebar-left` / `sidebar-dark` 두 종만 체크했기 때문에
 *     Phase 18 에서 확장된 6종 (sidebar-right, sidebar-both, top-nav, top-and-side,
 *     hero-landing, split-panel, card-grid) 중 menu 가 필요한 것들의 편집 UI 가
 *     숨겨졌음. 사용자가 "top-nav" 를 고르면 메뉴를 넣을 방법이 없어지는 버그.
 *
 *   - 메뉴가 필요한 레이아웃 종:
 *        sidebar-left / sidebar-dark / sidebar-right / sidebar-both  (사이드바형)
 *        top-nav / top-and-side                                      (상단 네비형)
 *     메뉴 없음:
 *        hero-landing / split-panel / card-grid
 *
 *   - sidebar 필드에 들어있는 items 배열을 공용으로 사용 (top-nav 도 같은 items 를 위쪽에 렌더).
 */
const MENU_KINDS = new Set([
  'sidebar-left', 'sidebar-dark', 'sidebar-right', 'sidebar-both',
  'top-nav', 'top-and-side',
]);
const SIDEBAR_KINDS = new Set([
  'sidebar-left', 'sidebar-dark', 'sidebar-right', 'sidebar-both',
]);

const hasMenu = computed(() => MENU_KINDS.has(props.layout?.kind));
// 사이드바형일 때만 "사이드바 색상/폭" 패널을 추가로 노출.
const hasSidebar = computed(() => SIDEBAR_KINDS.has(props.layout?.kind));

// 메뉴 섹션의 레이블을 레이아웃 종에 따라 동적으로 바꿈 (UX).
const menuSectionLabel = computed(() => {
  const k = props.layout?.kind;
  if (k === 'top-nav' || k === 'top-and-side') return t('designer.topNavMenu');
  return t('designer.sidebarMenu');
});
const menuSectionIcon = computed(() => {
  const k = props.layout?.kind;
  if (k === 'top-nav' || k === 'top-and-side') return 'bi-menu-button-wide';
  return 'bi-layout-sidebar';
});

/* ─── 메뉴 항목 CRUD (사이드바 섹션) ─── */

const availableIcons = [
  'bi-house-door', 'bi-list', 'bi-grid', 'bi-person', 'bi-gear',
  'bi-file-text', 'bi-bar-chart', 'bi-cart', 'bi-bell', 'bi-envelope',
  'bi-calendar', 'bi-folder', 'bi-images', 'bi-book',
];

function addMenuItem() {
  if (!layoutRef.value.sidebar) layoutRef.value.sidebar = { items: [] };
  if (!Array.isArray(layoutRef.value.sidebar.items)) layoutRef.value.sidebar.items = [];
  layoutRef.value.sidebar.items.push({
    icon: 'bi-house-door',
    label: t('layoutCustomizer.k21'),
    path: '/',
  });
}

function removeMenuItem(idx) {
  layoutRef.value.sidebar.items.splice(idx, 1);
}

function moveMenuItem(idx, dir) {
  const arr = layoutRef.value.sidebar.items;
  const to = idx + dir;
  if (to < 0 || to >= arr.length) return;
  const [m] = arr.splice(idx, 1);
  arr.splice(to, 0, m);
}
</script>

<template>
  <div class="accordion" id="layoutCustomizerAccordion">

    <!-- 1) 타이틀 영역 -->
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button" type="button"
                data-bs-toggle="collapse" data-bs-target="#cAccTitle" aria-expanded="true">
          <i class="bi bi-window me-2"></i>{{ t('layoutCustomizer.k1') }}
        </button>
      </h2>
      <div id="cAccTitle" class="accordion-collapse collapse show">
        <div class="accordion-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label small">{{ t('layoutCustomizer.k2') }}</label>
              <input class="form-control form-control-sm"
                     v-model="layoutRef.title.text"
                     :placeholder="t('layoutCustomizer.k16')" />
            </div>
            <div class="col-md-6">
              <label class="form-label small">{{ t('layoutCustomizer.k3') }} <span class="text-secondary">{{ t('layoutCustomizer.k4') }}</span></label>
              <input class="form-control form-control-sm"
                     v-model="layoutRef.title.logoUrl"
                     placeholder="https://..." />
            </div>
            <div class="col-md-4">
              <label class="form-label small">{{ t('layoutCustomizer.k5') }}</label>
              <div class="input-group input-group-sm">
                <input type="color" class="form-control form-control-color"
                       style="max-width: 50px;"
                       v-model="layoutRef.title.bgColor" />
                <input type="text" class="form-control" v-model="layoutRef.title.bgColor" />
              </div>
            </div>
            <div class="col-md-4">
              <label class="form-label small">{{ t('layoutCustomizer.k6') }}</label>
              <div class="input-group input-group-sm">
                <input type="color" class="form-control form-control-color"
                       style="max-width: 50px;"
                       v-model="layoutRef.title.fgColor" />
                <input type="text" class="form-control" v-model="layoutRef.title.fgColor" />
              </div>
            </div>
            <div class="col-md-4">
              <label class="form-label small">{{ t('layoutCustomizer.k7') }}</label>
              <input type="number" class="form-control form-control-sm"
                     min="40" max="120"
                     v-model.number="layoutRef.title.height" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2) 메뉴 (사이드바형 / top-nav 공용) -->
    <div class="accordion-item" v-if="hasMenu">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button"
                data-bs-toggle="collapse" data-bs-target="#cAccSidebar">
          <i class="bi me-2" :class="menuSectionIcon"></i>{{ menuSectionLabel }}
        </button>
      </h2>
      <div id="cAccSidebar" class="accordion-collapse collapse">
        <div class="accordion-body">

          <!-- 색상/폭 — 사이드바형일 때만 -->
          <div v-if="hasSidebar" class="row g-3 mb-3">
            <div class="col-md-3">
              <label class="form-label small">{{ t('layoutCustomizer.k5') }}</label>
              <div class="input-group input-group-sm">
                <input type="color" class="form-control form-control-color"
                       style="max-width: 50px;"
                       v-model="layoutRef.sidebar.bgColor" />
                <input type="text" class="form-control" v-model="layoutRef.sidebar.bgColor" />
              </div>
            </div>
            <div class="col-md-3">
              <label class="form-label small">{{ t('layoutCustomizer.k6') }}</label>
              <div class="input-group input-group-sm">
                <input type="color" class="form-control form-control-color"
                       style="max-width: 50px;"
                       v-model="layoutRef.sidebar.fgColor" />
                <input type="text" class="form-control" v-model="layoutRef.sidebar.fgColor" />
              </div>
            </div>
            <div class="col-md-3">
              <label class="form-label small">{{ t('layoutCustomizer.k8') }}</label>
              <div class="input-group input-group-sm">
                <input type="color" class="form-control form-control-color"
                       style="max-width: 50px;"
                       v-model="layoutRef.sidebar.activeBg" />
                <input type="text" class="form-control" v-model="layoutRef.sidebar.activeBg" />
              </div>
            </div>
            <div class="col-md-3">
              <label class="form-label small">{{ t('layoutCustomizer.k9') }}</label>
              <input type="number" class="form-control form-control-sm"
                     min="160" max="320"
                     v-model.number="layoutRef.sidebar.width" />
            </div>
          </div>
          <div v-else class="text-secondary small mb-3">
            <i class="bi bi-info-circle me-1"></i>
            {{ t('layoutCustomizer.k10') }}
          </div>

          <!-- 메뉴 항목 리스트 -->
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label small mb-0">{{ t('layoutCustomizer.k11') }}</label>
            <button class="btn btn-sm btn-outline-primary" @click="addMenuItem">
              <i class="bi bi-plus-lg me-1"></i>{{ t('layoutCustomizer.k12') }}
            </button>
          </div>
          <div v-if="!(layoutRef.sidebar?.items?.length)" class="text-secondary small py-2">
            {{ t('layoutCustomizer.k13') }}
          </div>
          <div v-else class="menu-item-list">
            <div v-for="(it, idx) in layoutRef.sidebar.items" :key="idx" class="menu-item-row">
              <select v-model="it.icon" class="form-select form-select-sm icon-select">
                <option v-for="ic in availableIcons" :key="ic" :value="ic">{{ ic }}</option>
              </select>
              <input v-model="it.label" class="form-control form-control-sm"
                     :placeholder="t('layoutCustomizer.k17')" />
              <input v-model="it.path"  class="form-control form-control-sm"
                     placeholder="/path" />
              <div class="btn-group">
                <button class="btn btn-sm btn-outline-secondary"
                        @click="moveMenuItem(idx, -1)" :disabled="idx === 0"
                        :title="t('layoutCustomizer.k18')"><i class="bi bi-arrow-up"></i></button>
                <button class="btn btn-sm btn-outline-secondary"
                        @click="moveMenuItem(idx, 1)"
                        :disabled="idx === layoutRef.sidebar.items.length - 1"
                        :title="t('layoutCustomizer.k19')"><i class="bi bi-arrow-down"></i></button>
                <button class="btn btn-sm btn-outline-danger"
                        @click="removeMenuItem(idx)" :title="t('layoutCustomizer.k20')">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3) 메인 영역 -->
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button"
                data-bs-toggle="collapse" data-bs-target="#cAccMain">
          <i class="bi bi-columns me-2"></i>{{ t('layoutCustomizer.k14') }}
        </button>
      </h2>
      <div id="cAccMain" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label small">{{ t('layoutCustomizer.k5') }}</label>
              <div class="input-group input-group-sm">
                <input type="color" class="form-control form-control-color"
                       style="max-width: 50px;"
                       v-model="layoutRef.mainArea.bgColor" />
                <input type="text" class="form-control" v-model="layoutRef.mainArea.bgColor" />
              </div>
            </div>
            <div class="col-md-6">
              <label class="form-label small">{{ t('layoutCustomizer.k15') }}</label>
              <input type="number" class="form-control form-control-sm"
                     min="0" max="64"
                     v-model.number="layoutRef.mainArea.padding" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-item-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.menu-item-row {
  display: grid;
  grid-template-columns: 150px 1fr 1fr 150px;
  gap: 0.5rem;
  align-items: center;
}
.icon-select {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.8rem;
}
</style>
