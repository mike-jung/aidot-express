<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import CodeEditor from '../components/CodeEditor.vue';
import { getScenario } from '../utils/scenarioStore';
import { runScenario } from '../utils/scenarioRunner';
import { useI18n } from '../composables/useI18n';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { t } = useI18n();

const scenario = ref(null);
const error = ref(null);
const running = ref(false);
const stepResults = ref([]);   // 인덱스별 결과
const stepStatus = ref([]);    // 'pending' | 'running' | 'done'
const finalVars = ref({});

const useAdminToken = ref(true);

async function load() {
  const sc = await getScenario(route.params.id);
  if (!sc) { error.value = t('designer.scn_notFound'); return; }
  scenario.value = sc;
  resetResults();
}

function resetResults() {
  stepResults.value = [];
  stepStatus.value = (scenario.value?.steps || []).map(() => 'pending');
  finalVars.value = {};
}

async function run() {
  if (!scenario.value) return;
  running.value = true;
  resetResults();

  // 어드민 토큰을 기본 헤더에 자동 추가하는 옵션
  const baseHeaders = { ...(scenario.value.defaultHeaders || {}) };
  if (useAdminToken.value && auth.accessToken && !baseHeaders.Authorization) {
    baseHeaders.Authorization = `Bearer ${auth.accessToken}`;
  }

  try {
    const result = await runScenario(
      { ...scenario.value, defaultHeaders: baseHeaders },
      {
        onStepStart: (idx) => { stepStatus.value[idx] = 'running'; },
        onStepEnd: (idx, _step, result, varsAfter) => {
          stepStatus.value[idx] = 'done';
          stepResults.value[idx] = result;
          finalVars.value = varsAfter;
        },
      },
    );
    finalVars.value = result.vars;
  } catch (e) {
    error.value = e.message;
  } finally {
    running.value = false;
  }
}

function statusBadge(s) {
  if (!s) return 'bg-secondary';
  if (!s.ok) return 'bg-danger';
  if (s.status >= 200 && s.status < 300) return 'bg-success';
  if (s.status >= 300 && s.status < 400) return 'bg-info text-dark';
  if (s.status >= 400 && s.status < 500) return 'bg-warning text-dark';
  return 'bg-danger';
}

function statusIcon(state) {
  if (state === 'running') return 'bi-arrow-clockwise spin';
  if (state === 'done') return 'bi-check-circle';
  return 'bi-circle';
}

const overallSummary = computed(() => {
  const total = stepStatus.value.length;
  const done = stepStatus.value.filter(s => s === 'done').length;
  const failed = stepResults.value.filter(r => r && !r.ok).length;
  const succeeded = stepResults.value.filter(r => r && r.ok).length;
  return { total, done, failed, succeeded };
});

onMounted(load);
</script>

