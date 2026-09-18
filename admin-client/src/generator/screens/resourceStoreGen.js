/** 강의용 ref + defineStore 패턴으로 리소스별 Store를 생성한다. */
import { pascal, camel } from './helpers.js';

export function genResourceStore(resource) {
  const {
    key,
    endpointPath,
    method = 'GET',
    resultKey = null,
    realtime = false,
    streamPath = null,
  } = resource;
  const storeKey = camel(key);
  const requestMethod = String(method).toLowerCase();
  const hasRealtime = realtime && !!streamPath;

  // 메서드를 아는 조회 함수는 api.get()/api.post()처럼 익숙한 형태로 출력한다.
  const readRequest = ['post', 'put', 'patch'].includes(requestMethod)
    ? `api.${requestMethod}(url, values, { signal })`
    : ['get', 'head', 'delete', 'options'].includes(requestMethod)
      ? `api.${requestMethod}(url, {\n      params: values,\n      signal,\n    })`
      : `api.request({\n      url,\n      method: ${JSON.stringify(requestMethod)},\n      params: values,\n      signal,\n    })`;

  const content = `import { ref, computed, onScopeDispose } from 'vue';
import { defineStore } from 'pinia';
import api, {
  unwrapResponse,
  errorMessage,
  isCanceled,
  requestPath,
  resultValue,${hasRealtime ? '\n  apiUrl,' : ''}
} from '@/api/axios';

// 서버 주소와 인증 처리는 공통 Axios 클라이언트에서 담당한다.
const ENDPOINT = ${JSON.stringify(endpointPath)};

export const use${pascal(key)}Store = defineStore('${storeKey}', () => {
  // 화면에서 함께 사용하는 데이터와 요청 상태
  const rows = ref([]);
  const currentItem = ref(null);
  const error = ref('');
  const reading = ref(false);
  const saving = ref(false);
  const loading = computed(() => reading.value || saving.value);

  // 페이지를 이동하거나 새로고침해도 검색조건을 유지한다.
  const query = ref({});
  const total = ref(0);
  const page = ref(1);
  const perPage = ref(10);
  const totalPages = ref(1);

  let readController = null;
  let readVersion = 0;
  let lastRead = 'list';
  let detailParams = {};

  // 먼저 보낸 요청이 늦게 도착해 최신 데이터를 덮어쓰지 않도록 취소한다.
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

    return {
      version: readVersion,
      signal: readController.signal,
    };
  }

  // 경로 값(:id 등)과 나머지 입력값을 나누어 서버에 전달한다.
  async function requestData(params, signal) {
    const { url, params: values } = requestPath(ENDPOINT, params);
    const response = await ${readRequest};

    return unwrapResponse(response);
  }

  // 목록 조회: 검색조건이 바뀌면 첫 페이지부터 조회한다.
  async function fetchList(options = {}) {
    const changesFilter = Object.keys(options).some(
      key => !['page', 'perPage'].includes(key),
    );

    query.value = {
      ...query.value,
      ...options,
      page: options.page ?? (changesFilter ? 1 : page.value),
      perPage: options.perPage ?? perPage.value,
    };
    lastRead = 'list';

    const { version, signal } = beginRead();

    try {
      const body = await requestData(query.value, signal);

      if (version !== readVersion) {
        return;
      }

      // API가 배열 또는 페이지 정보가 포함된 객체를 반환하는 경우를 처리한다.
      const data = resultValue(body, ${JSON.stringify(resultKey)});
      const list = Array.isArray(data)
        ? data
        : (data?.rows ?? data?.items ?? data?.records ?? data?.data ?? []);

      if (!Array.isArray(list)) {
        throw new Error('목록 응답이 배열이 아닙니다. resultKey를 확인하세요.');
      }

      const meta = Array.isArray(data) ? body : data;

      rows.value = list;
      currentItem.value = list[0] ?? null;
      total.value = Math.max(0, Number(meta?.total ?? list.length) || 0);
      page.value = Math.max(1, Number(meta?.page ?? query.value.page) || 1);
      perPage.value = Math.max(1, Number(meta?.perPage ?? query.value.perPage) || 10);
      totalPages.value = Math.max(
        1,
        Number(meta?.totalPages) || Math.ceil(total.value / perPage.value),
      );

      return list;
    } catch (cause) {
      // 취소된 조회는 오류로 표시하지 않는다. 실제 실패는 화면의 error에 표시한다.
      if (version === readVersion && !isCanceled(cause)) {
        error.value = errorMessage(cause);
      }
    } finally {
      if (version === readVersion) {
        reading.value = false;
        readController = null;
      }
    }
  }

  // 상세 조회: URL에 필요한 id 등을 params로 받는다.
  async function fetchOne(params = {}) {
    lastRead = 'detail';
    detailParams = { ...params };
    currentItem.value = null;

    const { version, signal } = beginRead();

    try {
      const body = await requestData(detailParams, signal);

      if (version !== readVersion) {
        return;
      }

      const data = resultValue(body, ${JSON.stringify(resultKey)});
      currentItem.value = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);

      return currentItem.value;
    } catch (cause) {
      if (version === readVersion && !isCanceled(cause)) {
        error.value = errorMessage(cause);
      }
    } finally {
      if (version === readVersion) {
        reading.value = false;
        readController = null;
      }
    }
  }

  // 마지막으로 조회한 목록 또는 상세를 같은 조건으로 다시 읽는다.
  function refresh() {
    if (lastRead === 'detail') {
      return fetchOne(detailParams);
    }

    return fetchList();
  }

  // 폼 저장: 실패를 호출자에게 전달해야 대화상자가 입력값을 유지할 수 있다.
  async function submitForm(httpMethod, params = {}) {
    if (saving.value) {
      throw new Error('저장 중입니다. 잠시 기다려 주세요.');
    }

    saving.value = true;
    error.value = '';

    try {
      const { url, params: values } = requestPath(ENDPOINT, params);
      const method = String(httpMethod || ${JSON.stringify(method)}).toUpperCase();
      const config = { url, method };

      // POST/PUT/PATCH는 본문으로, GET/DELETE 등은 쿼리로 전달한다.
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        config.data = values;
      } else {
        config.params = values;
      }

      const response = await api.request(config);

      return unwrapResponse(response);
    } catch (cause) {
      error.value = errorMessage(cause);
      throw cause;
    } finally {
      saving.value = false;
    }
  }
${hasRealtime ? `
  // 실시간 알림을 받으면 마지막 조회를 갱신한다. 연결은 여러 화면이 함께 사용한다.
  const realtimeConnected = ref(false);
  let eventSource = null;
  let refreshTimer = null;
  let subscribers = 0;

  function subscribeRealtime() {
    subscribers++;

    if (eventSource) {
      return;
    }

    try {
      eventSource = new EventSource(apiUrl(${JSON.stringify(streamPath)}), {
        withCredentials: true,
      });

      eventSource.addEventListener('change', () => {
        if (refreshTimer) {
          return;
        }

        // 짧은 시간에 여러 알림이 도착하면 한 번만 조회한다.
        refreshTimer = setTimeout(() => {
          refreshTimer = null;
          refresh();
        }, 250);
      });

      eventSource.onopen = () => {
        realtimeConnected.value = true;
      };

      eventSource.onerror = () => {
        realtimeConnected.value = false;
      };
    } catch (cause) {
      error.value = errorMessage(cause);
    }
  }

  function unsubscribeRealtime() {
    subscribers = Math.max(0, subscribers - 1);

    if (subscribers > 0) {
      return;
    }

    eventSource?.close();
    eventSource = null;
    clearTimeout(refreshTimer);
    refreshTimer = null;
    realtimeConnected.value = false;
  }

  onScopeDispose(() => {
    subscribers = 0;
    unsubscribeRealtime();
  });
` : ''}
  // Store가 해제될 때 진행 중인 조회도 정리한다.
  onScopeDispose(cancelReads);

  return {
    rows,
    currentItem,
    loading,
    saving,
    error,
    total,
    page,
    perPage,
    totalPages,
    query,

    fetchList,
    fetchOne,
    submitForm,
    refresh,
    cancelReads,${hasRealtime ? '\n\n    realtimeConnected,\n    subscribeRealtime,\n    unsubscribeRealtime,' : ''}
  };
});
`;

  return {
    path: `src/stores/${storeKey}Store.js`,
    content,
    source: 'store',
    resourceKey: storeKey,
  };
}

export function genAllResourceStores(resources) {
  return resources.map(genResourceStore);
}
