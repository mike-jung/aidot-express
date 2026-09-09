const k=[{id:"stat",labelKey:"sch_stat",descKey:"sch_stat_d",category:"data",icon:"stat",allowedSources:["storeCompute","storeState","customVar","endpoint"],defaultConfig:{format:"number",color:"primary"}},{id:"list",labelKey:"sch_list",descKey:"sch_list_d",category:"data",icon:"list",allowedSources:["endpoint","storeState","customVar"],rowClickable:!0,defaultConfig:{maxRows:5,columns:null}},{id:"listPaged",labelKey:"sch_listPaged",descKey:"sch_listPaged_d",category:"data",icon:"list-paged",allowedSources:["endpoint"],rowClickable:!0,defaultConfig:{perPage:10,columns:null}},{id:"detail",labelKey:"sch_detail",descKey:"sch_detail_d",category:"data",icon:"detail",allowedSources:["storeState","customVar","endpoint"],defaultConfig:{fields:null}},{id:"text",labelKey:"sch_text",descKey:"sch_text_d",category:"data",icon:"text",allowedSources:["storeState","storeCompute","customVar"],defaultConfig:{format:"auto"}},{id:"markdown",labelKey:"sch_markdown",descKey:"sch_markdown_d",category:"data",icon:"markdown",allowedSources:[],defaultConfig:{body:""}},{id:"chart",labelKey:"sch_chart",descKey:"sch_chart_d",category:"viz",icon:"chart",allowedSources:["endpoint","storeState","customVar"],defaultConfig:{chartType:"bar"},fallbackKind:"list"},{id:"progress",labelKey:"sch_progress",descKey:"sch_progress_d",category:"viz",icon:"progress",allowedSources:["storeState","storeCompute","customVar"],defaultConfig:{max:100},fallbackKind:"stat"},{id:"timeline",labelKey:"sch_timeline",descKey:"sch_timeline_d",category:"viz",icon:"timeline",allowedSources:["endpoint","storeState","customVar"],rowClickable:!0,defaultConfig:{},fallbackKind:"list"},{id:"form",labelKey:"sch_form",descKey:"sch_form_d",category:"action",icon:"form",allowedSources:["endpoint"],defaultConfig:{fields:[]},fallbackKind:"detail"},{id:"queryForm",labelKey:"sch_queryForm",descKey:"sch_queryForm_d",category:"action",icon:"form-query",allowedSources:["endpoint"],defaultConfig:{fields:[],submitLabel:"조회",targetWidgetId:null}},{id:"formDialog",labelKey:"sch_formDialog",descKey:"sch_formDialog_d",category:"action",icon:"form-dialog",allowedSources:["endpoint"],defaultConfig:{buttonLabel:"실행",buttonVariant:"primary",dialogTitle:"",fields:[],confirmBeforeSubmit:!1,refreshTargetWidgetId:null}},{id:"button",labelKey:"sch_button",descKey:"sch_button_d",category:"action",icon:"button",allowedSources:["endpoint"],defaultConfig:{label:"버튼",variant:"primary"},fallbackKind:"markdown",rowClickable:!0},{id:"search",labelKey:"sch_search",descKey:"sch_search_d",category:"action",icon:"search",allowedSources:[],defaultConfig:{placeholder:"검색어 입력…"},fallbackKind:"text"},{id:"image",labelKey:"sch_image",descKey:"sch_image_d",category:"media",icon:"image",allowedSources:["storeState","customVar"],defaultConfig:{alt:""},fallbackKind:"markdown"}];function b(e){return k.find(t=>t.id===e)||null}const w=[{id:"page-title",labelKey:"sch_page_title",descKey:"sch_page_title_d"},{id:"crumbs",labelKey:"sch_crumbs",descKey:"sch_crumbs_d"},{id:"stat-hero",labelKey:"sch_stat_hero",descKey:"sch_stat_hero_d"},{id:"tabs",labelKey:"sch_tabs",descKey:"sch_tabs_d"},{id:"none",labelKey:"sch_none",descKey:"sch_none_d"}];function N(e){return w.find(t=>t.id===e)||w[0]}let h=Date.now();function c(e="id"){return h++,`${e}_${h.toString(36)}`}function y(e){const t=[],o=new Set,a=/(?:^|\/)(?::([A-Za-z_][A-Za-z0-9_]*)(\?)?|\{([A-Za-z_][A-Za-z0-9_]*)\})/g;let r;for(;(r=a.exec(String(e||"")))!==null;){const s=r[1]||r[3];!s||o.has(s)||(o.add(s),t.push({name:s,required:!r[2]}))}return t}function _(e){return Array.isArray(e==null?void 0:e.params)&&e.params.length?e.params:y(e==null?void 0:e.path)}function C({title:e="새 화면",path:t="/screen"}={}){return{id:c("composite"),kind:"composite",title:e,path:t,header:{kind:"page-title",title:e,subtitle:""},rows:[],params:y(t),customVars:[],customFns:[]}}function P({action:e="none",target:t="",params:o={}}={}){return{action:e,target:t,params:{...o}}}const T=[{id:"none",labelKey:"sch_none",descKey:"sch_none_d"},{id:"navigate",labelKey:"sch_navigate",descKey:"sch_navigate_d"}];function S(e){var t;return!!((t=b(e))!=null&&t.rowClickable)}function K(e){const t=/^row\.([\w$]+)$/.exec(String(e||""));return t?t[1]:null}function W(e,{title:t,path:o}={}){const a=C({title:t,path:o});switch(a.screenKind=e,e){case"list":a.rows.push(m("list",{title:t||"목록"}));break;case"detail":{const r=f({kind:"detail"});r.title=t?t+" 결과":"상세";const s=f({kind:"queryForm"});s.title=t?t+" 조회":"조회",s.config={fields:[{name:"id",label:"ID",type:"number",required:!0,default:""}],submitLabel:"조회",targetWidgetId:r.id},a.rows.push({id:c("row"),widths:[12],widgets:[s],style:{...p}}),a.rows.push({id:c("row"),widths:[12],widgets:[r],style:{...p}});break}case"form-new":{const r=f({kind:"formDialog"});r.title=t||"신규 등록",r.config={buttonLabel:"+ 신규 등록",buttonVariant:"success",dialogTitle:t||"신규 등록",fields:[],confirmBeforeSubmit:!1,refreshTargetWidgetId:null},a.rows.push({id:c("row"),widths:[12],widgets:[r],style:{...p}});break}case"form-edit":{const r=f({kind:"formDialog"});r.title=t||"수정",r.config={buttonLabel:"수정",buttonVariant:"primary",dialogTitle:t||"수정",fields:[],confirmBeforeSubmit:!1,refreshTargetWidgetId:null};const s=f({kind:"formDialog"});s.title="삭제",s.config={buttonLabel:"삭제",buttonVariant:"danger",dialogTitle:"삭제 확인",fields:[{name:"id",label:"ID",type:"number",required:!0,default:""}],confirmBeforeSubmit:!0,refreshTargetWidgetId:null};const l=f({kind:"detail"});l.title=t?t+" — 현재 값":"현재 값",a.rows.push({id:c("row"),widths:[12],widgets:[l],style:{...p}}),a.rows.push({id:c("row"),widths:[6,6],widgets:[r,s],style:{...p}});break}case"dashboard":a.rows.push(v([3,3,3,3],[{kind:"stat",title:"지표 1",config:{color:"primary"}},{kind:"stat",title:"지표 2",config:{color:"success"}},{kind:"stat",title:"지표 3",config:{color:"warning"}},{kind:"stat",title:"지표 4",config:{color:"danger"}}])),a.rows.push(v([8,4],[{kind:"chart",title:"추이"},{kind:"list",title:"최근"}]));break;case"kanban":a.rows.push(v([4,4,4],[{kind:"list",title:"To Do"},{kind:"list",title:"In Progress"},{kind:"list",title:"Done"}]));break;case"calendar":a.rows.push(m("markdown",{title:"캘린더",config:{body:`# 월별 일정

캘린더 widget 은 Phase 24 확장 예정. 현재는 placeholder.`}}));break;case"chart":a.rows.push(v([4,4,4],[{kind:"stat",title:"총계"},{kind:"stat",title:"평균"},{kind:"stat",title:"최대"}])),a.rows.push(m("chart",{title:"분포"}));break;case"report":a.rows.push(m("markdown",{title:"리포트 제목",config:{body:"리포트 개요 / 요약문…"}})),a.rows.push(m("list",{title:"상세 내역"}));break;case"empty":break;default:console.warn(`[compositeSchema] createCompositeSpecForKind: unknown kind "${e}", falling back to empty composite. Expected one of: list | detail | form-new | form-edit | dashboard | kanban | calendar | chart | report | empty`);break}return a}function m(e,{title:t="",config:o={}}={}){const a={id:c("row"),widths:[12],widgets:[f({kind:e})],style:{...p}};return t&&(a.widgets[0].title=t),o&&(a.widgets[0].config={...a.widgets[0].config,...o}),a}function v(e,t){if(e.length!==t.length)throw new Error("widths 와 widgetSpecs 길이 불일치");const o=t.map(a=>{const r=f({kind:a.kind});return a.title&&(r.title=a.title),a.config&&(r.config={...r.config,...a.config}),r});return{id:c("row"),widths:[...e],widgets:o,style:{...p}}}function q({widths:e=[12],widgets:t=null}={}){if(!R(e))throw new Error(`Row widths 는 합이 12 여야 합니다; 받은 값 [${e.join(",")}]`);let o;if(Array.isArray(t)){if(t.length!==e.length)throw new Error(`Row 의 widgets 개수 (${t.length}) 와 widths 개수 (${e.length}) 가 일치해야 합니다.`);o=t}else o=e.map(()=>f({kind:"text"}));return{id:c("row"),widths:[...e],widgets:o,style:{...p}}}const p=Object.freeze({gap:16,padding:0,bgColor:"transparent"});function E(e){return e&&(e.style={...p,...e.style||{}},e)}function f({kind:e="text"}={}){const t=b(e)||b("text");return{id:c("wdg"),kind:t.id,title:"",source:null,config:{...t.defaultConfig},style:{...x},...t.rowClickable?{onRowClick:P()}:{}}}const x=Object.freeze({height:"auto",padding:16,border:!0,shadow:"none",bgColor:"#ffffff"}),D=[{id:"none",label:"없음"},{id:"sm",label:"약함"},{id:"md",label:"중간"}];function A(e){return e&&(e.style={...x,...e.style||{}},e)}const z=[{labelKey:"rp_1",widths:[12]},{labelKey:"rp_2eq",widths:[6,6]},{labelKey:"rp_3eq",widths:[4,4,4]},{label:"2:1",widths:[8,4]},{label:"1:2",widths:[4,8]},{label:"1:2:1",widths:[3,6,3]},{labelKey:"rp_4eq",widths:[3,3,3,3]}];function R(e){if(!Array.isArray(e)||e.length===0||e.length>6)return!1;for(const t of e)if(!Number.isInteger(t)||t<1||t>12)return!1;return e.reduce((t,o)=>t+o,0)===12}function j(e,t=null){const o=[...e];if(o.length>=6)return o;let a=t??Math.max(1,Math.floor(12/(o.length+1)));const r=o.reduce((i,d)=>i+Math.max(0,d-1),0);if(a=Math.min(a,r,12-o.length),a<1)return o;let s=a;const l=o.map((i,d)=>({w:i,i:d})).sort((i,d)=>d.w-i.w);let n=0;for(;s>0;){const i=l[n%l.length];if(o[i.i]>1&&(o[i.i]--,s--),n++,n>1e3)break}return o.push(a),o}function V(e,t){if(e.length<=1)return e;const o=e[t],a=e.filter((l,n)=>n!==t);let r=o,s=Math.min(t,a.length-1);for(;r>0;)a[s%a.length]++,r--,s++;return a}function O(e,t,o){const a=[...e],r=a[t];return a[t]=a[o],a[o]=r,a}function I(e){const t=(e==null?void 0:e.config)||{},o=t.columns||t.fields||t.keys,a=Array.isArray(o)?o.map(r=>typeof r=="string"?r:(r==null?void 0:r.key)||(r==null?void 0:r.name)).filter(Boolean):[];return[...new Set(["id",...a])]}function L(e){var n;const t=[];if(!e)return t;const a=(e.rows||[]).flatMap(i=>i.widgets||[]);if(!a.length)return t;const r=/:[A-Za-z_]\w*/.test(String(e.path||"")),s=new Set(["detail","form","formDialog","queryForm"]);a.some(i=>s.has(i.kind))&&!r&&t.push({level:"warn",message:"이 화면은 항목 하나를 다루는데 경로에 :id 같은 파라미터가 없습니다. 목록에서 값을 넘길 통로가 없어 빈 화면이 됩니다."});for(const i of a){if(!i.source){t.push({level:"warn",widgetId:i.id,message:`'${i.title||i.kind}' 에 데이터 소스가 없습니다. 카드의 [데이터 소스] 딱지를 눌러 API 를 고르세요.`});continue}["queryForm","formDialog","form"].includes(i.kind)&&((Array.isArray((n=i.config)==null?void 0:n.fields)?i.config.fields:[]).filter(g=>(g==null?void 0:g.name)&&g.name!=="id").length||t.push({level:"warn",widgetId:i.id,message:`'${i.title||i.kind}' 에 입력란이 없습니다. [데이터 소스] 딱지를 눌러 API 를 다시 고르면 입력란을 다시 분석합니다. 그래도 비어 있으면 그 API 가 받는 입력이 없거나, 서비스에서 SQL 을 따라가지 못한 경우입니다.`}))}return t}function F(e,t=[],o=null){var s;const a=e==null?void 0:e.onRowClick,r=[];if(!a||a.action==="none")return r;if(!S(e.kind))return r.push({level:"warn",message:`'${e.kind}' 위젯에는 행이 없어 클릭 설정이 동작하지 않습니다. 지워도 됩니다.`}),r;if(a.action==="navigate"){if(!a.target)return r.push({level:"error",message:"이동할 화면을 고르세요."}),r;if(o&&a.target===o)return r.push({level:"error",message:"자기 자신으로 이동하면 무한 루프가 됩니다."}),r;const l=t.find(i=>i.id===a.target);if(!l)return r.push({level:"error",message:`이동할 화면을 찾을 수 없습니다 (${a.target}). 화면이 지워졌을 수 있습니다.`}),r;for(const i of _(l)){if(!i.required)continue;((s=a.params)==null?void 0:s[i.name])||r.push({level:"error",message:`'${l.title||l.id}' 화면이 요구하는 '${i.name}' 이(가) 비어 있습니다.`})}const n=I(e);for(const[i,d]of Object.entries(a.params||{})){if(!d)continue;const u=K(d);u?n.length&&!n.includes(u)&&r.push({level:"warn",message:`'${i}' ← row.${u} — 이 위젯의 열 목록에 '${u}' 가 없습니다. 오타가 아닌지 확인하세요.`}):r.push({level:"error",message:`'${i}' 의 값 '${d}' 은 row.필드 형식이어야 합니다.`})}}return r}const M=`
// ============================ 공용 유틸 ============================

// envelope 벗김: { code, message, data } → data
function unwrapEnvelope(body) {
  if (body && typeof body === 'object' && 'code' in body && 'data' in body) return body.data;
  return body;
}

// resultKey 적용 — 우선순위: 명시된 resultKey > rows > data > items > 배열 자체
function resolveRows(data, resultKey) {
  if (data == null) return { rows: [], total: 0, page: 1, perPage: 20, totalPages: 1 };
  if (resultKey && typeof data === 'object' && Array.isArray(data[resultKey])) {
    return pack(data, data[resultKey]);
  }
  if (Array.isArray(data)) return pack(null, data);
  if (Array.isArray(data.rows)) return pack(data, data.rows);
  if (Array.isArray(data.data)) return pack(data, data.data);
  if (Array.isArray(data.items)) return pack(data, data.items);
  return pack(data, []);
}
function pack(meta, rows) {
  return {
    rows,
    total: (meta && meta.total) || rows.length,
    page: (meta && meta.page) || 1,
    perPage: (meta && meta.perPage) || rows.length || 20,
    totalPages: (meta && meta.totalPages) || 1,
  };
}

// 셀 포매터: object/array/date/boolean/null 안전하게
function formatCell(value) {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? '✓' : '—';
  if (value instanceof Date) return value.toLocaleString('ko-KR');
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return '[object]'; }
  }
  if (typeof value === 'string' && /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}/.test(value)) {
    // ISO timestamp
    return value.slice(0, 19).replace('T', ' ');
  }
  return String(value);
}

// fetch helper — same-origin cookie, envelope unwrap 포함.
//
// Phase 31 (patch-10): row-level 입력 파라미터 지원.
//  path 에 '{paramName}' 템플릿이 있으면 rowContext.params 에서 값을 꺼내 치환.
//  값이 없는 placeholder 가 하나라도 남아있으면 fetch 를 건너뛰고 INPUT_PENDING 신호를 던짐.
//  ':param' 형식 (기존) 은 하위 호환으로 계속 지원 (queryParams 에서만 꺼냄).
const INPUT_PENDING = Symbol('awaiting-input');
/* ★ v1.11.7 — 화면 이동으로 넘어온 파라미터. 전체 앱 미리보기에서 목록의 행을 누르면
   { id: 3 } 처럼 채워지고 version 이 오른다. 위젯은 이것을 지켜보다 다시 읽는다.
   (예전에는 넘어온 값을 보관만 하고 아무 위젯도 쓰지 않아 상세 화면이 비어 있었다) */
const __previewNav = reactive({ params: {}, version: 0 });
window.__previewNav = __previewNav;
function resolveParam(name, rowContext, queryParams) {
  const fromRow = rowContext && rowContext.params ? rowContext.params[name] : null;
  if (fromRow != null && fromRow !== '') return fromRow;
  const fromNav = __previewNav.params ? __previewNav.params[name] : null;
  if (fromNav != null && fromNav !== '') return fromNav;
  const fromQuery = queryParams ? queryParams[name] : null;
  if (fromQuery != null && fromQuery !== '') return fromQuery;
  return null;
}
async function fetchEndpoint(endpoint, queryParams, rowContext) {
  const method = (endpoint.method || 'GET').toUpperCase();
  let url = endpoint.path;
  const init = {
    method,
    credentials: 'same-origin',
    headers: { 'Accept': 'application/json' },
  };
  // 토큰이 있으면 붙인다 — 인증이 걸린 API 도 미리보기에서 열리게 (부모가 넣어 준다)
  if (window.__previewToken) init.headers['Authorization'] = 'Bearer ' + window.__previewToken;
  // {paramName} · :paramName — 행 컨텍스트 → 화면 이동 파라미터 → 입력값 순으로 채운다
  let missing = false;
  url = url.replace(/\\{([a-zA-Z_][a-zA-Z0-9_]*)\\}/g, (_, name) => {
    const v = resolveParam(name, rowContext, queryParams);
    if (v == null) { missing = true; return '{' + name + '}'; }
    return encodeURIComponent(String(v));
  });
  url = url.replace(/\\/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
    const v = resolveParam(name, rowContext, queryParams);
    if (v == null) { missing = true; return '/:' + name; }
    return '/' + encodeURIComponent(String(v));
  });
  if (missing) {
    const e = new Error('waiting for input parameters');
    e.code = INPUT_PENDING;
    throw e;
  }

  // GET 이면 path 에 안 쓰인 queryParams 를 URL 쿼리로
  if (method === 'GET' && queryParams) {
    const qp = new URLSearchParams();
    for (const [k, v] of Object.entries(queryParams)) {
      if (endpoint.path.includes(':' + k) || endpoint.path.includes('{' + k + '}')) continue;
      if (v != null && v !== '') qp.set(k, v);
    }
    const qs = qp.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  } else if (queryParams) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(queryParams);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; }
  catch { body = text; }
  if (!res.ok) {
    const msg = (body && (body.message || body.error)) || 'HTTP ' + res.status;
    throw new Error(msg);
  }
  return unwrapEnvelope(body);
}

// row-level 공유 state 를 widget 들이 쓰도록 provide/inject 로 연결.
// rowContext = { params: reactive({}), setParams(obj), refreshTokens: reactive({<widgetId>: 0}), bumpRefresh(widgetId) }
const ROW_CONTEXT_KEY = Symbol('rowContext');
function createRowContext() {
  const params = reactive({});
  const refreshTokens = reactive({});
  return {
    params,
    setParams(obj) {
      Object.assign(params, obj || {});
    },
    refreshTokens,
    bumpRefresh(widgetId) {
      // null 이면 전체, 아니면 지정 widget 만
      if (widgetId == null) {
        for (const k of Object.keys(refreshTokens)) refreshTokens[k] = (refreshTokens[k] || 0) + 1;
      } else {
        refreshTokens[widgetId] = (refreshTokens[widgetId] || 0) + 1;
      }
    },
  };
}
function useRowContext() {
  return (typeof inject === 'function' ? inject(ROW_CONTEXT_KEY, null) : null);
}

// ============================ StatWidget ============================
const StatWidget = {
  props: ['label', 'value', 'format', 'color', 'endpoint', 'resultKey', 'widgetId'],
  setup(props) {
    const fetchedValue = ref(null);
    const loading = ref(false);
    const error = ref('');
    const awaitingInput = ref(false);
    const rowCtx = useRowContext();

    async function load() {
      if (!props.endpoint || !props.endpoint.path) return;
      loading.value = true;
      error.value = '';
      awaitingInput.value = false;
      try {
        const data = await fetchEndpoint(props.endpoint, {}, rowCtx);
        let v = data;
        if (props.resultKey && data && typeof data === 'object') {
          v = data[props.resultKey];
        }
        if (Array.isArray(v)) {
          fetchedValue.value = v.length;
        } else if (v && typeof v === 'object') {
          const keys = Object.keys(v);
          const preferred = keys.find((k) => /count|total|sum|avg|length/i.test(k) && typeof v[k] === 'number');
          const anyNum = keys.find((k) => typeof v[k] === 'number');
          const key = preferred || anyNum;
          fetchedValue.value = key ? v[key] : null;
        } else {
          fetchedValue.value = v;
        }
      } catch (e) {
        if (e.code === INPUT_PENDING) { awaitingInput.value = true; fetchedValue.value = null; }
        else error.value = e.message || String(e);
      } finally {
        loading.value = false;
      }
    }

    const effectiveValue = computed(() => props.endpoint ? fetchedValue.value : props.value);

    const displayValue = computed(() => {
      const v = effectiveValue.value;
      if (loading.value) return '…';
      if (error.value) return '!';
      if (v == null) return '—';
      // object 면 summary
      if (typeof v === 'object') {
        try { return Object.keys(v).length + ' fields'; } catch { return '[object]'; }
      }
      switch (props.format) {
        case 'currency': return '₩' + Number(v).toLocaleString('ko-KR');
        case 'percent':  return (Number(v) * 100).toFixed(1) + '%';
        case 'number':   return Number(v).toLocaleString('ko-KR');
        case 'raw':
        default:         return String(v);
      }
    });

    onMounted(load);
    watch(() => __previewNav.version, load);   // ★ v1.11.7 화면 이동 파라미터가 바뀌면 다시 읽는다
    if (rowCtx) {
      watch(() => JSON.stringify(rowCtx.params), load);
      watch(() => rowCtx.refreshTokens[props.widgetId], (v) => { if (v) load(); });
    }

    return { displayValue, error, awaitingInput };
  },
  template: \`<div class="card stat-widget" :class="'stat-' + (color || 'primary')">
    <div class="card-body">
      <div class="stat-label">{{ label }}</div>
      <div class="stat-value">{{ awaitingInput ? '…' : displayValue }}</div>
      <div v-if="error" class="stat-error" :title="error">{{ error }}</div>
    </div>
  </div>\`,
};

// ============================ ListWidget ============================
const ListWidget = {
  // ★ v1.9.1 — rowClickable: 화면 디자이너의 '눌렀을 때 → 화면 이동' 설정이 켜지면 true
  props: ['title', 'endpoint', 'resultKey', 'columns', 'maxRows', 'paginated', 'rows', 'loading', 'error', 'widgetId', 'rowClickable'],
  emits: ['row-click'],
  setup(props) {
    const rowsRef = ref(Array.isArray(props.rows) ? props.rows : []);
    const total = ref(rowsRef.value.length);
    const page = ref(1);
    const perPage = ref(Number(props.maxRows) || 20);
    const totalPages = ref(1);
    const loadingRef = ref(!!props.loading);
    const errorRef = ref(props.error || '');
    const awaitingInput = ref(false);
    const rowCtx = useRowContext();

    async function load(p) {
      if (!props.endpoint || !props.endpoint.path) return;
      loadingRef.value = true;
      errorRef.value = '';
      awaitingInput.value = false;
      try {
        const qp = {};
        if (props.paginated) {
          qp.page = p || page.value;
          qp.perPage = perPage.value;
        }
        const data = await fetchEndpoint(props.endpoint, qp, rowCtx);
        const packed = resolveRows(data, props.resultKey);
        rowsRef.value = packed.rows;
        total.value = packed.total;
        page.value = packed.page;
        perPage.value = packed.perPage;
        totalPages.value = packed.totalPages;
      } catch (e) {
        if (e.code === INPUT_PENDING) {
          awaitingInput.value = true;
          rowsRef.value = [];
        } else {
          errorRef.value = e.message || String(e);
          rowsRef.value = [];
        }
      } finally {
        loadingRef.value = false;
      }
    }

    const effectiveColumns = computed(() => {
      if (props.columns && props.columns.length) return props.columns;
      const first = rowsRef.value[0];
      if (!first || typeof first !== 'object') return [];
      return Object.keys(first).slice(0, 8).map((k) => ({ name: k, label: k }));
    });

    const displayRows = computed(() => {
      if (props.paginated) return rowsRef.value;
      return rowsRef.value.slice(0, Number(props.maxRows) || 20);
    });

    const hasPrev = computed(() => page.value > 1);
    const hasNext = computed(() => page.value < totalPages.value);

    // endpoint 있으면 load, 없으면 props.rows 를 그대로
    if (props.endpoint && props.endpoint.path) {
      onMounted(() => load(1));
      if (rowCtx) {
        watch(() => JSON.stringify(rowCtx.params), () => load(1));
        watch(() => rowCtx.refreshTokens[props.widgetId], (v) => { if (v) load(1); });
        watch(() => __previewNav.version, () => load(1));   // ★ v1.11.7
      }
    }

    return {
      rows: rowsRef, total, page, perPage, totalPages,
      loading: loadingRef, error: errorRef, awaitingInput,
      effectiveColumns, displayRows, hasPrev, hasNext,
      formatCell,
      reload: () => load(page.value),
      goPage: (p) => load(p),
    };
  },
  template: \`<div class="card list-widget">
    <div class="card-header d-flex align-items-center">
      <h3 class="card-title mb-0">{{ title }}</h3>
      <span v-if="total > 0" class="badge badge-light-primary ms-2">{{ total }}</span>
      <button class="btn-refresh" @click="reload()" title="Refresh">⟳</button>
    </div>
    <div class="card-body">
      <div v-if="awaitingInput" class="text-muted py-4 text-center">
        <i class="bi bi-cursor"></i> Fill in the form above.
      </div>
      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      <div class="table-responsive">
        <table class="table table-row-dashed align-middle mb-0">
          <thead>
            <tr class="text-start text-muted fw-bold text-uppercase fs-7">
              <th v-for="c in effectiveColumns" :key="c.name">{{ c.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="effectiveColumns.length || 1" class="text-center text-muted py-4">불러오는 중…</td>
            </tr>
            <tr v-else-if="!displayRows.length && !awaitingInput">
              <td :colspan="effectiveColumns.length || 1" class="text-center text-muted py-4">표시할 항목이 없습니다.</td>
            </tr>
            <tr v-else v-for="(row, i) in displayRows" :key="row.id != null ? row.id : i"
                :class="{ 'rt-clickable': rowClickable }"
                :tabindex="rowClickable ? 0 : undefined"
                :role="rowClickable ? 'button' : undefined"
                @click="rowClickable && $emit('row-click', row)"
                @keyup.enter="rowClickable && $emit('row-click', row)">
              <td v-for="c in effectiveColumns" :key="c.name">{{ formatCell(row[c.name]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="paginated && totalPages > 1" class="pager">
        <button :disabled="!hasPrev" @click="goPage(page - 1)">◀ Prev</button>
        <span class="pager-info">{{ page }} / {{ totalPages }}</span>
        <button :disabled="!hasNext" @click="goPage(page + 1)">Next ▶</button>
      </div>
    </div>
  </div>\`,
};

// ============================ DetailWidget ============================
const DetailWidget = {
  props: ['title', 'endpoint', 'resultKey', 'fields', 'widgetId'],
  setup(props) {
    const record = ref(null);
    const loading = ref(false);
    const error = ref('');
    const awaitingInput = ref(false);
    const rowCtx = useRowContext();

    async function load() {
      if (!props.endpoint || !props.endpoint.path) return;
      loading.value = true;
      error.value = '';
      awaitingInput.value = false;
      try {
        const data = await fetchEndpoint(props.endpoint, {}, rowCtx);
        let r = data;
        if (props.resultKey && data && typeof data === 'object') {
          r = data[props.resultKey];
        }
        if (Array.isArray(r)) r = r[0];
        record.value = r;
      } catch (e) {
        if (e.code === INPUT_PENDING) {
          awaitingInput.value = true;
          record.value = null;
        } else {
          error.value = e.message || String(e);
        }
      } finally {
        loading.value = false;
      }
    }

    const effectiveFields = computed(() => {
      if (props.fields && props.fields.length) return props.fields;
      const r = record.value;
      if (!r || typeof r !== 'object') return [];
      return Object.keys(r).slice(0, 20).map((k) => ({ name: k, label: k }));
    });

    onMounted(load);
    watch(() => __previewNav.version, load);   // ★ v1.11.7 화면 이동 파라미터(행 클릭 → 상세)가 바뀌면 다시 읽는다
    // rowContext 의 params 나 이 widget 의 refresh 토큰이 바뀌면 재로드
    if (rowCtx) {
      watch(() => JSON.stringify(rowCtx.params), load);
      watch(() => rowCtx.refreshTokens[props.widgetId], (v) => { if (v) load(); });
    }

    return { record, loading, error, awaitingInput, effectiveFields, formatCell };
  },
  template: \`<div class="card detail-widget">
    <div class="card-header"><h3 class="card-title mb-0">{{ title }}</h3></div>
    <div class="card-body">
      <div v-if="loading" class="text-muted py-4 text-center">불러오는 중…</div>
      <div v-else-if="awaitingInput" class="text-muted py-4 text-center">
        <i class="bi bi-cursor"></i> Fill in the form above.
      </div>
      <div v-else-if="error" class="alert alert-danger mb-0">{{ error }}</div>
      <div v-else-if="!record" class="text-muted py-4 text-center">데이터 없음.</div>
      <dl v-else class="detail-list">
        <template v-for="f in effectiveFields" :key="f.name">
          <dt>{{ f.label }}</dt>
          <dd>{{ formatCell(record[f.name]) }}</dd>
        </template>
      </dl>
    </div>
  </div>\`,
};

// ============================ TextWidget ============================
const TextWidget = {
  props: ['label', 'value', 'format', 'endpoint', 'resultKey'],
  setup(props) {
    const fetchedValue = ref(null);
    const loading = ref(false);
    const error = ref('');

    async function load() {
      if (!props.endpoint || !props.endpoint.path) return;
      loading.value = true;
      error.value = '';
      try {
        const data = await fetchEndpoint(props.endpoint, {});
        let v = data;
        if (props.resultKey && data && typeof data === 'object') v = data[props.resultKey];
        fetchedValue.value = v;
      } catch (e) {
        error.value = e.message || String(e);
      } finally {
        loading.value = false;
      }
    }

    const effectiveValue = computed(() => props.endpoint ? fetchedValue.value : props.value);

    const displayValue = computed(() => {
      if (loading.value) return '…';
      if (error.value) return '⚠ ' + error.value;
      const v = effectiveValue.value;
      if (v == null) return '—';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    });

    onMounted(load);
    watch(() => __previewNav.version, load);   // ★ v1.11.7
    return { displayValue };
  },
  template: \`<div class="card text-widget">
    <div class="card-body">
      <div v-if="label" class="text-label">{{ label }}</div>
      <div class="text-value">{{ displayValue }}</div>
    </div>
  </div>\`,
};

// ============================ MarkdownWidget ============================
const MarkdownWidget = {
  props: ['body'],
  template: \`<div class="card markdown-widget">
    <div class="card-body"><pre class="md-body">{{ body }}</pre></div>
  </div>\`,
};

// ============================ ListPagedWidget ============================
// Phase 9: full pagination 형태 (맨앞 / 이전 / 1~10 / 다음 / 맨뒤)
const ListPagedWidget = {
  props: ['title', 'endpoint', 'resultKey', 'perPage', 'columns'],
  setup(props) {
    const rows = ref([]);
    const total = ref(0);
    const page = ref(1);
    const effectivePerPage = ref(Number(props.perPage) || 10);
    const totalPages = ref(1);
    const loading = ref(false);
    const error = ref('');

    async function load(p) {
      if (!props.endpoint || !props.endpoint.path) return;
      loading.value = true;
      error.value = '';
      try {
        const qp = {
          page: p || page.value,
          perPage: effectivePerPage.value,
        };
        const data = await fetchEndpoint(props.endpoint, qp);
        const packed = resolveRows(data, props.resultKey);
        rows.value = packed.rows;
        total.value = packed.total;
        page.value = packed.page;
        effectivePerPage.value = packed.perPage;
        totalPages.value = packed.totalPages;
      } catch (e) {
        error.value = e.message || String(e);
        rows.value = [];
      } finally {
        loading.value = false;
      }
    }

    const effectiveColumns = computed(() => {
      if (props.columns && props.columns.length) return props.columns;
      const first = rows.value[0];
      if (!first || typeof first !== 'object') return [];
      return Object.keys(first).slice(0, 8).map((k) => ({ name: k, label: k }));
    });

    // Phase 10: 1페이지여도 [1] 반환 (UI 에서 항상 페이저 표시)
    const pageWindow = computed(() => {
      const tp = Math.max(1, totalPages.value);
      const windowSize = 10;
      const curr = page.value;
      let start = Math.max(1, curr - Math.floor(windowSize / 2));
      let end = start + windowSize - 1;
      if (end > tp) {
        end = tp;
        start = Math.max(1, end - windowSize + 1);
      }
      const arr = [];
      for (let i = start; i <= end; i++) arr.push(i);
      return arr;
    });

    const hasPrev = computed(() => page.value > 1);
    const hasNext = computed(() => page.value < totalPages.value);

    onMounted(() => load(1));
    watch(() => __previewNav.version, () => load(1));   // ★ v1.11.7

    return {
      rows, total, page, effectivePerPage, totalPages, loading, error,
      effectiveColumns, hasPrev, hasNext, pageWindow,
      formatCell,
      reload: () => load(page.value),
      goPage: (p) => {
        if (p < 1 || p > totalPages.value || p === page.value) return;
        load(p);
      },
      goFirst: () => load(1),
      goLast: () => load(totalPages.value),
      goPrev: () => { if (page.value > 1) load(page.value - 1); },
      goNext: () => { if (page.value < totalPages.value) load(page.value + 1); },
    };
  },
  template: \`<div class="card list-widget list-paged-widget">
    <div class="card-header d-flex align-items-center">
      <h3 class="card-title mb-0">{{ title }}</h3>
      <span v-if="total > 0" class="badge badge-light-primary ms-2">{{ total }}</span>
      <span v-if="totalPages > 1" class="badge badge-light-primary ms-1">
        {{ page }} / {{ totalPages }}
      </span>
      <button class="btn-refresh" @click="reload()" title="Refresh">⟳</button>
    </div>
    <div class="card-body">
      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      <div class="table-responsive">
        <table class="table table-row-dashed align-middle mb-0">
          <thead>
            <tr class="text-start text-muted fw-bold text-uppercase fs-7">
              <th v-for="c in effectiveColumns" :key="c.name">{{ c.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="effectiveColumns.length || 1" class="text-center text-muted py-4">불러오는 중…</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td :colspan="effectiveColumns.length || 1" class="text-center text-muted py-4">표시할 항목이 없습니다.</td>
            </tr>
            <tr v-else v-for="(row, i) in rows" :key="row.id != null ? row.id : i">
              <td v-for="c in effectiveColumns" :key="c.name">{{ formatCell(row[c.name]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Phase 10: 1페이지여도 항상 표시 -->
      <nav class="pager pager-full">
        <button :disabled="!hasPrev" @click="goFirst()" title="맨앞">«</button>
        <button :disabled="!hasPrev" @click="goPrev()" title="이전">‹</button>
        <button v-for="p in pageWindow" :key="p"
                :class="{ active: p === page }"
                @click="goPage(p)">{{ p }}</button>
        <button :disabled="!hasNext" @click="goNext()" title="다음">›</button>
        <button :disabled="!hasNext" @click="goLast()" title="맨뒤">»</button>
      </nav>
    </div>
  </div>\`,
};

// ============================ RowContext ============================
// Phase 31 (patch-10): 각 row 를 감싸는 provider component.
//  rowContext (params + refreshTokens) 를 같은 row 내 자식 widget 들에게 inject.
const RowContext = {
  props: ['rowClass', 'rowStyle'],
  setup(props, { slots }) {
    const ctx = createRowContext();
    provide(ROW_CONTEXT_KEY, ctx);
    return () => h('div', {
      class: props.rowClass || 'row',
      style: props.rowStyle || '',
    }, slots.default ? slots.default() : []);
  },
};

// ============================ QueryFormWidget ============================
// Phase 31 (patch-10): 입력값을 rowContext.params 에 넣고 "조회" 버튼으로
//   같은 row 의 target widget 을 트리거. endpoint path 의 {paramName} 템플릿이
//   이 값들로 치환됨.
//
//   config.fields: [{ name, label, type, required, default, placeholder }]
//   config.submitLabel: 버튼 텍스트 (default: '조회')
//   config.targetWidgetId: 조회 성공 후 bumpRefresh 할 widget. null 이면 전체.
const QueryFormWidget = {
  props: ['title', 'fields', 'submitLabel', 'targetWidgetId', 'endpointHint'],
  setup(props) {
    const rowCtx = useRowContext();
    // 각 필드의 현재 입력값 ref
    const values = reactive({});
    // 기본값 초기 세팅
    for (const f of (props.fields || [])) {
      values[f.name] = f.default != null ? f.default : '';
    }
    const localError = ref('');

    function onSubmit() {
      localError.value = '';
      // 필수 필드 검사
      for (const f of (props.fields || [])) {
        if (f.required && (values[f.name] == null || values[f.name] === '')) {
          localError.value = f.label + ' 값을 입력하세요.';
          return;
        }
      }
      if (!rowCtx) return;
      // type 변환
      const out = {};
      for (const f of (props.fields || [])) {
        let v = values[f.name];
        if (v === '' || v == null) continue;
        if (f.type === 'number') v = Number(v);
        if (f.type === 'boolean') v = v === true || v === 'true';
        out[f.name] = v;
      }
      rowCtx.setParams(out);
      rowCtx.bumpRefresh(props.targetWidgetId || null);
    }
    /* ★ v1.11.7 — 화면 이동으로 값이 넘어오면(목록 행 클릭 → 상세 id) 입력칸을 채우고 바로 조회한다.
       예전에는 "받은 값: id=13" 만 보이고 사용자가 다시 쳐야 했다. */
    function applyNav() {
      const np = __previewNav.params || {};
      let hit = false;
      for (const f of (props.fields || [])) {
        if (np[f.name] != null && np[f.name] !== '') { values[f.name] = np[f.name]; hit = true; }
      }
      if (hit) onSubmit();
    }
    onMounted(applyNav);
    watch(() => __previewNav.version, applyNav);

    return { values, onSubmit, localError };
  },
  template: \`<div class="card query-form-widget">
    <div class="card-header" v-if="title">
      <h3 class="card-title mb-0">{{ title }}</h3>
      <code v-if="endpointHint" class="qf-endpoint-hint">{{ endpointHint }}</code>
    </div>
    <div class="card-body">
      <div class="query-form-fields">
        <div v-for="f in (fields || [])" :key="f.name" class="qf-field">
          <label class="qf-label">
            <code class="qf-field-name">{{ f.label }}</code>
            <span v-if="f.required" style="color:#dc2626">*</span>
          </label>
          <input v-if="f.type === 'number'" type="number"
                 v-model.number="values[f.name]" :placeholder="f.placeholder || ''"
                 class="form-control form-control-sm"
                 @keyup.enter="onSubmit" />
          <select v-else-if="f.type === 'boolean'" v-model="values[f.name]" class="form-select form-select-sm">
            <option :value="true">true</option>
            <option :value="false">false</option>
          </select>
          <input v-else type="text"
                 v-model="values[f.name]" :placeholder="f.placeholder || ''"
                 class="form-control form-control-sm"
                 @keyup.enter="onSubmit" />
        </div>
        <button class="btn btn-primary btn-sm qf-submit" @click="onSubmit">
          {{ submitLabel || '조회' }}
        </button>
      </div>
      <div v-if="localError" class="alert alert-warning py-1 px-2 mt-2 mb-0" style="font-size:12px">
        {{ localError }}
      </div>
    </div>
  </div>\`,
};

// ============================ FormDialogWidget ============================
// Phase 31 (patch-10): 버튼 + 모달 다이얼로그 + 폼. 주로 create/update/delete 용.
//
//   config.buttonLabel:    버튼 텍스트 (default: '실행')
//   config.buttonVariant:  'primary' | 'success' | 'danger' | ...
//   config.dialogTitle:    모달 제목
//   config.fields:         [{ name, label, type, required, default }]
//   config.confirmBeforeSubmit: true 면 제출 전 confirm()
//   config.refreshTargetWidgetId: 성공 후 bumpRefresh 할 widget (목록 등)
//   endpoint:              실제 호출 대상 (method POST/PUT/DELETE + path)
const FormDialogWidget = {
  props: [
    'title', 'endpoint', 'buttonLabel', 'buttonVariant',
    'dialogTitle', 'fields', 'confirmBeforeSubmit', 'refreshTargetWidgetId',
  ],
  setup(props) {
    const rowCtx = useRowContext();
    const open = ref(false);
    const values = reactive({});
    const submitting = ref(false);
    const error = ref('');
    const success = ref('');

    function reset() {
      for (const f of (props.fields || [])) {
        values[f.name] = f.default != null ? f.default : '';
      }
      error.value = '';
      success.value = '';
    }

    function openDialog() {
      reset();
      open.value = true;
    }
    function closeDialog() {
      open.value = false;
    }

    async function submit() {
      error.value = '';
      for (const f of (props.fields || [])) {
        if (f.required && (values[f.name] == null || values[f.name] === '')) {
          error.value = f.label + ' 값을 입력하세요.';
          return;
        }
      }
      if (props.confirmBeforeSubmit && !confirm('계속 진행할까요?')) return;
      if (!props.endpoint || !props.endpoint.path) {
        error.value = 'endpoint 가 설정되지 않았습니다.';
        return;
      }
      submitting.value = true;
      try {
        const body = {};
        for (const f of (props.fields || [])) {
          let v = values[f.name];
          if (v === '' || v == null) continue;
          if (f.type === 'number') v = Number(v);
          if (f.type === 'boolean') v = v === true || v === 'true';
          body[f.name] = v;
        }
        await fetchEndpoint(props.endpoint, body, rowCtx);
        success.value = '완료되었습니다.';
        // 성공 후 target widget refresh (보통 목록)
        if (rowCtx) rowCtx.bumpRefresh(props.refreshTargetWidgetId || null);
        // 짧은 딜레이 후 닫기
        setTimeout(() => { open.value = false; }, 600);
      } catch (e) {
        error.value = e.message || String(e);
      } finally {
        submitting.value = false;
      }
    }

    return { open, values, submitting, error, success, openDialog, closeDialog, submit };
  },
  template: \`<div class="form-dialog-widget">
    <button :class="['btn', 'btn-' + (buttonVariant || 'primary')]" @click="openDialog">
      {{ buttonLabel || '실행' }}
    </button>
    <div v-if="open" class="fd-backdrop" @click.self="closeDialog">
      <div class="fd-modal">
        <div class="fd-header">
          <h5 class="mb-0">{{ dialogTitle || buttonLabel || '' }}</h5>
          <button class="fd-close" @click="closeDialog">&times;</button>
        </div>
        <div class="fd-body">
          <div v-for="f in (fields || [])" :key="f.name" class="fd-field">
            <label class="fd-label">{{ f.label }} <span v-if="f.required" style="color:#dc2626">*</span></label>
            <input v-if="f.type === 'number'" type="number"
                   v-model.number="values[f.name]" :placeholder="f.placeholder || ''"
                   class="form-control form-control-sm" />
            <select v-else-if="f.type === 'boolean'" v-model="values[f.name]" class="form-select form-select-sm">
              <option :value="true">true</option>
              <option :value="false">false</option>
            </select>
            <textarea v-else-if="f.type === 'text'" v-model="values[f.name]" rows="3"
                      class="form-control form-control-sm" :placeholder="f.placeholder || ''"></textarea>
            <input v-else type="text"
                   v-model="values[f.name]" :placeholder="f.placeholder || ''"
                   class="form-control form-control-sm" />
          </div>
          <div v-if="error" class="alert alert-danger py-1 px-2 mt-2 mb-0" style="font-size:12px">{{ error }}</div>
          <div v-if="success" class="alert alert-success py-1 px-2 mt-2 mb-0" style="font-size:12px">{{ success }}</div>
        </div>
        <div class="fd-footer">
          <button class="btn btn-sm btn-outline-secondary" @click="closeDialog" :disabled="submitting">취소</button>
          <button :class="['btn', 'btn-sm', 'btn-' + (buttonVariant || 'primary')]"
                  @click="submit" :disabled="submitting">
            <span v-if="submitting">…</span>
            <span v-else>{{ buttonLabel || '실행' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>\`,
};

// ============================ WIDGETS ============================
const WIDGETS = { StatWidget, ListWidget, ListPagedWidget, DetailWidget, TextWidget, MarkdownWidget, QueryFormWidget, FormDialogWidget, RowContext };
`,$=`
/* ---- 공용 그리드 ---- */
.composite-view .row {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.composite-view [class^="col-md-"] {
  flex-shrink: 0;
  padding: 0 6px;
  min-width: 0;
  display: flex;
}
.composite-view [class^="col-md-"] > * { flex: 1; min-width: 0; }
.composite-view .col-md-1  { flex: 0 0 8.333%;  max-width: 8.333%; }
.composite-view .col-md-2  { flex: 0 0 16.667%; max-width: 16.667%; }
.composite-view .col-md-3  { flex: 0 0 25%;     max-width: 25%; }
.composite-view .col-md-4  { flex: 0 0 33.333%; max-width: 33.333%; }
.composite-view .col-md-5  { flex: 0 0 41.667%; max-width: 41.667%; }
.composite-view .col-md-6  { flex: 0 0 50%;     max-width: 50%; }
.composite-view .col-md-7  { flex: 0 0 58.333%; max-width: 58.333%; }
.composite-view .col-md-8  { flex: 0 0 66.667%; max-width: 66.667%; }
.composite-view .col-md-9  { flex: 0 0 75%;     max-width: 75%; }
.composite-view .col-md-10 { flex: 0 0 83.333%; max-width: 83.333%; }
.composite-view .col-md-11 { flex: 0 0 91.667%; max-width: 91.667%; }
.composite-view .col-md-12 { flex: 0 0 100%;    max-width: 100%; }
@media (max-width: 768px) {
  .composite-view .row > [class^="col-"] { flex: 0 0 100%; max-width: 100%; }
}

/* ---- card ---- */
.card {
  background: #fff; border: 1px solid #e4e6ef; border-radius: 8px;
  overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 16px;
}
.card-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e4e6ef;
  display: flex;
  align-items: center;
}
.card-body { padding: 14px 16px; }
.card-title {
  font-size: 13.5px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
  flex: 1;
}

/* ---- table ---- */
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 6px 8px; text-align: left; font-size: 12px; }
.table-row-dashed tr { border-bottom: 1px dashed #e4e6ef; }
.table-row-dashed tr:last-child { border-bottom: none; }
.table th {
  background: #f8fafc;
  font-weight: 600;
  color: #64748b;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.fw-bold { font-weight: 600; }
.text-muted { color: #6b7280; }
.text-uppercase { text-transform: uppercase; }
.text-start { text-align: left; }
.text-center { text-align: center; }
.fs-7 { font-size: 11px; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.mb-0 { margin-bottom: 0; }
.ms-2 { margin-left: 0.5rem; }

.alert {
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 12px;
}
.alert-danger {
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.4;
}
.badge-light-primary {
  background: #dbeafe;
  color: #1d4ed8;
}

/* ---- stat ---- */
.stat-widget .card-body { padding: 16px 20px; }
.stat-widget .stat-label {
  font-size: 11px; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px;
}
.stat-widget .stat-value { font-size: 26px; font-weight: 700; color: #0f172a; }
.stat-primary .stat-value { color: #1d4ed8; }
.stat-success .stat-value { color: #059669; }
.stat-warning .stat-value { color: #b45309; }
.stat-danger .stat-value { color: #b91c1c; }

/* ---- detail ---- */
.detail-list {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 6px 12px;
  margin: 0;
  font-size: 12px;
}
.detail-list dt { color: #64748b; font-weight: 500; }
.detail-list dd { margin: 0; color: #0f172a; word-break: break-all; }

/* ---- text widget ---- */
.text-widget .card-body { padding: 12px 16px; }
.text-widget .text-label {
  font-size: 11px; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 2px;
}
.text-widget .text-value { font-size: 15px; color: #0f172a; font-weight: 500; }

/* ---- markdown ---- */
.markdown-widget .md-body {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  color: #1f2937;
  line-height: 1.6;
}

/* ---- refresh button ---- */
.btn-refresh {
  background: none;
  border: 1px solid #e4e6ef;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  padding: 0;
  cursor: pointer;
  color: #64748b;
  font-size: 12px;
}
.btn-refresh:hover { background: #f8fafc; color: #0f172a; }

/* ---- pager ---- */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 0 4px;
  margin-top: 8px;
  border-top: 1px solid #f1f5f9;
}
.pager button {
  background: #fff;
  border: 1px solid #e4e6ef;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #1f2937;
}
.pager button:hover:not(:disabled) { background: #f8fafc; }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }
.pager-info { font-size: 12px; color: #64748b; }

/* Phase 9: full pagination */
.pager-full { gap: 4px; flex-wrap: wrap; }
.pager-full button {
  min-width: 28px;
  padding: 3px 8px;
}
.pager-full button.active {
  background: #0d6efd;
  color: #fff;
  border-color: #0d6efd;
  font-weight: 600;
}

/* ---- QueryFormWidget ---- */
.query-form-widget .card-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.qf-endpoint-hint {
  font-size: 11px;
  padding: 2px 6px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 3px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  margin-left: auto;
}
.query-form-widget .card-body { padding: 12px 16px; }
.query-form-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
}
.qf-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1 1 140px;
  min-width: 100px;
}
.qf-label {
  font-size: 11px;
  font-weight: 600;
  color: #334155;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 3px;
}
.qf-field-name {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 11px;
  background: #eff6ff;
  color: #1e40af;
  padding: 1px 5px;
  border-radius: 3px;
}
.qf-submit {
  flex-shrink: 0;
  align-self: flex-end;
  min-width: 72px;
}

/* ---- FormDialogWidget ---- */
.form-dialog-widget { display: inline-block; }
.fd-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.fd-modal {
  background: #fff;
  border-radius: 8px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}
.fd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #e5e7eb;
}
.fd-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  line-height: 1;
}
.fd-body {
  padding: 14px 18px;
  overflow-y: auto;
}
.fd-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.fd-label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  margin: 0;
}
.fd-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid #e5e7eb;
}
`;export{p as D,w as H,z as R,D as S,$ as W,C as a,f as b,W as c,q as d,M as e,k as f,N as g,x as h,b as i,T as j,_ as k,S as l,P as m,E as n,A as o,y as p,j as q,I as r,V as s,O as t,R as u,F as v,L as w};
