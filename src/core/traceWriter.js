/**
 * traceWriter — 추적 기록을 **모아서 한꺼번에** 쓴다. (v1.10.45)
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  왜 필요한가 — "이미 비동기인데 왜 느린가"
 * ══════════════════════════════════════════════════════════════════════════
 *  기존 코드도 응답을 붙잡지는 않았습니다.
 *
 *      res.on('finish', () => { traceStore.persist(rec).catch(() => {}); });
 *
 *  그런데도 부하 테스트에서 **처리량이 44% 차이**났습니다(168 → 241 rps).
 *  응답을 안 기다리는 것과 **자원을 안 쓰는 것은 다르기** 때문입니다.
 *
 *      요청 A 응답 완료 → INSERT 6번 시작 (커넥션 풀에서 6번 점유)
 *      요청 B 도착      → 남은 커넥션을 두고 경쟁
 *
 *  응답은 이미 나갔지만 **커넥션과 CPU 는 그대로 씁니다.** 뒤따르는 요청이
 *  그만큼 밀립니다. "나중에 하기" 만으로는 부족하고, **총량을 줄여야**
 *  합니다.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  무엇을 하는가
 * ══════════════════════════════════════════════════════════════════════════
 *   ① 기록을 메모리 큐에 넣고 **즉시 반환** — 호출자는 기다리지 않는다
 *   ② 일정 시간(기본 1초)마다 또는 큐가 차면 **한꺼번에** 쓴다
 *   ③ 여러 요청의 단계를 **다중 VALUES 한 문장**으로 묶는다
 *
 *  요청 20건이 각 5단계면
 *      예전: INSERT 120번   →  지금: INSERT 2번
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  잃는 것 — 분명히 적어 둡니다
 * ══════════════════════════════════════════════════════════════════════════
 *  ⚠ **서버가 갑자기 죽으면 큐에 있던 것이 사라집니다.** (최대 1초어치)
 *    추적은 "진단용 기록" 이지 회계 장부가 아니므로 감수할 만합니다.
 *    다만 정상 종료(SIGTERM)에서는 남은 것을 비우고 나갑니다.
 *
 *  ⚠ 화면에 뜨기까지 **최대 1초 늦습니다.** [요청 추적] 을 열자마자
 *    방금 요청이 없을 수 있습니다 — 메모리 버퍼(ring)가 그 사이를
 *    메우므로 실제로는 거의 드러나지 않습니다.
 */
import db from '../database/db.js';
import sqlRegistry from './sqlLoader.js';
import logger from '../util/logger.js';
import config from '../config/index.js';

/** 대기 중인 레코드 */
let queue = [];
let timer = null;
let flushing = false;

/* 안전장치 — 이 값을 넘으면 기다리지 않고 바로 쓴다 */
const MAX_QUEUE = 500;
/** 큐가 이보다 커지면 **가장 오래된 것부터 버린다.**
 *  DB 가 느려 큐가 무한정 자라면 메모리가 먼저 터진다. 추적을 지키려다
 *  서버를 죽이는 것은 뒤바뀐 우선순위다. */
const HARD_LIMIT = 5000;
let dropped = 0;
/* ★ v1.11.3 — 화면(요청 추적)에 보여 줄 누적치. 물러난 단계에서 얼마나 빠졌는지 알아야 "왜 내 요청이 없지" 가 풀린다 */
const stats = { enqueued: 0, written: 0, droppedTotal: 0, skippedByPressure: 0, lastFlushAt: null, lastFlushMs: null, retention: null };

function intervalMs() {
  const v = Number(config.trace?.flushMs);
  return Number.isFinite(v) && v >= 0 ? v : 1000;
}

