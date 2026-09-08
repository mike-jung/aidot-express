/**
 * src/core/sseTicket.js — SSE 접속용 1회용 단기 티켓
 *
 *  왜 필요한가
 *    브라우저의 EventSource 는 커스텀 헤더(Authorization)를 보낼 수 없다.
 *    그래서 v1.3.0 까지는 `?access_token=<15분짜리 토큰>` 을 허용했는데,
 *      - 주소창·북마크·리퍼러·프록시 로그에 장기 토큰이 남고
 *      - 한 번 새면 15분 동안 그대로 쓸 수 있다
 *    는 문제가 있다.
 *
 *  해결
 *    로그인된 상태에서 "이 스트림에 붙을 자격" 만 담은 **30초짜리 1회용 티켓**을 발급받아
 *    그 티켓으로만 접속한다. 티켓은 접속하는 순간 소모되고, 서버 메모리에만 존재한다.
 *
 *  성질
 *    - 단일 사용(one-time): 소모 후 즉시 삭제 → 재사용 불가
 *    - 짧은 수명(기본 30초): 새어도 창이 거의 없다
 *    - 서버 메모리 보관: 재시작하면 전부 무효 (재접속 시 새로 발급받으면 됨)
 *    - IP 고정(옵션): 발급 시 IP 와 다른 곳에서 쓰면 거부
 */
import crypto from 'node:crypto';
import logger from '../util/logger.js';

const DEFAULT_TTL_MS = 30_000;
const MAX_TICKETS = 5_000;          // 폭주 방지 상한

const tickets = new Map();          // ticket -> { user, channelHint, ip, expiresAt }
let sweeper = null;

function startSweeper() {
  if (sweeper) return;
  sweeper = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of tickets) if (v.expiresAt <= now) tickets.delete(k);
    if (tickets.size === 0) { clearInterval(sweeper); sweeper = null; }
  }, 10_000);
  sweeper.unref?.();
}

/**
 * 티켓 발급. 반환: { ticket, expiresIn(ms), expiresAt(ISO) }
 *   user: controllerLoader 가 세팅한 req.user (id/username/role/realm)
 */
export function issueTicket(user, opts = {}) {
  if (tickets.size >= MAX_TICKETS) {
    // 만료분 정리 후에도 가득하면 발급 거부 (메모리 보호)
    const now = Date.now();
    for (const [k, v] of tickets) if (v.expiresAt <= now) tickets.delete(k);
    if (tickets.size >= MAX_TICKETS) {
      throw Object.assign(new Error('SSE 티켓이 너무 많습니다. 잠시 후 다시 시도하세요.'), { status: 503 });
    }
  }
  const ttl = Math.min(120_000, Math.max(5_000, Number(opts.ttlMs) || DEFAULT_TTL_MS));
  const ticket = crypto.randomBytes(24).toString('base64url');
  tickets.set(ticket, {
    user: user ? { ...user } : null,
    ip: opts.ip || null,
    channelHint: opts.channel || null,
    expiresAt: Date.now() + ttl,
  });
  startSweeper();
  return { ticket, expiresIn: ttl, expiresAt: new Date(Date.now() + ttl).toISOString() };
}

/**
 * 티켓 사용(소모). 유효하면 발급 당시의 user 를 돌려주고 즉시 삭제한다.
 *   실패 사유는 호출부에서 401 로 처리한다.
 */
export function consumeTicket(ticket, { ip } = {}) {
  if (!ticket || typeof ticket !== 'string') return null;
  const entry = tickets.get(ticket);
  if (!entry) return null;
  tickets.delete(ticket);                       // 1회용
  if (entry.expiresAt <= Date.now()) return null;
  if (entry.ip && ip && entry.ip !== ip) {
    logger.warn(`[sse-ticket] used from a different IP than issued (issued=${entry.ip}, used=${ip})`);
    return null;
  }
  return entry.user;
}

export function ticketStats() {
  const now = Date.now();
  let alive = 0;
  for (const v of tickets.values()) if (v.expiresAt > now) alive += 1;
  return { alive, total: tickets.size, ttlMs: DEFAULT_TTL_MS };
}

/** 서버 종료 시 정리 */
export function clearTickets() {
  tickets.clear();
  if (sweeper) { clearInterval(sweeper); sweeper = null; }
}

export default { issueTicket, consumeTicket, ticketStats, clearTickets };
