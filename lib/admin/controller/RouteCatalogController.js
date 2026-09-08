/**
 * RouteCatalogController — 등록된 모든 라우트의 카탈로그 제공.
 *
 *   /api/admin/routes
 *
 * API 테스터 화면에서 검색/선택을 위한 데이터 소스.
 */
import {
  Controller, GetMapping, Auth, Log,
} from '../../../src/core/decorators.js';
import { listRegisteredControllers } from '../../../src/core/controllerLoader.js';

@Controller('/api/admin/routes')
export default class RouteCatalogController {

  @Log log;

  /**
   * GET /api/admin/routes
   *
   * 응답 형식:
   *   { data: [
   *       {
   *         controllerName: 'StudentController',
   *         basePath: '/api/students',
   *         file: 'src/controller/StudentController.js',
   *         isAdmin: false,
   *         routes: [
   *           { method: 'GET', path: '/', handler: 'list', fullPath: '/api/students/' },
   *           ...
   *         ]
   *       },
   *       ...
   *     ] }
   */
  @GetMapping('/')
  @Auth()
  async list() {
    const all = listRegisteredControllers();
    const data = all.map((c) => ({
      controllerName: c.name,
      basePath: c.basePath,
      file: c.file,
      // admin 도구 자체의 라우트는 isAdmin: true 로 마킹 (UI 에서 별도 그룹/필터 가능)
      isAdmin: /\/lib\/admin\//.test(c.file) || (c.basePath || '').startsWith('/api/admin'),
      routes: c.routes.map((r) => ({
        method: (r.method || 'get').toUpperCase(),
        path: r.path || '/',
        handler: r.handler,
        fullPath: this._joinPath(c.basePath, r.path || '/'),
      })),
    }));
    // 컨트롤러명 알파벳순
    data.sort((a, b) => a.controllerName.localeCompare(b.controllerName));
    return { data };
  }

  _joinPath(base, sub) {
    const a = (base || '').replace(/\/+$/, '');
    const b = (sub || '').replace(/^\/+/, '');
    return '/' + [a, b].filter(Boolean).join('/').replace(/^\/+/, '');
  }
}
