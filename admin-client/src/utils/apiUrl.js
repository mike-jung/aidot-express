// Console credentials belong only to the console's own API origin.
export function sameOriginApiUrl(value, base = globalThis.location?.origin) {
  if (!base) throw new Error('A console origin is required for API requests');
  const origin = new URL(base).origin;
  const url = new URL(value, `${origin}/`);
  if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('API tests must use the current console origin. Use a relative /api/... path; HTTP downgrade and external credential forwarding are blocked.');
  }
  return url.href;
}

export function controlApiBase(metadata, base = globalThis.location?.origin, override = '') {
  const current = new URL(base);
  const target = new URL(override || current.origin);
  if (!override) { target.protocol = `${metadata.protocol}:`; target.port = String(metadata.controlPort || 7902); }
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.search || target.hash) throw new Error('Invalid Control API URL');
  // An old same-host HTTP override can safely follow the listener's confirmed HTTPS setting.
  if (current.protocol === 'https:' && target.protocol === 'http:' && target.hostname === current.hostname && metadata.protocol === 'https') target.protocol = 'https:';
  if (current.protocol === 'https:' && target.protocol !== 'https:') throw new Error('The HTTPS console requires an HTTPS Control API URL. Update the Control URL setting.');
  return target.origin;
}
