/** 소스를 실행하지 않고 라우트별 호출 관계를 읽는다. 메타의 CRUD 추정값은 사용하지 않는다. */
import fs from 'node:fs';
import { parse } from '@babel/parser';
import { displayPath } from '../../../src/core/appPaths.js';

const member = node => ['MemberExpression', 'OptionalMemberExpression'].includes(node?.type);
const call = node => ['CallExpression', 'OptionalCallExpression'].includes(node?.type);
const key = node => node?.name ?? node?.value;
// obj[name]의 name은 실제 속성 이름이 아니다. 상수인 대괄호 표기만 해석한다.
const memberKey = node => node?.computed ? literal(node.property) : key(node?.property);
function literal(node) {
  if (!node) return undefined;
  if (['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(node.type)) return node.value;
  if (node.type === 'NullLiteral') return null;
  if (node.type === 'ArrayExpression') return node.elements.map(literal);
  if (node.type === 'ObjectExpression') return Object.fromEntries(node.properties
    .filter(p => p.type === 'ObjectProperty').map(p => [key(p.key), literal(p.value)]));
  if (node.type === 'TemplateLiteral' && !node.expressions.length) return node.quasis[0].value.cooked;
}
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => walk(n, visit)); return; }
  if (!node.type) return;
  visit(node);
  for (const [k, value] of Object.entries(node)) {
    if (!['loc', 'extra', 'comments', 'tokens', 'leadingComments', 'trailingComments', 'innerComments'].includes(k)) walk(value, visit);
  }
}

function readClass(source) {
  const ast = parse(source, { sourceType: 'unambiguous', plugins: ['decorators-legacy', 'typescript'], attachComment: false });
  const declarations = ast.program.body;
  let cls = declarations.find(n => n.type === 'ExportDefaultDeclaration')?.declaration;
  if (cls?.type === 'Identifier') cls = declarations.find(n => n.type === 'ClassDeclaration' && n.id?.name === cls.name);
  if (cls?.type !== 'ClassDeclaration') cls = declarations.find(n => n.type === 'ClassDeclaration');
  if (!cls) throw new Error('클래스 선언을 찾지 못했습니다.');
  const aliases = new Map();
  for (const n of declarations.filter(n => n.type === 'ImportDeclaration')) {
    for (const item of n.specifiers) aliases.set(item.local.name, item.imported?.name || item.local.name);
  }
  const decorators = node => (node.decorators || []).map(d => {
    const expression = d.expression;
    const name = call(expression) ? key(expression.callee) : key(expression);
    return { name: aliases.get(name) || name, args: call(expression) ? expression.arguments.map(literal) : [] };
  });
  const fields = { services: new Map(), sqls: new Map() };
  const methods = new Map();
  for (const item of cls.body.body) {
    const name = key(item.key);
    for (const d of decorators(item)) {
      if (d.name === 'Autowired' && typeof d.args[0] === 'string') fields.services.set(name, d.args[0]);
      if (d.name === 'Sql' && typeof d.args[0] === 'string') fields.sqls.set(name, d.args[0].replace(/\.sql$/i, ''));
    }
    if (item.type === 'ClassMethod') methods.set(name, item);
  }
  return { source, cls, decorators, methods, ...fields, text: node => source.slice(node?.start ?? 0, node?.end ?? 0) };
}

