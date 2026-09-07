import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
/**
 * 코드 생성기 — 라우트 정의 메타데이터로부터 컨트롤러/서비스/SQL 파일 코드를 생성.
 *
 * 라우팅 함수 유형 (StudentController.js 의 패턴과 매칭):
 *   - 'list'        : 전체 조회        →  GET    /     (Service.list)
 *   - 'listPaged'   : 페이지네이션     →  GET    /paged (Service.listPaged)
 *   - 'getById'     : 단건 조회        →  GET    /:id  (Service.getById)
 *   - 'create'      : 생성             →  POST   /     (Service.create, 201)
 *   - 'update'      : 수정             →  PUT    /:id  (Service.update)
 *   - 'remove'      : 삭제             →  DELETE /:id  (Service.remove)
 *   - 'custom'      : 임의 (기본 골격) →  사용자 지정 method/path
 *   - 'sse'         : 실시간 스트림     →  GET {basePath}/events  (@SseMapping, 구독 전용)
 *
 * 실시간(realtime) 옵션:
 *   meta.realtime = { enabled: true, channel: 'snacks' }
 *     - create / update / remove 라우트에 sseHub.publish(...) 를 자동 삽입한다.
 *     - 채널 이름은 Supabase Realtime 의 관례처럼 "대상(엔티티)" 이름을 쓴다 (예: snacks, orders).
 */

const ROUTE_TEMPLATES = {
  list: {
    method: 'get',
    path: '/',
    handlerName: 'list',
    serviceMethod: 'list',
    body: (svcVar) => `    this.log.info(\`\${this.constructor.name}::list 호출됨\`);
    const result = await this.${svcVar}.list();
    return result;`,
  },
  listPaged: {
    method: 'get',
    path: '/paged',
    handlerName: 'listPaged',
    serviceMethod: 'listPaged',
    body: (svcVar) => `    this.log.info(\`\${this.constructor.name}::listPaged 호출됨 -> page=\${params.page} perPage=\${params.perPage}\`);
    return this.${svcVar}.listPaged({ page: params.page, perPage: params.perPage });`,
  },
  getById: {
    method: 'get',
    path: '/:id',
    handlerName: 'get',
    serviceMethod: 'getById',
    body: (svcVar) => `    this.log.info(\`\${this.constructor.name}::get 호출됨 -> id=\${params.id}\`);
    const result = await this.${svcVar}.getById(params.id);
    if (result === null || result === undefined) throw Object.assign(new Error(\`id \${params.id} 을(를) 찾을 수 없습니다\`), { status: 404 });
    return result;`,
  },
  create: {
    method: 'post',
    path: '/',
    handlerName: 'create',
    serviceMethod: 'create',
    needsRes: true,
    body: (svcVar) => `    this.log.info(\`\${this.constructor.name}::create 호출됨 -> params=\${JSON.stringify(params)}\`);
    const result = await this.${svcVar}.create(params);
    res.status(201).json({
      code: 201, message: 'Created',
      header: {
        requestCode: params.requestCode || null,
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' '),
      },
      data: result,
    });`,
  },
  update: {
    method: 'put',
    path: '/:id',
    handlerName: 'update',
    serviceMethod: 'update',
    body: (svcVar) => `    this.log.info(\`\${this.constructor.name}::update 호출됨 -> id=\${params.id}\`);
    return this.${svcVar}.update(params);`,
  },
  remove: {
    method: 'delete',
    path: '/:id',
    handlerName: 'remove',
    serviceMethod: 'remove',
    body: (svcVar) => `    this.log.info(\`\${this.constructor.name}::remove 호출됨 -> id=\${params.id}\`);
    return this.${svcVar}.remove(params.id);`,
  },
  custom: {
    method: 'get',
    path: '/custom',
    handlerName: 'custom',
    serviceMethod: 'custom',
    body: (svcVar) => `    this.log.info(\`\${this.constructor.name}::custom 호출됨\`);
    // TODO: 직접 구현하세요
    return { ok: true, params };`,
  },
  sse: {
    method: 'get',
    path: '/events',
    handlerName: 'events',
    serviceMethod: null,          // 서비스가 필요 없다 (구독만 담당)
    sse: true,
    needsReq: true,
    body: () => `    this.log.info(\`\${this.constructor.name}::events 구독 시작 -> channel=\${REALTIME_CHANNEL}\`);
    // 접속하자마자 한 줄 보내 주면 화면에서 "연결됨" 을 바로 확인할 수 있다
    req.sse.send({ event: 'hello', data: { channel: REALTIME_CHANNEL, ts: new Date().toISOString() } });
    return REALTIME_CHANNEL;      // 반환값 = 구독할 채널 이름`,
  },
  multiSql: {
    method: 'get',
    path: '/multi',
    handlerName: 'multiSqlHandler',
    serviceMethod: 'multiSqlHandler',
    body: () => `    // (multiSql 라우트는 본문이 sqlSteps 메타에서 동적으로 생성됩니다)`,
  },
};

/**
 * 실시간 발행 코드 한 줄.
 *   action: 'created' | 'updated' | 'removed'
 *   실패해도 본래 작업에는 영향이 없도록 sseHub.publish 는 내부에서 예외를 던지지 않는다.
 */
