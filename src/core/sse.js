/**
 * src/core/sse.js — Server-Sent Events (SSE) 허브
 *
 *  왜 직접 구현했나 (외부 라이브러리 대신)
 *   - SSE 의 와이어 포맷은 `event:`/`data:`/`id:`/`retry:` 4줄이 전부라 구현량이 작다.
 *   - 정작 어려운 부분은 이 프레임워크와의 결합(@Auth 가드, 라우트 메트릭, 로거, 종료 처리,
 *     compression 우회)이라, 라이브러리를 써도 어차피 그 접착 코드는 직접 짜야 한다.
 *   - 의존성 추가 없이 Node 내장 http 응답만 사용한다 (better-sse / express-sse / sse-channel 미사용).
 *
 *  기능
 *   - 채널(주제)별 구독. 한 클라이언트는 하나의 채널을 본다.
 *   - 하트비트: 기본 25초마다 `:ping` 주석 줄 전송 → 프록시/방화벽의 유휴 연결 끊김 방지.
 *   - 재접속 복구: 채널마다 최근 N개를 보관하고, 브라우저가 보내는 `Last-Event-ID` 이후 것만 재전송.
 *   - 백프레셔 보호: 소켓 버퍼가 임계치를 넘으면(느린 클라이언트) 연결을 끊어 서버 메모리를 지킨다.
 *   - 상한: 전체/채널당 동시 접속 수 제한.
 *
 *  주의 (설계 메모)
 *   - 이 허브는 **프로세스 메모리** 기반이다. 서버를 여러 개(클러스터/다중 인스턴스) 띄우면
 *     인스턴스끼리 이벤트가 공유되지 않는다 → Redis pub/sub 같은 브로커가 필요하다.
 *     현재 aidot-express 는 supervisor 가 메인 서버 1개를 띄우는 단일 프로세스 구조라 그대로 동작한다.
 */
import logger from '../util/logger.js';

export const SSE_CONTENT_TYPE = 'text/event-stream';

const DEFAULTS = {
  heartbeatMs: 25_000,      // 하트비트 주기 (프록시 기본 유휴 타임아웃 60초보다 짧게)
  retryMs: 3_000,           // 브라우저 재접속 대기 시간 힌트
  historySize: 50,          // 채널별 재전송 버퍼 크기
  maxClients: 500,          // 서버 전체 동시 접속 상한
  maxClientsPerChannel: 200,
  maxBufferedBytes: 1_048_576, // 클라이언트당 소켓 버퍼 상한 (1MB) — 넘으면 끊음
};

let seqCounter = 0;
const nextSeq = () => ++seqCounter;

/** SSE 한 줄 규격에 맞게 문자열을 만든다 (data 는 줄바꿈마다 `data:` 를 반복해야 함) */
function formatEvent({ id, event, data, retry }) {
  let out = '';
  if (retry != null) out += `retry: ${retry}\n`;
  if (id != null) out += `id: ${id}\n`;
  if (event) out += `event: ${event}\n`;
  const text = typeof data === 'string' ? data : JSON.stringify(data ?? null);
  for (const line of String(text).split(/\r\n|\r|\n/)) out += `data: ${line}\n`;
  return out + '\n';
}

