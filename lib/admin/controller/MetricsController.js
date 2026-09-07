/**
 * MetricsController — /api/admin/metrics/*
 *
 *  엔드포인트:
 *   GET  /current               실시간 스냅샷 + 시리즈 + 활성 알림 + 상위 라우트 요약
 *   GET  /stream                같은 내용을 SSE 로 계속 밀어 줌 (폴링 대체)
 *   GET  /history               DB 에 저장된 시계열 이력
 *   GET  /thresholds            임계값 전체
 *   PUT  /thresholds            임계값 일괄 upsert
 *   DELETE /thresholds/:id      임계값 삭제
 *   GET  /alerts                최근 알림 (해결 포함)
 *   GET  /alerts/active         활성 알림만
 *   GET  /routes                컨트롤러/라우트별 통계 (상세 다이얼로그용)
 *   GET  /routes/series         특정 라우트의 초별 시계열
 */
import {
  Controller, GetMapping, PutMapping, DeleteMapping, SseMapping,
  Autowired, Auth, Roles, Log,
} from '../../../src/core/decorators.js';
import { ensurePublisher, normalizeStreamParams, status as streamStatus } from '../service/MetricsStream.js';

@Controller('/api/admin/metrics')
export default class MetricsController {

  @Autowired('MetricsService') metricsService;
  @Log log;

  /* GET /api/admin/metrics/current?windowSec=60 */
  @GetMapping('/current')
  @Auth()
  async current(params) {
    const windowSec = clampInt(params.windowSec, 10, 600, 60);
    const data = await this.metricsService.getCurrent({ windowSec });
    return { data };
  }

  /**
   * GET /api/admin/metrics/stream?windowSec=60&intervalMs=2000&access_token=...
   *
   *  콘솔 [부하 모니터링] 이 2초마다 /current 를 호출하던 폴링을 대체한다.
   *  서버가 채널당 타이머 1개로 스냅샷을 만들어 구독자 전원에게 밀어 준다.
   *
   *  ※ EventSource 는 Authorization 헤더를 보낼 수 없어 ?access_token= 을 허용한다.
   *    (컨트롤러 로더가 SSE 라우트에 한해 처리하며, 접속 로그에는 토큰이 마스킹되어 남는다)
   */
  @SseMapping('/stream')
  @Roles('admin')
  async stream(params, req) {
    const opts = normalizeStreamParams(params);
    const channel = ensurePublisher(this.metricsService, opts);
    this.log.info(`[metrics-stream] 구독 user=${req.user?.username ?? '-'} ${channel}`);

    // 접속 직후 첫 스냅샷을 바로 보내 준다 (첫 tick 까지 기다리지 않도록)
    try {
      const first = await this.metricsService.getCurrent({ windowSec: opts.windowSec, topRoutes: opts.topRoutes });
      req.sse.send({ event: 'metrics', data: first });
    } catch (e) {
      req.sse.send({ event: 'metrics-error', data: { error: e.message } });
    }
    return channel;
  }

  /* GET /api/admin/metrics/stream-status — 현재 돌고 있는 발행 타이머 (진단용) */
  @GetMapping('/stream-status')
  @Auth()
  async streamStatus() {
    return { data: streamStatus() };
  }

  /* GET /api/admin/metrics/history?fromMs=...&toMs=...&kind=os|http|db */
  @GetMapping('/history')
  @Auth()
  async history(params) {
    const now = Date.now();
    const fromTs = new Date(parseInt(params.fromMs, 10) || (now - 3600_000));
    const toTs   = new Date(parseInt(params.toMs,   10) || now);
    const kind   = params.kind && ['os', 'http', 'db'].includes(params.kind) ? params.kind : null;
    const data = await this.metricsService.getHistory({ fromTs, toTs, kind });
    return { data };
  }

  /* GET /api/admin/metrics/thresholds */
  @GetMapping('/thresholds')
  @Auth()
  async listThresholds() {
    const data = await this.metricsService.listThresholds();
    return { data };
  }

  /* PUT /api/admin/metrics/thresholds  body: { rows:[{kind,metric,comparator,threshold,durationSec,enabled,label}] } */
  @PutMapping('/thresholds')
  @Roles('admin')
  async upsertThresholds(params) {
    /* ★ v1.11.9 — rows 가 없으면 400. 예전에는 아무 것도 저장하지 않고 200 { updated: 0 } 을 돌려줘서
       (실행 검증에서 확인) 잘못된 형식으로 부르면 저장된 줄 알고 넘어갔다. */
    if (!Array.isArray(params?.rows)) {
      throw Object.assign(new Error('rows 배열이 필요합니다 — { rows: [{ kind, metric, comparator, threshold, durationSec, enabled, label }] }'), { status: 400 });
    }
    const data = await this.metricsService.upsertThresholds(params.rows);
    return { data };
  }

  /* DELETE /api/admin/metrics/thresholds/:id */
  @DeleteMapping('/thresholds/:id')
  @Roles('admin')
  async deleteThreshold(params) {
    const data = await this.metricsService.deleteThreshold(params.id);
    return { data };
  }

  /* GET /api/admin/metrics/alerts?limit=50 */
  @GetMapping('/alerts')
  @Auth()
  async recentAlerts(params) {
    const data = await this.metricsService.listRecentAlerts(params.limit);
    return { data };
  }

  /* GET /api/admin/metrics/alerts/active */
  @GetMapping('/alerts/active')
  @Auth()
  async activeAlerts() {
    const data = await this.metricsService.listActiveAlerts();
    return { data };
  }

  /* GET /api/admin/metrics/routes?windowSec=60&limit=100&sortBy=count&includeSeries=1
   *  컨트롤러/라우트별 통계. 상세 다이얼로그에서 전체 목록 + 미니 차트용.
   */
  @GetMapping('/routes')
  @Auth()
  async routes(params) {
    const windowSec = clampInt(params.windowSec, 10, 600, 60);
    const limit     = clampInt(params.limit, 1, 500, 100);
    const sortBy    = ['count', 'avgMs', 'maxMs', 'errCount'].includes(params.sortBy)
      ? params.sortBy : 'count';
    const includeSeries = params.includeSeries !== '0' && params.includeSeries !== 'false';
    try {
      const data = await this.metricsService.getRouteStats({ windowSec, limit, sortBy, includeSeries });
      return { data };
    } catch (e) {
      this.log.error(`[metrics.routes] 실패 params=${JSON.stringify({windowSec,limit,sortBy,includeSeries})}: ${e.message}\n${e.stack}`);
      throw Object.assign(new Error(`getRouteStats failed: ${e.message}`), { status: 500 });
    }
  }

  /* GET /api/admin/metrics/routes/series?key=Controller.handler&windowSec=60
   *  특정 라우트의 초별 시계열 (1개 라우트 확대)
   */
  @GetMapping('/routes/series')
  @Auth()
  async routeSeries(params) {
    const key = String(params.key || '').trim();
    if (!key) return { data: null };
    const windowSec = clampInt(params.windowSec, 10, 600, 60);
    try {
      const data = await this.metricsService.getRouteSeriesOne({ key, windowSec });
      return { data };
    } catch (e) {
      this.log.error(`[metrics.routeSeries] 실패 key=${key}: ${e.message}\n${e.stack}`);
      throw Object.assign(new Error(`getRouteSeriesOne failed: ${e.message}`), { status: 500 });
    }
  }
}

function clampInt(v, min, max, dft) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dft;
  return Math.max(min, Math.min(max, n));
}
