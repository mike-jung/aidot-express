/**
 * SseTicketController — /api/admin/sse/*
 *
 *   POST /api/admin/sse/ticket    SSE 접속용 1회용 티켓 발급 (로그인 필요)
 *   GET  /api/admin/sse/status    현재 스트림/티켓 상태 (진단용)
 *
 *  쓰는 법 (콘솔/클라이언트)
 *    const { ticket } = (await http.post('/api/admin/sse/ticket')).data.data;
 *    new EventSource(`/api/admin/metrics/stream?ticket=${ticket}`);
 *
 *  왜 토큰 대신 티켓인가
 *    EventSource 는 헤더를 못 보내므로 인증 정보를 URL 에 실어야 한다.
 *    장기 access token 을 URL 에 넣으면 로그·리퍼러에 오래 남는다 → 30초·1회용 티켓으로 창을 좁힌다.
 *    자세한 설명: docs/SSE_DESIGN.md
 */
import {
  Controller, PostMapping, GetMapping, Auth, Log,
} from '../../../src/core/decorators.js';
import { issueTicket, ticketStats } from '../../../src/core/sseTicket.js';
import sseHub from '../../../src/core/sse.js';

@Controller('/api/admin/sse')
export default class SseTicketController {

  @Log log;

  /** 1회용 티켓 발급 — 요청자의 로그인 정보(realm/role)를 그대로 담는다 */
  @PostMapping('/ticket')
  @Auth()
  async ticket(params, req) {
    const t = issueTicket(req.user, {
      ip: req.ip,
      ttlMs: params.ttlMs,
      channel: params.channel,
    });
    this.log.debug(`[sse-ticket] issued user=${req.user?.username ?? '-'} ttl=${t.expiresIn}ms`);
    return { data: t };            // { ticket, expiresIn, expiresAt }
  }

  /** 진단: 지금 붙어 있는 스트림과 살아 있는 티켓 수 */
  @GetMapping('/status')
  @Auth()
  async status() {
    return { data: { streams: sseHub.stats(), tickets: ticketStats() } };
  }
}
