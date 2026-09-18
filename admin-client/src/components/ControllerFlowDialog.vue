<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import { useI18n } from '../composables/useI18n';
import { useDraggable } from '../composables/useDraggable';
import http from '../api/http';

const { t } = useI18n();
const { modalRef, headerRef } = useDraggable();
const props = defineProps({ controller: { type: Object, required: true } });
const emit = defineEmits(['close']);
const router = useRouter();
const flowId = `flow-${props.controller.id}-${Date.now()}`;
const { fitView, zoomIn, zoomOut, zoomTo, setViewport } = useVueFlow(flowId);
const activeTab = ref('flow');
const analysis = ref(null);
const dbInfo = ref(null);
const loadingMeta = ref(false);
const flowError = ref('');
const selectedIdx = ref(0);
const routes = computed(() => analysis.value?.routes || []);
const selectedRoute = computed(() => routes.value[selectedIdx.value] || null);
const nodes = ref([]);
const edges = ref([]);
const selectedItem = ref(null);
let requestController;
let sequence = 0;

const NODE_STYLES = {
  client: { bg: '#e7f1ff', border: '#0d6efd', color: '#084298' },
  controller: { bg: '#d1e7dd', border: '#198754', color: '#0a3622' },
  service: { bg: '#e2d9f3', border: '#6f42c1', color: '#3d1e7a' },
  sql: { bg: '#fff3cd', border: '#fd7e14', color: '#664d03' },
  db: { bg: '#f8d7da', border: '#dc3545', color: '#58151c' },
  mci: { bg: '#d4f1ec', border: '#14b8a6', color: '#0c4a43' },
  sse: { bg: '#d4f1ec', border: '#14b8a6', color: '#0c4a43' },
};

async function loadAnalysis() {
  requestController?.abort();
  requestController = new AbortController();
  const ticket = ++sequence;
  selectedIdx.value = 0;
  selectedItem.value = null;
  analysis.value = null;
  dbInfo.value = null;
  flowError.value = '';
  loadingMeta.value = true;
  const config = { signal: requestController.signal };
  try {
    const [flow, db] = await Promise.allSettled([
      http.get(`/api/admin/controllers/${encodeURIComponent(props.controller.id)}/flow`, config),
      http.get('/api/admin/system/db-info', config),
    ]);
    if (ticket !== sequence) return;
    if (flow.status === 'rejected') throw flow.reason;
    analysis.value = flow.value.data?.data || null;
    dbInfo.value = db.status === 'fulfilled' ? db.value.data?.data : { error: t('flow.loadDbFailed') };
    buildGraph();
    await nextTick();
    doFitView();
  } catch (error) {
    if (ticket === sequence && error.code !== 'ERR_CANCELED') flowError.value = error.response?.data?.message || error.message;
  } finally {
    if (ticket === sequence) loadingMeta.value = false;
  }
}

function buildGraph() {
  const route = selectedRoute.value;
  if (!route) { nodes.value = []; edges.value = []; return; }
  // 호출 깊이로 열을 정하고, 같은 열의 노드를 세로로 배치한다.
  const depths = new Map([['client', 0]]);
  for (let i = 0; i < route.nodes.length; i++) {
    for (const edge of route.edges) {
      if (depths.has(edge.source)) depths.set(edge.target, Math.max(depths.get(edge.target) || 0, depths.get(edge.source) + 1));
    }
  }
  const rows = new Map();
  nodes.value = route.nodes.map(node => {
    const depth = depths.get(node.id) || 0;
    const row = rows.get(depth) || 0;
    rows.set(depth, row + 1);
    const colors = NODE_STYLES[node.kind] || NODE_STYLES.client;
    const details = node.kind === 'db' ? { ...node.details, ...dbInfo.value } : node.details;
    return {
      id: node.id, position: { x: 40 + depth * 265, y: 45 + row * 125 },
      type: node.kind === 'client' ? 'input' : ['db', 'mci', 'sse'].includes(node.kind) ? 'output' : 'default',
      data: { kind: node.kind, label: node.label, title: node.label, details },
      sourcePosition: 'right', targetPosition: 'left',
      style: { background: colors.bg, border: `2px solid ${colors.border}`, color: colors.color,
        borderRadius: '8px', padding: '10px 14px', fontSize: '13px', minWidth: '180px', maxWidth: '240px' },
    };
  });
  edges.value = route.edges.map(edge => ({ ...edge, markerEnd: MarkerType.ArrowClosed,
    label: edge.label.length > 14 ? edge.label.slice(0, 13) + '…' : edge.label,
    data: { title: edge.label, details: edge.details },
    labelStyle: { fontSize: '11px' }, labelBgStyle: { fill: '#fff', fillOpacity: .95 },
  }));
}

