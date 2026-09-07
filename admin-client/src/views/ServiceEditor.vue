<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
// ★ v1.10.22 — 다국어
import { useI18n } from '../composables/useI18n';

import ScaffoldBar from '../components/ScaffoldBar.vue';
import http from '../api/http';
import CodeEditor from '../components/CodeEditor.vue';
import SqlStepsEditor from '../components/SqlStepsEditor.vue';
import Pagination from '../components/Pagination.vue';
import ResourcePicker from '../components/ResourcePicker.vue';
import { useDraggable } from '../composables/useDraggable';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

const { modalRef, headerRef } = useDraggable();

const props = defineProps({ id: { type: String, default: null } });
const emit = defineEmits(['close', 'saved']);
const isEdit = computed(() => props.id != null);
const title = computed(() => isEdit.value ? 'Service 수정' : '신규 Service');

const meta = reactive({ name: '', sqlFile: '', description: '' });
const methods = ref([]);
const sqlOptions = ref([]);
const methodCatalog = ref([]);
const generatedCode = ref('');
const codeDirty = ref(false);
const loading = ref(false);
const saving = ref(false);
const error = ref(null);

// Option B (patch-16): 소스에서 파싱된 메서드별 SQL 쿼리 이름 ({ methodName: 'queryName', ... }).
//  사이드카 메타에 sqlQueryName 매핑이 없을 때 표시 일관성 보강용. loadExisting 에서 채움.
const methodSqlMap = ref({});

// 표준 메서드 타입별 기본 SQL 쿼리 이름 — codeGenerator.SERVICE_METHOD_TEMPLATES 와 동기화.
//  서버 catalog 가 defaultSqlQueryName 를 노출하므로 그 값을 우선 사용, 미노출 시 아래 fallback.
// 서버 카탈로그(codeGenerator.SERVICE_METHOD_TEMPLATES)와 같은 값 — 카탈로그를 못 받았을 때만 쓰는 대비책
const DEFAULT_SQL_QUERY = { list:'findAll', listPaged:'findAll', getById:'findById', create:'insert', update:'update', remove:'deleteById' };
function defaultSqlQueryFor(methodType) {
  const c = methodCatalog.value.find((x) => x.method === methodType);
  return c?.defaultSqlQueryName || DEFAULT_SQL_QUERY[methodType] || methodType;
}

const injectedSqlQueries = computed(() => {
  if (!meta.sqlFile) return [];
  return sqlOptions.value.find(s => s.name === meta.sqlFile)?.queries || [];
});

/**
 * ★ v1.8.2 — SQL 파일을 고르면 그 안의 쿼리를 모두 덮도록 메서드를 자동 보강한다.
 *
 *  이전 동작: 신규 대화상자가 `['list','getById','create']` 3개를 하드코딩으로 심고,
 *  SQL 파일을 선택해도 watch 가 preview() 만 다시 부를 뿐 메서드 목록은 손대지 않았다.
 *  그래서 5개짜리 SQL 파일을 골라도 `updateName`·`deleteById` 는 **아예 만들어지지 않았다**
 *  (표시가 빠진 게 아니다 — 목록 페이지네이션은 5개/쪽이라 5개였다면 한 화면에 다 보인다).
 *
 *  사용자가 **직접 지운 메서드는 되살리지 않는다.** 지운 것이 다시 나타나면
 *  그것대로 못 쓰는 화면이 된다.
 */
const removedMethodTypes = ref(new Set());   // 사용자가 손으로 지운 표준 메서드 타입

/** 쿼리 이름 → 그 쿼리를 기본값으로 쓰는 표준 메서드 타입 (defaultSqlQueryFor 의 역방향) */
function methodTypeForQuery(queryName) {
  const cands = methodCatalog.value.length
    ? methodCatalog.value.map((c) => c.method)
    : Object.keys(DEFAULT_SQL_QUERY);
  // list 와 listPaged 는 둘 다 findAll 을 쓴다 — 먼저 선언된 list 를 택한다
  return cands.find((mt) => defaultSqlQueryFor(mt) === queryName) || null;
}

