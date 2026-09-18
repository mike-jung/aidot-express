import axios from 'axios';

const http = axios.create({ baseURL: '/', withCredentials: true, timeout: 15_000 });
const authHttp = axios.create({ baseURL: '/', withCredentials: true, timeout: 5_000 });
let accessToken = null;
let sessionVersion = 0;
let refreshPromise = null;
const listeners = new Set();

function publish(session) {
  accessToken = session?.accessToken || null;
  for (const listener of listeners) listener(session);
}

export function setAccessToken(token) {
  sessionVersion++;
  accessToken = token || null;
}
export function getAccessToken() { return accessToken; }
export function getSessionVersion() { return sessionVersion; }
export function onSessionChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 일반 API와 Control 포트의 동시 401은 같은 refresh 요청을 기다린다.
export function refreshSession() {
  if (refreshPromise) return refreshPromise;
  const version = sessionVersion;
  refreshPromise = authHttp.post('/api/admin/auth/refresh').then(response => {
    if (version !== sessionVersion) throw new axios.CanceledError('Session changed');
    const session = response.data?.data;
    if (!session?.accessToken) throw new Error('No accessToken');
    publish(session);
    return session;
  }).catch(error => {
    // 일시적인 네트워크 오류는 세션 폐기와 구분한다.
    if (version === sessionVersion && [401, 403].includes(error.response?.status)) {
      sessionVersion++;
      publish(null);
    }
    throw error;
  }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export function installAuthentication(client) {
  client.interceptors.request.use(cfg => {
    if (accessToken) cfg.headers.set('Authorization', `Bearer ${accessToken}`);
    else cfg.headers.delete('Authorization');
    cfg._sessionVersion = sessionVersion;
    cfg._sentToken = accessToken;
    const plainBody = cfg.data && Object.getPrototypeOf(cfg.data) === Object.prototype;
    if (cfg.method !== 'get' && plainBody && !cfg.data.requestCode) {
      cfg.data = { ...cfg.data, requestCode: `req-${Date.now().toString(36)}` };
    }
    return cfg;
  });
  client.interceptors.response.use(response => response, async error => {
    const original = error.config;
    if (!original || error.response?.status !== 401 || original._retry || original.signal?.aborted
        || original._sessionVersion !== sessionVersion
        || /\/api\/admin\/auth\/(login|refresh|logout|signup)(?:[/?]|$)/.test(original.url || '')) {
      throw error;
    }
    original._retry = true;
    // 이미 다른 요청이 갱신했다면 새 토큰을 재사용한다.
    if (!accessToken || original._sentToken === accessToken) await refreshSession();
    if (original._sessionVersion !== sessionVersion || original.signal?.aborted) {
      throw new axios.CanceledError('Session changed');
    }
    return client(original);
  });
  return client;
}

installAuthentication(http);
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
