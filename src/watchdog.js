/**
 * watchdog.js — supervisor 가 메인 서버의 **생존**을 감시하고, 죽었거나 멈췄으면 다시 띄운다.
 *
 *  왜 있는가
 *    MCI 장애 때 메인 서버가 통째로 멈췄는데, 사람이 재시작할 때까지 **몇 시간**이 그대로 갔다.
 *    프로세스는 살아 있었으므로(포트도 열려 있었으므로) "죽으면 다시 띄운다" 식의 감시로는
 *    잡히지 않는다. 살아 있는지가 아니라 **응답하는지**를 봐야 한다.
 *
 *  무엇을 보는가
 *    GET /health/live — DB 를 보지 않는다. 이 응답이 나온다는 것은 이벤트 루프가 돌고 있고
 *    accept 가 되고 있다는 뜻이다. 반대로 이것이 안 나오면 (타임아웃 · 연결 거부 · 5xx)
 *    무슨 이유든 **이 프로세스로는 아무 요청도 처리되지 않는다.**
 *
 *  언제 재기동하는가
 *    · 연속 `failures` 회 무응답 (기본 10초 × 6 = 약 1분)         → reason 'unresponsive'
 *    · 메인이 스스로 죽음 (exit code≠0, 신호) — restartOnExit 일 때  → reason 'exit'
 *    · 사람이 control API 로 멈춘 것은 재기동하지 않는다 (expectedExit)
 *
 *  무한 반복 방지
 *    · 재기동 사이 최소 간격 (minRestartIntervalMs)
 *    · 한 시간에 maxRestartsPerHour 를 넘으면 **멈추고 사람을 부른다** (halted).
 *      control API 로 start/restart 하면 다시 감시한다.
 *
 *  재기동 전 진단
 *    · 왜 재기동하는지, 마지막 확인이 어떻게 실패했는지(타임아웃/거부/상태코드), 몇 초 동안
 *      무응답이었는지, 자식 프로세스의 메모리(Linux 는 /proc) 를 로그에 남긴다
 *    · ★ hangDump — 멈춘 프로세스의 인스펙터를 밖에서 켜고 Debugger.pause 로 **멈춘 지점의 JS 스택**을
 *      받는다 (src/hangDump.js). 이벤트 루프가 막혀 있어도 된다 — 인스펙터는 별도 스레드이고
 *      pause 는 인터럽트다. 같은 김에 process.report 도 파일로 남긴다. POSIX·Windows 모두.
 *      (SIGUSR2 + --report-on-signal 은 쓰지 않는다: 실측 결과 보고서가 루프가 풀린 뒤에야 써졌다.)
 *
 *  기록
 *    이벤트를 <logDir>/supervisor-events.jsonl 에 한 줄씩 남기고, 기동 때 마지막 50건을 읽어
 *    콘솔 대시보드가 supervisor 를 다시 띄운 뒤에도 이력을 볼 수 있게 한다.
 */
import transport from './core/transport.cjs';
import fs from 'node:fs';
import path from 'node:path';
import { dumpHungProcess } from './hangDump.js';

export const WATCHDOG_DEFAULTS = Object.freeze({
  enabled: true,
  intervalMs: 10_000,
  timeoutMs: 3_000,
  failures: 6,
  restartOnExit: true,
  minRestartIntervalMs: 30_000,
  maxRestartsPerHour: 10,
  historyLimit: 50,
  hangDump: true,          // 재기동 전에 멈춘 지점의 스택을 꺼낼 것인가
  hangDumpTimeoutMs: 5_000,
  hangStopTimeoutMs: 3_000, // 멈춘 프로세스는 SIGTERM 을 처리하지 못한다 — 오래 기다릴 이유가 없다
});

/**
 * 순수 결정 함수 — 테스트 가능하도록 부수효과 없음.
 * @param {object} s  { consecutiveFailures, lastRestartAt, restartsLastHour, halted }
 * @param {object} ev { type: 'check-failed'|'check-ok'|'exit', expected?: boolean, code?, signal? }
 * @param {object} cfg
 * @param {number} now
 * @returns {{ action: 'none'|'restart'|'halt', reason?: string }}
 */
export function decide(s, ev, cfg, now = Date.now()) {
  const c = { ...WATCHDOG_DEFAULTS, ...cfg };
  if (!c.enabled || s.halted) return { action: 'none' };

  if (ev.type === 'check-ok') return { action: 'none' };

  let reason = null;
  if (ev.type === 'check-failed') {
    if (s.consecutiveFailures >= c.failures) reason = 'unresponsive';
  } else if (ev.type === 'exit') {
    if (ev.expected) return { action: 'none' };
    if (!c.restartOnExit) return { action: 'none' };
    reason = 'exit';
  }
  if (!reason) return { action: 'none' };

  if (c.maxRestartsPerHour > 0 && s.restartsLastHour >= c.maxRestartsPerHour) {
    return { action: 'halt', reason };
  }
  if (s.lastRestartAt && now - s.lastRestartAt < c.minRestartIntervalMs) {
    // 너무 잦다 — 이번엔 넘어간다 (다음 확인에서 다시 판단)
    return { action: 'none', reason: 'too-soon' };
  }
  return { action: 'restart', reason };
}

