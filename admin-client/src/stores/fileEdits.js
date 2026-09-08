/**
 * fileEdits — 사용자가 Code Export 패널에서 편집한 파일 내용 오버라이드.
 *
 *  동작 원리:
 *   - 프로젝트별로 { filePath -> editedContent } 맵 보관
 *   - generateProject 가 재생성한 파일이 있어도 여기에 편집본이 있으면 그걸 우선 사용
 *   - sessionStorage 에 저장 (브라우저 탭 닫으면 사라짐) — 프로젝트 spec 과 분리
 *     (편집은 "일회성 실험" 성격이 강하고, DB 저장하지 않는 것이 안전)
 *
 *  API:
 *    get(projectId, path)          : 편집된 내용 or null
 *    set(projectId, path, content) : 편집 저장
 *    clear(projectId, path)        : 특정 파일 편집 제거 (원본으로 복원)
 *    clearAll(projectId)            : 해당 프로젝트의 모든 편집 제거
 *    applyTo(projectId, files)     : generator 출력 파일 리스트를 순회하며
 *                                    편집본이 있으면 content 를 덮어씀
 *    listEditedPaths(projectId)    : 편집된 경로들의 Set 반환 (UI 뱃지 등)
 */
import { defineStore } from 'pinia';

const STORAGE_KEY = 'aidot.screen-designer.fileEdits';

function loadFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveToStorage(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // quota exceeded 등 — 무시 (편집본 크면 어쩔 수 없음)
    console.warn('[fileEdits] storage save failed:', e);
  }
}

export const useFileEditsStore = defineStore('fileEdits', {
  state: () => ({
    // { [projectId]: { [path]: content } }
    edits: loadFromStorage(),
  }),

  getters: {
    /** projectId 의 편집 맵 (없으면 {}) */
    forProject: (s) => (projectId) => s.edits[String(projectId)] || {},
  },

  actions: {
    get(projectId, path) {
      const map = this.edits[String(projectId)];
      return map ? (map[path] ?? null) : null;
    },

    set(projectId, path, content) {
      const pid = String(projectId);
      if (!this.edits[pid]) this.edits[pid] = {};
      this.edits[pid][path] = content;
      saveToStorage(this.edits);
    },

    clear(projectId, path) {
      const pid = String(projectId);
      const map = this.edits[pid];
      if (!map) return;
      delete map[path];
      if (Object.keys(map).length === 0) delete this.edits[pid];
      saveToStorage(this.edits);
    },

    clearAll(projectId) {
      delete this.edits[String(projectId)];
      saveToStorage(this.edits);
    },

    /**
     * generator 가 만든 files 배열에 편집본을 합성.
     *  - generator 가 만들어낸 파일에 편집본이 있으면 content 교체
     *  - generator 가 더 이상 만들지 않는 파일의 편집본은 버림 (obsolete)
     *  반환: 편집 반영된 새 files 배열 (원본 불변)
     */
    applyTo(projectId, files) {
      const pid = String(projectId);
      const map = this.edits[pid];
      if (!map) return files;
      const validPaths = new Set(files.map((f) => f.path));
      // obsolete 제거
      let dirty = false;
      for (const p of Object.keys(map)) {
        if (!validPaths.has(p)) { delete map[p]; dirty = true; }
      }
      if (dirty) {
        if (Object.keys(map).length === 0) delete this.edits[pid];
        saveToStorage(this.edits);
      }
      // 편집본 반영
      return files.map((f) => (map[f.path] != null
        ? { ...f, content: map[f.path], edited: true }
        : f
      ));
    },

    listEditedPaths(projectId) {
      const map = this.edits[String(projectId)];
      return new Set(map ? Object.keys(map) : []);
    },
  },
});
