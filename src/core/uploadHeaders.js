import path from 'node:path';

/** Uploaded documents must not execute in the administration console's origin. */
export function uploadHeaders(publicDirectory) {
  const root = path.resolve(publicDirectory, 'uploads') + path.sep;
  return (res, file) => {
    if (!path.resolve(file).startsWith(root)) return;
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('X-Content-Type-Options', 'nosniff');
  };
}
