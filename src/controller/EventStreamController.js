///
/// EventStreamController — SSE(Server-Sent Events) 샘플
///
///   GET  /api/events/stream?channel=demo   서버 → 브라우저 실시간 스트림 (EventSource 로 접속)
///   POST /api/events/publish               채널에 메시지 발행 (누르면 접속한 모든 화면에 즉시 도착)
///   GET  /api/events/stats                 현재 접속자/채널 상태
///
///   실습 페이지: http://localhost:7901/public/demo/guestbook-lab.html
///
///   ※ 연습용이라 인증 없이 열어 두었습니다. 실제 서비스에서는 stream/publish 에 @Auth() 를 붙이세요.
///     EventSource 는 헤더를 못 보내므로 @Auth() 를 붙이면 클라이언트는
///     new EventSource('/api/events/stream?access_token=' + token) 처럼 호출합니다.
///
import {
  Controller,
  Log,
  GetMapping,
  PostMapping,
  SseMapping,
  Validate,
} from '../core/decorators.js';
import { z } from 'zod';
import sseHub from '../core/sse.js';

const publishSchema = z.object({
  channel: z.string().min(1).max(64).default('demo'),
  event: z.string().min(1).max(64).default('message'),
  message: z.string().min(1).max(2000),
}).strip();

@Controller('/api/events')
export default class EventStreamController {

  @Log log;

  /**
   * 스트림 접속. 반환한 문자열이 구독할 채널 이름이 됩니다.
   *  - 브라우저: const es = new EventSource('/api/events/stream?channel=demo')
   *  - 끊기면 브라우저가 알아서 재접속하고, Last-Event-ID 를 보내 놓친 이벤트를 돌려받습니다.
   */
  @SseMapping('/stream')
  async stream(params, req) {
    const channel = String(params.channel || 'demo').slice(0, 64);
    this.log.info(`SSE connected channel=${channel} ip=${req.ip}`);
    // 접속하자마자 한 줄 보내 주면 화면에서 "연결됨"을 바로 확인할 수 있습니다.
    req.sse.send({ event: 'hello', data: { message: `${channel} 채널에 연결되었습니다`, ts: new Date().toISOString() } });
    return channel;
  }

  /** 채널에 메시지 발행 → 접속 중인 모든 화면에 즉시 전달 */
  @PostMapping('/publish')
  @Validate(publishSchema)
  async publish(params) {
    const r = sseHub.publish(params.channel, {
      message: params.message,
      ts: new Date().toISOString(),
    }, { event: params.event });
    this.log.info(`SSE published channel=${params.channel} → ${r.delivered}`);
    return r;                       // { delivered, eventId, channel }
  }

  /** 지금 몇 명이 붙어 있는지 */
  @GetMapping('/stats')
  async stats() {
    return sseHub.stats();
  }
}
