/**
 * 사이드카 메타 파일 read/write.
 *
 *  컨트롤러/서비스 파일과 같은 폴더의 `meta/` 서브 폴더 아래에 `<n>.meta.json` 형태로 저장.
 *  코드 파일과 물리적으로 분리하여 디렉토리가 깔끔하게 유지됨.
 *
 *  예:
 *    src/controller/OrderController.js
 *    src/controller/meta/OrderController.meta.json
 *
 *  수정 화면 진입 시 메타가 있으면 그것을 진실의 원천으로 사용 (multiSql 등 복원).
 *
 *  마이그레이션: 이전 버전에서 생성된 `<dir>/.<n>.meta.json` 파일이 발견되면
 *  `migrateLegacyMetaFiles()` 가 서버 기동 시 자동으로 새 경로로 이동.
 */
import fs from 'node:fs';
import { safeWriteFile, safeUnlink } from './safeFs.js';
import path from 'node:path';

/** 서브 폴더 이름 */
const META_DIR_NAME = 'meta';

/** code 파일 경로 → 메타 파일 경로 */
export function metaPathFor(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath).replace(/\.(m?js|ts)$/i, '');
  return path.join(dir, META_DIR_NAME, `${base}.meta.json`);
}

/** 레거시(.xxx.meta.json) 경로 — 마이그레이션 검사용 */
export function legacyMetaPathFor(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath).replace(/\.(m?js|ts)$/i, '');
  return path.join(dir, `.${base}.meta.json`);
}

/** 메타 객체를 디스크에 저장 (async) */
export async function writeMeta(filePath, meta) {
  const metaPath = metaPathFor(filePath);
  // meta 서브폴더 자동 생성
  const metaDir = path.dirname(metaPath);
  /* ★ v1.36.3 — 설치본은 `C:\Program Files\...` 에 놓인다. 거기는 쓸 수 없다.
     예전에는 여기서 EPERM 이 나며 **서버 부팅 자체가 죽었다**:
         EPERM: mkdir 'C:\Program Files\Aidot Express\resources\app\src\service\meta'
     meta 는 편의 정보다 — 없다고 서버가 못 뜰 이유가 없다. 못 쓰면 건너뛴다. */
  try {
    if (!fs.existsSync(metaDir)) fs.mkdirSync(metaDir, { recursive: true });
  } catch (e) {
    if (['EPERM', 'EACCES', 'EROFS'].includes(e.code)) return null;
    throw e;
  }
  const obj = {
    ...meta,
    _generatedAt: new Date().toISOString(),
    _version: 2,  // v2 = meta 서브 폴더 방식
  };
  try {
    await safeWriteFile(metaPath, JSON.stringify(obj, null, 2));
  } catch (e) {
    if (['EPERM', 'EACCES', 'EROFS'].includes(e.code)) return null;
    throw e;
  }
  return metaPath;
}

/** 메타 객체 읽기 (없으면 null) — 동기. 새 경로 우선, 없으면 레거시 경로 폴백. */
export function readMeta(filePath) {
  // 1) 신규 경로
  const metaPath = metaPathFor(filePath);
  if (fs.existsSync(metaPath)) {
    try { return JSON.parse(fs.readFileSync(metaPath, 'utf8')); }
    catch { /* noop */ }
  }
  // 2) 레거시 경로 — 읽기 전용 폴백 (쓰기는 항상 신규 경로)
  const legacy = legacyMetaPathFor(filePath);
  if (fs.existsSync(legacy)) {
    try { return JSON.parse(fs.readFileSync(legacy, 'utf8')); }
    catch { return null; }
  }
  return null;
}

/** 메타 삭제 (async) — 신규/레거시 양쪽 모두 제거 */
export async function deleteMeta(filePath) {
  let removed = false;
  const metaPath = metaPathFor(filePath);
  if (fs.existsSync(metaPath)) { await safeUnlink(metaPath); removed = true; }
  const legacy = legacyMetaPathFor(filePath);
  if (fs.existsSync(legacy))   { await safeUnlink(legacy);   removed = true; }
  return removed;
}

/** 디렉토리 스캔 시 meta 폴더를 제외할지 판정하는 헬퍼 */
export function isMetaDir(dirName) {
  return dirName === META_DIR_NAME;
}

/** 디렉토리 스캔 시 .meta.json 파일 제외용 (레거시 호환) */
export function isMetaFile(fileName) {
  return /^\..+\.meta\.json$/.test(fileName) || /\.meta\.json$/.test(fileName);
}

/**
 * 레거시 `.xxx.meta.json` 파일을 `meta/xxx.meta.json` 으로 자동 이동.
 * 서버 부팅 시 한 번 호출 권장.
 *   @param dirs  검사할 디렉토리 목록 (예: ['src/controller', 'src/service'])
 *   @returns { moved: number, skipped: number, errors: string[] }
 */
export function migrateLegacyMetaFiles(dirs) {
  const report = { moved: 0, skipped: 0, errors: [] };
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (e) { report.errors.push(`${dir}: ${e.message}`); continue; }

    const metaSubdir = path.join(dir, META_DIR_NAME);
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      // 레거시 패턴: .<n>.meta.json (prefix 점)
      if (!/^\..+\.meta\.json$/.test(ent.name)) continue;

      const legacyPath = path.join(dir, ent.name);
      // .Name.meta.json → Name.meta.json (prefix 점 제거)
      const newName = ent.name.replace(/^\./, '');
      const newPath = path.join(metaSubdir, newName);

      try {
        if (!fs.existsSync(metaSubdir)) fs.mkdirSync(metaSubdir, { recursive: true });
        if (fs.existsSync(newPath)) {
          // 이미 새 경로에 존재 → 레거시만 삭제
          fs.unlinkSync(legacyPath);
          report.skipped += 1;
        } else {
          fs.renameSync(legacyPath, newPath);
          report.moved += 1;
        }
      } catch (e) {
        report.errors.push(`${legacyPath} → ${newPath}: ${e.message}`);
      }
    }
  }
  return report;
}
