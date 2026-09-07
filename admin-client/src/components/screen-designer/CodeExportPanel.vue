<script setup>
import { confirmDialog } from '../../composables/useConfirm';
/**
 * CodeExportPanel (Phase 7-c) — 코드 Export 의 완성판.
 *
 *  Phase 7-b 대비 추가된 것:
 *    1) 편집 모드 : 선택 파일을 textarea 에서 수정 → fileEdits 스토어에 저장
 *       - "편집 중" 뱃지, "저장" / "원본으로" 버튼
 *       - 편집된 파일은 트리에서 ● 마크로 구분
 *    2) zip 다운로드 : JSZip 으로 전체 파일을 zip 으로 묶어 브라우저에 다운로드
 *       - 편집본이 있으면 그 내용이 zip 에 들어감 (generator 원본 아님)
 *       - 파일명: <project-name>-<YYYYMMDD-HHmmss>.zip
 *    3) 편집 리셋  : "모든 편집 초기화" — 이 프로젝트의 모든 편집 폐기
 *
 *  JSZip 은 CDN 에서 dynamic import — 번들 크기 영향 최소화.
 *  (사용자가 Export 탭에 실제 들어와서 다운로드를 누를 때만 로드)
 */
import { ref, computed, watch, defineComponent, h } from 'vue';
import { generateProject } from '../../generator/screens/generateProject';
import { useFileEditsStore } from '../../stores/fileEdits';
import CodeEditor from '../CodeEditor.vue';
import { useI18n } from '../../composables/useI18n';

/* ★ v1.20.0 — t() 를 쓰면 선언도 있어야 한다. 없으면 화면을 여는 순간 죽는다. */
const { t } = useI18n();

const props = defineProps({
  project: { type: Object, required: true },
});

const fileEdits = useFileEditsStore();

/* ─── 파일 생성 ─── */
const rawFiles = ref([]);      // generator 의 순수 출력
const genError = ref(null);

function regenerate() {
  genError.value = null;
  try {
    rawFiles.value = generateProject(props.project);
  } catch (e) {
    genError.value = String(e.message || e);
    rawFiles.value = [];
  }
}
watch(() => props.project, regenerate, { deep: true, immediate: true });

// 편집본이 덮인 최종 파일 리스트
const files = computed(() => fileEdits.applyTo(props.project?.id, rawFiles.value));

// 편집된 경로 Set (뱃지 용)
const editedPaths = computed(() => fileEdits.listEditedPaths(props.project?.id));

/* ─── 파일 트리 ─── */
const tree = computed(() => buildTree(files.value));

function buildTree(flat) {
  const root = { type: 'dir', name: '', children: [] };
  for (const file of flat) {
    const parts = file.path.split('/');
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const name = parts[i];
      let next = cur.children.find((c) => c.type === 'dir' && c.name === name);
      if (!next) {
        next = { type: 'dir', name, children: [] };
        cur.children.push(next);
      }
      cur = next;
    }
    cur.children.push({
      type: 'file',
      name: parts[parts.length - 1],
      path: file.path,
      source: file.source,
    });
  }
  sortNode(root);
  return root;
}
function sortNode(node) {
  if (node.type !== 'dir') return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const c of node.children) sortNode(c);
}

/* ─── 선택 + 확장 ─── */
const selected = ref(null);
const expanded = ref(new Set(['', 'src', 'src/layouts', 'src/views', 'src/stores', 'src/components', 'src/api', 'src/router']));

function toggleDir(path) {
  if (expanded.value.has(path)) expanded.value.delete(path);
  else expanded.value.add(path);
  expanded.value = new Set(expanded.value);
}
function isExpanded(path) { return expanded.value.has(path); }
function isEdited(path) { return editedPaths.value.has(path); }

async function selectFile(path) {
  // 편집 중이던 파일이 있으면 저장 여부 확인 (draft 가 dirty 한 경우)
  if (editingPath.value && editDraft.value !== getOriginalContent(editingPath.value) && editDraft.value !== fileEdits.get(props.project?.id, editingPath.value)) {
    if (!await confirmDialog({ title: '저장하지 않은 편집', message: '편집 중인 변경사항이 있습니다.\n저장 없이 이동할까요?', detail: `편집 중: ${editingPath.value}`, confirmText: '이동', cancelText: '계속 편집', variant: 'danger' })) return;
  }
  selected.value = path;
  editingPath.value = null;
  editDraft.value = '';
}

