/**
 * AccessLogService — 접속 통계 저장 / 조회 / 내보내기.
 *
 *  수집 경로:
 *   - metricsMiddleware 가 요청 완료 시 enqueueAccess(log) 호출
 *   - AdminAuthService / AuthService 가 로그인/로그아웃 시 recordLogin / recordLogout 호출
 *
 *  저장 전략:
 *   - 메모리 큐 → 주기적 배치 INSERT (FLUSH_INTERVAL_MS, 또는 큐 길이 BATCH_SIZE)
 *     → 요청 경로에는 DB I/O 지연이 전혀 붙지 않음
 *   - 서버 종료 시 flush 보장 (server.js SIGINT/SIGTERM 전)
 *
 *  테이블 부재(ER_NO_SUCH_TABLE) 내성:
 *   - 마이그레이션 적용 전이면 조용히 skip, 큐 버림 방지를 위해 임계치 초과 시 큐만 drop
 */
import { Service, Sql, Log } from '../../../src/core/decorators.js';
import { isActive } from '../../../src/core/ha/index.js';   // ★ v1.14.0 액티브 전용 작업 가드
import { revokeUser } from '../../../src/core/revokedUsers.js';   // ★ v1.11.9
import db from '../../../src/database/db.js';
import sseHub from '../../../src/core/sse.js';
import config from '../../../src/config/index.js';
import { parseDuration } from '../../../src/core/tokens.js';

/** 접속 기록 변경 알림 채널 — 콘솔 [접속 통계] 가 구독한다 */
export const ACCESS_CHANNEL = 'admin:access';

const FLUSH_INTERVAL_MS = 5_000;   // 5초마다 배치 flush (한가할 때의 안전망)
/* ★ v1.15.4 — 조용하다가 요청이 들어오면 **짧게 한 번 더** 비운다.
   예전에는 5초 주기만 있어서, 한 건을 보내고 그래프가 움직이기까지 최대 5초가 걸렸다
   ("SSE 인데 왜 바로 안 보이지?" 의 정체). 몰려 들어올 때는 어차피 배치 크기로 먼저 비워지므로
   DB 부담은 늘지 않는다. */
const QUICK_FLUSH_MS = 600;
/* 세션 활동 갱신 주기 — 요청마다 UPDATE 하면 DB 가 아깝다 */
const TOUCH_MIN_GAP_MS = Number(process.env.SESSION_TOUCH_GAP_MS) || 60_000;
/* 이만큼 아무 요청이 없으면 그 세션은 끝난 것으로 본다 (웹 분석의 30분 규칙) */
const SESSION_IDLE_MS = (Number(process.env.SESSION_IDLE_MIN) || 30) * 60_000;
/* 브라우저가 "숨겨졌다" 고 알린 뒤 이만큼 아무 요청이 없으면 닫는다 (탭 전환이면 돌아온다) */
const LEAVE_HINT_GRACE_MS = (Number(process.env.SESSION_LEAVE_GRACE_SEC) || 90) * 1_000;
/* 청소 주기 */
const SESSION_SWEEP_MS = 60_000;
/* 한 번에 닫는 최대 건수 — 밀린 것이 많아도 조금씩 나눠 처리한다 */
const SWEEP_LIMIT = Number(process.env.SESSION_SWEEP_LIMIT) || 500;
/* ★ v1.16.5 — 알림 간격을 **바쁠수록 늘린다**.
 *
 *  왜 고정값이 아닌가:
 *   · 조용할 때  — 한 건 보내고 화면이 바뀌길 기다리는 상황이다. 1.5초면 "바로" 로 느껴진다.
 *   · 바쁠 때    — 숫자가 어차피 계속 변한다. 10초에 한 번 갱신해도 사람 눈에는 똑같이 살아 있고,
 *                  그동안 화면이 돌리는 집계 쿼리는 1/7 로 줄어든다.
 *  그래서 최근 1분간 쌓인 건수를 보고 간격을 1.5초 ~ 10초 사이에서 자동으로 늘렸다 줄인다.
 *  (.env 로 조절: ACCESS_NOTIFY_MIN_MS · ACCESS_NOTIFY_MAX_MS · ACCESS_NOTIFY_BUSY_RPS) */
const NOTIFY_MIN_GAP_MS = Number(process.env.ACCESS_NOTIFY_MIN_MS) || 1_500;
const NOTIFY_MAX_GAP_MS = Number(process.env.ACCESS_NOTIFY_MAX_MS) || 10_000;
/** 이 정도 초당 건수부터 "바쁘다" 로 보고 간격을 최대까지 늘린다 */
const NOTIFY_BUSY_RPS = Number(process.env.ACCESS_NOTIFY_BUSY_RPS) || 20;
const BATCH_SIZE = 100;            // 큐가 이만큼 쌓이면 즉시 flush
const MAX_QUEUE = 5_000;           // 큐 최대 길이 (DB 장기 장애 대비)

const RETENTION_SWEEP_MS = 6 * 60 * 60 * 1000; // 6시간마다 오래된 로그 청소

@Service('AccessLogService')
export default class AccessLogService {

  @Sql('admin_access') accessSql;
  @Log log;

  constructor() {
    this._queue = [];
    this._flushTimer = null;
    this._retentionTimer = null;
    this._tablesMissing = false;
    this._lastMissingCheckAt = 0;
    this._flushing = false;
  }

  /* ============================================================
   *  수명 주기
   * ============================================================ */

