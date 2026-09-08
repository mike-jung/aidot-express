/**
 * metrics.js — 인메모리 메트릭 수집기 (싱글톤).
 *
 *  설계:
 *   - 초 단위 버킷(circular ring buffer)에 카운터 누적
 *   - HTTP 미들웨어 / db.execute 훅 / OS 샘플러가 기록 주체
 *   - 외부(컨트롤러/서비스)는 getSnapshot/getSeries/recordXxx 호출
 *   - DB 저장과 임계값 평가는 MetricsService 가 담당 (이 파일은 "수집"만)
 *
 *  측정 지표:
 *   os:    cpu_pct, mem_pct, load1, proc_rss_mb, proc_heap_mb
 *   http:  req_count, err_count, avg_ms, p95_ms, max_ms, rps, err_pct
 *   db:    q_count,   err_count, avg_ms, p95_ms, max_ms, qps, err_pct
 *
 *  성능: 모든 record 는 단순 숫자 누적 → nanosecond 급. hot path 에 안전.
 */
import os from 'node:os';
import process from 'node:process';

const BUCKET_COUNT = 600; // 최근 600초 = 10분 보관
const BUCKET_MS = 1000;

// ─── 초 단위 원형 버퍼 (HTTP / DB 집계용) ───────────────────
function emptyBucket(tsSec) {
  return {
    tsSec,
    http: {
      count: 0,
      errCount: 0,
      failCount: 0,   // ★ v1.11.9 4xx (요청이 거부된 것)
      sumMs: 0,
      maxMs: 0,
      samples: [], // p95 산출용 (상한 설정)
    },
    db: {
      count: 0,
      errCount: 0,
      sumMs: 0,
      maxMs: 0,
      samples: [],
    },
    os: null, // { cpuPct, memPct, load1, procRssMb, procHeapMb }
  };
}

const MAX_SAMPLES_PER_BUCKET = 200; // 메모리 보호 (p95 통계는 200개면 충분)
const MAX_TRACKED_ROUTES = 500;     // 라우트 수 상한 (오남용/공격으로 인한 메모리 폭주 방지)

function emptyRouteBucket(tsSec) {
  return { tsSec, count: 0, errCount: 0, failCount: 0, sumMs: 0, maxMs: 0 };
}

class MetricsCollector {
  constructor() {
    this.buckets = new Array(BUCKET_COUNT);
    for (let i = 0; i < BUCKET_COUNT; i++) {
      this.buckets[i] = emptyBucket(0);
    }
    this.startedAt = Date.now();

    // OS 샘플링용 이전 CPU 스냅샷 (차분 계산)
    this._prevCpu = this._readCpuTimes();
    this._prevCpuAt = Date.now();

    this._osTimer = null;
    // 최신 OS 샘플 (1초마다 기록). 시계열에서 빈 버킷을 이 값으로 채울 때 사용.
    this._latestOsSample = null;
    // 누적 카운터 (프로세스 전체)
    this.totals = {
      httpCount: 0,
      httpErrCount: 0,
      httpFailCount: 0,   // ★ v1.11.9 4xx
      dbCount: 0,
      dbErrCount: 0,
    };

    /*
     * 라우트별 집계 저장소.
     *   routeKey = `${controller}.${handler}` (없으면 `${method} ${path}`)
     *
     * this._routes.get(routeKey) = {
     *   meta: { controller, handler, method, path },
     *   total: { count, errCount, sumMs, maxMs },
     *   buckets: Array<BUCKET_COUNT>(초별 { tsSec, count, errCount, sumMs, maxMs })
     * }
     *
     * 메모리 보호: 최대 라우트 수 상한 (MAX_TRACKED_ROUTES) 을 넘으면 더 이상 새 라우트를 추적하지 않음.
     */
    this._routes = new Map();
  }

  /** 현재 초 버킷을 반환. 없으면 새로 할당하고 이전 버킷은 누적이 끝난 상태로 유지. */
  _currentBucket() {
    const tsSec = Math.floor(Date.now() / BUCKET_MS);
    const idx = tsSec % BUCKET_COUNT;
    const b = this.buckets[idx];
    if (b.tsSec !== tsSec) {
      // 이 슬롯이 재사용되었음 → 초기화 후 현재 초로 세팅
      this.buckets[idx] = emptyBucket(tsSec);
      return this.buckets[idx];
    }
    return b;
  }