/** Linux 라면 /proc 에서 자식의 메모리를 읽는다 (다른 OS 는 null) */
function readProcMemory(pid) {
  try {
    if (process.platform !== 'linux' || !pid) return null;
    const txt = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const pick = (k) => { const m = new RegExp(`^${k}:\\s+(\\d+)`, 'm').exec(txt); return m ? Math.round(Number(m[1]) / 1024) : null; };
    return { rssMb: pick('VmRSS'), threads: (/^Threads:\s+(\d+)/m.exec(txt) || [])[1] || null };
  } catch { return null; }
}

export class Watchdog {
  /**
   * @param {object} o
   * @param {object} o.sup        Supervisor — getStatus(), restart(), mainPort, child
   * @param {object} [o.config]   config.control.watchdog
   * @param {object} o.logger
   * @param {string} [o.eventsFile]  이벤트 기록 파일 (없으면 기록 안 함)
   */
  constructor({ sup, config = {}, logger, eventsFile = null }) {
    this.sup = sup;
    this.cfg = { ...WATCHDOG_DEFAULTS, ...(config || {}) };
    this.logger = logger;
    this.eventsFile = eventsFile;

    this.consecutiveFailures = 0;
    this.lastCheckAt = null;
    this.lastOkAt = null;
    this.lastFailure = null;         // { at, kind: 'timeout'|'refused'|'status'|'error', detail }
    this.unresponsiveSince = null;
    this.lastRestartAt = null;
    this.halted = false;
    this.haltedAt = null;
    this.restarting = false;
    this.history = [];               // 최근 이벤트 (최신이 앞)
    this.totalAutoRestarts = 0;      // 이번 supervisor 수명 + 파일에서 읽은 것
    this._timer = null;
    this._inflight = false;

    this._loadHistory();
  }

  /* ───────────── 생명주기 ───────────── */

