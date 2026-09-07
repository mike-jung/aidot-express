/**
 * toasts — 간단한 toast 메시지 시스템.
 *   useToastStore().push({ type, title, message, timeout })
 *   useToastStore().remove(id)
 *
 * 타입: 'success' | 'error' | 'info' | 'warning'
 *
 * App.vue (또는 MainLayout) 에 <ToastContainer /> 를 한 번 마운트하면
 * 모든 화면/컴포넌트에서 useToastStore().push(...) 로 알림을 띄울 수 있다.
 *
 * Phase 23: INSERT/UPDATE 결과 피드백용으로 도입.
 */
import { defineStore } from 'pinia';

let nextId = 1;

export const useToastStore = defineStore('toasts', {
  state: () => ({
    items: [],    // [{ id, type, title, message, timeout }]
  }),
  actions: {
    push({ type = 'info', title = '', message = '', timeout = 4000 } = {}) {
      const id = nextId++;
      const item = { id, type, title, message, timeout };
      this.items.push(item);
      if (timeout > 0) {
        setTimeout(() => this.remove(id), timeout);
      }
      return id;
    },
    remove(id) {
      const i = this.items.findIndex((t) => t.id === id);
      if (i >= 0) this.items.splice(i, 1);
    },
    success(title, message) { return this.push({ type: 'success', title, message }); },
    error(title, message) { return this.push({ type: 'error', title, message, timeout: 6000 }); },
    info(title, message) { return this.push({ type: 'info', title, message }); },
    warning(title, message) { return this.push({ type: 'warning', title, message }); },
  },
});
