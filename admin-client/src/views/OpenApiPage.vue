<script setup>
import { ref, computed, onMounted, watch } from 'vue';
// ★ v1.10.8 — 다국어
import { useI18n } from '../composables/useI18n';

import http from '../api/http';
import CodeEditor from '../components/CodeEditor.vue';
import Pagination from '../components/Pagination.vue';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

const spec = ref(null);
const loading = ref(false);
const error = ref(null);
const view = ref('summary');  // 'summary' | 'json' | 'tags'
const page = ref(1);
const perPage = ref(10);
const excludeAdmin = ref(true);   // 시스템/관리용 제외 (기본 제외)

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/openapi/spec', {
      params: { excludeAdmin: excludeAdmin.value ? '1' : '0' },
    });
    spec.value = r.data.data;
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally {
    loading.value = false;
  }
}

// 스위치 변경 시 즉시 재조회
watch(excludeAdmin, () => { page.value = 1; load(); });

const summary = computed(() => {
  if (!spec.value) return null;
  let total = 0;
  let admin = 0;
  let user = 0;
  for (const ops of Object.values(spec.value.paths)) {
    for (const op of Object.values(ops)) {
      total++;
      if (op['x-admin-route']) admin++;
      else user++;
    }
  }
  return { total, admin, user, tags: spec.value.tags?.length || 0 };
});