class SseClient {
  constructor(hub, req, res, opts = {}) {
    this.hub = hub;
    this.req = req;
    this.res = res;
    this.id = `sse_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    this.channel = null;
    this.connectedAt = new Date();
    this.sent = 0;
    this.closed = false;
    this.ip = req.ip || req.socket?.remoteAddress || null;
    this.user = req.user ? (req.user.username || req.user.sub) : null;
    this.retryMs = opts.retryMs ?? hub.opts.retryMs;
  }

  /** 원시 문자열 전송 — 실패/과부하 시 연결을 정리하고 false 반환 */
  writeRaw(chunk) {
    if (this.closed) return false;
    try {
      const ok = this.res.write(chunk);
      // 느린 클라이언트: 커널/스트림 버퍼가 계속 쌓이면 서버 메모리를 갉아먹으므로 끊는다.
      if (!ok && this.res.writableLength > this.hub.opts.maxBufferedBytes) {
        logger.warn(`[sse] slow client disconnected id=${this.id} buffered=${this.res.writableLength}`);
        this.close('slow-consumer');
        return false;
      }
      return true;
    } catch (e) {
      this.close(`write-error: ${e.message}`);
      return false;
    }
  }

  send({ event, data, id }) {
    const ok = this.writeRaw(formatEvent({ id, event, data }));
    if (ok) this.sent += 1;
    return ok;
  }

  /** 주석 줄 — 브라우저는 무시하지만 연결 유지에는 효과가 있다 */
  comment(text = 'ping') {
    return this.writeRaw(`: ${text}\n\n`);
  }

  close(reason = 'server-close') {
    if (this.closed) return;
    this.closed = true;
    this.hub._remove(this, reason);
    try { this.res.end(); } catch { /* 이미 끊긴 소켓 */ }
  }
}

class SseHub {
  constructor(opts = {}) {
    this.opts = { ...DEFAULTS, ...opts };
    this.clients = new Set();
    this.channels = new Map();   // name -> { clients:Set, history:[] }
    this.totalPublished = 0;
    this.heartbeatTimer = null;
  }

  _channel(name) {
    let ch = this.channels.get(name);
    if (!ch) { ch = { clients: new Set(), history: [] }; this.channels.set(name, ch); }
    return ch;
  }

  _remove(client, reason) {
    this.clients.delete(client);
    if (client.channel) {
      const ch = this.channels.get(client.channel);
      if (ch) {
        ch.clients.delete(client);
        if (ch.clients.size === 0 && ch.history.length === 0) this.channels.delete(client.channel);
      }
    }
    logger.debug(`[sse] connection stop id=${client.id} channel=${client.channel} reason=${reason} sent=${client.sent}`);
    if (this.clients.size === 0) this._stopHeartbeat();
  }

  _startHeartbeat() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      const ts = new Date().toISOString();
      for (const c of this.clients) c.comment(`ping ${ts}`);
    }, this.opts.heartbeatMs);
    this.heartbeatTimer.unref?.();
  }

  _stopHeartbeat() {
    if (!this.heartbeatTimer) return;
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  /**
   * 응답을 SSE 스트림으로 전환한다. (헤더 전송 + 소켓 튜닝)
   * 반환: SseClient — 이후 subscribe() 로 채널에 붙인다.
   */
  attach(req, res, opts = {}) {
    if (this.clients.size >= this.opts.maxClients) {
      res.status(503).json({ code: 503, message: 'SSE 동시 접속 한도를 초과했습니다', data: null });
      return null;
    }

    const client = new SseClient(this, req, res, opts);

    res.status(200);
    res.set({
      'Content-Type': `${SSE_CONTENT_TYPE}; charset=utf-8`,
      'Cache-Control': 'no-cache, no-transform',   // no-transform: 중간 프록시의 변형/버퍼링 억제
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',                   // nginx 버퍼링 해제 (없으면 이벤트가 몰아서 도착)
    });
    // Node 기본 소켓 타임아웃/지연 전송(Nagle) 해제 — 스트림이 중간에 끊기거나 늦게 도착하는 것 방지
    try {
      req.socket?.setTimeout?.(0);
      req.socket?.setNoDelay?.(true);
      req.socket?.setKeepAlive?.(true);
      res.setTimeout?.(0);
    } catch { /* 일부 환경(테스트 더블)에서는 없을 수 있음 */ }
    res.flushHeaders?.();

    // 첫 줄: 재접속 대기 힌트 + 주석 (프록시가 첫 바이트를 기다리지 않도록 즉시 내보냄)
    client.writeRaw(`retry: ${client.retryMs}\n: connected ${client.id}\n\n`);

    const onClose = () => client.close('client-disconnect');
    res.on('close', onClose);
    res.on('error', onClose);

    this.clients.add(client);
    this._startHeartbeat();
    return client;
  }

  /**
   * 채널 구독. Last-Event-ID 가 있으면 그 이후 이벤트를 재전송한다.
   */
  subscribe(client, channelName = 'default', opts = {}) {
    if (!client || client.closed) return null;
    const name = String(channelName || 'default').slice(0, 64);
    const ch = this._channel(name);

    if (ch.clients.size >= this.opts.maxClientsPerChannel) {
      client.send({ event: 'error', data: { message: '채널 동시 접속 한도 초과' } });
      client.close('channel-full');
      return null;
    }

    client.channel = name;
    ch.clients.add(client);
    logger.info(`[sse] subscribed id=${client.id} channel=${name} ip=${client.ip} user=${client.user ?? '-'} (total ${this.clients.size})`);

    // 재접속 복구: 브라우저는 끊기면 Last-Event-ID 헤더를 자동으로 보낸다.
    const lastId = opts.lastEventId ?? client.req.headers['last-event-id'];
    const from = Number(lastId);
    if (Number.isFinite(from) && from > 0) {
      const missed = ch.history.filter((e) => e.id > from);
      for (const e of missed) client.send(e);
      if (missed.length) logger.info(`[sse] resent ${missed.length} (id>${from}) → ${client.id}`);
    }

    // 연결 확인용 이벤트 (클라이언트가 "붙었다"를 UI 에 표시할 수 있게)
    client.send({ event: 'connected', data: { clientId: client.id, channel: name, ts: new Date().toISOString() } });
    return client;
  }

  /** 채널에 이벤트 발행. 반환: 전송된 클라이언트 수 */
  publish(channelName, data, opts = {}) {
    const name = String(channelName || 'default').slice(0, 64);
    const ch = this._channel(name);
    const evt = { id: nextSeq(), event: opts.event || 'message', data };

    ch.history.push(evt);
    if (ch.history.length > this.opts.historySize) ch.history.shift();

    let n = 0;
    for (const c of ch.clients) if (c.send(evt)) n += 1;
    this.totalPublished += 1;
    /* ★ v1.10.26 — 발행은 프레임워크 배관이다. 실시간 화면이 붙어 있으면
       초당 쌓여 개발자 로그를 덮는다. 구독/연결 종료는 **사람이 접속·이탈한
       사건**이라 그대로 남긴다 — 그건 배관이 아니라 실제로 일어난 일이다. */
    logger.debug(`[sse] published channel=${name} event=${evt.event} id=${evt.id} → ${n}`,
      { kind: 'internal' });
    return { delivered: n, eventId: evt.id, channel: name };
  }

  /** 모든 채널에 발행 (관리 알림 등) */
  broadcast(data, opts = {}) {
    let n = 0;
    for (const name of this.channels.keys()) n += this.publish(name, data, opts).delivered;
    return { delivered: n };
  }

  /** 특정 채널의 현재 구독자 수 (주기 발행 타이머를 끄고 켤 때 사용) */
  clientCount(channelName) {
    return this.channels.get(String(channelName))?.clients.size ?? 0;
  }

  stats() {
    return {
      clients: this.clients.size,
      totalPublished: this.totalPublished,
      heartbeatMs: this.opts.heartbeatMs,
      channels: [...this.channels.entries()].map(([name, ch]) => ({
        name,
        clients: ch.clients.size,
        buffered: ch.history.length,
        lastEventId: ch.history.at(-1)?.id ?? null,
      })),
    };
  }

  /** 서버 종료 시: 열린 스트림을 먼저 정리해야 server.close() 가 끝난다 */
  closeAll(reason = 'server-shutdown') {
    const n = this.clients.size;
    for (const c of [...this.clients]) {
      try { c.send({ event: 'server-shutdown', data: { reason } }); } catch { /* noop */ }
      c.close(reason);
    }
    this._stopHeartbeat();
    if (n) logger.info(`[sse] closed ${n} streams on shutdown`);
    return n;
  }
}

const sseHub = new SseHub();
export { SseHub, formatEvent };
export default sseHub;
