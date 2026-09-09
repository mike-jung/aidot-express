import cors from 'cors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function canonicalOrigin(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

/** Apply one explicit origin policy to CORS and browser state changes. */
export function originPolicy(config, { additionalOrigins = [] } = {}) {
  const configured = config.cors?.origin;
  if (configured === true || configured === '*') {
    throw new Error('CORS_ORIGIN must list exact origins; credentialed wildcard origins are not allowed');
  }
  const entries = [...(Array.isArray(configured) ? configured : configured ? [configured] : []), ...additionalOrigins];
  const allowed = new Set(entries.map((entry) => {
    const value = canonicalOrigin(entry);
    if (!value) throw new Error('CORS_ORIGIN contains an invalid origin');
    return value;
  }));
  const hosts = new Set((config.server?.allowedHosts || []).map((host) => host.toLowerCase()));
  return (req, res, next) => {
    if (hosts.size) {
      let hostname;
      try { hostname = new URL(`http://${req.get('host')}`).hostname.toLowerCase(); } catch {}
      if (!hosts.has(hostname)) return res.status(403).json({ code: 403, message: 'Host not allowed' });
    }
    const origin = req.headers.origin;
    if (!origin) {
      if (!SAFE_METHODS.has(req.method) && req.headers['sec-fetch-site'] === 'cross-site') {
        return res.status(403).json({ code: 403, message: 'Cross-site request denied' });
      }
      return next(); // CLI and service clients do not send Origin.
    }
    const normalized = canonicalOrigin(origin);
    const own = canonicalOrigin(`${req.protocol}://${req.get('host')}`);
    if (!normalized || (normalized !== own && !allowed.has(normalized))) {
      return res.status(403).json({ code: 403, message: 'Origin not allowed' });
    }
    return cors({ ...config.cors, origin: normalized, credentials: true })(req, res, next);
  };
}
