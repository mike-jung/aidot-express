<script setup>
import { confirmDialog } from '../../composables/useConfirm';
import { notifyError } from '../../composables/useNotify';
/**
 * ScreenWizardModal (Phase 8) — 컨트롤러 선택 → handler → input → probe → 화면 자동 생성.
 *
 *  4단계 마법사:
 *    Step 1: 컨트롤러 선택
 *    Step 2: 핸들러(라우트) 선택 — POST/PUT/DELETE 면 경고 표시
 *    Step 3: analyze API 로 input 파라미터 확인 → 사용자 값 입력
 *    Step 4: probe API 로 실제 호출 → 결과 미리보기 + "화면 생성" 버튼
 *
 *  생성되는 composite spec:
 *    suggestedWidget (list/detail/stat/text) 에 따라 widget 하나짜리 row 를 만들고
 *    source 는 endpoint 로 설정 (resultKey 는 probe 결과의 listPath 사용).
 *
 *  중요: POST/PUT/DELETE probe 는 실제 데이터를 변경할 수 있으므로 Step 4 실행 전 경고 대화상자.
 */
import { ref, computed, watch } from 'vue';
// ★ v1.10.7 — 다국어
import { useI18n } from '../../composables/useI18n';

import http from '../../api/http';
import { createCompositeSpec, createRow, createWidget, newId } from '../../generator/screens/compositeSchema';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

const props = defineProps({
  show: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'create']);

/* ─── 상태 ─── */
const step = ref(1);                 // 1..4

// Step 1
const controllerList = ref([]);
const controllerLoading = ref(false);
const controllerError = ref(null);
const ctrlSearch = ref('');
const selectedController = ref(null);  // { id, name, base_path|basePath, routes? }

// Step 2
const selectedRoute = ref(null);       // { method, path, handler }

// Step 3
const analyzing = ref(false);
const analyzeResult = ref(null);       // /analyze 응답
const inputValues = ref({});           // { paramName: value }

/**
 * Phase 25: requestCode 자동 고유값 생성.
 *  형식: req-<YYYYMMDD-HHmmss>-<4자리 랜덤>
 *  예:   req-20260421-134502-a3f9
 */
function generateRequestCode() {
  const d = new Date();
  const p = (n, len = 2) => String(n).padStart(len, '0');
  const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const rand = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `req-${ts}-${rand}`;
}

// Step 4
const probing = ref(false);
const probeResult = ref(null);         // /probe 응답
const createdWarning = ref(false);

/* ─── computed ─── */

