/**
 * loopLag — 이벤트 루프가 얼마나 밀리는지 잰다 (perf_hooks.monitorEventLoopDelay).
 *
 *  왜
 *    "서버 전체가 멈췄다" 의 첫 번째 용의자는 이벤트 루프다. 그런데 멈춘 뒤에는 잴 수 없다.
 *    평소에 재 두어야 **멈추기 직전** 에 무엇이 밀리고 있었는지 /health/ready 와 모니터링에 남는다.
 *
 *  비용: 히스토그램 하나, 20ms 주기 타이머(unref). 무시할 만하다.
 */
import { monitorEventLoopDelay } from 'node:perf_hooks';

let h = null;
let startedAt = 0;

export function startLoopLagMonitor(resolutionMs = 20) {
  if (h) return;
  h = monitorEventLoopDelay({ resolution: resolutionMs });
  h.enable();
  startedAt = Date.now();
}

/** 밀리초 단위 요약. 모니터가 없으면 null */
export function loopLagStats() {
  if (!h) return null;
  const ms = (ns) => Math.round(ns / 1e4) / 100;   // ns → ms, 소수 둘째 자리
  const out = {
    meanMs: ms(h.mean), p50Ms: ms(h.percentile(50)), p99Ms: ms(h.percentile(99)), maxMs: ms(h.max),
    sinceSec: Math.round((Date.now() - startedAt) / 1000),
  };
  return out;
}

/** 통계를 비운다 (모니터링 샘플 주기마다 부르면 "그 구간의" 값이 된다) */
export function resetLoopLag() { if (h) { h.reset(); startedAt = Date.now(); } }

export default { startLoopLagMonitor, loopLagStats, resetLoopLag };
