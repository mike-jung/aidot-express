<script setup>
/* ⚠ 이 안의 <button> 에는 반드시 type="button" 을 준다.
   type 이 없으면 브라우저가 submit 으로 보고, 이 컴포넌트가 폼 안에 놓이는 순간
   [전송] 을 누를 때마다 **페이지 전체가 새로고침**된다(화면이 깜박이는 증상). */
/**
 * ApiCallForm — 단일 라우트를 호출하는 폼 + 응답 표시 (인라인).
 *
 * Props:
 *   route: { method, fullPath, handler }
 *
 * 모달이 아닌 페이지에 그대로 임베드되도록 본체만 가짐.
 */
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import CodeEditor from './CodeEditor.vue';
import { useI18n } from '../composables/useI18n';

/* ★ v1.20.0 — t() 를 쓰면 선언도 있어야 한다 */
const { t } = useI18n();

const props = defineProps({
  route: { type: Object, required: true },
  /** 폼 사전 채우기: { pathParams, queryParams, headers, body } */
  prefill: { type: Object, default: null },
});
const emit = defineEmits(['called']);

const auth = useAuthStore();

// path 파라미터 (예: /:id, /:userId)
const pathParams = ref({});
const pathParamNames = computed(() => {
  const names = [];
  const re = /:([A-Za-z_][\w]*)/g;
  let m;
  while ((m = re.exec(props.route.fullPath)) !== null) names.push(m[1]);
  return names;
});

// 쿼리/헤더/바디
const queryParams = ref([]);
const headers = ref([]);
const bodyText = ref('{\n  \n}');
const useAdminToken = ref(true);

const supportsBody = computed(() =>
  ['POST', 'PUT', 'PATCH'].includes((props.route.method || '').toUpperCase()),
);

/**
 * Phase 37 (patch-16): body 내부 필드를 key/value 행으로 편집.
 *   supportsBody 인 method 에서 쓰이며, 사용자가 "+" 버튼으로 body 에 필드를 추가할 수 있음.
 *   bodyText (JSON 문자열) 는 이 배열에서 파생되지만, 사용자가 직접 JSON 을 수정해도
 *   parseBodyTextToFields() 로 역방향 동기화 가능 (onBlur 등에서).
 *
 *   bodyFields: [{ key, value, type: 'string'|'number'|'boolean'|'json' }]
 */
const bodyFields = ref([]);
/** body 수정 방식을 "필드 단위" 로 할지, 원시 JSON 에디터로 할지 토글 */
const bodyMode = ref('fields');  // 'fields' | 'json'

// 응답 상태
const sending = ref(false);
const responseStatus = ref(null);
const responseStatusText = ref('');
const responseBody = ref('');
const responseTimeMs = ref(null);
const responseHeaders = ref({});
const sendError = ref(null);

