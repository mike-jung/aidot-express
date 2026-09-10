/** Exact browser origins. Legacy '*' entries never grant cross-origin access. */
export function canonicalOrigin(value) {
  if (typeof value !== 'string' || /[\x00-\x1f\x7f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || url.hostname.includes('*') || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export function normalizeCorsOrigins(value) {
  if (value === undefined || value === null || value === false || value === '') return { origins: [], ignoredWildcard: false };
  if (value === true || (!Array.isArray(value) && typeof value !== 'string')) {
    throw new Error('CORS_ORIGIN must contain exact HTTP(S) origins; reflective true is not supported');
  }
  const entries = Array.isArray(value) ? value : value.split(',');
  const origins = new Set();
  let ignoredWildcard = false;
  for (const entry of entries) {
    if (typeof entry !== 'string') throw new Error('CORS_ORIGIN must contain exact HTTP(S) origins');
    const text = entry.trim();
    if (!text) continue;
    if (text === '*') { ignoredWildcard = true; continue; }
    const origin = canonicalOrigin(text);
    if (!origin) throw new Error('CORS_ORIGIN contains an invalid origin. Use scheme://host[:port] without credentials, paths or wildcard hosts.');
    origins.add(origin);
  }
  return { origins: [...origins], ignoredWildcard };
}
