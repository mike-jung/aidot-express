/**
 * lib/admin/service/MetricsStream.js
 *
 * 관리자 콘솔 [부하 모니터링] 화면을 위한 지표 푸시.
 *
 *  이전: 화면이 2초마다 GET /api/admin/metrics/current 를 호출(폴링).
 *        접속자 N명이면 2초마다 N번 스냅샷을 계산하고, N번의 요청이 access/metric 집계에도 섞였다.
 *  현재: 서버가 채널마다 타이머 1개를 돌려 스냅샷을 1번만 만들고 구독자 전원에게 밀어 준다(SSE).
 *
 *  채널 이름: admin:metrics:<windowSec>:<intervalMs>
 *    - 창(windowSec)이나 주기(intervalMs)가 다른 화면은 서로 다른 채널을 쓴다.
 *    - 구독자가 0명이 되면 타이머를 자동으로 정리한다 (다음 tick 에서 감지).
 */
import sseHub from '../../../src/core/sse.js';
import logger from '../../../src/util/logger.js';

const timers = new Map();   // channel -> { timer, windowSec, intervalMs }

export const MIN_INTERVAL_MS = 1_000;
export const MAX_INTERVAL_MS = 30_000;

/** 화면이 보낸 값을 안전한 범위로 자른다 */
export function normalizeStreamParams(params = {}) {
  const windowSec = Math.min(600, Math.max(10, parseInt(params.windowSec, 10) || 60));
  const intervalMs = Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, parseInt(params.intervalMs, 10) || 2_000));
  const topRoutes = Math.min(20, Math.max(1, parseInt(params.topRoutes, 10) || 5));
  return { windowSec, intervalMs, topRoutes };
}

export function channelNameOf({ windowSec, intervalMs }) {
  return `admin:metrics:${windowSec}:${intervalMs}`;
}

/**
 * 채널용 발행 타이머를 확보한다 (이미 있으면 그대로 사용).
 *   metricsService 는 컨트롤러가 주입받은 인스턴스를 그대로 넘겨준다.
 */
export function ensurePublisher(metricsService, { windowSec, intervalMs, topRoutes }) {
  const channel = channelNameOf({ windowSec, intervalMs });
  if (timers.has(channel)) return channel;

  const tick = async () => {
    // 구독자가 모두 나갔으면 타이머 정리 (다음 접속 때 다시 만들어진다)
    if (sseHub.clientCount(channel) === 0) {
      stopPublisher(channel);
      return;
    }
    try {
      const data = await metricsService.getCurrent({ windowSec, topRoutes });
      sseHub.publish(channel, data, { event: 'metrics' });
    } catch (e) {
      logger.warn(`[metrics-stream] 스냅샷 실패(${channel}): ${e.message}`);
      sseHub.publish(channel, { error: e.message }, { event: 'metrics-error' });
    }
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  timers.set(channel, { timer, windowSec, intervalMs });
  logger.info(`[metrics-stream] 발행 시작 channel=${channel} (${intervalMs}ms 주기)`);
  return channel;
}

export function stopPublisher(channel) {
  const entry = timers.get(channel);
  if (!entry) return false;
  clearInterval(entry.timer);
  timers.delete(channel);
  logger.info(`[metrics-stream] 발행 중지 channel=${channel} (구독자 0명)`);
  return true;
}

/** 서버 종료 시 정리 */
export function stopAll() {
  for (const channel of [...timers.keys()]) stopPublisher(channel);
}

export function status() {
  return [...timers.entries()].map(([channel, v]) => ({
    channel,
    windowSec: v.windowSec,
    intervalMs: v.intervalMs,
    clients: sseHub.clientCount(channel),
  }));
}

export default { ensurePublisher, stopPublisher, stopAll, status, normalizeStreamParams, channelNameOf };
