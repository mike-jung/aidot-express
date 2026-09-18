/** Generate ref + defineStore stores, matching the WT-frontend teaching style. */
import { pascal, camel } from './helpers.js';

export function genResourceStore(resource) {
  const { key, endpointPath, method = 'GET', resultKey = null, realtime = false, streamPath = null } = resource;
  const c = camel(key);
  const content = `import { defineStore } from 'pinia';
import { ref, computed, onScopeDispose } from 'vue';
import api, { unwrapResponse, errorMessage, isCanceled, requestPath, resultValue${realtime && streamPath ? ', apiUrl' : ''} } from '@/api/axios';

export const use${pascal(key)}Store = defineStore('${c}', () => {
  const rows = ref([]);
  const currentItem = ref(null);
  const error = ref('');
  const reading = ref(false);
  const saving = ref(false);
  const loading = computed(() => reading.value || saving.value);
  const total = ref(0);
  const page = ref(1);
  const perPage = ref(10);
  const totalPages = ref(1);
  const query = ref({});
  let readController = null;
  let readVersion = 0;
  let lastRead = 'list';
  let detailParams = {};

  function cancelReads() {
    readVersion++;
    readController?.abort();
    readController = null;
    reading.value = false;
  }
  function beginRead() {
    cancelReads();
    readController = new AbortController();
    reading.value = true;
    error.value = '';
    return { version: readVersion, signal: readController.signal };
  }
  async function read(params, signal) {
    const target = requestPath(${JSON.stringify(endpointPath)}, params);
    const method = ${JSON.stringify(method.toLowerCase())};
    const config = { url: target.url, method, signal };
    config[['post', 'put', 'patch'].includes(method) ? 'data' : 'params'] = target.params;
    return unwrapResponse(await api.request(config));
  }
  async function fetchList(opts = {}) {
    const changesFilter = Object.keys(opts).some(key => !['page', 'perPage'].includes(key));
    query.value = { ...query.value, ...opts, page: opts.page ?? (changesFilter ? 1 : page.value), perPage: opts.perPage ?? perPage.value };
    lastRead = 'list';
    const { version, signal } = beginRead();
    try {
      const body = await read(query.value, signal);
      if (version !== readVersion) return;
      const data = resultValue(body, ${JSON.stringify(resultKey)});
      const list = Array.isArray(data) ? data : (data?.rows ?? data?.items ?? data?.records ?? data?.data ?? []);
      if (!Array.isArray(list)) throw new Error('목록 응답이 배열이 아닙니다. resultKey를 확인하세요.');
      rows.value = list;
      const meta = Array.isArray(data) ? body : data;
      total.value = Math.max(0, Number(meta?.total) || list.length);
      page.value = Math.max(1, Number(meta?.page ?? query.value.page) || 1);
      perPage.value = Math.max(1, Number(meta?.perPage ?? query.value.perPage) || 10);
      totalPages.value = Math.max(1, Number(meta?.totalPages) || Math.ceil(total.value / perPage.value));
      currentItem.value = list[0] ?? null;
      return list;
    } catch (cause) {
      if (version === readVersion && !isCanceled(cause)) error.value = errorMessage(cause);
    } finally {
      if (version === readVersion) { reading.value = false; readController = null; }
    }
  }
  async function fetchOne(params = {}) {
    lastRead = 'detail';
    detailParams = { ...params };
    const { version, signal } = beginRead();
    currentItem.value = null;
    try {
      const body = await read(detailParams, signal);
      if (version !== readVersion) return;
      const data = resultValue(body, ${JSON.stringify(resultKey)});
      currentItem.value = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
      return currentItem.value;
    } catch (cause) {
      if (version === readVersion && !isCanceled(cause)) error.value = errorMessage(cause);
    } finally {
      if (version === readVersion) { reading.value = false; readController = null; }
    }
  }
  function refresh() { return lastRead === 'detail' ? fetchOne(detailParams) : fetchList(); }

  async function submitForm(httpMethod, params = {}) {
    if (saving.value) throw new Error('저장 중입니다. 잠시 기다려 주세요.');
    saving.value = true;
    error.value = '';
    try {
      const target = requestPath(${JSON.stringify(endpointPath)}, params);
      const method = String(httpMethod || ${JSON.stringify(method)}).toLowerCase();
      const config = { url: target.url, method };
      config[['post', 'put', 'patch'].includes(method) ? 'data' : 'params'] = target.params;
      return unwrapResponse(await api.request(config));
    } catch (cause) {
      error.value = errorMessage(cause);
      throw cause; // The dialog must stay open when saving fails.
    } finally { saving.value = false; }
  }
${realtime && streamPath ? `
  const realtimeConnected = ref(false);
  let eventSource = null;
  let refreshTimer = null;
  let subscribers = 0;
  function subscribeRealtime() {
    subscribers++;
    if (eventSource) return;
    try {
      eventSource = new EventSource(apiUrl(${JSON.stringify(streamPath)}), { withCredentials: true });
      eventSource.addEventListener('change', () => {
        if (refreshTimer) return;
        refreshTimer = setTimeout(() => { refreshTimer = null; void refresh(); }, 250);
      });
      eventSource.onopen = () => { realtimeConnected.value = true; };
      eventSource.onerror = () => { realtimeConnected.value = false; };
    } catch (cause) { error.value = errorMessage(cause); }
  }
  function unsubscribeRealtime() {
    subscribers = Math.max(0, subscribers - 1);
    if (subscribers) return;
    eventSource?.close();
    eventSource = null;
    clearTimeout(refreshTimer);
    refreshTimer = null;
    realtimeConnected.value = false;
  }
  onScopeDispose(() => { subscribers = 0; unsubscribeRealtime(); });
` : ''}
  onScopeDispose(cancelReads);
  return { rows, currentItem, loading, saving, error, total, page, perPage, totalPages, query,
    fetchList, fetchOne, submitForm, refresh, cancelReads${realtime && streamPath ? ', realtimeConnected, subscribeRealtime, unsubscribeRealtime' : ''} };
});
`;
  return { path: `src/stores/${c}Store.js`, content, source: 'store', resourceKey: c };
}

export function genAllResourceStores(resources) { return resources.map(genResourceStore); }