const selectedFile = computed(() => files.value.find((f) => f.path === selected.value) || null);

/** Phase 18: 파일 확장자로 CodeEditor 의 language prop 결정.
 *  CodeEditor 는 현재 'javascript' 와 'sql' 만 지원. 그 외 타입도 javascript syntax
 *  로 대충 읽히는 편이 그나마 낫다 (html/vue/json 모두 유사한 토큰). */
function detectLanguage(path) {
  if (!path) return 'javascript';
  const p = path.toLowerCase();
  if (p.endsWith('.sql')) return 'sql';
  // .vue/.js/.jsx/.ts/.tsx/.json/.html/.css 등은 javascript 로 (JS 하이라이터가 가장 일반적)
  return 'javascript';
}
const selectedLang = computed(() => detectLanguage(selectedFile.value?.path));

function getOriginalContent(path) {
  const f = rawFiles.value.find((x) => x.path === path);
  return f?.content || '';
}

/* ─── 편집 ─── */
const editingPath = ref(null);   // 편집 중인 파일 경로
const editDraft = ref('');        // 편집 중인 draft

function startEdit() {
  if (!selectedFile.value) return;
  editingPath.value = selectedFile.value.path;
  editDraft.value = selectedFile.value.content;
}

function saveEdit() {
  if (!editingPath.value) return;
  fileEdits.set(props.project?.id, editingPath.value, editDraft.value);
  editingPath.value = null;
  editDraft.value = '';
}

function cancelEdit() {
  editingPath.value = null;
  editDraft.value = '';
}

async function revertFile() {
  if (!selectedFile.value) return;
  if (!await confirmDialog({ title: t('codeExportPanel.k15'), message: t('codeExportPanel.k16'), detail: selectedFile.value.path, confirmText: t('codeExportPanel.k17'), variant: 'danger' })) return;
  fileEdits.clear(props.project?.id, selectedFile.value.path);
}

async function clearAllEdits() {
  if (!editedPaths.value.size) return;
  if (!await confirmDialog({ title: '편집 전체 초기화', message: `이 프로젝트의 편집 ${editedPaths.value.size}개를 모두 초기화할까요?`, detail: '되돌릴 수 없습니다.', confirmText: '초기화', variant: 'danger' })) return;
  fileEdits.clearAll(props.project?.id);
  editingPath.value = null;
  editDraft.value = '';
}

/* ─── zip 다운로드 ─── */
const downloading = ref(false);
const downloadError = ref(null);

