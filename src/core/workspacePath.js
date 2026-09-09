import fs from 'node:fs';
import path from 'node:path';

const reserved = new Set(['src', 'lib', 'node_modules', 'admin-client', 'public', 'log', 'data',
  'docs', 'scripts', 'tests', 'examples', 'mci-server', 'electron', 'dist', 'dist-public', 'dist-electron']);
const invalid = (message) => Object.assign(new Error(message), { status: 400 });

/** Validate before creating directories or writing the unquoted APP_WORKSPACE value. */
export function resolveWorkspacePath(root, input) {
  const value = String(input ?? '');
  if (/[\x00-\x1f\x7f"'`#$<>:|?*]/.test(value)) {
    throw invalid('경로에 쓸 수 없는 문자가 있습니다.');
  }
  const raw = value.trim();
  if (!raw) return { relative: '', absolute: null };
  if (path.posix.isAbsolute(raw) || path.win32.isAbsolute(raw)) {
    throw invalid('프로젝트 폴더 안의 상대 경로만 쓸 수 있습니다 (예: workspace, my-app).');
  }
  const parts = raw.replaceAll('\\', '/').split('/').filter((part) => part && part !== '.');
  if (!parts.length || parts.some((part) => part.startsWith('.') || /[. ]$/.test(part)
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) {
    throw invalid('숨김 폴더, 상위 경로 또는 예약된 폴더 이름은 쓸 수 없습니다.');
  }
  if (reserved.has(parts[0].toLowerCase())) {
    throw invalid(`${parts[0]} 아래는 프레임워크 폴더라 작업 폴더로 쓸 수 없습니다.`);
  }
  const absolute = path.resolve(root, ...parts);
  const relative = path.relative(root, absolute);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw invalid('프로젝트 폴더 안의 경로만 쓸 수 있습니다.');
  }
  // Reject links, including Windows junctions, in existing parents and generated subdirectories.
  for (const candidate of [absolute, ...['controller', 'service', 'sql', 'scenarios'].map((sub) => path.join(absolute, sub))]) {
    let current = path.resolve(root);
    for (const part of path.relative(root, candidate).split(path.sep)) {
      current = path.join(current, part);
      let stat;
      try { stat = fs.lstatSync(current); } catch (error) {
        if (error.code === 'ENOENT') break;
        throw error;
      }
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw invalid('작업 폴더 경로에는 링크나 파일을 쓸 수 없습니다.');
      }
    }
  }
  return { relative: parts.join('/'), absolute };
}
