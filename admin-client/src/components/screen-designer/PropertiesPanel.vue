<script setup>
import http from '../../api/http';
/**
 * PropertiesPanel — 우측 속성 편집 패널.
 *
 *  선택된 대상(row 또는 widget)에 따라 다른 에디터를 보여준다.
 *    - 아무것도 선택 안 됨 : 안내
 *    - row 선택           : 분할 방식 변경, 순서 이동, 삭제, row style (gap/padding/bg)
 *    - widget 선택         : 종류, 제목, 이동, 삭제, widget style (height/padding/border/shadow/bg)
 *                           + 데이터 소스 (Phase 6 에서 확장)
 *
 *  편집은 전부 부모의 콜백 함수(=props.actions)를 통해 일어남. 이 컴포넌트는
 *  상태를 소유하지 않음 — 부모(Canvas)가 가진 spec 을 조회만 함.
 *
 *  props:
 *    spec       : 현재 편집 중인 ScreenSpec (composite)
 *    selection  : { kind: 'row'|'widget', rowId, widgetId? } | null
 *    actions    : 부모가 주입하는 mutation 콜백 모음:
 *      - setRowWidths(rowId, widths)
 *      - moveRow(rowId, dir)
 *      - removeRow(rowId)
 *      - updateRowStyle(rowId, patch)
 *      - updateWidgetKind(rowId, widgetId, kind)
 *      - updateWidgetTitle(rowId, widgetId, title)
 *      - updateWidgetStyle(rowId, widgetId, patch)
 *      - moveWidget(rowId, widgetId, dir)
 *      - removeWidget(rowId, widgetId)
 *      - editSource(rowId, widget)   // Phase 6
 *  emits:
 *    close : 선택 해제 요청
 */
import { computed, ref, watch } from 'vue';
// ★ v1.10.8 — 다국어
import { useI18n } from '../../composables/useI18n';

import {
  WIDGET_KINDS, ROW_PRESETS, getWidgetKind,
  SHADOW_OPTIONS,
  // ★ v1.9.1 — 화면 전환
  ROW_CLICK_ACTIONS, isRowClickable, createRowClick, effectiveParams,
  rowFieldCandidates, validateRowClick,
} from '../../generator/screens/compositeSchema';
import DataSourcePicker from './DataSourcePicker.vue';
// Phase 24: widget kind 선택 Palette 대화상자
import WidgetKindPalette from './WidgetKindPalette.vue';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t, catalogLabel, catalogDesc } = useI18n();

const props = defineProps({
  /* ★ v1.22.1 — 캔버스의 [데이터 소스] 딱지를 눌렀을 때 이 패널의 Data Source 탭이 바로 열리게 한다.
     값이 바뀔 때마다(같은 값이어도) 열리도록 숫자를 함께 받는다. */
  openSourceTick: { type: Number, default: 0 },
  spec:      { type: Object, required: true },
  selection: { type: Object, default: null },
  actions:   { type: Object, required: true },
  /* ★ v1.9.1 — 같은 프로젝트의 다른 화면들. '눌렀을 때 → 화면 이동' 의 대상 목록이자
     그 화면이 요구하는 파라미터를 읽어 오는 출처다. 없으면 이동 설정을 숨긴다. */
  screens:   { type: Array, default: () => [] },
});
const emit = defineEmits(['close']);

/**
 * Phase 8: Widget 선택 시 내부 탭 (Properties / Data Source).
 *  이전에는 "Data Source" 영역이 Properties 아래에 눌려서 좁았음.
 *  이제 탭 전환으로 Data Source 가 패널 전체를 차지할 수 있어 선택이 쉬움.
 */
const activeTab = ref('props');   // 'props' | 'source'

// Phase 24: Widget kind 선택 Palette 대화상자 표시 여부
const showKindPalette = ref(false);

/* Widget 선택이 바뀌면 Props 탭으로 자동 복귀 (일관된 UX)
   ⚠ 단, **데이터 소스 딱지를 눌러 들어온 경우는 예외**다.
     그때는 선택 변경과 "Data Source 탭 열기" 가 같은 순간에 일어나는데,
     이 감시자가 뒤에 돌면서 애써 연 탭을 props 로 되돌려 버렸다.
     감시자 실행 순서에 기대지 않도록, 같은 tick 값이면 되돌리지 않는다. */