async function downloadZip() {
  if (downloading.value) return;
  downloading.value = true;
  downloadError.value = null;
  try {
    // JSZip 동적 import (CDN). 오프라인이면 실패할 수 있음.
    const JSZip = await loadJSZip();
    const zip = new JSZip();
    for (const f of files.value) {
      zip.file(f.path, f.content);
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = makeZipFilename(props.project?.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    downloadError.value = String(e.message || e);
  } finally {
    downloading.value = false;
  }
}

async function loadJSZip() {
  /* ★ v1.11.7 — CDN(jsdelivr) 이 아니라 번들에 포함한다. 병원망처럼 인터넷이 없는 곳에서 [zip 다운로드] 가
     조용히 실패하던 것을 실행 검증에서 확인했다. */
  const mod = await import('jszip');
  return mod.default || mod;
}

function makeZipFilename(name) {
  const base = String(name || 'project').replace(/[^a-zA-Z0-9가-힣_\-]/g, '_').slice(0, 40) || 'project';
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  return `${base}-${stamp}.zip`;
}

/* ─── 통계 ─── */
const totalBytes = computed(() =>
  files.value.reduce((n, f) => n + (f.content?.length || 0), 0)
);
</script>

<template>
  <div class="code-export-panel">

    <!-- 헤더 + 액션 -->
    <div class="export-header d-flex justify-content-between align-items-start mb-3">
      <div>
        <h6 class="mb-1">
          <i class="bi bi-download me-1"></i>{{ t('codeExportPanel.k1') }}
        </h6>
        <div class="small text-secondary">
          {{ t('codeExportPanel.k2') }}<strong>{{ files.length }}</strong> 파일 · {{ (totalBytes / 1024).toFixed(1) }} KB)
          <span v-if="editedPaths.size > 0" class="text-warning ms-1">
            · <i class="bi bi-pencil-fill"></i> {{ editedPaths.size }}개 편집됨
          </span>
        </div>
      </div>
      <div class="d-flex gap-2">
        <button v-if="editedPaths.size > 0"
                class="btn btn-sm btn-outline-danger"
                @click="clearAllEdits"
                :title="t('codeExportPanel.k12')">
          <i class="bi bi-arrow-counterclockwise"></i> {{ t('codeExportPanel.k3') }}
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="regenerate" :title="t('codeExportPanel.k13')">
          <i class="bi bi-arrow-clockwise"></i> {{ t('codeExportPanel.k4') }}
        </button>
        <button class="btn btn-sm btn-primary"
                @click="downloadZip"
                :disabled="downloading || files.length === 0">
          <span v-if="downloading" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-file-earmark-zip me-1"></i>
          {{ t('codeExportPanel.k5') }}
        </button>
      </div>
    </div>

    <!-- 에러 -->
    <div v-if="genError" class="alert alert-danger small">
      <i class="bi bi-exclamation-triangle me-1"></i>코드 생성 실패: {{ genError }}
    </div>
    <div v-if="downloadError" class="alert alert-danger small">
      <i class="bi bi-exclamation-triangle me-1"></i>다운로드 실패: {{ downloadError }}
      <div class="mt-1 text-secondary">
        {{ t('codeExportPanel.k6') }}
      </div>
    </div>

    <!-- Split: 좌측 트리 + 우측 뷰어/에디터 -->
    <div v-if="!genError" class="export-split">

      <!-- 파일 트리 -->
      <div class="file-tree">
        <div class="tree-title d-flex justify-content-between">
          <span>파일 ({{ files.length }})</span>
        </div>
        <TreeNode
          v-for="c in tree.children"
          :key="c.type === 'file' ? c.path : c.name"
          :node="c"
          :parent-path="''"
          :selected="selected"
          :is-expanded="isExpanded"
          :is-edited="isEdited"
          @toggle="toggleDir"
          @select="selectFile"
        />
      </div>

      <!-- 뷰어 / 에디터 -->
      <div class="code-viewer">
        <div v-if="!selectedFile" class="viewer-empty">
          <i class="bi bi-file-earmark-code fs-1 d-block mb-2 opacity-50"></i>
          {{ t('codeExportPanel.k7') }}
        </div>
        <template v-else>
          <!-- 툴바 -->
          <div class="viewer-header">
            <code class="small flex-grow-1 text-truncate">{{ selectedFile.path }}</code>
            <span class="badge bg-light text-dark border ms-2">{{ selectedFile.source }}</span>
            <span v-if="isEdited(selectedFile.path)" class="badge bg-warning text-dark ms-1">
              <i class="bi bi-pencil-fill"></i> {{ t('codeExportPanel.k8') }}
            </span>

            <!-- 편집 모드 아닐 때 -->
            <template v-if="!editingPath">
              <button class="btn btn-sm btn-outline-primary ms-2"
                      @click="startEdit">
                <i class="bi bi-pencil"></i> {{ t('codeExportPanel.k9') }}
              </button>
              <button v-if="isEdited(selectedFile.path)"
                      class="btn btn-sm btn-outline-secondary ms-1"
                      @click="revertFile"
                      :title="t('codeExportPanel.k14')">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
            </template>

            <!-- 편집 모드 -->
            <template v-else>
              <button class="btn btn-sm btn-success ms-2" @click="saveEdit">
                <i class="bi bi-check-lg"></i> {{ t('codeExportPanel.k10') }}
              </button>
              <button class="btn btn-sm btn-outline-secondary ms-1" @click="cancelEdit">
                <i class="bi bi-x-lg"></i> {{ t('codeExportPanel.k11') }}
              </button>
            </template>
          </div>

          <!-- Phase 18: syntax highlighting + 세로 스크롤 가능한 CodeEditor 사용 -->
          <div class="viewer-editor-wrap">
            <CodeEditor v-if="!editingPath"
                        :model-value="selectedFile.content"
                        :language="selectedLang"
                        :readonly="true" />
            <CodeEditor v-else
                        v-model="editDraft"
                        :language="selectedLang"
                        :readonly="false" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
// 재귀 컴포넌트
import { defineComponent, h } from 'vue';

function iconForFile(name) {
  if (name.endsWith('.vue')) return 'bi bi-filetype-js text-success';
  if (name.endsWith('.js')) return 'bi bi-filetype-js text-warning';
  if (name.endsWith('.json')) return 'bi bi-filetype-json';
  if (name.endsWith('.html')) return 'bi bi-filetype-html text-danger';
  if (name.endsWith('.md')) return 'bi bi-filetype-md';
  if (name.endsWith('.css')) return 'bi bi-filetype-css text-primary';
  return 'bi bi-file-earmark';
}

export const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    node: Object,
    parentPath: String,
    selected: String,
    isExpanded: Function,
    isEdited: Function,
  },
  emits: ['toggle', 'select'],
  setup(props, { emit }) {
    return () => {
      const { node, parentPath, selected, isExpanded, isEdited } = props;
      if (node.type === 'dir') {
        const dirPath = parentPath ? parentPath + '/' + node.name : node.name;
        const expanded = isExpanded(dirPath);
        const header = h('button', {
          class: 'tree-dir',
          onClick: () => emit('toggle', dirPath),
        }, [
          h('i', { class: `bi ${expanded ? 'bi-folder2-open' : 'bi-folder'} me-1` }),
          h('span', { class: 'tree-name' }, node.name),
        ]);
        const children = expanded
          ? h('div', { class: 'tree-children' }, node.children.map((c) =>
              h(TreeNode, {
                key: c.type === 'file' ? c.path : c.name,
                node: c,
                parentPath: dirPath,
                selected, isExpanded, isEdited,
                onToggle: (p) => emit('toggle', p),
                onSelect: (p) => emit('select', p),
              })
            ))
          : null;
        return h('div', { class: 'tree-dir-wrap' }, [header, children]);
      }
      const edited = isEdited(node.path);
      return h('button', {
        class: ['tree-file', { selected: selected === node.path, edited }],
        onClick: () => emit('select', node.path),
      }, [
        h('i', { class: iconForFile(node.name) + ' me-1' }),
        h('span', { class: 'tree-name' }, node.name),
        edited ? h('span', { class: 'edit-dot ms-auto', title: '편집됨' }, '●') : null,
      ]);
    };
  },
});
</script>