// 선택 시 데이터 사본을 저장하지 않는다. 비동기 갱신 후에도 현재 그래프와 일치한다.
const selection = computed(() => {
  const selected = selectedItem.value;
  if (!selected) return null;
  const item = (selected.kind === 'node' ? nodes.value : edges.value).find(n => n.id === selected.id);
  return item ? { ...selected, title: item.data.title, details: item.data.details, from: item.source, to: item.target } : null;
});
function onNodeClick({ node }) { selectedItem.value = { kind: 'node', id: node.id }; }
function onEdgeClick({ edge }) { selectedItem.value = { kind: 'edge', id: edge.id }; }
function onPaneClick() { selectedItem.value = null; }
function doZoomIn() { zoomIn({ duration: 200 }); }
function doZoomOut() { zoomOut({ duration: 200 }); }
function doActualSize() { zoomTo(1, { duration: 200 }); }
function doFitView() { fitView({ padding: .15, duration: 200 }); }
function doReset() { setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 }); }
function onPaneReady() { nextTick(doFitView); }
function switchTab(tab) { activeTab.value = tab; if (tab === 'flow') nextTick(doFitView); }
function goService(name) { emit('close'); router.push({ name: 'services', query: { q: name } }); }
function goSql(name) { emit('close'); router.push({ name: 'sqls', query: { q: name.replace(/\.sql$/i, '') } }); }
const paramsLoading = loadingMeta;
const paramsError = flowError;
const paramsData = computed(() => {
  if (!analysis.value) return null;
  const route = selectedRoute.value;
  const usedServices = new Set((route?.nodes || []).filter(n => n.kind === 'service').map(n => n.details.serviceName));
  const refs = route?.sqlRefs || [];
  return {
    services: analysis.value.services.filter(s => usedServices.has(s.name)),
    sqlFiles: analysis.value.sqlFiles.map(file => ({ ...file,
      queries: file.queries.filter(q => refs.some(ref => ref.name === file.name && ref.queryName === q.name)),
    })).filter(file => file.queries.length),
    note: [...(analysis.value.warnings || []), ...(route?.warnings || [])].join('\n'),
  };
});
const routeOptions = computed(() => routes.value.map((route, idx) => ({ idx,
  label: `[${route.method}] /${[analysis.value.basePath, route.path].map(s => String(s || '').replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/')} → ${route.handlerName}`,
})));
watch(selectedRoute, () => { selectedItem.value = null; buildGraph(); nextTick(doFitView); });
watch(() => props.controller.id, loadAnalysis, { immediate: true });
onBeforeUnmount(() => { sequence++; requestController?.abort(); });
</script>