let handledTick = 0;              // 우리가 이미 반영한 tick
watch(
  () => [props.selection?.kind, props.selection?.widgetId],
  () => {
    /* 아직 반영하지 않은 tick 이 올라와 있다 = 데이터 소스 딱지를 눌러 들어온 참이다.
       그 경우 여기서 props 로 되돌리면 안 된다. */
    if (props.openSourceTick > handledTick) return;
    activeTab.value = 'props';
  },
);

// Phase 8: Data Source 탭으로 전환 시 편집기 자동 열기 (소스 없을 때 한해)
// 이미 source 가 있으면 요약 뷰를 보여줌 (사용자가 버튼으로 편집 진입)
/* immediate: 패널이 처음 그려질 때 이미 tick 이 올라가 있을 수 있다.
   (딱지 클릭 → 위젯 선택 → 패널이 새로 그려짐 → 그 시점엔 감시자가 아직 안 돈다) */
watch(() => props.openSourceTick, (n) => {
  if (!n || n <= handledTick) return;
  handledTick = n;
  activeTab.value = 'source';
}, { immediate: true, flush: 'post' });

watch(activeTab, (tab) => {
  if (tab === 'source') {
    // 자동으로 편집기 열진 않음 — 요약 뷰부터 보여주는 게 일관됨
  } else {
    // Props 탭으로 돌아가면 편집기 닫음
    editingSource.value = false;
  }
});

/* ─── 선택 대상 찾기 ─── */

const selectedRow = computed(() => {
  if (!props.selection) return null;
  return (props.spec.rows || []).find((r) => r.id === props.selection.rowId) || null;
});

const selectedWidget = computed(() => {
  if (!props.selection || props.selection.kind !== 'widget') return null;
  const row = selectedRow.value;
  if (!row) return null;
  return row.widgets.find((w) => w.id === props.selection.widgetId) || null;
});

const selectedWidgetIdx = computed(() => {
  if (!selectedRow.value || !selectedWidget.value) return -1;
  return selectedRow.value.widgets.findIndex((w) => w.id === selectedWidget.value.id);
});

const selectedRowIdx = computed(() => {
  if (!selectedRow.value) return -1;
  return (props.spec.rows || []).findIndex((r) => r.id === selectedRow.value.id);
});

const rowCount = computed(() => (props.spec.rows || []).length);

function widthLabel(widths) { return `[${widths.join(',')}]`; }

/* ─── 편집 핸들러 (props.actions 로 프록시) ─── */

// 데이터 소스 편집 모드 — true 면 Widget 섹션 하단에 DataSourcePicker 인라인 렌더.
// Widget 선택이 바뀌거나 아예 해제되면 자동으로 false 로 되돌림.
const editingSource = ref(false);

watch(
  () => [props.selection?.kind, props.selection?.rowId, props.selection?.widgetId],
  () => { editingSource.value = false; },
);

function openSourceEditor() { editingSource.value = true; }
function closeSourceEditor() { editingSource.value = false; }

/* ══════════════════════════════════════════════════════════════════════
   ★ v1.9.1 — 눌렀을 때 (행 클릭 → 화면 이동)
   ══════════════════════════════════════════════════════════════════════ */

/** 이 위젯이 행 클릭을 가질 수 있는가 */
const canRowClick = computed(() =>
  !!selectedWidget.value && isRowClickable(selectedWidget.value.kind));

/** 이동할 수 있는 화면 — 자기 자신은 뺀다(무한 루프) */
const navTargets = computed(() =>
  (props.screens || []).filter((sc) => sc.id !== props.spec?.id));

const rowClick = computed(() => selectedWidget.value?.onRowClick || createRowClick());

/** 고른 대상 화면이 요구하는 파라미터 */
const targetParams = computed(() => {
  const t = navTargets.value.find((sc) => sc.id === rowClick.value.target);
  return t ? effectiveParams(t) : [];   // ★ v1.11.7 경로의 :id 도 파라미터
});

