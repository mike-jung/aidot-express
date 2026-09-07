<script setup>
/**
 * SqlStepsEditor — 다중 SQL 호출 단계 편집 (시각적 매핑 + 드래그 앤 드롭).
 *
 *  Props:
 *    modelValue: { sqlSteps: [...], useTransaction: bool, returnExpr: string }
 *    sqlOptions: [{ id, name }]
 *
 *  각 step 의 paramsExpr 는 두 가지 방식:
 *    (A) paramMappings: { :param 이름 → JS 표현식 } (자동 모드, 기본)
 *    (B) paramsExpr:    '{ id: params.x, ... }' (직접 입력 모드, 토글)
 */
import { computed, ref, watch, onMounted } from 'vue';
import http from '../api/http';
import { fakeValueFor } from '../utils/testDataGenerator';
import { useI18n } from '../composables/useI18n';

/* ★ v1.20.0 — t() 를 쓰면 선언도 있어야 한다 */
const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ sqlSteps: [], useTransaction: false, returnExpr: '' }),
  },
  sqlOptions: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

// SQL 파일별 쿼리/params 캐시 — { 'user': [{ name: 'findById', params: ['id'] }, ...] }
const sqlMetaCache = ref({});

// action 카탈로그
const actionCatalog = ref([
  { action: 'execute',  label: 'execute' },
  { action: 'rows',     label: 'rows' },
  { action: 'first',    label: 'first' },
  { action: 'affected', label: 'affected' },
  { action: 'insertId', label: 'insertId' },
  { action: 'count',    label: 'count' },
  { action: 'exists',   label: 'exists' },
]);

onMounted(async () => {
  try {
    const r = await http.get('/api/admin/controllers/sql-actions');
    if (r.data?.data?.length) actionCatalog.value = r.data.data;
  } catch { /* fallback 사용 */ }
});

function update(patch) {
  emit('update:modelValue', { ...props.modelValue, ...patch });
}

function addStep() {
  const sqlSteps = [...(props.modelValue.sqlSteps || []), {
    varName: 'result' + ((props.modelValue.sqlSteps?.length || 0) + 1),
    sqlFile: '',
    queryName: '',
    paramMappings: {},   // ★ 기본은 매핑 모드
    paramsExpr: '',
    rawMode: false,      // 사용자가 토글로 직접 입력 모드 선택
    action: 'execute',
  }];
  update({ sqlSteps });
}

function removeStep(idx) {
  const sqlSteps = [...(props.modelValue.sqlSteps || [])];
  sqlSteps.splice(idx, 1);
  update({ sqlSteps });
}

function moveStep(idx, dir) {
  const sqlSteps = [...(props.modelValue.sqlSteps || [])];
  const j = idx + dir;
  if (j < 0 || j >= sqlSteps.length) return;
  [sqlSteps[idx], sqlSteps[j]] = [sqlSteps[j], sqlSteps[idx]];
  update({ sqlSteps });
}

function patchStep(idx, patch) {
  const sqlSteps = [...(props.modelValue.sqlSteps || [])];
  sqlSteps[idx] = { ...sqlSteps[idx], ...patch };
  update({ sqlSteps });
}

/** SQL 파일 로드 — 쿼리/params 메타 캐시 */
async function loadSqlMeta(sqlFile) {
  if (!sqlFile || sqlMetaCache.value[sqlFile]) return;
  try {
    const r = await http.get(`/api/admin/sqls/${sqlFile}`);
    const queriesWithParams = r.data.data?.queriesWithParams || [];
    sqlMetaCache.value = { ...sqlMetaCache.value, [sqlFile]: queriesWithParams };
  } catch {
    sqlMetaCache.value = { ...sqlMetaCache.value, [sqlFile]: [] };
  }
}

async function onSqlFileChange(idx, sqlFile) {
  patchStep(idx, { sqlFile, queryName: '', paramMappings: {} });
  await loadSqlMeta(sqlFile);
}