/**
 * 선택한 SQL 파일의 쿼리 중, 아직 어떤 메서드도 담당하지 않는 것을 메서드로 추가한다.
 * @returns {string[]} 새로 추가된 메서드 타입
 */
function fillMethodsFromSqlFile() {
  const queries = injectedSqlQueries.value;
  if (!queries.length) return [];

  // 이미 담당된 쿼리 (명시 지정 우선, 없으면 그 메서드의 기본 쿼리)
  const covered = new Set(
    methods.value
      .filter((m) => m.type === 'standard')
      .map((m) => m.sqlQueryName || defaultSqlQueryFor(m.methodType)),
  );

  const added = [];
  for (const q of queries) {
    if (covered.has(q)) continue;
    const mt = methodTypeForQuery(q);
    if (!mt) continue;                             // 표준 메서드로 표현할 수 없는 쿼리는 건너뛴다
    if (removedMethodTypes.value.has(mt)) continue; // 사용자가 지운 것은 되살리지 않는다
    if (methods.value.some((m) => m.type === 'standard' && m.methodType === mt)) continue;

    const cat = methodCatalog.value.find((c) => c.method === mt);
    methods.value.push({
      type: 'standard', methodType: mt, name: mt,
      description: cat?.description || '', sqlQueryName: '',
      expanded: false, _showSqls: false, _sqlPickerOpen: false,
    });
    covered.add(q);
    added.push(mt);
  }
  return added;
}

/** 표준 메서드로 표현할 수 없어 건너뛴 쿼리 — 화면에서 안내한다 */
const unmappedQueries = computed(() => {
  if (!meta.sqlFile) return [];
  const covered = new Set(
    methods.value.filter((m) => m.type === 'standard')
      .map((m) => m.sqlQueryName || defaultSqlQueryFor(m.methodType)),
  );
  return injectedSqlQueries.value.filter((q) => !covered.has(q));
});

// ▶ '기본 SQL 파일' 필드용 파일 선택 대화상자 상태
const sqlFilePickerOpen = ref(false);

const methodPage = ref(1);
const METHODS_PER_PAGE = 5;
const totalMethodPages = computed(() => Math.max(1, Math.ceil(methods.value.length / METHODS_PER_PAGE)));
const pagedMethods = computed(() => { const s=(methodPage.value-1)*METHODS_PER_PAGE; return methods.value.slice(s, s+METHODS_PER_PAGE); });
const pageOffset = computed(() => (methodPage.value-1)*METHODS_PER_PAGE);
const showAddMenu = ref(false);
// SQL 파일 선택 시 자동 보강 결과를 알리는 한 줄 (사용자가 모르게 목록이 바뀌면 안 된다)
const notice = ref('');

function onCodeChange(v) { generatedCode.value = v; codeDirty.value = true; }

const allSqlQueries = computed(() => {
  const out = [];
  for (const sql of sqlOptions.value) for (const q of (sql.queries || [])) out.push({ id: `${sql.name}.${q}`, name: `${sql.name}.${q}`, sqlFile: sql.name, queryName: q, description: sql.table_name || sql.name });
  return out;
});


