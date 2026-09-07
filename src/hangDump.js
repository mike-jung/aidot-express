/**
 * hangDump.js — **멈춘** 메인 프로세스가 "무엇을 하다 멈췄는지" 를 밖에서 꺼내 온다.
 *
 *  왜 이렇게 하는가
 *    이벤트 루프가 막힌 프로세스는 자기 상태를 스스로 기록할 수 없다. 로그도, /health 도,
 *    --report-on-signal 도 **루프가 풀린 뒤에야** 동작한다 (실측: busy loop 중에 SIGUSR2 를
 *    보내면 보고서는 루프가 끝난 뒤에 써진다). 그러나 V8 인스펙터는 별도 스레드에서 돌고
 *    `Debugger.pause` 는 인터럽트로 실행 중인 JS 를 세운다 — 막힌 루프 한가운데서도 된다.
 *
 *  절차
 *    1. process._debugProcess(pid)   — 상대 프로세스의 인스펙터를 켠다 (POSIX: SIGUSR1, Windows: 내장 IPC)
 *       메인은 `--inspect-port=127.0.0.1:<port>` 로 떠 있어서 켜질 때 그 포트를 쓴다. 평소에는 닫혀 있다.
 *    2. GET /json/list 로 웹소켓 주소를 얻어 접속 (Node 22 내장 WebSocket)
 *    3. Debugger.enable → Debugger.pause → Debugger.paused 의 callFrames = **멈춘 지점의 JS 스택**
 *    4. (덤) 그 상태에서 process.report.writeReport() 를 실행해 힙·핸들·libuv 까지 파일로 남긴다
 *
 *  실패해도 재기동을 막지 않는다 — 진단은 덤이고, 복구가 본업이다.
 */
import http from 'node:http';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJson(port, urlPath, timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: urlPath, timeout: timeoutMs, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/** callFrames → 사람이 읽는 줄 */
export function formatFrames(callFrames = [], limit = 15) {
  return callFrames.slice(0, limit).map((f) => {
    const loc = f.location || {};
    const url = (f.url || '').replace(/^file:\/\//, '');
    return `${f.functionName || '(anonymous)'}  ${url}:${(loc.lineNumber ?? 0) + 1}:${(loc.columnNumber ?? 0) + 1}`;
  });
}

/**
 * @param {object} o
 * @param {number} o.pid           멈춘 프로세스
 * @param {number} o.inspectPort   그 프로세스의 --inspect-port
 * @param {number} [o.timeoutMs=5000]
 * @param {string} [o.reportFile]  process.report 를 남길 경로 (생략하면 시도하지 않음)
 * @returns {Promise<{ok:boolean, stack:string[], reportWritten:boolean, error:string|null, elapsedMs:number}>}
 */
export async function dumpHungProcess({ pid, inspectPort, timeoutMs = 5_000, reportFile = null }) {
  const started = Date.now();
  const result = { ok: false, stack: [], reportWritten: false, error: null, elapsedMs: 0 };
  const done = (err) => { result.error = err || null; result.elapsedMs = Date.now() - started; return result; };

  if (typeof WebSocket !== 'function') return done('이 Node 에는 내장 WebSocket 이 없습니다 (Node 22 이상 필요)');
  if (typeof process._debugProcess !== 'function') return done('process._debugProcess 를 쓸 수 없습니다');

  try { process._debugProcess(pid); } catch (e) { return done(`인스펙터 켜기 실패: ${e.message}`); }

  // 인스펙터가 뜰 때까지 (최대 2초)
  let target = null;
  const deadline = Date.now() + Math.min(2_000, timeoutMs);
  while (Date.now() < deadline) {
    const list = await getJson(inspectPort, '/json/list');
    if (Array.isArray(list) && list[0]?.webSocketDebuggerUrl) { target = list[0]; break; }
    await sleep(100);
  }
  if (!target) return done(`인스펙터(127.0.0.1:${inspectPort})가 ${Math.min(2_000, timeoutMs)}ms 안에 뜨지 않았습니다`);

  return new Promise((resolve) => {
    let ws;
    let id = 0;
    const pending = new Map();
    let finished = false;
    const finish = (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { ws?.close(); } catch { /* noop */ }
      resolve(done(err));
    };
    const timer = setTimeout(() => finish(`${timeoutMs}ms 안에 스택을 받지 못했습니다`), timeoutMs);
    const send = (method, params = {}) => new Promise((res, rej) => {
      const msgId = ++id;
      pending.set(msgId, { res, rej });
      try { ws.send(JSON.stringify({ id: msgId, method, params })); } catch (e) { pending.delete(msgId); rej(e); }
    });

    try {
      ws = new WebSocket(target.webSocketDebuggerUrl);
    } catch (e) { return finish(`웹소켓 접속 실패: ${e.message}`); }
    ws.addEventListener('error', () => finish('웹소켓 오류'));
    ws.addEventListener('message', async (ev) => {
      let msg;
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString()); } catch { return; }
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id); pending.delete(msg.id);
        if (msg.error) p.rej(new Error(msg.error.message)); else p.res(msg.result);
        return;
      }
      if (msg.method === 'Debugger.paused') {
        result.stack = formatFrames(msg.params?.callFrames || []);
        result.ok = result.stack.length > 0;
        // 덤 — 멈춘 상태에서 process.report 를 파일로. 실패해도 스택은 이미 손에 있다
        if (reportFile) {
          try {
            const top = msg.params?.callFrames?.[0]?.callFrameId;
            const expr = `(function(){ try { process.report.writeReport(${JSON.stringify(reportFile)}); return 'ok'; } catch (e) { return 'ERR:' + e.message; } })()`;
            const r = top
              ? await send('Debugger.evaluateOnCallFrame', { callFrameId: top, expression: expr, returnByValue: true })
              : await send('Runtime.evaluate', { expression: expr, returnByValue: true });
            result.reportWritten = r?.result?.value === 'ok';
          } catch { /* noop */ }
        }
        finish(null);
      }
    });
    ws.addEventListener('open', async () => {
      try {
        await send('Debugger.enable');
        await send('Debugger.pause');
      } catch (e) { finish(`Debugger 명령 실패: ${e.message}`); }
    });
  });
}

export default { dumpHungProcess, formatFrames };
