<script setup>
/**
 * LoadStateCell — 이 파일이 지금 서버에 **올라와 있는지** 보여 주고, 아니면 그 자리에서 올린다.
 *
 *  왜 필요한가
 *    편집기로 workspace/ 에 파일을 직접 넣으면 목록에는 보이지만 라우팅이 되지 않는다.
 *    지금까지는 서버를 다시 켜야 했고, 화면에는 그 사실이 드러나지도 않았다.
 *
 *  왜 줄마다 두는가
 *    "안 올라온 것 전부 올리기" 만 있으면, 여러 개가 대기 중일 때 **원하는 하나만** 올릴 수 없다.
 *    그래서 각 줄에 상태와 올리기 단추를 함께 둔다.
 */
import { ref } from 'vue';
import http from '../api/http';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();

const props = defineProps({
  kind: { type: String, required: true },   // 'controller' | 'service' | 'sql'
  name: { type: String, required: true },
  loaded: { type: Boolean, default: false },
});
const emit = defineEmits(['loaded']);

const busy = ref(false);
const error = ref('');

async function loadOne() {
  busy.value = true; error.value = '';
  try {
    const r = await http.post('/api/admin/workspace/load-one', { kind: props.kind, name: props.name });
    if (r.data?.data?.loaded) emit('loaded', props.name);
    else error.value = t('loadState.stillUnloaded');
  } catch (e) {
    error.value = e?.response?.data?.message || String(e.message || e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <span v-if="loaded" class="badge bg-success-subtle text-success-emphasis border border-success-subtle"
        :title="t('loadState.loadedHint')">
    <i class="bi bi-check-circle me-1"></i>{{ t('loadState.loaded') }}
  </span>
  <span v-else class="d-inline-flex align-items-center gap-1">
    <span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"
          :title="t('loadState.unloadedHint')">
      <i class="bi bi-exclamation-circle me-1"></i>{{ t('loadState.unloaded') }}
    </span>
    <button type="button" class="btn btn-sm btn-outline-primary py-0 px-1"
            :disabled="busy" :title="t('loadState.loadThis')" @click.stop="loadOne">
      <i :class="busy ? 'bi bi-hourglass-split' : 'bi bi-box-arrow-in-down'"></i>
    </button>
    <i v-if="error" class="bi bi-x-circle text-danger" :title="error"></i>
  </span>
</template>
