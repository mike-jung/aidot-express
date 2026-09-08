/**
 * OpenApiController — 등록된 모든 라우트로부터 OpenAPI 3.0 스펙 자동 생성.
 *
 *   GET /api/admin/openapi.json
 *
 * 외부 swagger-ui 같은 도구에 import 해서 시각화 가능.
 */
import {
  Controller, GetMapping, Auth, Log,
} from '../../../src/core/decorators.js';
import { listRegisteredControllers } from '../../../src/core/controllerLoader.js';

@Controller('/api/admin/openapi')
export default class OpenApiController {

  @Log log;

  /* GET /api/admin/openapi/spec?excludeAdmin=1
   *  excludeAdmin=1 이면 admin 라우트 (/api/admin/*) 는 스펙에서 제외 */
  @GetMapping('/spec')
  @Auth()
  async spec(params) {
    const excludeAdmin = params?.excludeAdmin === '1' || params?.excludeAdmin === 'true';
    const all = listRegisteredControllers();
    const paths = {};
    const includedCtrlNames = new Set();

    for (const c of all) {
      const isAdminCtrl = /\/lib\/admin\//.test(c.file) || (c.basePath || '').startsWith('/api/admin');
      if (excludeAdmin && isAdminCtrl) continue;   // admin 제외

      for (const r of (c.routes || [])) {
        const fullPath = this._joinPath(c.basePath, r.path || '/');
        // OpenAPI 는 path 파라미터 형식이 :id 가 아니라 {id}
        const oasPath = fullPath.replace(/:([A-Za-z_][\w]*)/g, '{$1}');
        const method = (r.method || 'get').toLowerCase();

        if (!paths[oasPath]) paths[oasPath] = {};

        // path 파라미터 추출
        const pathParams = [];
        const re = /\{([A-Za-z_][\w]*)\}/g;
        let m;
        while ((m = re.exec(oasPath)) !== null) {
          pathParams.push({
            name: m[1],
            in: 'path',
            required: true,
            schema: { type: 'string' },
          });
        }

        const op = {
          tags: [c.name],
          summary: `${c.name}.${r.handler}`,
          operationId: `${c.name}_${r.handler}`,
          parameters: pathParams,
          responses: {
            '200': { description: 'OK' },
            '4XX': { description: 'Client Error' },
            '5XX': { description: 'Server Error' },
          },
        };
        if (['post', 'put', 'patch'].includes(method)) {
          op.requestBody = {
            required: false,
            content: {
              'application/json': {
                schema: { type: 'object', additionalProperties: true },
              },
            },
          };
        }
        if (isAdminCtrl) op['x-admin-route'] = true;

        paths[oasPath][method] = op;
        includedCtrlNames.add(c.name);
      }
    }

    const tags = [...includedCtrlNames].map((name) => ({ name }));

    return {
      data: {
        openapi: '3.0.3',
        info: {
          title: 'Admin Tool — Auto Generated API',
          version: '1.0.0',
          description: excludeAdmin
            ? '등록된 라우트로부터 자동 생성된 OpenAPI 스펙 (시스템/관리용 제외)'
            : '등록된 모든 라우트로부터 자동 생성된 OpenAPI 스펙',
        },
        servers: [{ url: '/' }],
        tags,
        paths,
      },
    };
  }

  _joinPath(base, sub) {
    const a = (base || '').replace(/\/+$/, '');
    const b = (sub || '').replace(/^\/+/, '');
    return '/' + [a, b].filter(Boolean).join('/').replace(/^\/+/, '');
  }
}