  /** HTTP 응답 기록 (미들웨어가 호출)
   *  @param durationMs 응답 소요 시간
   *  @param statusCode HTTP status
   *  @param routeInfo  (optional) { controller, handler, method, path } — 라우트별 집계용
   */
  recordHttp(durationMs, statusCode, routeInfo) {
    const b = this._currentBucket();
    b.http.count += 1;
    b.http.sumMs += durationMs;
    if (durationMs > b.http.maxMs) b.http.maxMs = durationMs;
    if (b.http.samples.length < MAX_SAMPLES_PER_BUCKET) b.http.samples.push(durationMs);
    const isErr = statusCode >= 500 || statusCode === 0;
    /* ★ v1.11.9 — 4xx 를 따로 센다. 예전에는 5xx 만 오류로 봐서 401/404/400 이 아무리 쏟아져도
       화면의 오류율이 0% 였다(실행 검증에서 404 15건이 errCount 0 으로 잡히는 것을 확인).
       errCount(5xx) 의 뜻은 그대로 둔다 — 경보 임계값의 의미가 바뀌면 안 되니까 — 항목만 더한다. */
    const isFail = statusCode >= 400 && statusCode < 500;
    if (isErr) b.http.errCount += 1;
    if (isFail) b.http.failCount += 1;
    this.totals.httpCount += 1;
    if (isErr) this.totals.httpErrCount += 1;
    if (isFail) this.totals.httpFailCount += 1;

    // 라우트별 집계
    if (routeInfo) {
      this._recordRoute(routeInfo, durationMs, isErr, isFail);
    }
  }

  _routeKey(info) {
    if (info.controller && info.handler) return `${info.controller}.${info.handler}`;
    return `${info.method || 'GET'} ${info.path || '/'}`;
  }

  _recordRoute(info, durationMs, isErr, isFail = false) {
    const key = this._routeKey(info);
    let entry = this._routes.get(key);
    if (!entry) {
      if (this._routes.size >= MAX_TRACKED_ROUTES) return;  // 상한 초과 시 추적 중단
      entry = {
        meta: {
          controller: info.controller || null,
          handler:    info.handler    || null,
          method:     info.method     || null,
          path:       info.path       || null,
        },
        total: { count: 0, errCount: 0, failCount: 0, sumMs: 0, maxMs: 0 },
        buckets: new Array(BUCKET_COUNT),
      };
      for (let i = 0; i < BUCKET_COUNT; i++) entry.buckets[i] = emptyRouteBucket(0);
      this._routes.set(key, entry);
    }
    entry.total.count += 1;
    entry.total.sumMs += durationMs;
    if (durationMs > entry.total.maxMs) entry.total.maxMs = durationMs;
    if (isErr) entry.total.errCount += 1;
    if (isFail) entry.total.failCount += 1;   // ★ v1.11.9

    const tsSec = Math.floor(Date.now() / BUCKET_MS);
    const idx = tsSec % BUCKET_COUNT;
    const b = entry.buckets[idx];
    if (b.tsSec !== tsSec) {
      // 슬롯 재사용 → 초기화
      entry.buckets[idx] = emptyRouteBucket(tsSec);
    }
    const rb = entry.buckets[idx];
    rb.count += 1;
    rb.sumMs += durationMs;
    if (durationMs > rb.maxMs) rb.maxMs = durationMs;
    if (isErr) rb.errCount += 1;
    if (isFail) rb.failCount += 1;   // ★ v1.11.9
  }

  /**
   * 라우트별 요약 리스트 (상위 N개).
   *  @param windowSec 최근 windowSec 초 기준으로 집계.
   *  @param topN      기본 50. 초과분은 잘라냄.
   *  @param sortBy    'count' | 'avgMs' | 'maxMs' | 'errCount' (기본 count)
   */
  getRouteSummary({ windowSec = 60, topN = 50, sortBy = 'count' } = {}) {
    const end = Math.floor(Date.now() / BUCKET_MS);
    const start = end - Math.max(1, Math.min(BUCKET_COUNT, windowSec)) + 1;
    const rows = [];
    for (const [key, entry] of this._routes.entries()) {
      let count = 0, errCount = 0, failCount = 0, sumMs = 0, maxMs = 0;
      for (let s = start; s <= end; s++) {
        const b = entry.buckets[s % BUCKET_COUNT];
        if (!b || b.tsSec !== s) continue;
        count += b.count;
        errCount += b.errCount;
        failCount += b.failCount || 0;
        sumMs += b.sumMs;
        if (b.maxMs > maxMs) maxMs = b.maxMs;
      }
      rows.push({
        key,
        meta: entry.meta,
        windowSec: end - start + 1,
        count,
        errCount,
        failCount,
        rps: count / Math.max(1, end - start + 1),
        avgMs: count > 0 ? sumMs / count : 0,
        maxMs,
        errPct: count > 0 ? (errCount / count) * 100 : 0,
        failPct: count > 0 ? (failCount / count) * 100 : 0,   // ★ v1.11.9 4xx 비율
        totalCount: entry.total.count,
        totalErrCount: entry.total.errCount,
        totalFailCount: entry.total.failCount || 0,
      });
    }
    const cmp = {
      count: (a, b) => b.count - a.count,
      avgMs: (a, b) => b.avgMs - a.avgMs,
      maxMs: (a, b) => b.maxMs - a.maxMs,
      errCount: (a, b) => b.errCount - a.errCount,
      failCount: (a, b) => b.failCount - a.failCount,
    }[sortBy] || ((a, b) => b.count - a.count);
    rows.sort(cmp);
    return rows.slice(0, topN);
  }

