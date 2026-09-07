<script setup>
/**
 * CompositeBuilder (Phase 5-c) — 선택 기반 Canvas.
 *
 *  Phase 5-b 의 "인라인 컨트롤 + 패널 없음" 구조에서
 *  Phase 5-c 의 "캔버스 + 우측 Properties Panel" 구조로 재편.
 *
 *  이 컴포넌트의 책임:
 *   - row 와 widget 을 시각적으로 렌더링 (widget.style 적용)
 *   - 클릭 시 selection 변경 (row 또는 widget)
 *   - Row 추가 프리셋 버튼 표시 (+ 항상 노출되어야 하는 action)
 *   - rows 변환 요청(immutable)은 Phase 5-b 와 같이 update:rows 로 emit
 *
 *  인라인 편집 컨트롤(드롭다운, ← → × 등)은 모두 제거됨.
 *  모든 편집은 PropertiesPanel 에서 수행.
 *
 *  props:
 *    spec      : ScreenSpec
 *    selection : { kind: 'row'|'widget', rowId, widgetId? } | null
 *  emits:
 *    update:rows(nextRows)
 *    update:selection(sel|null)
 */
import { computed, ref } from 'vue';
import {
  ROW_PRESETS, getWidgetKind,
  createRow, createWidget,
  validateWidths, appendWidth, removeWidth, swapWidths,
  ensureWidgetStyle, ensureRowStyle, DEFAULT_WIDGET_STYLE, DEFAULT_ROW_STYLE,
} from '../../generator/screens/compositeSchema';
import WidgetKindPalette from './WidgetKindPalette.vue';   // ★ v1.21.1
import { useI18n } from '../../composables/useI18n';

/* ★ v1.21.1 — import 뒤에 선언한다 */
const { t } = useI18n();

const props = defineProps({
  spec:      { type: Object, required: true },
  selection: { type: Object, default: null },
});
const emit = defineEmits(['update:rows', 'update:selection', 'add-widget', 'pick-source']);

const totalWidgets = computed(() =>
  (props.spec.rows || []).reduce((n, r) => n + (r.widgets?.length || 0), 0)
);

function widthLabel(widths) { return `[${widths.join(',')}]`; }

/* ─── rows 불변 변환 ─── */

function emitRows(nextRows) { emit('update:rows', nextRows); }

/* ★ v1.21.1 — 캔버스에서 위젯 종류 바꾸기 */
const kindTarget = ref(null);          // { rowId, widgetId }
const kindPaletteOpen = computed(() => !!kindTarget.value);

function openKindPalette(rowId, widgetId) {
  kindTarget.value = { rowId, widgetId };
}

function currentKindOf(target) {
  const row = (props.spec.rows || []).find((r) => r.id === target?.rowId);
  return row?.widgets?.find((w) => w.id === target?.widgetId)?.kind || '';
}

function applyKind(kindId) {
  const tg = kindTarget.value;
  kindTarget.value = null;
  if (!tg || !kindId) return;
  emitRows((props.spec.rows || []).map((r) => (r.id !== tg.rowId ? r : {
    ...r,
    widgets: r.widgets.map((w) => (w.id !== tg.widgetId ? w : { ...w, kind: kindId })),
  })));
  emit('update:selection', { kind: 'widget', rowId: tg.rowId, widgetId: tg.widgetId });
}

function addRow(widths) {
  const newRow = createRow({ widths });
  emitRows([...(props.spec.rows || []), newRow]);
  // 새 row 를 선택 상태로 만들어 패널이 바로 표시되게
  emit('update:selection', { kind: 'row', rowId: newRow.id });
}

/* ─── 선택 ─── */

function selectRow(rowId, ev) {
  // widget 클릭 시 이벤트 버블링을 막아 row 선택으로 덮어쓰지 않게
  if (ev) ev.stopPropagation();
  emit('update:selection', { kind: 'row', rowId });
}