  start() {
    if (!this._flushTimer) {
      this._flushTimer = setInterval(() => {
        /* ★ v1.14.3 — 대기(standby) 서버에서는 **로컬 DB 에 쓰지 않는다.**
           replica 에 로컬 쓰기가 생기면 그 서버 자신의 GTID 가 만들어져
           gtid_strict_mode 에서 복제가 통째로 멈춘다(실제 2대 검증에서 확인).
           대기 중 기록은 잃지만, 복제가 끊기는 것보다 낫다 — 액티브가 되면 다시 쌓인다. */
        if (!isActive()) return;
        this._flushQueue().catch((e) => this.log.warn(`[access] flush 실패: ${e.message}`));
      }, FLUSH_INTERVAL_MS);
      this._flushTimer.unref?.();
    }
    if (!this._retentionTimer) {
      this._sessionSweepTimer = setInterval(() => {
        if (!isActive()) return;                      // 이중화: 액티브에서만
        this.sweepIdleSessions().catch(() => {});
      }, SESSION_SWEEP_MS);
      this._sessionSweepTimer.unref?.();
      this._retentionTimer = setInterval(() => {
        /* ★ v1.14.0 — 액티브에서만. 두 대가 동시에 돌면 보관 정리가 두 번 일어난다
           (삭제 중복 · 경보 중복 발송). HA 가 꺼져 있으면 isActive() 는 항상 true 다. */
        if (!isActive()) return;
        this._sweepOld().catch((e) => this.log.debug(`[access] sweep 실패: ${e.message}`));
      }, RETENTION_SWEEP_MS);
      this._retentionTimer.unref?.();
    }
    this.log.info('[access] AccessLogService 시작 (배치 flush / retention sweep)');
  }

  async stop() {
    if (this._quickTimer) { clearTimeout(this._quickTimer); this._quickTimer = null; }
    if (this._notifyTimer) { clearTimeout(this._notifyTimer); this._notifyTimer = null; }
    if (this._flushTimer) { clearInterval(this._flushTimer); this._flushTimer = null; }
    if (this._sessionSweepTimer) { clearInterval(this._sessionSweepTimer); this._sessionSweepTimer = null; }
    if (this._retentionTimer) { clearInterval(this._retentionTimer); this._retentionTimer = null; }
    // 종료 전에 한 번 더 플러시
    try { await this._flushQueue(); } catch { /* noop */ }
  }

  /** 진단용: 현재 서비스 상태 */
  getStatus() {
    return {
      adapter: db.currentAdapter(),
      tablesMissing: this._tablesMissing,
      queueLength: this._queue.length,
      flushing: this._flushing,
      retentionDays: Math.max(1, parseInt(config.access?.retentionDays, 10) || 365),
    };
  }

  /* ============================================================
   *  1) 접근 로그 적재 (hot path — 지연 없이 큐에 push 만)
   * ============================================================ */

  /**
   * ★ v1.16.4 — 변경 알림을 **합쳐서** 보낸다.
   *
   *  왜: 신호 하나가 오면 콘솔은 [개요·타임라인·집계] 여러 쿼리를 다시 돌린다.
   *      요청이 초당 수십 건이면 배치도 그만큼 자주 돌고, 그때마다 알림이 나가
   *      **화면 수 × 쿼리 수** 만큼 DB 부하가 늘어난다. 정작 사람 눈에는
   *      1~2초에 한 번 갱신되면 충분하다.
   *
   *  어떻게: 마지막 알림에서 NOTIFY_MIN_GAP_MS 가 지나지 않았으면 보내지 않고,
   *      그 사이에 쌓인 건수를 모아 두었다가 한 번에 알린다(맨 뒤 한 번은 반드시 나간다).
   */
  /**
   * 지금 얼마나 바쁜지에 따라 알림 간격을 정한다.
   *  최근 60초 동안 쌓인 건수로 초당 건수를 어림하고, 0 → 최소 간격, BUSY_RPS 이상 → 최대 간격.
   *  중간은 비례해서 늘린다(갑자기 튀지 않게).
   */
  _notifyGapMs() {
    const now = Date.now();
    const win = (this._notifyWindow ||= []);
    while (win.length && now - win[0].at > 60_000) win.shift();
    const total = win.reduce((n, x) => n + x.n, 0);
    const rps = total / 60;
    const ratio = Math.min(1, rps / NOTIFY_BUSY_RPS);
    return Math.round(NOTIFY_MIN_GAP_MS + (NOTIFY_MAX_GAP_MS - NOTIFY_MIN_GAP_MS) * ratio);
  }

  _notifyChanged(inserted) {
    this._pendingInserted = (this._pendingInserted || 0) + inserted;
    (this._notifyWindow ||= []).push({ at: Date.now(), n: inserted });
    const now = Date.now();
    const gap = this._notifyGapMs();
    const since = now - (this._lastNotifyAt || 0);
    if (since >= gap) { this._emitChanged(gap); return; }
    if (this._notifyTimer) return;                      // 이미 예약돼 있으면 묶인다
    this._notifyTimer = setTimeout(() => {
      this._notifyTimer = null;
      this._emitChanged(gap);
    }, gap - since);
    this._notifyTimer.unref?.();
  }

  _emitChanged(gap = NOTIFY_MIN_GAP_MS) {
    const n = this._pendingInserted || 0;
    this._pendingInserted = 0;
    this._lastNotifyAt = Date.now();
    if (n <= 0) return;
    try {
      /* nextGapMs 를 함께 보내면 화면이 "다음 갱신까지 얼마나 남았는지" 를 알 수 있다 */
      sseHub.publish(ACCESS_CHANNEL, { inserted: n, at: new Date().toISOString(), nextGapMs: gap }, { event: 'access-changed' });
    } catch { /* 알림 실패는 로그 적재에 영향을 주지 않는다 */ }
  }

