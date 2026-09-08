<script setup>
import { confirmDelete } from '../composables/useConfirm';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { listScenarios, deleteScenario, importScenarioJson, exportScenarioJson } from '../utils/scenarioStore';
import { useI18n } from '../composables/useI18n';

/* ★ v1.20.0 — t() 를 쓰면 선언도 있어야 한다 */
const { t } = useI18n();

const router = useRouter();
const scenarios = ref([]);
const error = ref(null);

async function load() {
  try { scenarios.value = await listScenarios(); error.value = null; }
  catch (e) { error.value = e?.response?.data?.message || e.message; }
}

function openCreate() { router.push({ name: 'scenario-edit', params: { id: 'new' } }); }
function openEdit(id) { router.push({ name: 'scenario-edit', params: { id } }); }
function openRun(id)  { router.push({ name: 'scenario-run',  params: { id } }); }

async function onDelete(s) {
  if (!await confirmDelete(s.name, { detail: '서버의 시나리오 파일이 삭제됩니다.' })) return;
  await deleteScenario(s.id);
  await load();
}

async function onExport(s) {
  const json = await exportScenarioJson(s.id);
  if (!json) return;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${s.name || 'scenario'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const importInput = ref(null);
function triggerImport() { importInput.value?.click(); }
async function onImportFile(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const text = await f.text();
    await importScenarioJson(text);
    await load();
  } catch (err) {
    error.value = err.message;
  }
  e.target.value = '';
}

function fmtTs(ms) {
  if (!ms) return '-';
  const d = new Date(ms);
  return d.toLocaleString('sv-SE').replace('T', ' ');
}

onMounted(load);
</script>

<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <span>
        <i class="bi bi-collection-play me-2"></i>{{ t('scenarioList.k1') }}
        <small class="text-secondary ms-2">{{ t('common.totalN', { n: scenarios.length }) }}</small>
      </span>
      <div class="d-flex gap-2">
        <input ref="importInput" type="file" accept="application/json" hidden @change="onImportFile" />
        <button class="btn btn-sm btn-outline-secondary" @click="triggerImport" :title="t('scenarioList.k9')">
          <i class="bi bi-upload"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="load" :title="t('scenarioList.k10')">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button class="btn btn-sm btn-primary" @click="openCreate">
          <i class="bi bi-plus-lg me-1"></i>{{ t('scenarioList.k2') }}
        </button>
      </div>
    </div>
    <div class="card-body">
      <div v-if="error" class="alert alert-danger small">{{ error }}</div>

      <div v-if="!scenarios.length" class="text-center text-secondary py-4">
        {{ t('scenarioList.k3') }}<br>
        <small>{{ t('scenarioList.k4') }}</small>
      </div>

      <div class="table-responsive" v-else>
        <table class="table table-hover align-middle">
          <thead class="text-secondary small">
            <tr>
              <th>{{ t('scenarioList.k5') }}</th>
              <th>{{ t('scenarioList.k6') }}</th>
              <th style="width:90px">{{ t('scenarioList.k7') }}</th>
              <th style="width:160px">{{ t('scenarioList.k8') }}</th>
              <th style="width:200px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in scenarios" :key="s.id">
              <td><strong>{{ s.name }}</strong></td>
              <td class="small text-secondary">{{ s.description }}</td>
              <td><span class="badge bg-secondary">{{ s.stepCount }}</span></td>
              <td class="small text-secondary">{{ fmtTs(s.updatedAt) }}</td>
              <td>
                <button class="btn btn-sm btn-outline-success me-1" @click="openRun(s.id)" :title="t('scenarioList.k11')">
                  <i class="bi bi-play-fill"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary me-1" @click="openEdit(s.id)" :title="t('scenarioList.k12')">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary me-1" @click="onExport(s)" :title="t('scenarioList.k13')">
                  <i class="bi bi-download"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="onDelete(s)" :title="t('scenarioList.k14')">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