export function analyzeControllerFlow(ctrl, { findServiceFile, findSqlFile, parseSql }) {
  const result = { id: ctrl.id, name: ctrl.name, basePath: ctrl.basePath, routes: [], services: [], sqlFiles: [], warnings: [] };
  let parsed;
  try { parsed = readClass(ctrl.source || ''); }
  catch (error) {
    result.warnings.push(error.message);
    result.routes = (ctrl.routes || []).map(r => ({ ...r, nodes: [], edges: [], warnings: ['소스 분석을 지원하지 않는 컨트롤러입니다.'] }));
    return result;
  }
  result.basePath = parsed.decorators(parsed.cls).find(d => d.name === 'Controller')?.args[0] ?? ctrl.basePath ?? '';
  const services = new Map();
  const sqlFiles = new Map();
  function service(name) {
    if (services.has(name)) return services.get(name);
    const file = findServiceFile(name);
    const info = { name, filePath: file ? displayPath(file) : null, sqls: [], parsed: null };
    services.set(name, info);
    if (file) {
      try { info.parsed = readClass(fs.readFileSync(file, 'utf8')); info.sqls = [...new Set(info.parsed.sqls.values())]; }
      catch (error) { info.error = error.message; }
    }
    return info;
  }
  function sqlInfo(name) {
    if (sqlFiles.has(name)) return sqlFiles.get(name);
    const file = findSqlFile(name);
    const info = { name, filePath: file ? displayPath(file) : null, queries: file ? parseSql(fs.readFileSync(file, 'utf8')) : [] };
    sqlFiles.set(name, info);
    return info;
  }
  // 파라미터 탭에는 컨트롤러에 직접 주입한 SQL도 포함한다.
  for (const name of parsed.sqls.values()) sqlInfo(name);
  for (const [propertyName, name] of parsed.services) {
    const info = service(name);
    info.propertyName = propertyName;
    for (const sql of info.sqls) sqlInfo(sql);
  }

  for (const [handlerName, methodNode] of parsed.methods) {
    const decorators = parsed.decorators(methodNode);
    for (const mapping of decorators.filter(d => /^(Get|Post|Put|Patch|Delete|Options|Head|Sse|Request)Mapping$/.test(d.name))) {
      const arg = mapping.args[0];
      const method = mapping.name === 'RequestMapping' ? String(arg?.method || 'get') : mapping.name.replace('Mapping', '').replace('Sse', 'Get');
      const routePath = mapping.name === 'RequestMapping' ? (typeof arg === 'string' ? arg : arg?.path || '') : arg || '';
      const route = { handlerName, method: method.toUpperCase(), path: routePath, nodes: [], edges: [], warnings: [], sqlRefs: [] };
      const fullPath = '/' + [result.basePath, routePath].map(s => String(s).replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');
      let guard = {};
      // 실제 legacy decorator 적용 순서와 동일하게 읽는다.
      for (const d of [...decorators].reverse()) {
        if (d.name === 'Auth') guard = { auth: true, ...d.args[0] };
        if (d.name === 'Roles') guard = { ...guard, auth: true, roles: d.args.flat() };
      }
      route.auth = !!guard.auth;
      route.roles = guard.roles || [];
      const addNode = (id, kind, label, details) => {
        route.nodes.push({ id, kind, label, details });
        return id;
      };
      const edge = (from, to, label, details = {}) => route.edges.push({ id: `edge-${route.edges.length}`, source: from, target: to, label, details: { from, to, ...details } });
      addNode('client', 'client', `${route.method} ${fullPath}`, { method: route.method, path: fullPath, auth: route.auth, roles: route.roles, realm: guard.realm || 'admin' });
      addNode('controller', 'controller', `${ctrl.name}.${handlerName}()`, { controller: ctrl.name, handler: handlerName, filePath: ctrl.file_path, source: parsed.text(methodNode) });
      edge('client', 'controller', `${route.method} ${fullPath}`);
      let dbNeeded = false;
      const visited = new Set();
      const visitMethod = (owner, methodName, parentId, depth = 0) => {
        const node = owner.methods.get(methodName);
        const visitKey = `${owner.cls.id?.name}.${methodName}`;
        if (!node || visited.has(visitKey) || depth > 8) {
          route.warnings.push(`${visitKey}: ${!node ? '메서드 소스를 찾지 못했습니다.' : '재귀 호출은 한 번만 표시합니다.'}`);
          return;
        }
        visited.add(visitKey);
        const expressions = new Map();
        const calls = [];
        walk(node.body, n => {
          if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') expressions.set(n.id.name, n.init);
          if (call(n)) calls.push(n);
        });
        function queryRefs(n, seen = new Set()) {
          if (!n || seen.has(n)) return [];
          seen.add(n);
          if (n.type === 'Identifier') return queryRefs(expressions.get(n.name), seen);
          const out = [];
          walk(n, child => {
            if (child !== n && child.type === 'Identifier' && expressions.has(child.name)) out.push(...queryRefs(expressions.get(child.name), seen));
            if (!call(child) || !member(child.callee) || memberKey(child.callee) !== 'get') return;
            const object = child.callee.object;
            if (member(object) && object.object.type === 'ThisExpression' && owner.sqls.has(memberKey(object))) {
              const queryName = literal(child.arguments[0]);
              out.push({ sqlFile: owner.sqls.get(memberKey(object)), queryName: typeof queryName === 'string' ? queryName : null, expression: owner.text(child.arguments[0]) });
            }
          });
          return [...new Map(out.map(r => [`${r.sqlFile}:${r.queryName}:${r.expression}`, r])).values()];
        }
        for (const c of calls) {
          if (!member(c.callee)) continue;
          const target = c.callee.object;
          const calledMethod = memberKey(c.callee);
          if (calledMethod === undefined) {
            route.warnings.push(`${owner.cls.id?.name}.${methodName}: 동적 메서드 호출은 확정할 수 없습니다 (${owner.text(c.callee)}).`);
            continue;
          }
          if (['execute', 'executeList'].includes(calledMethod) && target.type === 'Identifier' && ['db', 'tx'].includes(target.name)) {
            const refs = queryRefs(c.arguments[0]);
            if (!refs.length) route.warnings.push(`${owner.cls.id?.name}.${methodName}: SQL 파일/쿼리를 정적으로 확정할 수 없습니다 (${owner.text(c.arguments[0])}).`);
            for (const reference of refs) {
              const file = sqlInfo(reference.sqlFile);
              const query = file.queries.find(q => q.name === reference.queryName);
              const id = `sql-${route.nodes.filter(n => n.kind === 'sql').length}`;
              addNode(id, 'sql', `${file.name}.sql\n${reference.queryName || reference.expression}`, {
                sqlFile: `${file.name}.sql`, queryName: reference.queryName,
                filePath: file.filePath, action: `${target.name}.${calledMethod}`,
                params: owner.text(c.arguments[1]), options: owner.text(c.arguments[2]),
                resolved: !!query, inputParams: query?.inputParams || [], outputColumns: query?.outputColumns || [],
                sql: query?.text || null,
              });
              route.sqlRefs.push({ name: file.name, queryName: reference.queryName });
              edge(parentId, id, `${target.name}.${calledMethod}`, { queryName: reference.queryName, sqlFile: file.name, source: owner.text(c) });
              edge(id, 'db', calledMethod);
              dbNeeded = true;
              if (!query) route.warnings.push(`${file.name}.sql / ${reference.queryName || reference.expression}: 쿼리를 확인하지 못했습니다.`);
            }
            if (!refs.length) { edge(parentId, 'db', `${target.name}.${calledMethod}`, { source: owner.text(c) }); dbNeeded = true; }
          }
          if (member(target) && target.object.type === 'ThisExpression' && target.computed && memberKey(target) === undefined) {
            route.warnings.push(`${owner.cls.id?.name}.${methodName}: 동적 주입 속성은 확정할 수 없습니다 (${owner.text(target)}).`);
          }
          if (member(target) && target.object.type === 'ThisExpression' && owner.services.has(memberKey(target))) {
            const name = owner.services.get(memberKey(target));
            const info = service(name);
            const id = `service-${route.nodes.filter(n => n.kind === 'service').length}`;
            addNode(id, 'service', `${name}.${calledMethod}()`, {
              serviceName: name, method: calledMethod, propertyName: memberKey(target),
              filePath: info.filePath, arguments: c.arguments.map(owner.text),
            });
            edge(parentId, id, `this.${memberKey(target)}.${calledMethod}()`);
            if (name === 'MciService') {
              const options = literal(c.arguments[0]) || {};
              const mciId = `mci-${id}`;
              addNode(mciId, 'mci', 'MCI Server', { ...options, request: owner.text(c.arguments[0]) });
              edge(id, mciId, calledMethod);
            } else if (info.parsed) visitMethod(info.parsed, calledMethod, id, depth + 1);
            else route.warnings.push(`${name}: ${info.error || '서비스 파일을 찾지 못했습니다.'}`);
          } else if (target.type === 'ThisExpression' && owner.methods.has(calledMethod)) {
            visitMethod(owner, calledMethod, parentId, depth + 1);
          }
        }
        visited.delete(visitKey);
      };
      visitMethod(parsed, handlerName, 'controller');
      if (mapping.name === 'SseMapping') {
        addNode('sse', 'sse', 'SSE stream', { handler: handlerName, source: parsed.text(methodNode) });
        edge('controller', 'sse', 'Server-Sent Events');
      }
      if (dbNeeded) addNode('db', 'db', 'Database', { driver: 'src/database/db.js' });
      result.routes.push(route);
    }
  }
  result.services = [...services.values()].map(({ parsed, ...info }) => info);
  result.sqlFiles = [...sqlFiles.values()];
  return result;
}
