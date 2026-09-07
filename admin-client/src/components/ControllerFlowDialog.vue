<script setup>
/**
 * ControllerFlowDialog — 컨트롤러의 처리 플로우를 시각적으로 표시하는 대화상자.
 *
 * 플로우: Client 요청 → Controller 함수 → Service → SQL → DB
 *
 * - VueFlow 로 그래프 영역 렌더링
 * - 라우트가 여러 개인 컨트롤러는 상단에서 라우트 선택
 * - 노드/엣지 클릭 시 하단 정보 패널에 상세 정보 표시
 * - 확대/축소/이동/1:1/Fit Window 컨트롤 지원
 *
 * Props:
 *   controller: { id, name, basePath, routes, service_name, autowired_services, ... }
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue';
// ★ v1.10.7 — 다국어
import { useI18n } from '../composables/useI18n';

import { useRouter } from 'vue-router';
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';

import { useDraggable } from '../composables/useDraggable';
import http from '../api/http';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

const { modalRef, headerRef } = useDraggable();

const props = defineProps({
  controller: { type: Object, required: true },
});
const emit = defineEmits(['close']);

// v1.7.8: 연관 이동 — 여기서 이미 의존성(Service/SQL)을 계산해 두고도
//   그 화면으로 갈 방법이 없어 사이드바로 되돌아가야 했다.
const router = useRouter();
function goService(name) {
  emit('close');
  router.push({ name: 'services', query: { q: name } }).catch(() => {});
}
function goSql(name) {
  emit('close');
  router.push({ name: 'sqls', query: { q: String(name).replace(/\.sql$/i, '') } }).catch(() => {});
}

// Phase 25: 대화상자 안에서 "플로우" / "파라미터" 탭 전환
const activeTab = ref('flow');    // 'flow' | 'params'
const paramsData = ref(null);
const paramsLoading = ref(false);
const paramsError = ref('');

async function loadParams() {
  if (paramsData.value || paramsLoading.value) return;
  paramsLoading.value = true;
  paramsError.value = '';
  try {
    const r = await http.get(`/api/admin/controllers/${props.controller.id}/params`);
    paramsData.value = r.data?.data || null;
  } catch (e) {
    paramsError.value = e.response?.data?.message || e.message;
  } finally {
    paramsLoading.value = false;
  }
}

function switchTab(tab) {
  activeTab.value = tab;
  if (tab === 'params') loadParams();
}

/* ──────────────────────────────────────────────────────────────
 * VueFlow 인스턴스 (한 대화상자당 고유 id 로 격리)
 * ────────────────────────────────────────────────────────────── */
const flowId = `flow-${props.controller?.id || 'x'}-${Date.now()}`;
const { fitView, zoomIn, zoomOut, zoomTo, setViewport } = useVueFlow(flowId);

/* ──────────────────────────────────────────────────────────────
 * 서비스 상세 / DB 정보 fetch 상태
 *
 * 컨트롤러 프롭만으로는 sqlFile 을 알 수 없으므로,
 * @Autowired 된 서비스의 메타를 직접 조회하여 sql_file 을 가져온다.
 * DB 정보는 시스템 엔드포인트에서 현재 config 값을 읽어온다.
 * ────────────────────────────────────────────────────────────── */
const serviceMeta = ref(null); // { sql_file, sqlFile, ... } | null
const dbInfo = ref(null);      // { adapter, host, port, database, ... } | null
const loadingMeta = ref(false);

async function loadServiceAndDbInfo() {
  loadingMeta.value = true;
  const serviceName = props.controller?.service_name
    || (props.controller?.autowired_services && props.controller.autowired_services[0]?.serviceName)
    || null;

  const tasks = [];

  // DB 정보
  tasks.push(
    http.get('/api/admin/system/db-info')
      .then((r) => { dbInfo.value = r.data?.data || null; })
      .catch(() => { dbInfo.value = null; }),
  );

  // 서비스 상세 (sqlFile 추적)
  if (serviceName) {
    tasks.push(
      http.get(`/api/admin/services/${encodeURIComponent(serviceName)}`)
        .then((r) => { serviceMeta.value = r.data?.data || null; })
        .catch(() => { serviceMeta.value = null; }),
    );
  }

  await Promise.all(tasks);
  loadingMeta.value = false;
  // 메타가 도착하면 그래프를 재빌드 (sqlFile 이 반영됨)
  buildGraph();
}

