import { defineStore } from 'pinia';
import http, { setAccessToken } from '../api/http';
import { useUiFlagsStore } from './uiFlags';

export const useAuthStore = defineStore('admin-auth', {
  state: () => ({
    user: null,
    accessToken: null,
  }),
  getters: {
    isLoggedIn: (s) => !!s.accessToken && !!s.user,
  },
  actions: {
    async signup(payload) {
      const r = await http.post('/api/admin/auth/signup', payload);
      return r.data;
    },
    async login({ username, password }) {
      const r = await http.post('/api/admin/auth/login', { username, password });
      const { accessToken, user } = r.data.data;
      this._setAuth(accessToken, user);
      // 로그인 성공 시 UI flag 로드 (실패해도 기본값 false 로 유지)
      try { await useUiFlagsStore().load(); } catch {}
      return r.data;
    },
    async logout() {
      try { await http.post('/api/admin/auth/logout'); } catch {}
      this.clearLocal();
    },
    async silentRefresh() {
      try {
        // 짧은 timeout(3초) — DB 문제로 서버에서 hang 하는 경우에도 앱 mount 가
        // 과도하게 지연되지 않도록. 실패 시 로그인 화면으로 가서 /health 로 DB 에러 표시.
        const r = await http.post('/api/admin/auth/refresh', undefined, { timeout: 3000 });
        const { accessToken, user } = r.data.data;
        this._setAuth(accessToken, user);
        // refresh 성공 시에도 flag 최신화
        try { await useUiFlagsStore().load(); } catch {}
        return true;
      } catch {
        this.clearLocal();
        return false;
      }
    },
    _setAuth(token, user) {
      this.accessToken = token;
      this.user = user;
      setAccessToken(token);
    },
    clearLocal() {
      this.accessToken = null;
      this.user = null;
      setAccessToken(null);
      // flag 도 reset — 로그아웃 상태에서 메뉴가 노출되지 않도록
      try { useUiFlagsStore().clear(); } catch {}
    },
  },
});
