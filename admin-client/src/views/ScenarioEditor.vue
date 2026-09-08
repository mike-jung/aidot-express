<script setup>
import { useUnsavedGuard } from '../composables/useUnsavedGuard';
/**
 * ScenarioEditor — 시나리오 단계들을 편집.
 *
 * 라우트 카탈로그에서 라우트를 셀렉트로 선택 (별도 API 테스터와 비슷한 UX).
 * 각 단계: 라우트 + path/query/headers/body + extractions 정의
 */
import { ref, reactive, computed, onMounted, watch } from 'vue';
// ★ v1.10.22 — 다국어
import { useI18n } from '../composables/useI18n';

import { useRoute, useRouter } from 'vue-router';
import http from '../api/http';
import CodeEditor from '../components/CodeEditor.vue';
import { getScenario, saveScenario } from '../utils/scenarioStore';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

const route = useRoute();
const router = useRouter();

const isNew = computed(() => route.params.id === 'new');
const scenario = reactive({
  id: null,
  name: '',
  description: '',
  inputVars: {},          // { key: value }
  defaultHeaders: {},     // { key: value }
  steps: [],
});

const inputVarsList = ref([]);   // [{ key, value }] — UI 편집용
const defaultHeadersList = ref([]); // 동일

const allRoutes = ref([]);  // 라우트 카탈로그 (셀렉트박스용)
const loading = ref(false);
const saving = ref(false);

// v1.7.7: 불러온 시점의 스냅샷과 비교해 편집 여부를 판정한다
const baselineJson = ref(null);
const isDirty = computed(() => baselineJson.value !== null
  && JSON.stringify(scenario) !== baselineJson.value);
const { skipOnce: skipLeaveGuard } = useUnsavedGuard(isDirty);
/** 불러오기/저장 직후에 호출해 현재 상태를 '깨끗함' 기준으로 삼는다 */
function markClean() { baselineJson.value = JSON.stringify(scenario); }

const error = ref(null);

async function loadCatalog() {
  try {
    const r = await http.get('/api/admin/routes');
    const flat = [];
    const seen = new Set();   // 중복 label 방지
    for (const c of (r.data.data || [])) {
      for (const rt of c.routes) {
        // admin 도구 자체 라우트는 시나리오 대상에서 제외 (관리 API 와 테스트 대상 API 분리)
        if (c.isAdmin) continue;
        const label = `[${rt.method}] ${rt.fullPath}`;
        if (seen.has(label)) continue;
        seen.add(label);
        flat.push({
          controllerName: c.controllerName,
          method: rt.method,
          fullPath: rt.fullPath,
          handler: rt.handler,
          label,
        });
      }
    }
    flat.sort((a, b) => a.fullPath.localeCompare(b.fullPath) || a.method.localeCompare(b.method));
    allRoutes.value = flat;
  } catch (e) {
    error.value = t('designer.scn_routeFailed') + ': ' + (e.response?.data?.message || e.message);
    allRoutes.value = [];
  }
}

async function loadExisting() {
  const sc = await getScenario(route.params.id);
  if (!sc) {
    error.value = t('designer.scn_notFound');
    return;
  }
  Object.assign(scenario, sc);
  inputVarsList.value = Object.entries(sc.inputVars || {}).map(([k, v]) => ({ key: k, value: String(v) }));
  defaultHeadersList.value = Object.entries(sc.defaultHeaders || {}).map(([k, v]) => ({ key: k, value: String(v) }));
}

function addStep() {
  scenario.steps.push({
    name: 'step' + (scenario.steps.length + 1),
    method: 'GET',
    fullPath: '',
    queryParams: [],
    headers: [],
    body: '',
    extractions: [],
    assertions: [],      // ★ v1.11.6 검증 규칙
    expectStatus: '',    // ★ v1.11.6 기대 상태 (비우면 2xx)
    stopOnFailure: true,
  });
}
const ASSERT_OPS = [['exists', t('designer.scn_opExists')], ['notEmpty', t('designer.scn_opNotEmpty')], ['empty', t('designer.scn_opEmpty')], ['eq', '='], ['ne', '≠'], ['contains', '포함'], ['gt', '>'], ['lt', '<'], ['matches', '정규식']];
function addAssertion(stepIdx)    { (scenario.steps[stepIdx].assertions ||= []).push({ path: '', op: 'exists', value: '' }); }
function removeAssertion(stepIdx, i) { scenario.steps[stepIdx].assertions.splice(i, 1); }
function removeStep(i) { scenario.steps.splice(i, 1); }
function moveStep(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= scenario.steps.length) return;
  [scenario.steps[i], scenario.steps[j]] = [scenario.steps[j], scenario.steps[i]];
}

