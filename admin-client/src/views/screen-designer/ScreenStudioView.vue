<script setup>
import { confirmDialog } from '../../composables/useConfirm';
import { notifyError } from '../../composables/useNotify';
/**
 * Screen Designer — 단일 화면 Composite Studio (Phase 5-c).
 *
 *  Phase 5-b 의 인라인 컨트롤 구조 → "캔버스 + 우측 Properties Panel" 구조로 재편.
 *
 *  구조:
 *    상단: 페이지 헤더 + 저장 상태
 *    그 아래: 상단 제목 영역 편집 카드
 *    그 아래: Split pane
 *       좌(flex 1)  : CompositeBuilder (Canvas)
 *       우(340px)   : PropertiesPanel — selection 에 따라 가변
 *
 *  selection 상태 (local):
 *    null | { kind: 'row', rowId } | { kind: 'widget', rowId, widgetId }
 *
 *  저장 정책 (Phase 5-b 유지):
 *    - localScreen 의 어떤 필드든 변경 → 500ms 디바운스 후 savePatch({ screens }).
 *    - unmount 시 pending 저장 flush.
 *
 *  actions 계층:
 *    PropertiesPanel 이 호출할 mutation 함수들을 여기서 구성해 props 로 전달.
 *    각 action 은 Phase 5-b 의 순수 변환 함수를 로컬 state 에 적용.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useScreenProjectsStore } from '../../stores/screenProjects';
import {
  HEADER_KINDS,
  createWidget, getWidgetKind,
  validateWidths, appendWidth, removeWidth, swapWidths,
  ensureWidgetStyle, ensureRowStyle,
  diagnoseScreen,                       // ★ v1.22.5 — 화면이 비어 보이는 이유
} from '../../generator/screens/compositeSchema';
import CompositeBuilder from '../../components/screen-designer/CompositeBuilder.vue';
import PropertiesPanel from '../../components/screen-designer/PropertiesPanel.vue';
import CustomVarsPanel from '../../components/screen-designer/CustomVarsPanel.vue';
import ScreenPreview from '../../components/screen-designer/ScreenPreview.vue';
// Phase 19: widget 데이터 소스에서 자동 변수 유도
import { deriveAutoVars } from '../../generator/screens/deriveAutoVars';
import { useI18n } from '../../composables/useI18n';

/* ★ v1.21.0 — 되돌리기 버튼 문구용 */
const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const store = useScreenProjectsStore();
const { activeId, activeProject, loading, error, saving } = storeToRefs(store);

const currentScreen = computed(() => {
  if (!activeProject.value) return null;
  return (activeProject.value.screens || []).find((s) => s.id === route.params.screenId) || null;
});

/* ─── localScreen — 편집 중 깊은 복사본 ─── */
const localScreen = ref(null);

/** ★ v1.9.1 — 같은 프로젝트의 다른 화면들 (이동 대상 목록) */
const siblingScreens = computed(() => (activeProject.value?.screens || []));



// Phase 19: 화면의 widget 데이터 소스에서 자동 변수 유도 → CustomVarsPanel 에 전달
const autoVars = computed(() => deriveAutoVars(localScreen.value));

/**
 * Phase 7-d hotfix: 마지막으로 저장된 상태의 JSON 스냅샷.
 *  - resetLocal 직후 여기 세팅되며, flush() 가 현재 상태와 비교해 동일하면 저장 스킵.
 *  - "페이지 로드 직후 watch 가 튀어서 불필요한 PUT 이 발생" 하는 문제를 해결.
 *  - 보너스: 사용자가 편집했다가 원래 값으로 수동 복구한 경우도 저장 스킵.
 */
let lastSavedJson = null;

