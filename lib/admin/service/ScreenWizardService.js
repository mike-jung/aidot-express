/**
 * ScreenWizardService — 화면 자동 생성 Wizard 용 서비스.
 *
 *  Phase 34 (patch-13): aidot-express 와 aidot-server 양쪽 통합 버전.
 *   aidot-server 의 dependencies 분석 + aidot-express 의 SQL 파라미터 추출 병합.
 *
 *  설계 요약:
 *   - 컨트롤러/서비스/SQL 메타는 ControllerMetaService / ServiceMetaService /
 *     SqlMetaService 를 **@Autowired 로 재사용**. 직접 파일시스템 파싱 최소화.
 *
 *   - probe 는 self-call HTTP 호출. 호출자의 cookie / Authorization 헤더를 그대로
 *     전달하여 인증 보호된 엔드포인트도 호출 가능. DI 컨테이너 등록 여부와 무관.
 *
 *  제공 API:
 *   1. analyze(controllerId, handler)
 *        return {
 *          controllerName, controllerId, basePath, controllerType, file,
 *          handler, routeType, method, path, fullPath,
 *          inputs: [{ name, type, required, default?, source, desc }],
 *             // source: 'path' | 'query' | 'body-or-query'
 *          suggestedWidget: 'list'|'detail'|'form'|'button'|'stat'|'text',
 *          dependencies: {
 *            services: [{ name, propertyName, file, sqlFile, preview }],
 *            sqls:     [{ fileBase, file, content, queryIds }],
 *          },
 *          isMutation,
 *        }
 *
 *   2. probe({ controllerId, handlerName, params, cookie, authHeader })
 *        return {
 *          ok, status,
 *          sample,             // 응답 body (envelope unwrap 후, 일부 truncate)
 *          shape: 'pagedRows'|'rowsArray'|'object'|'primitive'|'null'|'unknown',
 *          listPath: 'rows'|'data'|'items'|null,
 *          outputFields: [{ name, type, sample }],
 *          error?,             // ok=false 인 경우
 *        }
 *
 *  side-effect 있는 (POST/PUT/DELETE) handler 는 UI 에서 사용자 확인을 받음.
 */
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Service, Log, Autowired } from '../../../src/core/decorators.js';
import config from '../../../src/config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

@Service('ScreenWizardService')
export default class ScreenWizardService {

  @Autowired('ControllerMetaService') controllerMetaService;
  @Autowired('ServiceMetaService')    serviceMetaService;
  @Autowired('SqlMetaService')        sqlMetaService;

  @Log log;

  /* ════════════════════════════ analyze ════════════════════════════ */

  /**
   * controllerId + handlerName 으로 handler 의 static meta 반환.
   *
   * 입력 파라미터 추출은 3단계:
   *  1) 경로 :param → path 파라미터 (required, 'path' 소스)
   *  2) route.type 별 관례적 query 파라미터 (page/perPage/keyword 등)
   *  3) SQL 파라미터 (service method body → .get('xxx') → SQL 파일의 :param) — 가능한 경우만
   *
   * dependencies 는 ControllerMetaService 가 이미 파싱한 autowired_services 기반.
   */
  async analyze(controllerId, handlerName) {
    if (!controllerId || !handlerName) {
      throw Object.assign(new Error('controllerId 와 handlerName 이 필요합니다'), { status: 400 });
    }
    const ctrl = await this.controllerMetaService.findById(String(controllerId));
    if (!ctrl) {
      throw Object.assign(new Error(`컨트롤러를 찾을 수 없습니다: ${controllerId}`), { status: 404 });
    }
    const route = (ctrl.routes || []).find(
      (r) => r.handler === handlerName || r.handlerName === handlerName
    );
    if (!route) {
      throw Object.assign(
        new Error(`핸들러를 찾을 수 없습니다: ${controllerId}.${handlerName}`),
        { status: 404 },
      );
    }

    const method = (route.method || 'GET').toUpperCase();
    const fullPath = this._joinPath(ctrl.basePath || ctrl.base_path, route.path);
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const inputs = this._analyzeInputs(ctrl, route, handlerName);
    const suggestedWidget = this._suggestWidget(route, method);
    const dependencies = await this._resolveDependencies(ctrl);

    return {
      controllerName: ctrl.name,
      controllerId: ctrl.id,
      basePath: ctrl.basePath || ctrl.base_path,
      controllerType: ctrl.controller_type || 'DB',
      file: ctrl.file_path,
      handler: route.handler || route.handlerName,
      routeType: route.type || 'custom',
      method,
      path: route.path,
      fullPath,
      inputs,
      /* ★ v1.23.0 — 입력이 하나도 없을 때 그 까닭을 함께 준다.
         화면은 이 값을 보고 "SQL 을 못 따라갔다" 와 "정말 입력이 없다" 를 구분해 안내한다. */
      inputsNote: inputs.length ? null : (this._lastSqlError
        ? `SQL 파라미터를 따라가지 못했습니다: ${this._lastSqlError}`
        : '이 API 는 받는 입력이 없습니다 (경로 파라미터도, SQL 의 :param 도 없음).'),
      suggestedWidget,
      dependencies,
      isMutation,
    };
  }

