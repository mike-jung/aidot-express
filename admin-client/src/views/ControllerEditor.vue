<script setup>
/**
 * ControllerEditor v8 — 5개 기본 라우트 자동생성 + 서비스 선택 대화상자.
 *
 *  변경점 (v7 → v8)
 *   - generate5DefaultRoutes(): list/getById/create/update/remove 한번에 생성
 *     (SQL 의 5개 기본 쿼리와 1:1 대응). 중복 type 은 건너뜀.
 *   - 새 컨트롤러 생성 시 기본 'list' 라우트 자동 추가 로직 제거 — 빈 상태로 시작.
 *   - '기본 Service' input 옆에 ResourcePicker 기반 서비스 선택 대화상자 추가.
 */
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import AuthHelpDialog from '../components/AuthHelpDialog.vue';   // ★ v1.16.1
// ★ v1.10.3 — 다국어
import { useI18n } from '../composables/useI18n';
import ScaffoldBar from '../components/ScaffoldBar.vue';
import { useFormat } from '../composables/useFormat';
import http, { sseUrl } from '../api/http';
import CodeEditor from '../components/CodeEditor.vue';
import SqlStepsEditor from '../components/SqlStepsEditor.vue';
import Pagination from '../components/Pagination.vue';
import ResourcePicker from '../components/ResourcePicker.vue';
import { useDraggable } from '../composables/useDraggable';
import { useRouter } from 'vue-router';

const { modalRef, headerRef } = useDraggable();
const router = useRouter();
const commonRoles = ['admin', 'manager', 'user', 'editor', 'viewer', 'operator'];

const { t } = useI18n();

const fmt = useFormat();
const props = defineProps({ id: { type: String, default: null } });
const emit = defineEmits(['close', 'saved']);
const isEdit = computed(() => props.id != null);
const title = computed(() => isEdit.value ? t('designer.ctl_editTitle') : t('designer.ctl_newTitle'));

const meta = reactive({
  name: '', basePath: '', controllerType: 'DB', serviceName: '', description: '', auth: false, roles: [], routes: [],
  // 실시간(SSE): 켜면 create/update/remove 에 알림 발행 코드가 자동으로 들어가고
  //   구독 주소(GET {basePath}/events)가 라우트 목록에 추가된다.
  realtime: { enabled: false, channel: '' },
});

/* 실시간 테스트 패널 (만들자마자 콘솔에서 바로 확인) */
const rtTest = reactive({ open: false, status: 'closed', logs: [] });
let rtEs = null;

/**
 * Phase 35 (patch-14): MCI / MCI OLD 유형은 이 일반 editor 로 만들 수 없음.
 *   실제로 EAI 컨트롤러는 엑셀 업로드 기반의 "EAI 컨트롤러 생성" 전용 마법사로 만들어야 함.
 *   isEdit 모드에서는 (이미 만들어진) EAI 컨트롤러를 볼 수 있도록 dropdown 유지하되,
 *   신규 모드에서 MCI/MCI OLD 선택 시 전용 마법사로 리다이렉트 안내.
 */
const isMciType = computed(() => {
  const t = String(meta.controllerType || '').toUpperCase();
  return t === 'MCI' || t === 'MCI OLD';
});
function goToMciWizard() {
  // 신규 생성 — 전용 마법사로 이동
  emit('close');  // 현재 모달/페이지 닫기 신호
  router.push('/controllers/mci/new');
}
// ★ 서버에서 가져온 @Autowired 목록: [{ serviceName, propertyName }, ...]
const authHelpOpen = ref(false);   // ★ v1.16.1 인증 도움말

/** 라우트 하나만 인증을 걸고 푼다 (역할은 펼친 영역에서 고른다) */
function toggleRouteAuth(r) {
  r.auth = !r.auth;
  if (!r.auth) r.roles = [];
  else if (!Array.isArray(r.roles)) r.roles = [];
}
const autowiredServices = ref([]);

const generatedCode = ref('');
const routeTypes = ref([]);
const serviceOptions = ref([]);
const sqlOptions = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref(null);
const codeDirty = ref(false);

// ▶ '기본 Service' 필드용 서비스 선택 대화상자 상태
const servicePickerOpen = ref(false);

const routePage = ref(1);
const ROUTES_PER_PAGE = 5;
const totalRoutePages = computed(() => Math.max(1, Math.ceil(meta.routes.length / ROUTES_PER_PAGE)));
const pagedRoutes = computed(() => { const s=(routePage.value-1)*ROUTES_PER_PAGE; return meta.routes.slice(s, s+ROUTES_PER_PAGE); });
const pageOffset = computed(() => (routePage.value-1)*ROUTES_PER_PAGE);

function onCodeChange(v) { generatedCode.value = v; codeDirty.value = true; }

/* ──── 서비스 메서드 flat 리스트 ──── */
const allServiceMethods = computed(() => {
  const out = [];
  for (const svc of serviceOptions.value) {
    for (const m of (svc.methods || [])) out.push({ id: `${svc.name}.${m}`, name: `${svc.name}.${m}`, serviceName: svc.name, methodName: m, description: svc.sql_file ? `SQL: ${svc.sql_file}` : '' });
    for (const m of (svc.multiSqlMethods || [])) out.push({ id: `${svc.name}.${m.name}`, name: `${svc.name}.${m.name}`, serviceName: svc.name, methodName: m.name, description: 'multiSql' });
  }
  return out;
});

/* ──── SQL 쿼리 flat 리스트 ──── */
const allSqlQueries = computed(() => {
  const out = [];
  for (const sql of sqlOptions.value) for (const q of (sql.queries || [])) out.push({ id: `${sql.name}.${q}`, name: `${sql.name}.${q}`, sqlFile: sql.name, queryName: q, description: sql.table_name || sql.name });
  return out;
});

/* ──── 주입된 서비스 상세 ──── */
const injectedServiceDetails = computed(() => {
  return autowiredServices.value.map(aw => {
    const svc = serviceOptions.value.find(s => s.name === aw.serviceName);
    return { ...aw, methods: svc?.methods || [], multiSqlMethods: svc?.multiSqlMethods || [], sql_file: svc?.sql_file || '' };
  });
});

/* ──── type 자동 추론 ──── */
function inferRouteType(r) {
  if (r.type && r.type !== 'custom') return r.type;
  if (Array.isArray(r.sqlSteps) && r.sqlSteps.length > 0) return 'multiSql';
  const m = (r.method || 'get').toLowerCase(), p = r.path || '/', h = (r.handlerName || r.handler || '').toLowerCase();
  if (m==='get'&&p==='/'&&(h==='list'||h==='findall')) return 'list';
  if (m==='get'&&/^\/paged/i.test(p)) return 'listPaged';
  if (m==='get'&&/^\/:[\w]+$/.test(p)&&(h==='get'||h.includes('byid'))) return 'getById';
  if (m==='post'&&p==='/'&&h==='create') return 'create';
  if ((m==='put'||m==='patch')&&/^\/:[\w]+$/.test(p)) return 'update';
  if (m==='delete'&&/^\/:[\w]+$/.test(p)) return 'remove';
  return 'custom';
}

/**
 * ★ v1.8.3 — 라우트 type / handlerName 을 실제 서비스 메서드 이름으로 맞춘다.
 *
 *  컨트롤러 쪽 handlerName 은 URL 관점 이름(`get`, `update`)이고,
 *  서비스 쪽 메서드명은 의미 관점 이름(`getById`, `updateName`)이다.
 *  같은 것을 가리키는데 표기가 달라, 이름만으로 이으면 절반이 끊긴다.
 *
 *  ① type 이 서비스에 있으면 그것 (가장 정확 — 서비스 메서드명 = type 체계)
 *  ② handlerName 이 서비스에 있으면 그것 (사용자가 직접 맞춰 놓은 경우)
 *  ③ 둘 다 없으면 handlerName 을 그대로 (없는 메서드로 표시되어 사용자가 알아챌 수 있게)
 */