<template>
  <div class="app-modal-backdrop" @mousedown.self="$emit('close')">
    <div ref="modalRef" class="app-modal flow-modal" style="max-width:1200px">
      <div ref="headerRef" class="modal-header">
        <h5 class="mb-0">
          <i class="bi bi-diagram-2 text-primary me-2"></i>
          {{ t('flow2.detailOf') }} <code class="text-dark">{{ controller?.name }}</code>
          <small v-if="controller?.basePath || controller?.base_path" class="text-secondary ms-2">
            {{ controller?.basePath || controller?.base_path }}
          </small>
        </h5>
        <button class="btn-close" @click="$emit('close')"></button>
      </div>

      <!-- Phase 25: 탭 헤더 -->
      <ul class="nav nav-tabs px-3 pt-2" style="border-bottom: 1px solid #dee2e6;">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'flow' }"
                  @click="switchTab('flow')">
            <i class="bi bi-diagram-2 me-1"></i>{{ t('flow.flowTab') }}
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'params' }"
                  @click="switchTab('params')">
            <i class="bi bi-list-columns-reverse me-1"></i>{{ t('flow.params') }}
          </button>
        </li>
      </ul>

      <div class="modal-body p-0">
        <!-- ═══════════ 플로우 탭 ═══════════ -->
        <p class="small text-secondary px-3 pt-2 mb-1">{{ t('flow.staticHint') }}</p>
        <div v-if="loadingMeta" class="px-3 py-2 small">{{ t('flow.analyzing') }}</div>
        <div v-else-if="flowError" class="alert alert-danger mx-3">{{ flowError }}
          <button class="btn btn-sm btn-outline-danger ms-2" @click="loadAnalysis">{{ t('dash.reload') }}</button>
        </div>
        <div v-if="paramsData?.note" class="alert alert-warning mx-3 small">{{ paramsData.note }}</div>
        <div class="flow-tab-pane">
        <!-- 상단 툴바: 라우트 선택 + 뷰 컨트롤 -->
        <div class="flow-toolbar">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <label class="form-label small mb-0 text-secondary">{{ t('flow2.routes') }}</label>
            <select
              v-model.number="selectedIdx"
              class="form-select form-select-sm"
              style="width:min(560px, 70vw)"
              :disabled="!routes.length"
            >
              <option v-if="!routes.length" :value="0">{{ t('flow.noRoutes') }}</option>
              <option v-for="opt in routeOptions" :key="opt.idx" :value="opt.idx">
                {{ opt.label }}

              </option>
            </select>
          </div>

          <div class="d-flex align-items-center gap-1 ms-auto">
            <button class="btn btn-sm btn-outline-secondary" @click="doZoomOut" :title="t('flow2.zoomOut')">
              <i class="bi bi-dash-lg"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" @click="doZoomIn" :title="t('flow2.zoomIn')">
              <i class="bi bi-plus-lg"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" @click="doActualSize" :title="t('flow2.actualSize')">
              1:1
            </button>
            <button class="btn btn-sm btn-outline-primary" @click="doFitView" title="Fit Window">
              <i class="bi bi-arrows-fullscreen me-1"></i>Fit
            </button>
            <button class="btn btn-sm btn-outline-secondary" @click="doReset" :title="t('flow2.resetView')">
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>
          </div>
        </div>

        <!-- 플로우 그래프 영역 -->
        <div v-show="activeTab === 'flow'" class="flow-canvas">
          <VueFlow
            :id="flowId"
            :nodes="nodes"
            :edges="edges"
            :default-viewport="{ x: 0, y: 0, zoom: 0.9 }"
            :min-zoom="0.2"
            :max-zoom="2.5"
            :nodes-draggable="true"
            :nodes-connectable="false"
            :elements-selectable="true"
            :fit-view-on-init="true"
            @node-click="onNodeClick"
            @edge-click="onEdgeClick"
            @pane-click="onPaneClick"
            @pane-ready="onPaneReady"
          >
            <Background pattern-color="#dfe3ea" :gap="20" />
            <Controls :show-fit-view="true" :show-zoom="true" :show-interactive="false" />
            <MiniMap
              pannable
              zoomable
              :node-color="(n) => (NODE_STYLES[n.data?.kind] || NODE_STYLES.client).border"
              style="background:#f8f9fb; border:1px solid #e9ecef;"
            />
          </VueFlow>

          <!-- 범례 -->
          <div class="flow-legend">
            <span class="legend-item"><i class="dot" :style="{background: NODE_STYLES.client.border}"></i>Client</span>
            <span class="legend-item"><i class="dot" :style="{background: NODE_STYLES.controller.border}"></i>Controller</span>
            <span class="legend-item"><i class="dot" :style="{background: NODE_STYLES.service.border}"></i>Service</span>
            <span class="legend-item"><i class="dot" :style="{background: NODE_STYLES.sql.border}"></i>SQL</span>
            <span class="legend-item"><i class="dot" :style="{background: NODE_STYLES.db.border}"></i>DB</span>
          </div>
        </div>

        <!-- 하단 상세 정보 패널 -->
        <div v-show="activeTab === 'flow'" class="flow-detail">
          <div v-if="!selection" class="text-secondary small py-2 px-3">
            <i class="bi bi-info-circle me-1"></i>
            {{ t('flow.pickHint') }}
          </div>
          <div v-else class="px-3 py-2">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span
                class="badge"
                :class="selection.kind === 'node' ? 'bg-primary' : 'bg-info text-dark'"
              >
                {{ selection.kind === 'node' ? 'NODE' : 'EDGE' }}
              </span>
              <strong>{{ selection.title }}</strong>
              <small class="text-secondary ms-2">id: {{ selection.id }}</small>
              <small v-if="selection.kind === 'edge'" class="text-secondary">
                · {{ selection.from }} → {{ selection.to }}
              </small>
            </div>
            <table class="table table-sm table-borderless mb-0 flow-detail-table">
              <tbody>
                <tr v-for="(value, key) in selection.details" :key="key">
                  <th class="text-secondary" style="width:180px; vertical-align:top;">{{ key }}</th>
                  <td>
                    <template v-if="value === null || value === undefined || value === ''">
                      <span class="text-secondary">-</span>
                    </template>
                    <template v-else-if="Array.isArray(value)">
                      <code v-if="value.length === 0" class="text-secondary">[]</code>
                      <ul v-else class="mb-0 ps-3">
                        <li v-for="(v, i) in value" :key="i">
                          <code class="small">{{ typeof v === 'object' ? JSON.stringify(v) : v }}</code>
                        </li>
                      </ul>
                    </template>
                    <template v-else-if="typeof value === 'object'">
                      <pre class="small mb-0">{{ JSON.stringify(value, null, 2) }}</pre>
                    </template>
                    <template v-else-if="typeof value === 'boolean'">
                      <span :class="value ? 'text-success' : 'text-secondary'">
                        {{ value ? '✓ true' : 'false' }}
                      </span>
                    </template>
                    <template v-else>
                      <code class="small">{{ value }}</code>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>


        <!-- ═══════════ 파라미터 탭 (Phase 25) ═══════════ -->
        <div v-show="activeTab === 'params'" class="params-tab-pane p-3">
          <div v-if="paramsLoading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <div class="mt-2 text-muted small">{{ t('flow.analyzing') }}</div>
          </div>
          <div v-else-if="paramsError" class="alert alert-danger">{{ paramsError }}</div>
          <div v-else-if="paramsData">
            

            <!-- Services 섹션 -->
            <div v-if="paramsData.services?.length" class="mb-4">
              <h6 class="fw-bold mb-2"><i class="bi bi-gear me-1"></i>{{ t('flow.linkedService') }}</h6>
              <table class="table table-sm table-bordered align-middle small">
                <thead class="table-light">
                  <tr><th>Service</th><th>{{ t('flow.injectedProps') }}</th><th>{{ t('flow2.file') }}</th><th>{{ t('flow.sqlBinding') }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="s in paramsData.services" :key="s.name">
                    <td>
                      <button class="btn btn-link btn-sm p-0 align-baseline font-monospace"
                              :title="t('flowStep.goService', { name: s.name })"
                              @click="goService(s.name)">{{ s.name }}</button>
                    </td>
                    <td><code class="text-muted">{{ s.propertyName }}</code></td>
                    <td class="text-secondary">{{ s.filePath || t('controllerFlow.k1') }}</td>
                    <td>
                      <button v-for="sql in s.sqls" :key="sql"
                              class="badge bg-secondary border-0 me-1"
                              :title="t('flowStep.goSql', { name: sql })"
                              @click="goSql(sql)">{{ sql }}</button>
                      <span v-if="!s.sqls?.length" class="text-muted">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- SQL 쿼리별 섹션 -->
            <div v-if="paramsData.sqlFiles?.length">
              <h6 class="fw-bold mb-2"><i class="bi bi-filetype-sql me-1"></i>{{ t('flow.sqlAnalysis') }}</h6>
              <div v-for="sf in paramsData.sqlFiles" :key="sf.name" class="card mb-3">
                <div class="card-header bg-light py-2 d-flex align-items-center">
                  <code class="fw-bold me-2">{{ sf.name }}.sql</code>
                  <span class="text-muted small">{{ sf.filePath }}</span>
                  <span class="ms-auto badge bg-secondary">{{ sf.queries.length }} queries</span>
                </div>
                <div class="card-body p-0">
                  <div v-for="q in sf.queries" :key="q.name" class="border-bottom p-3">
                    <div class="d-flex align-items-center mb-2">
                      <code class="fw-bold">{{ q.name }}</code>
                      <span class="badge ms-2"
                            :class="{
                              'bg-primary': q.type === 'SELECT',
                              'bg-success': q.type === 'INSERT',
                              'bg-warning text-dark': q.type === 'UPDATE',
                              'bg-danger': q.type === 'DELETE',
                              'bg-secondary': q.type === 'OTHER',
                            }">{{ q.type }}</span>
                    </div>
                    <div class="row g-2 small">
                      <div class="col-md-6">
                        <div class="text-muted fw-semibold mb-1">📥 {{ t('flow.inputParams') }}</div>
                        <div v-if="q.inputParams.length">
                          <span v-for="p in q.inputParams" :key="p" class="badge bg-light text-dark border me-1 mb-1">
                            :{{ p }}
                          </span>
                        </div>
                        <div v-else class="text-muted fst-italic">{{ t('flow.none') }}</div>
                      </div>
                      <div class="col-md-6">
                        <div class="text-muted fw-semibold mb-1">📤 {{ t('flow.outputColumns') }}</div>
                        <div v-if="q.outputColumns.length">
                          <table class="table table-sm mb-0">
                            <tbody>
                              <tr v-for="c in q.outputColumns" :key="c.name">
                                <td><code>{{ c.name }}</code></td>
                                <td v-if="c.expression !== c.name" class="text-muted small">← {{ c.expression }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div v-else class="text-muted fst-italic">{{ q.type === 'SELECT' ? t('controllerFlow.k2') : t('controllerFlow.k3') }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!paramsData.services?.length && !paramsData.sqlFiles?.length && !paramsData.note"
                 class="text-muted text-center py-4">
              {{ t('flow.noServiceSql') }}
            </div>
          </div>
          <div v-else class="text-muted text-center py-4">
            {{ t('flow.startsOnTab') }}
          </div>
        </div>
        </div><!-- shared route selector -->
      </div>

      <div class="modal-footer">
        <button class="btn btn-sm btn-outline-secondary" @click="$emit('close')">{{ t('common.close') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flow-modal {
  width: 95vw;
  height: 90vh;
  max-height: 90vh;
}
.flow-modal :deep(.modal-body) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Phase 26: 탭 wrapper — modal-body 의 flex 체인이 내부 flow-canvas 까지 전달되도록.
   이 래퍼가 없으면 v-show 로 감싸진 flex 자식이 flex container 가 아니라서
   flow-canvas 의 flex: 1 1 auto 가 동작하지 않고 높이가 0 이 됨 (VueFlow 미표시). */
.flow-tab-pane {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

/* Phase 27: 파라미터 탭의 독립 스크롤.
   modal-body 가 overflow:hidden 이라 아무 래퍼 없이 그냥 내용을 두면
   파라미터 분석 내용이 많아져도 세로 스크롤이 동작하지 않고 페이지 body 가 대신 스크롤됨.
   .params-tab-pane 으로 감싸서 내부에서 스크롤. */
.params-tab-pane {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.flow-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #eef0f3;
  background: #fafbfc;
  flex: 0 0 auto;
}

.flow-canvas {
  position: relative;
  flex: 1 1 auto;
  min-height: 300px;
  background: #fff;
  border-bottom: 1px solid #eef0f3;
}
.flow-canvas :deep(.vue-flow__node) {
  white-space: pre-line;
  overflow-wrap: anywhere;
  line-height: 1.35;
  cursor: pointer;
}
.flow-canvas :deep(.vue-flow__node.selected) {
  outline: 2px solid #0d6efd;
  outline-offset: 2px;
}
.flow-canvas :deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke-width: 3px;
  filter: drop-shadow(0 0 3px rgba(13,110,253,0.5));
}
.flow-canvas :deep(.vue-flow__controls) {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-radius: 6px;
  overflow: hidden;
}

/* ── Edge 라벨 ──
   VueFlow 는 edge 라벨 위치를 SVG transform attribute 로 절대좌표 지정함.
   CSS transform 을 추가하면 SVG attribute 가 무시되어 모든 라벨이 원점(0,0) 근처로
   쏠리는 버그가 있음 → CSS transform 절대 금지.
   선/라벨 겹침 방지는 개별 edge 의 labelBgStyle (흰 배경 + 컬러 테두리) 로 해결.
*/
.flow-canvas :deep(.vue-flow__edge-text) {
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;  /* 텍스트를 클릭해도 아래의 edge hit-box 로 이벤트 통과 */
}
.flow-canvas :deep(.vue-flow__edge-textwrapper) {
  cursor: pointer;
}
.flow-canvas :deep(.vue-flow__edge-textbg) {
  /* 개별 edge 의 labelBgStyle 이 덮어쓰지만, 기본 배경도 지정 */
  fill: #ffffff;
  fill-opacity: 0.95;
  stroke: #e9ecef;
  stroke-width: 0.5;
}

.flow-legend {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  gap: 10px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.92);
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 11px;
  color: #495057;
  z-index: 5;
}
.flow-legend .legend-item { display: inline-flex; align-items: center; gap: 4px; }
.flow-legend .dot {
  display: inline-block;
  width: 10px; height: 10px;
  border-radius: 50%;
}

.flow-detail {
  flex: 0 0 auto;
  max-height: 32%;
  overflow: auto;
  background: #f8f9fb;
}
.flow-detail-table th { font-weight: 500; font-size: 12px; }
.flow-detail-table td { font-size: 12px; }
.flow-detail-table pre {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 6px 8px;
  max-height: 160px;
  overflow: auto;
}
</style>
