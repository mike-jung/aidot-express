/**
 * MetricsService — 모니터링 샘플의 DB 저장 / 임계값 평가 / 알림 관리.
 *
 *  주기적 동작:
 *   - FLUSH_INTERVAL_MS(10s) 마다 metrics.getSnapshot(10) 을 admin_metric_samples 에 저장
 *   - EVAL_INTERVAL_MS(1s)  마다 getSnapshot(1) 으로 임계값 연속 초과 감시
 *     → duration_sec 이상 연속 초과 시 admin_metric_alerts 에 active 로 저장
 *     → 조건이 해제되면 resolved 처리
 *
 *  외부 API:
 *   - start()                  : 주기 작업 시작 (server.js 부팅 후 1회)
 *   - stop()                   : graceful shutdown
 *   - getCurrent(windowSec)    : 최근 스냅샷 + 시리즈 + 활성 알림
 *   - getHistory(fromTs,toTs)  : DB 에서 시계열 이력 조회
 *   - listThresholds()         : 임계값 전체 조회
 *   - upsertThresholds(rows)   : 임계값 일괄 저장
 *   - listActiveAlerts()       : 활성 알림
 *   - listRecentAlerts(lim)    : 최근 알림 (해결 포함)
 */
import { Service, Sql, Log } from '../../../src/core/decorators.js';
import { isActive } from '../../../src/core/ha/index.js';   // ★ v1.14.0 액티브 전용 작업 가드
import db from '../../../src/database/db.js';
import metrics from '../../../src/core/metrics.js';

const FLUSH_INTERVAL_MS = 10_000; // 10초마다 DB 저장
const EVAL_INTERVAL_MS = 1_000;   // 1초마다 임계값 평가
const DEFAULT_RETENTION_DAYS = 30;  // config.metrics.retentionDays 의 fallback
const RETENTION_SWEEP_MS = 60 * 60 * 1000; // 1시간마다 오래된 샘플 삭제

@Service('MetricsService')
export default class MetricsService {

  @Sql('admin_metrics') metricsSql;
  @Log log;

  constructor() {
    this._flushTimer = null;
    this._evalTimer = null;
    this._retentionTimer = null;

    // 임계값 캐시 (evaluate 성능 위해)
    this._thresholdsCache = [];
    this._thresholdsLoadedAt = 0;

    // { `${kind}:${metric}` -> { overSinceMs, peak, alertId | null } }
    this._breachState = new Map();

    // 모니터링 테이블이 아직 DB 에 없을 때 true. 복구 시도는 _retryRecoverFromMissing 에서 60초 간격으로.
    this._tablesMissing = false;
    this._lastRecoverTryAt = 0;
  }

  /* ============================================================
   *  수명 주기
   * ============================================================ */