function resolveServiceMethodName(serviceName, type, handlerName) {
  const svc = serviceOptions.value.find((x) => x.name === serviceName);
  const known = new Set([...(svc?.methods || []), ...((svc?.multiSqlMethods || []).map((m) => m.name))]);
  if (type && type !== 'custom' && known.has(type)) return type;
  if (handlerName && known.has(handlerName)) return handlerName;
  return handlerName || type || 'handler';
}

/**
 * ★ v1.8.3 — 서비스 메서드가 실제로 쓰는 SQL 을 찾아낸다.
 *
 *  이전에는 `initRoute` 가 `type === 'multiSql'` 인 라우트에서만 SQL 을 채웠다.
 *  표준 라우트(list/getById/create/…)는 **서비스를 거쳐** SQL 에 닿는데
 *  그 한 단계를 따라가지 않아 [SQL] 팝오버가 언제나 '없음' 이었다.
 *
 *  서버(`/api/admin/services/all`)가 v1.8.3 부터 `method_sql_map` 을 함께 주므로
 *  `SnackService.list` → `snack.findAll` 로 정확히 풀 수 있다.
 *  (그 전에는 서버가 이 값을 만들어 두고도 응답에서 빼고 있었다.)
 *
 * @param {string} id `ServiceName.methodName`
 * @returns {string[]} `['sqlFile.queryName', ...]`
 */
function sqlQueriesForServiceMethod(id) {
  const dot = String(id || '').indexOf('.');
  if (dot < 0) return [];
  const svcName = id.slice(0, dot);
  const method = id.slice(dot + 1);
  const svc = serviceOptions.value.find((x) => x.name === svcName);
  if (!svc) return [];

  // 다단계(multiSql) 메서드는 여러 SQL 을 쓴다 — 서버가 단계 목록을 준다
  const steps = svc.multiSqlSteps?.[method];
  if (Array.isArray(steps) && steps.length) return steps;

  const query = svc.method_sql_map?.[method];
  // sql_file 이 없으면 어떤 파일의 쿼리인지 특정할 수 없다 — 억지로 만들지 않는다
  if (!query || !svc.sql_file) return [];
  return [`${svc.sql_file}.${query}`];
}

/** 라우트에 걸린 모든 서비스 메서드의 SQL 을 모은다 (중복 제거) */
function sqlQueriesForRoute(serviceMethodIds) {
  const out = [];
  for (const id of (serviceMethodIds || [])) {
    for (const q of sqlQueriesForServiceMethod(id)) if (!out.includes(q)) out.push(q);
  }
  return out;
}

function initRoute(r, serviceName) {
  const type = inferRouteType(r);
  const handlerName = r.handlerName || r.handler || 'handler';
  /* ★ 서비스 메서드 자동 연결.
     ⚠ 컨트롤러의 handlerName 과 서비스의 메서드명은 **체계가 다르다.**
        컨트롤러 카탈로그: getById → handlerName 'get',  update → 'update'
        서비스 카탈로그  : 메서드명이 곧 type ('getById', 'update')
     그래서 handlerName 으로만 찾으면 5개 중 2개(get/update)가 서비스에서 안 잡히고,
     그 결과 SQL 도 못 찾는다. type 을 먼저 보고, 없으면 handlerName 으로 되짚는다. */
  const svcMethods = [];
  if (type !== 'multiSql' && serviceName) {
    svcMethods.push(`${serviceName}.${resolveServiceMethodName(serviceName, type, handlerName)}`);
  }
  const sqlQueries = [];
  if (type === 'multiSql') {
    for (const st of (r.sqlSteps || [])) if (st.sqlFile && st.queryName) sqlQueries.push(`${st.sqlFile}.${st.queryName}`);
  } else {
    // ★ v1.8.3: 표준 라우트는 서비스를 한 단계 거쳐 SQL 에 닿는다. 그 경로를 따라간다.
    sqlQueries.push(...sqlQueriesForRoute(svcMethods));
  }
  return { ...r, type, handlerName, auth: r.auth||false, roles: r.roles||[],
    expanded: false, _showServices: false, _showSqls: false, _svcPickerOpen: false, _sqlPickerOpen: false,
    /* ★ v1.8.5 — 저장값과 계산값을 합친다.
       ⚠ 예전에는 `r._sqlQueries || sqlQueries` 였는데, **빈 배열은 JS 에서 truthy** 라
         저장된 `[]` 가 계산값을 이겼다. 컨트롤러 메타에 `_sqlQueries: []` 가 박혀 있어서
         '수정' 화면에서는 v1.8.3 의 SQL 해석이 통째로 무력화됐다.
         (신규 화면은 저장값이 없어 계산값이 쓰였다 — 그래서 신규만 고쳐진 것처럼 보였다.)
       ⚠ `_serviceMethods` 도 마찬가지다. 옛 판이 `BookService.get` 같은 handlerName 기반
         이름을 굳혀 두었는데, 그대로 쓰면 서비스에 없는 메서드라 SQL 도 못 찾는다.
         저장값 중 **서비스에 실제로 존재하지 않는 이름**은 계산값으로 바로잡는다. */
    _serviceMethods: mergeServiceMethods(r._serviceMethods, svcMethods, serviceName),
    _sqlQueries: pickQueries(r._sqlQueries, sqlQueries),
  };
}

/** 저장값이 비어 있으면 계산값. 빈 배열도 '비어 있음' 으로 본다. */
function pickQueries(saved, computed) {
  return (Array.isArray(saved) && saved.length) ? saved : computed;
}

/**
 * 저장된 서비스 메서드 이름을 실제 존재하는 것으로 바로잡는다.
 *  · 저장값이 비면 계산값
 *  · 저장값이 서비스에 실제로 있으면 그대로 (사용자가 직접 고른 것일 수 있다)
 *  · 없으면 같은 라우트의 계산값으로 교체 (handlerName 기반 옛 이름 보정)
 */
function mergeServiceMethods(saved, computed, serviceName) {
  if (!Array.isArray(saved) || !saved.length) return computed;
  const svc = serviceOptions.value.find((x) => x.name === serviceName);
  // 서비스 목록을 아직 못 받았으면 판단할 수 없다 — 저장값을 존중한다
  if (!svc) return saved;
  const known = new Set([...(svc.methods || []), ...((svc.multiSqlMethods || []).map((m) => m.name))]);
  const fixed = saved.map((id) => {
    const dot = id.indexOf('.');
    const m = dot < 0 ? id : id.slice(dot + 1);
    if (known.has(m)) return id;
    return computed[0] || id;      // 옛 이름 → 이 라우트의 올바른 이름
  });
  return [...new Set(fixed)];
}