/* ──────────────────────────────────────────────────────────────
 * 라우트 선택 상태
 * ────────────────────────────────────────────────────────────── */
const routes = computed(() => props.controller?.routes || []);
const selectedIdx = ref(0);
const selectedRoute = computed(() => routes.value[selectedIdx.value] || null);

/* ──────────────────────────────────────────────────────────────
 * 플로우 데이터 유틸
 * ────────────────────────────────────────────────────────────── */
function joinPath(base, sub) {
  const a = (base || '').replace(/\/+$/, '');
  const b = (sub || '').replace(/^\/+/, '');
  const full = '/' + [a, b].filter(Boolean).join('/').replace(/^\/+/, '');
  return full || '/';
}

// 라우트 타입 → 기본 쿼리명 추론 (기본 CRUD 템플릿 가정)
const TYPE_QUERY_MAP = {
  list: 'findAll',
  listPaged: 'findAll',
  getById: 'findById',
  create: 'insert',
  update: 'update',
  updateName: 'update',   // ★ v1.10.34 — 옛 이름으로 저장된 기존 컨트롤러
  remove: 'deleteById',
};

// 라우트에서 SQL step 목록을 추출 (단순 라우트는 1 step, multiSql 은 N step)
function extractSqlSteps(route) {
  if (!route) return [];
  if (Array.isArray(route.sqlSteps) && route.sqlSteps.length > 0) {
    return route.sqlSteps.map((s, i) => ({
      varName: s.varName || `step${i + 1}`,
      sqlFile: s.sqlFile || t('flowStep.unset'),
      queryName: s.queryName || t('flowStep.unset'),
      action: s.action || 'execute',
      paramsExpr: s.paramsExpr || '',
      paramMappings: s.paramMappings || null,
      _source: 'multiSql',
    }));
  }
  // 단순 라우트: sqlFile 추적 우선순위
  //   1. route.sqlFile (메타에 직접 지정된 경우)
  //   2. controller 프롭의 sqlFile
  //   3. 서비스 메타의 sql_file / sqlFile (@Sql('xxx') 에서 추출됨)
  //   4. t('flowStep.unset')
  const sqlFile =
    route.sqlFile
    || props.controller?.sqlFile
    || serviceMeta.value?.sql_file
    || serviceMeta.value?.sqlFile
    || t('flowStep.unset');
  const queryName = route.sqlQueryName || TYPE_QUERY_MAP[route.type] || t('flowStep.unset');
  return [
    {
      varName: 'result',
      sqlFile,
      queryName,
      action: 'execute',
      _source: 'inferred',
    },
  ];
}

/* ──────────────────────────────────────────────────────────────
 * 노드 색상/스타일 정의
 * ────────────────────────────────────────────────────────────── */
const NODE_STYLES = {
  client:     { bg: '#e7f1ff', border: '#0d6efd', color: '#084298' },
  controller: { bg: '#d1e7dd', border: '#198754', color: '#0a3622' },
  service:    { bg: '#e2d9f3', border: '#6f42c1', color: '#3d1e7a' },
  sql:        { bg: '#fff3cd', border: '#fd7e14', color: '#664d03' },
  db:         { bg: '#f8d7da', border: '#dc3545', color: '#58151c' },
  // Phase 26: MCI Server 노드 — teal 계열 (DB 색상과 구분)
  mci:        { bg: '#d4f1ec', border: '#14b8a6', color: '#0c4a43' },
};

function styleFor(kind) {
  const s = NODE_STYLES[kind] || NODE_STYLES.client;
  return {
    background: s.bg,
    border: `2px solid ${s.border}`,
    color: s.color,
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '600',
    minWidth: '160px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
  };
}

/* ──────────────────────────────────────────────────────────────
 * 선택된 라우트 기반으로 nodes / edges 생성
 * ────────────────────────────────────────────────────────────── */
