/**
 * logLine.js — 로그 한 줄의 문법. **콘솔(LogsService)과 CLI(scripts/logs.mjs)가 같은 함수를 쓴다.**
 *
 *  v1.11.3 — 예전에는 둘이 같은 정규식을 따로 들고 있었고, 둘 다 `1201.2ms` 를 2ms 로 읽는 같은 결함이 있었다.
 *  "화면과 터미널이 같은 규칙" 은 코드가 하나일 때만 지켜진다.
 *
 *  줄 모양 (logger.js fileFormat):
 *    2026-08-27 12:15:14.964 [INFO] [2b3232ad] kind=sql [db.js:324:36] 메시지 {"kind":"sql"}
 */
export const LINE_RE =
  /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \[(\w+)\s*\](?:\s*\[([0-9a-zA-Z_-]+)\])?\s*kind=(\w+)\s*(.*)$/;

/** 소요 시간: `(812ms)` · `| 1201.2ms` · `3.0ms` — 소수점 포함. 없으면 null */
const MS_RE = /\((\d+(?:\.\d+)?)ms\)|(?:^|[\s|(])(\d+(?:\.\d+)?)ms\b/;

/** 한 줄을 필드로 — 형식이 안 맞으면 null (옛 로그에도 화면이 깨지지 않게) */
export function parseLogLine(raw) {
  const m = LINE_RE.exec(raw);
  if (!m) return null;
  const [, ts, level, requestId, kind, rest] = m;
  const ms = MS_RE.exec(rest);
  return {
    raw, ts, at: Date.parse(ts.replace(' ', 'T')), level: level.trim(),
    requestId: requestId && requestId !== '-' ? requestId : null,
    kind, rest, ms: ms ? Number(ms[1] || ms[2]) : null,
  };
}

export default { LINE_RE, parseLogLine };
