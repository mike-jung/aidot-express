import cors from 'cors';
import { canonicalOrigin, normalizeCorsOrigins } from './corsConfig.js';
export { canonicalOrigin } from './corsConfig.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Apply one explicit origin policy to CORS and browser state changes. */
export function originPolicy(config, { additionalOrigins = [] } = {}) {
  const configured = normalizeCorsOrigins(config.cors?.origin).origins;
  const entries = [...configured, ...additionalOrigins];
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