/* ──── 라우트별 서비스/SQL 관리 ──── */
function addServiceMethodToRoute(gi, item) {
  const r = meta.routes[gi];
  if (!r._serviceMethods.includes(item.id)) r._serviceMethods.push(item.id);
  if (!meta.serviceName) meta.serviceName = item.serviceName;
  // ★ v1.8.3: 서비스 메서드를 붙이면 그 메서드가 쓰는 SQL 도 함께 따라온다.
  //   사용자가 손으로 고른 SQL 은 건드리지 않는다(중복만 피한다).
  if (r.type !== 'multiSql') {
    for (const q of sqlQueriesForServiceMethod(item.id)) {
      if (!r._sqlQueries.includes(q)) r._sqlQueries.push(q);
    }
  }
}
function removeServiceMethodFromRoute(gi, id) {
  const r = meta.routes[gi];
  r._serviceMethods = r._serviceMethods.filter(m => m !== id);
  // ★ v1.8.3: 이 메서드 때문에 딸려 온 SQL 만 뗀다.
  //   다른 메서드도 같은 SQL 을 쓰면 남겨야 한다 — 안 그러면 화면에서 SQL 이 사라진다.
  if (r.type !== 'multiSql') {
    const stillUsed = new Set(sqlQueriesForRoute(r._serviceMethods));
    const orphaned = sqlQueriesForServiceMethod(id).filter(q => !stillUsed.has(q));
    if (orphaned.length) r._sqlQueries = r._sqlQueries.filter(q => !orphaned.includes(q));
  }
}
function addSqlQueryToRoute(gi, item) { const r = meta.routes[gi]; if (!r._sqlQueries.includes(item.id)) r._sqlQueries.push(item.id); if (r.type==='multiSql') { if(!r.sqlSteps)r.sqlSteps=[]; r.sqlSteps.push({varName:'result'+(r.sqlSteps.length+1),sqlFile:item.sqlFile,queryName:item.queryName,paramMappings:{},paramsExpr:'',rawMode:false,action:'execute'}); } }
function removeSqlQueryFromRoute(gi, id) { const r = meta.routes[gi]; r._sqlQueries = r._sqlQueries.filter(q => q !== id); if (r.type==='multiSql'&&r.sqlSteps) { const [sf,qn]=id.split('.'); const i=r.sqlSteps.findIndex(st=>st.sqlFile===sf&&st.queryName===qn); if(i>=0)r.sqlSteps.splice(i,1); } }

/* ──── 로딩 ──── */
async function loadCatalog() {
  const [r,sr,qr]=await Promise.all([http.get('/api/admin/controllers/route-types'),http.get('/api/admin/services/all'),http.get('/api/admin/sqls/all')]);
  routeTypes.value=r.data.data||r.data||[];
  serviceOptions.value=sr.data.data||sr.data||[];
  sqlOptions.value=qr.data.data||qr.data||[];
}
async function loadExisting() {
  const r=await http.get(`/api/admin/controllers/${props.id}`);
  const d=r.data.data||r.data; if(!d) return;
  meta.name=d.name;
  meta.basePath=d.base_path||d.basePath||'';
  meta.controllerType=d.controller_type||d.controllerType||'DB';
  meta.description=d.description||'';
  meta.auth=d.auth||false;
  meta.roles=d.roles||[];

  // ★ 핵심: autowired_services 로부터 서비스 정보 설정
  autowiredServices.value = d.autowired_services || [];
  meta.serviceName = d.service_name || '';

  // ★ initRoute 에 serviceName 전달
  meta.routes=(d.routes||[]).map(r => initRoute(r, meta.serviceName));
  // 실시간 설정 복원 (사이드카 메타에 저장됨). 메타가 없어도 sse 라우트가 있으면 켜진 것으로 본다.
  meta.realtime = {
    enabled: !!(d.realtime?.enabled) || (d.routes || []).some(r => r.type === 'sse'),
    channel: d.realtime?.channel || '',
  };
  if (meta.realtime.enabled && !meta.realtime.channel) meta.realtime.channel = suggestChannel();

  // Phase 37 (patch-16): 디스크에 저장된 실제 소스(d.source) 를 그대로 노출.
  //  preview() 로 메타에서 재생성하면 사용자의 직접 수정분이 가려지고,
  //  그 상태에서 저장하면 customCode 미전송 → 서버가 메타로 재생성 → 직접 수정이 조용히 소실됨.
  //  d.source 가 있으면 그것을 진실로 삼고 codeDirty=true 로 두어, 저장 시 항상 그 소스가 전송되게 한다.
  if (d.source) {
    generatedCode.value = d.source;
    codeDirty.value = true;
  } else {
    await preview();
    codeDirty.value = false;
  }
}
function addRoute(type='list') {
  const tpl = routeTypes.value.find(t => t.type === type);
  /* ★ v1.8.4 — 일괄 생성과 **같은 fallback** 을 쓴다.
     예전에는 카탈로그가 아직 안 왔을 때 전부 `GET / handler` 로 떨어져,
     [DELETE /:id 삭제] 를 골라도 `GET /` 라우트가 만들어졌다.
     일괄 생성(`generate5DefaultRoutes`)은 `defaultRouteSpec()` 을 쓰고 있었는데
     개별 추가만 빠져 있었다 — 같은 화면에서 두 경로의 결과가 달랐다. */
  const d = defaultRouteSpec(type);
  const route = initRoute({
    type,
    method: tpl?.method || d.method,
    path: tpl?.path || d.path,
    handlerName: tpl?.handlerName || d.handlerName,
    sqlSteps: type === 'multiSql' ? [] : undefined,
    useTransaction: type === 'multiSql' ? false : undefined,
    returnExpr: type === 'multiSql' ? '' : undefined,
  }, meta.serviceName);
  route.expanded = true;
  meta.routes.push(route);
  routePage.value = totalRoutePages.value;
  showRouteAddMenu.value = false;
}

/** 개별 추가 메뉴 열림 상태 (ServiceEditor 의 '메서드 추가' 와 같은 방식) */
const showRouteAddMenu = ref(false);

/**
 * 개별 추가 메뉴에 띄울 라우트 종류.
 *  카탈로그가 늦게 와도 메뉴가 비지 않도록 fallback 목록을 함께 쓴다.
 */
const routeAddOptions = computed(() => {
  if (routeTypes.value.length) return routeTypes.value;
  return ['list', 'getById', 'create', 'update', 'remove'].map((type) => {
    const d = defaultRouteSpec(type);
    return { type, ...d, description: `${d.method.toUpperCase()} ${d.path}` };
  });
});

/**
 *  5개 기본 라우트 자동 생성 — SQL 의 "5개 기본 쿼리" 와 1:1 매핑.
 *     list      (GET  /)     ↔ findAll
 *     getById   (GET  /:id)  ↔ findById
 *     create    (POST /)     ↔ insert
 *     updateName(PUT  /:id)  ↔ updateName
 *     remove    (DELETE /:id)↔ deleteById
 *
 *  이미 같은 type 의 라우트가 있으면 건너뛰어 중복 생성 방지.
 */
/** 컨트롤러 이름에서 기본 요청 경로를 만든다 — SnackController → /api/snacks */
function suggestBasePath() {
  const base = String(meta.name || '').replace(/Controller$/i, '').trim();
  if (!base) return '';
  const kebab = base.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
  if (!kebab) return '';
  const plural = /s$/.test(kebab) ? kebab : `${kebab}s`;
  return `/api/${plural}`;
}