function onRouteSelect(stepIdx, ev) {
  const label = ev?.target?.value;
  if (!label) return;
  const r = allRoutes.value.find((x) => x.label === label);
  if (!r) { if (ev) ev.target.value = ''; return; }
  scenario.steps[stepIdx].method = r.method;
  scenario.steps[stepIdx].fullPath = r.fullPath;
  if (!scenario.steps[stepIdx].name || /^step\d+$/.test(scenario.steps[stepIdx].name)) {
    scenario.steps[stepIdx].name = r.handler;
  }
  // 셀렉트를 placeholder 로 리셋 (다시 같은 라우트 선택도 동작하도록)
  if (ev) ev.target.value = '';
}

function addQueryParam(stepIdx)   { scenario.steps[stepIdx].queryParams.push({ key: '', value: '' }); }
function removeQueryParam(stepIdx, i) { scenario.steps[stepIdx].queryParams.splice(i, 1); }
function addHeader(stepIdx)        { scenario.steps[stepIdx].headers.push({ key: '', value: '' }); }
function removeHeader(stepIdx, i)  { scenario.steps[stepIdx].headers.splice(i, 1); }
function addExtraction(stepIdx)    { scenario.steps[stepIdx].extractions.push({ varName: '', jsonPath: '' }); }
function removeExtraction(stepIdx, i) { scenario.steps[stepIdx].extractions.splice(i, 1); }

const supportsBody = (method) => ['POST', 'PUT', 'PATCH'].includes((method || '').toUpperCase());

function addInputVar() { inputVarsList.value.push({ key: '', value: '' }); }
function removeInputVar(i) { inputVarsList.value.splice(i, 1); }
function addDefaultHeader() { defaultHeadersList.value.push({ key: '', value: '' }); }
function removeDefaultHeader(i) { defaultHeadersList.value.splice(i, 1); }