function onQueryChange(idx, queryName) {
  // 쿼리 변경 시 paramMappings 초기화 (이전 쿼리의 파라미터 키가 다를 수 있음)
  const sqlFile = props.modelValue.sqlSteps[idx].sqlFile;
  const meta = sqlMetaCache.value[sqlFile] || [];
  const queryMeta = meta.find((q) => q.name === queryName);
  const params = queryMeta?.params || [];
  // 기존 매핑에서 같은 이름이 있는 것은 보존
  const oldMappings = props.modelValue.sqlSteps[idx].paramMappings || {};
  const newMappings = {};
  for (const p of params) newMappings[p] = oldMappings[p] || '';
  patchStep(idx, { queryName, paramMappings: newMappings });
}

function setMapping(idx, paramName, expr) {
  const step = props.modelValue.sqlSteps[idx];
  const newMappings = { ...(step.paramMappings || {}), [paramName]: expr };
  patchStep(idx, { paramMappings: newMappings });
}

/** 빈 매핑들에 fake 값을 자동으로 채움 (이미 채워진 것은 건드리지 않음) */
function fillFakeData(idx) {
  const step = props.modelValue.sqlSteps[idx];
  const params = getQueryParams(step);
  const newMappings = { ...(step.paramMappings || {}) };
  for (const p of params) {
    if (newMappings[p] && String(newMappings[p]).trim()) continue;  // 이미 채워짐
    const v = fakeValueFor(p);
    if (typeof v === 'string') newMappings[p] = `'${v}'`;
    else newMappings[p] = String(v);
  }
  patchStep(idx, { paramMappings: newMappings });
}

function toggleRawMode(idx) {
  const step = props.modelValue.sqlSteps[idx];
  // 매핑 → 직접: 현재 매핑을 paramsExpr 로 직렬화 (편집 출발점)
  if (!step.rawMode) {
    const pairs = Object.entries(step.paramMappings || {})
      .filter(([_, v]) => v && String(v).trim())
      .map(([k, v]) => `${k}: ${v}`);
    const expr = pairs.length ? `{ ${pairs.join(', ')} }` : '{}';
    patchStep(idx, { rawMode: true, paramsExpr: expr });
  } else {
    patchStep(idx, { rawMode: false });
  }
}

/** 현재 step 에서 사용 가능한 변수 (params + 이전 단계의 varName) */
function getAvailableVars(idx) {
  const out = ['params.id', 'params.userId', 'params.name', 'params'];
  for (let i = 0; i < idx; i++) {
    const v = props.modelValue.sqlSteps[i]?.varName;
    if (v && v.trim()) out.push(v);
  }
  return out;
}

/** 선택한 쿼리의 파라미터 목록 */
function getQueryParams(step) {
  if (!step.sqlFile || !step.queryName) return [];
  const meta = sqlMetaCache.value[step.sqlFile] || [];
  const q = meta.find((qq) => qq.name === step.queryName);
  return q?.params || [];
}

/* ──── 드래그 앤 드롭 ──── */

function onVarDragStart(e, varExpr) {
  e.dataTransfer.setData('text/plain', varExpr);
  e.dataTransfer.effectAllowed = 'copy';
}

function onMappingDrop(e, idx, paramName) {
  e.preventDefault();
  const expr = e.dataTransfer.getData('text/plain');
  if (expr) setMapping(idx, paramName, expr);
}

function onMappingDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

/* ──── 초기 로딩 ──── */

watch(() => props.modelValue?.sqlSteps, (steps) => {
  for (const s of steps || []) {
    if (s.sqlFile) loadSqlMeta(s.sqlFile);
  }
}, { immediate: true });
</script>