function getMethodSqlQueries(m) {
  if (m.type === 'standard') {
    if (!meta.sqlFile) return [];
    // 우선순위: 메서드별 명시적 sqlQueryName > 소스 파싱 결과 > 템플릿 default > methodType 자체
    const queryName = m.sqlQueryName
      || methodSqlMap.value?.[m.methodType]
      || defaultSqlQueryFor(m.methodType);
    return [{ sqlFile: meta.sqlFile, queryName, id: `${meta.sqlFile}.${queryName}` }];
  }
  return (m.sqlSteps || []).filter(st => st.sqlFile && st.queryName).map(st => ({ sqlFile: st.sqlFile, queryName: st.queryName, id: `${st.sqlFile}.${st.queryName}` }));
}
function addSqlQueryToMethod(gi, item) {
  const m = methods.value[gi];
  if (m.type === 'standard') {
    // Option B: standard 메서드도 SQL 파일 + 쿼리 이름을 함께 지정 가능.
    //  파일이 비어있으면 채우고, 이미 다른 파일이면 그대로 두되 쿼리만 변경.
    if (!meta.sqlFile) meta.sqlFile = item.sqlFile;
    m.sqlQueryName = item.queryName;
  }
  else { if (!m.sqlSteps) m.sqlSteps = []; m.sqlSteps.push({ varName: 'result'+(m.sqlSteps.length+1), sqlFile: item.sqlFile, queryName: item.queryName, paramMappings:{}, paramsExpr:'', rawMode:false, action:'execute' }); }
}
function removeSqlQueryFromMethod(gi, queryId) {
  const m = methods.value[gi];
  if (m.type === 'standard') m.sqlQueryName = '';  // 기본값으로 복귀 (meta.sqlFile 은 유지 — 다른 standard 메서드들이 공유)
  else if (m.sqlSteps) { const [sf,qn]=queryId.split('.'); const i=m.sqlSteps.findIndex(st=>st.sqlFile===sf&&st.queryName===qn); if(i>=0) m.sqlSteps.splice(i,1); }
}

function addStandardMethod(mt) { removedMethodTypes.value.delete(mt); const cat=methodCatalog.value.find(m=>m.method===mt); methods.value.push({type:'standard',methodType:mt,name:mt,description:cat?.description||'',sqlQueryName:'',expanded:false,_showSqls:false,_sqlPickerOpen:false}); showAddMenu.value=false; methodPage.value=totalMethodPages.value; }
function addMultiSqlMethod() { methods.value.push({type:'multiSql',name:'method'+(methods.value.length+1),description:'',sqlSteps:[],useTransaction:false,returnExpr:'',expanded:true,_showSqls:false,_sqlPickerOpen:false}); showAddMenu.value=false; methodPage.value=totalMethodPages.value; }
function removeMethod(gi) {
  // 지운 표준 메서드를 기억한다 — SQL 파일을 다시 고를 때 되살아나면 안 된다
  const m = methods.value[gi];
  if (m?.type === 'standard' && m.methodType) removedMethodTypes.value.add(m.methodType);
  methods.value.splice(gi,1);
  if(methodPage.value>totalMethodPages.value) methodPage.value=totalMethodPages.value;
}
function moveMethod(gi,dir) { const j=gi+dir; if(j<0||j>=methods.value.length) return; [methods.value[gi],methods.value[j]]=[methods.value[j],methods.value[gi]]; }
function patchMultiSql(gi,payload) { const m=methods.value[gi]; m.sqlSteps=payload.sqlSteps; m.useTransaction=payload.useTransaction; m.returnExpr=payload.returnExpr; }
const addedStandardTypes = computed(()=>new Set(methods.value.filter(m=>m.type==='standard').map(m=>m.methodType)));
function splitMethods() {
  return {
    methods: methods.value.filter(m => m.type === 'standard').map(m => {
      // Option B: sqlQueryName 가 비어있거나 default 와 같으면 string 으로 (이전 포맷 호환).
      //  사용자가 명시적으로 다른 쿼리를 지정한 경우에만 객체 형태로 전송.
      const dflt = defaultSqlQueryFor(m.methodType);
      if (m.sqlQueryName && m.sqlQueryName !== dflt) {
        return { type: m.methodType, sqlQueryName: m.sqlQueryName };
      }
      return m.methodType;
    }),
    multiSqlMethods: methods.value.filter(m => m.type === 'multiSql').map(m => ({ name:m.name, description:m.description, sqlSteps:m.sqlSteps||[], useTransaction:m.useTransaction??false, returnExpr:m.returnExpr??'' })),
  };
}
function mergeMethods(sa, ma) {
  const o = [];
  // Option B: 항목이 string 이면 default SQL 쿼리 사용. 객체이면 sqlQueryName 그대로 가져옴.
  for (const m of (sa||[])) {
    let methodType, sqlQueryName = '';
    if (typeof m === 'string') {
      methodType = m;
      // 사이드카에 매핑이 없더라도 소스 파싱 결과 (methodSqlMap) 가 default 와 다르면 그것을 우선.
      const fromSource = methodSqlMap.value?.[methodType];
      const dflt = defaultSqlQueryFor(methodType);
      if (fromSource && fromSource !== dflt) sqlQueryName = fromSource;
    } else if (m && typeof m === 'object') {
      methodType = m.type;
      sqlQueryName = m.sqlQueryName || '';
    } else {
      methodType = String(m);
    }
    const c = methodCatalog.value.find(c => c.method === methodType);
    o.push({ type:'standard', methodType, name:methodType, description:c?.description||'', sqlQueryName, expanded:false, _showSqls:false, _sqlPickerOpen:false });
  }
  for (const m of (ma||[])) o.push({ type:'multiSql', name:m.name, description:m.description||'', sqlSteps:m.sqlSteps||[], useTransaction:m.useTransaction??false, returnExpr:m.returnExpr??'', expanded:false, _showSqls:false, _sqlPickerOpen:false });
  return o;
}

