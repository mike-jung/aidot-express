<script setup>
/**
 * ControllerRequestsDialog — 컨트롤러별 요청 빈도 상세 다이얼로그.
 *
 *  구성:
 *   - 상단 설정: window(초), 정렬 기준, 실시간 스위치, 페이지 크기
 *   - 라우트 리스트 (count 상위) — 각 행에 mini sparkline + 페이지네이션
 *   - 좌측 리스트에서 클릭한 라우트의 큰 시계열 차트 (우측)
 *
 *  데이터: /api/admin/metrics/routes (실시간 스위치가 ON 일 때만 주기 폴링)
 *  페이지네이션: 서버는 최대 500 라우트까지 반환 → 클라이언트에서 슬라이싱
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
// ★ v1.10.8 — 다국어
import { useI18n } from '../composables/useI18n';

import { useFormat } from '../composables/useFormat';
const fmt = useFormat();
import http from '../api/http';
import MetricChart from './MetricChart.vue';
import Pagination from './Pagination.vue';
import { useDraggable } from '../composables/useDraggable';

import { useDuration } from '../utils/duration';   // ★ v1.19.5 시간 표기 공통화

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼

   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();


/* ★ v1.21.3 — 시간 표기 도우미 */
const { fmtDuration } = useDuration();
const { modalRef, headerRef } = useDraggable();
defineEmits(['close']);

const windowSec = ref(60);
const sortBy    = ref('count');
const refreshMs = ref(3000);
const liveEnabled = ref(true);  // 실시간 폴링 스위치

const allRows    = ref([]);   // 전체 (서버 응답)
const loading    = ref(false);
const error      = ref(null);
const selectedKey = ref(null);

// 페이지네이션 (클라이언트)
const page    = ref(1);
const perPage = ref(20);
const totalPages = computed(() => Math.max(1, Math.ceil(allRows.value.length / perPage.value)));
const pagedRows = computed(() => {
  const start = (page.value - 1) * perPage.value;
  return allRows.value.slice(start, start + perPage.value);
});
// 정렬/window 바뀌면 페이지 리셋
watch([sortBy, windowSec, perPage], () => { page.value = 1; });

let pollTimer = null;

/* ───── 데이터 로딩 ───── */
async function load() {
  loading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/metrics/routes', {
      params: { windowSec: windowSec.value, sortBy: sortBy.value, includeSeries: 1, limit: 500 },
    });
    const data = r.data?.data || {};
    allRows.value = data.rows || [];
    // 첫 로드 시 기본 선택 (전체 기준 1위)
    if (!selectedKey.value && allRows.value.length > 0) {
      selectedKey.value = allRows.value[0].key;
    }
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally {
    loading.value = false;
  }
}

function startPolling() {
  stopPolling();
  if (!liveEnabled.value) return;
  pollTimer = setInterval(load, refreshMs.value);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

watch([windowSec, sortBy], load);
watch(refreshMs, startPolling);
watch(liveEnabled, (on) => { if (on) startPolling(); else stopPolling(); });

onMounted(async () => {
  await load();
  startPolling();
});
onBeforeUnmount(stopPolling);

/* ───── 선택된 라우트 / 파생 ───── */
const selected = computed(() =>
  allRows.value.find((r) => r.key === selectedKey.value) || null,
);

function fmtNum(v, d = 1) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  return n.toFixed(d);
}
function fmtMs(v) { return fmtNum(v, 0) + ' ms'; }

const timeLabels = computed(() => {
  const s = selected.value?.series;
  if (!s || !s.length) return ['', '', ''];
  const t0 = s[0].tsSec * 1000;
  const tN = s[s.length - 1].tsSec * 1000;
  const tM = (t0 + tN) / 2;
  /* ★ v1.10.9 — 축 라벨: 언어에 맞춘 24시간 표기 */
  const axisTime = (ms) => fmt.time(ms, { hour12: false });
  return [axisTime(t0), axisTime(tM), axisTime(tN)];
});

const selectedCountSeries = computed(() => (selected.value?.series || []).map((b) => b.count));
const selectedAvgMsSeries = computed(() => (selected.value?.series || []).map((b) => b.avgMs));