/** 큐에 넣고 즉시 반환. **여기서 DB 를 건드리지 않는다.** */
export function enqueue(rec) {
  stats.enqueued++;
  if (!rec) return;
  /* ★ 부하 단계에 따라 여기서 버린다 — 큐에 넣기 전에 거르는 것이 핵심이다.
     넣고 나서 버리면 메모리와 CPU 를 이미 쓴 뒤다. */
  if (!shouldRecord(rec)) return;
  queue.push(rec);

  if (queue.length > HARD_LIMIT) {
    const cut = queue.length - HARD_LIMIT;
    queue.splice(0, cut);
    dropped += cut; stats.droppedTotal += cut;
    if (dropped === cut) {   // 처음 넘쳤을 때만 알린다 (로그 폭주 방지)
      logger.warn(`[trace] queue is full — dropping the oldest records; database writes cannot keep up.`);
    }
  }

  if (queue.length >= MAX_QUEUE) { void flush(); return; }
  if (!timer) {
    timer = setTimeout(() => { timer = null; void flush(); }, intervalMs());
    timer.unref?.();          // 이 타이머가 프로세스 종료를 막지 않게
  }
}

/** 값 배열을 다중 VALUES 로 — 자리표시자는 이름 뒤에 번호를 붙여 구분한다 */
function buildBulk(baseSql, rows, cols) {
  const tuples = [];
  const params = {};
  rows.forEach((r, i) => {
    tuples.push(`(${cols.map((c) => `:${c}${i}`).join(', ')})`);
    cols.forEach((c) => { params[`${c}${i}`] = r[c] ?? null; });
  });
  return { sql: `${baseSql} VALUES ${tuples.join(', ')}`, params };
}

/** 큐를 비운다. 실패해도 **다음 요청을 막지 않는다.** */
export async function flush() {
  if (flushing) return;

  /* ★ 큐가 비어도 **단계 판정은 돌려야 한다.**
     예전에는 `!queue.length` 로 먼저 빠져나가, 부하가 가셔서 큐가 비면
     복귀 판정이 아예 안 돌았다 — 물러난 상태에 갇혔다. */
  updateLevel();

  if (!queue.length) {
    /* 아직 정상이 아니면 계속 지켜본다 — 안 그러면 복귀할 기회가 없다 */
    if (level !== LEVEL.NORMAL && !timer) {
      timer = setTimeout(() => { timer = null; void flush(); }, intervalMs());
      timer.unref?.();
    }
    return;
  }
  if (db.isDbUnavailable?.()) { queue = []; return; }   // DB 가 없으면 쌓지 않는다

  flushing = true;
  const batch = queue;
  queue = [];
  try {
    const file = sqlRegistry.getFile('admin_trace');

    /* ① 요청 본체 — 한 문장으로 */
    /* ★ v1.11.4 — ts 는 요청이 **시작된 시각**(밀리초). 예전에는 DB 기본값(삽입 시각 = 배치 1초 뒤, 초 단위)이었다. */
    const traceCols = ['request_id', 'trace_id', 'ts', 'method', 'path', 'route', 'status',
      'duration_ms', 'user_id', 'username', 'user_kind', 'ip', 'user_agent', 'step_count'];
    const traceRows = batch.map((r) => ({
      request_id: r.requestId, trace_id: r.traceId, ts: r.ts instanceof Date ? r.ts : new Date(r.ts || Date.now()),
      method: r.method, path: r.path,
      route: r.route, status: r.status, duration_ms: r.durationMs, user_id: r.userId,
      username: r.username, user_kind: r.userKind, ip: r.ip, user_agent: r.userAgent,
      step_count: r.steps?.length ?? 0,
    }));
    /* ★ v1.11.3 — 클라이언트가 지정한 X-Request-Id 가 이미 저장된 것과 겹치면(재현 요청·앞단이 재사용)
       예전에는 다중 VALUES 한 문장이 통째로 실패해 **같은 배치의 다른 사람 요청까지** 사라졌다.
       INSERT IGNORE 로 겹친 것만 건너뛰고, 그 요청의 단계도 넣지 않는다 (옛 기록에 섞이지 않게). */
    const t = buildBulk(
      `INSERT IGNORE INTO request_traces (${traceCols.join(', ')})`, traceRows, traceCols);
    const ins = await db.execute(t.sql, t.params);
    let kept = batch;
    if ((ins.rowsAffected ?? batch.length) < batch.length) {
      const idsInBatch = traceRows.map((r) => r.request_id);
      const q = await db.execute(
        `SELECT request_id FROM request_traces WHERE request_id IN (${idsInBatch.map((_, i) => `:id${i}`).join(', ')}) AND step_count > 0 AND request_id IN (SELECT request_id FROM request_steps)`,
        Object.fromEntries(idsInBatch.map((id, i) => [`id${i}`, id])));
      const already = new Set((q.rows || []).map((r) => r.request_id));
      kept = batch.filter((r) => !already.has(r.requestId));
      const dup = batch.length - kept.length;
      if (dup) { stats.duplicates = (stats.duplicates || 0) + dup; logger.warn(`[trace] request ID ${dup} already exists — skipped (X-Request-Id reused)`); }
    }

    /* ② 단계들 — 여러 요청의 것을 **모아서** 한 문장으로 */
    const stepCols = ['request_id', 'seq', 'at_ms', 'kind', 'name', 'ms', 'ok', 'rows_count', 'detail'];
    const stepRows = [];
    for (const r of kept) {
      (r.steps || []).forEach((s, seq) => {
        stepRows.push({
          request_id: r.requestId, seq, at_ms: s.at, kind: s.kind, name: s.kind === 'sql' ? maskSqlLiterals(s.name) : s.name,
          ms: s.ms, ok: s.ok ? 1 : 0, rows_count: s.rows, detail: s.detail,
        });
      });
    }
    if (stepRows.length) {
      /* ⚠ 한 문장이 너무 커지면 max_allowed_packet 에 걸린다.
         200줄씩 끊어 보낸다 — 그래도 예전(줄마다 1번)보다 훨씬 적다. */
      for (let i = 0; i < stepRows.length; i += 200) {
        const chunk = stepRows.slice(i, i + 200);
        const q = buildBulk(
          `INSERT INTO request_steps (${stepCols.join(', ')})`, chunk, stepCols);
        await db.execute(q.sql, q.params);
      }
    }
    stats.written += batch.length;
    stats.lastFlushAt = Date.now();
    if (dropped) {
      logger.warn(`[trace] records dropped under backlog: ${dropped}`);
      dropped = 0;
    }
    maybeRunRetention();
  } catch (e) {
    /* 추적 실패가 서비스를 깨뜨리면 안 된다. 버리고 다음으로 간다. */
    logger.warn(`[trace] could not save records (${batch.length} dropped): ${String(e.message).slice(0, 160)}`);
  } finally {
    flushing = false;
    /* 비우는 사이에 또 쌓였으면 이어서.
       ⚠ **큐가 비었어도 물러난 상태면 계속 돌려야 한다** — 마지막 flush 뒤
         타이머가 끊기면 복귀 판정이 멈춰 물러난 채로 굳는다. */
    if ((queue.length || level !== LEVEL.NORMAL) && !timer) {
      timer = setTimeout(() => { timer = null; void flush(); }, intervalMs());
      timer.unref?.();
    }
  }
}