/** 바인딩에 고를 수 있는 행 필드 */
const fieldOptions = computed(() =>
  selectedWidget.value ? rowFieldCandidates(selectedWidget.value) : ['id']);

/** 이 설정의 문제점 — 저장 전에 화면에서 알려 준다 */
const rowClickIssues = computed(() => {
  if (!selectedWidget.value) return [];
  return validateRowClick(selectedWidget.value, props.screens || [], props.spec?.id);
});

function patchRowClick(patch) {
  if (!selectedWidget.value) return;
  const next = { ...rowClick.value, ...patch };
  props.actions.updateWidgetRowClick?.(
    selectedRow.value.id, selectedWidget.value.id, next);
}

/**
 * 대상 화면을 고르면 파라미터를 **자동으로 추천**한다.
 *  대상이 요구하는 이름과 같은 필드가 행에 있으면 (`id` → `row.id`) 미리 채운다.
 *  대부분은 그대로 두면 맞는다 — 매번 손으로 고르게 하면 지겹다.
 */
function onNavTargetChange(targetId) {
  const t = navTargets.value.find((sc) => sc.id === targetId);
  const params = {};
  for (const prm of (t ? effectiveParams(t) : [])) {
    const hit = fieldOptions.value.includes(prm.name) ? prm.name : null;
    if (hit) params[prm.name] = `row.${hit}`;
  }
  patchRowClick({ target: targetId, params });
}

function onActionChange(action) {
  // 'none' 으로 되돌리면 설정을 비운다 — 남겨 두면 종류를 바꿨을 때 쓰레기가 된다
  patchRowClick(action === 'none' ? { action, target: '', params: {} } : { action });
}

function setParamBinding(name, field) {
  patchRowClick({ params: { ...rowClick.value.params, [name]: field ? `row.${field}` : '' } });
}

/** `row.id` → `id` (셀렉트 표시용) */
function bindingField(name) {
  const v = rowClick.value.params?.[name] || '';
  const m = /^row\.([\w$]+)$/.exec(v);
  return m ? m[1] : '';
}

/**
 * ★ v1.22.4 — 입력 필드를 자동으로 채워도 되는 상태인가?
 *
 *  예전 조건은 "필드가 하나도 없을 때" 였다. 그런데 수정·삭제 템플릿은
 *  처음부터 `id` 하나를 넣어 둔다. 그래서 **조건이 영영 참이 되지 않아**
 *  데이터 소스를 붙여도 입력란이 `id` 하나로 남았다.
 *  ("수정 화면인데 입력란이 없다" 는 말이 여기서 나왔다)
 *
 *  → `id` 처럼 **틀에서 넣어 준 것만** 있으면 아직 비어 있는 것으로 본다.
 *    사람이 직접 넣은 필드가 하나라도 있으면 건드리지 않는다.
 */
const sourceNote = ref('');            // ★ v1.23.0 — 입력란이 안 채워진 까닭
const SCAFFOLD_FIELDS = new Set(['id']);
function hasUserFields(cfg) {
  const f = Array.isArray(cfg?.fields) ? cfg.fields : [];
  return f.some((x) => x?.name && !SCAFFOLD_FIELDS.has(x.name));
}

