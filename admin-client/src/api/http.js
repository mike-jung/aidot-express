import axios from 'axios';

const http = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 15_000,
});

let accessToken = null;
export function setAccessToken(t) { accessToken = t; }
export function getAccessToken() { return accessToken; }

http.interceptors.request.use((cfg) => {
  if (accessToken) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (cfg.method !== 'get' && cfg.data && typeof cfg.data === 'object' && !cfg.data.requestCode) {
    cfg.data.requestCode = `req-${Date.now().toString(36)}`;
  }
  return cfg;
});

let isRefreshing = false;
let pendingQueue = [];
function flushQueue(error, newToken) {
  pendingQueue.forEach(({ resolve, reject, originalRequest }) => {
    if (error) return reject(error);
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    resolve(http(originalRequest));
  });
  pendingQueue = [];
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status !== 401 || original._retry
        || original.url?.includes('/api/admin/auth/refresh')
        || original.url?.includes('/api/admin/auth/login')) {
      return Promise.reject(error);
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject, originalRequest: original });
      });
    }
    original._retry = true;
    isRefreshing = true;
    try {
      const r = await http.post('/api/admin/auth/refresh');
      const newToken = r.data?.data?.accessToken;
      if (!newToken) throw new Error('No accessToken');
      setAccessToken(newToken);
      flushQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return http(original);
    } catch (e) {
      flushQueue(e, null);
      setAccessToken(null);
      const { useAuthStore } = await import('../stores/auth.js');
      useAuthStore().clearLocal();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  },
);

export default http;

/**
 * SSE 접속 주소 만들기 — 30초짜리 1회용 티켓을 발급받아 붙인다.
 *
 *  EventSource 는 Authorization 헤더를 못 보내기 때문에 인증 정보를 URL 에 실어야 한다.
 *  장기 토큰(access_token)을 URL 에 넣으면 로그·리퍼러에 오래 남으므로,
 *  서버에서 티켓을 받아 그것만 붙인다. (티켓은 접속하는 순간 소모됨)
 *
 *    const url = await sseUrl('/api/admin/metrics/stream', { windowSec: 60 });
 *    const es = new EventSource(url);
 *
 *  재접속할 때는 매번 다시 호출해야 한다 (티켓은 1회용).
 */
export async function sseUrl(path, params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  try {
    const r = await http.post('/api/admin/sse/ticket', {}, { timeout: 5000 });
    const ticket = r.data?.data?.ticket;
    if (ticket) q.set('ticket', ticket);
  } catch {
    // 티켓 발급 실패(예: 구버전 서버) → 티켓 없이 시도한다.
    //   인증이 필요한 스트림이면 서버가 401 로 거절하고, 화면은 폴링으로 물러선다.
  }
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}