const nodes = ref([]);
const edges = ref([]);

function buildGraph() {
  const ctrl = props.controller;
  const route = selectedRoute.value;
  if (!ctrl || !route) {
    nodes.value = [];
    edges.value = [];
    return;
  }

  const method = (route.method || 'get').toUpperCase();
  const fullPath = joinPath(ctrl.basePath || ctrl.base_path, route.path);
  const handlerName = route.handlerName || route.handler || 'handler';
  const serviceName = ctrl.service_name
    || (ctrl.autowired_services && ctrl.autowired_services[0]?.serviceName)
    || null;

  const steps = extractSqlSteps(route);

  // 레이아웃 파라미터
  const COL_X = [40, 280, 540, 800, 1080];
  const ROW_GAP = 110;
  const centerY = Math.max(80, (Math.max(1, steps.length) - 1) * ROW_GAP / 2 + 40);

  const n = [];
  const e = [];

  // 1) Client
  n.push({
    id: 'client',
    type: 'input',
    position: { x: COL_X[0], y: centerY },
    data: {
      label: `🌐 ${t('flowStep.clientRequest')}`,
      kind: 'client',
      title: 'Client',
      details: {
        method,
        path: fullPath,
        auth: !!(ctrl.auth || route.auth),
        roles: route.roles || ctrl.roles || [],
        description: t('controllerFlow.k4'),
      },
    },
    style: styleFor('client'),
    sourcePosition: 'right',
    targetPosition: 'left',
  });

  // 2) Controller
  n.push({
    id: 'controller',
    position: { x: COL_X[1], y: centerY },
    data: {
      label: `🎯 ${ctrl.name}\n.${handlerName}()`,
      kind: 'controller',
      title: t('controllerFlow.k5'),
      details: {
        controller: ctrl.name,
        handler: handlerName,
        method,
        path: fullPath,
        type: route.type || 'custom',
        filePath: ctrl.file_path,
        description: t('controllerFlow.k6'),
      },
    },
    style: styleFor('controller'),
    sourcePosition: 'right',
    targetPosition: 'left',
  });

  e.push({
    id: 'e-client-controller',
    source: 'client',
    target: 'controller',
    animated: true,
    label: `${method} ${fullPath}`,
    labelShowBg: true,
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
    labelStyle: { fontSize: '11px', fontWeight: 600, fill: '#0d6efd' },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95, stroke: '#0d6efd', strokeWidth: 1 },
    style: { stroke: '#0d6efd', strokeWidth: 2 },
    markerEnd: MarkerType.ArrowClosed,
    data: {
      title: t('controllerFlow.k7'),
      details: {
        method,
        path: fullPath,
        description: t('controllerFlow.k8'),
      },
    },
  });

  // 3) Service (없을 수 있음 — @Autowired 가 전혀 없는 커스텀 컨트롤러)
  const hasService = !!serviceName;
  if (hasService) {
    n.push({
      id: 'service',
      position: { x: COL_X[2], y: centerY },
      data: {
        label: `⚙️ ${serviceName}`,
        kind: 'service',
        title: 'Service',
        details: {
          serviceName,
          autowiredServices: ctrl.autowired_services || [],
          description: t('controllerFlow.k9'),
        },
      },
      style: styleFor('service'),
      sourcePosition: 'right',
      targetPosition: 'left',
    });

    e.push({
      id: 'e-controller-service',
      source: 'controller',
      target: 'service',
      animated: true,
      label: `this.${(ctrl.autowired_services?.[0]?.propertyName) || 'service'}.${handlerName}()`,
      labelShowBg: true,
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 4,
      labelStyle: { fontSize: '11px', fontWeight: 600, fill: '#6f42c1' },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95, stroke: '#6f42c1', strokeWidth: 1 },
      style: { stroke: '#6f42c1', strokeWidth: 2 },
      markerEnd: MarkerType.ArrowClosed,
      data: {
        title: t('controllerFlow.k10'),
        details: {
          from: `${ctrl.name}.${handlerName}`,
          to: `${serviceName}.${handlerName}`,
          description: t('controllerFlow.k11'),
        },
      },
    });
  }

  // Phase 26: EAI 컨트롤러 분기 — SQL 단계가 아닌 MCI Server 로 전송하는 플로우.
  //   controller_type 에 'MCI' 포함 ('MCI', 'MCI OLD' 등) 시 적용.
  //   - Service 가 있으면: Client → Controller → Service → MCI Server
  //   - Service 없으면:    Client → Controller → MCI Server
  //   DB 노드는 표시 안 함 (EAI 는 외부 EAI 서버로 전문 전송, DB 관여 안 함).
  const isMci = String(ctrl.controller_type || ctrl.controllerType || '')
    .toUpperCase()
    .includes('MCI');

  if (isMci) {
    const mciSourceId = hasService ? 'service' : 'controller';
    // route 에서 추출 가능한 EAI 메타 (있는 필드만)
    const mciTarget = route.mciTarget || route.mci_target || route.targetUrl || null;
    const reqMapper = route.mciRequestMapper || route.requestMapper || null;
    const resMapper = route.mciResponseMapper || route.responseMapper || null;
    const interfaceId = route.interfaceId || route.interface_id || null;

    // MCI Server 노드 (SQL 컬럼 위치에 배치)
    n.push({
      id: 'mci-server',
      type: 'output',
      position: { x: COL_X[3], y: centerY },
      data: {
        label: `📡 MCI Server${interfaceId ? `\nIF: ${interfaceId}` : ''}`,
        kind: 'mci',
        title: 'MCI Server',
        details: {
          target: mciTarget || t('flowStep.defaultGateway'),
          interfaceId: interfaceId || null,
          requestMapper: reqMapper || t('flowStep.autoMapping'),
          responseMapper: resMapper || t('flowStep.autoMapping'),
          description: t('controllerFlow.k12'),
        },
      },
      style: styleFor('mci'),
      sourcePosition: 'right',
      targetPosition: 'left',
    });

    // Controller/Service → EAI 엣지
    e.push({
      id: `e-${mciSourceId}-mci`,
      source: mciSourceId,
      target: 'mci-server',
      animated: true,
      label: reqMapper ? `req: ${reqMapper}` : 'sendTelegram()',
      labelShowBg: true,
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 4,
      labelStyle: { fontSize: '11px', fontWeight: 600, fill: '#14b8a6' },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95, stroke: '#14b8a6', strokeWidth: 1 },
      style: { stroke: '#14b8a6', strokeWidth: 2 },
      markerEnd: MarkerType.ArrowClosed,
      data: {
        title: t('controllerFlow.k13'),
        details: {
          from: hasService ? serviceName : ctrl.name,
          target: mciTarget || t('flowStep.gateway'),
          requestMapper: reqMapper,
          description: t('flowStep.mapperDesc', { layer: hasService ? 'Service' : 'Controller' }),
        },
      },
    });

    nodes.value = n;
    edges.value = e;
    return;   // DB 경로 건너뛰기
  }

  // 4) SQL 노드들 (세로로 쌓임) — DB 컨트롤러 경로
  const sqlSourceId = hasService ? 'service' : 'controller';
  steps.forEach((st, i) => {
    const y = (steps.length === 1) ? centerY : (i * ROW_GAP + 40);
    const sqlId = `sql-${i}`;
    n.push({
      id: sqlId,
      position: { x: COL_X[3], y },
      data: {
        label: `📄 ${st.sqlFile}.sql\n@name: ${st.queryName}`,
        kind: 'sql',
        title: steps.length > 1 ? t('flowStep.sqlStepN', { n: i + 1 }) : 'SQL',
        details: {
          sqlFile: `${st.sqlFile}.sql`,
          queryName: st.queryName,
          varName: st.varName,
          action: st.action,
          paramsExpr: st.paramsExpr || null,
          paramMappings: st.paramMappings || null,
          source: st._source === 'multiSql' ? 'multiSql sqlSteps' : t('flowStep.inferredFromType'),
          description: t('controllerFlow.k14'),
        },
      },
      style: styleFor('sql'),
      sourcePosition: 'right',
      targetPosition: 'left',
    });

    e.push({
      id: `e-${sqlSourceId}-${sqlId}`,
      source: sqlSourceId,
      target: sqlId,
      animated: true,
      label: steps.length > 1 ? `step ${i + 1}: ${st.queryName}` : `@name: ${st.queryName}`,
      labelShowBg: true,
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 4,
      labelStyle: { fontSize: '11px', fontWeight: 600, fill: '#fd7e14' },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95, stroke: '#fd7e14', strokeWidth: 1 },
      style: { stroke: '#fd7e14', strokeWidth: 2 },
      markerEnd: MarkerType.ArrowClosed,
      data: {
        title: t('controllerFlow.k15'),
        details: {
          from: hasService ? serviceName : ctrl.name,
          sqlFile: `${st.sqlFile}.sql`,
          queryName: st.queryName,
          description: t('flowStep.sqlLoadDesc', { file: st.sqlFile, query: st.queryName }),
        },
      },
    });
  });

  // 5) DB — 실제 연결 중인 DB 정보 반영 (dbInfo 가 도착했으면 그걸, 없으면 기본 라벨)
  const dbLabel = dbInfo.value?.adapter
    ? `🗄️ ${String(dbInfo.value.adapter).toUpperCase()}\n${dbInfo.value.database || dbInfo.value.service || ''}`.trim()
    : `🗄️ Database`;

  const dbDetails = {
    description:
      t('flowStep.dbDesc'),
    driver: 'db.execute / db.executeList',
  };
  if (dbInfo.value) {
    dbDetails.adapter = dbInfo.value.adapter;
    dbDetails.configuredType = dbInfo.value.configuredType;
    if (dbInfo.value.fallbackActive) {
      dbDetails['⚠ fallback'] = t('flowStep.fallbackMsg', { configured: dbInfo.value.configuredType, actual: dbInfo.value.adapter });
    }
    if (dbInfo.value.host !== null && dbInfo.value.host !== undefined) dbDetails.host = dbInfo.value.host;
    if (dbInfo.value.port !== null && dbInfo.value.port !== undefined) dbDetails.port = dbInfo.value.port;
    if (dbInfo.value.database) dbDetails.database = dbInfo.value.database;
    if (dbInfo.value.service) dbDetails.service = dbInfo.value.service;
    if (dbInfo.value.user) dbDetails.user = dbInfo.value.user;
    if (dbInfo.value.connectionLimit !== null && dbInfo.value.connectionLimit !== undefined) {
      dbDetails.connectionLimit = dbInfo.value.connectionLimit;
    }
    if (dbInfo.value.acquireTimeout !== null && dbInfo.value.acquireTimeout !== undefined) {
      dbDetails.acquireTimeout = `${dbInfo.value.acquireTimeout} ms`;
    }
    if (dbInfo.value.env) dbDetails.env = dbInfo.value.env;
  } else if (loadingMeta.value) {
    dbDetails.status = t('flowStep.dbLoading');
  }

  n.push({
    id: 'db',
    type: 'output',
    position: { x: COL_X[4], y: centerY },
    data: {
      label: dbLabel,
      kind: 'db',
      title: 'Database',
      details: dbDetails,
    },
    style: styleFor('db'),
    sourcePosition: 'right',
    targetPosition: 'left',
  });

  steps.forEach((_, i) => {
    e.push({
      id: `e-sql-${i}-db`,
      source: `sql-${i}`,
      target: 'db',
      animated: true,
      label: 'db.execute()',
      labelShowBg: true,
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 4,
      labelStyle: { fontSize: '11px', fontWeight: 600, fill: '#dc3545' },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95, stroke: '#dc3545', strokeWidth: 1 },
      style: { stroke: '#dc3545', strokeWidth: 2 },
      markerEnd: MarkerType.ArrowClosed,
      data: {
        title: t('controllerFlow.k16'),
        details: {
          description: t('controllerFlow.k17'),
        },
      },
    });
  });

  nodes.value = n;
  edges.value = e;
}