  /**
   * 3-pass 입력 분석: path param + 관례적 query param + SQL :param.
   */
  _analyzeInputs(ctrl, route, handlerName) {
    const inputs = [];
    const seen = new Set();

    // 1) 경로 내 :param
    const pathParams = (route.path || '').match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (pathParams) {
      for (const p of pathParams) {
        const name = p.slice(1);
        if (seen.has(name)) continue;
        inputs.push({
          name,
          type: /id$/i.test(name) ? 'number' : 'string',
          required: true,
          source: 'path',
          desc: `경로 파라미터 :${name}`,
        });
        seen.add(name);
      }
    }

    // 2) route.type 별 표준 쿼리 파라미터
    const type = route.type;
    const method = (route.method || 'GET').toUpperCase();
    if (method === 'GET') {
      if (type === 'listPaged') {
        for (const e of [
          { name: 'page',    type: 'number', default: 1,  required: false, source: 'query', desc: '페이지 번호' },
          { name: 'perPage', type: 'number', default: 20, required: false, source: 'query', desc: '페이지당 건수' },
          { name: 'keyword', type: 'string', default: '', required: false, source: 'query', desc: '검색 키워드 (선택)' },
        ]) {
          if (!seen.has(e.name)) { inputs.push(e); seen.add(e.name); }
        }
      } else if (type === 'list') {
        if (!seen.has('keyword')) {
          inputs.push({ name: 'keyword', type: 'string', default: '', required: false, source: 'query', desc: '검색 키워드 (선택)' });
          seen.add('keyword');
        }
      }
    }

    // 3) SQL :param (service method body 에서 .get('xxx') → SQL 파일 추적)
    //    mutation 계열 (POST/PUT/PATCH/DELETE) 은 body 파라미터를 SQL 로부터 유도.
    //    GET 도 SQL 에 :param 이 있으면 query 로 추가.
    try {
      const sqlDerived = this._inputsFromSql(ctrl, handlerName);
      for (const e of sqlDerived) {
        if (!seen.has(e.name)) { inputs.push(e); seen.add(e.name); }
      }
    } catch (e) {
      /* ★ v1.23.0 — 예전에는 여기서 **조용히 넘어갔다.**
         그래서 입력란이 안 채워져도 왜 그런지 알 길이 없었다
         (실제로 "PUT 을 붙였는데도 입력란이 없다" 는 일이 있었다).
         이제 이유를 응답에 담아 화면이 알려 줄 수 있게 한다. */
      this._lastSqlError = String(e.message || e);
      if (this.log?.debug) this.log.debug(`[ScreenWizard] SQL analysis skip: ${e.message}`);
    }

    return inputs;
  }