  async start() {
    // 부팅 직후 DB 에서 threshold 로드.
    // - 테이블이 없으면(ER_NO_SUCH_TABLE) 경고 1회 출력 후 타이머는 그대로 돌림.
    //   이후 _evaluate/_flushToDb 는 tablesMissing 플래그로 자동 skip 된다.
    // - 마이그레이션이 뒤늦게 실행되면 다음 reload 시점에 자동 복구.
    this._tablesMissing = false;
    try {
      await this._reloadThresholds();
    } catch (e) {
      if (isMissingTableError(e)) {
        this._tablesMissing = true;
        this.log.warn(
          '[metrics] 모니터링 테이블이 아직 없습니다 — 마이그레이션(005_init_metrics.sql) 적용 전이면 정상입니다. ' +
          '다음 재시작 또는 자동 마이그레이션 후 활성화됩니다.',
        );
      } else {
        this.log.warn(`[metrics] could not load thresholds (ignored): ${e.message}`);
      }
    }

    if (!this._flushTimer) {
      this._flushTimer = setInterval(() => {
        /* ★ v1.14.3 — 대기(standby) 서버에서는 **로컬 DB 에 쓰지 않는다.**
           replica 에 로컬 쓰기가 생기면 그 서버 자신의 GTID 가 만들어져
           gtid_strict_mode 에서 복제가 통째로 멈춘다(실제 2대 검증에서 확인).
           대기 중 기록은 잃지만, 복제가 끊기는 것보다 낫다 — 액티브가 되면 다시 쌓인다. */
        if (!isActive()) return;
        this._flushToDb().catch((e) => this.log.warn(`[metrics] flush failed: ${e.message}`));
      }, FLUSH_INTERVAL_MS);
      this._flushTimer.unref?.();
    }
    if (!this._evalTimer) {
      this._evalTimer = setInterval(() => {
        /* ★ v1.14.0 — 액티브에서만. 두 대가 동시에 돌면 경보 평가가 두 번 일어난다
           (삭제 중복 · 경보 중복 발송). HA 가 꺼져 있으면 isActive() 는 항상 true 다. */
        if (!isActive()) return;
        this._evaluate().catch((e) => this.log.warn(`[metrics] evaluate failed: ${e.message}`));
      }, EVAL_INTERVAL_MS);
      this._evalTimer.unref?.();
    }
    if (!this._retentionTimer) {
      this._retentionTimer = setInterval(() => {
        /* ★ v1.14.0 — 액티브에서만. 두 대가 동시에 돌면 보관 정리가 두 번 일어난다
           (삭제 중복 · 경보 중복 발송). HA 가 꺼져 있으면 isActive() 는 항상 true 다. */
        if (!isActive()) return;
        this._sweepOldSamples().catch((e) => this.log.warn(`[metrics] sweep failed: ${e.message}`));
      }, RETENTION_SWEEP_MS);
      this._retentionTimer.unref?.();
    }
    this.log.info(
      `[metrics] 모니터링 서비스 시작 (flush=${FLUSH_INTERVAL_MS}ms, eval=${EVAL_INTERVAL_MS}ms)`,
    );
  }

  stop() {
    if (this._flushTimer) { clearInterval(this._flushTimer); this._flushTimer = null; }
    if (this._evalTimer)  { clearInterval(this._evalTimer);  this._evalTimer = null; }
    if (this._retentionTimer) { clearInterval(this._retentionTimer); this._retentionTimer = null; }
  }

  /* ============================================================
   *  1) DB 플러시
   * ============================================================ */

  async _flushToDb() {
    const samples = metrics.getFlatSamples(Math.floor(FLUSH_INTERVAL_MS / 1000));
    // 테이블이 아직 생성되지 않은 상태면 조용히 skip (마이그레이션 재실행 시 자동 복구 시도)
    if (this._tablesMissing) {
      await this._retryRecoverFromMissing();
      if (this._tablesMissing) return;
    }

    const insertSql = this.metricsSql.get('insertSample');
    // 소량 (~10 row) 이므로 직렬 실행
    for (const s of samples) {
      try {
        await db.execute(insertSql, {
          ts: s.ts,
          kind: s.kind,
          metric: s.metric,
          value: Number.isFinite(s.value) ? s.value : 0,
        });
      } catch (e) {
        if (isMissingTableError(e)) {
          // 플러시 도중 테이블이 사라진 케이스 — 전체 flush 중단하고 missing 플래그 set
          this._tablesMissing = true;
          return;
        }
        // 개별 실패는 로그만 (다른 메트릭은 계속)
        this.log.debug(`[metrics] insertSample failed (${s.kind}.${s.metric}): ${e.message}`);
      }
    }
  }

  async _sweepOldSamples() {
    if (this._tablesMissing) return;

    // 1) 보관 기간 초과분 삭제 — config.metrics.retentionDays (기본 30일)
    const days = Math.max(1, parseInt(config.metrics?.retentionDays, 10) || DEFAULT_RETENTION_DAYS);
    const beforeTs = new Date(Date.now() - days * 24 * 3600 * 1000);
    try {
      await db.execute(this.metricsSql.get('deleteOldSamples'), { before_ts: beforeTs });
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return; }
      this.log.debug(`[metrics] deleteOldSamples failed: ${e.message}`);
    }