function resetLocal() {
  if (!currentScreen.value) { localScreen.value = null; lastSavedJson = null; return; }
  const copy = JSON.parse(JSON.stringify(currentScreen.value));
  // 기본값 보강 (오래된 데이터 방어)
  if (!copy.header) copy.header = { kind: 'page-title', title: copy.title || '', subtitle: '' };
  if (!Array.isArray(copy.rows)) copy.rows = [];
  if (!Array.isArray(copy.customVars)) copy.customVars = [];
  if (!Array.isArray(copy.customFns)) copy.customFns = [];
  // row/widget 의 style 필드 보강
  for (const r of copy.rows) {
    ensureRowStyle(r);
    if (!Array.isArray(r.widgets)) r.widgets = [];
    for (const w of r.widgets) ensureWidgetStyle(w);
  }
  localScreen.value = copy;
  // 저장 baseline 설정 — 이 시점의 값이 "서버와 동기화된 상태"
  lastSavedJson = JSON.stringify(copy);
}

/* ─── 선택 상태 ─── */
const selection = ref(null);   // null | { kind, rowId, widgetId? }

function clearSelection() { selection.value = null; }

/* ─── 편집 / 미리보기 모드 전환 ─── */
const studioMode = ref('edit');   // 'edit' | 'preview'

/* ─── 저장 (디바운스) ─── */
const saveState = ref('idle');
let pendingTimer = null;
let savedAnimTimer = null;
const DEBOUNCE_MS = 500;

async function flush() {
  if (!activeId.value || !localScreen.value || !activeProject.value) return;
  // Phase 7-d: 변경 없으면 저장 스킵 (페이지 로드 시 watcher 첫 트리거 무효화)
  const currentJson = JSON.stringify(localScreen.value);
  if (currentJson === lastSavedJson) {
    // 이전에 'pending' 으로 표시됐을 수 있으니 idle 로 되돌림
    saveState.value = 'idle';
    return;
  }
  saveState.value = 'saving';
  try {
    const next = (activeProject.value.screens || []).map((s) =>
      s.id === localScreen.value.id ? localScreen.value : s
    );
    await store.savePatch(activeId.value, { screens: next });
    lastSavedJson = currentJson;  // baseline 갱신
    saveState.value = 'saved';
    if (savedAnimTimer) clearTimeout(savedAnimTimer);
    savedAnimTimer = setTimeout(() => { saveState.value = 'idle'; savedAnimTimer = null; }, 2000);
  } catch (e) {
    saveState.value = 'error';
  }
}

function schedule() {
  if (!activeId.value || !localScreen.value) return;
  // Phase 7-d: 변경 없으면 pending 표시도 생략 (페이지 로드 직후 watcher 첫 트리거)
  if (JSON.stringify(localScreen.value) === lastSavedJson) return;
  saveState.value = 'pending';
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(async () => {
    pendingTimer = null;
    await flush();
  }, DEBOUNCE_MS);
}

/* ══════════════════════════════════════════════════════════════════
 *  ★ v1.21.0 — 실행 취소 / 다시 실행 (Ctrl+Z / Ctrl+Shift+Z)
 *
 *  화면 편집기에서 가장 아쉬운 것이 이것이었다. Row 를 지우거나 분할을 바꾸면
 *  되돌릴 방법이 없어, 사용자는 "실수하면 큰일" 이라는 마음으로 조심조심 쓰게 된다.
 *  드래그·팔레트 같은 화려한 기능보다 **되돌릴 수 있다는 안심**이 먼저다.
 *
 *  구현은 단순하게 간다. localScreen 하나가 화면 상태의 전부이므로,
 *  바뀔 때마다 JSON 스냅샷을 쌓아 두었다가 되돌린다.
 *  (스냅샷 방식은 메모리를 쓰지만 화면 한 장의 크기는 수 KB 라 문제되지 않는다.
 *   대신 개수를 제한해 오래된 것부터 버린다.)
 * ══════════════════════════════════════════════════════════════════ */