  /**
   * widget 추천:
   *   route.type / handler 이름 / URL path 조합으로 유추.
   */
  _suggestWidget(route, method) {
    const type = (route.type || '').toLowerCase();
    if (type === 'listpaged' || type === 'list') return 'list';
    if (type === 'getbyid') return 'detail';
    if (type === 'create' || type === 'update' || type === 'updatename') return 'form';
    if (type === 'remove') return 'button';
    if (type === 'multisql') return 'detail';
    // handler 이름 기반 fallback
    const h = (route.handler || route.handlerName || '').toLowerCase();
    if (/paged|list|all/.test(h)) return 'list';
    if (/get|detail|find/.test(h) || (route.path || '').includes(':')) return 'detail';
    if (/count|total|sum|stat/.test(h)) return 'stat';
    return method === 'GET' ? 'text' : 'button';
  }

  /**
   * 의존성 수집 — ControllerMetaService 의 autowired_services 기반 + 각 서비스의
   *  sql_file + source preview 붙임.
   */
  async _resolveDependencies(ctrl) {
    const services = [];
    const sqlFilesSet = new Map();   // fileBase → { fileBase, file, content, queryIds }

    const auto = Array.isArray(ctrl.autowired_services) ? ctrl.autowired_services : [];
    for (const entry of auto) {
      const svcName = entry.serviceName;
      if (!svcName) continue;
      let svc = null;
      try {
        svc = await this.serviceMetaService.findById(svcName);
      } catch (_) { svc = null; }

      services.push({
        name: svcName,
        propertyName: entry.propertyName,
        file: svc?.file_path || null,
        sqlFile: svc?.sql_file || svc?.sqlFile || null,
        preview: svc?.source ? this._firstNLines(svc.source, 60) : '(서비스 소스 조회 실패)',
      });

      // SQL 파일 수집 (중복 제거)
      const sqlFile = svc?.sql_file || svc?.sqlFile;
      if (sqlFile && !sqlFilesSet.has(sqlFile)) {
        let sql = null;
        try { sql = await this.sqlMetaService.findById(sqlFile); } catch (_) { sql = null; }
        sqlFilesSet.set(sqlFile, {
          fileBase: sqlFile,
          file: sql?.file_path || null,
          content: sql?.source || sql?.content || '(SQL 파일 조회 실패)',
          queryIds: sql?.query_ids || sql?.queries?.map((q) => q.id) || [],
        });
      }
    }

    return {
      services,
      sqls: [...sqlFilesSet.values()],
    };
  }

