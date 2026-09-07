<script setup>
/**
 * ActionFormDialog — 데이터 소스가 INSERT/UPDATE 같은 입력 action 인 경우의 대화상자.
 *
 *  사용자 시나리오:
 *   1) 화면에 "추가" / "수정" 버튼이 있는 widget
 *   2) 클릭 시 이 대화상자가 뜨고, 파라미터마다 입력 필드 (text/number/date/boolean)
 *   3) "저장" 클릭 → 부모가 submit() 호출 → 성공 시 Toast "저장되었습니다"
 *
 *  props:
 *    title       : 대화상자 제목 ("학생 추가")
 *    params      : [{ name, type, required?, label?, placeholder? }]
 *    submitLabel : 기본 '저장'
 *    initial     : 초기값 (수정인 경우 기존 레코드)
 *    busy        : 진행 중 여부 (부모가 제어)
 *    error       : 에러 메시지
 *
 *  emits:
 *    close
 *    submit(formValues)
 *
 *  사용 예 (parent):
 *    <ActionFormDialog
 *      v-if="showForm"
 *      title="학생 추가"
 *      :params="[
 *        { name: 'name', type: 'text', label: '이름', required: true },
 *        { name: 'age',  type: 'number', label: '나이' },
 *      ]"
 *      :busy="saving"
 *      :error="submitError"
 *      @close="showForm = false"
 *      @submit="onSubmit"
 *    />
 */
import { ref, watch } from 'vue';

const props = defineProps({
  title:       { type: String,  default: '입력' },
  params:      { type: Array,   default: () => [] },
  submitLabel: { type: String,  default: '저장' },
  initial:     { type: Object,  default: () => ({}) },
  busy:        { type: Boolean, default: false },
  error:       { type: String,  default: '' },
});

const emit = defineEmits(['close', 'submit']);

const formValues = ref({});

function resetForm() {
  const v = {};
  for (const p of props.params) {
    v[p.name] = props.initial[p.name] ?? defaultForType(p.type);
  }
  formValues.value = v;
}

function defaultForType(type) {
  switch (type) {
    case 'number': return null;
    case 'boolean': return false;
    case 'date': return '';
    default: return '';
  }
}

watch(() => props.params, resetForm, { immediate: true, deep: true });
watch(() => props.initial, resetForm, { immediate: true, deep: true });

function onSubmit() {
  // 기본 validation: required 체크
  for (const p of props.params) {
    if (p.required) {
      const v = formValues.value[p.name];
      if (v == null || v === '') {
        return;   // 제출 안 됨 (UI 에서 required 속성이 브라우저 알림)
      }
    }
  }
  emit('submit', { ...formValues.value });
}
</script>

<template>
  <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.4);"
       @keydown.esc="emit('close')">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ title }}</h5>
          <button type="button" class="btn-close" @click="emit('close')" :disabled="busy"></button>
        </div>
        <form @submit.prevent="onSubmit">
          <div class="modal-body">
            <div v-for="p in params" :key="p.name" class="mb-3">
              <label class="form-label">
                {{ p.label || p.name }}
                <span v-if="p.required" class="text-danger">*</span>
              </label>

              <!-- type 별 분기 -->
              <input v-if="p.type === 'number'"
                     v-model.number="formValues[p.name]"
                     type="number"
                     class="form-control"
                     :placeholder="p.placeholder || ''"
                     :required="p.required"
                     :disabled="busy" />

              <input v-else-if="p.type === 'date'"
                     v-model="formValues[p.name]"
                     type="date"
                     class="form-control"
                     :required="p.required"
                     :disabled="busy" />

              <div v-else-if="p.type === 'boolean'" class="form-check form-switch">
                <input v-model="formValues[p.name]"
                       type="checkbox"
                       class="form-check-input"
                       :disabled="busy" />
                <label class="form-check-label small">예 / 아니오</label>
              </div>

              <textarea v-else-if="p.type === 'textarea'"
                        v-model="formValues[p.name]"
                        class="form-control"
                        rows="3"
                        :placeholder="p.placeholder || ''"
                        :required="p.required"
                        :disabled="busy"></textarea>

              <input v-else
                     v-model="formValues[p.name]"
                     type="text"
                     class="form-control"
                     :placeholder="p.placeholder || ''"
                     :required="p.required"
                     :disabled="busy" />

              <div v-if="p.hint" class="form-text">{{ p.hint }}</div>
            </div>

            <div v-if="error" class="alert alert-danger small mb-0 py-2">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ error }}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="emit('close')" :disabled="busy">취소</button>
            <button type="submit" class="btn btn-primary" :disabled="busy">
              <span v-if="busy" class="spinner-border spinner-border-sm me-2" role="status"></span>
              {{ submitLabel }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