function generate5DefaultRoutes() {
  error.value = null;
  const DEFAULT_TYPES = ['list', 'getById', 'create', 'update', 'remove'];
  const existingTypes = new Set(meta.routes.map(r => r.type));
  let added = 0, skipped = 0;
  for (const type of DEFAULT_TYPES) {
    if (existingTypes.has(type)) { skipped++; continue; }
    // routeTypes 카탈로그가 아직 안 로드된 경우 fallback 템플릿도 허용
    const tpl = routeTypes.value.find(t => t.type === type);
    const route = initRoute({
      type,
      method: tpl?.method || defaultRouteSpec(type).method,
      path: tpl?.path || defaultRouteSpec(type).path,
      handlerName: tpl?.handlerName || defaultRouteSpec(type).handlerName,
    }, meta.serviceName);
    route.expanded = false;  // 5개 한꺼번에 열면 너무 길어지므로 접힌 상태로
    meta.routes.push(route);
    added++;
  }
  routePage.value = totalRoutePages.value;
  /* 라우트만 만들고 [생성된 코드] 는 비어 있어서 "버튼이 반만 동작한다" 로 보였다.
     SQL 화면은 버튼 한 번에 쿼리까지 다 만들어 준다 — 여기도 코드까지 만든다.
     (직접 고친 코드가 있으면 codeDirty 가 서 있으므로 preview() 안에서 덮지 않는다) */
  if (added > 0 && !codeDirty.value && meta.name) {
    /* 경로를 아직 안 적었으면 이름에서 만들어 준다 (SnackController → /api/snacks).
       코드를 만들려면 경로가 있어야 하는데, 버튼만 누르고 왜 코드가 안 나오는지 알기 어려웠다.
       사용자가 적어 둔 값이 있으면 절대 건드리지 않는다. */
    if (!meta.basePath) meta.basePath = suggestBasePath();
    if (meta.basePath) preview();
  }
  if (added === 0 && skipped > 0) {
    error.value = t('designer.ctl_allExist').replace('{n}', skipped);
  }
}
/** routeTypes 카탈로그 로드 전 fallback 용 최소 스펙 */
function defaultRouteSpec(type) {
  return ({
    list:       { method: 'get',    path: '/',     handlerName: 'list' },
    getById:    { method: 'get',    path: '/:id',  handlerName: 'get' },
    create:     { method: 'post',   path: '/',     handlerName: 'create' },
    update:     { method: 'put',    path: '/:id',  handlerName: 'update' },
  /* ★ v1.10.34 — 옛 이름으로 저장된 기존 컨트롤러도 계속 열리게 남긴다 */
  updateName: { method: 'put',    path: '/:id',  handlerName: 'update' },
    remove:     { method: 'delete', path: '/:id',  handlerName: 'remove' },
  })[type] || { method: 'get', path: '/', handlerName: 'handler' };
}
/* ==========================================================
 *  실시간(SSE)
 * ========================================================== */
/** /api/snacks → snacks (Supabase Realtime 의 'scope:entity' 관례와 같은 취지) */
function suggestChannel() {
  const fromPath = (meta.basePath || '').split('/').filter(Boolean).pop();
  const raw = fromPath || (meta.name || '').replace(/Controller$/i, '');
  return String(raw).replace(/[^A-Za-z0-9_-]/g, '').toLowerCase() || 'events';
}

const sseRouteIndex = computed(() => meta.routes.findIndex(r => r.type === 'sse'));
const streamPath = computed(() => {
  const r = sseRouteIndex.value >= 0 ? meta.routes[sseRouteIndex.value] : null;
  return `${meta.basePath || '/api/...'}${r?.path || '/events'}`;
});

/** 체크 한 번으로 "구독 주소 + 변경 알림" 을 동시에 켠다 */
function toggleRealtime(on) {
  meta.realtime.enabled = on;
  if (on) {
    if (!meta.realtime.channel) meta.realtime.channel = suggestChannel();
    if (sseRouteIndex.value < 0) {
      meta.routes.push(initRoute({
        type: 'sse', method: 'get', path: '/events', handlerName: 'events',
        auth: false, roles: [], expanded: false, _autoSse: true,
      }, meta.serviceName));
      routePage.value = totalRoutePages.value;
    }
  } else {
    // 체크를 풀면 자동으로 넣었던 구독 주소만 되돌린다 (직접 추가한 것은 남긴다)
    const i = meta.routes.findIndex(r => r.type === 'sse' && r._autoSse);
    if (i >= 0) meta.routes.splice(i, 1);
    stopRtTest();
  }
  if (!codeDirty.value && meta.name && meta.basePath && meta.routes.length > 0) preview();
}

/** 콘솔에서 바로 {{ t('controller.connect') }} */
async function startRtTest() {
  stopRtTest();
  rtTest.open = true;
  rtTest.status = 'connecting';
  // 인증이 걸린 컨트롤러면 1회용 티켓을 받아 붙인다 (EventSource 는 헤더를 못 보냄)
  const url = meta.auth ? await sseUrl(streamPath.value) : streamPath.value;
  rtLog('sys', `${t('designer.ctl_connecting')}: ${url.replace(/ticket=[^&]*/, 'ticket=***')}`);
  try { rtEs = new EventSource(url); } catch (e) { rtTest.status = 'error'; rtLog('err', e.message); return; }
  rtEs.onopen = () => { rtTest.status = 'open'; rtLog('ok', '연결됨 — 이제 이 API 로 데이터를 넣거나 지워 보세요.'); };
  rtEs.onerror = () => {
    rtTest.status = 'error';
    rtLog('err', t('designer.ctl_connFailed'));
    stopRtTest(true);
  };
  ['hello', 'connected', 'change'].forEach((name) => {
    rtEs.addEventListener(name, (e) => {
      let d = e.data; try { d = JSON.stringify(JSON.parse(e.data)); } catch { /* 문자열 그대로 */ }
      rtLog(name === 'change' ? 'change' : 'sys', `${name} ${d}`, e.lastEventId);
    });
  });
}
function stopRtTest(keepOpen = false) {
  if (rtEs) { rtEs.close(); rtEs = null; }
  if (!keepOpen) rtTest.status = 'closed';
}
function rtLog(kind, text, id) {
  rtTest.logs.unshift({ kind, text, id: id || null, ts: fmt.time() });
  if (rtTest.logs.length > 50) rtTest.logs.pop();
}

function removeRoute(gi){meta.routes.splice(gi,1);if(routePage.value>totalRoutePages.value)routePage.value=totalRoutePages.value;}
function moveRoute(gi,dir){const j=gi+dir;if(j<0||j>=meta.routes.length)return;[meta.routes[gi],meta.routes[j]]=[meta.routes[j],meta.routes[gi]];}
function onTypeChange(gi){const r=meta.routes[gi];const tpl=routeTypes.value.find(t=>t.type===r.type);if(tpl){r.method=tpl.method;r.path=tpl.path;r.handlerName=tpl.handlerName;} if(r.type==='multiSql'){if(!Array.isArray(r.sqlSteps))r.sqlSteps=[];if(typeof r.useTransaction!=='boolean')r.useTransaction=false;if(typeof r.returnExpr!=='string')r.returnExpr='';}}
function patchMultiSql(gi,payload){const r=meta.routes[gi];r.sqlSteps=payload.sqlSteps;r.useTransaction=payload.useTransaction;r.returnExpr=payload.returnExpr;r._sqlQueries=(r.sqlSteps||[]).filter(st=>st.sqlFile&&st.queryName).map(st=>`${st.sqlFile}.${st.queryName}`);}
/** 서버 전송용 routes — 컨트롤러 레벨 auth를 각 라우트에 전파 */
/**
 * ★ v1.8.5 — 화면 전용 상태는 저장하지 않는다.
 *
 *  예전에는 `{ ...r }` 로 라우트 객체를 통째로 보내, 접힘/펼침 같은 UI 상태와
 *  **계산으로 복원할 수 있는 파생값**까지 디스크(사이드카 메타)에 박혔다.
 *  그게 실제로 사고를 냈다 — 저장된 `_sqlQueries: []` 가 다음 편집 때
 *  계산값을 덮어써서(빈 배열은 truthy) SQL 연결이 영원히 '없음' 이 됐다.
 *  옛 `_serviceMethods` 이름도 함께 굳어 이름 해소까지 막았다.
 *
 *  파생값은 저장하지 않고 **열 때마다 다시 계산한다.** 그래야 서비스나 SQL 이
 *  바뀌었을 때 컨트롤러가 따라온다 — 저장해 두면 옛 정보가 화면에 남는다.
 *
 *  `_sqlQueries` 는 multiSql 라우트에서만 뜻이 있는데, 그건 `sqlSteps` 로
 *  이미 저장되므로 여기서도 뺀다 (initRoute 가 sqlSteps 에서 되살린다).
 */