  /**
   * service method 바디에서 `.get('sqlName')` 을 찾아 SQL 파일에서 input param 을 가져옴.
   * 찾지 못하면 빈 배열.
   */
  _inputsFromSql(ctrl, handlerName) {
    const ctrlFile = ctrl.file_path ? path.resolve(projectRoot, ctrl.file_path) : null;
    if (!ctrlFile || !fs.existsSync(ctrlFile)) return [];
    const ctrlSrc = fs.readFileSync(ctrlFile, 'utf8');

    // 핸들러 메서드 본문 추출
    const handlerBody = extractMethodBody(ctrlSrc, handlerName);
    if (!handlerBody) return [];

    // 호출된 service 메서드 이름 (가장 단순한 패턴: this.xxxService.METHOD(...))
    const svcCallMatch = handlerBody.match(/this\.\w+Service\.(\w+)\s*\(/);
    const svcMethod = svcCallMatch ? svcCallMatch[1] : handlerName;

    // autowired_services 에서 첫 서비스만 (보수적)
    const svc = (ctrl.autowired_services || [])[0];
    if (!svc) return [];

    const serviceFile = path.resolve(projectRoot, 'src', 'service', `${svc.serviceName}.js`);
    if (!fs.existsSync(serviceFile)) return [];
    const svcSrc = fs.readFileSync(serviceFile, 'utf8');
    const svcMethodBody = extractMethodBody(svcSrc, svcMethod);
    if (!svcMethodBody) return [];

    const sqlNameMatch = svcMethodBody.match(/\.get\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (!sqlNameMatch) return [];
    const sqlQueryName = sqlNameMatch[1];

    const sqlBindingMatch = svcSrc.match(/@Sql\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (!sqlBindingMatch) return [];
    const sqlFileName = sqlBindingMatch[1];

    const sqlFilePath = path.resolve(projectRoot, 'src', 'database', 'sql', `${sqlFileName}.sql`);
    if (!fs.existsSync(sqlFilePath)) return [];

    const sqlSrc = fs.readFileSync(sqlFilePath, 'utf8');
    const queryBody = extractSqlQueryBody(sqlSrc, sqlQueryName);
    if (!queryBody) return [];

    const rawParams = extractSqlParams(queryBody);
    return rawParams.map((name) => ({
      name,
      type: guessSqlParamType(name),
      required: true,
      source: 'body-or-query',
      desc: `SQL 파라미터 (${sqlFileName}.sql :: ${sqlQueryName})`,
    }));
  }

  /* ════════════════════════════ probe ════════════════════════════ */

  /**
   * 실제 HTTP 요청으로 handler 를 호출 (self-call).
   *  - GET: path :param 치환 + 나머지는 query string
   *  - POST/PUT/PATCH/DELETE: path :param 치환 + 나머지는 body JSON
   *  - 호출자의 cookie / Authorization 을 그대로 전달 → 인증 유지
   */
  async probe({ controllerId, handlerName, params = {}, cookie = '', authHeader = '' } = {}) {
    if (!controllerId || !handlerName) {
      throw Object.assign(new Error('controllerId 와 handlerName 이 필요합니다'), { status: 400 });
    }
    const meta = await this.analyze(controllerId, handlerName);

    // URL 구성
    const serverPort = config.server?.port ?? config.port ?? 7901;
    const serverHost = '127.0.0.1';
    const urlObj = new URL(`http://${serverHost}:${serverPort}${meta.fullPath}`);

    // path :param 치환
    const pathParams = {};
    urlObj.pathname = urlObj.pathname.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (m, name) => {
      if (params[name] != null) {
        pathParams[name] = true;
        return encodeURIComponent(String(params[name]));
      }
      return m;
    });

    // query / body 분리
    const method = meta.method;
    let body = null;
    if (method === 'GET') {
      for (const [k, v] of Object.entries(params)) {
        if (pathParams[k]) continue;
        if (v == null || v === '') continue;
        urlObj.searchParams.set(k, String(v));
      }
    } else {
      body = {};
      for (const [k, v] of Object.entries(params)) {
        if (pathParams[k]) continue;
        body[k] = v;
      }
    }

    // 헤더 구성
    const headers = { 'Accept': 'application/json' };
    if (body != null) headers['Content-Type'] = 'application/json';
    if (cookie)     headers['Cookie'] = cookie;
    if (authHeader) headers['Authorization'] = authHeader;

    const bodyStr = body != null ? JSON.stringify(body) : null;

    // 실제 호출
    let responseBody = null;
    let status = 0;
    let fetchError = null;
    try {
      const res = await this._request(urlObj, { method, headers }, bodyStr);
      status = res.status;
      responseBody = res.body;
    } catch (e) {
      fetchError = e;
    }

    if (fetchError) {
      return {
        ok: false,
        status: 0,
        sample: null,
        shape: 'unknown',
        outputFields: [],
        error: fetchError.message || '네트워크 오류',
      };
    }

    if (status >= 400) {
      const msg = extractErrorMessage(responseBody) || `HTTP ${status}`;
      return {
        ok: false,
        status,
        sample: responseBody,
        shape: 'unknown',
        outputFields: [],
        error: msg,
      };
    }

    const sample = this._unwrapEnvelope(responseBody);
    const analyzed = this._analyzeShape(sample);

    return {
      ok: true,
      status,
      sample: this._truncateSample(sample),
      ...analyzed,
    };
  }

  /**
   * http.request 를 Promise 로 감싼 간단 클라이언트.
   */
  _request(urlObj, opts, bodyStr) {
    const lib = urlObj.protocol === 'https:' ? https : http;
    return new Promise((resolve, reject) => {
      const req = lib.request(
        {
          method: opts.method,
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname + urlObj.search,
          headers: opts.headers,
          timeout: 15000,
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            let parsed;
            try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw; }
            resolve({ status: res.statusCode || 0, body: parsed });
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('요청 타임아웃 (15초)'));
      });
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  /**
   * Envelope unwrap: aidot 공통 응답 envelope 처리.
   *  표준 aidot envelope: { code, message, header?, data }  →  data
   *  legacy:             { header, body }                     →  body
   *  단순 wrapper:       { data } / { result }                →  unwrap
   *  그 외:              원본 유지
   */
  _unwrapEnvelope(resp) {
    if (resp == null || typeof resp !== 'object' || Array.isArray(resp)) return resp;

    // aidot 표준 envelope: code + data (message / header 는 선택)
    if ('data' in resp && ('code' in resp || 'message' in resp)) {
      return resp.data;
    }
    // legacy: { header, body }
    if ('body' in resp && 'header' in resp) return resp.body;

    // 단순 wrapper: 1~2 keys
    const keys = Object.keys(resp);
    if (keys.length <= 2 && 'data' in resp)   return resp.data;
    if (keys.length <= 2 && 'result' in resp) return resp.result;

    return resp;
  }

  /**
   * payload shape 분류 + outputFields 추출.
   */
  _analyzeShape(sample) {
    if (sample == null) {
      return { shape: 'null', listPath: null, outputFields: [] };
    }
    if (Array.isArray(sample)) {
      return { shape: 'rowsArray', listPath: null, outputFields: this._extractFields(sample[0]) };
    }
    if (typeof sample === 'object') {
      // paged: rows + total + page/perPage 등
      if (Array.isArray(sample.rows) && ('total' in sample || 'page' in sample || 'perPage' in sample)) {
        return { shape: 'pagedRows', listPath: 'rows', outputFields: this._extractFields(sample.rows[0]) };
      }
      for (const key of ['rows', 'items', 'list', 'data']) {
        if (Array.isArray(sample[key])) {
          return { shape: 'rowsArray', listPath: key, outputFields: this._extractFields(sample[key][0]) };
        }
      }
      return { shape: 'object', listPath: null, outputFields: this._extractFields(sample) };
    }
    return { shape: 'primitive', listPath: null, outputFields: [] };
  }

  _extractFields(row) {
    if (!row || typeof row !== 'object') return [];
    return Object.keys(row).slice(0, 20).map((k) => {
      const v = row[k];
      return {
        name: k,
        type: this._typeOf(k, v),
        sample: this._truncateSampleValue(v),
      };
    });
  }

  _typeOf(name, v) {
    if (v == null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (v instanceof Date) return 'date';
    const t = typeof v;
    if (t === 'string') {
      // ISO 날짜 감지
      if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v)) return 'date';
      if (/_at$|_date$|Date$|At$/.test(name) && /^\d{4}-\d{2}-\d{2}/.test(v)) return 'date';
      return 'string';
    }
    return t === 'object' ? 'object' : t;
  }

  _truncateSampleValue(v) {
    if (v == null) return null;
    if (typeof v === 'string') return v.length > 60 ? v.slice(0, 57) + '...' : v;
    if (Array.isArray(v)) return `[${v.length} items]`;
    if (typeof v === 'object') return `{${Object.keys(v).length} keys}`;
    return v;
  }

  _truncateSample(sample) {
    try {
      const json = JSON.stringify(sample);
      if (json.length <= 4000) return sample;
      if (Array.isArray(sample)) return sample.slice(0, 3);
      if (sample && typeof sample === 'object' && Array.isArray(sample.rows)) {
        return { ...sample, rows: sample.rows.slice(0, 3) };
      }
      return JSON.parse(json.slice(0, 4000) + '…');
    } catch {
      return '[sample too large to serialize]';
    }
  }

  /* ════════════════════════════ utils ════════════════════════════ */

  _joinPath(base, sub) {
    const a = String(base || '').replace(/\/+$/, '');
    const b = String(sub || '').replace(/^\/+/, '');
    const full = '/' + [a, b].filter(Boolean).join('/').replace(/^\/+/, '');
    return full || '/';
  }

  _firstNLines(s, n) {
    return String(s || '').split('\n').slice(0, n).join('\n');
  }
}

/* ══════════════════════════════ 모듈 유틸 (순수 함수) ══════════════════════════════ */

function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * 함수/메서드 body 추출 — 간단한 중첩 브레이스 매칭.
 *  `async NAME(...) {` 또는 `NAME(...) {` 뒤부터 매칭되는 `}` 까지.
 */
function extractMethodBody(src, name) {
  if (!name) return null;
  const re = new RegExp(
    `(?:async\\s+)?${escapeRegex(name)}\\s*\\([^)]*\\)\\s*\\{`,
    'm',
  );
  const m = re.exec(src);
  if (!m) return null;
  let depth = 1;
  let i = m.index + m[0].length;
  const start = i;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    } else if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length - 1 && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    } else if (c === '"' || c === "'" || c === '`') {
      const quote = c; i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') i += 2;
        else i++;
      }
    }
    i++;
  }
  return depth === 0 ? src.slice(start, i - 1) : null;
}

