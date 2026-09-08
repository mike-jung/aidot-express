import { defineStore } from 'pinia';
import http from '../api/http';

/**
 * Screen Designer 프로젝트 목록/상세를 관리하는 Pinia 스토어.
 *
 *  사용처:
 *   - ProjectListView    : list/create/rename/remove
 *   - ProjectEditorView  : loadById/savePatch/remove
 *
 *  API 계약 (Phase 2):
 *   GET    /api/admin/screen-projects/paged  → { rows, header }
 *   GET    /api/admin/screen-projects/all    → { data: [...] }
 *   GET    /api/admin/screen-projects/:id    → { data: {...} }
 *   POST   /api/admin/screen-projects        → { data: {...} }
 *   PUT    /api/admin/screen-projects/:id    → { data: {...} }
 *   DELETE /api/admin/screen-projects/:id    → { data: { id } }
 *
 *  일관성을 위해 admin-client 의 stores/auth.js 와 같은 options API 스타일로 작성.
 */
export const useScreenProjectsStore = defineStore('screen-projects', {
  state: () => ({
    // 페이지 목록
    rows: [],
    header: { total: 0, page: 1, perPage: 10, totalPages: 0 },

    // 현재 편집 중인 상세 (ProjectEditorView 에서 사용)
    activeId: null,
    activeProject: null,

    // UI 상태
    loading: false,
    saving: false,
    error: null,
  }),

  getters: {
    hasProjects: (s) => s.rows.length > 0,
    projectName: (s) => s.activeProject?.name ?? null,
  },

  actions: {
    /* ────────── 목록 ────────── */

    async loadList(opts = {}) {
      this.loading = true;
      this.error = null;
      try {
        const page = opts.page ?? this.header.page ?? 1;
        const perPage = opts.perPage ?? this.header.perPage ?? 10;
        const r = await http.get('/api/admin/screen-projects/paged', {
          params: { page, perPage },
        });
        // Phase 17 FIX: 프레임워크 response dispatcher (src/core/controllerLoader.js) 가
        //   service 의 { rows, header } 반환값을 감지하면
        //   { code, message, header, data: rows } 로 자동 wrapping 한다.
        //   즉 rows 는 r.data.data 에, header 는 r.data.header 에 위치.
        //   (다른 admin 페이지의 ControllerList.vue 등도 이 패턴 사용)
        this.rows = r.data?.data || [];
        this.header = r.data?.header || this.header;
      } catch (e) {
        this.error = e.response?.data?.message || e.message;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ────────── 상세 ────────── */

    async loadById(id) {
      this.loading = true;
      this.error = null;
      try {
        const r = await http.get(`/api/admin/screen-projects/${id}`);
        this.activeId = Number(id);
        this.activeProject = r.data.data;
        return this.activeProject;
      } catch (e) {
        this.error = e.response?.data?.message || e.message;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /** 편집 세션 종료 — 다른 프로젝트로 전환하거나 목록으로 돌아갈 때 호출 */
    clearActive() {
      this.activeId = null;
      this.activeProject = null;
    },

    /* ────────── 생성 ────────── */

    async createProject(input) {
      this.saving = true;
      this.error = null;
      try {
        const r = await http.post('/api/admin/screen-projects', input);
        return r.data.data;
      } catch (e) {
        this.error = e.response?.data?.message || e.message;
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ────────── 부분 수정 ────────── */

    /**
     * 부분 수정.
     *   - patch 는 { name?, description?, config?, layout?, screens?, vars? } 중 필요한 것만.
     *   - activeId 를 암묵적으로 쓰지 않고 명시 전달 (실수 방지).
     */
    async savePatch(id, patch) {
      this.saving = true;
      this.error = null;
      try {
        const r = await http.put(`/api/admin/screen-projects/${id}`, patch);
        const updated = r.data.data;
        // activeProject 가 이 id 라면 최신화
        if (this.activeId === Number(id)) {
          this.activeProject = updated;
        }
        // rows 목록이 로드돼 있다면 해당 행 갱신 (요약 필드만)
        const idx = this.rows.findIndex((r) => Number(r.id) === Number(id));
        if (idx >= 0) {
          this.rows[idx] = {
            ...this.rows[idx],
            name: updated.name,
            description: updated.description,
            updatedAt: updated.updatedAt,
          };
        }
        return updated;
      } catch (e) {
        this.error = e.response?.data?.message || e.message;
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /**
     * 이름만 변경하는 헬퍼 (rename 모달에서 호출).
     */
    async renameProject(id, newName) {
      return this.savePatch(id, { name: newName });
    },

    /* ────────── 삭제 ────────── */

    async removeProject(id) {
      this.saving = true;
      this.error = null;
      try {
        await http.delete(`/api/admin/screen-projects/${id}`);
        // 목록에서 제거
        this.rows = this.rows.filter((r) => Number(r.id) !== Number(id));
        // 활성 프로젝트가 이것이면 해제
        if (this.activeId === Number(id)) {
          this.clearActive();
        }
      } catch (e) {
        this.error = e.response?.data?.message || e.message;
        throw e;
      } finally {
        this.saving = false;
      }
    },
  },
});