  /**
   * 특정 라우트의 초별 시계열 (count, avgMs).
   *  @param key   `${controller}.${handler}`
   *  @param windowSec
   */
  getRouteSeries(key, windowSec = 60) {
    const entry = this._routes.get(key);
    const end = Math.floor(Date.now() / BUCKET_MS);
    const n = Math.max(1, Math.min(BUCKET_COUNT, windowSec));
    const start = end - n + 1;
    const result = new Array(n);
    for (let i = 0; i < n; i++) {
      const s = start + i;
      const b = entry ? entry.buckets[s % BUCKET_COUNT] : null;
      const valid = b && b.tsSec === s;
      result[i] = {
        tsSec: s,
        count: valid ? b.count : 0,
        avgMs: valid && b.count > 0 ? b.sumMs / b.count : 0,
        maxMs: valid ? b.maxMs : 0,
        errCount: valid ? b.errCount : 0,
        failCount: valid ? (b.failCount || 0) : 0,
      };
    }
    return {
      key,
      meta: entry ? entry.meta : null,
      series: result,
    };
  }

  /** DB 쿼리 기록 (db.execute 래퍼가 호출) */
  recordDb(durationMs, ok) {
    const b = this._currentBucket();
    b.db.count += 1;
    b.db.sumMs += durationMs;
    if (durationMs > b.db.maxMs) b.db.maxMs = durationMs;
    if (b.db.samples.length < MAX_SAMPLES_PER_BUCKET) b.db.samples.push(durationMs);
    if (!ok) b.db.errCount += 1;
    this.totals.dbCount += 1;
    if (!ok) this.totals.dbErrCount += 1;
  }

  /** OS 샘플 기록 (샘플러가 1초마다 호출) */
  _recordOsSample() {
    const b = this._currentBucket();
    const nowCpu = this._readCpuTimes();
    const now = Date.now();

    // CPU 사용률 = (busy_delta) / (total_delta)
    const prev = this._prevCpu;
    let cpuPct = 0;
    if (prev) {
      const busyDelta = (nowCpu.busy - prev.busy);
      const totalDelta = (nowCpu.total - prev.total);
      if (totalDelta > 0) cpuPct = Math.max(0, Math.min(100, (busyDelta / totalDelta) * 100));
    }
    this._prevCpu = nowCpu;
    this._prevCpuAt = now;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPct = totalMem > 0 ? (usedMem / totalMem) * 100 : 0;

    // 1분 로드 평균 (Windows 는 항상 0 반환이라 주의)
    const load1 = (os.loadavg() || [0])[0] || 0;

    const mu = process.memoryUsage();
    const procRssMb = mu.rss / (1024 * 1024);
    const procHeapMb = mu.heapUsed / (1024 * 1024);

    const sample = {
      cpuPct,
      memPct,
      memUsedMb:  usedMem  / (1024 * 1024),
      memTotalMb: totalMem / (1024 * 1024),
      memFreeMb:  freeMem  / (1024 * 1024),
      load1,
      procRssMb,
      procHeapMb,
    };
    b.os = sample;
    // 최신 샘플 캐시 — 시계열에서 빈 초들을 직전 OS 샘플로 채우기 위해 사용.
    this._latestOsSample = sample;
  }

  _readCpuTimes() {
    const cpus = os.cpus() || [];
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    for (const c of cpus) {
      user += c.times.user;
      nice += c.times.nice;
      sys += c.times.sys;
      idle += c.times.idle;
      irq += c.times.irq;
    }
    const busy = user + nice + sys + irq;
    const total = busy + idle;
    return { busy, total };
  }

