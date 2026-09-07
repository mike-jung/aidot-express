/**
 * resourceStoreGen — 각 resource 의 Pinia store 코드 생성.
 *
 *  admin-client 버전 (POC 와 차이):
 *   POC: parser 결과(ResourceDescriptor.endpoints) 로 role 별 endpoint (list/list-paged/detail/create/...) 생성
 *   ours: endpoint path 하나만 알고 있으므로 "fetchList" 단 하나의 기본 action 생성.
 *         추후 사용자가 편집해서 create/update/remove 등 추가할 수 있도록 주석으로 안내.
 *
 *  입력: resources: Array<{ key, endpointPath, method, resultKey }>
 *    key 는 camelCase resource name (book, order, user), path 는 /api/books 같은 풀 경로
 *
 *  출력: Array<{ path, content }>
 */
import { pascal, camel } from './helpers.js';

export function genResourceStore(resource) {
  const { key, endpointPath, method = 'GET', resultKey = null, realtime = false, streamPath = null } = resource;
  const Pascal = pascal(key);
  const c = camel(key);

  // resultKey 가 'rows' 면 body.rows, 'data' 면 body.data, null 이면 body 자체를 배열로 간주.
  const unwrap = resultKey
    ? `r.data?.${resultKey} ?? r.data ?? []`
    : `Array.isArray(r.data) ? r.data : (r.data?.rows ?? [])`;

  const content = `import { defineStore } from 'pinia';
import apiClient from '@/api/client';

/**
 * ${Pascal}Store — ${key} 리소스 상태 + fetch 액션.
 *  자동 생성된 기본 형태. 필요 시 create/update/remove 액션 등을 추가하세요.
 *
 *  Phase 33 (patch-12): Pattern A (QueryForm + Detail) 및 Pattern B (FormDialog) 를
 *  생성 코드에서 지원하기 위해 fetchOne / submitForm 두 액션이 추가됨.
 */
export const use${Pascal}Store = defineStore('${c}', {
  state: () => ({
    rows: [],
    currentItem: null,
    loading: false,
    error: '',
    total: 0,
    page: 1,
    perPage: 10,
    totalPages: 1,${realtime && streamPath ? `
    // 실시간 연결 상태 — 화면에서 "● 실시간" 배지로 쓸 수 있다
    realtimeConnected: false,
    _es: null,
    _lastRealtimeAt: 0,` : ''}
  }),

  actions: {
    async fetchList(opts = {}) {
      this.loading = true;
      this.error = '';
      try {
        const r = await apiClient.${method.toLowerCase()}(${JSON.stringify(endpointPath)}, ${
          method.toUpperCase() === 'GET' ? '{ params: opts }' : 'opts'
        });
        this.rows = ${unwrap};
        this.total = r.data?.total ?? this.rows.length;
        this.page = r.data?.page ?? opts.page ?? 1;
        this.perPage = r.data?.perPage ?? opts.perPage ?? this.perPage;
        this.totalPages = r.data?.totalPages ?? Math.max(1, Math.ceil(this.total / this.perPage));
        if (!this.currentItem && this.rows.length) this.currentItem = this.rows[0];
      } catch (e) {
        this.error = e.response?.data?.message || e.message || '요청 실패';
      } finally {
        this.loading = false;
      }
    },

${realtime && streamPath ? `    /* ── 실시간 자동 갱신 (SSE) ─────────────────────────────────────
     *  서버가 데이터 변경(change) 을 알려 주면 목록을 다시 읽는다.
     *  · 연결이 끊기면 브라우저가 스스로 다시 붙는다 (EventSource 기본 동작)
     *  · 알림이 몰려 와도 1초에 한 번만 다시 읽는다
     *  구독 주소: ${streamPath}
     * ------------------------------------------------------------- */
    subscribeRealtime() {
      if (this._es) return;                       // 이미 구독 중
      try {
        this._es = new EventSource(${JSON.stringify(streamPath)});
      } catch (e) {
        this.error = '실시간 연결 실패: ' + e.message;
        return;
      }
      this._es.addEventListener('change', () => {
        const now = Date.now();
        if (now - (this._lastRealtimeAt || 0) < 1000) return;
        this._lastRealtimeAt = now;
        this.fetchList();
      });
      this._es.onerror = () => { this.realtimeConnected = false; };
      this._es.onopen = () => { this.realtimeConnected = true; };
    },

    unsubscribeRealtime() {
      if (this._es) { this._es.close(); this._es = null; }
      this.realtimeConnected = false;
    },

` : ''}    /**
     * 단건 조회 (Pattern A — QueryFormWidget 의 @submit 에서 호출).
     *  params 객체에 URL path param (예: { id: 1 }) 이나 query param 이 포함됨.
     *  path 템플릿에 {paramName} 이 있으면 params 값으로 치환, 나머지는 ?query 로 붙임.
     */
    async fetchOne(params = {}) {
      this.loading = true;
      this.error = '';
      try {
        let url = ${JSON.stringify(endpointPath)};
        const query = { ...params };
        url = url.replace(/\\{([A-Za-z_][A-Za-z0-9_]*)\\}/g, (_, name) => {
          const v = params[name];
          delete query[name];
          return v != null ? encodeURIComponent(String(v)) : '{' + name + '}';
        });
        // ★ v1.11.7 — /api/books/:id 형식(콘솔 라우트 표기)도 채운다
        url = url.replace(/\\/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => {
          const v = params[name];
          delete query[name];
          return v != null ? '/' + encodeURIComponent(String(v)) : '/:' + name;
        });
        const r = await apiClient.get(url, { params: query });
        let data = r.data;
        // envelope 자동 unwrap
        if (data && typeof data === 'object' && 'data' in data && ('code' in data || 'message' in data)) {
          data = data.data;
        }
        this.currentItem = Array.isArray(data) ? (data[0] ?? null) : data;
      } catch (e) {
        this.error = e.response?.data?.message || e.message || '요청 실패';
        this.currentItem = null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 일반 write 액션 (Pattern B — FormDialogWidget 의 @submit 에서 호출).
     *  httpMethod: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
     *  params: 폼 필드 값들 — path param 은 URL 에 치환, 나머지는 body (GET/DELETE 는 query).
     */
    async submitForm(httpMethod, params = {}) {
      this.loading = true;
      this.error = '';
      try {
        let url = ${JSON.stringify(endpointPath)};
        const body = { ...params };
        url = url.replace(/\\/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => {
          const v = params[name];
          delete body[name];
          return v != null ? '/' + encodeURIComponent(String(v)) : '/:' + name;
        });
        url = url.replace(/\\{([A-Za-z_][A-Za-z0-9_]*)\\}/g, (_, name) => {
          const v = params[name];
          delete body[name];
          return v != null ? encodeURIComponent(String(v)) : '{' + name + '}';
        });
        const m = String(httpMethod || 'POST').toLowerCase();
        const useBody = m === 'post' || m === 'put' || m === 'patch';
        const r = useBody
          ? await apiClient[m](url, body)
          : await apiClient[m](url, { params: body });
        return r.data;
      } catch (e) {
        this.error = e.response?.data?.message || e.message || '요청 실패';
        throw e;
      } finally {
        this.loading = false;
      }
    },
  },
});
`;
  return { path: `src/stores/${c}Store.js`, content, source: 'store', resourceKey: c };
}

/** 여러 resource 에 대해 genResourceStore 를 일괄 호출 */
export function genAllResourceStores(resources) {
  return resources.map(genResourceStore);
}
