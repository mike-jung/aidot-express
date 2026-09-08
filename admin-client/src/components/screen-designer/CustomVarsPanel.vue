<script setup>
/**
 * CustomVarsPanel — 프로젝트의 customVars 배열을 추가/수정/삭제 + 자동 변수 표시.
 *
 *  Phase 19 추가:
 *    데이터 소스가 설정된 widget 들에 대해 "자동 변수" 를 계산해서 표시.
 *    자동 변수는:
 *     - 읽기 전용 (추가/수정/삭제 불가)
 *     - 사용자 정의 변수에서 expression 으로 참조 가능
 *     - widget.title 을 기반으로 naming ( 없으면 widget.id )
 *
 *    예:
 *     widget #w1 (kind=list, source=endpoint, title='학생 목록') →
 *     자동 변수 'students' = 'widget w1 의 데이터 (rows)'
 *     사용자가 파생 변수 작성 가능:
 *       activeStudents = students.filter(s => s.active)
 *       totalCount = students.length
 *
 *  props:
 *    vars: customVars 배열 (reactive)   — 사용자 정의 computed
 *    autoVars: Array<{name, source}>     — widget 에서 유도된 자동 변수 (optional)
 *  emits:
 *    update:vars(nextArray)
 */
import { ref, computed } from 'vue';
import { useI18n } from '../../composables/useI18n';

/* ★ v1.20.0 — t() 를 쓰면 선언도 있어야 한다 */
const { t } = useI18n();

const props = defineProps({
  vars:     { type: Array, default: () => [] },
  autoVars: { type: Array, default: () => [] },  // Phase 19
});
const emit = defineEmits(['update:vars']);

const draft = ref({ name: '', expression: '' });
const error = ref('');
const expanded = ref(false);

// JS 식별자 validator
const ID_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const RESERVED = new Set([
  'class', 'const', 'let', 'var', 'function', 'return', 'if', 'else',
  'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'new', 'this', 'super', 'true', 'false', 'null', 'undefined',
  'import', 'export', 'default', 'try', 'catch', 'finally', 'throw',
  'typeof', 'instanceof', 'in', 'of', 'delete', 'void', 'yield',
  'async', 'await',
]);

function isValidName(name, existingNames) {
  if (!name) return '이름을 입력하세요.';
  if (!ID_RE.test(name)) return '식별자 형식이 아닙니다 (a-z, A-Z, 0-9, _, $ 만).';
  if (RESERVED.has(name)) return '예약어는 사용할 수 없습니다.';
  if (existingNames.includes(name)) return '이미 같은 이름이 있습니다.';
  return null;
}

function addVar() {
  error.value = '';
  const name = draft.value.name.trim();
  const expr = draft.value.expression.trim();
  // Phase 19: 사용자 변수 + 자동 변수 이름 모두와 충돌 검사
  const existing = [
    ...props.vars.map((v) => v.name),
    ...props.autoVars.map((v) => v.name),
  ];
  const err = isValidName(name, existing);
  if (err) { error.value = err; return; }
  if (!expr) { error.value = '표현식을 입력하세요.'; return; }
  emit('update:vars', [...props.vars, { name, expression: expr }]);
  draft.value = { name: '', expression: '' };
}

function removeVar(name) {
  emit('update:vars', props.vars.filter((v) => v.name !== name));
}

function updateExpression(name, expression) {
  emit('update:vars', props.vars.map((v) =>
    v.name === name ? { ...v, expression } : v
  ));
}
</script>

