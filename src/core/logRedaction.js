const SENSITIVE = /^(?:access[_-]?token|refresh[_-]?token|token|ticket|password|passwd|passphrase|https_key_passphrase|secret|api[_-]?key|authorization|code)$/i;

/** Redact encoded query names too; never log an unparseable URL verbatim. */
export function redactUrl(value) {
  try {
    const url = new URL(String(value), 'http://redaction.invalid');
    for (const key of new Set(url.searchParams.keys())) {
      if (SENSITIVE.test(key)) url.searchParams.set(key, '[REDACTED]');
    }
    return url.pathname + url.search;
  } catch { return '[invalid URL]'; }
}
