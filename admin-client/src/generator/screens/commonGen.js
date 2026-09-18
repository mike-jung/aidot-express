/** 공통 HTTP 클라이언트와 인증 Store. WT-frontend의 기존 파일 경로를 유지한다. */
export function genApiClient() {
  return {
    path: 'src/api/axios.js',
    source: 'common',
    content: String.raw`import axios from 'axios';

// Store와 View에서 같은 인스턴스를 가져와 api.get()/api.post()로 요청한다.
// 서버 주소와 제한 시간은 .env에서 설정한다. 응답은 Axios의 response.data를 유지한다.
const baseURL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const timeout = Math.max(1000, Number(import.meta.env.VITE_API_TIMEOUT) || 15000);
const config = {
  baseURL,
  timeout,
  withCredentials: true,
};

const api = axios.create(config);

// 토큰 갱신에는 재시도 인터셉터가 없는 인스턴스를 사용해 무한 반복을 막는다.
const authApi = axios.create(config);
let accessToken = null;
let refreshPromise = null;
let sessionVersion = 0;
const tokenListeners = new Set();

// 요청 전: API 경로를 맞추고 현재 토큰을 헤더에 넣는다.
api.interceptors.request.use(config => {
  config.url = apiPath(config.url);
  config._authToken = accessToken;
  config._sessionVersion = sessionVersion;

  if (accessToken) {
    config.headers.set('Authorization', 'Bearer ' + accessToken);
  } else {
    config.headers.delete('Authorization');
  }

  return config;
});

// 응답 후: 인증이 만료된 요청만 토큰 갱신 후 한 번 재시도한다.
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    const isAuthRequest = /(?:^|\/)auth(?:\/|$)/.test(original?.url || '');

    if (!original || error.response?.status !== 401 || isAuthRequest
        || original._retried || original.signal?.aborted) {
      throw error;
    }

    original._retried = true;
    let token = accessToken;

    if (!token || token === original._authToken) {
      // 요청 중 로그아웃했다면 예전 요청으로 인증을 복구하지 않는다.
      if (original._sessionVersion !== sessionVersion) {
        throw error;
      }

      token = await refreshAccessToken();
    }

    if (!token || original.signal?.aborted) {
      throw error;
    }

    return api.request(original);
  },
);

export default api;

// 응답 처리: aidot-express의 { code, data } 등을 벗기고 일반 응답은 그대로 돌려준다.
export function unwrapResponse(response) {
  const body = response.data;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  const isEnvelope = Object.hasOwn(body, 'data') && (
    'code' in body || 'header' in body || 'message' in body || Object.keys(body).length === 1
  );

  return isEnvelope ? body.data : body;
}

export function errorMessage(error) {
  return error?.response?.data?.message
    || error?.message
    || '요청을 처리하지 못했습니다.';
}

export function isCanceled(error) {
  return axios.isCancel(error) || error?.name === 'AbortError';
}

// 디자이너의 /api/books와 직접 작성한 /books를 모두 지원한다.
export function apiPath(path) {
  const value = String(path || '');

  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(value)) {
    throw new Error('Use a relative API path');
  }

  const basePath = new URL(baseURL, 'http://local.invalid').pathname.replace(/\/$/, '');
  const hasApiPrefix = value === '/api' || value.startsWith('/api/');

  if (basePath.endsWith('/api') && hasApiPrefix) {
    return value.slice(4) || '/';
  }

  return value;
}

// EventSource처럼 절대 주소가 필요한 클라이언트도 같은 서버 설정을 사용한다.
export function apiUrl(path) {
  const origin = globalThis.location?.origin || 'http://localhost';
  const relativePath = apiPath(path).replace(/^\//, '');

  return new URL(baseURL + '/' + relativePath, origin).href;
}

// :id 또는 {id}는 URL에 넣고, 나머지 값은 쿼리/본문으로 반환한다.
export function requestPath(template, values = {}) {
  const params = { ...values };

  function pathValue(name) {
    const value = values[name];

    if (value === undefined || value === null || value === '') {
      throw new Error('필수 경로 값이 없습니다: ' + name);
    }

    delete params[name];
    return encodeURIComponent(String(value));
  }

  const url = String(template)
    .replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name) => pathValue(name))
    .replace(/\/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => '/' + pathValue(name));

  return { url, params };
}

// 디자이너의 resultKey(예: rows, result.items)로 필요한 데이터를 선택한다.
export function resultValue(data, key) {
  if (!key) {
    return data;
  }

  let value = data;

  for (const part of key.split('.')) {
    value = value?.[part];
  }

  return value ?? data;
}

// 인증 Store와 Axios가 같은 메모리 토큰을 사용하도록 동기화한다.
export function setAccessToken(token) {
  sessionVersion++;
  accessToken = token || null;

  for (const listener of tokenListeners) {
    listener(accessToken);
  }
}

export function getAccessToken() {
  return accessToken;
}

export function onAccessTokenChange(listener) {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

// 여러 요청이 동시에 401을 받아도 토큰 갱신은 한 번만 실행한다.
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = requestAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function requestAccessToken() {
  const version = sessionVersion;

  try {
    const response = await authApi.post(apiPath('/api/auth/refresh'), {});
    const data = unwrapResponse(response);

    // 갱신 도중 로그인/로그아웃했다면 그 상태를 우선한다.
    if (version !== sessionVersion) {
      return null;
    }

    setAccessToken(data?.accessToken);
    return accessToken;
  } catch {
    if (version === sessionVersion) {
      setAccessToken(null);
    }

    return null;
  }
}
`,
  };
}

