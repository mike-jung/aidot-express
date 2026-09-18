import { defineStore } from 'pinia';
import http, { setAccessToken, refreshSession, onSessionChange, getSessionVersion } from '../api/http';
import { useUiFlagsStore } from './uiFlags';

export const useAuthStore = defineStore('admin-auth', {
  state: () => ({
    user: null,
    accessToken: null,
    sessionExpired: false,
  }),
  getters: {
    isLoggedIn: (s) => !!s.accessToken && !!s.user,
  },
  actions: {
    async signup(payload) {
      const r = await http.post('/api/admin/auth/signup', payload);
      return r.data;
    },
    _watchSession() {
      if (this._sessionUnsubscribe) return;
      this._sessionUnsubscribe = onSessionChange(session => {
        this.accessToken = session?.accessToken || null;
        this.user = session?.user || null;
        this.sessionExpired = !session;
        if (!session) { try { useUiFlagsStore().clear(); } catch {} }
      });
    },
    async login({ username, password }) {
      this._watchSession();
      const version = getSessionVersion();
      const r = await http.post('/api/admin/auth/login', { username, password });
      if (version !== getSessionVersion()) throw new Error('Login cancelled');
      const { accessToken, user } = r.data.data;
      this._setAuth(accessToken, user);
      // 로그인 성공 시 UI flag 로드 (실패해도 기본값 false 로 유지)
      try { await useUiFlagsStore().load(); } catch {}
      return r.data;
    },
    async logout() {
      this.clearLocal();
      try { await http.post('/api/admin/auth/logout'); } catch {}
    },
    async silentRefresh() {
      try {
        this._watchSession();
        await refreshSession();
        // refresh 성공 시에도 flag 최신화
        try { await useUiFlagsStore().load(); } catch {}
        return true;
      } catch {
        this.clearLocal();
        return false;
      }
    },
    _setAuth(token, user) {
      this._watchSession();
      this.sessionExpired = false;
      this.accessToken = token;
      this.user = user;
      setAccessToken(token);
    },
    clearLocal() {
      this.sessionExpired = false;
      this.accessToken = null;
      this.user = null;
      setAccessToken(null);
      // flag 도 reset — 로그아웃 상태에서 메뉴가 노출되지 않도록
      try { useUiFlagsStore().clear(); } catch {}
    },
  },
});