/** 정상 종료 때 남은 것을 비운다 — 마지막 1초어치를 살린다 */
export async function drain() {
  if (timer) { clearTimeout(timer); timer = null; }
  await flush();
}

/* ══════════════════════════════════════════════════════════════════════════
   부하가 걸렸을 때 — 스스로 물러난다
   ══════════════════════════════════════════════════════════════════════════
   비동기로 미뤄도 **커넥션 풀과 CPU 는 그대로 씁니다.** 부하가 걸리면
   미루는 것만으로 부족하고, **만드는 양 자체를 줄여야** 합니다.

   ⚠ 신호로 **큐 깊이**를 씁니다. 큐가 쌓인다는 것은 DB 쓰기가 요청 속도를
     못 따라간다는 뜻이고, 그게 바로 지키려는 자원입니다.
     rps 는 쓰지 않습니다 — 초당 500건이 문제인지는 서버마다 다릅니다.

   ⚠ 한 번에 끄지 않고 **값어치 낮은 것부터** 놓습니다. 빠르게 성공한 GET 은
     나중에 볼 일이 거의 없고, 오류와 느린 요청은 부하 때 정작 보고 싶은
     것이므로 마지막까지 지킵니다.
   ══════════════════════════════════════════════════════════════════════════ */

export const LEVEL = Object.freeze({
  NORMAL: 'normal',   // 전부 기록
  EASE:   'ease',     // 빠른 성공 GET 만 뺀다
  HEAVY:  'heavy',    // 오류·느린 요청만
  SHED:   'shed',     // 전부 끔
});