const HISTORY_MAX = 50;
/* ★ v1.22.1 — 캔버스의 데이터 소스 딱지를 누르면
   그 위젯을 고르고 오른쪽 패널의 [Data Source] 탭을 연다.
   "미설정" 이라고 알려만 주고 고치는 길은 없던 것을 이어 준 것이다. */
/* ★ v1.22.5 — 이 화면이 왜 비어 보이는지 짚어 준다 (조용히 비어 있는 것이 가장 나쁘다) */
const screenIssues = computed(() => diagnoseScreen(localScreen.value));

const openSourceTick = ref(0);
function onPickSource({ rowId, widgetId }) {
  selection.value = { kind: 'widget', rowId, widgetId };
  openSourceTick.value += 1;
}

const undoStack = ref([]);
const redoStack = ref([]);
let applyingHistory = false;      // 되돌리는 중의 변경은 다시 쌓지 않는다
let lastSnapshot = null;

function snapshot() {
  return localScreen.value ? JSON.stringify(localScreen.value) : null;
}

/** 편집이 일어날 때마다 직전 상태를 쌓는다 */
function pushHistory() {
  if (applyingHistory) return;
  const cur = snapshot();
  if (cur === lastSnapshot) return;                 // 값이 같으면 기록하지 않는다
  if (lastSnapshot !== null) {
    undoStack.value.push(lastSnapshot);
    if (undoStack.value.length > HISTORY_MAX) undoStack.value.shift();
    redoStack.value = [];                            // 새 편집이 생기면 다시 실행은 버린다
  }
  lastSnapshot = cur;
}

function applySnapshot(json) {
  applyingHistory = true;
  localScreen.value = JSON.parse(json);
  lastSnapshot = json;
  nextTick(() => { applyingHistory = false; });
}

const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);

function undo() {
  if (!canUndo.value) return;
  const cur = snapshot();
  const prev = undoStack.value.pop();
  if (cur) redoStack.value.push(cur);
  applySnapshot(prev);
}

function redo() {
  if (!canRedo.value) return;
  const cur = snapshot();
  const next = redoStack.value.pop();
  if (cur) undoStack.value.push(cur);
  applySnapshot(next);
}