  /** OS 샘플러 시작 (server 부팅 시 1회) */
  startOsSampler() {
    if (this._osTimer) return;
    this._osTimer = setInterval(() => {
      try { this._recordOsSample(); } catch { /* noop */ }
    }, 1000);
    this._osTimer.unref?.();
  }

  stopOsSampler() {
    if (this._osTimer) { clearInterval(this._osTimer); this._osTimer = null; }
  }

  /** 최근 windowSec 초 동안의 요약 스냅샷 */
  getSnapshot(windowSec = 5) {
    const end = Math.floor(Date.now() / BUCKET_MS);
    const start = end - Math.max(1, Math.min(BUCKET_COUNT, windowSec));
    const agg = {
      http: { count: 0, errCount: 0, failCount: 0, sumMs: 0, maxMs: 0, samples: [] },
      db:   { count: 0, errCount: 0, sumMs: 0, maxMs: 0, samples: [] },
      os:   null,
    };
    // 최신 OS 샘플 하나만 표시
    let latestOs = null;
    for (let s = start + 1; s <= end; s++) {
      const b = this.buckets[s % BUCKET_COUNT];
      if (!b || b.tsSec !== s) continue;
      agg.http.count += b.http.count;
      agg.http.errCount += b.http.errCount;
      agg.http.failCount += b.http.failCount || 0;   // ★ v1.11.9
      agg.http.sumMs += b.http.sumMs;
      if (b.http.maxMs > agg.http.maxMs) agg.http.maxMs = b.http.maxMs;
      if (b.http.samples.length) {
        // p95 는 max 200 × windowSec 개 → 상한 필요할 수 있음
        for (let i = 0; i < b.http.samples.length; i++) agg.http.samples.push(b.http.samples[i]);
      }
      agg.db.count += b.db.count;
      agg.db.errCount += b.db.errCount;
      agg.db.sumMs += b.db.sumMs;
      if (b.db.maxMs > agg.db.maxMs) agg.db.maxMs = b.db.maxMs;
      if (b.db.samples.length) {
        for (let i = 0; i < b.db.samples.length; i++) agg.db.samples.push(b.db.samples[i]);
      }
      if (b.os) latestOs = b.os;
    }

    const elapsed = Math.max(1, end - start);
    const http = {
      count:   agg.http.count,
      errCount: agg.http.errCount,
      failCount: agg.http.failCount,   // ★ v1.11.9 4xx
      failPct:  agg.http.count > 0 ? (agg.http.failCount / agg.http.count) * 100 : 0,
      rps:     agg.http.count / elapsed,
      avgMs:   agg.http.count > 0 ? agg.http.sumMs / agg.http.count : 0,
      maxMs:   agg.http.maxMs,
      p95Ms:   percentile(agg.http.samples, 95),
      errPct:  agg.http.count > 0 ? (agg.http.errCount / agg.http.count) * 100 : 0,
    };
    const db = {
      count:   agg.db.count,
      errCount: agg.db.errCount,
      qps:     agg.db.count / elapsed,
      avgMs:   agg.db.count > 0 ? agg.db.sumMs / agg.db.count : 0,
      maxMs:   agg.db.maxMs,
      p95Ms:   percentile(agg.db.samples, 95),
      errPct:  agg.db.count > 0 ? (agg.db.errCount / agg.db.count) * 100 : 0,
    };
    const osSnap = latestOs ? {
      cpuPct:     latestOs.cpuPct,
      memPct:     latestOs.memPct,
      memUsedMb:  latestOs.memUsedMb ?? 0,
      memTotalMb: latestOs.memTotalMb ?? 0,
      memFreeMb:  latestOs.memFreeMb ?? 0,
      load1:      latestOs.load1,
      procRssMb:  latestOs.procRssMb,
      procHeapMb: latestOs.procHeapMb,
    } : {
      cpuPct: 0, memPct: 0,
      memUsedMb: 0, memTotalMb: 0, memFreeMb: 0,
      load1: 0, procRssMb: 0, procHeapMb: 0,
    };

    return {
      ts: Date.now(),
      windowSec: elapsed,
      os: osSnap,
      http,
      db,
      totals: { ...this.totals },
      systemInfo: {
        uptimeSec: Math.round(process.uptime()),
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
        cpuCount: (os.cpus() || []).length,
        totalMemMb: Math.round(os.totalmem() / (1024 * 1024)),
        hostname: os.hostname(),
      },
    };
  }