async function onSourceApply(newSource) {
  if (!selectedRow.value || !selectedWidget.value) return;
  props.actions.applySource(selectedRow.value.id, selectedWidget.value.id, newSource);
  editingSource.value = false;
  /* ★ v1.11.7 — 폼 위젯(Form Dialog · Query Form)에 POST/PUT 소스를 붙였는데 입력 필드가 비어 있으면
     컨트롤러의 파라미터 분석(/api/admin/screen-wizard/analyze)으로 필드를 채운다.
     예전에는 :fields='[]' 로 나가 "새 책 등록" 폼에 입력칸이 하나도 없었다. */
  const w = selectedWidget.value;
  const kind = w.kind;
  const cfg = w.config || {};
  if (newSource?.type === 'endpoint' && newSource.controllerId && newSource.handlerName
      && ['formDialog', 'form', 'queryForm'].includes(kind) && !hasUserFields(cfg)) {
    try {
      const r = await http.get('/api/admin/screen-wizard/analyze', { params: { controllerId: newSource.controllerId, handler: newSource.handlerName } });
      const inputs = (r.data?.data?.inputs || []).filter((i) => i.name && !['requestCode', 'id'].includes(i.name) || (i.name === 'id' && kind === 'queryForm'));
      if (inputs.length) {
        const fields = inputs.map((i) => ({ name: i.name, label: i.name, type: i.type === 'number' || i.type === 'integer' ? 'number' : 'text', required: !!i.required, default: i.default ?? '' }));
        props.actions.updateWidgetConfig?.(selectedRow.value.id, w.id, { ...cfg, fields });
        sourceNote.value = '';
      } else {
        /* ★ v1.23.0 — 입력이 하나도 없으면 **왜 그런지** 서버가 준 까닭을 보여 준다.
           예전에는 조용히 비어 있어서, 사람이 무엇을 잘못했는지 알 수 없었다. */
        sourceNote.value = r.data?.data?.inputsNote || '';
      }
    } catch (e) { sourceNote.value = String(e?.message || e); }
  }
}

function onSourceClear() {
  if (!selectedRow.value || !selectedWidget.value) return;
  props.actions.clearSource(selectedRow.value.id, selectedWidget.value.id);
  editingSource.value = false;
}

function onWidthsChange(e) {
  const preset = ROW_PRESETS.find((p) => widthLabel(p.widths) === e.target.value);
  if (preset && selectedRow.value) {
    props.actions.setRowWidths(selectedRow.value.id, preset.widths);
  }
}

function onRowStylePatch(patch) {
  if (!selectedRow.value) return;
  props.actions.updateRowStyle(selectedRow.value.id, patch);
}

function onWidgetKindChange(kind) {
  if (!selectedRow.value || !selectedWidget.value) return;
  props.actions.updateWidgetKind(selectedRow.value.id, selectedWidget.value.id, kind);
}

function onWidgetTitleChange(title) {
  if (!selectedRow.value || !selectedWidget.value) return;
  props.actions.updateWidgetTitle(selectedRow.value.id, selectedWidget.value.id, title);
}

function onWidgetStylePatch(patch) {
  if (!selectedRow.value || !selectedWidget.value) return;
  props.actions.updateWidgetStyle(selectedRow.value.id, selectedWidget.value.id, patch);
}

/* ─── height 는 'auto' | number 이중 타입. UI 에선 체크박스 + 숫자 쌍으로 분해 ─── */

const widgetHeightAuto = computed({
  get: () => selectedWidget.value?.style?.height === 'auto',
  set: (auto) => {
    onWidgetStylePatch({ height: auto ? 'auto' : 200 });
  },
});

const widgetHeightValue = computed({
  get: () => {
    const h = selectedWidget.value?.style?.height;
    return typeof h === 'number' ? h : 200;
  },
  set: (v) => {
    const n = Math.max(40, Math.min(2000, Number(v) || 200));
    onWidgetStylePatch({ height: n });
  },
});
</script>

