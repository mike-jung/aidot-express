<script setup>
/**
 * WidgetKindPalette — Widget 종류 선택 대화상자.
 *
 *  Phase 24: 기존 PropertiesPanel 의 select 박스를 대체.
 *  WIDGET_KINDS 의 13종을 category 별로 그룹화해서 SVG 아이콘 카드로 보여줌.
 *
 *  props:
 *    currentKind : 현재 선택된 kind id
 *  emits:
 *    close
 *    select(kindId)
 */
import { ref } from 'vue';
// ★ v1.10.15 — 카탈로그 라벨/설명은 사전에서 조회한다
import { useI18n } from '../../composables/useI18n';

import { WIDGET_KINDS } from '../../generator/screens/compositeSchema';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t, catalogLabel, catalogDesc } = useI18n();

const props = defineProps({
  currentKind: { type: String, default: '' },
});
const emit = defineEmits(['close', 'select']);

const hoveredKind = ref(props.currentKind);

const CATEGORIES = [
  { id: 'data',   label: '데이터 표시',   color: '#0d6efd' },
  { id: 'viz',    label: '시각화',       color: '#6f42c1' },
  { id: 'action', label: '입력 / 액션',  color: '#198754' },
  { id: 'media',  label: '미디어',       color: '#fd7e14' },
];

function kindsInCategory(catId) {
  return WIDGET_KINDS.filter((k) => (k.category || 'data') === catId);
}

function onPick(kind) {
  emit('select', kind.id);
  emit('close');
}
</script>