function publishLine(action, idExpr, indent = '    ') {
  return `${indent}sseHub.publish(REALTIME_CHANNEL, { action: '${action}', id: ${idExpr}, at: new Date().toISOString() }, { event: 'change' });`;
}

/** 실시간이 켜졌을 때 쓰는 본문 (없으면 기본 body 사용) */
const REALTIME_BODIES = {
  create: (svcVar) => `    this.log.info(\`\${this.constructor.name}::create 호출됨 -> params=\${JSON.stringify(params)}\`);
    const result = await this.${svcVar}.create(params);
${publishLine('created', 'result?.insertId ?? null')}
    res.status(201).json({
      code: 201, message: 'Created',
      header: {
        requestCode: params.requestCode || null,
        timestamp: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' '),
      },
      data: result,
    });`,
  update: (svcVar) => `    this.log.info(\`\${this.constructor.name}::update 호출됨 -> id=\${params.id}\`);
    /* ★ v1.10.29 — params 를 통째로 넘긴다 (SSE 경로도 동일).
       id·name 만 넘기면 SQL 의 나머지 자리표시자가 비어 실패한다. */
    const result = await this.${svcVar}.update(params);
${publishLine('updated', 'params.id')}
    return result;`,
  remove: (svcVar) => `    this.log.info(\`\${this.constructor.name}::remove 호출됨 -> id=\${params.id}\`);
    const result = await this.${svcVar}.remove(params.id);
${publishLine('removed', 'params.id')}
    return result;`,
};

/** 채널 이름 기본 제안: /api/snacks → snacks (Supabase 의 scope:entity 관례와 같은 취지) */

/**
 * ★ v1.10.43 — 생성 코드가 프레임워크를 가리킬 **상대 경로**를 계산한다.
 *
 *  파일이 놓일 폴더에 따라 달라진다.
 *      src/service/       → '../core/decorators.js'
 *      workspace/service/ → '../../src/core/decorators.js'
 *
 *  ⚠ 고정 문자열로 박으면 작업 폴더에서 **모듈을 못 찾아** 등록이 실패한다.
 *
 * @param {string} targetDir  파일이 놓일 절대 경로 (없으면 예전 기본값)
 * @param {string} what       'core/decorators.js' 같은 src 하위 경로
 */