async function loadCatalogs() { const [sr,mr]=await Promise.all([http.get('/api/admin/sqls/all'),http.get('/api/admin/services/method-catalog')]); sqlOptions.value=sr.data.data||sr.data||[]; methodCatalog.value=mr.data.data||mr.data||[]; }
async function loadExisting() {
  const r = await http.get(`/api/admin/services/${props.id}`);
  const d = r.data.data || r.data;
  if (!d) return;
  meta.name = d.name;
  meta.sqlFile = d.sql_file || '';
  meta.description = d.description || '';
  // Option B: 소스 파싱 SQL 매핑 — mergeMethods 에서 default 와 다른 경우 자동 반영
  methodSqlMap.value = d.method_sql_map || {};
  methods.value = mergeMethods(d.methods, d.multiSqlMethods);

  // Phase 37 (patch-16): 디스크에 저장된 실제 소스(d.source) 를 그대로 노출하여,
  //  사용자가 직접 수정한 코드가 다시 열 때도 그대로 보이고, 저장 시에도 그 소스가 유지되게 함.
  //  codeDirty=true 로 두어 save() 시 항상 customCode 가 전송되므로 자동생성으로 덮이지 않음.
  if (d.source) {
    generatedCode.value = d.source;
    codeDirty.value = true;
  } else {
    await preview();
    codeDirty.value = false;
  }
}
async function preview() { error.value=null; if(!meta.name){error.value='name 필요';return;} if(methods.value.length===0){error.value='메서드 필요';return;} const{methods:std,multiSqlMethods:multi}=splitMethods(); if(std.length>0&&!meta.sqlFile){error.value='단순 메서드용 SQL 필요';return;} try{const r=await http.post('/api/admin/services/preview',{name:meta.name,sqlFile:meta.sqlFile||undefined,description:meta.description,methods:std,multiSqlMethods:multi}); generatedCode.value=r.data.data.content; codeDirty.value=false;}catch(e){error.value=e.response?.data?.message||e.message;} }
async function save() { saving.value=true;error.value=null;try{const{methods:std,multiSqlMethods:multi}=splitMethods();const p={name:meta.name,sqlFile:meta.sqlFile||undefined,description:meta.description,methods:std,multiSqlMethods:multi,customCode:codeDirty.value?generatedCode.value:undefined};if(isEdit.value)await http.put(`/api/admin/services/${props.id}`,p);else await http.post('/api/admin/services',p);emit('saved');}catch(e){error.value=e.response?.data?.errors?.map(er=>`${er.field}: ${er.message}`).join(', ')||e.response?.data?.message||e.message;}finally{saving.value=false;} }
onMounted(async()=>{
  loading.value=true;
  try{
    await loadCatalogs();
    if(isEdit.value) await loadExisting();
    else {
      /* 신규는 **빈 목록**에서 시작한다.
         예전에는 대화상자를 열자마자 list·getById·create 세 개가 이미 들어 있었다.
         SQL 파일을 고르기도 전에 생긴 것이라 "내가 만든 것"과 구분되지 않았고,
         SQL 화면([기본 5개 만들기])·컨트롤러 화면과도 동작이 달랐다.
         이제 세 화면 모두 "고르고 → 버튼을 누르면 → 생긴다" 로 같다. */
      methods.value = [];
    }
  } finally { loading.value=false; }
});
/* ★ v1.10.29 — SQL 파일을 고르면 **자동으로** 메서드를 채우던 것을 버튼으로 바꿨다.
   SQL·컨트롤러 화면은 버튼인데 여기만 자동이라, 화면을 옮길 때마다
   "이 화면은 어떻게 동작하지" 를 다시 물어야 했다. 게다가 이미 손으로 넣어 둔
   메서드가 있을 때 무엇이 덮이는지 알 수 없었다.
   (v1.8.2 의 의도 — SQL 파일의 쿼리 수에 맞춰 채우기 — 는 그대로 살아 있다.
    다만 **사용자가 눌렀을 때** 일어난다.) */