<template>
  <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);"
       @click.self="emit('close')" @keydown.esc="emit('close')">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-grid-3x3-gap me-2"></i>Widget 종류 선택
          </h5>
          <button type="button" class="btn-close" @click="emit('close')"></button>
        </div>
        <div class="modal-body">
          <p class="text-muted small mb-3">
            Widget 의 종류를 선택하세요. 미구현 종류(Phase 24 확장 예정)는 기본 종류로 자동 대체됩니다.
          </p>

          <div v-for="cat in CATEGORIES" :key="cat.id" class="mb-4">
            <div class="d-flex align-items-center mb-2">
              <div class="cat-dot" :style="{ backgroundColor: cat.color }"></div>
              <h6 class="mb-0 fw-semibold">{{ cat.label }}</h6>
              <span class="badge bg-secondary ms-2">{{ kindsInCategory(cat.id).length }}</span>
            </div>
            <div class="row g-2">
              <div v-for="k in kindsInCategory(cat.id)" :key="k.id" class="col-md-3 col-sm-4 col-6">
                <button class="kind-card w-100"
                        :class="{
                          selected: currentKind === k.id,
                          hovered: hoveredKind === k.id,
                        }"
                        :style="{ '--cat-color': cat.color }"
                        @click="onPick(k)"
                        @mouseenter="hoveredKind = k.id">
                  <div class="kind-icon">
                    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                      <rect width="60" height="40" fill="#f8fafc" rx="2" />
                      <!-- stat: 큰 숫자 -->
                      <template v-if="k.icon === 'stat'">
                        <rect x="6" y="8" width="14" height="2" fill="#94a3b8" />
                        <rect x="6" y="14" width="18" height="8" fill="#0d6efd" />
                        <rect x="6" y="28" width="24" height="6" fill="#22c55e" opacity="0.3" />
                      </template>
                      <!-- list: 가로 3-4 줄 -->
                      <template v-else-if="k.icon === 'list'">
                        <rect x="6" y="8" width="48" height="3" fill="#cbd5e1" />
                        <rect x="6" y="15" width="48" height="3" fill="#e2e8f0" />
                        <rect x="6" y="22" width="48" height="3" fill="#e2e8f0" />
                        <rect x="6" y="29" width="48" height="3" fill="#e2e8f0" />
                      </template>
                      <!-- list-paged: list + 페이지 번호 -->
                      <template v-else-if="k.icon === 'list-paged'">
                        <rect x="6" y="6" width="48" height="2" fill="#cbd5e1" />
                        <rect x="6" y="12" width="48" height="2" fill="#e2e8f0" />
                        <rect x="6" y="17" width="48" height="2" fill="#e2e8f0" />
                        <rect x="6" y="22" width="48" height="2" fill="#e2e8f0" />
                        <rect x="22" y="30" width="4" height="4" fill="#0d6efd" />
                        <rect x="28" y="30" width="4" height="4" fill="#cbd5e1" />
                        <rect x="34" y="30" width="4" height="4" fill="#cbd5e1" />
                      </template>
                      <!-- detail: key-value -->
                      <template v-else-if="k.icon === 'detail'">
                        <rect x="6" y="8" width="12" height="2" fill="#94a3b8" />
                        <rect x="22" y="8" width="28" height="3" fill="#0f172a" />
                        <rect x="6" y="15" width="12" height="2" fill="#94a3b8" />
                        <rect x="22" y="15" width="22" height="3" fill="#0f172a" />
                        <rect x="6" y="22" width="12" height="2" fill="#94a3b8" />
                        <rect x="22" y="22" width="26" height="3" fill="#0f172a" />
                        <rect x="6" y="29" width="12" height="2" fill="#94a3b8" />
                        <rect x="22" y="29" width="18" height="3" fill="#0f172a" />
                      </template>
                      <!-- text: 단일 텍스트 -->
                      <template v-else-if="k.icon === 'text'">
                        <rect x="6" y="12" width="14" height="2" fill="#94a3b8" />
                        <rect x="6" y="18" width="30" height="4" fill="#0f172a" />
                      </template>
                      <!-- markdown: 문단 + 제목 -->
                      <template v-else-if="k.icon === 'markdown'">
                        <rect x="6" y="7" width="20" height="3" fill="#0f172a" />
                        <rect x="6" y="14" width="48" height="2" fill="#cbd5e1" />
                        <rect x="6" y="19" width="44" height="2" fill="#cbd5e1" />
                        <rect x="6" y="24" width="40" height="2" fill="#cbd5e1" />
                        <rect x="6" y="29" width="46" height="2" fill="#cbd5e1" />
                      </template>
                      <!-- chart: bar chart -->
                      <template v-else-if="k.icon === 'chart'">
                        <line x1="6" y1="32" x2="54" y2="32" stroke="#94a3b8" stroke-width="0.5" />
                        <rect x="10" y="20" width="6" height="12" fill="#0d6efd" />
                        <rect x="20" y="12" width="6" height="20" fill="#198754" />
                        <rect x="30" y="18" width="6" height="14" fill="#ffc107" />
                        <rect x="40" y="8"  width="6" height="24" fill="#dc3545" />
                      </template>
                      <!-- progress: bar -->
                      <template v-else-if="k.icon === 'progress'">
                        <rect x="6" y="10" width="14" height="2" fill="#94a3b8" />
                        <rect x="6" y="18" width="48" height="6" rx="3" fill="#e2e8f0" />
                        <rect x="6" y="18" width="30" height="6" rx="3" fill="#0d6efd" />
                        <rect x="6" y="28" width="20" height="2" fill="#cbd5e1" />
                      </template>
                      <!-- timeline: 세로 선 + 점 -->
                      <template v-else-if="k.icon === 'timeline'">
                        <line x1="12" y1="6" x2="12" y2="36" stroke="#cbd5e1" stroke-width="1.5" />
                        <circle cx="12" cy="10" r="2.5" fill="#0d6efd" />
                        <rect x="18" y="9" width="30" height="2" fill="#0f172a" />
                        <rect x="18" y="13" width="20" height="2" fill="#94a3b8" />
                        <circle cx="12" cy="22" r="2.5" fill="#198754" />
                        <rect x="18" y="21" width="24" height="2" fill="#0f172a" />
                        <circle cx="12" cy="33" r="2.5" fill="#cbd5e1" />
                        <rect x="18" y="32" width="22" height="2" fill="#94a3b8" />
                      </template>
                      <!-- form: 입력 필드들 -->
                      <template v-else-if="k.icon === 'form'">
                        <rect x="6" y="7" width="48" height="5" rx="1" fill="#fff" stroke="#cbd5e1" />
                        <rect x="6" y="15" width="48" height="5" rx="1" fill="#fff" stroke="#cbd5e1" />
                        <rect x="6" y="23" width="48" height="5" rx="1" fill="#fff" stroke="#cbd5e1" />
                        <rect x="38" y="31" width="16" height="5" rx="1" fill="#0d6efd" />
                      </template>
                      <!-- button: 큰 버튼 -->
                      <template v-else-if="k.icon === 'button'">
                        <rect x="12" y="14" width="36" height="12" rx="2" fill="#198754" />
                        <rect x="22" y="18" width="16" height="4" fill="#fff" />
                      </template>
                      <!-- search: 돋보기 + input -->
                      <template v-else-if="k.icon === 'search'">
                        <rect x="6" y="14" width="48" height="8" rx="2" fill="#fff" stroke="#cbd5e1" />
                        <circle cx="12" cy="18" r="2.5" fill="none" stroke="#64748b" stroke-width="1" />
                        <line x1="14" y1="20" x2="16" y2="22" stroke="#64748b" stroke-width="1" />
                        <rect x="20" y="17" width="20" height="2" fill="#cbd5e1" />
                      </template>
                      <!-- image: 풍경 아이콘 -->
                      <template v-else-if="k.icon === 'image'">
                        <rect x="6" y="6" width="48" height="28" rx="2" fill="#eff6ff" stroke="#bfdbfe" />
                        <circle cx="16" cy="14" r="2.5" fill="#fbbf24" />
                        <polygon points="10,28 22,18 34,26 50,14 50,34 10,34" fill="#86efac" />
                      </template>
                    </svg>
                  </div>
                  <div class="kind-label">
                    {{ catalogLabel('widget', k) }}
                    <span v-if="k.fallbackKind" class="badge bg-light text-secondary border small ms-1" title="미구현 — runtime 대체">
                      beta
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="emit('close')">취소</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cat-dot {
  width: 8px; height: 8px; border-radius: 50%; margin-right: 0.5rem;
}
.kind-card {
  display: block;
  text-align: center;
  border: 1.5px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #fff;
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  transition: all 0.1s;
  --cat-color: #0d6efd;
}
.kind-card:hover, .kind-card.hovered {
  border-color: var(--cat-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}
.kind-card.selected {
  border-color: var(--cat-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--cat-color) 25%, transparent);
}
.kind-icon {
  padding: 0.5rem;
  background: #f1f5f9;
  border-bottom: 1px solid #e5e7eb;
}
.kind-icon svg {
  width: 100%; height: auto; display: block;
}
.kind-label {
  padding: 0.5rem;
  font-size: 0.85rem;
  font-weight: 500;
}
</style>
