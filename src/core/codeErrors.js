/** JavaScript may throw any value, including null/undefined or an object without toString. */
export function codeError(value) {
  try {
    if (value instanceof Error && typeof value.message === 'string') return value;
  } catch { /* custom thrown objects can have throwing accessors */ }
  let message;
  try {
    message = typeof value?.message === 'string' ? value.message : String(value);
  } catch {
    message = 'Non-Error value thrown by user code';
  }
  const error = new Error(message || 'Empty error thrown by user code', { cause: value });
  try { if (typeof value?.stack === 'string') error.stack = value.stack; } catch { /* diagnostic only */ }
  // Preserve Express error properties when a user throws a plain object.
  for (const key of ['status', 'statusCode', 'code', 'retryAfterMs', 'expectedOutage']) {
    try { if (value?.[key] !== undefined) error[key] = value[key]; } catch { /* diagnostic only */ }
  }
  return error;
}