    // 2) 레코드 수 한도 초과 시 오래된 순 삭제 — config.metrics.maxRecords (0 = 무제한)
    const maxRecords = parseInt(config.metrics?.maxRecords, 10);
    if (Number.isFinite(maxRecords) && maxRecords > 0) {
      try {
        const r = await db.execute(this.metricsSql.get('countSamples'), {});
        const total = Number(r.rows?.[0]?.c ?? 0);
        if (total > maxRecords) {
          const excess = total - maxRecords;
          await db.execute(this.metricsSql.get('deleteOldestSamples'), { lim: excess });
          this.log.info(`[metrics] maxRecords(${maxRecords}) exceeded → deleting the oldest ${excess} (was total=${total})`);
        }
      } catch (e) {
        if (isMissingTableError(e)) { this._tablesMissing = true; return; }
        this.log.debug(`[metrics] maxRecords cleanup failed: ${e.message}`);
      }
    }
  }

  /* ============================================================
   *  2) 임계값 평가 / 알림
   * ============================================================ */

  async _reloadThresholds() {
    try {
      const r = await db.execute(this.metricsSql.get('findEnabledThresholds'), {});
      this._thresholdsCache = (r.rows || []).map(normalizeThresholdRow);
      this._thresholdsLoadedAt = Date.now();
      if (this._tablesMissing) {
        // 복구 성공
        this._tablesMissing = false;
        this.log.info('[metrics] monitoring tables reachable again — storage and alerts on');
      }
    } catch (e) {
      if (isMissingTableError(e)) {
        this._tablesMissing = true;
        this._thresholdsCache = [];
      } else {
        throw e;
      }
    }
  }

  /** tablesMissing 상태일 때만 호출 — 복구를 한 번 시도 (과도 호출 방지) */
  async _retryRecoverFromMissing() {
    const now = Date.now();
    if (this._lastRecoverTryAt && now - this._lastRecoverTryAt < 60_000) return;
    this._lastRecoverTryAt = now;
    try { await this._reloadThresholds(); } catch { /* 실패해도 다음 주기 재시도 */ }
  }

  async _evaluate() {
    // 테이블 부재 상태에서는 평가 skip (로그 노이즈 방지)
    if (this._tablesMissing) {
      await this._retryRecoverFromMissing();
      if (this._tablesMissing) return;
    }
    // 30초마다 캐시 갱신
    if (Date.now() - this._thresholdsLoadedAt > 30_000) {
      try { await this._reloadThresholds(); } catch { /* noop */ }
    }
    if (this._thresholdsCache.length === 0) return;

    const snap = metrics.getSnapshot(1); // 직전 1초
    const now = Date.now();

    for (const t of this._thresholdsCache) {
      const v = pickMetric(snap, t.kind, t.metric);
      if (v === null || !Number.isFinite(v)) continue;

      const key = `${t.kind}:${t.metric}`;
      const isOver = compare(v, t.comparator, t.threshold);
      const state = this._breachState.get(key);

      if (isOver) {
        if (!state) {
          // 초과 시작 — duration 만족 전이므로 아직 알림 아님
          this._breachState.set(key, { overSinceMs: now, peak: v, alertId: null });
        } else {
          // peak 갱신
          if (v > state.peak) state.peak = v;
          // duration 이상 연속 초과 → alert 생성 (아직 없으면)
          const held = (now - state.overSinceMs) / 1000;
          if (!state.alertId && held >= t.durationSec) {
            try {
              const id = await this._openAlert(t, state.peak, t.durationSec);
              state.alertId = id;
            } catch (e) {
              this.log.warn(`[metrics] could not create the alert: ${e.message}`);
            }
          } else if (state.alertId) {
            // 이미 활성 중 → peak 갱신만 DB 반영 (가끔)
            // 성능을 위해 매초 쓰지 않고 5초에 한 번만
            if (!state._lastPeakUpdate || now - state._lastPeakUpdate > 5000) {
              state._lastPeakUpdate = now;
              try {
                await db.execute(this.metricsSql.get('updateAlertPeak'), {
                  id: state.alertId, peak_value: state.peak,
                });
              } catch { /* noop */ }
            }
          }
        }
      } else {
        // 현재는 정상치. 활성 알림이 있었으면 resolve
        if (state?.alertId) {
          try {
            await db.execute(this.metricsSql.get('resolveAlert'), {
              id: state.alertId, resolved_at: new Date(),
            });
          } catch (e) {
            this.log.debug(`[metrics] resolve failed: ${e.message}`);
          }
        }
        if (state) this._breachState.delete(key);
      }
    }
  }

  async _openAlert(t, peak, durationSec) {
    const res = await db.execute(this.metricsSql.get('insertAlert'), {
      triggered_at: new Date(),
      kind: t.kind,
      metric: t.metric,
      comparator: t.comparator,
      threshold: t.threshold,
      peak_value: peak,
      duration_sec: durationSec,
      label: t.label || `${t.kind}.${t.metric} ${t.comparator} ${t.threshold}`,
    });
    return res.insertId || null;
  }

  /* ============================================================
   *  3) 컨트롤러용 조회 API
   * ============================================================ */

  /** 실시간 화면용: 최신 스냅샷 + 최근 windowSec 초 시리즈 + 활성 알림 + 라우트 상위 요약 */
  async getCurrent({ windowSec = 60, includeAlerts = true, topRoutes = 5 } = {}) {
    // 각 단계를 개별 try 로 감싸 어떤 단계가 터지는지 명확히 로그로 남김
    let snapshot = null;
    let series = [];
    let routesTop = [];
    try {
      snapshot = metrics.getSnapshot(5);
    } catch (e) {
      this.log.error(`[metrics.getCurrent] getSnapshot failed: ${e.message}\n${e.stack}`);
      throw Object.assign(new Error(`getSnapshot failed: ${e.message}`), { status: 500 });
    }
    try {
      series = metrics.getSeries(Number(windowSec) || 60);
    } catch (e) {
      this.log.error(`[metrics.getCurrent] getSeries failed: ${e.message}\n${e.stack}`);
      throw Object.assign(new Error(`getSeries failed: ${e.message}`), { status: 500 });
    }
    try {
      routesTop = metrics.getRouteSummary({
        windowSec: Number(windowSec) || 60,
        topN: Number(topRoutes) || 5,
        sortBy: 'count',
      });
    } catch (e) {
      this.log.error(`[metrics.getCurrent] getRouteSummary failed: ${e.message}\n${e.stack}`);
      // routesTop 실패는 치명적이지 않음 — 빈 배열로 진행
      routesTop = [];
    }

    const out = {
      snapshot,
      series,
      routesTop,
      activeAlerts: [],
      tablesMissing: !!this._tablesMissing,
    };
    if (includeAlerts && !this._tablesMissing) {
      try {
        const r = await db.execute(this.metricsSql.get('findActiveAlerts'), {});
        out.activeAlerts = r.rows || [];
      } catch (e) {
        if (isMissingTableError(e)) {
          this._tablesMissing = true;
          out.tablesMissing = true;
        } else {
          // 다른 DB 에러도 삼키지 말고 로그만 남기고 계속 (차트는 보여줘야 함)
          this.log.warn(`[metrics.getCurrent] findActiveAlerts failed (continuing): ${e.message}`);
        }
      }
    }
    return out;
  }

  /**
   * 라우트별 통계 (상세 다이얼로그용).
   *  - list : 전체 라우트를 count 내림차순으로 반환 (기본 100 개까지)
   *  - 각 라우트에 대해 초별 count 시계열도 함께 첨부 (mini sparkline 용)
   */
  async getRouteStats({ windowSec = 60, limit = 100, sortBy = 'count', includeSeries = true } = {}) {
    const summary = metrics.getRouteSummary({ windowSec, topN: limit, sortBy });
    if (!includeSeries) return { rows: summary, windowSec };
    const rows = summary.map((r) => {
      const s = metrics.getRouteSeries(r.key, windowSec);
      return { ...r, series: s.series.map((b) => ({ tsSec: b.tsSec, count: b.count, avgMs: b.avgMs })) };
    });
    return { rows, windowSec };
  }

  /** 특정 라우트의 시계열 (상세 차트용) */
  async getRouteSeriesOne({ key, windowSec = 60 } = {}) {
    return metrics.getRouteSeries(key, windowSec);
  }

  /** DB 이력 조회 (fromTs, toTs 는 Date 또는 ms) */
  async getHistory({ fromTs, toTs, kind } = {}) {
    if (this._tablesMissing) return [];
    const from_ts = fromTs instanceof Date ? fromTs : new Date(Number(fromTs));
    const to_ts   = toTs   instanceof Date ? toTs   : new Date(Number(toTs));
    const sqlName = kind ? 'findSamplesByKindRange' : 'findSamplesByRange';
    const params = kind ? { from_ts, to_ts, kind } : { from_ts, to_ts };
    try {
      const r = await db.execute(this.metricsSql.get(sqlName), params);
      return r.rows || [];
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return []; }
      throw e;
    }
  }

  async listThresholds() {
    if (this._tablesMissing) return [];
    try {
      const r = await db.execute(this.metricsSql.get('findAllThresholds'), {});
      return r.rows || [];
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return []; }
      throw e;
    }
  }

  async upsertThresholds(rows) {
    let updated = 0;
    for (const t of (rows || [])) {
      if (!t?.kind || !t?.metric) continue;
      await db.execute(this.metricsSql.get('upsertThreshold'), {
        kind: String(t.kind),
        metric: String(t.metric),
        comparator: ['>', '<', '>=', '<='].includes(t.comparator) ? t.comparator : '>',
        threshold: Number(t.threshold) || 0,
        duration_sec: Math.max(1, parseInt(t.durationSec ?? t.duration_sec ?? 30, 10)),
        enabled: (t.enabled ? 1 : 0),
        label: t.label || null,
      });
      updated++;
    }
    // 캐시 즉시 갱신
    try { await this._reloadThresholds(); } catch { /* noop */ }
    return { updated };
  }

  async deleteThreshold(id) {
    await db.execute(this.metricsSql.get('deleteThreshold'), { id: Number(id) });
    try { await this._reloadThresholds(); } catch { /* noop */ }
    return { deleted: 1 };
  }

  async listActiveAlerts() {
    if (this._tablesMissing) return [];
    try {
      const r = await db.execute(this.metricsSql.get('findActiveAlerts'), {});
      return r.rows || [];
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return []; }
      throw e;
    }
  }

  async listRecentAlerts(limit = 50) {
    if (this._tablesMissing) return [];
    const lim = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
    try {
      const r = await db.execute(this.metricsSql.get('findRecentAlerts'), { lim });
      return r.rows || [];
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return []; }
      throw e;
    }
  }
}