/* 올라가는 기준과 내려오는 기준을 다르게 둔다(이력 현상).
   같으면 경계에서 모드가 떨거려 로그만 시끄러워진다. */
const UP   = { ease: 200, heavy: 1000, shed: HARD_LIMIT };
const DOWN = { ease: 100, heavy:  600 };

let level = LEVEL.NORMAL;
let calmStreak = 0;          // 조용한 상태가 몇 번 이어졌나
let lastAnnounced = null;

/** 지금 어느 단계인가 */
export function pressure() { return level; }

/** 큐 깊이를 보고 단계를 갱신한다 (flush 때마다 부른다) */
function updateLevel() {
  const n = queue.length;
  const prev = level;

  if (n >= UP.shed) level = LEVEL.SHED;
  else if (n >= UP.heavy) level = LEVEL.HEAVY;
  else if (n >= UP.ease) level = LEVEL.EASE;
  else {
    /* 내려올 때는 **연속으로 조용해야** 한다 — 한 번 튄 값으로 복귀하면
       곧바로 다시 올라가며 진동한다. */
    if (n < DOWN.ease) {
      calmStreak += 1;
      if (calmStreak >= 3) level = LEVEL.NORMAL;
    } else if (n < DOWN.heavy && level === LEVEL.HEAVY) {
      level = LEVEL.EASE;
      calmStreak = 0;
    }
  }
  if (n >= UP.ease) calmStreak = 0;

  if (level !== prev && level !== lastAnnounced) {
    lastAnnounced = level;
    if (level === LEVEL.NORMAL) {
      logger.info('[trace] load has eased — back to full recording.');
    } else {
      const what = {
        [LEVEL.EASE]:  '빠른 성공 GET 을 기록하지 않습니다',
        [LEVEL.HEAVY]: '오류와 느린 요청만 기록합니다',
        [LEVEL.SHED]:  '기록을 잠시 멈춥니다',
      }[level];
      logger.warn(`[trace] writes are backing up (waiting ${n}) — ${what}. `
        + '부하가 가시면 자동으로 돌아옵니다.');
    }
  }
}

/**
 * 이 요청을 **기록할 것인가.** 단계가 올라갈수록 덜 남긴다.
 *
 *  ⚠ 오류와 느린 요청은 SHED 전까지 **항상** 남긴다. 부하 상황에서
 *    정작 보고 싶은 것이 그것이다.
 */
function _shouldRecord(rec) {
  if (!rec) return false;
  if (level === LEVEL.SHED) return false;

  const failed = (rec.status ?? 0) >= 400;
  const slow = (rec.durationMs ?? 0) >= (Number(config.trace?.slowMs) || 500);
  if (failed || slow) return true;              // 어느 단계에서도 지킨다

  if (level === LEVEL.HEAVY) return false;      // 나머지는 버린다
  if (level === LEVEL.EASE) return rec.method !== 'GET';   // 변경 행위는 남긴다
  return true;
}

/** 시험·진단용 */
export function shouldRecord(rec) {
  const ok = _shouldRecord(rec);
  if (!ok) stats.skippedByPressure++;
  return ok;
}

export function pending() { return queue.length; }

/**
 * ★ v1.11.4 — SQL 단계 이름에서 **값**을 지운다. 정식 SQL 파일은 `:이름` 자리표시자라 값이 없지만,
 *   [SQL 테스트 실행]의 ad-hoc SQL 은 `WHERE ptno = '99108208'` 처럼 값이 그대로 들어올 수 있다.
 *   DB 에 오래 남는 것이라 문자열은 '?' 로, 숫자 리터럴은 ? 로 바꾼다. 자리표시자·식별자·SQL 키워드는 그대로.
 */
export function maskSqlLiterals(sql) {
  if (!sql || typeof sql !== 'string') return sql;
  return sql
    .replace(/'(?:[^'\\]|\\.|'')*'/g, "'?'")             // '문자열' ('' 이스케이프 포함)
    .replace(/"(?:[^"\\]|\\.)*"/g, '"?"')                 // "문자열"
    .replace(/(?<![\w:.$@])-?\d+(?:\.\d+)?(?![\w])/g, '?');   // 홀로 선 숫자 (식별자·:param·소수 안은 제외)
}