const filteredControllers = computed(() => {
  const q = ctrlSearch.value.trim().toLowerCase();
  if (!q) return controllerList.value;
  return controllerList.value.filter((c) => {
    const hay = [c.name, c.base_path, c.basePath, c.description].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
});

const isMutation = computed(() => {
  if (!selectedRoute.value) return false;
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes((selectedRoute.value.method || 'GET').toUpperCase());
});

const canGoNext = computed(() => {
  if (step.value === 1) return !!selectedController.value;
  if (step.value === 2) return !!selectedRoute.value;
  if (step.value === 3) return !!analyzeResult.value;
  if (step.value === 4) return !!probeResult.value && probeResult.value.ok;
  return false;
});

/* ─── 유틸 ─── */

function methodClass(method) {
  const m = (method || 'GET').toUpperCase();
  return ({
    GET:    'bg-success',
    POST:   'bg-warning text-dark',
    PUT:    'bg-info text-dark',
    PATCH:  'bg-info text-dark',
    DELETE: 'bg-danger',
  })[m] || 'bg-secondary';
}

/**
 * Phase 32 (patch-11): analyze 결과의 input 한 개로부터 placeholder 문구 생성.
 *   label 이 파라미터 이름 그대로 노출되므로, placeholder 는 "어떤 값을 넣어야 하는지" 힌트.
 *   source 별:
 *    - 'path'          : URL path 에 삽입되는 값 (예: 1 같은 ID 값)
 *    - 'query'         : URL query string 에 붙는 값
 *    - 'body-or-query' : POST body 또는 GET query. SQL :param 유래 대부분.
 */
function hintFor(inp) {
  const type = inp.type || 'string';
  const source = inp.source || '';
  if (source === 'path')  return `${type} 값 (URL path 에 삽입됨)`;
  if (source === 'query') return `${type} 값 (query string)`;
  return `${type} 값`;
}

function resetWizard() {
  step.value = 1;
  selectedController.value = null;
  selectedRoute.value = null;
  analyzeResult.value = null;
  inputValues.value = {};
  probeResult.value = null;
  createdWarning.value = false;
}

function close() {
  resetWizard();
  emit('close');
}

/* ─── Step 1: 컨트롤러 목록 ─── */

async function loadControllers() {
  controllerLoading.value = true;
  controllerError.value = null;
  try {
    const r = await http.get('/api/admin/controllers/paged', { params: { page: 1, perPage: 200 } });
    controllerList.value = r.data?.data || [];
  } catch (e) {
    controllerError.value = e.response?.data?.message || e.message;
  } finally {
    controllerLoading.value = false;
  }
}

async function selectController(ctrl) {
  selectedController.value = ctrl;
  selectedRoute.value = null;
  // 상세 조회로 routes 가져옴
  try {
    const r = await http.get(`/api/admin/controllers/${encodeURIComponent(ctrl.id)}`);
    const detail = r.data?.data || {};
    // Phase 28 (patch-07): 서버 응답에서 route 의 handler 필드가 비어있는 경우
    //  (meta 파일이 handlerName 만 가진 경우) handlerName 으로 폴백하여 채움.
    //  이전에는 handler 가 undefined 인 상태로 radio 비교식 `undefined === undefined` 가
    //  모든 항목을 true 로 만들어 @change 이벤트가 트리거되지 않는 버그가 있었음.
    if (Array.isArray(detail.routes)) {
      detail.routes = detail.routes.map((rt) => ({
        ...rt,
        handler: rt.handler || rt.handlerName || null,
      }));
    }
    selectedController.value = { ...ctrl, ...detail };
  } catch (e) {
    controllerError.value = `컨트롤러 상세 조회 실패: ${e.response?.data?.message || e.message}`;
  }
}

/* ─── Step 2: 라우트 선택 ─── */

function selectRoute(r) {
  selectedRoute.value = r;
}

/* ─── Step 3: analyze ─── */

async function runAnalyze() {
  if (!selectedController.value || !selectedRoute.value) return;
  analyzing.value = true;
  analyzeResult.value = null;
  try {
    const r = await http.get('/api/admin/screen-wizard/analyze', {
      params: {
        controllerId: selectedController.value.name || selectedController.value.id,
        handler: selectedRoute.value.handler,
      },
    });
    analyzeResult.value = r.data?.data || null;
    // input 기본값 세팅
    const init = {};
    for (const inp of analyzeResult.value?.inputs || []) {
      if (inp.default != null) init[inp.name] = inp.default;
    }
    // Phase 25: requestCode 는 자동 생성 고유값으로 기본 값 세팅.
    //   서버의 많은 handler 들이 dispatcher 에서 params.requestCode 를 읽어
    //   응답 envelope 의 header.requestCode 로 되돌려주므로 항상 고유해야 함.
    //   input 파라미터 정의에 requestCode 가 없어도 입력란이 보이도록 강제 추가.
    init.requestCode = generateRequestCode();
    if (analyzeResult.value && !analyzeResult.value.inputs.some((i) => i.name === 'requestCode')) {
      analyzeResult.value.inputs.unshift({
        name: 'requestCode',
        type: 'string',
        source: 'auto',
        required: false,
        default: init.requestCode,
        desc: t('screenWizard.k10'),
      });
    }
    inputValues.value = init;
  } catch (e) {
    notifyError('분석 실패', e);
  } finally {
    analyzing.value = false;
  }
}

/* ─── Step 4: probe ─── */

async function runProbe() {
  // POST/PUT/DELETE 경고
  if (isMutation.value) {
    const ok = await confirmDialog({
      title: `${selectedRoute.value.method} 라우트 실제 실행`,
      message: `이 라우트는 ${selectedRoute.value.method} 이므로 서버 데이터를 변경할 수 있습니다.\n실제로 handler 를 호출합니다. 계속할까요?`,
      detail: '테스트 DB 가 아니라면 데이터가 생성/수정/삭제될 수 있습니다.',
      confirmText: t('screenWizard.k11'),
      variant: 'danger',
      icon: 'bi-exclamation-triangle',
    });
    if (!ok) return;
  }

  probing.value = true;
  probeResult.value = null;
  try {
    // input 값을 number/boolean 으로 적절히 변환
    const params = {};
    for (const inp of analyzeResult.value?.inputs || []) {
      let v = inputValues.value[inp.name];
      if (v === '' || v == null) continue;
      if (inp.type === 'number') v = Number(v);
      if (inp.type === 'boolean') v = v === true || v === 'true';
      params[inp.name] = v;
    }
    const r = await http.post('/api/admin/screen-wizard/probe', {
      controllerId: selectedController.value.name || selectedController.value.id,
      handler: selectedRoute.value.handler,
      params,
    });
    probeResult.value = r.data?.data || null;
  } catch (e) {
    probeResult.value = {
      ok: false,
      error: e.response?.data?.message || e.message,
      outputFields: [],
    };
  } finally {
    probing.value = false;
  }
}

/* ─── 화면 생성 ─── */

/**
 * Phase 31 (patch-10): 핸들러 유형별로 최적 화면 구성을 자동 생성.
 *
 *  생성 패턴:
 *   - 조회형 (GET) 에 path param 만 있으면:
 *      Row 1: QueryFormWidget (path param 입력 폼)
 *      Row 2: DetailWidget / ListWidget (결과)
 *      endpoint path 의 `:id` → `{id}` 템플릿으로 변환 (rowContext 가 채움).
 *
 *   - 조회형 (GET) 에 파라미터 없으면:
 *      Row 1: 결과 widget 하나만
 *
 *   - mutation (POST/PUT/DELETE):
 *      Row 1: FormDialogWidget (버튼 → 모달 → 폼 → 제출)
 *             path param 은 다이얼로그 폼의 필드로 포함
 *             DELETE 면 confirmBeforeSubmit=true
 *
 *  규칙 요약:
 *    GET   + 입력 없음       → 단일 widget (기존 동작)
 *    GET   + 입력 있음       → QueryForm + 결과 widget  (Pattern A)
 *    POST  / PUT / DELETE    → FormDialog                (Pattern B)
 */
function createScreenFromProbe() {
  const an = analyzeResult.value;
  const pr = probeResult.value;
  if (!an || !pr || !pr.ok) return;

  const method = (an.method || 'GET').toUpperCase();
  const isMutation = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

  // 결과 widget kind: analyze 의 suggestedWidget + probe shape 로 보정
  let resultKind = an.suggestedWidget || 'text';
  if (pr.shape === 'pagedRows' || pr.shape === 'rowsArray') resultKind = 'list';
  else if (pr.shape === 'object') resultKind = 'detail';

  // 화면 제목 & 경로
  const titleBase = an.handler
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
  const title = `${an.controllerName.replace(/Controller$/i, '')} ${titleBase}`.trim();
  const screenPath = `/${an.handler.toLowerCase()}`.replace(/[^a-z0-9\-/]/g, '-');
  const resultKey = pr.listPath || null;

  // analyze.inputs 중 'requestCode' (자동 생성용) 는 사용자 입력 불필요 — 제외
  const userInputs = (an.inputs || []).filter((i) => i.name !== 'requestCode');
  const pathInputs = userInputs.filter((i) => i.source === 'path');
  const otherInputs = userInputs.filter((i) => i.source !== 'path');

  const controllerId = selectedController.value.name || selectedController.value.id;
  const screen = createCompositeSpec({ title, path: screenPath });

  // endpoint path 의 :param 을 {param} 템플릿으로 변환 (rowContext 가 치환)
  const templatedPath = (an.fullPath || '').replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');

  if (isMutation) {
    // ── Pattern B: FormDialog ──
    //  path param + body input 모두 다이얼로그 폼의 필드로 수집.
    //  runtime 이 path 에 있는 {paramName} 을 rowContext.params 에서 꺼내 치환하므로
    //  제출 시 동일하게 path 가 완성됨.
    const dialogWidget = createWidget({ kind: 'formDialog' });
    dialogWidget.title = title;
    dialogWidget.source = {
      type: 'endpoint',
      method,
      path: templatedPath,
      controllerId,
      handlerName: an.handler,
    };
    const variant = method === 'DELETE' ? 'danger' : (method === 'POST' ? 'success' : 'primary');
    const actionLabel = method === 'POST' ? '생성'
                     : method === 'DELETE' ? '삭제'
                     : '수정';
    dialogWidget.config = {
      buttonLabel: actionLabel,
      buttonVariant: variant,
      dialogTitle: `${title} — ${actionLabel}`,
      fields: userInputs.map((i) => ({
        name: i.name,
        // Phase 32 (patch-11): label 은 파라미터 이름 그대로 (예: 'id')
        //  desc 는 어디서 쓰이는지 설명하는 문구 (예: 'URL path parameter') — placeholder 로 사용.
        //  이렇게 하면 사용자가 "ID 값만 입력하라" 는 걸 명확히 인지 (label='id') 하고,
        //  placeholder 가 "URL 에 들어갈 값" 힌트를 제공.
        label: i.name,
        type: i.type || 'string',
        required: !!i.required,
        default: i.default != null ? i.default : '',
        placeholder: hintFor(i),
      })),
      confirmBeforeSubmit: method === 'DELETE',
      refreshTargetWidgetId: null,  // 사용자가 나중에 목록 widget 과 연결 가능
    };
    screen.rows = [createRow({ widths: [12], widgets: [dialogWidget] })];
  } else {
    // ── 조회형 ──
    if (pathInputs.length > 0 || (otherInputs.length > 0 && resultKind === 'detail')) {
      // Pattern A: QueryForm + 결과 widget
      const resultWidget = createWidget({ kind: resultKind });
      resultWidget.title = title + ' 결과';
      resultWidget.source = {
        type: 'endpoint',
        method,
        path: templatedPath,
        resultKey,
        controllerId,
        handlerName: an.handler,
      };
      if (resultKind === 'list') resultWidget.config = { maxRows: 20 };
      else if (resultKind === 'stat') resultWidget.config = { format: 'number', color: 'primary' };

      const queryWidget = createWidget({ kind: 'queryForm' });
      queryWidget.title = title + ' 조회';
      // Phase 32 (patch-11): 엔드포인트 경로를 queryForm title 에 포함시켜
      //  사용자가 어떤 API 를 호출하는지 한눈에 보이게 하고, 입력값이 URL path 에 삽입된다는 걸 이해하도록.
      // Phase 33 (patch-12): queryWidget 에도 source 를 심어 두어 compositeGen 이 store 접두사 추출할 수 있도록.
      queryWidget.source = {
        type: 'endpoint',
        method,
        path: templatedPath,
        resultKey,
        controllerId,
        handlerName: an.handler,
      };
      queryWidget.config = {
        endpointHint: `${method} ${templatedPath}`,  // QueryFormWidget 이 작게 표시
        fields: userInputs.map((i) => ({
          name: i.name,
          label: i.name,                            // 'id' 등 파라미터 이름 자체
          type: i.type || 'string',
          required: !!i.required,
          default: i.default != null ? i.default : '',
          placeholder: hintFor(i),
        })),
        submitLabel: '조회',
        targetWidgetId: resultWidget.id,
      };

      screen.rows = [
        createRow({ widths: [12], widgets: [queryWidget] }),
        createRow({ widths: [12], widgets: [resultWidget] }),
      ];
    } else {
      // 입력 없는 조회 — 단일 widget (기존 동작)
      const widget = createWidget({ kind: resultKind });
      widget.title = title;
      widget.source = {
        type: 'endpoint',
        method,
        path: an.fullPath,   // 파라미터 없으니 원래 path 유지
        resultKey,
        controllerId,
        handlerName: an.handler,
      };
      if (resultKind === 'list') widget.config = { maxRows: 20 };
      else if (resultKind === 'stat') widget.config = { format: 'number', color: 'primary' };
      screen.rows = [createRow({ widths: [12], widgets: [widget] })];
    }
  }

  emit('create', screen);
  close();
}

/* ─── 진입 시 로드 ─── */
watch(() => props.show, (v) => {
  if (v) {
    resetWizard();
    if (!controllerList.value.length) loadControllers();
  }
});
</script>

<template>
  <div v-if="show" class="wizard-backdrop" @click.self="close">
    <div class="wizard-modal">

      <!-- Header -->
      <div class="wizard-header">
        <h5 class="mb-0">
          <i class="bi bi-magic me-2"></i>{{ t('wizard.title') }}
        </h5>
        <button class="btn btn-sm btn-link text-secondary" @click="close">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Step 표시 -->
      <div class="wizard-steps">
        <div v-for="s in 4" :key="s" class="step-item"
             :class="{ active: step === s, done: step > s }">
          <span class="step-num">{{ s }}</span>
          <span class="step-label">
            {{ [t('screenWizard.k2'), t('screenWizard.k5'), t('screenWizard.k6'), t('screenWizard.k7')][s - 1] }}
          </span>
        </div>
      </div>

      <!-- Body -->
      <div class="wizard-body">

        <!-- Step 1: 컨트롤러 선택 -->
        <div v-if="step === 1" class="step-pane">
          <div class="step-title">{{ t('wizard.step1') }}</div>

          <div class="input-group input-group-sm mb-2">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input v-model="ctrlSearch" class="form-control" :placeholder="t('wiz2.searchByNameOrPath')" />
          </div>

          <div v-if="controllerError" class="alert alert-danger small">{{ controllerError }}</div>

          <div v-if="controllerLoading" class="text-center py-4 text-secondary small">
            <span class="spinner-border spinner-border-sm me-1"></span>{{ t('wizard.loading') }}
          </div>

          <div v-else class="ctrl-list">
            <!-- 상태 1: 서버에 컨트롤러 자체가 하나도 없음 — 튜토리얼 1 안내 -->
            <div v-if="!controllerList.length" class="empty-state">
              <div class="empty-icon"><i class="bi bi-collection"></i></div>
              <div class="fw-semibold mb-1">{{ t('wizard.noControllers') }}</div>
              <div class="text-secondary small mb-3">
                {{ t('wizard.intro') }}<br />
                {{ t('screenWizard.k1') }} <strong>{{ t('screenWizard.k2') }}</strong> {{ t('screenWizard.k3') }}
              </div>
              <router-link :to="{ name: 'controllers' }" class="btn btn-sm btn-primary"
                           @click="emit('close')">
                <i class="bi bi-arrow-right me-1"></i>{{ t('wizard.goControllers') }}
              </router-link>
              <div class="text-secondary small mt-3">
                {{ t('screenWizard.k4') }}
              </div>
            </div>

            <!-- 상태 2: 컨트롤러는 있는데 검색 결과가 없음 -->
            <template v-else>
              <label v-for="c in filteredControllers" :key="c.id" class="ctrl-item"
                     :class="{ selected: selectedController?.id === c.id }">
                <input type="radio" :checked="selectedController?.id === c.id"
                       @change="selectController(c)" />
                <div class="flex-grow-1">
                  <div class="fw-semibold">{{ c.name }}</div>
                  <div class="text-secondary small">
                    <code>{{ c.base_path || c.basePath || '-' }}</code>
                  </div>
                </div>
              </label>
              <div v-if="!filteredControllers.length" class="text-secondary small text-center py-3">
                <i class="bi bi-search me-1"></i>"{{ ctrlSearch }}" 로 검색한 결과가 없습니다
              </div>
            </template>
          </div>
        </div>

        <!-- Step 2: 라우트 선택 -->
        <div v-else-if="step === 2" class="step-pane">
          <div class="step-title">{{ t('wizard.step2') }}</div>
          <div class="small text-secondary mb-2">
            <strong>{{ selectedController?.name }}</strong> {{ t('wiz2.routesOf') }}
          </div>

          <div v-if="!(selectedController?.routes?.length)" class="text-secondary small text-center py-3">
            {{ t('wizard.noRoutesFor') }}
          </div>

          <label v-for="r in selectedController?.routes || []" :key="r.handler" class="route-item"
                 :class="{ selected: selectedRoute?.handler === r.handler }">
            <input type="radio" :checked="selectedRoute?.handler === r.handler"
                   @change="selectRoute(r)" />
            <span class="badge route-method-badge" :class="methodClass(r.method)">
              {{ (r.method || 'GET').toUpperCase() }}
            </span>
            <code class="route-path">{{ r.path || '/' }}</code>
            <span class="text-secondary small ms-auto">{{ r.handler }}</span>
          </label>

          <div v-if="selectedRoute && isMutation" class="alert alert-warning small mt-3">
            <i class="bi bi-exclamation-triangle me-1"></i>
            <strong>{{ selectedRoute.method }}</strong> 라우트를 선택했습니다.
            이 타입은 서버 데이터를 변경할 수 있으며, {{ t('wiz2.next') }} 단계에서 실제 호출 시 경고 대화상자가 표시됩니다.
          </div>
        </div>

        <!-- Step 3: input 입력 -->
        <div v-else-if="step === 3" class="step-pane">
          <div class="step-title">{{ t('wizard.step3') }}</div>

          <div class="route-summary mb-3">
            <span class="badge" :class="methodClass(selectedRoute.method)">{{ selectedRoute.method }}</span>
            <code class="ms-2">{{ analyzeResult?.fullPath || (selectedController?.base_path || selectedController?.basePath || '') + selectedRoute.path }}</code>
          </div>

          <div v-if="analyzing" class="text-center py-3 text-secondary small">
            <span class="spinner-border spinner-border-sm me-1"></span>{{ t('wiz2.analyzing') }}
          </div>

          <div v-else-if="analyzeResult">
            <div v-if="!analyzeResult.inputs.length" class="text-secondary small mb-3">
              {{ t('wizard.noInputParams') }}
            </div>

            <div v-for="inp in analyzeResult.inputs" :key="inp.name" class="input-field mb-2">
              <label class="form-label small mb-1">
                <strong>{{ inp.name }}</strong>
                <span v-if="inp.required" class="text-danger">*</span>
                <span class="text-secondary ms-1">({{ inp.type }}, {{ inp.source }})</span>
              </label>
              <input v-if="inp.type === 'number'"
                     type="number"
                     class="form-control form-control-sm"
                     v-model="inputValues[inp.name]"
                     :placeholder="String(inp.default ?? '')" />
              <input v-else
                     type="text"
                     class="form-control form-control-sm"
                     v-model="inputValues[inp.name]"
                     :placeholder="inp.desc || String(inp.default ?? '')" />
              <div v-if="inp.desc" class="form-text">{{ inp.desc }}</div>
            </div>

            <!-- 참조 Service / SQL (읽기 전용) -->
            <div v-if="analyzeResult.dependencies" class="deps-summary">
              <div class="section-label mt-3">{{ t('wiz2.reference') }}</div>
              <div class="small text-secondary">
                Services: <strong>{{ analyzeResult.dependencies.services.length }}</strong> ·
                SQL files: <strong>{{ analyzeResult.dependencies.sqls.length }}</strong>
                <span v-if="analyzeResult.dependencies.services.length" class="ms-2">
                  ({{ analyzeResult.dependencies.services.map(s => s.name).join(', ') }})
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: probe & 결과 -->
        <div v-else-if="step === 4" class="step-pane">
          <div class="step-title">{{ t('wizard.step4') }}</div>

          <div class="route-summary mb-3">
            <span class="badge" :class="methodClass(selectedRoute.method)">{{ selectedRoute.method }}</span>
            <code class="ms-2">{{ analyzeResult?.fullPath }}</code>
          </div>

          <div v-if="!probeResult" class="text-center py-4">
            <button class="btn btn-primary"
                    :class="{ 'btn-warning text-dark': isMutation }"
                    :disabled="probing"
                    @click="runProbe">
              <span v-if="probing" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-play-fill me-1"></i>
              {{ isMutation ? '⚠️ ' + selectedRoute.method + t('screenWizard.k8') : t('screenWizard.k9') }}
            </button>
            <div class="small text-secondary mt-2">
              {{ t('wizard.step4Hint') }}
            </div>
          </div>

          <div v-else>
            <!-- 실패 -->
            <div v-if="!probeResult.ok" class="alert alert-danger small">
              <div class="fw-semibold"><i class="bi bi-exclamation-triangle me-1"></i>{{ t('wiz2.runFailed') }}</div>
              <div class="mt-1">{{ probeResult.error }}</div>
              <button class="btn btn-sm btn-outline-secondary mt-2" @click="probeResult = null">
                <i class="bi bi-arrow-counterclockwise me-1"></i>{{ t('wiz2.retry') }}
              </button>
            </div>

            <!-- 성공 -->
            <div v-else>
              <div class="alert alert-success small py-2">
                <i class="bi bi-check-circle me-1"></i>
                {{ t('wiz2.responseOk') }} <code>{{ probeResult.shape }}</code>
                <span v-if="probeResult.listPath">, listPath: <code>{{ probeResult.listPath }}</code></span>
              </div>

              <!-- Output 필드 -->
              <div v-if="probeResult.outputFields.length" class="mb-3">
                <div class="section-label">추출된 Output 필드 ({{ probeResult.outputFields.length }}개)</div>
                <div class="output-fields">
                  <div v-for="f in probeResult.outputFields" :key="f.name" class="field-tag">
                    <strong>{{ f.name }}</strong>
                    <span class="text-secondary">: {{ f.type }}</span>
                    <span v-if="f.sample != null" class="text-secondary ms-1">
                      ≈ {{ typeof f.sample === 'string' && f.sample.length > 24 ? f.sample.slice(0, 24) + '...' : f.sample }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 응답 미리보기 -->
              <details class="mb-3">
                <summary class="small text-secondary" style="cursor: pointer;">{{ t('wiz2.viewRawJson') }}</summary>
                <pre class="sample-json"><code>{{ JSON.stringify(probeResult.sample, null, 2).slice(0, 2000) }}</code></pre>
              </details>

              <button class="btn btn-success w-100" @click="createScreenFromProbe">
                <i class="bi bi-magic me-1"></i>
                {{ t('wiz2.buildFromThis') }}
                (widget: <strong>{{ analyzeResult.suggestedWidget }}</strong>)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer: 네비게이션 -->
      <div class="wizard-footer">
        <button v-if="step > 1" class="btn btn-outline-secondary btn-sm" @click="step = step - 1">
          <i class="bi bi-arrow-left me-1"></i>{{ t('wiz2.prev') }}
        </button>
        <span class="ms-auto"></span>
        <button v-if="step < 4 && step !== 3"
                class="btn btn-primary btn-sm"
                :disabled="!canGoNext"
                @click="step = step + 1">
          {{ t('wiz2.next') }} <i class="bi bi-arrow-right ms-1"></i>
        </button>
        <button v-if="step === 3 && !analyzeResult"
                class="btn btn-primary btn-sm"
                :disabled="!selectedRoute || analyzing"
                @click="runAnalyze">
          <span v-if="analyzing" class="spinner-border spinner-border-sm me-1"></span>
          {{ t('wiz2.analyze') }} <i class="bi bi-search ms-1"></i>
        </button>
        <button v-else-if="step === 3 && analyzeResult"
                class="btn btn-primary btn-sm"
                @click="step = 4">
          {{ t('wiz2.next') }} <i class="bi bi-arrow-right ms-1"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wizard-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}
.wizard-modal {
  background: #fff;
  border-radius: 0.5rem;
  width: 760px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}
.wizard-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.wizard-steps {
  display: flex;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  gap: 0.75rem;
}
.step-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  color: #94a3b8;
}
.step-item .step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.75rem;
}
.step-item.active { color: #0d6efd; font-weight: 600; }
.step-item.active .step-num { background: #0d6efd; color: white; }
.step-item.done { color: #059669; }
.step-item.done .step-num { background: #10b981; color: white; }

.wizard-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
  min-height: 280px;
}
.step-title { font-weight: 600; margin-bottom: 0.75rem; color: #0f172a; }

.ctrl-list, .route-list {
  border: 1px solid #f1f5f9;
  border-radius: 0.25rem;
  max-height: 300px;
  overflow-y: auto;
}
.ctrl-item, .route-item {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f8fafc;
  cursor: pointer;
  margin: 0;
}
.ctrl-item:last-child, .route-item:last-child { border-bottom: none; }
.ctrl-item:hover, .route-item:hover { background: #f8fafc; }
.ctrl-item.selected, .route-item.selected { background: #eff6ff; }

.route-method-badge {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.7rem;
  min-width: 3rem;
  text-align: center;
  flex-shrink: 0;
}
.route-path {
  font-size: 0.8rem;
  color: #1e293b;
}

.route-summary {
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
}
.route-summary code { font-size: 0.85rem; }

.section-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.4rem;
}

.output-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.field-tag {
  font-size: 0.75rem;
  background: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #e2e8f0;
}

.sample-json {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  padding: 0.75rem;
  border-radius: 0.25rem;
  max-height: 240px;
  overflow: auto;
  font-size: 0.75rem;
  margin-top: 0.4rem;
  margin-bottom: 0;
}

.deps-summary {
  padding: 0.5rem 0.75rem;
  background: #fafbfc;
  border-radius: 0.25rem;
  border: 1px solid #f1f5f9;
  margin-top: 0.75rem;
}

.wizard-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  background: #fafbfc;
}

/* Phase 27 (patch-06): 컨트롤러 빈 상태 onboarding */
.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #334155;
}
.empty-state .empty-icon {
  font-size: 2.5rem;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}
</style>
