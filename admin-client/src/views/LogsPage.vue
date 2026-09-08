<script setup>
/**
 * LogsPage — 서버 로그 조회/검색/다운로드.
 *
 *  구성:
 *   - 상단: 종류 탭 (general / sql) + 파일 목록 페이지네이션
 *   - 파일 행 클릭 → 대화상자: code editor 로 내용 조회 + 검색 + 압축 다운로드
 */
import { ref, computed, onMounted, watch } from 'vue';
// ★ v1.10.7 — 다국어
import { useI18n } from '../composables/useI18n';

import http from '../api/http';
import Pagination from '../components/Pagination.vue';
import CodeEditor from '../components/CodeEditor.vue';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

/* ========== 상태 ========== */
const DEFAULT_KINDS = [
  { kind: 'general', label: t('logs3.kindGeneral'), fileCount: 0, exists: false },
  { kind: 'sql',     label: 'SQL',  fileCount: 0, exists: false },
];
const kinds = ref([...DEFAULT_KINDS]);
const activeKind = ref('general');

/* ========== 폴더 / 파일 2단계 네비게이션 ========== */
const folders = ref([]);            // [{ name, fileCount, lastModified, isRoot }]
const activeFolder = ref(null);     // null → 폴더 리스트 화면 / 문자열 → 해당 폴더의 파일 리스트
const foldersLoading = ref(false);

const files = ref([]);              // 현재 폴더의 파일 목록
const total = ref(0);
const page = ref(1);
const perPage = ref(20);
const loading = ref(false);
const error = ref(null);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)));

/* ========== 로드 ========== */
async function loadKinds() {
  try {
    const r = await http.get('/api/admin/logs/kinds');
    const fromServer = r.data?.data || [];
    const map = new Map(DEFAULT_KINDS.map(k => [k.kind, k]));
    for (const k of fromServer) map.set(k.kind, k);
    kinds.value = Array.from(map.values());
  } catch (e) { error.value = e.response?.data?.message || e.message; }
}

async function loadFolders() {
  foldersLoading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/logs/folders', {
      params: { kind: activeKind.value },
    });
    folders.value = r.data?.data?.folders || [];
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally { foldersLoading.value = false; }
}