/** ★ v1.11.3 — 화면·API 용 상태 */
export function status() {
  return {
    level, queue: queue.length, ...stats,
    thresholds: { ease: UP.ease, heavy: UP.heavy, shed: UP.shed },
  };
}

/* ★ v1.11.3 — 보관 정리. config.trace.retentionDays 를 넘긴 것과, maxRecords 를 넘긴 오래된 것부터 지운다.
   예전에는 deleteOldTraces SQL 만 있고 부르는 곳이 없어 request_traces 가 끝없이 자랐다.
   6시간마다, 그리고 기동 뒤 첫 flush 때 한 번. 한 번에 5,000건씩 잘라 지워 잠금을 오래 잡지 않는다. */
let lastRetentionAt = 0;
let retentionRunning = false;
const RETENTION_EVERY_MS = 6 * 60 * 60 * 1000;
function maybeRunRetention() {
  if (retentionRunning) return;
  if (Date.now() - lastRetentionAt < RETENTION_EVERY_MS) return;
  lastRetentionAt = Date.now();
  void runRetention();
}
export async function runRetention() {
  if (retentionRunning) return null;
  retentionRunning = true;
  const t = config.trace || {};
  const days = Number(t.retentionDays) || 0;
  const maxRecords = Number(t.maxRecords) || 0;
  const result = { deletedTraces: 0, deletedSteps: 0, ranAt: Date.now(), days, maxRecords };
  try {
    if (db.isDbUnavailable?.()) return null;
    const adapter = db.currentAdapter?.();
    if (adapter !== 'mariadb' && adapter !== 'mysql') { stats.retention = { ...result, skipped: `adapter=${adapter}` }; return null; }
    if (days > 0) {
      const before = new Date(Date.now() - days * 86_400_000);
      for (let i = 0; i < 200; i++) {
        const r = await db.execute('DELETE FROM request_traces WHERE ts < :before_ts LIMIT 5000', { before_ts: before });
        result.deletedTraces += r.rowsAffected || 0;
        if ((r.rowsAffected || 0) < 5000) break;
      }
    }
    if (maxRecords > 0) {
      const c = await db.execute('SELECT COUNT(*) AS cnt FROM request_traces', {});
      const cnt = Number(c.rows?.[0]?.cnt || 0);
      if (cnt > maxRecords) {
        // 오래된 것부터 넘친 만큼 — 경계 시각을 구해 그 이전을 지운다
        const over = cnt - maxRecords;
        const b = await db.execute('SELECT ts FROM request_traces ORDER BY ts ASC LIMIT 1 OFFSET :off', { off: over });
        const boundary = b.rows?.[0]?.ts;
        if (boundary) {
          for (let i = 0; i < 200; i++) {
            const r = await db.execute('DELETE FROM request_traces WHERE ts < :b LIMIT 5000', { b: boundary });
            result.deletedTraces += r.rowsAffected || 0;
            if ((r.rowsAffected || 0) < 5000) break;
          }
        }
      }
    }
    if (result.deletedTraces > 0) {
      // 고아 단계 — 지운 추적의 단계들. NOT IN 서브쿼리 대신 조인으로, 잘라서
      for (let i = 0; i < 400; i++) {
        const r = await db.execute('DELETE s FROM request_steps s LEFT JOIN request_traces t ON t.request_id = s.request_id WHERE t.request_id IS NULL LIMIT 5000', {});
        result.deletedSteps += r.rowsAffected || 0;
        if ((r.rowsAffected || 0) < 5000) break;
      }
      logger.info(`[trace] retention — traces ${result.deletedTraces} · steps ${result.deletedSteps} deleted (keeping ${days} days · max ${maxRecords})`);
    }
    stats.retention = result;
    return result;
  } catch (e) {
    logger.warn(`[trace] retention failed (ignored): ${String(e.message).slice(0, 160)}`);
    stats.retention = { ...result, error: e.message };
    return null;
  } finally {
    retentionRunning = false;
  }
}

/** 시험용 — 단계를 강제로 되돌린다 */
export function __resetPressure() { level = LEVEL.NORMAL; calmStreak = 0; lastAnnounced = null; }

export default { enqueue, flush, drain, pending, pressure, shouldRecord, status, runRetention, maskSqlLiterals, LEVEL };
