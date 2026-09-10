function loopback(address) {
  return address === '::1' || /^127\./.test(address || '') || /^::ffff:127\./i.test(address || '');
}

// Keep local first-run setup available. Production traffic from remote clients must
// use direct TLS or an explicitly trusted TLS-terminating reverse proxy.
export function requireHttps(config) {
  return (req, res, next) => {
    if (config.env !== 'production' || req.secure || (loopback(req.socket.remoteAddress) && loopback(req.ip))) return next();
    res.status(426).json({ error: 'https_required', message: 'HTTPS is required for remote production access. Configure HTTPS or a trusted TLS reverse proxy.' });
  };
}