async function loadFiles() {
  if (!activeFolder.value) return;
  loading.value = true;
  error.value = null;
  try {
    const r = await http.get('/api/admin/logs/files', {
      params: {
        kind: activeKind.value,
        folder: activeFolder.value,
        page: page.value, perPage: perPage.value,
      },
    });
    files.value = r.data?.data?.rows || [];
    total.value = Number(r.data?.data?.total || 0);
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally { loading.value = false; }
}

function setKind(k) {
  if (activeKind.value === k) return;
  activeKind.value = k;
  // 탭 전환 시 폴더 리스트 화면으로 리셋
  activeFolder.value = null;
  page.value = 1;
  files.value = [];
  total.value = 0;
  loadFolders();
}

function openFolder(f) {
  activeFolder.value = f.name;
  page.value = 1;
  loadFiles();
}

function backToFolders() {
  activeFolder.value = null;
  files.value = [];
  total.value = 0;
  loadFolders();
}

watch([page, perPage], () => { if (activeFolder.value) loadFiles(); });

onMounted(async () => {
  await loadKinds();
  loadFolders();
});

/* ========== 대화상자 ========== */
const viewer = ref({
  open: false,
  kind: '',
  file: '',
  content: '',
  totalLines: 0,
  filteredLines: 0,
  matchedLines: 0,
  matchedLineNos: [],
  fileSize: 0,
  truncated: false,
  page: 1,
  perPage: 500,
  totalPages: 1,
  startLineNo: 0,
  endLineNo: 0,
});
const searchQ = ref('');
const searchRegex = ref(false);
const onlyMatches = ref(true);         // 검색 시 일치 라인만 표시 (기본 ON)
const levelFilter = ref('all');         // 'all' | 'info' | 'debug' | 'http' | 'warn' | 'error'
const searchLoading = ref(false);

/** 선택 가능한 레벨들 (표시순) */
const LEVEL_OPTIONS = [
  { value: 'all',   label: t('logs2.all') },
  { value: 'error', label: 'ERROR' },
  { value: 'warn',  label: 'WARN' },
  { value: 'info',  label: 'INFO' },
  { value: 'http',  label: 'HTTP' },
  { value: 'debug', label: 'DEBUG' },
];

async function openViewer(row) {
  viewer.value = {
    open: true, kind: activeKind.value, file: row.relPath,
    content: t('common.loading'),
    totalLines: 0, filteredLines: 0, matchedLines: 0, matchedLineNos: [],
    fileSize: 0, truncated: false,
    page: 1, perPage: 500, totalPages: 1,
    startLineNo: 0, endLineNo: 0,
  };
  searchQ.value = '';
  searchRegex.value = false;
  onlyMatches.value = true;
  levelFilter.value = 'all';
  await loadContent();
}

function closeViewer() {
  viewer.value.open = false;
}

/** 파라미터로 받은 page 기준으로 로드 (기본: viewer.page) */
async function loadContent(targetPage = null) {
  if (!viewer.value.open) return;
  const page = targetPage != null ? targetPage : viewer.value.page;
  searchLoading.value = true;
  try {
    const r = await http.get('/api/admin/logs/content', {
      params: {
        kind: viewer.value.kind,
        file: viewer.value.file,
        q: searchQ.value || '',
        isRegex: searchRegex.value ? '1' : '0',
        onlyMatches: onlyMatches.value ? '1' : '0',
        level: levelFilter.value || 'all',
        page,
        perPage: viewer.value.perPage,
      },
    });
    const d = r.data?.data || {};
    viewer.value.content        = d.content ?? '';
    viewer.value.totalLines     = d.totalLines || 0;
    viewer.value.filteredLines  = d.filteredLines || 0;
    viewer.value.matchedLines   = d.matchedLines || 0;
    viewer.value.matchedLineNos = d.matchedLineNos || [];
    viewer.value.fileSize       = d.fileSize || 0;
    viewer.value.truncated      = !!d.truncated;
    viewer.value.page           = d.page || 1;
    viewer.value.perPage        = d.perPage || viewer.value.perPage;
    viewer.value.totalPages     = d.totalPages || 1;
    viewer.value.startLineNo    = d.startLineNo || 0;
    viewer.value.endLineNo      = d.endLineNo || 0;
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally { searchLoading.value = false; }
}

/** 필터가 바뀌면 1페이지로 리셋 후 재조회 */
function onFilterChange() {
  viewer.value.page = 1;
  loadContent(1);
}

function onSearch() { onFilterChange(); }

/** 페이지 이동 */
function goPage(p) {
  const np = Math.max(1, Math.min(viewer.value.totalPages, p));
  if (np === viewer.value.page) return;
  loadContent(np);
}

/* ========== 다운로드 ========== */
async function downloadOne(file) {
  await downloadZip([{ kind: activeKind.value, file: file.relPath }], null);
}
async function downloadFilteredSingle() {
  if (!viewer.value.open) return;
  const files = [{ kind: viewer.value.kind, file: viewer.value.file }];
  const filter = searchQ.value ? { q: searchQ.value, isRegex: searchRegex.value } : null;
  await downloadZip(files, filter);
}
async function downloadAllCurrentPage() {
  const list = files.value.map(f => ({ kind: activeKind.value, file: f.relPath }));
  if (!list.length) return;
  await downloadZip(list, null);
}

async function downloadZip(files, filter) {
  try {
    const res = await http.post('/api/admin/logs/download', { files, filter }, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `server-logs-${stamp}.zip`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  }
}

/* ========== 포맷 ========== */
function fmtBytes(n) {
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}
function fmtTs(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
</script>

<template>
  <div class="logs-page">
    <!-- 헤더 -->
    <div class="card mb-3">
      <div class="card-body d-flex align-items-center flex-wrap gap-2">
        <h5 class="mb-0 me-3"><i class="bi bi-journal-text text-primary me-2"></i>{{ t('logs2.title') }}</h5>
        <small class="text-secondary">
          <span v-html="t('logs3.intro', { search: t('logs2.search') })"></span>
        </small>
        <!-- 현재 폴더 뷰일 때만 '현재 페이지 zip' 버튼 보임 -->
        <button v-if="activeFolder" class="btn btn-sm btn-outline-primary ms-auto"
                @click="downloadAllCurrentPage" :disabled="!files.length">
          <i class="bi bi-download me-1"></i>{{ t('logFiles.zipPage') }}
        </button>
        <button :class="activeFolder ? '' : 'ms-auto'"
                class="btn btn-sm btn-outline-secondary"
                @click="activeFolder ? loadFiles() : loadFolders()"
                :disabled="loading || foldersLoading">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>
    </div>

    <!-- 종류 탭 -->
    <ul class="nav nav-tabs mb-3">
      <li class="nav-item" v-for="k in kinds" :key="k.kind">
        <a class="nav-link" :class="{ active: activeKind === k.kind }" href="#" @click.prevent="setKind(k.kind)">
          <i class="bi" :class="k.kind === 'sql' ? 'bi-database' : 'bi-file-earmark-text'"></i>
          {{ k.label }}
          <span class="badge bg-light text-dark ms-1">{{ k.fileCount }}</span>
        </a>
      </li>
    </ul>

    <div v-if="error" class="alert alert-danger small">{{ error }}</div>

    <!-- 폴더 리스트 뷰 (activeFolder 가 null 일 때) -->
    <div v-if="!activeFolder" class="card">
      <div class="card-header">
        <i class="bi bi-folder2-open me-2"></i>
        <code>log/{{ activeKind }}</code>
        <small class="text-secondary ms-2">{{ t('logFiles.pickFolder') }}</small>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-hover mb-0 align-middle">
          <thead class="small text-secondary">
            <tr>
              <th>{{ t('logs2.folder') }}</th>
              <th class="text-end" style="width:120px">{{ t('logFiles.fileCount') }}</th>
              <th style="width:200px">{{ t('logFiles.lastModified') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="foldersLoading">
              <td colspan="3" class="text-center text-secondary py-4">
                <span class="spinner-border spinner-border-sm me-2"></span>{{ t('logFiles.loadingFolders') }}
              </td>
            </tr>
            <tr v-else-if="!folders.length">
              <td colspan="3" class="text-center text-secondary py-4">{{ t('logFiles.noFolders') }}</td>
            </tr>
            <tr v-for="f in folders" :key="f.name"
                style="cursor:pointer" @click="openFolder(f)">
              <td>
                <i class="bi bi-folder-fill text-warning me-2"></i>
                <strong>{{ f.name }}</strong>
                <span v-if="f.isRoot" class="badge bg-light text-dark ms-2 small">{{ t('logs2.root') }}</span>
              </td>
              <td class="text-end">
                <span class="badge bg-secondary">{{ f.fileCount }}</span>
              </td>
              <td class="small text-secondary">{{ fmtTs(f.lastModified) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 파일 리스트 뷰 (폴더 선택 후) -->
    <div v-else class="card">
      <div class="card-header d-flex align-items-center flex-wrap gap-2">
        <!-- breadcrumb -->
        <nav aria-label="breadcrumb" class="flex-grow-1">
          <ol class="breadcrumb mb-0" style="--bs-breadcrumb-divider: '›'">
            <li class="breadcrumb-item">
              <a href="#" @click.prevent="backToFolders">
                <i class="bi bi-folder2-open me-1"></i>log/{{ activeKind }}
              </a>
            </li>
            <li class="breadcrumb-item active" aria-current="page">
              <i class="bi bi-folder-fill text-warning me-1"></i>{{ activeFolder }}
            </li>
          </ol>
        </nav>
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-sm btn-outline-secondary" @click="backToFolders">
            <i class="bi bi-arrow-left me-1"></i>{{ t('logFiles.folderList') }}
          </button>
          <select v-model.number="perPage" class="form-select form-select-sm" style="width:80px" @change="page = 1">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <small class="text-secondary">{{ t('logFiles.perPage') }}</small>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-hover mb-0 align-middle">
          <thead class="small text-secondary">
            <tr>
              <th>{{ t('logs2.file') }}</th>
              <th class="text-end" style="width:120px">{{ t('logFiles.size') }}</th>
              <th style="width:180px">{{ t('logFiles.modifiedAt') }}</th>
              <th class="text-end" style="width:120px">{{ t('logFiles.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="text-center text-secondary py-4">
                <span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}
              </td>
            </tr>
            <tr v-else-if="!files.length">
              <td colspan="4" class="text-center text-secondary py-4">
                {{ t('logs2.noFiles') }}
                <!-- ★ v1.15.0 — SQL 탭이 비어 있는 이유를 알려 준다.
                     "왜 없지?" 하고 한참 찾게 되는 자리라, 켜는 방법까지 같이 적는다. -->
                <div v-if="activeKind === 'sql'" class="small mt-2">
                  {{ t('logs2.sqlOffHint') }}<br>
                  <code>LOG_SQL=true</code> {{ t('logs2.sqlOffHow') }}
                </div>
              </td>
            </tr>
            <tr v-for="f in files" :key="f.relPath" style="cursor:pointer" @click="openViewer(f)">
              <td>
                <i class="bi bi-file-earmark-text me-2 text-secondary"></i>
                <code class="small">{{ f.relPath }}</code>
              </td>
              <td class="text-end small">{{ fmtBytes(f.size) }}</td>
              <td class="small text-secondary">{{ fmtTs(f.mtime) }}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-primary"
                        @click.stop="downloadOne(f)"
                        :title="t('logs3.zipOne')">
                  <i class="bi bi-download"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card-footer">
        <div class="d-flex align-items-center flex-wrap gap-2">
          <small class="text-secondary">
            {{ t('logs3.countPage', { total, page, pages: totalPages }) }}
          </small>
          <div class="ms-auto">
            <Pagination v-model:page="page" :total-pages="totalPages" :window-size="10" />
          </div>
        </div>
      </div>
    </div>

    <!-- ───────── 로그 내용 대화상자 ───────── -->
    <div v-if="viewer.open" class="modal-backdrop fade show" @click="closeViewer"></div>
    <div v-if="viewer.open" class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true">
      <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-journal-text me-2"></i>
              <code>{{ viewer.kind }}/{{ viewer.file }}</code>
            </h5>
            <button type="button" class="btn-close" @click="closeViewer" aria-label="Close"></button>
          </div>
          <div class="modal-body" style="padding: 0">
            <!-- 툴바: Level / 검색 / 옵션 / 다운로드 -->
            <div class="viewer-toolbar">
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <!-- Level 필터 -->
                <label class="small text-secondary mb-0 me-1">Level:</label>
                <select v-model="levelFilter" class="form-select form-select-sm" style="width:110px"
                        @change="onFilterChange">
                  <option v-for="opt in LEVEL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>

                <!-- 검색어 -->
                <input v-model="searchQ" type="text" class="form-control form-control-sm"
                       :placeholder="t('logs3.searchPh')" style="max-width:260px"
                       @keyup.enter="onSearch" />

                <!-- 정규식 스위치 -->
                <div class="form-check form-switch mb-0 ms-1">
                  <input v-model="searchRegex" class="form-check-input" type="checkbox" id="logRegexSwitch" />
                  <label class="form-check-label small" for="logRegexSwitch">{{ t('logs2.regex') }}</label>
                </div>

                <!-- 일치 라인만 -->
                <div class="form-check form-switch mb-0">
                  <input v-model="onlyMatches" class="form-check-input" type="checkbox"
                         id="logOnlyMatchesSwitch" :disabled="!searchQ"
                         @change="onFilterChange" />
                  <label class="form-check-label small" for="logOnlyMatchesSwitch">{{ t('logs2.matchedOnly') }}</label>
                </div>

                <button class="btn btn-sm btn-primary" @click="onSearch" :disabled="searchLoading">
                  <span v-if="searchLoading" class="spinner-border spinner-border-sm"></span>
                  <i v-else class="bi bi-search"></i>
                  {{ t('logs2.search') }}
                </button>

                <!-- 다운로드 -->
                <div class="ms-auto d-flex gap-2">
                  <button class="btn btn-sm btn-outline-primary"
                          @click="downloadZip([{ kind: viewer.kind, file: viewer.file }], null)">
                    <i class="bi bi-download me-1"></i>{{ t('logs2.zipFile') }}
                  </button>
                  <button class="btn btn-sm btn-outline-primary"
                          :disabled="!searchQ"
                          @click="downloadFilteredSingle">
                    <i class="bi bi-funnel me-1"></i>{{ t('logs2.zipResults') }}
                  </button>
                </div>
              </div>

              <!-- 상태 줄 -->
              <div class="d-flex align-items-center flex-wrap gap-2 mt-2 small text-secondary">
                <span>{{ t('logs2.size') }} <strong>{{ fmtBytes(viewer.fileSize) }}</strong></span>
                <span>·</span>
                <span>{{ t('logs2.all') }} <strong>{{ viewer.totalLines }}</strong>{{ t('logs3.linesSuffix') }}</span>
                <span v-if="levelFilter !== 'all' || (searchQ && onlyMatches)">·</span>
                <span v-if="levelFilter !== 'all' || (searchQ && onlyMatches)">
                  {{ t('logs3.afterFilter') }} <strong class="text-primary">{{ viewer.filteredLines }}</strong>{{ t('logs3.linesSuffix') }}
                </span>
                <span v-if="searchQ">·</span>
                <span v-if="searchQ" class="text-primary">
                  {{ t('logs3.matched') }} <strong>{{ viewer.matchedLines }}</strong>{{ t('logs3.linesSuffix') }}
                </span>
                <span v-if="viewer.truncated" class="text-warning">
                  · {{ t('logs2.truncated') }}
                </span>

                <!-- 페이지네이션 -->
                <div class="ms-auto d-flex align-items-center gap-2">
                  <select v-model.number="viewer.perPage" class="form-select form-select-sm" style="width:90px"
                          @change="onFilterChange">
                    <option :value="100">{{ t('logs3.nLines', { n: 100 }) }}</option>
                    <option :value="200">{{ t('logs3.nLines', { n: 200 }) }}</option>
                    <option :value="500">{{ t('logs3.nLines', { n: 500 }) }}</option>
                    <option :value="1000">{{ t('logs3.nLines', { n: 1000 }) }}</option>
                    <option :value="2000">{{ t('logs3.nLines', { n: 2000 }) }}</option>
                  </select>
                  <span>
                    {{ viewer.startLineNo }}~{{ viewer.endLineNo }} /
                    <strong>{{ viewer.page }}</strong> / {{ viewer.totalPages }}
                  </span>
                  <button class="btn btn-sm btn-outline-secondary" @click="goPage(1)"
                          :disabled="viewer.page <= 1" :title="t('pagination.k2')">
                    <i class="bi bi-chevron-double-left"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" @click="goPage(viewer.page - 1)"
                          :disabled="viewer.page <= 1" :title="t('pagination.k3')">
                    <i class="bi bi-chevron-left"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" @click="goPage(viewer.page + 1)"
                          :disabled="viewer.page >= viewer.totalPages" :title="t('pagination.k4')">
                    <i class="bi bi-chevron-right"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" @click="goPage(viewer.totalPages)"
                          :disabled="viewer.page >= viewer.totalPages" :title="t('pagination.k5')">
                    <i class="bi bi-chevron-double-right"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- 코드 에디터 -->
            <div class="viewer-editor">
              <CodeEditor :model-value="viewer.content" language="plaintext" :readonly="true" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeViewer">{{ t('common.close') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logs-page { padding-bottom: 24px; }
.card-header { background: #f8f9fb; }
.modal.d-block { z-index: 1055; }
.modal-backdrop.show { opacity: 0.5; }
.viewer-toolbar {
  padding: 10px 14px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fb;
  position: sticky;
  top: 0;
  z-index: 1;
}
.viewer-editor {
  height: 60vh;
  min-height: 400px;
}
.viewer-editor :deep(.code-editor),
.viewer-editor :deep(textarea) {
  height: 100% !important;
  min-height: 400px;
}
</style>