const UI_ONLY_ROUTE_FIELDS = [
  'expanded', '_showServices', '_showSqls', '_svcPickerOpen', '_sqlPickerOpen',
  '_serviceMethods', '_sqlQueries',
];

function buildRoutesForServer() {
  return meta.routes.map(r => {
    const route = { ...r };
    for (const k of UI_ONLY_ROUTE_FIELDS) delete route[k];
    // 컨트롤러 레벨 인증 → 모든 라우트에 적용
    if (meta.auth) {
      route.auth = true;
      if (meta.roles.length > 0 && (!route.roles || route.roles.length === 0)) {
        route.roles = [...meta.roles];
      }
    }
    return route;
  });
}
async function preview(){error.value=null;if(!meta.name||!meta.basePath||meta.routes.length===0){error.value='name, basePath, routes 필요';return;} try{const r=await http.post('/api/admin/controllers/preview',{name:meta.name,basePath:meta.basePath,controllerType:meta.controllerType||'DB',serviceName:meta.serviceName||undefined,description:meta.description,auth:meta.auth,roles:meta.roles,realtime:{...meta.realtime},routes:buildRoutesForServer()});generatedCode.value=r.data.data.controllerCode;codeDirty.value=false;}catch(e){error.value=e.response?.data?.message||e.message;}}
async function save(){saving.value=true;error.value=null;try{const p={name:meta.name,basePath:meta.basePath,controllerType:meta.controllerType||'DB',serviceName:meta.serviceName||undefined,description:meta.description,auth:meta.auth,roles:meta.roles,realtime:{...meta.realtime},routes:buildRoutesForServer(),customCode:codeDirty.value?generatedCode.value:undefined};if(isEdit.value)await http.put(`/api/admin/controllers/${props.id}`,p);else await http.post('/api/admin/controllers',p);emit('saved');}catch(e){error.value=e.response?.data?.errors?.map(er=>`${er.field}: ${er.message}`).join(', ')||e.response?.data?.message||e.message;}finally{saving.value=false;}}
onMounted(async()=>{loading.value=true;try{await loadCatalog();if(isEdit.value)await loadExisting();}finally{loading.value=false;}});
watch(()=>meta.serviceName,()=>{if(!codeDirty.value&&meta.name&&meta.basePath&&meta.routes.length>0)preview();});
watch(()=>meta.basePath,()=>{ if(meta.realtime.enabled && (!meta.realtime.channel || meta.realtime.channel===suggestChannel())) meta.realtime.channel = suggestChannel(); });
onBeforeUnmount(()=>stopRtTest());
function methodBadge(m){return{get:'bg-success',post:'bg-primary',put:'bg-warning text-dark',patch:'bg-info text-dark',delete:'bg-danger'}[(m||'').toLowerCase()]||'bg-secondary';}
function routeTypeLabel(type){return routeTypes.value.find(r=>r.type===type)?.description||type;}
</script>