const DEFAULT_METHOD_TYPES = ['list', 'getById', 'create', 'update', 'remove'];
function scaffoldMethods() {
  const added = fillMethodsFromSqlFile();
  /* SQL 파일의 쿼리 이름이 기본형(findAll·findById·insert·update·deleteById)과 달라도
     기본 5종은 만들어 준다 — 쿼리 이름은 각 메서드에서 고르면 된다.
     예전에는 이름이 하나라도 어긋나면 그 메서드가 통째로 빠져서 3개만 생겼다. */
  for (const mt of DEFAULT_METHOD_TYPES) {
    if (methods.value.some((m) => m.type === 'standard' && m.methodType === mt)) continue;
    if (removedMethodTypes.value.has(mt)) continue;
    const cat = methodCatalog.value.find((c) => c.method === mt);
    if (!cat && !DEFAULT_SQL_QUERY[mt]) continue;
    methods.value.push({
      type: 'standard', methodType: mt, name: mt,
      description: cat?.description || '', sqlQueryName: '',
      expanded: false, _showSqls: false, _sqlPickerOpen: false,
    });
    added.push(mt);
  }
  if (added.length) {
    notice.value = `메서드 ${added.length}개를 추가했습니다 — ${added.join(', ')}`;
    methodPage.value = 1;
  } else {
    notice.value = '추가할 메서드가 없습니다 (이미 모두 있습니다).';
  }
}
watch([()=>meta.sqlFile,()=>methods.value.length],()=>{if(!codeDirty.value&&meta.name&&methods.value.length>0)preview();});
// Option B: standard 메서드의 sqlQueryName 변경도 preview 재실행 트리거가 되도록 deep watch 추가.
//  codeDirty=true (이미 손댄 상태) 인 경우엔 사용자 수정 보존을 위해 자동 재생성하지 않음 (가드 동일).
watch(methods, () => { if (!codeDirty.value && meta.name && methods.value.length > 0) preview(); }, { deep: true });
function methodBadge(m) { if(m.type==='multiSql') return{cls:'bg-warning text-dark',label:'multiSql'}; return{cls:{list:'bg-success',listPaged:'bg-success',getById:'bg-info text-dark',create:'bg-primary',updateName:'bg-info text-dark',remove:'bg-danger'}[m.methodType]||'bg-secondary',label:m.methodType}; }
</script>