<template>
  <div class="vars-panel card">
    <!-- 헤더 (클릭으로 펼침/접힘) -->
    <button class="card-header panel-toggle" @click="expanded = !expanded">
      <span class="d-flex align-items-center w-100">
        <i class="bi bi-braces me-2"></i>
        <span class="fw-semibold">{{ t('customVarsPanel.k1') }}</span>
        <span class="badge bg-secondary ms-2">{{ vars.length + autoVars.length }}</span>
        <span v-if="autoVars.length" class="badge bg-info ms-1" :title="t('customVarsPanel.k3')">
          auto {{ autoVars.length }}
        </span>
        <i class="bi ms-auto"
           :class="expanded ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
      </span>
    </button>

    <div v-if="expanded" class="card-body">
      <p class="small text-secondary mb-3">
        {{ t('customVarsPanel.k2') }}
      </p>

      <!-- Phase 19: 자동 변수 (widget 데이터 소스에서 유도) -->
      <div v-if="autoVars.length" class="auto-vars mb-3">
        <div class="section-label d-flex align-items-center">
          <i class="bi bi-link-45deg me-1"></i>
          {{ t('customVarsPanel.k3') }} <span class="text-muted fw-normal">{{ t('customVarsPanel.k4') }}</span>
        </div>
        <div class="var-list">
          <div v-for="v in autoVars" :key="'auto-' + v.name" class="var-row auto-row">
            <code class="var-name auto-name">{{ v.name }}</code>
            <div class="var-expr auto-expr">
              <i class="bi bi-arrow-left-right text-info me-1"></i>
              <span class="small">{{ v.source }}</span>
            </div>
            <button class="btn btn-sm btn-light" disabled :title="t('customVarsPanel.k11')">
              <i class="bi bi-lock"></i>
            </button>
          </div>
        </div>
        <div class="form-text small mt-1">
          {{ t('customVarsPanel.k5') }} <code>{{ autoVars[0]?.name }}.rows</code> {{ t('customVarsPanel.k6') }}
        </div>
      </div>

      <!-- 사용자 정의 변수 목록 -->
      <div v-if="vars.length" class="var-list mb-3">
        <div class="section-label" v-if="autoVars.length">
          <i class="bi bi-braces me-1"></i>{{ t('customVarsPanel.k7') }}
        </div>
        <div v-for="v in vars" :key="v.name" class="var-row">
          <code class="var-name">{{ v.name }}</code>
          <input class="form-control form-control-sm var-expr"
                 :value="v.expression"
                 @change="updateExpression(v.name, $event.target.value)"
                 :placeholder="t('customVarsPanel.k12')" />
          <button class="btn btn-sm btn-outline-danger"
                  @click="removeVar(v.name)" :title="t('customVarsPanel.k13')">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <!-- 새 변수 추가 -->
      <div class="add-form">
        <div class="section-label">{{ t('customVarsPanel.k8') }}</div>
        <div class="d-flex gap-2">
          <input v-model="draft.name"
                 class="form-control form-control-sm"
                 style="max-width: 140px;"
                 :placeholder="t('customVarsPanel.k14')" />
          <input v-model="draft.expression"
                 class="form-control form-control-sm"
                 :placeholder="autoVars.length
                   ? `예: ${autoVars[0].name}.rows.filter(r => r.active).length`
                   : t('customVarsPanel.k15')"
                 @keyup.enter="addVar" />
          <button class="btn btn-sm btn-primary" @click="addVar">
            <i class="bi bi-plus-lg"></i>
          </button>
        </div>
        <div v-if="error" class="text-danger small mt-1">
          <i class="bi bi-exclamation-triangle me-1"></i>{{ error }}
        </div>
        <div class="form-text small">
          {{ t('customVarsPanel.k9') }} <code>computed(() => ...)</code> {{ t('customVarsPanel.k10') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-toggle {
  background: #f8fafc;
  border: none;
  padding: 0.6rem 1rem;
  width: 100%;
  text-align: left;
  cursor: pointer;
}
.panel-toggle:hover { background: #f1f5f9; }

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.5rem;
}

.var-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.var-row {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  gap: 0.5rem;
  align-items: center;
}
.var-name {
  background: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.var-expr {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.8rem;
}

.add-form {
  border-top: 1px dashed #e5e7eb;
  padding-top: 0.75rem;
}
</style>