function selectWidget(rowId, widgetId, ev) {
  if (ev) ev.stopPropagation();
  emit('update:selection', { kind: 'widget', rowId, widgetId });
}

function isRowSelected(rowId) {
  return props.selection?.kind === 'row' && props.selection?.rowId === rowId;
}

function isWidgetSelected(widgetId) {
  return props.selection?.kind === 'widget' && props.selection?.widgetId === widgetId;
}

/* ─── style 계산 ─── */

function widgetCardStyle(widget) {
  const s = { ...DEFAULT_WIDGET_STYLE, ...(widget.style || {}) };
  const out = {
    padding: `${s.padding}px`,
    backgroundColor: s.bgColor,
    border: s.border ? '1px solid #e5e7eb' : '1px solid transparent',
    borderRadius: '0.375rem',
  };
  if (s.height !== 'auto') out.minHeight = `${s.height}px`;
  if (s.shadow === 'sm') out.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
  else if (s.shadow === 'md') out.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
  return out;
}

function rowStyle(row) {
  const s = { ...DEFAULT_ROW_STYLE, ...(row.style || {}) };
  return {
    gap: `${s.gap}px`,
    padding: `${s.padding}px`,
    backgroundColor: s.bgColor,
  };
}

function widgetKindMeta(w) {
  return getWidgetKind(w.kind) || getWidgetKind('text');
}

function sourceBadge(widget) {
  if (!widget.source) return { text: '데이터 소스 미설정', tone: 'muted' };
  const s = widget.source;
  if (s.type === 'endpoint') {
    return { text: `${s.method || 'GET'} ${s.path || '?'}`, tone: 'primary' };
  }
  if (s.type === 'storeState')   return { text: `${s.resourceKey || '?'}.${s.stateName || '?'}`, tone: 'success' };
  if (s.type === 'storeCompute') return { text: `${s.op}(${s.resourceKey}.${s.stateName})`, tone: 'warning' };
  if (s.type === 'customVar')    return { text: `var: ${s.varName || '?'}`, tone: 'info' };
  return { text: s.type, tone: 'muted' };
}

/* ─── 외부에 expose 되는 transform 함수 (부모가 actions 로 주입받아 씀) ─── */
/*  이 변환들은 PropertiesPanel 에서 호출되므로 export 가 아닌 부모 ScreenStudioView 에서
    동일 로직을 가진 함수들을 actions 로 구성해 패널에 내려준다.
    여기(Canvas) 에선 Row 추가 UI 만 필요. */

</script>