<template>
  <div class="app-modal-backdrop" @mousedown.self="$emit('close')">
    <div ref="modalRef" class="app-modal" style="max-width:1100px">
      <div ref="headerRef" class="modal-header"><h5 class="mb-0">{{ title }}</h5><button class="btn-close" @click="$emit('close')"></button></div>
      <div class="modal-body" style="max-height:80vh; overflow-y:auto">
        <div v-if="loading" class="text-center text-secondary py-5"><span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}</div>
        <div v-else>
          <div v-if="error" class="alert alert-danger small">{{ error }}</div>
          <div class="row g-3 mb-3">
            <div class="col-md-5"><label class="form-label small">{{ t('svcEd.name') }} <span class="text-danger">*</span></label><input v-model="meta.name" type="text" class="form-control form-control-sm" :disabled="isEdit" /></div>
            <div class="col-md-4">
              <label class="form-label small">{{ t('svcEd.defaultSqlFile') }}</label>
              <div class="input-group input-group-sm">
                <input v-model="meta.sqlFile" type="text" class="form-control form-control-sm" placeholder="product" />
                <button class="btn btn-outline-secondary" type="button"
                        :title="t('serviceEditor.k1')"
                        @click="sqlFilePickerOpen = true"
                        :disabled="!sqlOptions.length">
                  <i class="bi bi-database-down"></i>
                </button>
              </div>
              <ResourcePicker v-if="sqlFilePickerOpen"
                              :title="t('serviceEditor.k1')"
                              :items="sqlOptions"
                              :selected="meta.sqlFile ? [meta.sqlFile] : []"
                              name-key="name"
                              desc-key="description"
                              :extra-keys="['table_name']"
                              :multiple="false"
                              @select="(item) => { meta.sqlFile = item.name; sqlFilePickerOpen = false; }"
                              @deselect="() => { meta.sqlFile = ''; }"
                              @close="sqlFilePickerOpen = false" />
            </div>
            <div class="col-md-3"><label class="form-label small">{{ t('svcEd.description') }}</label><input v-model="meta.description" type="text" class="form-control form-control-sm" /></div>
          </div>
          <!-- ★ v1.8.2: SQL 파일 선택으로 메서드가 자동 보강되면 그 사실을 알린다.
               목록이 조용히 바뀌면 사용자가 무슨 일이 났는지 알 수 없다. -->
          <div v-if="notice" class="alert alert-info py-2 px-3 mb-2 d-flex align-items-center">
            <i class="bi bi-magic me-2"></i>
            <small class="flex-grow-1">{{ notice }}</small>
            <button type="button" class="btn-close btn-sm" @click="notice=''"></button>
          </div>
          <div v-if="meta.sqlFile && unmappedQueries.length" class="alert alert-warning py-2 px-3 mb-2">
            <small>
              <i class="bi bi-exclamation-triangle me-1"></i>
              표준 메서드로 매핑하지 못한 쿼리 {{ unmappedQueries.length }}개:
              <code>{{ unmappedQueries.join(', ') }}</code>
              — [{{ t('svcEd.addMethod') }} → multiSql] 로 직접 만들 수 있습니다.
            </small>
          </div>

          <!-- 주입된 SQL -->
          <div v-if="meta.sqlFile" class="mb-3 p-2 rounded" style="background:#f0fff4; border:1px solid #c3e6cb">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <small class="text-secondary fw-bold"><i class="bi bi-database me-1"></i>{{ t('svcEd.injectedSql') }}</small>
              <span class="badge bg-success">{{ meta.sqlFile }}.sql</span>
              <small class="text-secondary ms-2">{{ t('svcEd.queries') }}</small>
              <span v-for="q in injectedSqlQueries" :key="q"
                    class="badge border small"
                    :class="unmappedQueries.includes(q) ? 'bg-warning-subtle text-dark border-warning' : 'bg-light text-dark'"
                    :title="unmappedQueries.includes(q) ? t('serviceEditor.k5') : ''">{{ q }}</span>
              <span v-if="!injectedSqlQueries.length" class="text-secondary small fst-italic">{{ t('svcEd.noQueries') }}</span>
            </div>
          </div>
          <!-- 메서드 목록 -->
                    <!-- ★ v1.10.29 — 세 생성 화면이 같은 줄을 씁니다 (ScaffoldBar) -->
          <ScaffoldBar
            :label="t('scaffold.makeMethods')"
            :source="meta.sqlFile"
            :empty-hint="t('scaffold.needSqlFile')"
            :ready-hint="t('scaffold.readySqlFile', { name: meta.sqlFile })"
            :existing="methods.length"
            @generate="scaffoldMethods" />