export function genAuthStore() {
  return {
    path: 'src/stores/auth.js',
    source: 'common',
    content: `import { ref, computed, onScopeDispose } from 'vue';
import { defineStore } from 'pinia';
import api, {
  unwrapResponse,
  setAccessToken,
  getAccessToken,
  onAccessTokenChange,
  refreshAccessToken,
} from '@/api/axios';

export const useAuthStore = defineStore('auth', () => {
  // 사용자와 인증 상태를 화면에 제공한다. 토큰은 디스크에 저장하지 않는다.
  const user = ref(null);
  const token = ref(getAccessToken());
  const authReady = ref(false);
  const loading = ref(false);
  const isAuthenticated = computed(() => !!token.value);

  let bootstrapPromise = null;
  let revision = 0;

  const unsubscribe = onAccessTokenChange(value => {
    token.value = value;

    if (!value) {
      user.value = null;
    }
  });

  onScopeDispose(unsubscribe);

  // 로그인 요청 중 로그아웃한 경우에는 늦은 응답을 적용하지 않는다.
  async function login(credentials) {
    const ownRevision = ++revision;
    loading.value = true;

    try {
      const response = await api.post('/api/auth/login', credentials);
      const data = unwrapResponse(response);

      if (ownRevision !== revision) {
        return null;
      }

      setAccessToken(data?.accessToken);
      user.value = data?.user || null;
      authReady.value = true;

      return data;
    } finally {
      if (ownRevision === revision) {
        loading.value = false;
      }
    }
  }

  // 새로고침 시 쿠키로 인증을 복원한다. 여러 화면이 호출해도 한 번만 실행한다.
  async function bootstrap() {
    if (authReady.value) {
      return isAuthenticated.value;
    }

    if (!bootstrapPromise) {
      bootstrapPromise = restoreSession().finally(() => {
        bootstrapPromise = null;
      });
    }

    return bootstrapPromise;
  }

  async function restoreSession() {
    const ownRevision = revision;
    const restored = await refreshAccessToken();

    if (restored && ownRevision === revision) {
      try {
        const response = await api.get('/api/auth/me');
        const data = unwrapResponse(response);

        if (ownRevision === revision) {
          user.value = data?.user || data || null;
        }
      } catch {
        if (ownRevision === revision) {
          clearLocal();
        }
      }
    }

    authReady.value = true;
    return isAuthenticated.value;
  }

  function clearLocal() {
    revision++;
    user.value = null;
    loading.value = false;
    authReady.value = true;
    setAccessToken(null);
  }

  async function logout() {
    clearLocal();

    try {
      await api.post('/api/auth/logout');
    } catch {
      // 통신 실패와 관계없이 이 화면의 로그인 상태는 이미 해제했다.
    }
  }

  return {
    user,
    authReady,
    loading,
    isAuthenticated,

    login,
    bootstrap,
    logout,
    clearLocal,
  };
});
`,
  };
}