<template>
  <aside class="props-panel">
    <!-- 패널 헤더 -->
    <div class="panel-header d-flex justify-content-between align-items-center">
      <h6 class="mb-0">
        <i class="bi bi-sliders me-1"></i>Properties
      </h6>
      <button v-if="selection" class="btn btn-sm btn-link text-secondary p-0"
              @click="emit('close')" :title="t('propertiesPanel.k13')">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <!-- 선택 없음 -->
    <div v-if="!selection" class="panel-body-empty">
      <i class="bi bi-hand-index fs-2 d-block mb-2 opacity-50"></i>
      <div class="small text-secondary">
        {{ t('designer.pickHint') }}
      </div>
    </div>

    <!-- Row 선택 -->
    <div v-else-if="selection.kind === 'row' && selectedRow" class="panel-body">
      <div class="section-title">
        <span class="badge bg-primary me-1">Row</span>
        <span>{{ selectedRowIdx + 1 }} / {{ rowCount }}</span>
      </div>

      <!-- 분할 방식 -->
      <div class="field">
        <label class="form-label">{{ t('props.splitMode') }}</label>
        <select class="form-select form-select-sm"
                :value="widthLabel(selectedRow.widths)"
                @change="onWidthsChange">
          <option v-for="p in ROW_PRESETS" :key="p.label" :value="widthLabel(p.widths)">
            {{ p.label }} {{ widthLabel(p.widths) }}
          </option>
          <option v-if="!ROW_PRESETS.find(p => widthLabel(p.widths) === widthLabel(selectedRow.widths))"
                  :value="widthLabel(selectedRow.widths)" disabled>
            {{ t('designer.customWidth') }} {{ widthLabel(selectedRow.widths) }}
          </option>
        </select>
        <div class="form-text">{{ t('props.splitHint') }}</div>
      </div>

      <!-- 순서 / 삭제 -->
      <div class="field">
        <label class="form-label">{{ t('props.orderDelete') }}</label>
        <div class="btn-group w-100">
          <button class="btn btn-sm btn-outline-secondary"
                  :disabled="selectedRowIdx <= 0"
                  @click="actions.moveRow(selectedRow.id, 'up')"
                  :title="t('propertiesPanel.k14')">
            <i class="bi bi-arrow-up"></i> {{ t('props.moveUp') }}
          </button>
          <button class="btn btn-sm btn-outline-secondary"
                  :disabled="selectedRowIdx >= rowCount - 1"
                  @click="actions.moveRow(selectedRow.id, 'down')"
                  :title="t('propertiesPanel.k15')">
            <i class="bi bi-arrow-down"></i> {{ t('props.moveDown') }}
          </button>
          <button class="btn btn-sm btn-outline-danger"
                  @click="actions.removeRow(selectedRow.id)">
            <i class="bi bi-trash"></i> {{ t('common.delete') }}
          </button>
        </div>
      </div>

      <!-- Widget 추가 -->
      <div class="field">
        <label class="form-label">Widget</label>
        <button class="btn btn-sm btn-outline-primary w-100"
                :disabled="selectedRow.widgets.length >= 6"
                @click="actions.addWidgetToRow(selectedRow.id)">
          <i class="bi bi-plus-lg me-1"></i>
          {{ t('props.addWidgetHere') }}
          <span class="text-secondary small">({{ selectedRow.widgets.length }} / 6)</span>
        </button>
      </div>

      <hr />

      <!-- Row style -->
      <div class="section-subtitle">{{ t('props.style') }}</div>

      <div class="field">
        <label class="form-label">{{ t('props.gap') }}</label>
        <input type="number" class="form-control form-control-sm"
               min="0" max="64"
               :value="selectedRow.style?.gap ?? 16"
               @input="onRowStylePatch({ gap: Number($event.target.value) || 0 })" />
      </div>

      <div class="field">
        <label class="form-label">{{ t('props.rowPadding') }}</label>
        <input type="number" class="form-control form-control-sm"
               min="0" max="64"
               :value="selectedRow.style?.padding ?? 0"
               @input="onRowStylePatch({ padding: Number($event.target.value) || 0 })" />
      </div>

      <div class="field">
        <label class="form-label">{{ t('props.rowBackground') }}</label>
        <div class="input-group input-group-sm">
          <input type="color" class="form-control form-control-color" style="max-width: 50px;"
                 :value="selectedRow.style?.bgColor === 'transparent' ? '#ffffff' : (selectedRow.style?.bgColor ?? '#ffffff')"
                 @input="onRowStylePatch({ bgColor: $event.target.value })" />
          <input type="text" class="form-control"
                 :value="selectedRow.style?.bgColor ?? 'transparent'"
                 @change="onRowStylePatch({ bgColor: $event.target.value || 'transparent' })"
                 placeholder="transparent" />
        </div>
      </div>
    </div>

    <!-- Widget 선택 (Phase 8: 내부 탭 구조) -->
    <div v-else-if="selection.kind === 'widget' && selectedWidget" class="panel-body">
      <div class="section-title">
        <span class="badge bg-success me-1">Widget</span>
        <span class="text-secondary small">
          Row {{ selectedRowIdx + 1 }} · col-{{ selectedRow.widths[selectedWidgetIdx] }}
        </span>
      </div>

      <!-- Phase 8: Properties / Data Source 탭 -->
      <ul class="nav nav-tabs nav-fill small mb-3 widget-inner-tabs">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'props' }"
                  @click="activeTab = 'props'">
            <i class="bi bi-sliders me-1"></i>Properties
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'source' }"
                  @click="activeTab = 'source'">
            <i class="bi bi-database me-1"></i>Data Source
            <span v-if="selectedWidget.source" class="badge bg-primary ms-1" style="font-size:0.65em;">●</span>
          </button>
        </li>
      </ul>

      <!-- ─────── Properties 탭 ─────── -->
      <div v-show="activeTab === 'props'">

      <!-- 종류 - Phase 24: Palette 대화상자로 변경 -->
      <div class="field">
        <label class="form-label">{{ t('props.kind') }}</label>
        <button type="button" class="btn btn-sm btn-outline-primary d-flex align-items-center w-100"
                @click="showKindPalette = true">
          <i class="bi bi-grid-3x3-gap me-2"></i>
          <span class="fw-semibold">{{ getWidgetKind(selectedWidget.kind)?.label || selectedWidget.kind }}</span>
          <span class="ms-auto text-muted small">
            <i class="bi bi-chevron-right"></i>
          </span>
        </button>
        <div class="form-text">{{ catalogDesc('widget', getWidgetKind(selectedWidget.kind)) }}</div>
      </div>

      <!-- 제목 -->
      <div class="field">
        <label class="form-label">{{ t('props.titleLabel') }} <span class="text-secondary">{{ t('props.optional') }}</span></label>
        <input type="text" class="form-control form-control-sm"
               :value="selectedWidget.title"
               @change="onWidgetTitleChange($event.target.value)"
               :placeholder="t('propertiesPanel.k16')" />
      </div>

      <!-- 순서 / 삭제 -->
      <div class="field">
        <label class="form-label">{{ t('propertiesPanel.k3') }}</label>
        <div class="btn-group w-100">
          <button class="btn btn-sm btn-outline-secondary"
                  :disabled="selectedWidgetIdx <= 0"
                  @click="actions.moveWidget(selectedRow.id, selectedWidget.id, 'left')">
            <i class="bi bi-arrow-left"></i> {{ t('propertiesPanel.k4') }}
          </button>
          <button class="btn btn-sm btn-outline-secondary"
                  :disabled="selectedWidgetIdx >= selectedRow.widgets.length - 1"
                  @click="actions.moveWidget(selectedRow.id, selectedWidget.id, 'right')">
            <i class="bi bi-arrow-right"></i> {{ t('props.right') }}
          </button>
          <button class="btn btn-sm btn-outline-danger"
                  :disabled="selectedRow.widgets.length <= 1"
                  @click="actions.removeWidget(selectedRow.id, selectedWidget.id)">
            <i class="bi bi-trash"></i> {{ t('propertiesPanel.k5') }}
          </button>
        </div>
      </div>

      <hr />

      <!-- 스타일 -->
      <div class="section-subtitle">{{ t('props.cardStyle') }}</div>

      <!-- 높이 -->
      <div class="field">
        <label class="form-label">{{ t('props.height') }}</label>
        <div class="form-check mb-1">
          <input class="form-check-input" type="checkbox"
                 id="wHeightAuto"
                 v-model="widgetHeightAuto" />
          <label class="form-check-label small" for="wHeightAuto">
            {{ t('props2.autoFit') }}
          </label>
        </div>
        <input v-if="!widgetHeightAuto"
               type="number" class="form-control form-control-sm"
               min="40" max="2000" step="10"
               v-model.number="widgetHeightValue"
               placeholder="px" />
      </div>

      <!-- 패딩 -->
      <div class="field">
        <label class="form-label">{{ t('props2.innerPadding') }}</label>
        <input type="number" class="form-control form-control-sm"
               min="0" max="48"
               :value="selectedWidget.style?.padding ?? 16"
               @input="onWidgetStylePatch({ padding: Number($event.target.value) || 0 })" />
      </div>

      <!-- 테두리 -->
      <div class="field">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="wBorder"
                 :checked="selectedWidget.style?.border ?? true"
                 @change="onWidgetStylePatch({ border: $event.target.checked })" />
          <label class="form-check-label small" for="wBorder">{{ t('props2.showBorder') }}</label>
        </div>
      </div>

      <!-- 그림자 -->
      <div class="field">
        <label class="form-label">{{ t('props2.shadow') }}</label>
        <select class="form-select form-select-sm"
                :value="selectedWidget.style?.shadow ?? 'none'"
                @change="onWidgetStylePatch({ shadow: $event.target.value })">
          <option v-for="s in SHADOW_OPTIONS" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
      </div>

      <!-- 배경색 -->
      <div class="field">
        <label class="form-label">{{ t('props2.background') }}</label>
        <div class="input-group input-group-sm">
          <input type="color" class="form-control form-control-color" style="max-width: 50px;"
                 :value="selectedWidget.style?.bgColor ?? '#ffffff'"
                 @input="onWidgetStylePatch({ bgColor: $event.target.value })" />
          <input type="text" class="form-control"
                 :value="selectedWidget.style?.bgColor ?? '#ffffff'"
                 @change="onWidgetStylePatch({ bgColor: $event.target.value })" />
        </div>
      </div>

      <hr />
      </div> <!-- /props tab -->

      <!-- ─────── Data Source 탭 ─────── -->
      <div v-show="activeTab === 'source'">

      <!-- 편집 중이 아닐 때: 현재 상태 + "편집" 버튼 -->
      <div v-if="!editingSource" class="field">
        <div v-if="!selectedWidget.source" class="text-secondary small mb-2">
          {{ t('propertiesPanel.k6') }} <strong>{{ t('propertiesPanel.k7') }}</strong> {{ t('propertiesPanel.k8') }}
        </div>
        <div v-else class="source-preview mb-2">
          <div v-if="selectedWidget.source.type === 'endpoint'" class="d-flex align-items-center gap-1 small">
            <span class="badge bg-primary">{{ selectedWidget.source.method || 'GET' }}</span>
            <code class="text-truncate">{{ selectedWidget.source.path }}</code>
          </div>
          <div v-else-if="selectedWidget.source.type === 'customVar'" class="small">
            <span class="badge bg-info text-dark">{{ t('props2.variables') }}</span>
            <code class="ms-1">{{ selectedWidget.source.varName }}</code>
          </div>
          <div v-else class="small text-secondary">
            <code>{{ JSON.stringify(selectedWidget.source) }}</code>
          </div>
          <div v-if="selectedWidget.source.resultKey" class="small text-secondary mt-1">
            {{ t('props2.resultKey') }} <code>{{ selectedWidget.source.resultKey }}</code>
          </div>
        </div>
        <button class="btn btn-sm btn-outline-primary w-100" @click="openSourceEditor">
          <i class="bi bi-pencil-square me-1"></i>
          {{ selectedWidget.source ? t('propertiesPanel.k17') : t('propertiesPanel.k18') }}
        </button>

        <!-- ★ v1.9.1 — 눌렀을 때.
             데이터를 묶는 자리 바로 아래가 "눌렀을 때" 를 찾는 자리다. -->
        <template v-if="canRowClick">
          <hr />
          <div class="mb-2 fw-semibold small">
            <i class="bi bi-hand-index-thumb me-1"></i>{{ t('props2.onClick') }}
          </div>

          <div class="mb-2">
            <label class="form-label small mb-1">{{ t('props2.action') }}</label>
            <select class="form-select form-select-sm"
                    :value="rowClick.action"
                    @change="onActionChange($event.target.value)">
              <option v-for="a in ROW_CLICK_ACTIONS" :key="a.id" :value="a.id">{{ catalogLabel('rowClick', a) }}</option>
            </select>
            <div class="form-text small">
              {{ catalogDesc('rowClick', ROW_CLICK_ACTIONS.find(a => a.id === rowClick.action)) }}
            </div>
          </div>

          <template v-if="rowClick.action === 'navigate'">
            <div v-if="!navTargets.length" class="alert alert-warning py-2 px-2 small mb-2">
              {{ t('props2.noOtherScreens') }}
            </div>

            <template v-else>
              <div class="mb-2">
                <label class="form-label small mb-1">{{ t('props2.targetScreen') }}</label>
                <select class="form-select form-select-sm"
                        :value="rowClick.target"
                        @change="onNavTargetChange($event.target.value)">
                  <option value="">{{ t('props2.choose') }}</option>
                  <option v-for="sc in navTargets" :key="sc.id" :value="sc.id">{{ sc.title || sc.id }}</option>
                </select>
              </div>

              <!-- 대상이 요구하는 파라미터. 없으면 이 구역이 통째로 안 보인다. -->
              <div v-if="rowClick.target && targetParams.length" class="mb-2">
                <label class="form-label small mb-1">{{ t('propertiesPanel.k9') }}</label>
                <div v-for="prm in targetParams" :key="prm.name"
                     class="d-flex align-items-center gap-1 mb-1">
                  <code class="small" style="min-width:74px">{{ prm.name }}</code>
                  <span class="text-secondary small">←</span>
                  <select class="form-select form-select-sm"
                          :value="bindingField(prm.name)"
                          @change="setParamBinding(prm.name, $event.target.value)">
                    <option value="">{{ t('propertiesPanel.k10') }}</option>
                    <option v-for="f in fieldOptions" :key="f" :value="f">row.{{ f }}</option>
                  </select>
                  <span v-if="prm.required" class="badge bg-danger-subtle text-danger small">{{ t('propertiesPanel.k11') }}</span>
                </div>
              </div>

              <div v-else-if="rowClick.target" class="form-text small mb-2">
                {{ t('propertiesPanel.k12') }}
              </div>
            </template>
          </template>

          <!-- 문제점은 저장 전에 화면에서 알려 준다.
               이게 없으면 저장하고 미리보기를 눌러 본 뒤에야 잘못을 안다. -->
          <div v-for="(iss, i) in rowClickIssues" :key="i"
               class="alert py-1 px-2 small mb-1"
               :class="iss.level === 'error' ? 'alert-danger' : 'alert-warning'">
            <i class="bi me-1" :class="iss.level === 'error' ? 'bi-x-circle' : 'bi-exclamation-triangle'"></i>
            {{ iss.message }}
          </div>
        </template>
      </div>

      <!-- 편집 중: DataSourcePicker (탭 전체 너비 차지) -->
      <div v-else>
        <div v-if="sourceNote" class="alert alert-info py-2 px-2 small mb-2">
          <i class="bi bi-info-circle me-1"></i>{{ sourceNote }}
        </div>

        <DataSourcePicker
          :spec="spec"
          :initial-source="selectedWidget.source"
          @apply="onSourceApply"
          @clear="onSourceClear"
          @close="closeSourceEditor"
        />
      </div>

      </div> <!-- /source tab -->
    </div>
  </aside>

  <!-- Phase 24: Widget 종류 선택 대화상자 -->
  <WidgetKindPalette
    v-if="showKindPalette && selectedWidget"
    :current-kind="selectedWidget.kind"
    @close="showKindPalette = false"
    @select="(kindId) => { onWidgetKindChange(kindId); showKindPalette = false; }"
  />
</template>

<style scoped>
.props-panel {
  background: #fff;
  border-left: 1px solid #e5e7eb;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.panel-body-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: #6b7280;
}

.panel-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
}

.section-title {
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.section-subtitle {
  font-weight: 600;
  font-size: 0.8125rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.field {
  margin-bottom: 1rem;
}

.field .form-label {
  font-size: 0.8125rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

hr {
  margin: 1rem 0;
  opacity: 0.15;
}

.source-preview {
  padding: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
}
.source-preview code {
  font-size: 0.75rem;
  word-break: break-all;
  white-space: normal;
}

/* Phase 8: Widget 내부 탭 */
.widget-inner-tabs {
  border-bottom: 2px solid #e5e7eb;
}
.widget-inner-tabs .nav-link {
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.4rem 0.6rem;
  font-size: 0.8125rem;
  color: #64748b;
  background: none;
  margin-bottom: -2px;
}
.widget-inner-tabs .nav-link:hover { color: #1f2937; }
.widget-inner-tabs .nav-link.active {
  color: #0d6efd;
  border-bottom-color: #0d6efd;
  background: none;
  font-weight: 600;
}
</style>