<div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0"><i class="bi bi-list-ul me-2"></i>{{ t('svcEd.methodList') }} <small class="text-secondary">({{ methods.length }}개)</small></h6>
            <div class="position-relative">
              <button class="btn btn-sm btn-outline-primary" @click="showAddMenu=!showAddMenu"><i class="bi bi-plus-lg me-1"></i>{{ t('svcEd.addMethod') }}</button>
              <div v-if="showAddMenu" class="position-absolute end-0 mt-1 bg-white border rounded shadow-sm p-2" style="z-index:10; min-width:280px">
                <button v-for="c in methodCatalog" :key="c.method" class="btn btn-sm btn-outline-secondary w-100 text-start mb-1" :disabled="addedStandardTypes.has(c.method)" @click="addStandardMethod(c.method)"><code class="me-2">{{ c.method }}</code><small class="text-secondary">{{ c.description }}</small></button>
                <hr class="my-2"><button class="btn btn-sm btn-outline-warning w-100 text-start" @click="addMultiSqlMethod"><i class="bi bi-diagram-2 me-1"></i>{{ t('svcEd.multiSqlMethod') }}</button>
              </div>
            </div>
          </div>

          <div v-for="(m,li) in pagedMethods" :key="li+'-'+m.name" class="mb-2 p-2 rounded" :style="m.type==='multiSql'?'background:#fffbf0;border:1px solid #ffe0a0':'background:#f9fafb;border:1px solid #e8eaee'">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-secondary">{{ pageOffset+li+1 }}</span>
              <span class="badge" :class="methodBadge(m).cls">{{ methodBadge(m).label }}</span>
              <input v-if="m.type==='multiSql'" type="text" class="form-control form-control-sm font-monospace" style="width:180px" v-model="m.name" />
              <strong v-else class="font-monospace small">{{ m.name }}</strong>
              <span v-for="sq in getMethodSqlQueries(m)" :key="sq.id" class="badge bg-success bg-opacity-75 small">{{ sq.id }}</span>
              <small class="text-secondary flex-grow-1">{{ m.description }}</small>
              <button class="btn btn-sm" :class="m._showSqls?'btn-success':'btn-outline-secondary'" @click="m._showSqls=!m._showSqls" :title="t('serviceEditor.k2')"><i class="bi bi-database"></i></button>
              <button class="btn btn-sm btn-outline-secondary" @click="m.expanded=!m.expanded"><i :class="m.expanded?'bi-chevron-up':'bi-chevron-down'" class="bi"></i></button>
              <button class="btn btn-sm btn-outline-secondary" @click="moveMethod(pageOffset+li,-1)" :disabled="pageOffset+li===0"><i class="bi bi-arrow-up"></i></button>
              <button class="btn btn-sm btn-outline-secondary" @click="moveMethod(pageOffset+li,1)" :disabled="pageOffset+li===methods.length-1"><i class="bi bi-arrow-down"></i></button>
              <button class="btn btn-sm btn-outline-danger" @click="removeMethod(pageOffset+li)"><i class="bi bi-x-lg"></i></button>
            </div>
            <!-- SQL 쿼리 관리 -->
            <div v-if="m._showSqls" class="mt-2 p-2 rounded" style="background:#f0fff4;border:1px solid #c3e6cb">
              <div class="d-flex align-items-center gap-2 mb-2">
                <small class="text-secondary fw-bold"><i class="bi bi-database me-1"></i>{{ t('svcEd.sqlQueries') }}</small>
                <button class="btn btn-sm btn-outline-success py-0" @click="m._sqlPickerOpen=true"><i class="bi bi-search me-1"></i>{{ t('svcEd.searchAdd') }}</button>
                <small class="text-secondary">({{ allSqlQueries.length }}개)</small>
              </div>
              <div v-for="sq in getMethodSqlQueries(m)" :key="sq.id" class="d-flex align-items-center gap-2 mb-1">
                <span class="badge bg-success"><i class="bi bi-database me-1"></i>{{ sq.sqlFile }}.{{ sq.queryName }}</span>
                <button class="btn btn-sm btn-outline-danger py-0 px-1" @click="removeSqlQueryFromMethod(pageOffset+li,sq.id)"><i class="bi bi-x-lg" style="font-size:10px"></i></button>
              </div>
              <ResourcePicker v-if="m._sqlPickerOpen" :title="t('serviceEditor.k3')" :items="allSqlQueries" :selected="getMethodSqlQueries(m).map(q=>q.id)" name-key="name" desc-key="description" :multiple="m.type==='multiSql'"
                @select="(item)=>{addSqlQueryToMethod(pageOffset+li,item);if(m.type!=='multiSql')m._sqlPickerOpen=false;}" @deselect="(item)=>removeSqlQueryFromMethod(pageOffset+li,item.id)" @close="m._sqlPickerOpen=false" />
            </div>
            <div v-if="m.expanded&&m.type==='standard'" class="mt-2 p-2 rounded" style="background:white;border:1px solid #e0e3e7"><div class="small text-secondary"><strong>{{ t('svcEd.kind') }}</strong> {{ m.methodType }} · <strong>SQL:</strong> {{ meta.sqlFile||t('serviceEditor.k6') }}</div></div>
            <div v-if="m.expanded&&m.type==='multiSql'" class="mt-2">
              <input type="text" class="form-control form-control-sm mb-2" v-model="m.description" :placeholder="t('serviceEditor.k4')" />
              <SqlStepsEditor :model-value="{sqlSteps:m.sqlSteps||[],useTransaction:m.useTransaction??false,returnExpr:m.returnExpr??''}" :sql-options="sqlOptions" @update:model-value="patchMultiSql(pageOffset+li,$event)" />
            </div>
          </div>
          <div v-if="totalMethodPages>1" class="mb-3"><Pagination v-model:page="methodPage" :total-pages="totalMethodPages" :window-size="10" /></div>

          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0"><i class="bi bi-code-slash me-2"></i>{{ t('svcEd.generatedCode') }} <small v-if="codeDirty" class="text-warning ms-2">{{ t('svcEd.editedDirectly') }}</small></h6>
            <button class="btn btn-sm btn-outline-secondary" @click="preview"><i class="bi bi-magic me-1"></i>{{ t('svcEd.regenerate') }}</button>
          </div>
          <div style="max-height:400px;overflow-y:auto;border:1px solid #e0e3e7;border-radius:4px"><CodeEditor v-model="generatedCode" @update:modelValue="onCodeChange" /></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-outline-secondary" @click="$emit('close')" :disabled="saving">{{ t('common.cancel') }}</button>
        <button class="btn btn-sm btn-primary" @click="save" :disabled="loading||saving||!generatedCode"><span v-if="saving" class="spinner-border spinner-border-sm me-2"></span><i v-else class="bi bi-save me-1"></i>{{ isEdit?t('serviceEditor.k7'):t('serviceEditor.k8') }}</button>
      </div>
    </div>
  </div>
</template>