  /**
   * 최근 windowSec 초의 초당 시계열.
   *  - http / db 는 해당 초의 실측값
   *  - os 는 "fill-forward": 해당 초에 OS 샘플이 없으면 가장 최근 샘플로 채운다.
   *    (HTTP/DB 요청이 잦을 때 OS 샘플이 다른 초에 기록되어 빈 버킷이 생겨도
   *     그래프가 0으로 떨어지지 않도록 함)
   *
   * 각 요소: { tsSec, http, db, os }
   */
  getSeries(windowSec = 60) {
    const end = Math.floor(Date.now() / BUCKET_MS);
    const n = Math.max(1, Math.min(BUCKET_COUNT, windowSec));
    const start = end - n + 1;
    const result = new Array(n);

    // fill-forward 를 위한 과거 탐색: 가장 최근의 os 샘플을 찾아 시작점으로 삼음
    let carryOs = null;
    // 윈도우 이전까지 거슬러 올라가서 가장 최근 OS 샘플 찾기 (최대 BUCKET_COUNT)
    for (let k = start - 1; k > start - BUCKET_COUNT && k >= 0; k--) {
      const bb = this.buckets[k % BUCKET_COUNT];
      if (bb && bb.tsSec === k && bb.os) { carryOs = bb.os; break; }
    }
    // 전혀 못 찾으면 가장 최근 기록된 샘플(아직 윈도우 안에서 갱신될 수도 있지만 안전장치)
    if (!carryOs) carryOs = this._latestOsSample;

    for (let i = 0; i < n; i++) {
      const s = start + i;
      const b = this.buckets[s % BUCKET_COUNT];
      const valid = b && b.tsSec === s;
      if (valid && b.os) carryOs = b.os;

      result[i] = {
        tsSec: s,
        http: valid ? {
          count: b.http.count,
          rps:   b.http.count,
          avgMs: b.http.count > 0 ? b.http.sumMs / b.http.count : 0,
          maxMs: b.http.maxMs,
          errPct: b.http.count > 0 ? (b.http.errCount / b.http.count) * 100 : 0,
          failPct: b.http.count > 0 ? ((b.http.failCount || 0) / b.http.count) * 100 : 0,   // ★ v1.11.9
        } : { count: 0, rps: 0, avgMs: 0, maxMs: 0, errPct: 0, failPct: 0 },
        db: valid ? {
          count: b.db.count,
          qps:   b.db.count,
          avgMs: b.db.count > 0 ? b.db.sumMs / b.db.count : 0,
          maxMs: b.db.maxMs,
          errPct: b.db.count > 0 ? (b.db.errCount / b.db.count) * 100 : 0,
        } : { count: 0, qps: 0, avgMs: 0, maxMs: 0, errPct: 0 },
        os: carryOs ? {
          cpuPct:     carryOs.cpuPct,
          memPct:     carryOs.memPct,
          memUsedMb:  carryOs.memUsedMb ?? 0,
          memTotalMb: carryOs.memTotalMb ?? 0,
          memFreeMb:  carryOs.memFreeMb ?? 0,
          load1:      carryOs.load1,
          procRssMb:  carryOs.procRssMb,
          procHeapMb: carryOs.procHeapMb,
        } : null,
      };
    }
    return result;
  }

  /** DB flush 용: 직전 windowSec 초의 평균/최대를 평평한 샘플 리스트로 */
  getFlatSamples(windowSec) {
    const snap = this.getSnapshot(windowSec);
    const ts = new Date(snap.ts);
    return [
      { ts, kind: 'os',   metric: 'cpu_pct',     value: snap.os.cpuPct },
      { ts, kind: 'os',   metric: 'mem_pct',     value: snap.os.memPct },
      { ts, kind: 'os',   metric: 'load1',       value: snap.os.load1 },
      { ts, kind: 'os',   metric: 'proc_rss_mb', value: snap.os.procRssMb },
      { ts, kind: 'os',   metric: 'proc_heap_mb', value: snap.os.procHeapMb },
      { ts, kind: 'http', metric: 'rps',         value: snap.http.rps },
      { ts, kind: 'http', metric: 'avg_ms',      value: snap.http.avgMs },
      { ts, kind: 'http', metric: 'max_ms',      value: snap.http.maxMs },
      { ts, kind: 'http', metric: 'err_pct',     value: snap.http.errPct },
      { ts, kind: 'db',   metric: 'qps',         value: snap.db.qps },
      { ts, kind: 'db',   metric: 'avg_ms',      value: snap.db.avgMs },
      { ts, kind: 'db',   metric: 'max_ms',      value: snap.db.maxMs },
      { ts, kind: 'db',   metric: 'err_pct',     value: snap.db.errPct },
    ];
  }
}

function percentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

// ── 싱글톤 ──
const metrics = new MetricsCollector();
export default metrics;
export { metrics };