const flatRoutes = computed(() => {
  if (!spec.value) return [];
  const out = [];
  for (const [path, ops] of Object.entries(spec.value.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      out.push({
        method: method.toUpperCase(),
        path,
        tag: op.tags?.[0] || '-',
        handler: op.summary,
        isAdmin: !!op['x-admin-route'],
        operationId: op.operationId,
        op,   // 원본 operation 객체 (대화상자에서 파라미터/요청바디 표시용)
      });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
});

/* ── 라우트 상세 대화상자 상태 ── */
const detailRoute = ref(null);  // 현재 선택된 { method, path, op, ... } or null
const detailView = ref('params');  // 'params' | 'json'
function openDetail(row) { detailRoute.value = row; detailView.value = 'params'; }
function closeDetail() { detailRoute.value = null; }
const detailJson = computed(() => detailRoute.value ? JSON.stringify(detailRoute.value.op, null, 2) : '');
/** operation 객체에서 path/query 파라미터를 정리된 형태로 반환 */
const detailParams = computed(() => {
  const op = detailRoute.value?.op;
  if (!op) return { path: [], query: [], body: null };
  const list = Array.isArray(op.parameters) ? op.parameters : [];
  const path = list.filter(p => p.in === 'path');
  const query = list.filter(p => p.in === 'query');
  const body = op.requestBody || null;
  return { path, query, body };
});

const groupedByTag = computed(() => {
  const map = new Map();
  for (const r of flatRoutes.value) {
    if (!map.has(r.tag)) map.set(r.tag, []);
    map.get(r.tag).push(r);
  }
  return [...map.entries()].sort();
});

const jsonText = computed(() => spec.value ? JSON.stringify(spec.value, null, 2) : '');

const totalPages = computed(() => Math.max(1, Math.ceil(flatRoutes.value.length / perPage.value)));
const pagedRoutes = computed(() => {
  const start = (page.value - 1) * perPage.value;
  return flatRoutes.value.slice(start, start + perPage.value);
});

// 탭이나 데이터가 바뀌면 1페이지로
watch([view, perPage, () => flatRoutes.value.length], () => { page.value = 1; });

function methodBadgeClass(method) {
  switch (method) {
    case 'GET':    return 'bg-success';
    case 'POST':   return 'bg-primary';
    case 'PUT':    return 'bg-warning text-dark';
    case 'PATCH':  return 'bg-info text-dark';
    case 'DELETE': return 'bg-danger';
    default:       return 'bg-secondary';
  }
}

function onDownloadJson() {
  const blob = new Blob([jsonText.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'openapi.json';
  a.click();
  URL.revokeObjectURL(url);
}

function onCopyJson() {
  navigator.clipboard?.writeText(jsonText.value);
}

onMounted(load);
</script>

<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
      <span>
        <i class="bi bi-file-code me-2"></i>{{ t('openapi.title') }}
        <small v-if="summary" class="text-secondary ms-2">
          {{ summary.total }} 라우트 · {{ summary.tags }} 태그
        </small>
      </span>
      <div class="d-flex gap-2 align-items-center">
        <div class="form-check form-switch mb-0 me-2">
          <input
            class="form-check-input"
            type="checkbox"
            id="openApiAdminSwitch"
            :checked="!excludeAdmin"
            @change="excludeAdmin = !$event.target.checked"
          />
          <label class="form-check-label small" for="openApiAdminSwitch">
            {{ t('openapi.includeAdmin') }}
            <span class="text-secondary ms-1">(/api/admin/*)</span>
          </label>
        </div>
        <button class="btn btn-sm btn-outline-secondary" @click="onCopyJson" :disabled="!spec" :title="t('openapi2.copyJson')">
          <i class="bi bi-clipboard"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="onDownloadJson" :disabled="!spec" :title="t('openapi2.downloadJson')">
          <i class="bi bi-download"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="load" :disabled="loading">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>
    </div>
    <div class="card-body">
      <div v-if="error" class="alert alert-danger small">{{ error }}</div>
      <div v-if="loading" class="text-center text-secondary py-4">
        <span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}
      </div>

      <div v-else-if="spec">
        <!-- 탭 -->
        <ul class="nav nav-pills mb-3" style="font-size:13px">
          <li class="nav-item"><button class="nav-link py-1" :class="{ active: view === 'summary' }" @click="view = 'summary'">
            <i class="bi bi-grid me-1"></i>{{ t('openapi.summary') }}
          </button></li>
          <li class="nav-item"><button class="nav-link py-1" :class="{ active: view === 'tags' }" @click="view = 'tags'">
            <i class="bi bi-tags me-1"></i>{{ t('openapi.byTag') }}
          </button></li>
          <li class="nav-item"><button class="nav-link py-1" :class="{ active: view === 'json' }" @click="view = 'json'">
            <i class="bi bi-braces me-1"></i>JSON
          </button></li>
        </ul>

        <!-- 요약 -->
        <div v-if="view === 'summary'">
          <div class="row mb-3">
            <div class="col-md-3">
              <div class="card text-center"><div class="card-body py-2">
                <div class="text-secondary small">{{ t('openapi.totalRoutes') }}</div>
                <div class="fs-4">{{ summary.total }}</div>
              </div></div>
            </div>
            <div class="col-md-3">
              <div class="card text-center"><div class="card-body py-2">
                <div class="text-secondary small">{{ t('openapi2.general') }}</div>
                <div class="fs-4 text-success">{{ summary.user }}</div>
              </div></div>
            </div>
            <div class="col-md-3">
              <div class="card text-center"><div class="card-body py-2">
                <div class="text-secondary small">{{ t('openapi.admin') }}</div>
                <div class="fs-4 text-warning">{{ summary.admin }}</div>
              </div></div>
            </div>
            <div class="col-md-3">
              <div class="card text-center"><div class="card-body py-2">
                <div class="text-secondary small">{{ t('openapi.tagController') }}</div>
                <div class="fs-4">{{ summary.tags }}</div>
              </div></div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-sm table-hover">
              <thead class="text-secondary small">
                <tr>
                  <th style="width:80px">Method</th>
                  <th>Path</th>
                  <th style="width:200px">Controller</th>
                  <th style="width:200px">Handler</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in pagedRoutes" :key="r.method + r.path"
                    style="cursor:pointer" @click="openDetail(r)">
                  <td><span class="badge" :class="methodBadgeClass(r.method)">{{ r.method }}</span></td>
                  <td><code>{{ r.path }}</code> <span v-if="r.isAdmin" class="badge bg-warning text-dark small ms-1">admin</span></td>
                  <td class="small">{{ r.tag }}</td>
                  <td class="small text-secondary">{{ r.handler }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-2 d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
              <select v-model.number="perPage" class="form-select form-select-sm" style="width:80px">
                <option :value="5">5</option>
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
              <small class="text-secondary">{{ t('logFiles.perPage') }}</small>
            </div>
            <Pagination v-model:page="page" :total-pages="totalPages" :window-size="10" />
          </div>
        </div>

        <!-- 태그별 -->
        <div v-else-if="view === 'tags'" style="max-height:600px; overflow-y:auto">
          <div v-for="[tag, routes] in groupedByTag" :key="tag" class="mb-3">
            <h6 class="mb-2 px-2 py-1" style="background:#f6f7f9; border-bottom:1px solid #e8eaee">
              <i class="bi bi-folder me-1"></i>{{ tag }}
              <small class="text-secondary fw-normal ms-2">({{ routes.length }} 라우트)</small>
            </h6>
            <div v-for="r in routes" :key="r.method + r.path"
                 class="px-3 py-1 d-flex align-items-center gap-2 small tag-row"
                 style="cursor:pointer" @click="openDetail(r)">
              <span class="badge" :class="methodBadgeClass(r.method)" style="width:60px">{{ r.method }}</span>
              <code>{{ r.path }}</code>
              <span class="text-secondary">→ {{ r.handler.split('.')[1] || r.handler }}</span>
            </div>
          </div>
        </div>

        <!-- JSON -->
        <div v-else-if="view === 'json'">
          <CodeEditor :model-value="jsonText" language="javascript" :readonly="true" />
          <div class="form-text small mt-2">
            {{ t('openapi.pasteHint') }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ───────── 라우트 상세 대화상자 ───────── -->
  <div v-if="detailRoute" class="modal-backdrop fade show" @click="closeDetail"></div>
  <div v-if="detailRoute" class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title d-flex align-items-center flex-wrap gap-2">
            <span class="badge" :class="methodBadgeClass(detailRoute.method)">{{ detailRoute.method }}</span>
            <code>{{ detailRoute.path }}</code>
            <span v-if="detailRoute.isAdmin" class="badge bg-warning text-dark small">admin</span>
          </h5>
          <button type="button" class="btn-close" @click="closeDetail" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="small text-secondary mb-3">
            <strong>{{ detailRoute.tag }}</strong> · handler: <code>{{ detailRoute.handler }}</code>
            <span v-if="detailRoute.operationId" class="ms-2">· operationId: <code>{{ detailRoute.operationId }}</code></span>
          </div>

          <!-- 탭: 파라미터 / JSON -->
          <ul class="nav nav-tabs mb-3" style="font-size:13px">
            <li class="nav-item">
              <button class="nav-link py-1" :class="{ active: detailView === 'params' }" @click="detailView = 'params'">
                <i class="bi bi-sliders me-1"></i>{{ t('openapi.paramSummary') }}
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link py-1" :class="{ active: detailView === 'json' }" @click="detailView = 'json'">
                <i class="bi bi-braces me-1"></i>JSON
              </button>
            </li>
          </ul>

          <!-- 파라미터 정리 뷰 -->
          <div v-if="detailView === 'params'">
            <!-- Path 파라미터 -->
            <section class="mb-3">
              <h6 class="text-secondary small mb-2">
                <i class="bi bi-braces me-1"></i>{{ t('openapi.pathParams') }}
                <span class="badge bg-light text-dark ms-1">{{ detailParams.path.length }}</span>
              </h6>
              <div v-if="!detailParams.path.length" class="text-secondary small ps-2">{{ t('openapi.noneDash') }}</div>
              <table v-else class="table table-sm mb-0">
                <thead class="small text-secondary"><tr>
                  <th style="width:30%">{{ t('openapi2.name') }}</th>
                  <th style="width:20%">{{ t('openapi.colType') }}</th>
                  <th style="width:15%">{{ t('openapi.colRequired') }}</th>
                  <th>{{ t('openapi.colDescription') }}</th>
                </tr></thead>
                <tbody>
                  <tr v-for="p in detailParams.path" :key="'p-'+p.name">
                    <td><code>{{ p.name }}</code></td>
                    <td class="small">{{ p.schema?.type || 'string' }}</td>
                    <td>
                      <span v-if="p.required" class="badge bg-danger">{{ t('openapi2.required') }}</span>
                      <span v-else class="badge bg-light text-dark">{{ t('openapi.optional') }}</span>
                    </td>
                    <td class="small text-secondary">{{ p.description || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <!-- Query 파라미터 -->
            <section class="mb-3">
              <h6 class="text-secondary small mb-2">
                <i class="bi bi-question-circle me-1"></i>{{ t('openapi2.queryParams') }}
                <span class="badge bg-light text-dark ms-1">{{ detailParams.query.length }}</span>
              </h6>
              <div v-if="!detailParams.query.length" class="text-secondary small ps-2">{{ t('openapi2.none') }}</div>
              <table v-else class="table table-sm mb-0">
                <thead class="small text-secondary"><tr>
                  <th style="width:30%">{{ t('openapi2.name') }}</th>
                  <th style="width:20%">{{ t('openapi2.type') }}</th>
                  <th style="width:15%">{{ t('openapi2.required') }}</th>
                  <th>{{ t('openapi2.description') }}</th>
                </tr></thead>
                <tbody>
                  <tr v-for="p in detailParams.query" :key="'q-'+p.name">
                    <td><code>{{ p.name }}</code></td>
                    <td class="small">{{ p.schema?.type || 'string' }}</td>
                    <td>
                      <span v-if="p.required" class="badge bg-danger">{{ t('openapi2.required') }}</span>
                      <span v-else class="badge bg-light text-dark">{{ t('openapi2.optional') }}</span>
                    </td>
                    <td class="small text-secondary">{{ p.description || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <!-- Request Body -->
            <section class="mb-3">
              <h6 class="text-secondary small mb-2">
                <i class="bi bi-arrow-up-circle me-1"></i>Request Body
                <span v-if="detailParams.body" class="badge bg-light text-dark ms-1">{{ t('openapi2.yes') }}</span>
                <span v-else class="badge bg-light text-dark ms-1">{{ t('openapi2.no') }}</span>
              </h6>
              <div v-if="!detailParams.body" class="text-secondary small ps-2">{{ t('openapi2.noRequestBody') }}</div>
              <div v-else class="ps-2">
                <div class="small mb-1">
                  <strong>{{ t('openapi2.required') }}</strong>: {{ detailParams.body.required ? '예' : '아니오' }}
                </div>
                <div v-for="(media, mediaType) in detailParams.body.content" :key="mediaType" class="small mb-2">
                  <div><strong>Content-Type</strong>: <code>{{ mediaType }}</code></div>
                  <pre class="bg-light border p-2 mt-1 mb-0 small"
                       style="max-height:220px; overflow:auto">{{ JSON.stringify(media.schema, null, 2) }}</pre>
                </div>
              </div>
            </section>

            <!-- Responses -->
            <section>
              <h6 class="text-secondary small mb-2">
                <i class="bi bi-arrow-down-circle me-1"></i>{{ t('openapi2.response') }}
              </h6>
              <table class="table table-sm mb-0">
                <thead class="small text-secondary"><tr>
                  <th style="width:20%">Status</th>
                  <th>{{ t('openapi2.description') }}</th>
                </tr></thead>
                <tbody>
                  <tr v-for="(resp, code) in (detailRoute.op.responses || {})" :key="code">
                    <td><span class="badge bg-secondary">{{ code }}</span></td>
                    <td class="small">{{ resp.description || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          <!-- JSON 뷰 -->
          <div v-else-if="detailView === 'json'">
            <pre class="bg-light border p-2 mb-0 small"
                 style="max-height:500px; overflow:auto">{{ detailJson }}</pre>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary"
                  @click="() => navigator.clipboard?.writeText(detailJson)">
            <i class="bi bi-clipboard me-1"></i>{{ t('openapi2.copyJson') }}
          </button>
          <button type="button" class="btn btn-secondary" @click="closeDetail">{{ t('openapi2.close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal.d-block { z-index: 1055; }
.modal-backdrop.show { opacity: 0.5; }
.tag-row:hover { background: #f6f7f9; }
</style>