export function frameworkImport(targetDir, what) {
  if (!targetDir) return `../${what}`;          // 예전 동작 유지
  const abs = path.resolve(PROJECT_ROOT, 'src', what);
  /* ★ v1.11.1 — Windows 에서 작업 폴더가 다른 드라이브(D:\ws ↔ C:\proj)면 path.relative 가 절대 경로를
     돌려주고, 'D:/…' 는 ESM import 에서 URL 스킴으로 오인된다(ERR_UNSUPPORTED_ESM_URL_SCHEME). 그때는 file:// URL 로 */
  const relRaw = path.relative(targetDir, abs);
  if (path.isAbsolute(relRaw)) return pathToFileURL(abs).href;
  let rel = relRaw.replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

export function suggestChannel(basePath = '', controllerName = '') {
  const fromPath = String(basePath).split('/').filter(Boolean).pop();
  const raw = fromPath || String(controllerName).replace(/Controller$/i, '');
  const clean = String(raw).replace(/[^A-Za-z0-9_-]/g, '').toLowerCase();
  return clean || 'events';
}

export const CHANNEL_RE = /^[a-z][a-z0-9:_-]{0,63}$/;

/** 컨트롤러 클래스명에서 prefix 추출. 예: ProductController → product / Product */
function nameOf(controllerName) {
  const stripped = controllerName.replace(/Controller$/i, '');
  return {
    pascal: stripped,                           // Product
    camel:  stripped.charAt(0).toLowerCase() + stripped.slice(1),  // product
  };
}

function uniqMethodImports(routes) {
  const set = new Set(['Controller', 'Log']);
  let needsService = false;
  for (const r of routes) {
    const tpl = ROUTE_TEMPLATES[r.type] ?? ROUTE_TEMPLATES.custom;
    if (tpl.sse) {
      // 실시간 스트림 라우트는 @SseMapping 을 쓰고 서비스가 필요 없다
      set.add('SseMapping');
      if (r.auth) set.add('Auth');
      if (r.roles && r.roles.length > 0) { set.add('Auth'); set.add('Roles'); }
      continue;
    }
    const verb = (r.method || tpl.method).toLowerCase();
    set.add(verb.charAt(0).toUpperCase() + verb.slice(1) + 'Mapping');
    if (r.type === 'multiSql') {
      set.add('Sql');
    } else {
      needsService = true;
    }
    if (r.auth) set.add('Auth');
    if (r.roles && r.roles.length > 0) {
      set.add('Auth');
      set.add('Roles');
    }
  }
  if (needsService) set.add('Autowired');
  return [...set];
}

/**
 * multiSql 라우트의 sqlSteps 배열에서 사용된 SQL 파일들을 추출.
 *  반환: [{ sqlFile, sqlVar }] (중복 제거)
 *  예: [{ sqlFile: 'user', sqlVar: 'userSql' }, { sqlFile: 'order', sqlVar: 'orderSql' }]
 */
function collectSqlFiles(routesOrSteps) {
  const map = new Map();
  const collectFromSteps = (steps) => {
    if (!Array.isArray(steps)) return;
    for (const st of steps) {
      if (st?.sqlFile && !map.has(st.sqlFile)) {
        map.set(st.sqlFile, `${st.sqlFile}Sql`);
      }
    }
  };
  if (!Array.isArray(routesOrSteps)) return [];

  // 어떤 항목이라도 sqlSteps 를 가지면 routes 배열로 간주 (모든 항목 순회)
  const hasAnyRouteShape = routesOrSteps.some((x) => x && Array.isArray(x.sqlSteps));
  if (hasAnyRouteShape) {
    for (const r of routesOrSteps) collectFromSteps(r.sqlSteps);
  } else {
    // 직접 sqlSteps 배열로 간주
    collectFromSteps(routesOrSteps);
  }
  return [...map.entries()].map(([sqlFile, sqlVar]) => ({ sqlFile, sqlVar }));
}

/**
 * multiSql 라우트/메서드의 본문 코드 생성.
 *  meta:
 *    sqlSteps: [{ varName, sqlFile, queryName, paramsExpr, action? }]
 *      - varName: 결과를 담을 변수명 (예: 'user')
 *      - sqlFile: SQL 파일명 (예: 'user') → this.userSql.get(...)
 *      - queryName: SQL 파일 내의 -- @name (예: 'findById')
 *      - paramsExpr: SQL 파라미터 표현식 (예: '{ id: params.userId }')
 *      - action: 결과 처리 방식 (기본 'execute' — 전체 result 객체)
 *          'execute'  → 그대로 result (insertId, rowsAffected, rows)
 *          'rows'     → result.rows  (행 배열)
 *          'first'    → result.rows[0] ?? null  (첫 행 또는 null)
 *          'affected' → result.rowsAffected  (number, UPDATE/DELETE)
 *          'insertId' → result.insertId  (number, INSERT 직후)
 *          'count'    → result.rows[0]?.cnt ?? 0  (SELECT COUNT(*) AS cnt 단축형)
 *          'exists'   → result.rows.length > 0  (boolean, 존재 확인)
 *    useTransaction: bool
 *    returnExpr: string (없으면 마지막 step 결과 반환)
 *    handlerName: string
 */
function buildMultiSqlBody(meta, opts = {}) {
  const { sqlSteps = [], useTransaction = false, returnExpr } = meta;
  const indent = opts.indent ?? '    ';
  const ctx = useTransaction ? 'tx' : 'db';

  const lines = [];
  lines.push(`${indent}this.log.info(\`\${this.constructor.name}::${meta.handlerName || 'handler'} 호출됨\`);`);

  if (sqlSteps.length === 0) {
    lines.push(`${indent}// TODO: SQL 단계가 비어있습니다.`);
    lines.push(`${indent}return null;`);
    return lines.join('\n');
  }

  const stepsBody = [];
  for (const st of sqlSteps) {
    const v = st.varName || 'result';
    const sqlVar = `${st.sqlFile}Sql`;
    const queryName = st.queryName || 'TODO_QUERY_NAME';
    // params 우선순위: paramMappings (시각적 매핑) > paramsExpr (직접 입력) > '{}'
    let params;
    if (st.paramMappings && Object.keys(st.paramMappings).length > 0) {
      // { user_id: 'params.userId', amount: 'params.amount' } → "{ user_id: params.userId, amount: params.amount }"
      const pairs = Object.entries(st.paramMappings)
        .filter(([_, expr]) => expr && String(expr).trim())
        .map(([key, expr]) => `${key}: ${String(expr).trim()}`);
      params = pairs.length > 0 ? `{ ${pairs.join(', ')} }` : '{}';
    } else {
      params = st.paramsExpr?.trim() || '{}';
    }
    const action = st.action || 'execute';
    const inner = useTransaction ? '  ' : '';
    const callExpr = `${ctx}.execute(this.${sqlVar}.get('${queryName}'), ${params})`;

    let line;
    switch (action) {
      case 'rows':
        line = `${indent}${inner}const ${v} = (await ${callExpr}).rows;`;
        break;
      case 'first':
        line = `${indent}${inner}const ${v} = (await ${callExpr}).rows[0] ?? null;`;
        break;
      case 'affected':
        line = `${indent}${inner}const ${v} = (await ${callExpr}).rowsAffected;`;
        break;
      case 'insertId':
        line = `${indent}${inner}const ${v} = (await ${callExpr}).insertId;`;
        break;
      case 'count':
        line = `${indent}${inner}const ${v} = (await ${callExpr}).rows[0]?.cnt ?? 0;`;
        break;
      case 'exists':
        line = `${indent}${inner}const ${v} = (await ${callExpr}).rows.length > 0;`;
        break;
      case 'execute':
      default:
        line = `${indent}${inner}const ${v} = await ${callExpr};`;
        break;
    }
    stepsBody.push(line);
  }

  const finalReturn =
    returnExpr?.trim()
      ? `${indent}${useTransaction ? '  ' : ''}return ${returnExpr.trim()};`
      : `${indent}${useTransaction ? '  ' : ''}return ${sqlSteps[sqlSteps.length - 1].varName || 'result'};`;

  if (useTransaction) {
    return [
      `${indent}return await db.transaction(async (tx) => {`,
      ...stepsBody,
      finalReturn,
      `${indent}});`,
    ].join('\n');
  } else {
    return [
      ...stepsBody,
      finalReturn,
    ].join('\n');
  }
}

/**
 * 컨트롤러 코드 생성.
 * @param {object} meta { name, basePath, description, routes:[{type, method?, path?, handlerName?}] }
 */
/**
 * ★ v1.11.2 — 라우트 선언 순서. Express 는 선언 순서대로 맞춰 보므로 `GET /:id` 가 `GET /paged` 보다
 *   앞에 있으면 `/paged` 요청이 `/:id` 로 빨려 들어가 `findById('paged')` → null 이 된다.
 *   같은 HTTP 메서드 안에서 **고정 경로를 파라미터 경로보다 앞에** 둔다 (그 밖의 순서는 그대로 — 안정 정렬).
 *   [라우트 추가] 로 listPaged 를 나중에 붙여도 안전하다.
 */
export function orderRoutesForExpress(routes = []) {
  const hasParam = (p) => /[:*]/.test(String(p || ''));
  const method = (r) => String(r.method || 'get').toLowerCase();
  // 같은 메서드의 **마지막 고정 경로** 위치 — 파라미터 경로는 그 뒤로 보낸다 (나머지 순서는 그대로)
  const lastStatic = {};
  routes.forEach((r, i) => { if (!hasParam(r.path)) lastStatic[method(r)] = i; });
  return routes.map((r, i) => {
    const key = hasParam(r.path) && lastStatic[method(r)] !== undefined && lastStatic[method(r)] > i
      ? lastStatic[method(r)] + 0.5
      : i;
    return { r, key, i };
  }).sort((a, b) => (a.key - b.key) || (a.i - b.i)).map((x) => x.r);
}

export function generateControllerCode(meta, targetDir = null) {
  const { name: controllerName, basePath, description, serviceName: customServiceName } = meta;
  const routes = orderRoutesForExpress(meta.routes || []);
  const { pascal, camel } = nameOf(controllerName);
  const serviceName = customServiceName || `${pascal}Service`;
  const svcVar = serviceName.charAt(0).toLowerCase() + serviceName.slice(1);

  const imports = uniqMethodImports(routes);
  // 실시간: 스트림 라우트가 있거나 realtime.enabled 면 켠다
  const hasSseRoute = routes.some((r) => (ROUTE_TEMPLATES[r.type] ?? {}).sse);
  const realtimeOn = !!(meta.realtime?.enabled) || hasSseRoute;
  const channel = (meta.realtime?.channel || suggestChannel(basePath, controllerName));
  const hasMultiSql = routes.some((r) => r.type === 'multiSql');
  const hasNonMultiSql = routes.some((r) => r.type !== 'multiSql');
  const sqlFiles = collectSqlFiles(routes);
  const needsDbImport =
    hasMultiSql && (
      routes.some((r) => r.type === 'multiSql' && r.useTransaction) ||
      // useTransaction false 인 multiSql 도 db.execute 가 직접 필요
      sqlFiles.length > 0
    );

  const routeMethods = routes.map((r, idx) => {
    const tpl = ROUTE_TEMPLATES[r.type] ?? ROUTE_TEMPLATES.custom;
    const httpMethod = (r.method || tpl.method).toLowerCase();
    const subPath = r.path ?? tpl.path;
    const handlerName = r.handlerName ?? tpl.handlerName;
    const decorator = tpl.sse
      ? 'SseMapping'
      : httpMethod.charAt(0).toUpperCase() + httpMethod.slice(1) + 'Mapping';
    const sigArgs = tpl.sse ? '(params, req)' : (tpl.needsRes ? '(params, req, res)' : '(params)');

    let body;
    if (r.type === 'multiSql') {
      body = buildMultiSqlBody({ ...r, handlerName }, { indent: '    ' });
    } else if (realtimeOn && REALTIME_BODIES[r.type]) {
      body = REALTIME_BODIES[r.type](svcVar);       // 변경 시 SSE 발행이 포함된 본문
    } else {
      body = tpl.body(svcVar);
    }

    // Auth / Roles 데코레이터 (옵션)
    const guardLines = [];
    if (r.roles && r.roles.length > 0) {
      const args = r.roles.map((rr) => `'${rr}'`).join(', ');
      guardLines.push(`  @Roles(${args})`);
    } else if (r.auth) {
      guardLines.push(`  @Auth()`);
    }

    return `  // ${idx + 1}. ${httpMethod.toUpperCase()} ${basePath}${subPath}  →  ${controllerName}.${handlerName}
  @${decorator}('${subPath}')
${guardLines.length ? guardLines.join('\n') + '\n' : ''}  async ${handlerName}${sigArgs} {
${body}
  }`;
  }).join('\n\n');

  // 클래스 본문의 의존성 프로퍼티 (필요한 것만)
  const propLines = [];
  if (hasNonMultiSql) {
    propLines.push(`  @Autowired('${serviceName}') ${svcVar};`);
  }
  for (const { sqlFile, sqlVar } of sqlFiles) {
    propLines.push(`  @Sql('${sqlFile}') ${sqlVar};`);
  }
  propLines.push(`  @Log log;`);

  const dbImport = needsDbImport ? `\nimport db from '${frameworkImport(targetDir, 'database/db.js')}';\n` : '';
  const sseImport = realtimeOn ? `\nimport sseHub from '../core/sse.js';\n` : '';
  const channelConst = realtimeOn
    ? `\n/** 실시간 채널 이름 — 구독: GET ${basePath}/events  ·  브라우저: new EventSource('${basePath}/events') */\nconst REALTIME_CHANNEL = '${channel}';\n`
    : '';

  return `///
/// ${controllerName}
/// ${description ?? ''}
///

import {
  ${imports.join(',\n  ')},
} from '${frameworkImport(targetDir, 'core/decorators.js')}';
${dbImport}${sseImport}${channelConst}

@Controller('${basePath}')
export default class ${controllerName} {

${propLines.join('\n\n')}

${routeMethods}
}
`;
}

/** 서비스 코드 생성 (선택: 라우트 type에 맞춰 빈 메서드 골격만) */
export function generateServiceCode(meta, targetDir = null) {
  const { name: controllerName, routes } = meta;
  const { pascal, camel } = nameOf(controllerName);
  const serviceName = `${pascal}Service`;
  const sqlKey = camel; // sql 파일명도 camel 로

  const seen = new Set();
  const methods = [];
  for (const r of routes) {
    const tpl = ROUTE_TEMPLATES[r.type] ?? ROUTE_TEMPLATES.custom;
    const m = tpl.serviceMethod;
    if (!m) continue;                     // sse 라우트는 서비스가 필요 없다
    if (seen.has(m)) continue;
    seen.add(m);

    let body;
    switch (m) {
      case 'list':
        body = `    const sql = this.${sqlKey}Sql.get('findAll');
    const res = await db.execute(sql, {});
    return res.rows;`;
        break;
      case 'listPaged':
        body = `    const sql = this.${sqlKey}Sql.get('findAll');
    return await db.executeList(sql, {}, { page: opts.page, perPage: opts.perPage });`;
        break;
      case 'getById':
        body = `    const sql = this.${sqlKey}Sql.get('findById');
    const res = await db.execute(sql, { id });
    return res.rows[0] ?? null;`;
        break;
      case 'create':
        body = `    const sql = this.${sqlKey}Sql.get('insert');
    const res = await db.execute(sql, payload);
    return { insertId: res.insertId, rowsAffected: res.rowsAffected };`;
        break;
      case 'update':
        body = `    const sql = this.${sqlKey}Sql.get('update');
    const res = await db.execute(sql, fillPlaceholders(sql, params));
    return { rowsAffected: res.rowsAffected };`;
        break;
      case 'remove':
        body = `    const sql = this.${sqlKey}Sql.get('deleteById');
    const res = await db.execute(sql, { id });
    return { rowsAffected: res.rowsAffected };`;
        break;
      default:
        body = `    // TODO: 구현하세요\n    return null;`;
    }

    let sig;
    switch (m) {
      case 'list':       sig = `async list()`; break;
      case 'listPaged':  sig = `async listPaged(opts)`; break;
      case 'getById':    sig = `async getById(id)`; break;
      case 'create':     sig = `async create(payload)`; break;
      case 'update': sig = `async update(params)`; break;
      case 'remove':     sig = `async remove(id)`; break;
      default:           sig = `async ${m}(params)`;
    }

    methods.push(`  // ${m}
  ${sig} {
    this.log.info(\`\${this.constructor.name}::${m} 호출됨\`);
${body}
  }`);
  }

  return `///
/// ${serviceName}  (auto-generated)
///

import { Service, Sql, Log } from '${frameworkImport(targetDir, 'core/decorators.js')}';
import db from '${frameworkImport(targetDir, 'database/db.js')}';${methods.join('').includes('fillPlaceholders') ? `\nimport { fillPlaceholders } from '${frameworkImport(targetDir, 'core/sqlLoader.js')}';` : ''}


@Service('${serviceName}')
export default class ${serviceName} {

  @Sql('${sqlKey}') ${sqlKey}Sql;

  @Log log;

${methods.join('\n\n')}
}
`;
}

/** SQL 파일 골격 생성 */
export function generateSqlCode(meta) {
  const { name: controllerName } = meta;
  const { camel } = nameOf(controllerName);
  return `-- ${camel}.sql  (auto-generated)
-- 접근 키: '${camel}:<n>'

-- @name: findAll
SELECT id, name FROM ${camel}s ORDER BY id DESC;

-- @name: findById
SELECT id, name FROM ${camel}s WHERE id = :id;

-- @name: insert
INSERT INTO ${camel}s (id, name) VALUES (:id, :name);

-- @name: update
UPDATE ${camel}s SET name = :name WHERE id = :id;

-- @name: deleteById
DELETE FROM ${camel}s WHERE id = :id;
`;
}

/** 라우트 유형 카탈로그 (UI 에서 셀렉트 박스 옵션으로 노출) */
export function getRouteTypeCatalog() {
  return Object.entries(ROUTE_TEMPLATES).map(([type, tpl]) => ({
    type,
    method: tpl.method,
    path: tpl.path,
    handlerName: tpl.handlerName,
    serviceMethod: tpl.serviceMethod,
    description: {
      list: '전체 조회 (GET /)',
      listPaged: '페이지네이션 조회 (GET /paged)',
      getById: '단건 조회 (GET /:id)',
      create: '생성 (POST /, 201)',
      update: '수정 (PUT /:id)',
      remove: '삭제 (DELETE /:id)',
      custom: '임의 라우트 (사용자 지정)',
      sse: '실시간 스트림 (SSE) — 브라우저가 구독하면 변경 사항을 밀어 줌',
      multiSql: '다중 SQL 실행 (직접 SQL, 트랜잭션 옵션)',
    }[type],
  }));
}

/**
 * multiSql 단계의 action 옵션 카탈로그 — UI 셀렉트박스용.
 *  필요 시 새 action 을 codeGenerator 의 buildMultiSqlBody switch 에 추가하면
 *  여기에도 반영해주세요.
 */
export function getSqlActionCatalog() {
  return [
    { action: 'execute',  label: 'execute  (전체 결과: insertId, rowsAffected, rows)' },
    { action: 'rows',     label: 'rows     (.rows 배열)' },
    { action: 'first',    label: 'first    (.rows[0] ?? null)' },
    { action: 'affected', label: 'affected (.rowsAffected — UPDATE/DELETE)' },
    { action: 'insertId', label: 'insertId (.insertId — INSERT 직후)' },
    { action: 'count',    label: 'count    (.rows[0]?.cnt ?? 0 — SELECT COUNT)' },
    { action: 'exists',   label: 'exists   (.rows.length > 0 — boolean)' },
  ];
}

/* =========================================================
 * SQL 파일 생성기 (테이블 + 컬럼 정보로 기본 5종 쿼리 자동 생성)
 *
 *  옵션:
 *    fileName: 'product'
 *    tableName: 'products' (스키마명 포함 가능: 'aidot_express.products')
 *    columns: [
 *       { name: 'id',   pk: true,  insertable: false, updatable: false }, // PK 자동증가
 *       { name: 'name', insertable: true,  updatable: true },
 *       { name: 'created_at', insertable: false, updatable: false },
 *    ]
 *    description: '상품 SQL'
 * ========================================================= */
/**
 * 테이블 정보 + 컬럼 메타로 5개 기본 SQL 쿼리 생성.
 *
 *   columns 배열 각 항목: { name, pk, insertable?, updatable? }
 *
 *  동작:
 *   - SELECT: 컬럼이 50개 이상이면 `*`, 그렇지 않으면 컬럼명을 명시적으로 나열
 *   - INSERT: insertable 한 비-PK 컬럼들을 (cols) VALUES (:cols) 로 나열
 *   - UPDATE: updatable 한 비-PK 컬럼들을 SET col = :col 로 나열
 *
 *   columns 가 비어있으면(신규 테이블 등 DB 조회 실패)
 *    SELECT * + INSERT/UPDATE 는 직접 작성하라는 주석 처리된 스켈레톤.
 */
export const SELECT_STAR_THRESHOLD = 50;

export function generateSqlFromTable({ fileName, tableName, columns = [], description }) {
  if (!fileName) throw new Error('fileName 이 필요합니다');
  if (!tableName) throw new Error('tableName 이 필요합니다');

  const pk = columns.find((c) => c.pk) ?? { name: 'id' };
  const insertCols = columns.filter((c) => c.insertable !== false && !c.pk);
  const updateCols = columns.filter((c) => c.updatable !== false && !c.pk);

  // SELECT 컬럼: 컬럼정보 없음 OR 임계값(50개) 이상이면 '*'
  const useStar = columns.length === 0 || columns.length >= SELECT_STAR_THRESHOLD;
  const selectCols = useStar ? '*' : columns.map((c) => c.name).join(', ');

  const insertColList = insertCols.map((c) => c.name).join(', ');
  const insertValList = insertCols.map((c) => `:${c.name}`).join(', ');
  const updateSetList = updateCols.map((c) => `${c.name} = :${c.name}`).join(', ');

  const header =
    `-- ${fileName}.sql  (auto-generated)\n` +
    `-- ${description ?? ''}\n` +
    `-- 접근 키: '${fileName}:<n>'  (예: '${fileName}:findAll')\n`;

  const findAll =
    `\n-- @name: findAll\n` +
    `SELECT ${selectCols} FROM ${tableName} ORDER BY ${pk.name} DESC;\n`;

  const findById =
    `\n-- @name: findById\n` +
    `SELECT ${selectCols} FROM ${tableName} WHERE ${pk.name} = :${pk.name};\n`;

  const insertStmt = insertCols.length
    ? `\n-- @name: insert\n` +
      `INSERT INTO ${tableName} (${insertColList})\n` +
      `VALUES (${insertValList});\n`
    : `\n-- @name: insert\n` +
      `-- (insertable 컬럼이 없습니다 — 직접 작성하세요)\n` +
      `-- INSERT INTO ${tableName} (...) VALUES (...);\n`;

  const updateStmt = updateCols.length
    ? `\n-- @name: update\n` +
      `UPDATE ${tableName}\n   SET ${updateSetList}\n WHERE ${pk.name} = :${pk.name};\n`
    : `\n-- @name: update\n` +
      `-- (updatable 컬럼이 없습니다 — 직접 작성하세요)\n`;

  const deleteStmt =
    `\n-- @name: deleteById\n` +
    `DELETE FROM ${tableName} WHERE ${pk.name} = :${pk.name};\n`;

  return header + findAll + findById + insertStmt + updateStmt + deleteStmt;
}

/** SQL 파일 내용에서 -- @name: 블록 이름들만 파싱 (preview 용) */
export function extractQueryNames(content) {
  const names = [];
  const re = /^--\s*@name:\s*(\w+)\s*$/gm;
  let m;
  while ((m = re.exec(content)) !== null) names.push(m[1]);
  return names;
}

/**
 * SQL 파일에서 쿼리별 메타 추출.
 *  반환: [{ name, params: [...], body: '...' }]
 *
 *  params 는 SQL 본문의 `:paramName` 패턴을 중복 제거하여 등장 순서대로.
 *  (주의: 문자열 리터럴 안의 ':' 는 단순 정규식이라 잘못 잡힐 수 있음 — 일반적인 경우 충분)
 */
export function extractQueriesWithParams(content) {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const queries = [];
  let cur = null;

  for (const line of lines) {
    const m = line.match(/^--\s*@name:\s*(\w+)\s*$/);
    if (m) {
      if (cur) queries.push(cur);
      cur = { name: m[1], bodyLines: [] };
    } else if (cur) {
      cur.bodyLines.push(line);
    }
  }
  if (cur) queries.push(cur);

  return queries.map((q) => {
    const body = q.bodyLines.join('\n').trim();
    // 문자열 리터럴(`'...'`, `"..."`)을 먼저 제거한 사본에서 :name 추출
    // (DB 함수의 'YYYY-MM-DD HH24:MI:SS' 같은 패턴이 :MI, :SS 로 잘못 잡히는 것 방지)
    const sanitized = body
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")    // 'xxx' → ''
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');   // "xxx" → ""
    const params = [];
    const seen = new Set();
    // :name 패턴 (콜론 + 영문/숫자/언더스코어). 단, ::cast (postgres) 는 제외
    const re = /(?<!:):([a-zA-Z_][\w]*)\b/g;
    let m;
    while ((m = re.exec(sanitized)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        params.push(m[1]);
      }
    }
    return { name: q.name, params, body };
  });
}

/* =========================================================
 * Service 단독 코드 생성기.
 *
 *  입력:
 *    name       : 'ProductService' (PascalCase + Service 끝)
 *    sqlFile    : 'product' (참조할 SQL 파일명)
 *    methods    : ['list', 'listPaged', 'getById', 'create', 'update', 'remove']
 *                 또는 항목별 SQL 쿼리 이름 커스텀:
 *                  [{ type: 'update', sqlQueryName: 'updateById' }, 'list', ...]
 *    description: 설명
 * ========================================================= */
const SERVICE_METHOD_TEMPLATES = {
  list: {
    signature: 'async list()',
    defaultSqlQueryName: 'findAll',
    body: (sqlVar, sqlQueryName) => `    this.log.info(\`\${this.constructor.name}::list 호출됨\`);
    const sql = this.${sqlVar}.get('${sqlQueryName}');
    const res = await db.execute(sql, {});
    return res.rows;`,
    description: '전체 조회',
  },
  listPaged: {
    signature: 'async listPaged(opts)',
    defaultSqlQueryName: 'findAll',
    body: (sqlVar, sqlQueryName) => `    this.log.info(\`\${this.constructor.name}::listPaged 호출됨 -> page=\${opts.page} perPage=\${opts.perPage}\`);
    const sql = this.${sqlVar}.get('${sqlQueryName}');
    return await db.executeList(sql, {}, { page: opts.page, perPage: opts.perPage });`,
    description: '페이지네이션 조회',
  },
  getById: {
    signature: 'async getById(id)',
    defaultSqlQueryName: 'findById',
    body: (sqlVar, sqlQueryName) => `    this.log.debug(\`\${this.constructor.name}::getById 호출됨 -> id=\${id}\`);
    const sql = this.${sqlVar}.get('${sqlQueryName}');
    const res = await db.execute(sql, { id });
    return res.rows[0] ?? null;`,
    description: '단건 조회',
  },
  create: {
    signature: 'async create(payload)',
    defaultSqlQueryName: 'insert',
    body: (sqlVar, sqlQueryName) => `    this.log.info(\`\${this.constructor.name}::create 호출됨\`);
    const sql = this.${sqlVar}.get('${sqlQueryName}');
    const res = await db.execute(sql, payload);
    return { insertId: res.insertId, rowsAffected: res.rowsAffected };`,
    description: '생성',
  },
  update: {
    /* ★ v1.10.29 — (id, name) 만 받던 것을 params 전체로.
       SQL 생성기가 테이블의 모든 컬럼을 쓰는 UPDATE 를 만들면서 어긋났다:
         UPDATE snack SET name=:name, price=:price, memo=:memo WHERE id=:id
       → price/memo 가 안 채워져 `Placeholder 'price' is not defined` 로 실패. */
    signature: 'async update(params)',
    defaultSqlQueryName: 'update',
    body: (sqlVar, sqlQueryName) => `    this.log.info(\`\${this.constructor.name}::update 호출됨 -> id=\${params?.id}\`);
    const sql = this.${sqlVar}.get('${sqlQueryName}');
    const res = await db.execute(sql, fillPlaceholders(sql, params));
    return { rowsAffected: res.rowsAffected };`,
    description: '수정',
  },
  remove: {
    signature: 'async remove(id)',
    defaultSqlQueryName: 'deleteById',
    body: (sqlVar, sqlQueryName) => `    this.log.info(\`\${this.constructor.name}::remove 호출됨 -> id=\${id}\`);
    const sql = this.${sqlVar}.get('${sqlQueryName}');
    const res = await db.execute(sql, { id });
    return { rowsAffected: res.rowsAffected };`,
    description: '삭제',
  },
};

export function getServiceMethodCatalog() {
  return Object.entries(SERVICE_METHOD_TEMPLATES).map(([m, tpl]) => ({
    method: m,
    description: tpl.description,
    defaultSqlQueryName: tpl.defaultSqlQueryName,
  }));
}

/**
 * methods 항목 정규화 — string 또는 {type, sqlQueryName} 모두 받아
 * {type, sqlQueryName} 형태로 반환. (sqlQueryName 미지정 시 템플릿의 default 사용)
 */
function normalizeMethodEntry(entry) {
  if (typeof entry === 'string') {
    const tpl = SERVICE_METHOD_TEMPLATES[entry];
    return { type: entry, sqlQueryName: tpl?.defaultSqlQueryName || entry };
  }
  if (entry && typeof entry === 'object') {
    const type = entry.type;
    const tpl = SERVICE_METHOD_TEMPLATES[type];
    const sqlQueryName = entry.sqlQueryName || tpl?.defaultSqlQueryName || type;
    return { type, sqlQueryName };
  }
  return { type: String(entry), sqlQueryName: String(entry) };
}

/**
 * ★ v1.11.2 — 서비스 메서드 **하나**의 코드 (컨트롤러가 요구하는 메서드를 기존 서비스 파일에 덧붙일 때).
 *   generateServiceCodeStandalone 이 쓰는 것과 같은 템플릿이다.
 */
export function generateServiceMethodCode(type, sqlFile, sqlQueryName = null) {
  const tpl = SERVICE_METHOD_TEMPLATES[type];
  const sqlVar = sqlFile ? `${sqlFile}Sql` : null;
  if (!tpl) return null;
  return `  // ${tpl.description}\n  ${tpl.signature} {\n${tpl.body(sqlVar, sqlQueryName || tpl.defaultSqlQueryName)}\n  }`;
}

export function generateServiceCodeStandalone(meta, targetDir = null) {
  const { name, sqlFile, methods = [], multiSqlMethods = [], description } = meta;
  if (!name || !/^[A-Z][A-Za-z0-9_]*Service$/.test(name)) {
    throw new Error('Service 이름은 PascalCase + Service 끝 (예: ProductService)');
  }
  // 단순 메서드가 있으면 sqlFile 필수
  if (methods.length > 0 && !sqlFile) {
    throw new Error('단순 메서드(list, getById 등) 가 있으면 sqlFile 이 필요합니다');
  }
  if (methods.length === 0 && multiSqlMethods.length === 0) {
    throw new Error('methods 또는 multiSqlMethods 가 1개 이상 필요합니다');
  }

  const sqlVar = sqlFile ? `${sqlFile}Sql` : null;

  // 단순 메서드 코드 생성 — string / object 두 형식 모두 수용
  const simpleMethodCodes = methods.map((rawEntry) => {
    const { type, sqlQueryName } = normalizeMethodEntry(rawEntry);
    const tpl = SERVICE_METHOD_TEMPLATES[type];
    if (!tpl) {
      return `  async ${type}(params) {
    this.log.info(\`\${this.constructor.name}::${type} 호출됨\`);
    // TODO: 구현하세요
    return null;
  }`;
    }
    return `  // ${tpl.description}
  ${tpl.signature} {
${tpl.body(sqlVar, sqlQueryName)}
  }`;
  });

  // multiSql 메서드 코드 생성
  const multiSqlMethodCodes = multiSqlMethods.map((m) => {
    const handlerName = m.name || 'multiSqlHandler';
    const sigArgs = m.params ? `(${m.params})` : '(params)';
    const body = buildMultiSqlBody({ ...m, handlerName }, { indent: '    ' });
    return `  // ${m.description ?? '(multi-SQL)'}
  async ${handlerName}${sigArgs} {
${body}
  }`;
  });

  const methodCodes = [...simpleMethodCodes, ...multiSqlMethodCodes].join('\n\n');

  // 사용된 SQL 파일들 모두 모으기 (단순 메서드의 sqlFile + 모든 multiSql 단계의 sqlFile)
  const allSqlFiles = collectSqlFiles(multiSqlMethods.map((m) => ({ sqlSteps: m.sqlSteps })));
  if (sqlFile && !allSqlFiles.find((s) => s.sqlFile === sqlFile)) {
    allSqlFiles.unshift({ sqlFile, sqlVar });
  }

  const sqlPropLines = allSqlFiles.map(({ sqlFile: f, sqlVar: v }) =>
    `  // SQL 파일 주입: src/database/sql/${f}.sql\n  @Sql('${f}') ${v};`
  ).join('\n\n');

  return `///
/// ${name}
/// ${description ?? ''}
///

import { Service, Sql, Log } from '${frameworkImport(targetDir, 'core/decorators.js')}';
import db from '${frameworkImport(targetDir, 'database/db.js')}';${[...(methodCodes || []), ...(multiSqlMethodCodes || [])].join('').includes('fillPlaceholders') ? `\nimport { fillPlaceholders } from '${frameworkImport(targetDir, 'core/sqlLoader.js')}';` : ''}


@Service('${name}')
export default class ${name} {

${sqlPropLines}

  @Log log;

${methodCodes}
}
`;
}