<template>
  <div class="app-modal-backdrop" @mousedown.self="$emit('close')">
    <div ref="modalRef" class="app-modal" style="max-width:1200px">
      <div ref="headerRef" class="modal-header"><h5 class="mb-0">{{ title }}</h5><button class="btn-close" @click="$emit('close')"></button></div>
      <div class="modal-body" style="max-height:80vh; overflow-y:auto">
        <div v-if="loading" class="text-center text-secondary py-5"><span class="spinner-border spinner-border-sm me-2"></span>{{ t('ctrl2.loading') }}</div>
        <div v-else>
          <div v-if="error" class="alert alert-danger small">{{ error }}</div>
          <div class="row g-3 mb-3">
            <div class="col-md-3"><label class="form-label small">{{ t('controller.nameLabel') }} <span class="text-danger">*</span></label><input v-model="meta.name" type="text" class="form-control form-control-sm" :disabled="isEdit" /></div>
            <div class="col-md-2"><label class="form-label small">{{ t('ctrl2.typeLabel') }}</label>
              <select v-model="meta.controllerType" class="form-select form-select-sm">
                <option value="DB">DB</option>
                <option value="DB OLD">DB OLD</option>
                <!-- 값(MCI)은 저장 형식이라 그대로 두고 보이는 말만 EAI 로 -->
                <option value="MCI">EAI</option>
                <option value="MCI OLD">{{ t('controllerEditor.k1') }}</option>
              </select>
            </div>
            <div class="col-md-4"><label class="form-label small">{{ t('controller.basePath') }} <span class="text-danger">*</span></label><input v-model="meta.basePath" type="text" class="form-control form-control-sm" :disabled="isMciType && !isEdit" /></div>
            <div class="col-md-3">
              <label class="form-label small">{{ t('controller.baseService') }}</label>
              <div class="input-group input-group-sm">
                <input v-model="meta.serviceName" type="text" class="form-control form-control-sm" :placeholder="t('controllerEditor.k24')" :disabled="isMciType && !isEdit" />
                <button class="btn btn-outline-secondary" type="button"
                        :title="t('controllerEditor.k25')"
                        @click="servicePickerOpen = true"
                        :disabled="(isMciType && !isEdit) || !serviceOptions.length">
                  <i class="bi bi-gear"></i>
                </button>
              </div>
              <ResourcePicker v-if="servicePickerOpen"
                              :title="t('controllerEditor.k25')"
                              :items="serviceOptions"
                              :selected="meta.serviceName ? [meta.serviceName] : []"
                              name-key="name"
                              desc-key="description"
                              :extra-keys="['sql_file']"
                              :multiple="false"
                              @select="(item) => { meta.serviceName = item.name; servicePickerOpen = false; }"
                              @deselect="() => { meta.serviceName = ''; }"
                              @close="servicePickerOpen = false" />
            </div>
            <div class="col-12"><label class="form-label small">{{ t('ctrl2.description') }}</label><input v-model="meta.description" type="text" class="form-control form-control-sm" :disabled="isMciType && !isEdit" /></div>
          </div>

          <!-- Phase 35 (patch-14): EAI 유형 선택 시 전용 마법사로 리다이렉트 안내.
               이 일반 editor 는 DB 컨트롤러용이며, EAI 는 엑셀 업로드 기반 별도 플로우가 필요. -->
          <div v-if="isMciType && !isEdit" class="alert alert-info d-flex align-items-start mb-3">
            <i class="bi bi-info-circle-fill me-2 fs-5"></i>
            <div class="flex-grow-1">
              <strong>{{ meta.controllerType }} 컨트롤러는 전용 마법사로 만드세요</strong>
              <div class="small mt-1">{{ t('notes.mciUseWizard') }}</div>
              <button class="btn btn-primary btn-sm mt-2" @click="goToMciWizard">
                <i class="bi bi-arrow-right"></i> {{ t('controller.mciGoto') }}
              </button>
            </div>
          </div>
          <div v-else-if="isMciType && isEdit" class="alert alert-warning d-flex align-items-start mb-3">
            <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
            <div class="flex-grow-1">
              <strong>{{ t('controller.mciNotice') }}</strong>
              <div class="small mt-1">{{ t('notes.mciEditableFields') }}</div>
            </div>
          </div>

          <!-- ★ 컨트롤러 레벨 인증 -->
          <div class="mb-3 p-2 rounded d-flex align-items-center gap-3 flex-wrap" :style="meta.auth ? 'background:#fff3cd; border:1px solid #ffc107' : 'background:#f6f7f9; border:1px solid #e0e3e7'">
            <label class="form-check form-switch mb-0">
              <input type="checkbox" class="form-check-input" v-model="meta.auth" />
              <span class="form-check-label small fw-bold"><i class="bi bi-shield-lock me-1"></i>{{ t('controller.authAll') }}</span>
            </label>
            <!-- ★ v1.16.1 — 켜기는 쉬운데 "켠 뒤 무엇을 해야 하나" 가 어디에도 없었다.
                 토큰 받는 법·헤더 붙이는 법·401/403 의 뜻을 여기서 바로 볼 수 있게 한다. -->
            <button type="button" class="btn btn-sm btn-link p-0" :title="t('controllerEditor.k26')"
                    @click="authHelpOpen = true">
              <i class="bi bi-question-circle"></i>
            </button>
            <small v-if="!meta.auth" class="text-secondary">{{ t('controller.authOff') }}</small>
            <template v-if="meta.auth">
              <small class="text-secondary">{{ t('controller.authOn') }}</small>
              <span class="text-secondary small ms-2">{{ t('ctrl2.rolesLabel') }}</span>
              <div class="d-flex flex-wrap gap-1">
                <button v-for="role in commonRoles" :key="role" class="btn btn-sm py-0 px-2"
                        :class="meta.roles.includes(role) ? 'btn-primary' : 'btn-outline-secondary'"
                        @click="meta.roles.includes(role) ? meta.roles = meta.roles.filter(x=>x!==role) : meta.roles.push(role)">
                  {{ role }}
                </button>
              </div>
              <input type="text" class="form-control form-control-sm py-0" style="width:120px" :value="meta.roles.join(', ')"
                     @input="meta.roles=$event.target.value.split(',').map(s=>s.trim()).filter(Boolean)" :placeholder="t('controllerEditor.k27')" />
            </template>
          </div>

          <!-- ★ 주입된 서비스 (@Autowired) 표시 -->
          <div v-if="injectedServiceDetails.length" class="mb-3 p-2 rounded" style="background:#f4f0ff; border:1px solid #d4c1e8">
            <small class="text-secondary fw-bold d-block mb-1"><i class="bi bi-gear me-1"></i>{{ t('controller.injected') }}</small>
            <div v-for="aw in injectedServiceDetails" :key="aw.serviceName" class="d-flex align-items-center gap-2 flex-wrap mb-1">
              <span class="badge" style="background:#6f42c1">{{ aw.serviceName }}</span>
              <small class="text-secondary">as {{ aw.propertyName }}</small>
              <span v-for="m in aw.methods" :key="m" class="badge bg-light text-dark border small">{{ m }}</span>
              <span v-for="m in aw.multiSqlMethods" :key="m.name" class="badge bg-warning text-dark border small">{{ m.name }}</span>
              <span v-if="aw.sql_file" class="badge bg-success small">SQL: {{ aw.sql_file }}</span>
            </div>
          </div>

          <!-- Phase 35 (patch-14): EAI 신규 모드에선 일반 라우트/서비스 설정을 숨김.
               EAI 컨트롤러의 라우트는 "EAI 컨트롤러 생성" 마법사가 자동으로 단일 라우트를 만들어 붙임. -->
          <template v-if="!isMciType || isEdit">
          <!-- ★ 실시간(SSE) — 체크 하나로 구독 주소 + 변경 알림을 함께 켠다 -->
          <div class="mb-3 p-2 rounded" style="background:#eef6ff; border:1px solid #b6d4fe">
            <div class="d-flex align-items-center flex-wrap gap-2">
              <div class="form-check form-switch mb-0">
                <input class="form-check-input" type="checkbox" id="rtChk"
                       :checked="meta.realtime.enabled" @change="toggleRealtime($event.target.checked)" />
                <label class="form-check-label fw-bold small" for="rtChk">
                  <i class="bi bi-broadcast me-1"></i>{{ t('controller.sse') }}
                </label>
              </div>
              <small class="text-secondary">
                {{ t('notes.sseWhatItDoes') }}
              </small>
            </div>

            <div v-if="meta.realtime.enabled" class="mt-2">
              <div class="d-flex align-items-center flex-wrap gap-2">
                <label class="form-label small mb-0 text-secondary" style="width:70px">{{ t('controller.channel') }}</label>
                <input type="text" class="form-control form-control-sm" style="width:180px"
                       v-model="meta.realtime.channel" placeholder="snacks" />
                <small class="text-secondary">
                  {{ t('controllerEditor.k2') }} <code>{{ streamPath }}</code>
                  <span class="ms-2">{{ t('ctrl2.browserLabel') }} <code>new EventSource('{{ streamPath }}')</code></span>
                </small>
                <button class="btn btn-sm btn-outline-primary ms-auto"
                        :disabled="!isEdit && !meta.realtime.enabled" @click="startRtTest">
                  <i class="bi bi-play-circle me-1"></i>{{ t('controllerEditor.k3') }}
                </button>
                <button v-if="rtTest.status === 'open' || rtTest.status === 'connecting'"
                        class="btn btn-sm btn-outline-secondary" @click="stopRtTest()">{{ t('controller.disconnect') }}</button>
              </div>

              <div v-if="rtTest.open" class="mt-2 p-2 rounded" style="background:white;border:1px solid #d7e3f5">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <span class="badge"
                        :class="{ 'bg-success': rtTest.status==='open', 'bg-secondary': rtTest.status==='closed',
                                  'bg-warning text-dark': rtTest.status==='connecting', 'bg-danger': rtTest.status==='error' }">
                    {{ { open:t('controllerEditor.k32'), closed:t('controllerEditor.k33'), connecting:t('controllerEditor.k34'), error:t('controllerEditor.k35') }[rtTest.status] }}
                  </span>
                  <small class="text-secondary">
                    {{ t('notes.sseTryIt') }}
                  </small>
                  <button class="btn btn-sm btn-link p-0 ms-auto small" @click="rtTest.logs = []">{{ t('ctrl2.clear') }}</button>
                </div>
                <div style="max-height:150px;overflow:auto;font-size:12px">
                  <div v-if="!rtTest.logs.length" class="text-secondary small">{{ t('ctrl2.nothingYet') }}</div>
                  <div v-for="(l, i) in rtTest.logs" :key="i" class="py-1 border-bottom">
                    <span class="text-secondary me-2" style="font-family:Consolas,monospace">{{ l.ts }}</span>
                    <span v-if="l.id" class="badge bg-light text-dark border me-1">id {{ l.id }}</span>
                    <span :class="{ 'text-primary fw-bold': l.kind==='change', 'text-danger': l.kind==='err',
                                    'text-success': l.kind==='ok', 'text-secondary': l.kind==='sys' }">{{ l.text }}</span>
                  </div>
                </div>
              </div>

              <div v-if="meta.auth" class="mt-2 small text-secondary">
                <i class="bi bi-info-circle me-1"></i>
                {{ t('notes.sseAuthTicket') }}
              </div>
            </div>
          </div>

          <!-- ★ v1.10.29 — 세 생성 화면이 같은 줄을 씁니다 (ScaffoldBar) -->
          <ScaffoldBar
            :label="t('scaffold.make5')"
            source="always"
            :ready-hint="t('scaffold.readyRoutes')"
            :existing="meta.routes.length"
            @generate="generate5DefaultRoutes" />

          <!-- 라우트 목록 -->
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0"><i class="bi bi-list-ul me-2"></i>{{ t('controllerEditor.k4') }} <small class="text-secondary">({{ meta.routes.length }}개)</small></h6>
            <!-- ★ v1.8.4: select → 버튼+메뉴.
                 select 는 버튼처럼 보이지 않아 "개별 추가 기능이 없다" 고 오해하기 쉬웠다.
                 서비스 편집기의 [메서드 추가] 와 같은 모양으로 맞춘다. -->
            <div class="position-relative">
              <button class="btn btn-sm btn-outline-primary" @click="showRouteAddMenu=!showRouteAddMenu">
                <i class="bi bi-plus-lg me-1"></i>{{ t('controllerEditor.k5') }}
              </button>
              <div v-if="showRouteAddMenu" class="position-absolute end-0 mt-1 bg-white border rounded shadow-sm p-2"
                   style="z-index:10; min-width:300px">
                <button v-for="t in routeAddOptions" :key="t.type"
                        class="btn btn-sm btn-outline-secondary w-100 text-start mb-1"
                        @click="addRoute(t.type)">
                  <span class="badge me-2" :class="methodBadge(t.method)">{{ String(t.method).toUpperCase() }}</span>
                  <code class="me-2">{{ t.path }}</code>
                  <small class="text-secondary">{{ t.description }}</small>
                </button>
              </div>
            </div>
          </div>

          <div v-if="meta.routes.length===0" class="text-center text-secondary small py-3 border rounded mb-3">{{ t('notes.noRoutesHint') }}</div>

          <div v-for="(r,li) in pagedRoutes" :key="li" class="mb-2 p-2 rounded"
               :style="r.type==='multiSql' ? 'background:#fffbf0;border:1px solid #ffe0a0'
                     : r.type==='sse'      ? 'background:#eef6ff;border:1px solid #b6d4fe'
                                           : 'background:#f9fafb;border:1px solid #e8eaee'">
            <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
              <span class="badge bg-secondary">{{ pageOffset+li+1 }}</span>
              <span class="badge" :class="methodBadge(r.method)">{{ (r.method||'GET').toUpperCase() }}</span>
              <code class="small">{{ r.path }}</code>
              <strong class="font-monospace small">{{ r.handlerName }}</strong>
              <small class="text-secondary">({{ routeTypeLabel(r.type) }})</small>
              <span v-for="sm in (r._serviceMethods||[])" :key="sm" class="badge small" style="background:#6f42c1">{{ sm }}</span>
              <span v-for="sq in (r._sqlQueries||[])" :key="sq" class="badge bg-success bg-opacity-75 small">{{ sq }}</span>
              <!-- ★ v1.16.1 — 라우트별 인증. 코드 생성기는 진작부터 r.auth·r.roles 를 지원했는데
                   화면에 손잡이가 없어 "코드에서 직접 붙일 수밖에 없나" 가 됐다.
                   컨트롤러 전체 스위치가 켜져 있으면 어차피 전부 걸리므로 그때는 알려만 준다. -->
              <span v-if="meta.auth" class="badge text-bg-warning small" :title="t('controllerEditor.k28')">
                <i class="bi bi-shield-lock"></i> {{ t('controllerEditor.k6') }}
              </span>
              <button v-else type="button" class="btn btn-sm"
                      :class="r.auth ? 'btn-warning' : 'btn-outline-secondary'"
                      :title="r.auth ? (r.roles?.length ? t('controllerEditor.routeRoles', { roles: r.roles.join(', ') }) : t('controllerEditor.routeAuthOn')) : t('controllerEditor.k37')"
                      @click="toggleRouteAuth(r)">
                <i class="bi" :class="r.auth ? 'bi-shield-lock-fill' : 'bi-shield'"></i>
              </button>
              <span class="flex-grow-1"></span>
              <button class="btn btn-sm" :class="r._showServices?'btn-primary':'btn-outline-secondary'" @click="r._showServices=!r._showServices;r._showSqls=false" :title="t('controllerEditor.k29')"><i class="bi bi-gear"></i></button>
              <button class="btn btn-sm" :class="r._showSqls?'btn-success':'btn-outline-secondary'" @click="r._showSqls=!r._showSqls;r._showServices=false" title="SQL"><i class="bi bi-database"></i></button>
              <button class="btn btn-sm btn-outline-secondary" @click="r.expanded=!r.expanded"><i :class="r.expanded?'bi-chevron-up':'bi-chevron-down'" class="bi"></i></button>
              <button class="btn btn-sm btn-outline-secondary" @click="moveRoute(pageOffset+li,-1)" :disabled="pageOffset+li===0"><i class="bi bi-arrow-up"></i></button>
              <button class="btn btn-sm btn-outline-secondary" @click="moveRoute(pageOffset+li,1)" :disabled="pageOffset+li===meta.routes.length-1"><i class="bi bi-arrow-down"></i></button>
              <button class="btn btn-sm btn-outline-danger" @click="removeRoute(pageOffset+li)"><i class="bi bi-x-lg"></i></button>
            </div>
            <!-- 서비스 메서드 관리 -->
            <div v-if="r._showServices" class="mt-2 p-2 rounded" style="background:#f4f0ff;border:1px solid #d4c1e8">
              <div class="d-flex align-items-center gap-2 mb-2">
                <small class="text-secondary fw-bold"><i class="bi bi-gear me-1"></i>{{ t('controllerEditor.k7') }}</small>
                <button class="btn btn-sm btn-outline-primary py-0" @click="r._svcPickerOpen=true"><i class="bi bi-search me-1"></i>{{ t('controllerEditor.k8') }}</button>
                <small class="text-secondary">({{ allServiceMethods.length }}개)</small>
              </div>
              <div v-if="!(r._serviceMethods||[]).length" class="small text-secondary fst-italic mb-1">{{ t('controllerEditor.k9') }}</div>
              <div v-for="sm in (r._serviceMethods||[])" :key="sm" class="d-flex align-items-center gap-2 mb-1">
                <span class="badge" style="background:#6f42c1"><i class="bi bi-gear me-1"></i>{{ sm }}</span>
                <button class="btn btn-sm btn-outline-danger py-0 px-1" @click="removeServiceMethodFromRoute(pageOffset+li,sm)"><i class="bi bi-x-lg" style="font-size:10px"></i></button>
              </div>
              <ResourcePicker v-if="r._svcPickerOpen" :title="t('controllerEditor.k30')" :items="allServiceMethods" :selected="r._serviceMethods||[]" name-key="name" desc-key="description" :multiple="true"
                @select="(item)=>addServiceMethodToRoute(pageOffset+li,item)" @deselect="(item)=>removeServiceMethodFromRoute(pageOffset+li,item.id)" @close="r._svcPickerOpen=false" />
            </div>
            <!-- SQL 쿼리 관리 -->
            <div v-if="r._showSqls" class="mt-2 p-2 rounded" style="background:#f0fff4;border:1px solid #c3e6cb">
              <div class="d-flex align-items-center gap-2 mb-2">
                <small class="text-secondary fw-bold"><i class="bi bi-database me-1"></i>{{ t('controllerEditor.k10') }}</small>
                <button class="btn btn-sm btn-outline-success py-0" @click="r._sqlPickerOpen=true"><i class="bi bi-search me-1"></i>{{ t('controllerEditor.k8') }}</button>
                <small class="text-secondary">({{ allSqlQueries.length }}개)</small>
              </div>
              <div v-if="!(r._sqlQueries||[]).length" class="small text-secondary fst-italic mb-1">{{ t('controllerEditor.k9') }}</div>
              <div v-for="sq in (r._sqlQueries||[])" :key="sq" class="d-flex align-items-center gap-2 mb-1">
                <span class="badge bg-success"><i class="bi bi-database me-1"></i>{{ sq }}</span>
                <button class="btn btn-sm btn-outline-danger py-0 px-1" @click="removeSqlQueryFromRoute(pageOffset+li,sq)"><i class="bi bi-x-lg" style="font-size:10px"></i></button>
              </div>
              <ResourcePicker v-if="r._sqlPickerOpen" :title="t('controllerEditor.k31')" :items="allSqlQueries" :selected="r._sqlQueries||[]" name-key="name" desc-key="description" :multiple="true"
                @select="(item)=>addSqlQueryToRoute(pageOffset+li,item)" @deselect="(item)=>removeSqlQueryFromRoute(pageOffset+li,item.id)" @close="r._sqlPickerOpen=false" />
            </div>
            <!-- 펼침 -->
            <div v-if="r.expanded" class="mt-2 p-2 rounded" style="background:white;border:1px solid #e0e3e7">
              <!-- ★ v1.16.1 — 이 라우트만의 인증·역할 -->
              <div v-if="!meta.auth" class="d-flex align-items-center gap-2 mb-2 flex-wrap p-2 rounded"
                   :style="r.auth ? 'background:#fff8e6;border:1px solid #ffd571' : 'background:#f8f9fb;border:1px solid #e6e9ee'">
                <label class="form-check form-switch mb-0">
                  <input type="checkbox" class="form-check-input" :checked="!!r.auth" @change="toggleRouteAuth(r)" />
                  <span class="form-check-label small fw-semibold">
                    <i class="bi bi-shield-lock me-1"></i>{{ t('controllerEditor.k11') }}
                  </span>
                </label>
                <template v-if="r.auth">
                  <span class="text-secondary small ms-1">{{ t('controllerEditor.k12') }}</span>
                  <div class="d-flex flex-wrap gap-1">
                    <button v-for="role in commonRoles" :key="'rr'+role" type="button" class="btn btn-sm py-0 px-2"
                            :class="(r.roles||[]).includes(role) ? 'btn-primary' : 'btn-outline-secondary'"
                            @click="r.roles = (r.roles||[]).includes(role)
                              ? r.roles.filter(x => x !== role) : [...(r.roles||[]), role]">{{ role }}</button>
                  </div>
                  <small class="text-secondary">{{ t('controllerEditor.k13') }} <code>@Auth()</code> {{ t('controllerEditor.k14') }} <code>@Roles(...)</code> {{ t('controllerEditor.k15') }}</small>
                </template>
                <small v-else class="text-secondary">{{ t('controllerEditor.k16') }}</small>
                <button type="button" class="btn btn-sm btn-link p-0 ms-auto" :title="t('controllerEditor.k26')"
                        @click="authHelpOpen = true"><i class="bi bi-question-circle"></i></button>
              </div>
              <div class="d-flex gap-2 mb-2 align-items-center">
                <select class="form-select form-select-sm" style="width:200px" v-model="r.type" @change="onTypeChange(pageOffset+li)"><option v-for="t in routeTypes" :key="t.type" :value="t.type">{{ t.description }}</option></select>
                <select class="form-select form-select-sm" style="width:90px" v-model="r.method"><option value="get">GET</option><option value="post">POST</option><option value="put">PUT</option><option value="patch">PATCH</option><option value="delete">DELETE</option></select>
                <input type="text" class="form-control form-control-sm" style="width:150px" v-model="r.path" />
                <input type="text" class="form-control form-control-sm flex-grow-1" v-model="r.handlerName" />
              </div>
              <div class="d-flex align-items-center gap-3 small">
                <label class="form-check mb-0"><input type="checkbox" class="form-check-input me-1" :checked="!!r.auth" @change="r.auth=$event.target.checked;if(!r.auth)r.roles=[]" /><i class="bi bi-shield-lock me-1"></i>{{ t('controllerEditor.k17') }}</label>
                <div v-if="r.auth" class="d-flex align-items-center gap-2">
                  <span class="small">{{ t('controllerEditor.k18') }}</span>
                  <div class="d-flex flex-wrap gap-1">
                    <button v-for="role in commonRoles" :key="role" class="btn btn-sm py-0 px-2"
                            :class="(r.roles||[]).includes(role) ? 'btn-primary' : 'btn-outline-secondary'"
                            @click="(r.roles||[]).includes(role) ? r.roles = r.roles.filter(x=>x!==role) : (r.roles = [...(r.roles||[]), role])">
                      {{ role }}
                    </button>
                  </div>
                  <input type="text" class="form-control form-control-sm py-0" style="width:150px" :value="(r.roles||[]).join(', ')"
                         @input="r.roles=$event.target.value.split(',').map(s=>s.trim()).filter(Boolean)" :placeholder="t('controllerEditor.k27')" />
                </div>
              </div>
              <div v-if="r.type==='multiSql'" class="mt-2 pt-2" style="border-top:1px dashed #ffd080">
                <SqlStepsEditor :model-value="{sqlSteps:r.sqlSteps||[],useTransaction:r.useTransaction??false,returnExpr:r.returnExpr??''}" :sql-options="sqlOptions" @update:model-value="patchMultiSql(pageOffset+li,$event)" />
              </div>
            </div>
          </div>
          <div v-if="totalRoutePages>1" class="mb-3"><Pagination v-model:page="routePage" :total-pages="totalRoutePages" :window-size="10" /></div>

          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0"><i class="bi bi-code-slash me-2"></i>{{ t('controllerEditor.k19') }} <small v-if="codeDirty" class="text-warning ms-2">{{ t('controllerEditor.k20') }}</small></h6>
            <button class="btn btn-sm btn-outline-secondary" @click="preview"><i class="bi bi-magic me-1"></i>{{ t('controllerEditor.k21') }}</button>
          </div>
          <div style="max-height:400px;overflow-y:auto;border:1px solid #e0e3e7;border-radius:4px"><CodeEditor v-model="generatedCode" @update:modelValue="onCodeChange" /></div>
          </template>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-outline-secondary" @click="$emit('close')" :disabled="saving">{{ t('controllerEditor.k22') }}</button>
        <!-- Phase 35 (patch-14): EAI 신규 모드에선 t('controllerEditor.k38') 버튼 대신 마법사 이동 버튼만 노출. -->
        <button v-if="isMciType && !isEdit" class="btn btn-sm btn-primary" @click="goToMciWizard">
          <i class="bi bi-arrow-right me-1"></i>{{ t('controllerEditor.k23') }}
        </button>
        <button v-else class="btn btn-sm btn-primary" @click="save" :disabled="loading||saving"><span v-if="saving" class="spinner-border spinner-border-sm me-2"></span><i v-else class="bi bi-save me-1"></i>{{ isEdit?t('controllerEditor.k39'):t('controllerEditor.k40') }}</button>
      </div>
    </div>
  </div>

  <AuthHelpDialog v-if="authHelpOpen" :enabled="!!meta.auth" @close="authHelpOpen = false" />
</template>