<style scoped>
.code-export-panel { display: flex; flex-direction: column; }

.export-split {
  display: flex;
  gap: 1rem;
  min-height: 500px;
}

.file-tree {
  flex: 0 0 280px;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: #fbfcfd;
  padding: 0.5rem;
  overflow-y: auto;
  max-height: calc(100vh - 280px);
}

.tree-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
}

.code-viewer {
  flex: 1;
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.viewer-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #94a3b8;
  padding: 2rem;
}

.viewer-header {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.75rem;
  gap: 0.25rem;
}

/* Phase 18: CodeEditor 컨테이너 — 검정 배경 + 세로 스크롤 */
.viewer-editor-wrap {
  flex: 1;
  min-height: 500px;
  max-height: calc(100vh - 340px);
  display: flex;
  overflow: hidden;
}
.viewer-editor-wrap :deep(.cm-editor) {
  flex: 1;
  min-height: 0;
  height: 100%;
  font-size: 13px;
}
.viewer-editor-wrap :deep(.cm-scroller) {
  overflow: auto !important;   /* 세로 스크롤 보장 */
}
</style>

<style>
/* 전역 — TreeNode 가 render fn 사용 */
.tree-dir,
.tree-file {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.25rem 0.5rem;
  border: none;
  background: none;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  color: #1f2937;
  text-align: left;
  cursor: pointer;
}
.tree-dir:hover, .tree-file:hover { background: #f1f5f9; }
.tree-file.selected { background: #eff6ff; color: #1d4ed8; font-weight: 500; }
.tree-file.edited { color: #b45309; }
.tree-file.edited.selected { color: #1d4ed8; }

.tree-children {
  margin-left: 1rem;
  border-left: 1px dashed #e5e7eb;
  padding-left: 0.25rem;
}
.tree-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.edit-dot {
  color: #d97706;
  font-size: 0.8rem;
  line-height: 1;
}
</style>
