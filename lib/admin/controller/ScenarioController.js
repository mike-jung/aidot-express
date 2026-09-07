/**
 * ScenarioController — 콘솔 [시나리오 테스트] 의 저장소 (v1.11.6)
 *
 *  왜 서버에 두나: 예전에는 브라우저 localStorage 에만 있었다.
 *    · 팀원과 공유되지 않고, 브라우저를 바꾸면 사라지고, 백업에도 빠졌다 (backup 문서에 "클라이언트가 별도 export" 라고 적혀 있었다)
 *  이제 파일 하나씩(JSON)으로 저장한다. 작업 폴더가 있으면 workspace/scenarios/, 없으면 src/scenarios/.
 *  실행은 여전히 브라우저(scenarioRunner)가 한다 — 로그인 토큰과 쿠키를 그대로 쓰기 위해.
 *
 *   GET    /api/admin/scenarios          목록 (메타)
 *   GET    /api/admin/scenarios/:id      단건
 *   PUT    /api/admin/scenarios/:id      저장 (신규는 id 를 'new' 로 → 발급)
 *   DELETE /api/admin/scenarios/:id
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Controller, GetMapping, PutMapping, DeleteMapping, Auth, Roles, Log } from '../../../src/core/decorators.js';
import { writeDirFor, existingDirs, findExistingFile } from '../../../src/core/appPaths.js';
import { assertSafeId } from '../../../src/core/security.js';

const MAX_BYTES = 512 * 1024;

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function metaOf(sc, file) {
  const st = fs.statSync(file);
  return { id: sc.id, name: sc.name || '(이름 없음)', description: sc.description || '', stepCount: (sc.steps || []).length, updatedAt: sc.updatedAt || st.mtimeMs, file: path.basename(file) };
}

@Controller('/api/admin/scenarios')
export default class ScenarioController {
  @Log log;

  @GetMapping('/')
  @Auth()
  async list() {
    const rows = [];
    for (const dir of existingDirs('scenarios')) {
      for (const f of fs.readdirSync(dir)) {
        if (!/\.json$/i.test(f)) continue;
        const sc = readJson(path.join(dir, f));
        if (sc && sc.id) rows.push(metaOf(sc, path.join(dir, f)));
      }
    }
    rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return { data: rows };
  }

  @GetMapping('/:id')
  @Auth()
  async get(params) {
    assertSafeId(params.id, 'id');
    const file = findExistingFile('scenarios', `${params.id}.json`);
    const sc = file ? readJson(file) : null;
    if (!sc) throw Object.assign(new Error('시나리오를 찾을 수 없습니다'), { status: 404 });
    return { data: sc };
  }

  @PutMapping('/:id')
  @Roles('admin')
  async save(params) {
    const { id: rawId, ...body } = params;
    const id = !rawId || rawId === 'new' ? 'sc_' + crypto.randomBytes(5).toString('hex') : String(rawId);
    assertSafeId(id, 'id');
    if (!Array.isArray(body.steps)) throw Object.assign(new Error('steps 가 필요합니다'), { status: 400 });
    const sc = { ...body, id, updatedAt: Date.now() };
    const text = JSON.stringify(sc, null, 2);
    if (Buffer.byteLength(text) > MAX_BYTES) throw Object.assign(new Error('시나리오가 너무 큽니다 (512KB)'), { status: 413 });
    const existing = findExistingFile('scenarios', `${id}.json`);
    const file = existing || path.join(writeDirFor('scenarios'), `${id}.json`);   // 있던 자리에, 없으면 작업 폴더에
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text + '\n', 'utf8');
    this.log.info(`[scenario] 저장: ${sc.name || id} (${sc.steps.length}단계) → ${path.relative(process.cwd(), file)}`);
    return { data: sc };
  }

  @DeleteMapping('/:id')
  @Roles('admin')
  async remove(params) {
    assertSafeId(params.id, 'id');
    const file = findExistingFile('scenarios', `${params.id}.json`);
    if (!file) throw Object.assign(new Error('시나리오를 찾을 수 없습니다'), { status: 404 });
    fs.unlinkSync(file);
    return { data: { id: params.id } };
  }
}