<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <span>
        <i class="bi bi-play-circle me-2"></i>
        {{ t('designer.scn_runTitle') }}
        <small v-if="scenario" class="text-secondary ms-2">{{ scenario.name }}</small>
      </span>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" @click="router.push({ name: 'scenarios' })">목록</button>
        <button v-if="scenario" class="btn btn-sm btn-outline-secondary"
                @click="router.push({ name: 'scenario-edit', params: { id: scenario.id } })">
          편집
        </button>
        <button class="btn btn-sm btn-success" @click="run" :disabled="running || !scenario">
          <span v-if="running" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="bi bi-play-fill me-1"></i>{{ t('designer.scn_run') }}
        </button>
      </div>
    </div>

    <div class="card-body">
      <div v-if="error" class="alert alert-danger small">{{ error }}</div>

      <div v-if="scenario">
        <p v-if="scenario.description" class="text-secondary small mb-2">{{ scenario.description }}</p>

        <label class="form-check small mb-3">
          <input type="checkbox" class="form-check-input me-2" v-model="useAdminToken" />
          {{ t('designer.scn_autoAuth') }}
        </label>

        <!-- 진행 요약 -->
        <div v-if="stepStatus.some(s => s !== 'pending')" class="mb-3 small">
          {{ t('designer.scn_progress') }}: <strong>{{ overallSummary.done }}/{{ overallSummary.total }}</strong>
          · 성공 <span class="text-success">{{ overallSummary.succeeded }}</span>
          · 실패 <span class="text-danger">{{ overallSummary.failed }}</span>
        </div>

        <!-- 단계별 결과 -->
        <div v-for="(s, idx) in scenario.steps" :key="idx"
             class="mb-3 p-3 rounded"
             :style="stepResults[idx] && !stepResults[idx].ok
                     ? 'background:#fff3f0; border:1px solid #ffaaa0'
                     : 'background:#f6f7f9; border:1px solid #e0e3e7'">
          <div class="d-flex align-items-center gap-2 mb-2">
            <i :class="statusIcon(stepStatus[idx])" class="bi"></i>
            <span class="badge bg-secondary">{{ idx + 1 }}</span>
            <strong>{{ s.name }}</strong>
            <span class="badge" :class="['bg-primary'][0]" style="background:#1b84ff !important">{{ s.method }}</span>
            <code class="small flex-grow-1">{{ s.fullPath }}</code>
            <template v-if="stepResults[idx]">
              <span class="badge" :class="statusBadge(stepResults[idx])">
                {{ stepResults[idx].status || 'ERR' }}
              </span>
              <small class="text-secondary">{{ stepResults[idx].timeMs }}ms</small>
            </template>
          </div>

          <!-- 결과 상세 -->
          <div v-if="stepResults[idx]">
            <div v-if="stepResults[idx].error" class="alert alert-danger small mb-2 py-1">
              {{ stepResults[idx].error }}
            </div>

            <details class="small mb-2">
              <summary class="text-secondary">최종 호출 URL: <code>{{ stepResults[idx].finalUrl }}</code></summary>
              <div v-if="stepResults[idx].requestBody" class="mt-2">
                <small class="text-secondary">요청 body:</small>
                <pre class="mb-0 p-2 small font-monospace" style="background:#1e2129; color:#aab; border-radius:4px">{{ stepResults[idx].requestBody }}</pre>
              </div>
            </details>

            <div v-if="stepResults[idx].assertionResults?.length" class="small mb-2 p-2 rounded" style="background:#f8f9fa; border:1px solid #dee2e6">
              <strong>{{ t('scen.assertions') }}:</strong>
              <div v-for="(a, i) in stepResults[idx].assertionResults" :key="i" :class="a.ok ? 'text-success' : 'text-danger'">
                <i class="bi" :class="a.ok ? 'bi-check-circle' : 'bi-x-circle'"></i>
                <code>{{ a.path }}</code> {{ a.op }} <code v-if="a.expected !== undefined && a.expected !== ''">{{ a.expected }}</code>
                <span class="text-secondary">— {{ t('scen.actual') }} <code>{{ a.actual === undefined ? 'undefined' : a.actual }}</code></span>
              </div>
            </div>

            <div v-if="stepResults[idx].responseBody" class="mb-2">
              <label class="form-label small mb-1">응답 Body</label>
              <CodeEditor :model-value="stepResults[idx].responseBody" language="javascript" :readonly="true" />
            </div>

            <div v-if="stepResults[idx].extracted && Object.keys(stepResults[idx].extracted).length"
                 class="small mb-2 p-2 rounded" style="background:#f0f9ff; border:1px solid #b6dcff">
              <strong class="text-primary">추출된 변수:</strong>
              <span v-for="(v, k) in stepResults[idx].extracted" :key="k" class="ms-2">
                <code>{{ k }}</code> = <code>{{ v === undefined ? 'undefined' : JSON.stringify(v) }}</code>
              </span>
            </div>
          </div>
        </div>

        <!-- 최종 변수 상태 -->
        <div v-if="Object.keys(finalVars).length" class="mt-3 p-2 rounded" style="background:#1e2129; color:#aab">
          <small><strong>최종 변수 상태</strong></small>
          <pre class="mb-0 small font-monospace" style="color:#aab">{{ JSON.stringify(finalVars, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bi.spin {
  animation: spin 1s linear infinite;
  display: inline-block;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
