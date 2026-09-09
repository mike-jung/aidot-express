/** Receiving deadlines do not impose a time limit on long-lived SSE responses. */
export function configureHttpServer(server, config) {
  server.headersTimeout = config.headersTimeoutMs;
  server.requestTimeout = config.requestTimeoutMs;
  server.keepAliveTimeout = config.keepAliveTimeoutMs;
  server.maxRequestsPerSocket = config.maxRequestsPerSocket;
  return server;
}

export function validateServerLimits(config) {
  const units = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
  const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(String(config.bodyLimit).trim());
  const bytes = match ? Number(match[1]) * (units[(match[2] || 'b').toLowerCase()]) : NaN;
  if (!Number.isFinite(bytes) || bytes < 1 || bytes > 1024 ** 3) throw new Error('BODY_LIMIT must be between 1 byte and 1gb');
  for (const name of ['headersTimeoutMs', 'requestTimeoutMs', 'keepAliveTimeoutMs', 'maxRequestsPerSocket']) {
    if (!Number.isSafeInteger(config[name]) || config[name] <= 0) throw new Error(`Invalid server limit: ${name}`);
  }
  if (config.headersTimeoutMs > config.requestTimeoutMs) throw new Error('HTTP_HEADERS_TIMEOUT_MS must not exceed HTTP_REQUEST_TIMEOUT_MS');
}