  start() {
    if (!this.cfg.enabled) {
      this.logger.info('[watchdog] liveness watch off (SUPERVISOR_WATCHDOG=false)');
      return;
    }
    this.stop();
    this._timer = setInterval(() => { this._tick().catch(() => {}); }, Math.max(1_000, this.cfg.intervalMs));
    this._timer.unref?.();
    this.logger.info(`[watchdog] watching — every ${Math.round(this.cfg.intervalMs / 1000)}s on /health/live, ` +
      `auto-restart after ${this.cfg.failures} missed checks (at most ${this.cfg.maxRestartsPerHour || '∞'} per hour)`);
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  /** 사람이 start/restart 를 눌렀다 — 멈춤(halt) 해제, 카운터 초기화 */
  resetAfterManualStart() {
    if (this.halted) this._record({ kind: 'resume', reason: 'manual-start', detail: '사람이 시작해 감시를 다시 켭니다' });
    this.halted = false;
    this.haltedAt = null;
    this.consecutiveFailures = 0;
    this.unresponsiveSince = null;
  }

  /** supervisor 의 child 'exit' 에서 부른다 */
  async onChildExit({ code, signal, expected }) {
    const d = decide(this._state(), { type: 'exit', code, signal, expected }, this.cfg);
    if (d.action === 'none') {
      if (!expected) this._record({ kind: 'exit', reason: 'exit', detail: `code=${code} signal=${signal} — 재기동 안 함 (${d.reason || 'restartOnExit=false'})`, restarted: false });
      return;
    }
    if (d.action === 'halt') return this._halt(`메인 서버가 종료됨 (code=${code} signal=${signal})`);
    await this._restart('exit', `메인 서버가 스스로 종료됨 (code=${code} signal=${signal})`);
  }

  /* ───────────── 상태 (대시보드용) ───────────── */

  status() {
    const now = Date.now();
    const autoEvents = this.history.filter((h) => h.kind === 'restart');
    return {
      enabled: this.cfg.enabled,
      intervalMs: this.cfg.intervalMs,
      failuresThreshold: this.cfg.failures,
      maxRestartsPerHour: this.cfg.maxRestartsPerHour,
      consecutiveFailures: this.consecutiveFailures,
      unresponsiveSince: this.unresponsiveSince,
      unresponsiveSec: this.unresponsiveSince ? Math.round((now - this.unresponsiveSince) / 1000) : 0,
      lastCheckAt: this.lastCheckAt,
      lastOkAt: this.lastOkAt,
      lastFailure: this.lastFailure,
      halted: this.halted,
      haltedAt: this.haltedAt,
      restarting: this.restarting,
      autoRestarts: {
        total: this.totalAutoRestarts,
        lastHour: autoEvents.filter((h) => now - h.at < 3_600_000).length,
        last24h: autoEvents.filter((h) => now - h.at < 86_400_000).length,
        last: autoEvents[0] || null,
      },
      history: this.history.slice(0, this.cfg.historyLimit),
    };
  }

  _state() {
    const now = Date.now();
    return {
      consecutiveFailures: this.consecutiveFailures,
      lastRestartAt: this.lastRestartAt,
      restartsLastHour: this.history.filter((h) => h.kind === 'restart' && now - h.at < 3_600_000).length,
      halted: this.halted,
    };
  }

  /* ───────────── 확인 ───────────── */

  async _tick() {
    if (this._inflight || this.restarting || this.halted) return;
    const st = this.sup.getStatus();
    if (!st.running) return;                       // 죽은 것은 onChildExit 가 다룬다
    if (this.sup.stoppingPromise) return;          // 사람이 멈추는 중
    this._inflight = true;
    try {
      const r = await this._probe();
      this.lastCheckAt = Date.now();
      if (r.ok) {
        if (this.consecutiveFailures > 0) {
          this.logger.info(`[watchdog] the main server responds again (after ${this.consecutiveFailures} failures)`);
          this._record({ kind: 'recover', reason: 'responding', detail: `${this.consecutiveFailures}회 무응답 뒤 회복` });
        }
        this.consecutiveFailures = 0;
        this.unresponsiveSince = null;
        this.lastOkAt = this.lastCheckAt;
        return;
      }
      this.consecutiveFailures++;
      if (!this.unresponsiveSince) this.unresponsiveSince = this.lastCheckAt;
      this.lastFailure = { at: this.lastCheckAt, kind: r.kind, detail: r.detail };
      this.logger.warn(`[watchdog] no response ${this.consecutiveFailures}/${this.cfg.failures} (${r.kind}: ${r.detail})` +
        (this.consecutiveFailures >= this.cfg.failures - 1 && this.consecutiveFailures < this.cfg.failures ? ' — 다음에도 실패하면 재기동합니다' : ''));

      const d = decide(this._state(), { type: 'check-failed' }, this.cfg);
      if (d.action === 'none' && d.reason === 'too-soon' && this.consecutiveFailures === this.cfg.failures) {
        const wait = Math.ceil((this.cfg.minRestartIntervalMs - (Date.now() - this.lastRestartAt)) / 1000);
        this.logger.warn(`[watchdog] restart conditions met, but only ${Math.round(this.cfg.minRestartIntervalMs / 1000)}s since the last one — waiting ${wait}s more (guards against a restart loop when it dies right after starting)`);
      }
      if (d.action === 'halt') return this._halt(`${this.consecutiveFailures}회 연속 무응답`);
      if (d.action === 'restart') {
        await this._restart('unresponsive',
          `${Math.round((Date.now() - this.unresponsiveSince) / 1000)}초 동안 /health/live 무응답 (${this.consecutiveFailures}회 연속, 마지막: ${r.kind} ${r.detail})`);
      }
    } finally {
      this._inflight = false;
    }
  }

  /** GET /health/live — 타임아웃 · 거부 · 상태코드를 구분해 돌려준다 */
  _probe() {
    return new Promise((resolve) => {
      const req = transport.localRequest(this.sup.transport, {
        host: '127.0.0.1', port: this.sup.mainPort, path: '/health/live', method: 'GET',
        timeout: this.cfg.timeoutMs, agent: false,
      }, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve({ ok: true });
        resolve({ ok: false, kind: 'status', detail: `HTTP ${res.statusCode}` });
      });
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, kind: 'timeout', detail: `${this.cfg.timeoutMs}ms 안에 응답 없음` }); });
      req.on('error', (e) => resolve({ ok: false, kind: e.code === 'ECONNREFUSED' ? 'refused' : 'error', detail: e.code || e.message }));
      req.end();
    });
  }

  /* ───────────── 재기동 ───────────── */

  async _restart(reason, detail) {
    if (this.restarting) return;
    this.restarting = true;
    const startedAt = Date.now();
    const pid = this.sup.child?.pid ?? null;
    const mem = readProcMemory(pid);
    const no = this.totalAutoRestarts + 1;
    this.logger.error(`[watchdog] ★ auto-restart #${no} — reason: ${reason} — ${detail}` +
      ` | pid=${pid} uptime=${this.sup.getStatus().uptimeSec ?? '-'}s` +
      (mem ? ` rss=${mem.rssMb}MB threads=${mem.threads}` : ''));
    let dump = null;
    try {
      // ★ 멈춘 지점의 스택 — 프로세스가 살아 있고 응답만 없을 때. 실패해도 재기동은 계속한다
      if (reason === 'unresponsive' && this.cfg.hangDump && this.sup.child && this.sup.child.exitCode === null && this.sup.inspectPort) {
        const reportFile = this.eventsFile
          ? path.join(path.dirname(this.eventsFile), `hang-report.${new Date().toISOString().replace(/[:.]/g, '-')}.${pid}.json`)
          : null;
        dump = await dumpHungProcess({ pid, inspectPort: this.sup.inspectPort, timeoutMs: this.cfg.hangDumpTimeoutMs, reportFile });
        if (dump.ok) {
          this.logger.error(`[watchdog] JS stack where it hung (${dump.elapsedMs}ms to capture${dump.reportWritten ? `, 보고서 ${path.basename(reportFile)}` : ''}):`);
          for (const line of dump.stack) this.logger.error(`[watchdog]     at ${line}`);
        } else {
          this.logger.warn(`[watchdog] could not capture the stack — ${dump.error} (the process may be fully frozen, or the inspector could not be openedtate)`);
        }
      }
      await this.sup.restart({ auto: true, stopTimeoutMs: reason === 'unresponsive' ? this.cfg.hangStopTimeoutMs : undefined });
      const st = this.sup.getStatus();
      const ok = !!st.running && this.sup.healthy !== false;
      this.lastRestartAt = Date.now();
      this.totalAutoRestarts = no;
      this.consecutiveFailures = 0;
      this.unresponsiveSince = null;
      this._record({
        kind: 'restart', reason, detail, restarted: true, ok,
        pid, newPid: st.pid, durationMs: Date.now() - startedAt, rssMb: mem?.rssMb ?? null,
        stack: dump?.ok ? dump.stack.slice(0, 8) : null,
        dumpError: dump && !dump.ok ? dump.error : null,
        reportWritten: !!dump?.reportWritten,
      });
      this.logger.warn(`[watchdog] auto-restart #${no} ${ok ? 'done' : 'attempted, still no response'} — new pid=${st.pid} (${Date.now() - startedAt}ms)`);
    } catch (e) {
      this.lastRestartAt = Date.now();
      this.totalAutoRestarts = no;
      this._record({ kind: 'restart', reason, detail: `${detail} — 재기동 실패: ${e.message}`, restarted: true, ok: false, pid, durationMs: Date.now() - startedAt });
      this.logger.error(`[watchdog] auto-restart #${no} failed: ${e.message}`);
    } finally {
      this.restarting = false;
    }
  }

  _halt(why) {
    if (this.halted) return;
    this.halted = true;
    this.haltedAt = Date.now();
    this.logger.error(`[watchdog] ✖ stopping auto-restarts — more than ${this.cfg.maxRestartsPerHour} per hour (${why}). ` +
      '같은 원인이 반복되고 있으니 사람이 봐야 합니다. 콘솔 대시보드에서 [시작]/[재시작] 을 누르면 감시를 다시 켭니다.');
    this._record({ kind: 'halt', reason: 'too-many-restarts', detail: why });
  }

  /* ───────────── 기록 ───────────── */

  _record(ev) {
    const rec = { at: Date.now(), ...ev };
    this.history.unshift(rec);
    if (this.history.length > this.cfg.historyLimit) this.history.length = this.cfg.historyLimit;
    if (this.eventsFile) {
      try {
        fs.mkdirSync(path.dirname(this.eventsFile), { recursive: true });
        fs.appendFileSync(this.eventsFile, JSON.stringify(rec) + '\n');
      } catch { /* 기록 실패가 감시를 막으면 안 된다 */ }
    }
  }

  _loadHistory() {
    if (!this.eventsFile) return;
    try {
      if (!fs.existsSync(this.eventsFile)) return;
      const lines = fs.readFileSync(this.eventsFile, 'utf8').split('\n').filter(Boolean);
      const recs = [];
      for (const l of lines.slice(-this.cfg.historyLimit)) {
        try { recs.push(JSON.parse(l)); } catch { /* 깨진 줄 무시 */ }
      }
      this.history = recs.reverse();
      // 파일 전체에서 자동 재기동 횟수를 센다 (마지막 historyLimit 줄만 읽었으므로 근사치가 아니라 정확히 세려면 전체를 본다)
      let total = 0;
      for (const l of lines) if (l.includes('"kind":"restart"')) total++;
      this.totalAutoRestarts = total;
      const last = this.history.find((h) => h.kind === 'restart');
      if (last) this.lastRestartAt = last.at;
    } catch { /* noop */ }
  }
}

export default Watchdog;