/** 입력칸에서 누른 Ctrl+Z 는 브라우저 기본 동작(글자 되돌리기)이 자연스럽다 — 건드리지 않는다 */
function onKeydown(e) {
  if (!(e.ctrlKey || e.metaKey)) return;
  const tag = (e.target?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

watch(localScreen, () => { pushHistory(); schedule(); }, { deep: true });

/* ─── 로드 ─── */
async function loadProject() {
  const id = route.params.id;
  if (!id) return;
  if (activeId.value !== Number(id)) {
    try { await store.loadById(id); } catch (_) {}
  }
  if (!currentScreen.value && activeProject.value) {
    notifyError('이 화면을 찾을 수 없습니다', '프로젝트 편집 페이지로 돌아갑니다.');
    // Phase 28 (patch-07): 화면 목록 탭으로 복귀 — 사용자가 진입한 탭이므로.
    router.replace({
      name: 'screen-project-edit',
      params: { id },
      query: { tab: 'screens' },
    });
    return;
  }
  resetLocal();
  clearSelection();
}

onMounted(() => {
  loadProject();
  // Esc 로 선택 해제
  window.addEventListener('keydown', onGlobalKey);
});
watch(() => [route.params.id, route.params.screenId], loadProject);

onBeforeUnmount(async () => {
  window.removeEventListener('keydown', onGlobalKey);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
    await flush();
  }
  if (savedAnimTimer) clearTimeout(savedAnimTimer);
});

function onGlobalKey(e) {
  if (e.key === 'Escape') clearSelection();
}

/**
 * Phase 28 (patch-07): 이전 버튼 → 프로젝트 편집의 "화면 목록" 탭으로 복귀.
 *  이전에는 query 없이 돌아가서 기본 탭 (레이아웃) 이 선택됐음 — 사용자가 방금 편집한
 *  화면의 목록으로 돌아가는 것이 자연스러움.
 */
function goBack() {
  router.push({
    name: 'screen-project-edit',
    params: { id: route.params.id },
    query: { tab: 'screens' },
  });
}

/* ─── rows 변환 헬퍼 ─── */

function applyRows(nextRows) {
  if (!localScreen.value) return;
  localScreen.value = { ...localScreen.value, rows: nextRows };
}

function onRowsUpdate(nextRows) { applyRows(nextRows); }

/* ─── actions — PropertiesPanel 에 주입될 mutation 콜백 ─── */
/*  모든 action 은 localScreen.rows 를 immutable 하게 변환하고 applyRows 로 commit. */

const actions = {
  setRowWidths(rowId, widths) {
    if (!validateWidths(widths)) return;
    const next = localScreen.value.rows.map((r) => {
      if (r.id !== rowId) return r;
      const newLen = widths.length;
      let widgets = r.widgets.slice(0, newLen);
      while (widgets.length < newLen) widgets.push(ensureWidgetStyle(createWidget({ kind: 'text' })));
      return { ...r, widths: [...widths], widgets };
    });
    applyRows(next);
  },

  moveRow(rowId, dir) {
    const rows = [...localScreen.value.rows];
    const idx = rows.findIndex((r) => r.id === rowId);
    if (idx < 0) return;
    const to = dir === 'up' ? idx - 1 : idx + 1;
    if (to < 0 || to >= rows.length) return;
    const [m] = rows.splice(idx, 1);
    rows.splice(to, 0, m);
    applyRows(rows);
  },

  async removeRow(rowId) {
    if (!await confirmDialog({ title: 'Row 삭제', message: '이 row 와 그 안의 모든 widget 을 삭제할까요?', confirmText: '삭제', variant: 'danger' })) return;
    applyRows(localScreen.value.rows.filter((r) => r.id !== rowId));
    // 선택된 것이 삭제된 row 라면 선택 해제
    if (selection.value?.rowId === rowId) clearSelection();
  },

  updateRowStyle(rowId, patch) {
    const next = localScreen.value.rows.map((r) =>
      r.id === rowId ? { ...r, style: { ...(r.style || {}), ...patch } } : r
    );
    applyRows(next);
  },

  updateWidgetKind(rowId, widgetId, kind) {
    const meta = getWidgetKind(kind) || getWidgetKind('text');
    const next = localScreen.value.rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        widgets: r.widgets.map((w) =>
          w.id === widgetId
            ? { ...w, kind, config: { ...meta.defaultConfig } }
            : w
        ),
      };
    });
    applyRows(next);
  },

  updateWidgetTitle(rowId, widgetId, title) {
    const next = localScreen.value.rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        widgets: r.widgets.map((w) => (w.id === widgetId ? { ...w, title } : w)),
      };
    });
    applyRows(next);
  },

  /* ★ v1.9.1 — 행 클릭(화면 이동) 설정.
     style/kind 와 같은 패턴으로 rows 를 통째로 갈아 끼운다. */
  updateWidgetRowClick(rowId, widgetId, onRowClick) {
    const next = localScreen.value.rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        widgets: r.widgets.map((w) => (w.id === widgetId ? { ...w, onRowClick } : w)),
      };
    });
    applyRows(next);
  },

  /** ★ v1.11.7 — 위젯 config 통째 교체 (폼 필드 자동 채움 등) */
  updateWidgetConfig(rowId, widgetId, config) {
    const next = localScreen.value.rows.map((r) => {
      if (r.id !== rowId) return r;
      return { ...r, widgets: r.widgets.map((w) => (w.id === widgetId ? { ...w, config: { ...config } } : w)) };
    });
    applyRows(next);
  },

  updateWidgetStyle(rowId, widgetId, patch) {
    const next = localScreen.value.rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        widgets: r.widgets.map((w) =>
          w.id === widgetId
            ? { ...w, style: { ...(w.style || {}), ...patch } }
            : w
        ),
      };
    });
    applyRows(next);
  },

  moveWidget(rowId, widgetId, dir) {
    const next = localScreen.value.rows.map((r) => {
      if (r.id !== rowId) return r;
      const idx = r.widgets.findIndex((w) => w.id === widgetId);
      if (idx < 0) return r;
      const to = dir === 'left' ? idx - 1 : idx + 1;
      if (to < 0 || to >= r.widgets.length) return r;
      const widgets = [...r.widgets];
      const [m] = widgets.splice(idx, 1);
      widgets.splice(to, 0, m);
      return {
        ...r,
        widths: swapWidths(r.widths, idx, to),
        widgets,
      };
    });
    applyRows(next);
  },

  removeWidget(rowId, widgetId) {
    const next = localScreen.value.rows.map((r) => {
      if (r.id !== rowId) return r;
      if (r.widgets.length <= 1) return r;
      const idx = r.widgets.findIndex((w) => w.id === widgetId);
      if (idx < 0) return r;
      return {
        ...r,
        widths: removeWidth(r.widths, idx),
        widgets: r.widgets.filter((_, i) => i !== idx),
      };
    });
    applyRows(next);
    // 선택된 widget 이 지워졌으면 row 선택으로 폴백
    if (selection.value?.widgetId === widgetId) {
      selection.value = { kind: 'row', rowId };
    }
  },

  /** widget 추가.
   *  ★ v1.21.2 — 예전에는 "캔버스가 복잡해진다" 는 이유로 패널에서만 할 수 있었다.
   *  그런데 위젯을 넣으려고 매번 오른쪽 패널까지 가는 것이 더 번거로웠다.
   *  **고른 Row 에만** 버튼을 띄우니 평소에는 조용하고 필요할 때만 나타난다.
   *  (패널의 버튼도 그대로 둔다 — 두 길이 있어도 헷갈리지 않는 자리다) */
  addWidgetToRow(rowId) {
    const next = localScreen.value.rows.map((r) => {
      if (r.id !== rowId) return r;
      if (r.widgets.length >= 6) return r;
      const newWidths = appendWidth(r.widths);
      if (newWidths.length === r.widths.length) return r;
      const newWidget = ensureWidgetStyle(createWidget({ kind: 'text' }));
      return { ...r, widths: newWidths, widgets: [...r.widgets, newWidget] };
    });
    applyRows(next);
    // 추가된 widget 을 선택 상태로 (맨 마지막 widget)
    const updatedRow = next.find((r) => r.id === rowId);
    if (updatedRow) {
      const last = updatedRow.widgets[updatedRow.widgets.length - 1];
      selection.value = { kind: 'widget', rowId, widgetId: last.id };
    }
  },

  /** Widget 의 source 를 주어진 값으로 교체. Phase 6 에서 DataSourcePicker 가 호출. */
  applySource(rowId, widgetId, newSource) {
    const next = localScreen.value.rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        widgets: r.widgets.map((w) => (w.id === widgetId ? { ...w, source: newSource } : w)),
      };
    });
    applyRows(next);
  },

  /** Widget 의 source 를 null 로 되돌림. */
  clearSource(rowId, widgetId) {
    const next = localScreen.value.rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        widgets: r.widgets.map((w) => (w.id === widgetId ? { ...w, source: null } : w)),
      };
    });
    applyRows(next);
  },

  /** 이전 phase 와의 호환을 위해 남겨둠. Phase 6 부터 PropertiesPanel 은
   *  이 함수 대신 openSourceEditor() 로 패널 내부 편집 모드를 토글한다.
   *  (CompositeBuilder 쪽에서 호출될 수 있으므로 no-op 로 유지) */
  editSource(rowId, widget) {
    /* noop — Panel 이 스스로 편집 모드 전환 */
  },
};
</script>

