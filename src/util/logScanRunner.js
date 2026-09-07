/**
 * logScanRunner.js — 훑기 작업을 워커 스레드로 보내고, 시간·동시 실행 수를 지킨다 (v1.11.4)
 *
 *   왜 워커인가: v1.11.3 이 비동기·상한·양보로 이벤트 루프 정지를 96ms 까지 줄였지만,
 *     · CPU 는 여전히 메인 스레드가 쓴다 (1vCPU 에서 2.4초짜리 질의 = 그동안 모든 요청이 느려진다)
 *     · 정규식 가드는 휴리스틱이라 못 잡는 폭주 패턴이 남는다
 *   워커에서 돌리면 메인 스레드 CPU 0, 넘치면 worker.terminate() — 어떤 패턴이든 서버는 산다.
 *
 *   설정: LOG_SCAN_WORKER=false 로 끄면 같은 함수를 메인에서 돈다 (예전 v1.11.3 방식).
 *         LOG_SCAN_TIMEOUT_MS (기본 15000) · 동시 워커 2개 초과는 429.
 */
import { Worker } from 'node:worker_threads';
import * as scan from './logScan.js';

const MAX_ACTIVE = 2;
let active = 0;
const stats = { runs: 0, timeouts: 0, rejected: 0, workerFailures: 0, lastMs: null };

export function scanStats() { return { ...stats, active, maxActive: MAX_ACTIVE }; }

export async function runScan(op, args, { useWorker = true, timeoutMs = 15_000 } = {}) {
  if (!useWorker) return scan[op](...args);
  if (active >= MAX_ACTIVE) {
    stats.rejected++;
    throw Object.assign(new Error('다른 로그 검색이 진행 중입니다 — 잠시 뒤 다시 시도하세요'), { status: 429 });
  }
  active++; stats.runs++;
  const t0 = Date.now();
  try {
    return await new Promise((resolve, reject) => {
      let settled = false;
      let worker;
      try {
        worker = new Worker(new URL('./logScanWorker.js', import.meta.url), { workerData: { op, args } });
      } catch (e) {
        stats.workerFailures++;
        // 워커를 못 띄우는 환경이면 메인에서 (기능은 살린다)
        return scan[op](...args).then(resolve, reject);
      }
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true; stats.timeouts++;
        worker.terminate().catch(() => {});
        reject(Object.assign(new Error(`검색 시간 초과 (${Math.round(timeoutMs / 1000)}초) — 조건을 좁히거나 정규식을 단순하게 하세요`), { status: 408 }));
      }, timeoutMs);
      worker.once('message', (m) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        if (m?.ok) resolve(m.result);
        else reject(Object.assign(new Error(m?.error?.message || '로그 훑기 실패'), { status: m?.error?.status || 500 }));
      });
      worker.once('error', (e) => { if (settled) return; settled = true; clearTimeout(timer); stats.workerFailures++; reject(Object.assign(new Error(`로그 훑기 워커 오류: ${e.message}`), { status: 500 })); });
      worker.once('exit', (code) => { if (settled) return; settled = true; clearTimeout(timer); reject(Object.assign(new Error(`로그 훑기 워커가 끝났습니다 (code ${code})`), { status: 500 })); });
    });
  } finally {
    active--; stats.lastMs = Date.now() - t0;
  }
}

export default { runScan, scanStats };