  /** 조용할 때 들어온 첫 건을 위해 짧은 1회성 타이머를 건다 */
  _scheduleQuickFlush() {
    if (this._quickTimer || this._flushing) return;
    this._quickTimer = setTimeout(() => {
      this._quickTimer = null;
      this._flushQueue().catch(() => {});   // ⚠ 이름은 _flushQueue 다 (_flush 로 쓰면 조용히 실패한다)
    }, QUICK_FLUSH_MS);
    this._quickTimer.unref?.();
  }

  enqueueAccess(entry) {
    if (!entry) return;
    if (this._queue.length >= MAX_QUEUE) {
      // 큐가 포화 → 가장 오래된 항목 버리기
      this._queue.shift();
    }
    this._queue.push(entry);
    if (this._queue.length >= BATCH_SIZE) {
      // 즉시 flush (비동기)
      this._flushQueue().catch(() => { /* noop */ });
    }
    this._scheduleQuickFlush();
  }

  async _flushQueue() {
    if (this._flushing) return;
    if (this._queue.length === 0) return;
    if (this._tablesMissing) {
      // 테이블 부재 상태에서는 주기적으로만 재확인. 그동안 큐는 버린다 (폭주 방지).
      const now = Date.now();
      if (now - this._lastMissingCheckAt > 60_000) {
        this._lastMissingCheckAt = now;
        try {
          // 1건 테스트 INSERT → 성공하면 테이블 복구됨
          const sample = this._queue[0];
          await db.execute(this.accessSql.get('insertAccessLog'), sample);
          this._tablesMissing = false;
          this._queue.shift(); // 이미 INSERT 됨
        } catch (e) {
          if (isMissingTableError(e)) {
            // 여전히 부재 → 큐 비우기
            this._queue.length = 0;
            return;
          }
          // 다른 에러 → 큐 유지, 다음 주기에 재시도
        }
      } else {
        return;
      }
    }

    this._flushing = true;
    const batch = this._queue.splice(0, BATCH_SIZE);
    let inserted = 0;
    try {
      for (const entry of batch) {
        try {
          await db.execute(this.accessSql.get('insertAccessLog'), entry);
          inserted += 1;
        } catch (e) {
          if (isMissingTableError(e)) {
            this._tablesMissing = true;
            this._lastMissingCheckAt = Date.now();
            // 남은 배치도 버림
            return;
          }
          this.log.debug(`[access] insert 실패: ${e.message}`);
        }
      }
    } finally {
      this._flushing = false;
      // 실제로 새 접속 기록이 들어갔을 때만 콘솔에 알린다.
      //   [접속 통계] 화면은 이 신호를 받고 나서 화면을 새로 읽는다 (예전에는 10초마다 무조건 다시 읽었음).
      //   → 아무도 접속하지 않는 동안에는 집계 쿼리가 한 건도 실행되지 않는다.
      if (inserted > 0) this._notifyChanged(inserted);
    }
  }

  async _sweepOld() {
    if (this._tablesMissing) return;
    // 1) 보관 기간 초과분 삭제 — config.access.retentionDays 기본 365일
    const days = Math.max(1, parseInt(config.access?.retentionDays, 10) || 365);
    const beforeTs = new Date(Date.now() - days * 24 * 3600 * 1000);
    for (const key of ['deleteOldAccessLogs', 'deleteOldLoginEvents', 'deleteOldSessions']) {
      try {
        await db.execute(this.accessSql.get(key), { before_ts: beforeTs });
      } catch (e) {
        if (isMissingTableError(e)) { this._tablesMissing = true; return; }
        this.log.debug(`[access] ${key} 실패: ${e.message}`);
      }
    }

    // 2) 레코드 수 한도 초과 시 오래된 것부터 삭제 — config.access.maxRecords (0 = 무제한)
    const maxRecords = parseInt(config.access?.maxRecords, 10);
    if (Number.isFinite(maxRecords) && maxRecords > 0) {
      try {
        const r = await db.execute(this.accessSql.get('countAccessLogs'), {});
        const total = Number(r.rows?.[0]?.c ?? 0);
        if (total > maxRecords) {
          const excess = total - maxRecords;
          await db.execute(this.accessSql.get('deleteOldestAccessLogs'), { lim: excess });
          this.log.info(`[access] maxRecords(${maxRecords}) 초과 → 오래된 ${excess}건 삭제 (이전 total=${total})`);
        }
      } catch (e) {
        if (isMissingTableError(e)) { this._tablesMissing = true; return; }
        this.log.debug(`[access] maxRecords 정리 실패: ${e.message}`);
      }
    }
  }

  /* ============================================================
   *  2) 로그인 / 세션
   * ============================================================ */

  /* ══════════════════════════════════════════════════════════════════
   *  ★ v1.18.0 — 세션이 "언제 끝났는지" 알아내기
   *
   *  브라우저를 그냥 닫으면 서버는 알 수 없다. 조사해 보면(MDN·Chrome Page Lifecycle·
   *  Firefox bug 1609653) 결론은 한결같다: **브라우저가 보내는 종료 신호는 신뢰할 수 없다.**
   *   · beforeunload/unload — 모바일에서 안 뜨고 bfcache 를 깨뜨린다 (쓰면 안 된다)
   *   · pagehide + sendBeacon — 브라우저를 끄면 실패하는 사례가 보고돼 있다
   *   · visibilitychange(hidden) — 가장 잘 오지만 **탭 전환에서도** 온다
   *
   *  그래서 이렇게 나눈다.
   *   ① 요청이 올 때마다 last_seen_at 을 남긴다 — 이것이 "언제까지 썼나" 의 근거
   *   ② 브라우저 힌트는 **참고만** 한다 (leave_hint_at) — 돌아오면 지워진다
   *   ③ **무활동 청소가 진짜 기준** — 일정 시간 요청이 없으면 닫는다.
   *      끝난 시각은 NOW() 가 아니라 **마지막 활동 시각**으로 잡는다.
   *      (웹 분석에서 30분 무활동을 한 세션의 끝으로 보는 것과 같은 방식)
   * ══════════════════════════════════════════════════════════════════ */