function addQueryParam() { queryParams.value.push({ key: '', value: '' }); }
function removeQueryParam(i) { queryParams.value.splice(i, 1); }
function addRequestCode() {
  // Phase 37 (patch-16): requestCode 위치를 method 에 맞게.
  //  POST/PUT/PATCH 에서 supportsBody 이고 bodyMode='fields' 라면 body 에 추가,
  //  그 외 (GET/DELETE) 또는 'json' 모드면 기존대로 query 에 추가.
  const code = `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  if (supportsBody.value && bodyMode.value === 'fields') {
    const existing = bodyFields.value.find((p) => p.key === 'requestCode');
    if (existing) existing.value = code;
    else bodyFields.value.push({ key: 'requestCode', value: code, type: 'string' });
    return;
  }
  const existing = queryParams.value.find((p) => p.key === 'requestCode');
  if (existing) existing.value = code;
  else queryParams.value.push({ key: 'requestCode', value: code });
}
function addHeader() { headers.value.push({ key: '', value: '' }); }
function removeHeader(i) { headers.value.splice(i, 1); }

/**
 * Phase 37 (patch-16): body 필드 조작.
 *   +/- 버튼 및 type select 로 값 타입을 변환.
 */
function addBodyField() { bodyFields.value.push({ key: '', value: '', type: 'string' }); }
function removeBodyField(i) { bodyFields.value.splice(i, 1); }

/** bodyFields → bodyText (JSON) 동기화 */
function fieldsToBodyText() {
  const out = {};
  for (const f of bodyFields.value) {
    if (!f.key) continue;
    let v = f.value;
    if (f.type === 'number') v = v === '' ? null : Number(v);
    else if (f.type === 'boolean') v = (v === true || v === 'true');
    else if (f.type === 'json') {
      try { v = JSON.parse(v || 'null'); } catch { /* 파싱 실패 시 원문 유지 */ }
    }
    out[f.key] = v;
  }
  bodyText.value = JSON.stringify(out, null, 2);
}

/** bodyText (JSON) → bodyFields 역동기화 (사용자가 JSON 모드에서 수정한 내용을 필드로) */
function parseBodyTextToFields() {
  try {
    const parsed = JSON.parse(bodyText.value || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      bodyFields.value = Object.entries(parsed).map(([k, v]) => {
        let type = typeof v;
        if (v === null) type = 'string';
        else if (Array.isArray(v) || (type === 'object')) type = 'json';
        else if (type === 'number') type = 'number';
        else if (type === 'boolean') type = 'boolean';
        else type = 'string';
        const value = (type === 'json') ? JSON.stringify(v) : (v == null ? '' : String(v));
        return { key: k, value, type };
      });
    }
  } catch { /* JSON 파싱 실패 시 필드 유지 */ }
}

/** 라우트 변경 시 path 파라미터 초기화 (이름 보존), 응답 초기화 */
watch(() => [props.route, props.prefill], () => {
  // path 파라미터 초기화 (이름 보존 또는 prefill에서)
  const next = {};
  for (const n of pathParamNames.value) {
    next[n] = props.prefill?.pathParams?.[n] ?? pathParams.value[n] ?? '';
  }
  pathParams.value = next;

  // prefill 이 있으면 query/headers/body 도 채움
  if (props.prefill) {
    queryParams.value = (props.prefill.queryParams || []).map((p) => ({ ...p }));
    headers.value = (props.prefill.headers || []).map((p) => ({ ...p }));
    if (props.prefill.body !== undefined) bodyText.value = props.prefill.body || '{\n  \n}';

    // Phase 37 (patch-16): prefill.bodyFields 가 있으면 body 를 필드 단위로 편집할 수 있도록 초기화.
    if (Array.isArray(props.prefill.bodyFields)) {
      bodyFields.value = props.prefill.bodyFields.map((f) => ({
        key: f.key || '',
        value: f.value == null ? '' : String(f.value),
        type: f.type || 'string',
      }));
      fieldsToBodyText();
      bodyMode.value = 'fields';
    } else if (props.prefill.body) {
      // body 가 JSON 문자열로만 들어온 경우에도 필드 모드로 파싱 시도
      parseBodyTextToFields();
    }
  } else {
    // prefill 없으면 bodyFields 초기화
    bodyFields.value = [];
  }

  responseStatus.value = null;
  responseBody.value = '';
  sendError.value = null;
}, { immediate: true, deep: true });

// Phase 37 (patch-16): bodyFields 변경 시 bodyText 자동 동기화 (fields 모드에서만).
watch(bodyFields, () => {
  if (bodyMode.value === 'fields') fieldsToBodyText();
}, { deep: true });

const builtUrl = computed(() => {
  let url = props.route.fullPath;
  for (const n of pathParamNames.value) {
    const v = pathParams.value[n] ?? '';
    url = url.replace(new RegExp(':' + n + '\\b'), encodeURIComponent(v));
  }
  const qs = queryParams.value
    .filter((p) => p.key)
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&');
  if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  return url;
});

async function send() {
  /* ★ v1.15.4 — 보내기 전에 **이전 응답을 지우지 않는다.**
     지우면 응답 영역(v-if)이 통째로 사라져 대화상자 높이가 확 줄었다가 다시 늘어난다 —
     그게 "전송할 때마다 깜박이는" 정체였다.
     지금은 이전 응답을 흐리게 둔 채로 두고, 새 응답이 오면 그 자리에서 바꿔치기한다. */
  sending.value = true;
  sendError.value = null;

  // Phase 37 (patch-16): 필드 모드에서 편집 중이었다면 전송 직전에 bodyText 로 강제 동기화.
  //  watch 가 deep 이지만 타이밍 이슈 방지 차원.
  if (supportsBody.value && bodyMode.value === 'fields') {
    fieldsToBodyText();
  }

  const h = {};
  for (const { key, value } of headers.value) {
    if (key && value) h[key] = value;
  }
  if (useAdminToken.value && auth.accessToken && !h.Authorization) {
    h.Authorization = `Bearer ${auth.accessToken}`;
  }

  let body = undefined;
  if (supportsBody.value && bodyText.value.trim()) {
    try {
      JSON.parse(bodyText.value);
      body = bodyText.value;
      if (!h['Content-Type']) h['Content-Type'] = 'application/json';
    } catch (e) {
      sendError.value = `Body JSON 파싱 실패: ${e.message}`;
      sending.value = false;
      return;
    }
  }

  const t0 = performance.now();
  try {
    const res = await fetch(builtUrl.value, {
      method: props.route.method,
      headers: h,
      body,
      credentials: 'include',
    });
    responseTimeMs.value = Math.round(performance.now() - t0);
    responseStatus.value = res.status;
    responseStatusText.value = res.statusText;
    res.headers.forEach((v, k) => { responseHeaders.value[k] = v; });

    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (ct.includes('application/json')) {
      try {
        responseBody.value = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        responseBody.value = text;
      }
    } else {
      responseBody.value = text;
    }
  } catch (e) {
    responseTimeMs.value = Math.round(performance.now() - t0);
    sendError.value = `네트워크 오류: ${e.message}`;
  } finally {
    sending.value = false;
  }

  // 호출 완료 — 부모에게 통지 (히스토리 저장 등)
  emit('called', {
    method: props.route.method,
    fullPath: props.route.fullPath,
    finalUrl: builtUrl.value,
    pathParams: { ...pathParams.value },
    queryParams: queryParams.value.map((p) => ({ ...p })),
    headers: headers.value.map((p) => ({ ...p })),
    body: supportsBody.value ? bodyText.value : '',
    status: responseStatus.value,
    statusText: responseStatusText.value,
    timeMs: responseTimeMs.value,
    responseBody: responseBody.value,
    error: sendError.value,
  });
}

const statusBadgeClass = computed(() => {
  const s = responseStatus.value;
  if (s == null) return 'bg-secondary';
  if (s >= 200 && s < 300) return 'bg-success';
  if (s >= 300 && s < 400) return 'bg-info text-dark';
  if (s >= 400 && s < 500) return 'bg-warning text-dark';
  return 'bg-danger';
});
</script>

<template>
  <div class="api-call-form">
    <!-- URL 미리보기 -->
    <div class="mb-3 p-2 rounded small font-monospace"
         style="background:#1e2129; color:#aab; word-break:break-all">
      <span class="badge bg-primary me-2">{{ route.method }}</span>
      {{ builtUrl || t('apiCallForm.k22') }}
    </div>

    <div class="row g-3">
      <!-- 좌측: 요청 입력 -->
      <div class="col-lg-7">
        <h6 class="small text-secondary mb-2"><i class="bi bi-arrow-up-right-circle me-1"></i>{{ t('apiCallForm.k1') }}</h6>

        <!-- Path 파라미터 -->
        <div v-if="pathParamNames.length" class="mb-3">
          <label class="form-label small">{{ t('apiCallForm.k2') }}</label>
          <div v-for="n in pathParamNames" :key="n" class="input-group input-group-sm mb-1">
            <span class="input-group-text" style="min-width:90px">:{{ n }}</span>
            <input v-model="pathParams[n]" type="text" class="form-control" :placeholder="n" />
          </div>
        </div>

        <!-- Phase 37 (patch-16): POST/PUT/PATCH 에서는 Body 가 주(primary) 입력.
             Body 필드 편집기를 Query 파라미터보다 먼저 노출. -->

        <!-- Body (POST/PUT/PATCH) -->
        <div v-if="supportsBody" class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <label class="form-label small mb-0 fw-bold">
              Body (JSON)
              <span class="badge bg-primary bg-opacity-75 ms-1" style="font-size:9px">{{ t('apiCallForm.k3') }}</span>
            </label>
            <div class="d-flex gap-1 align-items-center">
              <!-- 편집 모드 토글 -->
              <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-sm" :class="bodyMode === 'fields' ? 'btn-primary' : 'btn-outline-secondary'"
                        @click="bodyMode = 'fields'" :title="t('apiCallForm.k16')">
                  <i class="bi bi-list-ul"></i>
                </button>
                <button type="button" class="btn btn-sm" :class="bodyMode === 'json' ? 'btn-primary' : 'btn-outline-secondary'"
                        @click="bodyMode === 'fields' ? (fieldsToBodyText(), bodyMode = 'json') : (bodyMode = 'json')"
                        :title="t('apiCallForm.k17')">
                  <i class="bi bi-braces"></i>
                </button>
              </div>
              <button type="button" v-if="bodyMode === 'fields'" class="btn btn-sm btn-outline-info" @click="addRequestCode" :title="t('apiCallForm.k18')">
                <i class="bi bi-key me-1"></i>requestCode
              </button>
              <button type="button" v-if="bodyMode === 'fields'" class="btn btn-sm btn-outline-primary" @click="addBodyField" :title="t('apiCallForm.k19')">
                <i class="bi bi-plus-lg"></i>
              </button>
              <button type="button" v-if="bodyMode === 'json'" class="btn btn-sm btn-outline-secondary" @click="parseBodyTextToFields" :title="t('apiCallForm.k20')">
                <i class="bi bi-arrow-left"></i> {{ t('apiCallForm.k4') }}
              </button>
            </div>
          </div>

          <!-- 필드 모드 -->
          <template v-if="bodyMode === 'fields'">
            <div v-if="bodyFields.length === 0" class="text-muted small mb-2 p-2 border rounded" style="background:#f8f9fa">
              <i class="bi bi-info-circle me-1"></i>
              {{ t('apiCallForm.k5') }} <i class="bi bi-plus-lg"></i> {{ t('apiCallForm.k6') }} <i class="bi bi-braces"></i> {{ t('apiCallForm.k7') }}
            </div>
            <div v-for="(f, i) in bodyFields" :key="i" class="input-group input-group-sm mb-1">
              <input v-model="f.key" type="text" class="form-control" placeholder="key" style="max-width:180px" />
              <select v-model="f.type" class="form-select form-select-sm" style="max-width:100px; flex:0 0 auto">
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="json">json</option>
              </select>
              <input v-if="f.type === 'boolean'" type="checkbox" class="form-check-input ms-2"
                     :checked="f.value === true || f.value === 'true'"
                     @change="f.value = $event.target.checked" />
              <input v-else v-model="f.value" type="text" class="form-control" placeholder="value" />
              <button type="button" class="btn btn-outline-danger" @click="removeBodyField(i)" tabindex="-1">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </template>

          <!-- JSON 모드 -->
          <div v-else>
            <CodeEditor v-model="bodyText" language="javascript" />
            <div class="form-text small">{{ t('apiCallForm.k8') }}</div>
          </div>
        </div>

        <!-- Query -->
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <label class="form-label small mb-0">
              {{ t('apiCallForm.k9') }}
              <span v-if="supportsBody" class="text-muted small ms-1">{{ t('apiCallForm.k10') }}</span>
            </label>
            <div class="d-flex gap-1">
              <!-- GET/DELETE 에서만 requestCode 를 query 에 추가 (POST/PUT/PATCH 는 body 쪽 버튼 사용) -->
              <button type="button" v-if="!supportsBody" class="btn btn-sm btn-outline-info" @click="addRequestCode" :title="t('apiCallForm.k21')">
                <i class="bi bi-key me-1"></i>requestCode
              </button>
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="addQueryParam">
                <i class="bi bi-plus-lg"></i>
              </button>
            </div>
          </div>
          <div v-for="(p, i) in queryParams" :key="i" class="input-group input-group-sm mb-1">
            <input v-model="p.key" type="text" class="form-control" placeholder="key" style="max-width:200px" />
            <input v-model="p.value" type="text" class="form-control" placeholder="value" />
            <button type="button" class="btn btn-outline-danger" @click="removeQueryParam(i)" tabindex="-1">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <!-- 헤더 -->
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <label class="form-label small mb-0">{{ t('apiCallForm.k11') }}</label>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="addHeader">
              <i class="bi bi-plus-lg"></i>
            </button>
          </div>
          <label class="form-check small mb-2">
            <input type="checkbox" class="form-check-input me-2" v-model="useAdminToken" />
            {{ t('apiCallForm.k12') }}
          </label>
          <div v-for="(p, i) in headers" :key="i" class="input-group input-group-sm mb-1">
            <input v-model="p.key" type="text" class="form-control" placeholder="header name" style="max-width:200px" />
            <input v-model="p.value" type="text" class="form-control" placeholder="value" />
            <button type="button" class="btn btn-outline-danger" @click="removeHeader(i)" tabindex="-1">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <button type="button" class="btn btn-primary" @click="send" :disabled="sending">
          <span v-if="sending" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="bi bi-send me-1"></i>{{ t('apiCallForm.k13') }}
        </button>
      </div>

      <!-- 우측: 응답 (보내는 동안에는 흐려질 뿐 사라지지 않는다 — 높이가 흔들리지 않게) -->
      <div class="resp-pane col-lg-5" :class="{ 'resp-busy': sending }">
        <h6 class="small text-secondary mb-2"><i class="bi bi-arrow-down-left-circle me-1"></i>{{ t('apiCallForm.k14') }}</h6>

        <div v-if="sendError" class="alert alert-danger small">{{ sendError }}</div>

        <div v-if="responseStatus !== null" class="mb-2 d-flex align-items-center gap-2">
          <span class="badge" :class="statusBadgeClass">{{ responseStatus }} {{ responseStatusText }}</span>
          <span class="small text-secondary">{{ responseTimeMs }}ms</span>
        </div>
        <div v-else-if="!sendError" class="text-secondary small text-center py-4 border rounded">
          {{ t('apiCallForm.k15') }}
        </div>

        <div v-if="responseBody" class="mb-3">
          <label class="form-label small">Body</label>
          <CodeEditor v-model="responseBody" language="javascript" :readonly="true" />
        </div>

        <details v-if="Object.keys(responseHeaders).length" class="small">
          <summary class="text-secondary">응답 헤더 ({{ Object.keys(responseHeaders).length }})</summary>
          <div class="mt-2 p-2 rounded font-monospace" style="background:#f6f7f9; font-size:11px">
            <div v-for="(v, k) in responseHeaders" :key="k">
              <strong>{{ k }}</strong>: {{ v }}
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 응답 칸은 보내는 동안에도 자리를 지킨다 — 사라졌다 나타나면 대화상자가 깜박인다 */
.resp-pane { min-height: 220px; transition: opacity .15s ease; }
.resp-busy { opacity: .45; }
</style>
