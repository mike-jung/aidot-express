<script setup>
/* ⚠ 이 안의 <button> 에는 반드시 type="button" 을 준다.
   type 이 없으면 브라우저가 submit 으로 보고, 이 컴포넌트가 폼 안에 놓이는 순간
   [전송] 을 누를 때마다 **페이지 전체가 새로고침**된다(화면이 깜박이는 증상). */
/**
 * ApiTester — 단일 컨트롤러의 라우트들을 셀렉트해서 호출하는 모달.
 * 호출 폼 본체는 ApiCallForm 으로 분리되어 있음.
 *
 * Props:
 *   controller: { name, basePath, controller_type, mci, routes:[{method, path, handler}] }
 *
 * Phase 37 (patch-16): EAI 컨트롤러의 경우, controller.mci.inputMapping 을 기반으로
 *   ApiCallForm 에 prefill.bodyFields 를 전달. 사용자가 POST /api/mci/xxx 호출 시
 *   body 가 비어있는 상태로 혼란스러워하는 문제 해결.
 */
import { ref, computed, onMounted } from 'vue';
import ApiCallForm from './ApiCallForm.vue';
import { useDraggable } from '../composables/useDraggable';

const { modalRef, headerRef } = useDraggable();

const props = defineProps({
  controller: { type: Object, required: true },
});
defineEmits(['close']);

function joinPath(base, sub) {
  const a = (base || '').replace(/\/+$/, '');
  const b = (sub || '').replace(/^\/+/, '');
  return '/' + [a, b].filter(Boolean).join('/').replace(/^\/+/, '');
}

const routes = computed(() => {
  const base = props.controller?.basePath || '';
  return (props.controller?.routes || []).map((r, i) => ({
    idx: i,
    method: (r.method || 'get').toUpperCase(),
    handler: r.handler || r.handlerName || `route${i}`,
    fullPath: joinPath(base, r.path || '/'),
  }));
});

const selectedIdx = ref(0);
const selectedRoute = computed(() => routes.value[selectedIdx.value] || null);

/**
 * Phase 37 (patch-16): EAI 컨트롤러의 입력 매핑을 body 필드로 변환.
 *   controller.mci.inputMapping = [{ apiName, mciName, desc }, ...]
 *   → prefill.bodyFields = [{ key: apiName, value: '', type: 'string' }, ...]
 *
 *   type04 (마스터+디테일) 은 inputMapping 외에도 masterMapping, detailItemMapping 이 있음.
 *   여기선 inputMapping 을 우선하되, 비어있으면 masterMapping 으로 fallback.
 */
const mciPrefill = computed(() => {
  const type = String(props.controller?.controller_type || '').toUpperCase();
  if (type !== 'MCI') return null;
  const mci = props.controller?.mci;
  if (!mci) return null;

  // 주 입력 매핑 선택 — inputMapping 을 1순위, 비어있으면 masterMapping
  let fields = [];
  if (Array.isArray(mci.inputMapping) && mci.inputMapping.length) {
    fields = mci.inputMapping.slice();
  } else if (Array.isArray(mci.masterMapping) && mci.masterMapping.length) {
    fields = mci.masterMapping.slice();
  }

  // 중첩 (type03) / detailItem 은 일단 평면 bodyField 로는 표현 불가 → JSON 모드에서 직접 편집 유도
  const bodyFields = fields.map((m) => ({
    key: m.apiName || m.mciName,
    value: '',
    type: 'string',
  }));

  // type04 의 경우 detailList 배열 필드를 JSON 타입으로 추가 (편집 불가한 placeholder)
  if (Array.isArray(mci.detailItemMapping) && mci.detailItemMapping.length && mci.detailParamName) {
    const detailSample = mci.detailItemMapping.reduce((acc, m) => {
      acc[m.apiName || m.mciName] = '';
      return acc;
    }, {});
    bodyFields.push({
      key: mci.detailParamName || 'detailList',
      value: JSON.stringify([detailSample]),
      type: 'json',
    });
  }

  return bodyFields.length ? { bodyFields } : null;
});

onMounted(() => { if (routes.value.length > 0) selectedIdx.value = 0; });
</script>

<template>
  <div class="app-modal-backdrop" @mousedown.self="$emit('close')">
    <div ref="modalRef" class="app-modal" style="max-width:1100px">
      <div ref="headerRef" class="modal-header">
        <h5 class="mb-0">
          <i class="bi bi-send-fill text-primary me-2"></i>
          API 테스터 — <code class="text-dark">{{ controller.name }}</code>
          <!-- Phase 37 (patch-16): EAI 컨트롤러임을 헤더에서도 표시 -->
          <span v-if="mciPrefill" class="badge bg-warning text-dark ms-2" style="font-size:10px">
            <i class="bi bi-plug-fill me-1"></i>MCI
          </span>
        </h5>
        <button type="button" class="btn-close" @click="$emit('close')"></button>
      </div>

      <div class="modal-body">
        <div v-if="!routes.length" class="alert alert-warning">
          이 컨트롤러에 등록된 라우트가 없습니다.
        </div>
        <div v-else>
          <div class="mb-3">
            <label class="form-label small">호출할 라우트</label>
            <select v-model.number="selectedIdx" class="form-select form-select-sm">
              <option v-for="r in routes" :key="r.idx" :value="r.idx">
                [{{ r.method }}] {{ r.fullPath }}  →  {{ r.handler }}
              </option>
            </select>
          </div>

          <!-- Phase 37 (patch-16): EAI 컨트롤러 안내 -->
          <div v-if="mciPrefill" class="alert alert-info py-2 small mb-3">
            <i class="bi bi-info-circle me-1"></i>
            <strong>EAI 컨트롤러</strong> — 입력값은 Body (JSON) 로 전달됩니다.
            아래 필드들은 분석 결과에서 자동으로 채워진 EAI 입력 파라미터입니다.
            값을 입력한 후 "전송" 버튼을 누르세요.
          </div>

          <ApiCallForm v-if="selectedRoute" :route="selectedRoute" :prefill="mciPrefill" :key="selectedIdx" />
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="$emit('close')">닫기</button>
      </div>
    </div>
  </div>
</template>
