/**
 * BlocklistController — 컨트롤러·서비스·SQL 을 운영 중에 막고 푼다 (v1.13.0)
 *
 *  "이 컨트롤러에 구멍이 있으니 지금 내려야 한다. 서버 전체를 내릴 수는 없다."
 *  삭제는 되돌릴 수 없고 급할 때 사고가 난다. 그래서 **끄기** 를 따로 둔다.
 *
 *   GET    /api/admin/blocklist                     막아 둔 것 목록
 *   POST   /api/admin/blocklist/:kind/:name         막기   (body: { reason })
 *   DELETE /api/admin/blocklist/:kind/:name         풀기
 *
 *   kind = controllers | services | sqls
 *
 *  막으면 ① 지금 라우트가 사라지고 ② 재기동해도 그 파일을 읽지 않는다.
 *  ②가 없으면 감시가 새벽에 재기동하는 순간 구멍이 다시 열린다.
 */
import { Controller, GetMapping, PostMapping, DeleteMapping, Roles, Auth, Autowired, Log } from '../../../src/core/decorators.js';
import blocklist from '../../../src/core/blocklist.js';
import { unregisterControllerByBasePath, loadSingleControllerFile } from '../../../src/core/controllerLoader.js';
import { getApp } from '../service/ControllerMetaService.js';
import sqlRegistry from '../../../src/core/sqlLoader.js';
import { findExistingFile } from '../../../src/core/appPaths.js';

const KINDS = ['controllers', 'services', 'sqls'];

@Controller('/api/admin/blocklist')
export default class BlocklistController {
  @Log log;
  @Autowired('ControllerMetaService') metaService;

  /** 막아 둔 것 + 그 영향 */
  @GetMapping('/')
  @Auth()
  async list() {
    const data = blocklist.list();
    return {
      data: {
        ...data,
        file: blocklist.BLOCKLIST_FILE,
        note: '막으면 즉시 라우트가 내려가고, 서버를 다시 켜도 그 파일을 읽지 않습니다.',
      },
    };
  }

  /** 막기 — 즉시 + 재기동 뒤에도 */
  @PostMapping('/:kind/:name')
  @Roles('admin')
  async block(params, req) {
    const { kind, name } = params;
    if (!KINDS.includes(kind)) throw Object.assign(new Error(`kind 는 ${KINDS.join(' | ')} 중 하나여야 합니다`), { status: 400 });
    const reason = String(req.body?.reason || '').slice(0, 300);
    const info = blocklist.block(kind, name, { reason, by: req.user?.username || '-' });

    const effect = await this._applyNow(kind, name);
    this.log.warn(`[blocklist] ⛔ ${kind}/${name} 차단 by ${req.user?.username || '-'}`
      + `${reason ? ` — ${reason}` : ''} (지금: ${effect})`);
    return { data: { ...info, kind, appliedNow: effect } };
  }

  /** 풀기 — 파일에서 지우고, 컨트롤러는 다시 올린다 */
  @DeleteMapping('/:kind/:name')
  @Roles('admin')
  async unblock(params, req) {
    const { kind, name } = params;
    if (!KINDS.includes(kind)) throw Object.assign(new Error(`kind 는 ${KINDS.join(' | ')} 중 하나여야 합니다`), { status: 400 });
    const removed = blocklist.unblock(kind, name);
    let restored = 'restart-required';
    if (kind === 'controllers') {
      const file = findExistingFile('controllers', `${name}.js`);
      if (file) {
        try { await loadSingleControllerFile(getApp(), file); restored = 'reloaded'; }
        catch (e) { restored = `reload-failed: ${e.message}`; }
      } else restored = 'file-not-found';
    } else if (kind === 'sqls') {
      const file = findExistingFile('sqls', `${name}.sql`);
      if (file) {
        try {
          const fs = await import('node:fs');
          sqlRegistry.registerFile(name, fs.readFileSync(file, 'utf8'));
          restored = 'reloaded';
        } catch (e) { restored = `reload-failed: ${e.message}`; }
      } else restored = 'file-not-found';
    }
    this.log.warn(`[blocklist] ✅ ${kind}/${name} 차단 해제 by ${req.user?.username || '-'} (${restored})`);
    return { data: { kind, name, removed, restored } };
  }

  /** 지금 당장 내리기 — 재기동을 기다리지 않는다 */
  async _applyNow(kind, name) {
    if (kind === 'controllers') {
      // 라우트를 내리려면 basePath 가 필요하다 — 메타에서 찾는다
      try {
        const rows = (await this.metaService.listPaged({ page: 1, perPage: 500 }))?.rows || [];
        const hit = rows.find((r) => r.name === name || r.id === name);
        const basePath = hit?.basePath || hit?.base_path;
        if (basePath && unregisterControllerByBasePath(getApp(), basePath)) return `라우트 내림 (${basePath})`;
        return '라우트를 찾지 못함 — 다음 재기동에 적용됩니다';
      } catch (e) { return `라우트 내리기 실패: ${e.message}`; }
    }
    if (kind === 'sqls') {
      return sqlRegistry.unregisterFile(name) ? 'SQL 등록 해제' : '등록된 SQL 없음 — 다음 재기동에 적용됩니다';
    }
    /* 서비스는 이미 컨트롤러가 참조를 들고 있어 런타임에 뽑아내면 그 컨트롤러가
       알 수 없는 상태가 된다. 그 서비스를 쓰는 컨트롤러를 함께 막는 편이 안전하다. */
    return '다음 재기동에 적용됩니다 (그 서비스를 쓰는 컨트롤러도 함께 막으세요)';
  }
}