  /** 요청 한 건마다 부른다. DB 를 매번 때리지 않도록 TOUCH_MIN_GAP 안에서는 건너뛴다. */
  async touchSession(userId, username = null) {
    if (!userId || this._tablesMissing) return;
    const now = new Date();
    const last = this._touched?.get(userId) || 0;
    if (now.getTime() - last < TOUCH_MIN_GAP_MS) return;
    (this._touched ||= new Map()).set(userId, now.getTime());
    if (this._touched.size > 5_000) this._touched.clear();     // 오래된 것은 통째로 비운다
    try {
      const r = await db.execute(this.accessSql.get('touchSession'), {
        user_id: userId, now,
        stale_before: new Date(now.getTime() - TOUCH_MIN_GAP_MS),
      });
      if ((r.rowsAffected || 0) > 0) return;

      /* ★ v1.18.0 — 갱신할 열린 세션이 없다 = 무활동으로 닫힌 뒤 **돌아왔다**.
         이때는 닫힌 것을 되살리지(연장하지) 않고 **새 방문을 연다.**
         되살리면 비어 있던 시간까지 체류시간에 들어가기 때문이다.
         (웹 분석에서 30분 끊긴 뒤의 재방문을 새 세션으로 세는 것과 같다.
          로그인은 그대로 유지된다 — 여기서 다루는 것은 "머문 시간" 이지 인증이 아니다.) */
      const open = await db.execute(this.accessSql.get('countOpenSessions'), { user_id: userId });
      if (Number(open.rows?.[0]?.n || 0) > 0) return;
      await db.execute(this.accessSql.get('insertUserSession'), {
        user_id: userId, username: username || null, session_kind: 'resumed',
        started_at: now, ip: null, user_agent: null,
      });
      this.log?.debug?.(`[access] 다시 활동 시작 — 새 방문 기록 (user_id=${userId})`);
    } catch { /* 기록용이라 조용히 */ }
  }

  /** 화면이 숨겨졌다는 힌트 — 바로 끝내지 않는다(탭 전환일 수 있다) */
  async markLeaveHint(userId) {
    if (!userId || this._tablesMissing) return;
    try { await db.execute(this.accessSql.get('markLeaveHint'), { user_id: userId, now: new Date() }); }
    catch { /* noop */ }
  }

