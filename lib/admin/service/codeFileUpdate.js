import fs from 'node:fs';
import { safeWriteFile, safeUnlink } from './safeFs.js';
import { metaPathFor, legacyMetaPathFor, writeMeta, deleteMeta } from './metaStorage.js';
import { codeError } from '../../../src/core/codeErrors.js';

// Console writes are serialized so a failed edit cannot restore over another edit.
let pending = Promise.resolve();

export function writeAndLoadCode({ filePath, previousFilePath = filePath, code, meta, load }) {
  const operation = pending.then(async () => {
    const files = [filePath, metaPathFor(filePath), legacyMetaPathFor(filePath)];
    const snapshots = files.map(file => ({ file, data: fs.existsSync(file) ? fs.readFileSync(file) : null }));
    let result;
    try {
      await safeWriteFile(filePath, code);
      await writeMeta(filePath, meta);
      result = await load();
    } catch (reason) {
      const error = codeError(reason);
      const restoreErrors = [];
      for (const { file, data } of snapshots) {
        try {
          if (data === null) await safeUnlink(file);
          else await safeWriteFile(file, data);
        } catch (restoreError) { restoreErrors.push(`${file}: ${codeError(restoreError).message}`); }
      }
      const suffix = restoreErrors.length
        ? ` (파일 복원 실패: ${restoreErrors.join('; ')})`
        : ' (기존 코드와 메타를 유지했습니다)';
      throw Object.assign(new Error(`동적 로딩 실패: ${error.message}${suffix}`, { cause: error }), { status: 500 });
    }
    // A rename keeps the original source and metadata until the new code is live.
    if (previousFilePath !== filePath) {
      await safeUnlink(previousFilePath);
      await deleteMeta(previousFilePath);
    }
    return result;
  });
  pending = operation.catch(() => {});
  return operation;
}