async function onSave() {
  error.value = null;
  if (!scenario.name.trim()) { error.value = t('designer.scn_nameNeeded'); return; }
  if (scenario.steps.length === 0) { error.value = t('designer.scn_stepNeeded'); return; }
  for (const [i, s] of scenario.steps.entries()) {
    if (!s.fullPath) { error.value = t('designer.scn_pathEmpty').replace('{n}', i+1); return; }
  }
  saving.value = true;
  try {
    // list → object 변환
    scenario.inputVars = Object.fromEntries(
      inputVarsList.value.filter(p => p.key).map(p => [p.key, p.value])
    );
    scenario.defaultHeaders = Object.fromEntries(
      defaultHeadersList.value.filter(p => p.key).map(p => [p.key, p.value])
    );

    const saved = await saveScenario(scenario);
    // 신규였다면 id 가 발급되었으니 reactive 상태에도 반영
    if (!scenario.id) scenario.id = saved.id;
    markClean();                 // 저장 성공 → 이탈 가드 해제
    router.push({ name: 'scenario-run', params: { id: saved.id } });
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    await loadCatalog();
    if (!isNew.value) await loadExisting();
    markClean();               // 불러온 상태를 '깨끗함' 기준으로
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <span>
        <i class="bi bi-collection-play me-2"></i>
        시나리오 테스트 — {{ isNew ? t('scenarioEditor.k4') : t('scenarioEditor.k5') }}
      </span>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" @click="router.push({ name: 'scenarios' })">{{ t('scen.list') }}</button>
        <button class="btn btn-sm btn-primary" @click="onSave" :disabled="saving">
          <i class="bi bi-save me-1"></i>{{ t('scen.saveAndRun') }}
        </button>
      </div>
    </div>
    <div class="card-body">
      <div v-if="loading" class="text-center text-secondary py-4">
        <span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}
      </div>
      <div v-else>
        <div v-if="error" class="alert alert-danger small">{{ error }}</div>

        <!-- 메타 -->
        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label class="form-label small">{{ t('scen.name') }} <span class="text-danger">*</span></label>
            <input v-model="scenario.name" type="text" class="form-control form-control-sm" />
          </div>
          <div class="col-md-8">
            <label class="form-label small">{{ t('scen.description') }}</label>
            <input v-model="scenario.description" type="text" class="form-control form-control-sm" />
          </div>
        </div>

        <!-- 입력 변수 -->
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <h6 class="mb-0 small text-secondary">
              <i class="bi bi-input-cursor-text me-1"></i>{{ t('scen.inputVars') }}
              <small>(시작 시 미리 채울 변수, ${} 로 참조)</small>
            </h6>
            <button class="btn btn-sm btn-outline-secondary" @click="addInputVar"><i class="bi bi-plus-lg"></i></button>
          </div>
          <div v-for="(p, i) in inputVarsList" :key="i" class="input-group input-group-sm mb-1">
            <input v-model="p.key" type="text" class="form-control" :placeholder="t('scen.varName')" style="max-width:200px" />
            <input v-model="p.value" type="text" class="form-control" :placeholder="t('scen.value')" />
            <button class="btn btn-outline-danger" @click="removeInputVar(i)" tabindex="-1">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <!-- 기본 헤더 -->
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <h6 class="mb-0 small text-secondary">
              <i class="bi bi-list-task me-1"></i>{{ t('scen.defaultHeaders') }}
            </h6>
            <button class="btn btn-sm btn-outline-secondary" @click="addDefaultHeader"><i class="bi bi-plus-lg"></i></button>
          </div>
          <div v-for="(p, i) in defaultHeadersList" :key="i" class="input-group input-group-sm mb-1">
            <input v-model="p.key" type="text" class="form-control" placeholder="header name" style="max-width:200px" />
            <input v-model="p.value" type="text" class="form-control" :placeholder="t('scenarioEditor.k1')" />
            <button class="btn btn-outline-danger" @click="removeDefaultHeader(i)" tabindex="-1">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <!-- 단계 목록 -->
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="mb-0"><i class="bi bi-list-ol me-2"></i>{{ t('scen.steps') }}</h6>
          <button class="btn btn-sm btn-outline-primary" @click="addStep">
            <i class="bi bi-plus-lg me-1"></i>{{ t('scen.addStep') }}
          </button>
        </div>

        <div v-if="!scenario.steps.length" class="text-center text-secondary small py-3 border rounded mb-3">
          {{ t('scen.noSteps') }}
        </div>

        <div v-for="(s, idx) in scenario.steps" :key="idx"
             class="mb-3 p-3 rounded"
             style="background:#f6f7f9; border:1px solid #e0e3e7">
          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="badge bg-secondary">{{ idx + 1 }}</span>
            <input v-model="s.name" type="text" class="form-control form-control-sm" style="width:160px" :placeholder="t('scen.stepName')" />

            <select class="form-select form-select-sm" style="width:90px" v-model="s.method">
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            <input v-model="s.fullPath" type="text" class="form-control form-control-sm flex-grow-1"
                   :placeholder="t('scenarioEditor.k2')" />

            <select class="form-select form-select-sm" style="width:280px" @change="onRouteSelect(idx, $event)">
              <option value="" disabled selected>{{ t('scen.orPickRoute') }}</option>
              <option v-for="r in allRoutes" :key="r.label" :value="r.label">
                {{ r.label }} → {{ r.handler }}
              </option>
            </select>

            <button class="btn btn-sm btn-outline-secondary" @click="moveStep(idx, -1)" :disabled="idx === 0"><i class="bi bi-arrow-up"></i></button>
            <button class="btn btn-sm btn-outline-secondary" @click="moveStep(idx, 1)" :disabled="idx === scenario.steps.length - 1"><i class="bi bi-arrow-down"></i></button>
            <button class="btn btn-sm btn-outline-danger" @click="removeStep(idx)"><i class="bi bi-x-lg"></i></button>
          </div>

          <!-- 헤더 -->
          <div class="row g-2 mb-2">
            <div class="col-md-6">
              <div class="d-flex justify-content-between align-items-center">
                <label class="form-label small mb-1">{{ t('scen.headers') }}</label>
                <button class="btn btn-sm btn-outline-secondary py-0" @click="addHeader(idx)"><i class="bi bi-plus-lg"></i></button>
              </div>
              <div v-for="(p, i) in s.headers" :key="i" class="input-group input-group-sm mb-1">
                <input v-model="p.key" type="text" class="form-control" placeholder="header" style="max-width:160px" />
                <input v-model="p.value" type="text" class="form-control" :placeholder="t('scenarioEditor.k3')" />
                <button class="btn btn-outline-danger" @click="removeHeader(idx, i)" tabindex="-1"><i class="bi bi-x-lg"></i></button>
              </div>
            </div>
            <div class="col-md-6">
              <div class="d-flex justify-content-between align-items-center">
                <label class="form-label small mb-1">{{ t('scen.queryParams') }}</label>
                <button class="btn btn-sm btn-outline-secondary py-0" @click="addQueryParam(idx)"><i class="bi bi-plus-lg"></i></button>
              </div>
              <div v-for="(p, i) in s.queryParams" :key="i" class="input-group input-group-sm mb-1">
                <input v-model="p.key" type="text" class="form-control" placeholder="key" style="max-width:160px" />
                <input v-model="p.value" type="text" class="form-control" placeholder="value" />
                <button class="btn btn-outline-danger" @click="removeQueryParam(idx, i)" tabindex="-1"><i class="bi bi-x-lg"></i></button>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div v-if="supportsBody(s.method)" class="mb-2">
            <label class="form-label small">Body (JSON, ${var} 사용 가능)</label>
            <CodeEditor v-model="s.body" language="javascript" />
          </div>

          <!-- 추출 변수 -->
          <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center">
              <label class="form-label small mb-1">
                <i class="bi bi-arrow-down-square me-1"></i>{{ t('scen.extractVars') }}
              </label>
              <button class="btn btn-sm btn-outline-secondary py-0" @click="addExtraction(idx)"><i class="bi bi-plus-lg"></i></button>
            </div>
            <div v-for="(ex, i) in s.extractions" :key="i" class="input-group input-group-sm mb-1">
              <input v-model="ex.varName" type="text" class="form-control" :placeholder="t('scen.varName')" style="max-width:160px" />
              <span class="input-group-text">←</span>
              <input v-model="ex.jsonPath" type="text" class="form-control" :placeholder="t('scen.jsonPath')" />
              <button class="btn btn-outline-danger" @click="removeExtraction(idx, i)" tabindex="-1"><i class="bi bi-x-lg"></i></button>
            </div>
          </div>

          <!-- ★ v1.11.6 검증 — 상태 코드 + 응답 값 -->
          <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center">
              <label class="form-label small mb-1">
                <i class="bi bi-check2-square me-1"></i>{{ t('scen.assertions') }}
              </label>
              <button class="btn btn-sm btn-outline-secondary py-0" @click="addAssertion(idx)"><i class="bi bi-plus-lg"></i></button>
            </div>
            <div class="input-group input-group-sm mb-1">
              <span class="input-group-text">{{ t('scen.expectStatus') }}</span>
              <input v-model="s.expectStatus" type="text" class="form-control" :placeholder="t('scen.expectStatusHint')" style="max-width:180px" />
              <span class="input-group-text">{{ t('scen.delay') }}</span>
              <input v-model.number="s.delayMs" type="number" min="0" class="form-control" placeholder="0" style="max-width:110px" />
              <span class="input-group-text">ms</span>
            </div>
            <div v-for="(a, i) in (s.assertions || [])" :key="i" class="input-group input-group-sm mb-1">
              <input v-model="a.path" type="text" class="form-control" :placeholder="t('scen.assertPath')" />
              <select v-model="a.op" class="form-select" style="max-width:150px">
                <option v-for="[v, l] in ASSERT_OPS" :key="v" :value="v">{{ l }}</option>
              </select>
              <input v-if="!['exists','empty','notEmpty'].includes(a.op)" v-model="a.value" type="text" class="form-control" :placeholder="t('scen.assertValue')" />
              <button class="btn btn-outline-danger" @click="removeAssertion(idx, i)" tabindex="-1"><i class="bi bi-x-lg"></i></button>
            </div>
          </div>

          <!-- 옵션 -->
          <label class="form-check small">
            <input type="checkbox" class="form-check-input me-1" v-model="s.stopOnFailure" />
            {{ t('scen.stopOnFail') }}
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
