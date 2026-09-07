<script setup>
/**
 * ConfirmDialog — useConfirm 의 상태를 그리는 전역 대화상자. (v1.7.7)
 *   MainLayout 에 한 번만 마운트한다.
 */
import { computed } from 'vue';
import BaseModal from './BaseModal.vue';
import { confirmState, resolveConfirm, canConfirm } from '../composables/useConfirm';

const ok = computed(() => canConfirm());
const isDanger = computed(() => confirmState.variant === 'danger');

function accept() { if (ok.value) resolveConfirm(true); }
function cancel() { resolveConfirm(false); }
</script>

<template>
  <BaseModal :open="confirmState.open"
             :title="confirmState.title"
             :icon="confirmState.icon"
             size="sm"
             @close="cancel">
    <div class="d-flex align-items-start">
      <i class="bi fs-4 me-3 flex-shrink-0"
         :class="isDanger ? 'bi-exclamation-triangle-fill text-danger' : 'bi-question-circle-fill text-primary'"></i>
      <div class="flex-grow-1">
        <p class="mb-1 fw-semibold" style="white-space: pre-line;">{{ confirmState.message }}</p>
        <p v-if="confirmState.detail" class="mb-0 small text-secondary" style="white-space: pre-line;">
          {{ confirmState.detail }}
        </p>

        <!-- 되돌릴 수 없는 작업 — 대상 이름을 정확히 입력해야 열린다 -->
        <div v-if="confirmState.requireText" class="mt-3">
          <label class="form-label small mb-1">
            확인을 위해 <code>{{ confirmState.requireText }}</code> 을(를) 입력하세요
          </label>
          <input v-model="confirmState.typed"
                 data-autofocus
                 type="text"
                 class="form-control form-control-sm"
                 autocomplete="off"
                 @keyup.enter="accept" />
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-secondary btn-sm" @click="cancel">
        {{ confirmState.cancelText }}
      </button>
      <button type="button"
              class="btn btn-sm"
              :class="isDanger ? 'btn-danger' : 'btn-primary'"
              :disabled="!ok"
              :data-autofocus="confirmState.requireText ? undefined : ''"
              @click="accept">
        {{ confirmState.confirmText }}
      </button>
    </template>
  </BaseModal>
</template>
