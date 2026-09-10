import fs from 'node:fs';
import path from 'node:path';

export function validateArchiveEntries(entries, { maxEntryBytes = 16 * 1024 * 1024, maxTotalBytes = 100 * 1024 * 1024 } = {}) {
  const seen = new Set();
  let total = 0;
  for (const entry of entries) {
    const name = entry.entryName.replace(/\\/g, '/');
    const normalized = path.posix.normalize(name);
    const size = Number(entry.header.size);
    if (!Number.isSafeInteger(size) || size < 0 || size > maxEntryBytes || (total += size) > maxTotalBytes) {
      throw Object.assign(new Error('Archive exceeds decompressed size limits'), { status: 400 });
    }
    if (((entry.header.attr >>> 16) & 0o170000) === 0o120000) throw Object.assign(new Error('Archive symlink entries are not allowed'), { status: 400 });
    if (name.includes('\0') || /^[A-Za-z]:/.test(name) || name.startsWith('/') || name.split('/').includes('..')) throw Object.assign(new Error('Invalid archive path'), { status: 400 });
    const collisionKey = normalized.toLowerCase(); // Windows is case insensitive.
    if (seen.has(collisionKey)) throw Object.assign(new Error('Duplicate archive path'), { status: 400 });
    seen.add(collisionKey);
  }
}

/** Reject existing symlinks/junctions along a restore destination. */
export function assertRestorePath(root, target) {
  root = path.resolve(root);
  for (let ancestor = root; ; ancestor = path.dirname(ancestor)) {
    try {
      if (fs.lstatSync(ancestor).isSymbolicLink()) throw Object.assign(new Error('Restore root contains a symlink'), { status: 400 });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (ancestor === path.dirname(ancestor)) break;
  }
  const rel = path.relative(root, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw Object.assign(new Error('Restore path outside project'), { status: 400 });
  let current = root;
  for (const part of rel.split(path.sep)) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw Object.assign(new Error('Restore destination contains a symlink'), { status: 400 });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