<template>
  <div class="container-fluid py-3">

    <!-- 헤더 -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary" @click="goBack" title="프로젝트 편집으로">
          <i class="bi bi-arrow-left"></i>
        </button>
        <div>
          <h5 class="mb-0">
            <i class="bi bi-grid-3x3-gap me-2"></i>
            <span v-if="currentScreen">{{ currentScreen.title }}</span>
            <span v-else class="text-secondary">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>화면
            </span>
          </h5>
          <div class="small text-secondary">
            <template v-if="activeProject">
              Project: <strong>{{ activeProject.name }}</strong>
              <span class="mx-2">·</span>
              Path: <code>{{ currentScreen?.path || '-' }}</code>
            </template>
          </div>
        </div>
      </div>

      <!-- ★ v1.21.0 — 되돌리기. 단축키만 있으면 있는 줄 모른다.
           버튼으로 보여 주고, 쌓인 개수를 툴팁에 적어 "얼마나 되돌릴 수 있는지" 알린다. -->
      <div class="btn-group btn-group-sm me-3">
        <button type="button" class="btn btn-outline-secondary" :disabled="!canUndo"
                :title="`${t('studio.undo')} (Ctrl+Z)${canUndo ? ` · ${undoStack.length}` : ''}`"
                @click="undo">
          <i class="bi bi-arrow-counterclockwise"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary" :disabled="!canRedo"
                :title="`${t('studio.redo')} (Ctrl+Shift+Z)${canRedo ? ` · ${redoStack.length}` : ''}`"
                @click="redo">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>

      <div class="save-indicator small">
        <span v-if="saveState === 'pending'" class="text-secondary">
          <i class="bi bi-circle"></i> 편집 중…
        </span>
        <span v-else-if="saveState === 'saving' || saving" class="text-primary">
          <span class="spinner-border spinner-border-sm me-1"></span>저장 중…
        </span>
        <span v-else-if="saveState === 'saved'" class="text-success">
          <i class="bi bi-check-circle-fill me-1"></i>저장됨
        </span>
        <span v-else-if="saveState === 'error'" class="text-danger">
          <i class="bi bi-exclamation-triangle me-1"></i>저장 실패
        </span>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger small">{{ error }}</div>

    <!-- 상단 제목 영역 (편집 모드 전용) -->
    <!-- Phase 7-d: 미리보기 모드에선 숨겨서 iframe 에 더 많은 공간 할당 -->
    <div v-if="localScreen && studioMode === 'edit'" class="card mb-3">
      <div class="card-header py-2">
        <h6 class="mb-0">
          <i class="bi bi-card-heading me-1"></i>상단 제목 영역
        </h6>
      </div>
      <div class="card-body">
        <label class="form-label small">유형</label>
        <div class="row g-2 mb-3">
          <div v-for="hk in HEADER_KINDS" :key="hk.id" class="col-auto">
            <button class="btn btn-sm"
                    :class="localScreen.header.kind === hk.id ? 'btn-primary' : 'btn-outline-secondary'"
                    @click="localScreen.header.kind = hk.id"
                    :title="hk.description">
              {{ hk.label }}
            </button>
          </div>
        </div>

        <div v-if="localScreen.header.kind !== 'none'" class="row g-3">
          <div class="col-md-6">
            <label class="form-label small">제목</label>
            <input v-model="localScreen.header.title" class="form-control form-control-sm" />
          </div>
          <div class="col-md-6">
            <label class="form-label small">
              부제목 <span class="text-secondary">(선택)</span>
            </label>
            <input v-model="localScreen.header.subtitle" class="form-control form-control-sm" />
          </div>
        </div>
        <div v-else class="text-secondary small">
          이 화면은 상단 제목 영역 없이 생성됩니다.
        </div>
      </div>
    </div>

    <!-- 편집 / 미리보기 모드 탭 -->
    <ul v-if="localScreen" class="nav nav-pills mb-3">
      <li class="nav-item">
        <button class="nav-link"
                :class="{ active: studioMode === 'edit' }"
                @click="studioMode = 'edit'">
          <i class="bi bi-pencil-square me-1"></i>편집
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link"
                :class="{ active: studioMode === 'preview' }"
                @click="studioMode = 'preview'">
          <i class="bi bi-eye me-1"></i>미리보기
        </button>
      </li>
    </ul>

    <!-- ═══ 편집 모드 ═══ -->
    <template v-if="localScreen && studioMode === 'edit'">
      <!-- 사용자 변수 관리 (접힘) -->
      <div class="mb-3">
        <CustomVarsPanel
          :vars="localScreen.customVars"
          :auto-vars="autoVars"
          @update:vars="localScreen.customVars = $event"
        />
      </div>

      <!-- Canvas + Properties Panel split -->
      <div class="studio-split">
      <!-- 왼쪽: 캔버스 -->
      <div class="studio-canvas-wrap">
        <div class="card">
          <div class="card-header py-2">
            <h6 class="mb-0">
              <i class="bi bi-layout-three-columns me-1"></i>화면 구성
            </h6>
          </div>
          <div class="card-body">
      <!-- ★ v1.22.5 — 비어 보이는 이유를 화면이 스스로 알려 준다 -->
      <div v-if="screenIssues.length" class="alert alert-warning py-2 px-3 small mb-3">
        <div class="fw-semibold mb-1">
          <i class="bi bi-lightbulb me-1"></i>{{ t('studio.whyEmpty') }}
        </div>
        <ul class="mb-0 ps-3">
          <li v-for="(is, i) in screenIssues" :key="i">{{ is.message }}</li>
        </ul>
      </div>

            <CompositeBuilder
              :spec="localScreen"
              :selection="selection"
              @update:rows="onRowsUpdate"
              @update:selection="selection = $event"
              @add-widget="actions.addWidgetToRow"
              @pick-source="onPickSource"
            />
          </div>
        </div>
      </div>

      <!-- 오른쪽: Properties 패널 -->
      <div class="studio-props-wrap">
        <PropertiesPanel
            :open-source-tick="openSourceTick"
          :spec="localScreen"
          :selection="selection"
          :actions="actions"
          :screens="siblingScreens"
          @close="clearSelection"
        />
      </div>
    </div>
    </template>

    <!-- ═══ 미리보기 모드 ═══ -->
    <div v-if="localScreen && studioMode === 'preview'" class="preview-wrap">
      <ScreenPreview :spec="localScreen" />
    </div>

    <!-- 로딩 -->
    <div v-else-if="loading && !localScreen" class="card">
      <div class="card-body text-center py-5 text-secondary">
        <div class="spinner-border spinner-border-sm me-2"></div>로딩 중…
      </div>
    </div>
  </div>
</template>

<style scoped>
.save-indicator {
  min-width: 110px;
  text-align: right;
}

.studio-split {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.preview-wrap {
  /* Phase 7-d: 상단 제목 영역이 숨겨졌으므로 더 넓은 공간 확보 */
  height: calc(100vh - 160px);
  min-height: 600px;
}
.studio-canvas-wrap {
  flex: 1 1 auto;
  min-width: 0;   /* flex item 내부 overflow 방지 */
}
.studio-props-wrap {
  flex: 0 0 340px;
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  border-radius: 0.375rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  background: #fff;
  border: 1px solid #e5e7eb;
}

/* 좁은 화면 (992px 미만) 에선 패널을 아래로 stack */
@media (max-width: 991.98px) {
  .studio-split {
    flex-direction: column;
  }
  .studio-props-wrap {
    flex: 1 1 auto;
    position: static;
    max-height: none;
    width: 100%;
  }
}
</style>