/** SQL 파일에서 특정 쿼리(-- @name: NAME 이후) 의 body 추출 */
function extractSqlQueryBody(sqlSrc, name) {
  if (!name) return null;
  const re = new RegExp(`^\\s*--\\s*@name\\s*:\\s*${escapeRegex(name)}\\s*$`, 'm');
  const m = re.exec(sqlSrc);
  if (!m) return null;
  const after = sqlSrc.slice(m.index + m[0].length);
  const next = after.search(/^\s*--\s*@name\s*:/m);
  return next >= 0 ? after.slice(0, next) : after;
}

/**
 * SQL body 에서 :paramName 추출 (`::cast`, 문자열 리터럴 내 `:MI` 등 제외).
 */
function extractSqlParams(sqlBody) {
  const out = [];
  const withoutStrings = String(sqlBody)
    .replace(/'(?:[^'\\]|\\.)*'/g, (m) => ' '.repeat(m.length))
    .replace(/"(?:[^"\\]|\\.)*"/g, (m) => ' '.repeat(m.length));
  const re = /(?<!:):([A-Za-z_]\w*)/g;
  let m;
  while ((m = re.exec(withoutStrings)) !== null) {
    const lineStart = withoutStrings.lastIndexOf('\n', m.index);
    const lineEnd = withoutStrings.indexOf('\n', m.index);
    const line = withoutStrings.slice(lineStart + 1, lineEnd === -1 ? withoutStrings.length : lineEnd);
    if (/^\s*--/.test(line)) continue;
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

function guessSqlParamType(name) {
  const n = name.toLowerCase();
  if (n === 'id' || /id$/.test(n) || /count$/.test(n) || n === 'page' || n === 'perpage' || /age$/.test(n)) return 'number';
  if (/^is[A-Z]|^has[A-Z]|enabled$|active$/.test(name)) return 'boolean';
  return 'string';
}

function extractErrorMessage(body) {
  if (!body) return null;
  if (typeof body === 'string') return body.slice(0, 500);
  if (typeof body !== 'object') return String(body);
  return body.message
    || body.error
    || body.header?.message
    || body.header?.description
    || null;
}