/* ───── 미니 sparkline — 각 행용 (SVG 직접 렌더) ───── */
function sparklinePath(series) {
  if (!series || !series.length) return '';
  const vals = series.map((b) => b.count);
  const max = Math.max(1, ...vals);
  const W = 100, H = 22;
  const step = series.length === 1 ? W : W / (series.length - 1);
  return vals.map((v, i) => {
    const x = i * step;
    const y = H - (v / max) * (H - 2) - 1;
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
}

function displayName(r) {
  if (r.meta?.controller && r.meta?.handler) {
    return `${r.meta.controller}.${r.meta.handler}`;
  }
  return r.key;
}
function displayPath(r) {
  if (r.meta?.method && r.meta?.path) return `${r.meta.method} ${r.meta.path}`;
  return '';
}
</script>

<template>
  <div class="app-modal-backdrop" @mousedown.self="$emit('close')">
    <div ref="modalRef" class="app-modal routes-modal" style="max-width:1200px">
      <div ref="headerRef" class="modal-header">
        <h5 class="mb-0">
          <i class="bi bi-bar-chart-line text-primary me-2"></i>
          {{ t('reqDialog.title') }}
          <small class="text-secondary ms-2">최근 {{ windowSec }}초 기준 · 총 {{ allRows.length }}개 라우트</small>
        </h5>
        <button class="btn-close" @click="$emit('close')"></button>
      </div>

      <div class="modal-body p-0 d-flex flex-column">
        <!-- 상단 툴바 -->
        <div class="routes-toolbar">
          <div class="d-flex gap-3 align-items-center flex-wrap">
            <div class="d-flex align-items-center gap-2">
              <label class="form-label small mb-0 text-secondary">Window</label>
              <select v-model.number="windowSec" class="form-select form-select-sm" style="width:110px">
                <option :value="30">{{ fmtDuration(30) }}</option>
                <option :value="60">{{ fmtDuration(60) }}</option>
                <option :value="120">{{ fmtDuration(120) }}</option>
                <option :value="300">{{ fmtDuration(300) }}</option>
                <option :value="600">{{ fmtDuration(600) }}</option>
              </select>
            </div>
            <div class="d-flex align-items-center gap-2">
              <label class="form-label small mb-0 text-secondary">{{ t('reqDialog.sort') }}</label>
              <select v-model="sortBy" class="form-select form-select-sm" style="width:130px">
                <option value="count">{{ t('reqDialog.requests') }}</option>
                <option value="avgMs">{{ t('reqDialog.avgResponse') }}</option>
                <option value="maxMs">{{ t('reqDialog.maxResponse') }}</option>
                <option value="errCount">{{ t('reqDialog.errors') }}</option>
              </select>
            </div>
            <div class="d-flex align-items-center gap-2">
              <label class="form-label small mb-0 text-secondary">{{ t('reqDialog.pageSize') }}</label>
              <select v-model.number="perPage" class="form-select form-select-sm" style="width:90px">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
            <div class="d-flex align-items-center gap-2">
              <label class="form-label small mb-0 text-secondary">{{ t('reqDialog.refresh') }}</label>
              <select v-model.number="refreshMs" class="form-select form-select-sm" style="width:110px" :disabled="!liveEnabled">
                <option :value="1000">{{ fmtDuration(1) }}</option>
                <option :value="3000">{{ fmtDuration(3) }}</option>
                <option :value="5000">{{ fmtDuration(5) }}</option>
                <option :value="10000">{{ fmtDuration(10) }}</option>
              </select>
            </div>
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" id="dlgLiveSwitch" v-model="liveEnabled" />
              <label class="form-check-label small" for="dlgLiveSwitch">
                {{ t('reqDialog.live') }}
                <span class="badge ms-1" :class="liveEnabled ? 'bg-success' : 'bg-secondary'">
                  {{ liveEnabled ? 'ON' : 'OFF' }}
                </span>
              </label>
            </div>
            <button class="btn btn-sm btn-outline-secondary ms-auto" @click="load" :disabled="loading">
              <i class="bi bi-arrow-clockwise"></i>
              <span class="ms-1">{{ t('reqDialog.reload') }}</span>
            </button>
          </div>
        </div>

        <div v-if="error" class="alert alert-danger small m-3 mb-0">{{ error }}</div>

        <!-- 본문: 왼쪽 리스트 + 오른쪽 상세 차트 -->
        <div class="routes-body">
          <!-- 좌측 라우트 리스트 -->
          <div class="routes-list">
            <table class="table table-sm table-hover mb-0">
              <thead class="small text-secondary">
                <tr>
                  <th>{{ t('reqDialog.route') }}</th>
                  <th class="text-end" style="width:70px">{{ t('controllerRequests.k10') }}</th>
                  <th class="text-end" style="width:70px">RPS</th>
                  <th class="text-end" style="width:80px">{{ t('controllerRequests.k11') }}</th>
                  <th class="text-end" style="width:70px">{{ t('controllerRequests.k12') }}</th>
                  <th style="width:110px">{{ t('controllerRequests.k13') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!allRows.length">
                  <td colspan="6" class="text-center text-secondary py-4">
                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                    {{ t('controllerRequests.k14') }}
                  </td>
                </tr>
                <tr
                  v-for="r in pagedRows"
                  :key="r.key"
                  :class="{ 'table-active': r.key === selectedKey }"
                  @click="selectedKey = r.key"
                  style="cursor:pointer"
                >
                  <td>
                    <div class="small fw-bold">{{ displayName(r) }}</div>
                    <div class="small text-secondary">{{ displayPath(r) }}</div>
                  </td>
                  <td class="text-end"><strong>{{ fmtNum(r.count, 0) }}</strong></td>
                  <td class="text-end small">{{ fmtNum(r.rps, 2) }}</td>
                  <td class="text-end small">{{ fmtMs(r.avgMs) }}</td>
                  <td class="text-end small">
                    <span v-if="r.errCount > 0" class="text-danger">{{ r.errCount }}</span>
                    <span v-else class="text-secondary">0</span>
                  </td>
                  <td>
                    <svg viewBox="0 0 100 22" width="100%" height="22" class="spark">
                      <path
                        :d="sparklinePath(r.series)"
                        fill="none"
                        stroke="#0d6efd"
                        stroke-width="1.5"
                      />
                    </svg>
                  </td>
                </tr>
              </tbody>
            </table>
            <!-- 페이지네이션 -->
            <div v-if="allRows.length" class="routes-pagination">
              <small class="text-secondary me-auto">
                {{ t('controllerRequests.k15') }} <strong>{{ allRows.length }}</strong>{{ t('controllerRequests.itemsDot') }}
                <strong>{{ page }}</strong> / {{ totalPages }} 페이지
              </small>
              <Pagination v-model:page="page" :total-pages="totalPages" :window-size="10" />
            </div>
          </div>

          <!-- 우측 상세 차트 -->
          <div class="routes-detail">
            <div v-if="!selected" class="text-secondary small p-4 text-center">
              {{ t('controllerRequests.k17') }}
            </div>
            <div v-else class="p-3">
              <div class="mb-3">
                <div class="fw-bold">{{ displayName(selected) }}</div>
                <div class="small text-secondary">{{ displayPath(selected) }}</div>
              </div>

              <div class="row g-2 mb-3">
                <div class="col-6 col-md-3">
                  <div class="card border-0 bg-light-subtle">
                    <div class="card-body py-2 px-3">
                      <div class="small text-secondary">{{ t('controllerRequests.k18') }}</div>
                      <div class="h5 mb-0">{{ fmtNum(selected.count, 0) }}</div>
                    </div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="card border-0 bg-light-subtle">
                    <div class="card-body py-2 px-3">
                      <div class="small text-secondary">RPS</div>
                      <div class="h5 mb-0">{{ fmtNum(selected.rps, 2) }}</div>
                    </div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="card border-0 bg-light-subtle">
                    <div class="card-body py-2 px-3">
                      <div class="small text-secondary">{{ t('controllerRequests.k19') }}</div>
                      <div class="h5 mb-0">{{ fmtMs(selected.avgMs) }}</div>
                    </div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="card border-0 bg-light-subtle">
                    <div class="card-body py-2 px-3">
                      <div class="small text-secondary">{{ t('controllerRequests.k20') }}</div>
                      <div class="h5 mb-0">{{ fmtMs(selected.maxMs) }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <MetricChart
                :title="t('controllerRequests.k25')"
                :series-a="selectedCountSeries" label-a="요청수 (초)" color-a="#198754"
                :series-b="selectedAvgMsSeries" label-b="avg (ms)"    color-b="#fd7e14"
                :time-labels="timeLabels" dual-axis />

              <div class="small text-secondary mt-2">
                {{ t('controllerRequests.k21') }} <strong>{{ fmtNum(selected.totalCount, 0) }}</strong> {{ t('controllerRequests.k22') }} <strong>{{ fmtNum(selected.totalErrCount, 0) }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <small class="text-secondary me-auto">
          <i class="bi bi-info-circle me-1"></i>
          {{ t('controllerRequests.k23') }}
        </small>
        <button class="btn btn-sm btn-outline-secondary" @click="$emit('close')">{{ t('controllerRequests.k24') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.routes-modal {
  width: 95vw;
  height: 85vh;
  max-height: 85vh;
}
.routes-modal :deep(.modal-body) {
  overflow: hidden;
  min-height: 0;
}
.routes-toolbar {
  padding: 10px 16px;
  border-bottom: 1px solid #eef0f3;
  background: #fafbfc;
  flex: 0 0 auto;
}
.routes-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
.routes-list {
  flex: 1 1 55%;
  min-width: 0;
  overflow-y: auto;
  border-right: 1px solid #eef0f3;
}
.routes-list table { margin-bottom: 0; }
.routes-list .table-active { background-color: #e7f1ff !important; }
.routes-list svg.spark { display: block; }
.routes-pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-top: 1px solid #eef0f3;
  background: #fafbfc;
}
.routes-detail {
  flex: 1 1 45%;
  min-width: 0;
  overflow-y: auto;
}
</style>