/* ──────────────────────────────────────────────────────────────
 * 선택 정보 (하단 패널용)
 * ────────────────────────────────────────────────────────────── */
const selection = ref(null); // { kind: 'node'|'edge', title, details }

function onNodeClick({ node }) {
  selection.value = {
    kind: 'node',
    nodeKind: node.data?.kind,
    title: node.data?.title || node.data?.label,
    id: node.id,
    details: node.data?.details || {},
  };
}

function onEdgeClick({ edge }) {
  selection.value = {
    kind: 'edge',
    title: edge.data?.title || 'Edge',
    id: edge.id,
    from: edge.source,
    to: edge.target,
    details: edge.data?.details || {},
  };
}

function onPaneClick() {
  selection.value = null;
}

/* ──────────────────────────────────────────────────────────────
 * 컨트롤: 확대/축소/1:1/Fit
 * ────────────────────────────────────────────────────────────── */
function doZoomIn() { zoomIn({ duration: 200 }); }
function doZoomOut() { zoomOut({ duration: 200 }); }
function doActualSize() { zoomTo(1, { duration: 200 }); }
function doFitView() { fitView({ padding: 0.15, duration: 250 }); }
function doReset() {
  setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 200 });
}

/* ──────────────────────────────────────────────────────────────
 * 라우트 변경 감지 → 그래프 재생성 + fitView
 * ────────────────────────────────────────────────────────────── */