/* ── helpers ── */

/**
 * MariaDB / MySQL 에서 "Table doesn't exist" 에러인지 판정.
 *  - mariadb 드라이버: err.errno === 1146, err.code === 'ER_NO_SUCH_TABLE',
 *    err.sqlState === '42S02'
 *  - 다른 드라이버/환경에서도 안전하게 동작하도록 메시지 휴리스틱 추가.
 */
function isMissingTableError(e) {
  if (!e) return false;
  if (e.errno === 1146) return true;
  if (e.code === 'ER_NO_SUCH_TABLE') return true;
  if (e.sqlState === '42S02') return true;
  const msg = String(e.message || '');
  return /doesn'?t exist/i.test(msg) && /table/i.test(msg);
}

function normalizeThresholdRow(r) {
  return {
    id: r.id,
    kind: r.kind,
    metric: r.metric,
    comparator: r.comparator,
    threshold: Number(r.threshold),
    durationSec: Number(r.duration_sec),
    enabled: Number(r.enabled) === 1,
    label: r.label,
  };
}

function compare(value, cmp, threshold) {
  switch (cmp) {
    case '>':  return value >  threshold;
    case '>=': return value >= threshold;
    case '<':  return value <  threshold;
    case '<=': return value <= threshold;
    default:   return false;
  }
}

function pickMetric(snap, kind, metric) {
  const src = kind === 'os' ? snap.os
            : kind === 'http' ? snap.http
            : kind === 'db'   ? snap.db
            : null;
  if (!src) return null;
  // snap 필드명이 카멜케이스, DB 의 metric 은 snake_case → 매핑
  const map = {
    cpu_pct: 'cpuPct',
    mem_pct: 'memPct',
    load1: 'load1',
    proc_rss_mb: 'procRssMb',
    proc_heap_mb: 'procHeapMb',
    rps: 'rps',
    qps: 'qps',
    avg_ms: 'avgMs',
    max_ms: 'maxMs',
    p95_ms: 'p95Ms',
    err_pct: 'errPct',
    count: 'count',
  };
  const key = map[metric] || metric;
  const v = src[key];
  return typeof v === 'number' ? v : null;
}
