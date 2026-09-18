/** Shared Axios and Pinia setup store code, using the WT-frontend module paths. */
export function genApiClient() {
  return { path: 'src/api/axios.js', source: 'common', content: `import axios from 'axios';

const env = import.meta.env || {};
const BASE_URL = String(env.VITE_API_BASE_URL || '/api').replace(/\\/$/, '');
const timeout = Math.max(1000, Number(env.VITE_API_TIMEOUT) || 15000);
const api = axios.create({ baseURL: BASE_URL, timeout, withCredentials: true });
const authApi = axios.create({ baseURL: BASE_URL, timeout, withCredentials: true });
let accessToken = null;
let refreshPromise = null;
let sessionVersion = 0;
const listeners = new Set();

export function setAccessToken(token) {
  sessionVersion++;
  accessToken = token || null;
  for (const callback of listeners) callback(accessToken);
}
export function getAccessToken() { return accessToken; }
export function onAccessTokenChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Axios keeps its normal response shape: response.data is the server body.
export function unwrapResponse(response) {
  const body = response?.data;
  return body && typeof body === 'object' && !Array.isArray(body)
    && Object.hasOwn(body, 'data') && ('code' in body || 'header' in body || 'message' in body || Object.keys(body).length === 1)
    ? body.data : body;
}
export function errorMessage(error) {
  return error?.response?.data?.message || error?.message || '요청을 처리하지 못했습니다.';
}
export function isCanceled(error) { return axios.isCancel(error) || error?.name === 'AbortError'; }

// Accept both api.get('/books') and designer endpoints such as '/api/books'.
export function apiPath(input) {
  let value = String(input || '');
  if (/^(?:[a-z][a-z\\d+.-]*:)?\\/\\//i.test(value)) throw new Error('Use a relative API path');
  const basePath = new URL(BASE_URL, 'http://local.invalid').pathname.replace(/\\/$/, '');
  if (basePath.endsWith('/api') && (value === '/api' || value.startsWith('/api/'))) value = value.slice(4) || '/';
  return value;
}
export function apiUrl(input) {
  const origin = globalThis.location?.origin || 'http://localhost';
  return new URL(BASE_URL + '/' + apiPath(input).replace(/^\\//, ''), origin).href;
}
export function requestPath(template, values = {}) {
  const params = { ...values };
  const take = name => {
    const value = params[name];
    if (value === undefined || value === null || value === '') throw new Error('필수 경로 값이 없습니다: ' + name);
    delete params[name];
    return encodeURIComponent(String(value));
  };
  const url = String(template).replace(/\\{([A-Za-z_][A-Za-z0-9_]*)\\}/g, (_, name) => take(name))
    .replace(/\\/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => '/' + take(name));
  return { url, params };
}
export function resultValue(data, key) {
  return key ? String(key).split('.').reduce((value, part) => value?.[part], data) ?? data : data;
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    const version = sessionVersion;
    refreshPromise = authApi.post(apiPath('/api/auth/refresh'), {})
      .then(response => {
        const token = unwrapResponse(response)?.accessToken || null;
        if (version === sessionVersion) setAccessToken(token);
        return version + 1 === sessionVersion ? accessToken : null;
      })
      .catch(() => { if (version === sessionVersion) setAccessToken(null); return null; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.request.use(config => {
  config.url = apiPath(config.url);
  config._authToken = accessToken;
  config._sessionVersion = sessionVersion;
  if (accessToken) config.headers.set('Authorization', 'Bearer ' + accessToken);
  else config.headers.delete('Authorization');
  return config;
});
api.interceptors.response.use(response => response, async error => {
  const original = error.config;
  const authCall = /(?:^|\\/)auth(?:\\/|$)/.test(original?.url || '');
  if (original && error.response?.status === 401 && !original._retried && !authCall && !original.signal?.aborted) {
    original._retried = true;
    const token = accessToken && accessToken !== original._authToken ? accessToken : (original._sessionVersion === sessionVersion ? await refreshAccessToken() : null);
    if (token && !original.signal?.aborted) return api(original);
  }
  return Promise.reject(error);
});

export default api;
` };
}

export function genAuthStore() {
  return { path: 'src/stores/auth.js', source: 'common', content: `import { defineStore } from 'pinia';
import { ref, computed, onScopeDispose } from 'vue';
import api, { unwrapResponse, setAccessToken, getAccessToken, onAccessTokenChange, refreshAccessToken } from '@/api/axios';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const token = ref(getAccessToken());
  const authReady = ref(false);
  const loading = ref(false);
  const isAuthenticated = computed(() => !!token.value);
  let bootstrapPromise = null;
  let revision = 0;
  const unsubscribe = onAccessTokenChange(value => { token.value = value; if (!value) user.value = null; });
  onScopeDispose(unsubscribe);

  async function login(credentials) {
    const ownRevision = ++revision;
    loading.value = true;
    try {
      const data = unwrapResponse(await api.post('/api/auth/login', credentials));
      if (ownRevision !== revision) return null;
      setAccessToken(data?.accessToken);
      user.value = data?.user || null;
      authReady.value = true;
      return data;
    } finally { if (ownRevision === revision) loading.value = false; }
  }
  async function bootstrap() {
    if (authReady.value) return isAuthenticated.value;
    if (!bootstrapPromise) {
      const ownRevision = revision;
      bootstrapPromise = (async () => {
        const restored = await refreshAccessToken();
        if (restored && ownRevision === revision) {
          try {
            const data = unwrapResponse(await api.get('/api/auth/me'));
            if (ownRevision === revision) user.value = data?.user || data || null;
          } catch { if (ownRevision === revision) clearLocal(); }
        }
        authReady.value = true;
        return isAuthenticated.value;
      })().finally(() => { bootstrapPromise = null; });
    }
    return bootstrapPromise;
  }
  function clearLocal() {
    revision++;
    user.value = null;
    loading.value = false;
    authReady.value = true;
    setAccessToken(null);
  }
  async function logout() {
    clearLocal(); // A pending refresh/login cannot restore a logged-out session.
    try { await api.post('/api/auth/logout'); } catch { /* local logout already completed */ }
  }
  return { user, authReady, loading, isAuthenticated, login, bootstrap, logout, clearLocal };
});
` };
}