<template>
  <div class="composite-canvas">

    <!-- 상단: 메타 -->
    <div class="canvas-head d-flex align-items-center gap-2 mb-3">
      <span class="small text-secondary">
        <i class="bi bi-layout-three-columns me-1"></i>
        {{ spec.rows.length }} rows · {{ totalWidgets }} widgets
      </span>
      <span class="small text-secondary ms-auto" v-if="selection">
        <i class="bi bi-hand-index me-1"></i>
        {{ selection.kind === 'row' ? 'Row' : 'Widget' }} 선택됨 — 오른쪽에서 편집
      </span>
      <span class="small text-secondary ms-auto" v-else>
        Row 또는 Widget 을 클릭하면 속성 편집 패널이 나타납니다.
      </span>
    </div>

    <!-- 빈 상태 -->
    <div v-if="!spec.rows.length" class="canvas-empty alert alert-light border text-center py-4 mb-3">
      <i class="bi bi-plus-square fs-2 d-block mb-2 opacity-50"></i>
      <div class="fw-semibold mb-1">아직 row 가 없습니다</div>
      <div class="small text-secondary">아래 프리셋 버튼으로 첫 row 를 추가하세요.</div>
    </div>

    <!-- Rows -->
    <div v-else class="canvas-rows">
      <div v-for="(row, rowIdx) in spec.rows"
           :key="row.id"
           class="canvas-row"
           :class="{ selected: isRowSelected(row.id) }"
           @click="selectRow(row.id, $event)">

        <!-- Row 핸들 (번호 + 분할 정보만 표시) -->
        <div class="row-handle">
          <span class="badge bg-secondary me-1">Row {{ rowIdx + 1 }}</span>
          <span class="small text-secondary">{{ widthLabel(row.widths) }}</span>
        </div>

        <!-- Widgets (flex: widths) -->
        <!-- ★ v1.21.2 — 선택한 Row 에만 [+ widget] 을 띄운다.
             예전에는 오른쪽 속성 패널까지 가야 했다. 모든 Row 에 늘 띄우면 캔버스가 복잡해지므로
             **고른 Row 에만** 보인다 — 필요할 때만 나타나고 평소에는 조용하다. -->
        <div class="canvas-widgets" :style="rowStyle(row)">
          <div v-for="(w, wIdx) in row.widgets"
               :key="w.id"
               class="canvas-widget-slot"
               :style="{ flex: row.widths[wIdx] }"
               @click="selectWidget(row.id, w.id, $event)">

            <div class="canvas-widget"
                 :class="{ selected: isWidgetSelected(w.id) }"
                 :style="widgetCardStyle(w)">

              <!-- widget 상단: kind 라벨 + 제목 -->
              <div class="widget-head d-flex align-items-center gap-2 mb-1">
                <!-- ★ v1.21.1 — 종류 배지를 눌러 **캔버스에서 바로** 바꾼다.
                     예전에는 위젯을 고르고 → 오른쪽 속성 패널로 가서 → 거기서 팔레트를 열어야 했다.
                     빌더에서는 "보고 있는 자리에서 바꾸는" 것이 자연스럽다. -->
                <button type="button" class="badge bg-light text-dark border small kind-btn"
                        :title="t('builder.changeKind')"
                        @click.stop="openKindPalette(row.id, w.id)">
                  {{ widgetKindMeta(w).label }}
                  <i class="bi bi-chevron-down ms-1" style="font-size:.7em; opacity:.55"></i>
                </button>
                <span v-if="w.title" class="small fw-semibold text-truncate">{{ w.title }}</span>
                <span v-else class="small text-secondary fst-italic">제목 없음</span>
              </div>

              <!-- widget 본문 (현재는 kind 설명만) -->
              <div class="widget-body small text-secondary">
                {{ widgetKindMeta(w).description }}
              </div>

              <!-- 데이터 소스 배지.
                   ★ v1.22.1 — 눌러서 **바로 설정**한다.
                   예전에는 "데이터 소스 미설정" 이라고 알려만 주는 회색 딱지였다.
                   무엇이 잘못됐는지는 말해 주면서 고치는 길은 알려 주지 않았으니,
                   처음 쓰는 사람은 여기서 막힌다(실제로 그렇게 막혔다).
                   이제 이 딱지가 오른쪽 [Data Source] 탭을 열어 준다. -->
              <button type="button" class="widget-source small mt-2 src-btn"
                      :class="'tone-' + sourceBadge(w).tone"
                      :title="w.source ? t('builder.changeSource') : t('builder.setSource')"
                      @click.stop="$emit('pick-source', { rowId: row.id, widgetId: w.id })">
                <i class="bi bi-database"></i>
                <span class="source-text">{{ sourceBadge(w).text }}</span>
                <i v-if="!w.source" class="bi bi-pencil-square ms-1" style="font-size:.85em"></i>
          <button v-if="isRowSelected(row.id) && row.widgets.length < 6"
                  type="button" class="btn btn-sm btn-outline-primary add-widget-btn"
                  :title="t('builder.addWidgetHere')"
                  @click.stop="$emit('add-widget', row.id)">
            <i class="bi bi-plus-lg"></i>
          </button>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 추가 프리셋 바 -->
    <div class="canvas-presets d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top">
      <span class="fw-semibold me-1">
        <i class="bi bi-plus-square me-1"></i>Row 추가:
      </span>
      <button v-for="p in ROW_PRESETS" :key="p.label"
              class="btn btn-sm btn-outline-primary"
              @click="addRow(p.widths)"
              :title="`widths = ${widthLabel(p.widths)}`">
        {{ p.label }}
        <span class="ms-1 text-secondary small">{{ widthLabel(p.widths) }}</span>
      </button>
    </div>
  </div>

  <WidgetKindPalette v-if="kindPaletteOpen"
                     :current-kind="currentKindOf(kindTarget)"
                     @select="applyKind" @close="kindTarget = null" />