<template>
  <div class="sql-steps-editor">
    <!-- 옵션 -->
    <div class="row g-2 mb-2 align-items-center">
      <div class="col-md-4">
        <label class="form-check small">
          <input type="checkbox" class="form-check-input me-2"
                 :checked="modelValue.useTransaction"
                 @change="update({ useTransaction: $event.target.checked })" />
          {{ t('sqlStepsEditor.k1') }}
        </label>
      </div>
      <div class="col-md-8">
        <input type="text" class="form-control form-control-sm"
               :value="modelValue.returnExpr"
               @input="update({ returnExpr: $event.target.value })"
               :placeholder="t('sqlStepsEditor.k20')" />
      </div>
    </div>

    <!-- 단계 헤더 -->
    <div class="mb-2 small text-secondary d-flex justify-content-between align-items-center">
      <span><i class="bi bi-list-ol me-1"></i>{{ t('sqlStepsEditor.k2') }}</span>
      <button class="btn btn-sm btn-outline-primary" @click="addStep">
        <i class="bi bi-plus-lg me-1"></i>{{ t('sqlStepsEditor.k3') }}
      </button>
    </div>

    <div v-if="!(modelValue.sqlSteps?.length)" class="text-secondary small text-center py-2 border rounded">
      {{ t('sqlStepsEditor.k4') }}
    </div>

    <!-- 단계 목록 -->
    <div v-for="(s, idx) in modelValue.sqlSteps" :key="idx"
         class="sql-step-row mb-2 p-2 rounded"
         style="background:#f6f7f9; border:1px solid #e8eaee">
      <!-- 1행: 변수명 + SQL/쿼리/action + 컨트롤 -->
      <div class="d-flex align-items-center mb-2 gap-2">
        <span class="badge bg-secondary">{{ idx + 1 }}</span>
        <input type="text" class="form-control form-control-sm" style="width:140px"
               :value="s.varName" :placeholder="t('sqlStepsEditor.k21')"
               @input="patchStep(idx, { varName: $event.target.value })" />
        <select class="form-select form-select-sm" style="width:140px"
                :value="s.sqlFile"
                @change="onSqlFileChange(idx, $event.target.value)">
          <option value="">{{ t('sqlStepsEditor.k5') }}</option>
          <option v-for="opt in sqlOptions" :key="opt.id" :value="opt.name">{{ opt.name }}</option>
        </select>
        <select class="form-select form-select-sm" style="width:160px"
                :value="s.queryName"
                @change="onQueryChange(idx, $event.target.value)">
          <option value="">{{ t('sqlStepsEditor.k6') }}</option>
          <option v-for="q in (sqlMetaCache[s.sqlFile] || [])" :key="q.name" :value="q.name">
            {{ q.name }} ({{ q.params.length }}p)
          </option>
        </select>
        <select class="form-select form-select-sm" style="width:130px"
                :value="s.action"
                :title="actionCatalog.find(a => a.action === s.action)?.label || s.action"
                @change="patchStep(idx, { action: $event.target.value })">
          <option v-for="a in actionCatalog" :key="a.action" :value="a.action" :title="a.label">
            {{ a.action }}
          </option>
        </select>
        <span class="flex-grow-1"></span>
        <button class="btn btn-sm btn-outline-secondary" @click="moveStep(idx, -1)" :disabled="idx === 0" :title="t('sqlStepsEditor.k22')"><i class="bi bi-arrow-up"></i></button>
        <button class="btn btn-sm btn-outline-secondary" @click="moveStep(idx, 1)" :disabled="idx === modelValue.sqlSteps.length - 1" :title="t('sqlStepsEditor.k23')"><i class="bi bi-arrow-down"></i></button>
        <button class="btn btn-sm btn-outline-danger" @click="removeStep(idx)" :title="t('sqlStepsEditor.k24')"><i class="bi bi-x-lg"></i></button>
      </div>

      <!-- 2행: 파라미터 매핑 + 가용 변수 -->
      <div v-if="s.sqlFile && s.queryName" class="row g-2">
        <!-- 좌: 파라미터 매핑 -->
        <div class="col-md-8">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <label class="form-label small mb-0">
              <i class="bi bi-link-45deg me-1"></i>{{ t('sqlStepsEditor.k7') }}
              <span v-if="getQueryParams(s).length === 0" class="text-secondary ms-1">{{ t('sqlStepsEditor.k8') }}</span>
            </label>
            <div class="d-flex gap-2">
              <button v-if="!s.rawMode && getQueryParams(s).length > 0"
                      class="btn btn-sm btn-link p-0 text-secondary"
                      @click="fillFakeData(idx)" :title="t('sqlStepsEditor.k25')">
                <small>{{ t('sqlStepsEditor.k9') }}</small>
              </button>
              <button class="btn btn-sm btn-link p-0 text-secondary" @click="toggleRawMode(idx)">
                <small>{{ s.rawMode ? t('sqlStepsEditor.k27') : t('sqlStepsEditor.k28') }}</small>
              </button>
            </div>
          </div>

          <!-- 매핑 모드 -->
          <div v-if="!s.rawMode">
            <div v-if="getQueryParams(s).length === 0" class="text-secondary small fst-italic">
              {{ t('sqlStepsEditor.k10') }} <code>SELECT * FROM products</code>)
            </div>
            <div v-for="paramName in getQueryParams(s)" :key="paramName"
                 class="input-group input-group-sm mb-1 mapping-row"
                 @drop="onMappingDrop($event, idx, paramName)"
                 @dragover="onMappingDragOver">
              <span class="input-group-text" style="min-width:120px"
                    :title="`SQL의 :${paramName}`">
                <code class="small">:{{ paramName }}</code>
              </span>
              <input type="text" class="form-control form-control-sm font-monospace"
                     :value="s.paramMappings?.[paramName] || ''"
                     :placeholder="t('sqlStepsEditor.k26')"
                     @input="setMapping(idx, paramName, $event.target.value)" />
            </div>
          </div>

          <!-- 직접 입력 모드 -->
          <div v-else>
            <input type="text" class="form-control form-control-sm font-monospace"
                   :value="s.paramsExpr"
                   @input="patchStep(idx, { paramsExpr: $event.target.value })"
                   placeholder="{ id: params.userId, status: 'active' }" />
            <small class="text-secondary">
              {{ t('sqlStepsEditor.k11') }}
            </small>
          </div>
        </div>

        <!-- 우: 가용 변수 (드래그 소스) -->
        <div class="col-md-4">
          <label class="form-label small mb-1 text-secondary">
            <i class="bi bi-grid-3x3-gap me-1"></i>{{ t('sqlStepsEditor.k12') }}
          </label>
          <div class="d-flex flex-wrap gap-1" style="max-height:120px; overflow-y:auto">
            <span v-for="v in getAvailableVars(idx)" :key="v"
                  class="badge var-chip"
                  draggable="true"
                  @dragstart="onVarDragStart($event, v)"
                  @click="(() => {
                    const firstMissing = getQueryParams(s).find(p => !s.paramMappings?.[p]);
                    if (firstMissing) setMapping(idx, firstMissing, v);
                  })()"
                  :title="`드래그하거나 클릭하면 첫 빈 파라미터에 채워집니다`">
              {{ v }}
            </span>
          </div>
          <small class="text-secondary">
            <code>params.*</code>{{ t('sqlStepsEditor.k13') }}
          </small>
        </div>
      </div>

      <!-- SQL/쿼리 미선택 시 안내 -->
      <div v-else class="small text-secondary fst-italic">
        {{ t('sqlStepsEditor.k14') }}
      </div>
    </div>

    <!-- 푸터 안내 -->
    <div class="form-text small mt-1">
      <strong>action</strong>: <code>execute</code>{{ t('sqlStepsEditor.k15') }} <code>rows</code>{{ t('sqlStepsEditor.k16') }} <code>first</code>{{ t('sqlStepsEditor.k17') }} <code>affected</code>{{ t('sqlStepsEditor.k18') }} <code>insertId</code>{{ t('sqlStepsEditor.k19') }} <code>count</code>=COUNT / <code>exists</code>=boolean
    </div>
  </div>
</template>

<style scoped>
.var-chip {
  background: #e0e9ff;
  color: #1b4ddb;
  cursor: grab;
  user-select: none;
  font-family: monospace;
  font-weight: normal;
  font-size: 11px;
  padding: 4px 8px;
}
.var-chip:hover { background: #c7d8ff; }
.var-chip:active { cursor: grabbing; }

.mapping-row {
  transition: background 0.1s;
}
.mapping-row:has(.form-control:focus) {
  background: #fffbe6;
}
</style>