watch(selectedRoute, () => {
  selection.value = null;
  buildGraph();
  nextTick(() => {
    try { fitView({ padding: 0.15, duration: 200 }); } catch (_) { /* noop */ }
  });
}, { immediate: true });

/* 초기 fit */
function onPaneReady() {
  nextTick(() => {
    try { fitView({ padding: 0.15 }); } catch (_) { /* noop */ }
  });
}

/* 컴포넌트 마운트 시 서비스 상세 / DB 정보 병렬 로딩.
 * 로딩이 완료되면 loadServiceAndDbInfo 내부에서 buildGraph() 를 다시 호출해
 * sqlFile 과 DB 정보가 그래프에 반영된다. */
onMounted(() => {
  loadServiceAndDbInfo();
});

/* ──────────────────────────────────────────────────────────────
 * 라우트 옵션 라벨
 * ────────────────────────────────────────────────────────────── */
const routeOptions = computed(() => {
  const base = props.controller?.basePath || props.controller?.base_path || '';
  return routes.value.map((r, i) => ({
    idx: i,
    label: `[${(r.method || 'get').toUpperCase()}] ${joinPath(base, r.path)}  →  ${r.handlerName || r.handler || 'handler'}`,
    type: r.type || 'custom',
  }));
});
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
        <div v-show="activeTab === 'flow'" class="flow-tab-pane">
        <!-- 상단 툴바: 라우트 선택 + 뷰 컨트롤 -->
        <div class="flow-toolbar">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <label class="form-label small mb-0 text-secondary">{{ t('flow2.routes') }}</label>
            <select
              v-model.number="selectedIdx"
              class="form-select form-select-sm"
              style="min-width:360px; max-width:560px;"
              :disabled="!routes.length"
            >
              <option v-if="!routes.length" :value="0">{{ t('flow.noRoutes') }}</option>
              <option v-for="opt in routeOptions" :key="opt.idx" :value="opt.idx">
                {{ opt.label }}
                <template v-if="opt.type === 'multiSql'"> · multiSql</template>
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
        <div class="flow-canvas">
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
        <div class="flow-detail">
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
        </div><!-- /flow tab -->

        <!-- ═══════════ 파라미터 탭 (Phase 25) ═══════════ -->
        <div v-show="activeTab === 'params'" class="params-tab-pane p-3">
          <div v-if="paramsLoading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <div class="mt-2 text-muted small">{{ t('flow.analyzing') }}</div>
          </div>
          <div v-else-if="paramsError" class="alert alert-danger">{{ paramsError }}</div>
          <div v-else-if="paramsData">
            <div v-if="paramsData.note" class="alert alert-info">{{ paramsData.note }}</div>

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