  /** 무활동 세션 닫기 — 주기적으로 돈다 */
  async sweepIdleSessions() {
    if (this._tablesMissing) return { closed: 0 };
    const now = Date.now();
    try {
      /* 한 번에 세 갈래를 각각 인덱스로 훑는다 (조건을 OR 로 합치면 인덱스를 못 탄다).
         한도(SWEEP_LIMIT)로 묶어, 처음 켰을 때 밀린 것이 한꺼번에 잠기지 않게 한다. */
      const idleBefore = new Date(now - SESSION_IDLE_MS);
      const r1 = await db.execute(this.accessSql.get('sweepIdleSessions'),
        { idle_before: idleBefore, lim: SWEEP_LIMIT });
      const r2 = await db.execute(this.accessSql.get('sweepLeaveHinted'),
        { hint_before: new Date(now - LEAVE_HINT_GRACE_MS), lim: SWEEP_LIMIT });
      const r3 = await db.execute(this.accessSql.get('sweepIdleLegacy'),
        { idle_before: idleBefore, lim: SWEEP_LIMIT });
      const closed = (r1.rowsAffected || 0) + (r2.rowsAffected || 0) + (r3.rowsAffected || 0);
      if (closed > 0) this.log?.info?.(`[access] 무활동 세션 ${closed}건 정리 (마지막 활동 시각으로 종료)`);
      return { closed };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; }
      return { closed: 0 };
    }
  }

  /** 로그인 성공 시 호출. session row 생성 + login_event 기록. 반환: { sessionId } */
  async recordLogin({ userId, username, sessionKind = 'user', ip = null, userAgent = null } = {}) {
    try {
      const now = new Date();
      const insertSess = await db.execute(this.accessSql.get('insertUserSession'), {
        user_id: userId,
        username,
        session_kind: sessionKind,
        started_at: now,
        ip,
        user_agent: userAgent,
      });
      const sessionId = insertSess.insertId || null;
      await db.execute(this.accessSql.get('insertLoginEvent'), {
        ts: now,
        user_id: userId,
        username,
        session_kind: sessionKind,
        event_type: 'login',
        session_id: sessionId,
        ip,
        user_agent: userAgent,
      });
      return { sessionId };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return { sessionId: null }; }
      this.log.debug(`[access] recordLogin 실패: ${e.message}`);
      return { sessionId: null };
    }
  }

  async recordLoginFailed({ userId = null, username, sessionKind = 'user', ip = null, userAgent = null } = {}) {
    try {
      await db.execute(this.accessSql.get('insertLoginEvent'), {
        ts: new Date(),
        user_id: userId,
        username,
        session_kind: sessionKind,
        event_type: 'login_failed',
        session_id: null,
        ip,
        user_agent: userAgent,
      });
    } catch (e) {
      if (isMissingTableError(e)) this._tablesMissing = true;
      else this.log.debug(`[access] recordLoginFailed 실패: ${e.message}`);
    }
  }

  /** 로그아웃. sessionId 가 있으면 해당 세션만 종료, 없으면 user 의 가장 최근 미종료 세션 1건만 종료. all=true 면 전체. */
  async recordLogout({ userId, username, sessionKind = 'user', sessionId = null, all = false, ip = null, userAgent = null } = {}) {
    const now = new Date();
    try {
      let closedSessionId = sessionId;
      if (all) {
        // 전체 세션 종료 (logoutAll)
        await db.execute(this.accessSql.get('endUserSessionsByUser'), { user_id: userId, ended_at: now });
      } else if (sessionId) {
        await db.execute(this.accessSql.get('endUserSession'), { id: sessionId, ended_at: now });
      } else {
        // sessionId 를 모를 때: 가장 최근 열린 세션 1건만 종료 (다른 기기 세션 보호)
        const r = await db.execute(this.accessSql.get('findLatestOpenSession'), { user_id: userId });
        const latest = r.rows?.[0]?.id ?? null;
        if (latest) {
          closedSessionId = latest;
          await db.execute(this.accessSql.get('endUserSession'), { id: latest, ended_at: now });
        }
        // 열린 세션이 없으면 logout 이벤트만 기록하고 넘어감 (세션 누락 대비)
      }
      await db.execute(this.accessSql.get('insertLoginEvent'), {
        ts: now,
        user_id: userId,
        username,
        session_kind: sessionKind,
        event_type: all ? 'logout_all' : 'logout',
        session_id: closedSessionId,
        ip,
        user_agent: userAgent,
      });
    } catch (e) {
      if (isMissingTableError(e)) this._tablesMissing = true;
      else this.log.debug(`[access] recordLogout 실패: ${e.message}`);
    }
  }

  /**
   * 관리자가 특정 세션을 강제로 종료.
   *   - user_sessions 의 ended_at / duration_sec 을 지금으로 설정
   *   - refresh_tokens 중 (현재 user 의) 미폐기 토큰을 폐기 → 실제 로그인도 무효화
   *   - login_events 에 event_type = 'force_logout' 으로 감사 기록
   *  @param sessionId        종료할 세션 id
   *  @param actorUsername    강제종료를 실행한 관리자 (감사용)
   */
  async forceEndSession({ sessionId, actorUsername = null } = {}) {
    if (!sessionId) throw Object.assign(new Error('sessionId is required'), { status: 400 });
    if (this._tablesMissing) {
      throw Object.assign(new Error('access log tables are missing'), { status: 503 });
    }
    const now = new Date();
    try {
      // 1) 해당 세션을 조회해서 user / 종류 확인
      const r = await db.execute(this.accessSql.get('findSessionById'), { id: sessionId });
      const s = r.rows?.[0];
      if (!s) throw Object.assign(new Error('session not found'), { status: 404 });
      if (s.ended_at) throw Object.assign(new Error('session already ended'), { status: 409 });

      // 2) user_sessions 종료
      await db.execute(this.accessSql.get('endUserSession'), { id: sessionId, ended_at: now });

      // 3) 실제 로그인 무효화: refresh_tokens 중 해당 user 의 미폐기 토큰 모두 폐기
      //     admin / user 두 테이블 중 session_kind 로 구분. revokeAllUserTokens 가 존재함.
      try {
        const authSqlKey = s.session_kind === 'admin' ? 'admin_auth' : 'auth';
        // authSql 을 우리가 직접 @Sql 로 가지고 있지 않으므로 container 통해 AuthService 를 불러 호출
        const container = await import('../../../src/core/container.js').then(m => m.default);
        const svcName = s.session_kind === 'admin' ? 'AdminAuthService' : 'AuthService';
        if (container.has(svcName)) {
          const svc = container.resolve(svcName);
          if (typeof svc.logoutAll === 'function') {
            await svc.logoutAll(s.user_id);
          }
        }
        void authSqlKey;  // (현재 로직에선 직접 사용하지 않지만, 향후 확장 대비)
        /* ★ v1.11.9 — refresh 만 폐기하면 **이미 발급된 access 토큰(기본 15분)** 으로 계속 쓸 수 있다.
           실행 검증에서 강제 종료 뒤에도 그 사람의 API 호출이 200 이었다. 지금 있는 토큰도 막는다.
           ⚠ 이 사람의 **다른 기기까지** 함께 끊긴다 — 화면 문구로 알린다. */
        revokeUser(s.user_id);
      } catch (e) {
        this.log.warn(`[access] forceEndSession 토큰 폐기 실패 (세션은 종료됨): ${e.message}`);
      }

      // 4) 감사 이벤트
      await db.execute(this.accessSql.get('insertLoginEvent'), {
        ts: now,
        user_id: s.user_id,
        username: s.username,
        session_kind: s.session_kind || 'user',
        event_type: 'force_logout',
        session_id: sessionId,
        ip: null,
        user_agent: actorUsername ? `forced-by:${actorUsername}` : 'forced',
      });

      return { ok: true, sessionId, username: s.username, tokensRevoked: true, note: '이 사용자의 모든 기기에서 로그아웃됩니다' };
    } catch (e) {
      if (e.status) throw e;
      if (isMissingTableError(e)) { this._tablesMissing = true; throw Object.assign(new Error('access log tables are missing'), { status: 503 }); }
      throw e;
    }
  }

  /* ============================================================
   *  3) 조회 API
   * ============================================================ */

  /** 기간 {fromMs, toMs} 를 Date 로 정규화 (from 없으면 24시간 전, to 없으면 now) */
  _range({ fromMs, toMs } = {}) {
    const to = new Date(parseInt(toMs, 10) || Date.now());
    const from = new Date(parseInt(fromMs, 10) || (to.getTime() - 24 * 3600 * 1000));
    return { from_ts: from, to_ts: to };
  }

  async getOverview({ fromMs, toMs } = {}) {
    if (this._tablesMissing) return { tablesMissing: true };
    const range = this._range({ fromMs, toMs });
    try {
      const [total, err, users, paths] = await Promise.all([
        db.execute(this.accessSql.get('countTotal'),          range),
        db.execute(this.accessSql.get('countErrors'),         range),
        db.execute(this.accessSql.get('countDistinctUsers'),  range),
        db.execute(this.accessSql.get('countDistinctPaths'),  range),
      ]);
      return {
        from: range.from_ts, to: range.to_ts,
        totalRequests:  total.rows[0]?.c ?? 0,
        errorRequests:  err.rows[0]?.c ?? 0,
        distinctUsers:  users.rows[0]?.c ?? 0,
        distinctPaths:  paths.rows[0]?.c ?? 0,
      };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return { tablesMissing: true }; }
      throw e;
    }
  }

  /**
   * ★ v1.13.0 — 컨트롤러별 접속 통계.
   *   "어떤 기능을 누가 얼마나 썼나" 를 볼 때는 경로(method+path)보다 컨트롤러 단위가 읽기 쉽다.
   *   username 을 주면 그 사람만 본다.
   */
  async getSummaryByController({ fromMs, toMs, limit = 200, offset = 0, excludeAdmin = false, username = null } = {}) {
    if (this._tablesMissing) return { rows: [], total: 0, tablesMissing: true };
    const range = this._range({ fromMs, toMs });
    const lim = clampInt(limit, 1, 1000, 200);
    const off = Math.max(0, parseInt(offset, 10) || 0);
    try {
      const r = await db.execute(this.accessSql.get('summaryByController'), {
        ...range, lim, off, username: username || null, exclude_admin: excludeAdmin ? 1 : 0,
      });
      const rows = (r.rows || []).map(normalizeRow);
      return { rows, total: rows.length, range };
    } catch (e) {
      this.log.warn(`[access] 컨트롤러별 집계 실패: ${e.message}`);
      return { rows: [], total: 0, error: e.message };
    }
  }

  async getSummaryByPath({ fromMs, toMs, limit = 200, offset = 0, excludeAdmin = false } = {}) {
    if (this._tablesMissing) return { rows: [], total: 0, tablesMissing: true };
    const range = this._range({ fromMs, toMs });
    const lim = clampInt(limit, 1, 1000, 200);
    const off = Math.max(0, parseInt(offset, 10) || 0);
    const rowsKey  = excludeAdmin ? 'summaryByPathExcludeAdmin' : 'summaryByPath';
    const countKey = excludeAdmin ? 'summaryByPathCountExcludeAdmin' : 'summaryByPathCount';
    try {
      const [rowsR, countR] = await Promise.all([
        db.execute(this.accessSql.get(rowsKey),  { ...range, lim, off }),
        db.execute(this.accessSql.get(countKey), { ...range }),
      ]);
      return {
        rows:  (rowsR.rows  || []).map(normalizeRow),
        total: Number(countR.rows?.[0]?.c ?? 0),
      };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return { rows: [], total: 0, tablesMissing: true }; }
      throw e;
    }
  }

  async getSummaryByUser({ fromMs, toMs, limit = 200, offset = 0 } = {}) {
    if (this._tablesMissing) return { rows: [], total: 0, tablesMissing: true };
    const range = this._range({ fromMs, toMs });
    const lim = clampInt(limit, 1, 1000, 200);
    const off = Math.max(0, parseInt(offset, 10) || 0);
    try {
      const [rowsR, countR] = await Promise.all([
        db.execute(this.accessSql.get('summaryByUser'),      { ...range, lim, off }),
        db.execute(this.accessSql.get('summaryByUserCount'), { ...range }),
      ]);
      return {
        rows:  (rowsR.rows  || []).map(normalizeRow),
        total: Number(countR.rows?.[0]?.c ?? 0),
      };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return { rows: [], total: 0, tablesMissing: true }; }
      throw e;
    }
  }

  /**
   * 세션 TTL 을 초 단위로 반환. refresh token 수명 기준.
   *   사용자가 마지막 활동 이후 최소 이만큼은 세션이 살아있을 수 있으며,
   *   이 시간을 넘기면 재인증 없이 사용 불가 → "활성" 에서 제외.
   */
  _sessionTtlSec() {
    try {
      return Math.max(60, Math.floor(parseDuration(config.auth?.refreshTokenTtl || '7d') / 1000));
    } catch {
      return 7 * 86400;  // fallback 7 days
    }
  }

  /** 활성(미종료 & TTL 내) 세션 리스트 */
  async getActiveSessions({ fromMs, toMs, username = null, limit = 200, offset = 0 } = {}) {
    if (this._tablesMissing) return { rows: [], total: 0, tablesMissing: true };
    const range = this._range({ fromMs, toMs });
    const lim = clampInt(limit, 1, 1000, 200);
    const off = Math.max(0, parseInt(offset, 10) || 0);
    const ttl_sec = this._sessionTtlSec();

    try {
      // 0) Lazy-close: TTL 이 지났는데 아직 종료 안된 세션을 먼저 정리.
      //    이렇게 해두면 다음 조회부터는 "ended_at IS NULL" 조건만으로도 정확하지만,
      //    race condition 방지를 위해 조회 쿼리에도 TTL 조건을 함께 둔다.
      try {
        await db.execute(this.accessSql.get('lazyCloseExpiredSessions'), { ttl_sec });
      } catch (e) {
        // Lazy-close 실패는 치명적이지 않음 — 로그만 남기고 조회는 계속.
        this.log?.warn?.(`[access] lazyCloseExpiredSessions 실패(무시): ${e.message}`);
      }

      const params = { ...range, username: username || null, lim, off, ttl_sec };
      const [rowsR, countR] = await Promise.all([
        db.execute(this.accessSql.get('activeSessionsPaged'), params),
        db.execute(this.accessSql.get('activeSessionsCount'), params),
      ]);
      return {
        rows: (rowsR.rows || []).map(normalizeRow),
        total: Number(countR.rows?.[0]?.c ?? 0),
      };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return { rows: [], total: 0, tablesMissing: true }; }
      throw e;
    }
  }

  async getPathsByUser({ fromMs, toMs, username, limit = 200, offset = 0, excludeAdmin = false } = {}) {
    if (!username) return { rows: [] };
    if (this._tablesMissing) return { rows: [], tablesMissing: true };
    const range = this._range({ fromMs, toMs });
    const lim = clampInt(limit, 1, 1000, 200);
    const off = Math.max(0, parseInt(offset, 10) || 0);
    try {
      const r = await db.execute(this.accessSql.get('pathsByUser'), { exclude_admin: excludeAdmin ? 1 : 0,
        ...range, username, lim, off,
      });
      return { rows: r.rows || [] };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return { rows: [], tablesMissing: true }; }
      throw e;
    }
  }

  async getTimeline({ fromMs, toMs, bucket = 'hour' } = {}) {
    if (this._tablesMissing) return { rows: [], bucket, tablesMissing: true };
    const range = this._range({ fromMs, toMs });
    /* ★ v1.15.0 — 10분·30분 단위 추가. 최근 상황은 시간 단위로는 너무 굵다. */
    const byBucket = { day: 'timelineDay', '10min': 'timeline10min', '30min': 'timeline30min' };
    const key = byBucket[bucket] || 'timelineHour';
    const extra = {};
    try {
      const r = await db.execute(this.accessSql.get(key), { ...range, ...extra });
      return { rows: r.rows || [], bucket };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return { rows: [], bucket, tablesMissing: true }; }
      throw e;
    }
  }

  async getLogs({ fromMs, toMs, username = null, path = null, limit = 100, offset = 0 } = {}) {
    if (this._tablesMissing) return { rows: [], total: 0, tablesMissing: true };
    const range = this._range({ fromMs, toMs });
    const lim = clampInt(limit, 1, 1000, 100);
    const off = Math.max(0, parseInt(offset, 10) || 0);
    const params = {
      ...range,
      username: username || null,
      path:     path     || null,
      lim, off,
    };
    try {
      const [rowsR, countR] = await Promise.all([
        db.execute(this.accessSql.get('logsPaged'), params),
        db.execute(this.accessSql.get('logsCount'), params),
      ]);
      return {
        rows: rowsR.rows || [],
        total: countR.rows[0]?.c ?? 0,
      };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return { rows: [], total: 0, tablesMissing: true }; }
      throw e;
    }
  }

  async getLoginStats({ fromMs, toMs, limit = 200, offset = 0 } = {}) {
    if (this._tablesMissing) return { loginByUser: [], sessionByUser: [], tablesMissing: true };
    const range = this._range({ fromMs, toMs });
    const lim = clampInt(limit, 1, 1000, 200);
    const off = Math.max(0, parseInt(offset, 10) || 0);
    try {
      const [login, sess] = await Promise.all([
        db.execute(this.accessSql.get('loginStatsByUser'),   { ...range, lim, off }),
        db.execute(this.accessSql.get('sessionStatsByUser'), { ...range, lim, off }),
      ]);
      return {
        loginByUser: (login.rows || []).map(r => ({ ...r, last_login_ts: fmtTs(r.last_login_ts) })),
        sessionByUser: sess.rows || [],
      };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return { loginByUser: [], sessionByUser: [], tablesMissing: true }; }
      throw e;
    }
  }

  async getSessions({ fromMs, toMs, username = null, limit = 200, offset = 0 } = {}) {
    if (this._tablesMissing) return { rows: [], total: 0, tablesMissing: true };
    const range = this._range({ fromMs, toMs });
    const lim = clampInt(limit, 1, 1000, 200);
    const off = Math.max(0, parseInt(offset, 10) || 0);
    const params = { ...range, username: username || null, lim, off };
    try {
      // 활성 세션 조회와 동일한 lazy-close 를 수행하여 세션 목록에서도 TTL 지난 세션은
      // '종료됨' 으로 보이도록 한다 (duration_sec 도 TTL 로 채워짐).
      try {
        await db.execute(this.accessSql.get('lazyCloseExpiredSessions'), { ttl_sec: this._sessionTtlSec() });
      } catch (e) {
        this.log?.warn?.(`[access] lazyCloseExpiredSessions 실패(무시): ${e.message}`);
      }
      const [rowsR, countR] = await Promise.all([
        db.execute(this.accessSql.get('sessionsPaged'), params),
        db.execute(this.accessSql.get('sessionsCount'), params),
      ]);
      return { rows: rowsR.rows || [], total: countR.rows[0]?.c ?? 0 };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return { rows: [], total: 0, tablesMissing: true }; }
      throw e;
    }
  }

  /* ============================================================
   *  4) CSV 내보내기 — 결과 데이터를 CSV 문자열로 직렬화
   * ============================================================ */

  async exportCsv(opts = {}) {
    const { header, rows } = await this._exportRows(opts);
    return toCsv(header, rows);
  }

  /** 내보내기용 행 만들기 — CSV·엑셀이 같은 데이터를 쓴다 */
  async _exportRows({ kind, fromMs, toMs, username = null, path = null, excludeAdmin = false } = {}) {
    void path;
    // 큰 데이터셋도 지원: 한 번에 5000 행 제한 (이 이상은 여러 기간으로 분할해서 받도록 안내)
    const MAX = 5000;
    let rows = [];
    let header = [];
    switch (kind) {
      case 'byController': {
        const r = await this.getSummaryByController({ fromMs, toMs, limit: MAX, offset: 0, excludeAdmin, username });
        rows = r.rows || [];
        header = ['controller','count','distinct_routes','distinct_users','err_count','fail_count','avg_ms','max_ms','first_ts','last_ts'];
        break;
      }
      case 'byPath': {
        const r = await this.getSummaryByPath({ fromMs, toMs, limit: MAX, offset: 0, excludeAdmin });
        rows = r.rows || [];
        header = ['method','path','route_key','controller','handler','count','err_count','avg_ms','max_ms','min_ms','distinct_users'];
        break;
      }
      case 'byUser': {
        const r = await this.getSummaryByUser({ fromMs, toMs, limit: MAX, offset: 0 });
        rows = r.rows || [];
        header = ['username','user_id','session_kind','count','err_count','avg_ms','max_ms','distinct_paths','first_ts','last_ts'];
        break;
      }
      case 'timeline': {
        const r = await this.getTimeline({ fromMs, toMs, bucket: 'hour' });
        rows = r.rows || [];
        header = ['bucket','count','err_count','distinct_users'];
        break;
      }
      case 'logs': {
        const r = await this.getLogs({ fromMs, toMs, username, path, limit: MAX, offset: 0 });
        rows = r.rows || [];
        header = ['ts','username','method','path','route_key','status','duration_ms','ip','user_agent'];
        break;
      }
      case 'sessions': {
        const r = await this.getSessions({ fromMs, toMs, username, limit: MAX, offset: 0 });
        rows = r.rows || [];
        header = ['started_at','ended_at','duration_sec','username','session_kind','ip','user_agent'];
        break;
      }
      case 'loginStats': {
        const r = await this.getLoginStats({ fromMs, toMs, limit: MAX, offset: 0 });
        rows = r.loginByUser || [];
        header = ['username','user_id','session_kind','login_count','failed_count','logout_count','last_login_ts'];
        break;
      }
      default:
        throw Object.assign(new Error(`unknown export kind: ${kind}`), { status: 400 });
    }
    return { header, rows };
  }

  /**
   * ★ v1.13.0 — 같은 내용을 **엑셀 파일(.xlsx)** 로.
   *   CSV 는 엑셀에서 열 때 한글이 깨지거나 긴 숫자가 지수로 바뀌는 일이 잦아
   *   "엑셀로 받기" 를 따로 둔다. 시트 이름·열 너비까지 맞춰 바로 볼 수 있게 한다.
   * @returns {Buffer}
   */
  async exportXlsx({ kind, fromMs, toMs, username = null, excludeAdmin = false } = {}) {
    const { header, rows } = await this._exportRows({ kind, fromMs, toMs, username, excludeAdmin });
    const XLSX = await import('xlsx');
    const aoa = [header, ...rows.map((r) => header.map((h) => {
      const v = r[h] ?? r[h.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] ?? '';
      return v instanceof Date ? v.toISOString().replace('T', ' ').slice(0, 19) : v;
    }))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = header.map((h) => ({ wch: Math.min(40, Math.max(10, h.length + 4)) }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: header.length - 1 } }) };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, kind.slice(0, 28));
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /* ============================================================
   *  내부 헬퍼
   * ============================================================ */

  async _paged(sqlKey, { fromMs, toMs, limit = 200, offset = 0 } = {}) {
    if (this._tablesMissing) return { rows: [], tablesMissing: true };
    const range = this._range({ fromMs, toMs });
    const lim = clampInt(limit, 1, 1000, 200);
    const off = Math.max(0, parseInt(offset, 10) || 0);
    try {
      const r = await db.execute(this.accessSql.get(sqlKey), { ...range, lim, off });
      return { rows: (r.rows || []).map(normalizeRow) };
    } catch (e) {
      if (isMissingTableError(e)) { this._tablesMissing = true; return { rows: [], tablesMissing: true }; }
      throw e;
    }
  }
}

/* ── helpers ── */

function isMissingTableError(e) {
  if (!e) return false;
  if (e.errno === 1146) return true;
  if (e.code === 'ER_NO_SUCH_TABLE') return true;
  if (e.sqlState === '42S02') return true;
  const msg = String(e.message || '');
  return /doesn'?t exist/i.test(msg) && /table/i.test(msg);
}

function clampInt(v, min, max, dft) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dft;
  return Math.max(min, Math.min(max, n));
}

function fmtTs(v) {
  if (!v) return null;
  if (v instanceof Date) {
    return v.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false }).replace('T', ' ');
  }
  return String(v);
}

function normalizeRow(r) {
  const out = { ...r };
  for (const k of Object.keys(out)) {
    if (out[k] instanceof Date) out[k] = fmtTs(out[k]);
    else if (typeof out[k] === 'bigint') out[k] = Number(out[k]);
  }
  return out;
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = (v instanceof Date) ? fmtTs(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(header, rows) {
  const lines = [];
  lines.push(header.map(csvEscape).join(','));
  for (const row of rows) {
    lines.push(header.map((h) => csvEscape(row[h])).join(','));
  }
  return '\uFEFF' + lines.join('\r\n');  // BOM + CRLF (엑셀 호환)
}
