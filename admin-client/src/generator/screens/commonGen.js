/**
 * commonGen — 생성된 프로젝트의 공용 인프라 파일들.
 *  - src/api/client.js    : axios 기반 apiClient (envelope unwrap + 401 자동 refresh)
 *  - src/stores/auth.js   : authStore (access token 은 메모리 보관, refresh 는 HttpOnly 쿠키)
 *
 *  ⚠ v1.2.0 보안 변경
 *    이전 템플릿은 access token 을 localStorage 에 저장했다. 그러면 생성된 화면에 XSS 가 하나라도
 *    생기는 순간 토큰이 그대로 유출된다(스크립트가 localStorage 를 읽을 수 있으므로).
 *    관리자 콘솔(admin-client)과 동일하게 **메모리에만 보관**하고, 새로고침 후에는
 *    서버가 내려준 HttpOnly refresh 쿠키(경로 /api/auth)로 조용히 재발급받는 방식으로 바꿨다.
 *      - 토큰이 스토리지 어디에도 남지 않는다
 *      - refresh 쿠키는 HttpOnly + SameSite 라 스크립트가 읽을 수 없다
 *      - 401 이 나면 refresh 를 1회 시도하고 원래 요청을 재시도한다 (동시 요청이어도 갱신은 한 번)
 */

export function genApiClient(project) {
  const baseUrl = (project?.config?.apiBaseUrl) || globalThis.location?.origin || 'http://localhost:7901';
  return {
    path: 'src/api/client.js',
    content: `import axios from 'axios';

/**
 * apiClient — aidot-express 서버와 통신하는 axios 인스턴스.
 *  서버 응답 envelope: { code, message, header, data }
 *  interceptor 에서 .data 를 언래핑해 호출자가 바로 쓰기 편하게 한다.
 *
 *  토큰 보관 정책
 *   - access token : 이 모듈의 지역 변수(메모리)에만 둔다. localStorage/sessionStorage 사용 금지.
 *   - refresh token: 서버가 HttpOnly 쿠키로 내려준다(경로 /api/auth). JS 는 접근하지 못한다.
 *   - 새로고침하면 access token 은 사라지지만 부팅 시 refreshAccessToken() 한 번으로 복구된다.
 */
const BASE_URL = ${JSON.stringify(baseUrl)};

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,   // refresh 쿠키 전송에 필요
  timeout: 15000,
});

let accessToken = null;
let refreshPromise = null;                 // 동시에 401 이 여러 개 나도 refresh 는 한 번만
const listeners = new Set();               // 토큰 변경 알림 (authStore 가 구독)

export function setAccessToken(token) {
  accessToken = token || null;
  for (const fn of listeners) { try { fn(accessToken); } catch (_) {} }
}
export function getAccessToken() { return accessToken; }
export function onAccessTokenChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** refresh 쿠키로 access token 재발급. 실패하면 null 반환(비로그인 상태). */
export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(BASE_URL + '/api/auth/refresh', {}, { withCredentials: true, timeout: 15000 })
      .then((res) => {
        const body = res.data;
        const token = (body && body.data ? body.data.accessToken : null) || null;
        setAccessToken(token);
        return token;
      })
      .catch(() => { setAccessToken(null); return null; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// 요청 시 Bearer 토큰 부착 (있으면)
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = 'Bearer ' + accessToken;
  }
  return config;
});

// 응답 envelope unwrap + 401 자동 재발급
apiClient.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && typeof body === 'object' && 'code' in body) {
      return { ...res, data: body.data, header: body.header, envelope: body };
    }
    return res;
  },
  async (err) => {
    const original = err.config || {};
    const status = err.response && err.response.status;
    const isAuthCall = String(original.url || '').indexOf('/api/auth/') !== -1;
    if (status === 401 && !original._retried && !isAuthCall) {
      original._retried = true;                 // 재시도는 1회 (무한 루프 방지)
      const token = await refreshAccessToken();
      if (token) return apiClient(original);
    }
    return Promise.reject(err);
  },
);

export default apiClient;
`,
    source: 'common',
  };
}

export function genAuthStore() {
  return {
    path: 'src/stores/auth.js',
    content: `import { defineStore } from 'pinia';
import apiClient, { setAccessToken, getAccessToken, refreshAccessToken } from '@/api/client';

/**
 * authStore — 로그인 상태.
 *  access token 은 apiClient 의 메모리에만 보관한다(스토리지 저장 안 함).
 *  앱 시작 시 bootstrap() 을 한 번 호출하면 HttpOnly refresh 쿠키로 로그인 상태를 복구한다.
 *
 *  main.js 예시:
 *    const auth = useAuthStore();
 *    await auth.bootstrap();
 *    app.mount('#app');
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    authReady: false,     // bootstrap 완료 여부 (라우터 가드에서 사용)
  }),
  getters: {
    isAuthenticated: () => !!getAccessToken(),
  },
  actions: {
    async login({ username, password }) {
      const r = await apiClient.post('/api/auth/login', { username, password });
      setAccessToken((r.data && r.data.accessToken) || null);
      this.user = (r.data && r.data.user) || null;
      return r.data;
    },

    /** 새로고침 후 로그인 상태 복구 — 실패해도 예외를 던지지 않는다(비로그인으로 진행) */
    async bootstrap() {
      const token = await refreshAccessToken();
      if (token) {
        try {
          const me = await apiClient.get('/api/auth/me');
          this.user = (me.data && me.data.user) || me.data || null;
        } catch (_) { this.user = null; }
      }
      this.authReady = true;
      return !!token;
    },

    async logout() {
      try { await apiClient.post('/api/auth/logout'); } catch (_) {}
      this.clearLocal();
    },

    clearLocal() {
      this.user = null;
      setAccessToken(null);
    },
  },
});
`,
    source: 'common',
  };
}