</template>

<style scoped>
/* 데이터 소스 딱지는 눌리는 것이다 — 미설정일 때 특히 눈에 띄게 */
.src-btn { cursor: pointer; border: 1px dashed transparent; background: none; }
.src-btn:hover { border-color: currentColor; opacity: .85; }
.src-btn.tone-muted { border-color: rgba(0,0,0,.18); }

/* 선택한 Row 에만 나타나는 [+ widget] — 캔버스를 어지럽히지 않게 작고 조용하게 */
.add-widget-btn { align-self: center; flex: 0 0 auto; height: 38px; opacity: .8; }
.add-widget-btn:hover { opacity: 1; }

/* ★ v1.21.1 — 종류 배지가 눌리는 것임을 보이게 (배지처럼 생겼지만 단추다) */
.kind-btn { cursor: pointer; border: 1px solid var(--bs-border-color, #dee2e6) !important; }
.kind-btn:hover { background: #e9ecef !important; border-color: #adb5bd !important; }

.composite-canvas {
  min-height: 200px;
}

/* Row */
/* ★ v1.21.2 — 캔버스 안에서만 스크롤한다.
   화면에 Row 가 늘어나면 페이지 전체가 길어져, 아래쪽 [Row 추가] 버튼과
   오른쪽 속성 패널이 시야에서 밀려났다. 캔버스에 높이를 주면
   **무엇을 편집하든 도구는 제자리에** 있다.
   (조사에서 본 3분할 — 팔레트·라이브뷰·설정 — 도 각 칸이 각자 스크롤하는 것이 전제다) */
.canvas-rows {
  max-height: 58vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;      /* 스크롤바가 카드 테두리를 가리지 않게 */
}

.canvas-row {
  position: relative;
  padding: 0.5rem;
  margin-bottom: 0.75rem;
  border-radius: 0.375rem;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.1s, background-color 0.1s;
}
.canvas-row:hover {
  background: #fafbfc;
}
.canvas-row.selected {
  border-color: #0d6efd;
  background: #f0f6ff;
}

.row-handle {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-left: 0.25rem;
}

/* Widgets 행 */
.canvas-widgets {
  display: flex;
  flex-wrap: wrap;
}

.canvas-widget-slot {
  min-width: 180px;
  min-height: 0;
  cursor: pointer;
}

/* Widget 카드 — inline :style 로 style 적용됨, 여기선 선택 강조만 */
.canvas-widget {
  position: relative;
  height: 100%;
  transition: box-shadow 0.1s, transform 0.1s;
}
.canvas-widget:hover {
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25) !important;
}
.canvas-widget.selected {
  box-shadow: 0 0 0 3px #0d6efd !important;
}

.widget-head {
  min-height: 1.5rem;
}

.widget-source {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid transparent;
  font-size: 0.7rem;
  max-width: 100%;
}
.source-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, Menlo, Consolas, monospace;
}

.widget-source.tone-muted   { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }
.widget-source.tone-primary { background: #eff6ff; color: #1d4ed8; border-color: #dbeafe; }
.widget-source.tone-success { background: #ecfdf5; color: #059669; border-color: #d1fae5; }
.widget-source.tone-warning { background: #fffbeb; color: #b45309; border-color: #fde68a; }
.widget-source.tone-info    { background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe; }
</style>
