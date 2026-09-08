/**
 * tests/hang-dump.test.mjs — 이벤트 루프가 **완전히 막힌** 프로세스에서도 멈춘 지점의 스택을 밖에서
 * 꺼낼 수 있는지 (watchdog 이 재기동 직전에 쓰는 장치, src/hangDump.js).
 *
 *  대조군: --report-on-signal + SIGUSR2 는 루프가 풀린 뒤에야 보고서를 쓴다 (그래서 쓰지 않는다).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { dumpHungProcess, formatFrames } from '../src/hangDump.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

test('★ busy loop 로 막힌 프로세스에서 Debugger.pause 로 스택을 받고, process.report 도 파일로 남긴다', async () => {
  const port = await freePort();
  const reportFile = path.join(os.tmpdir(), `aidot-hang-${process.pid}.json`);
  const code = `function busyWork(){ const end = Date.now() + 20000; let x = 0; while (Date.now() < end) { x++; } return x; }
function handleRequest(){ return busyWork(); } setTimeout(handleRequest, 100); setInterval(() => {}, 1000);`;
  const child = spawn(process.execPath, [`--inspect-port=127.0.0.1:${port}`, '-e', code], { stdio: 'ignore' });
  try {
    await sleep(600);   // 루프에 들어간 뒤
    const r = await dumpHungProcess({ pid: child.pid, inspectPort: port, timeoutMs: 8_000, reportFile });
    assert.equal(r.error, null);
    assert.equal(r.ok, true);
    assert.ok(r.stack.some((l) => l.startsWith('busyWork')), `busyWork 프레임이 있어야 한다: ${r.stack.join(' | ')}`);
    assert.ok(r.stack.some((l) => l.startsWith('handleRequest')), 'handleRequest 프레임이 있어야 한다');
    assert.ok(r.elapsedMs < 8_000);
    assert.equal(r.reportWritten, true);
    const rep = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    assert.equal(rep.header.trigger, 'API');
  } finally {
    try { child.kill('SIGKILL'); } catch { /* noop */ }
    try { fs.unlinkSync(reportFile); } catch { /* noop */ }
  }
});

test('인스펙터 포트를 열지 않은 프로세스에서는 실패를 보고하되 던지지 않는다', async () => {
  const port = await freePort();
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  try {
    await sleep(300);
    // 인스펙터 기본 포트(9229)가 켜질 수 있으므로 우리가 고른 빈 포트로 물으면 뜨지 않는다
    const r = await dumpHungProcess({ pid: child.pid, inspectPort: port, timeoutMs: 1_500 });
    assert.equal(r.ok, false);
    assert.ok(typeof r.error === 'string' && r.error.length > 0);
  } finally {
    try { child.kill('SIGKILL'); } catch { /* noop */ }
  }
});

test('formatFrames: 함수명·파일·줄(1부터) 을 한 줄로', () => {
  const lines = formatFrames([{ functionName: 'f', url: 'file:///a/b.js', location: { lineNumber: 9, columnNumber: 4 } }, { functionName: '', url: '', location: { lineNumber: 0, columnNumber: 0 } }]);
  assert.equal(lines[0], 'f  /a/b.js:10:5');
  assert.equal(lines[1], '(anonymous)  :1:1');
});
