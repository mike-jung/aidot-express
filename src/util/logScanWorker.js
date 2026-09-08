/**
 * logScanWorker.js — 로그 훑기를 **워커 스레드**에서 (v1.11.4)
 *   메인 스레드는 이 워커를 띄우고 결과만 받는다. 시간이 넘치면 메인이 워커를 죽인다 — 정규식이 폭주해도 서버는 산다.
 *   이 파일은 데코레이터·config·logger 를 쓰지 않는다 (--import 로더 없이 뜬다).
 */
import { parentPort, workerData } from 'node:worker_threads';
import * as scan from './logScan.js';

const { op, args } = workerData || {};
(async () => {
  try {
    if (typeof scan[op] !== 'function') throw new Error(`알 수 없는 작업: ${op}`);
    const result = await scan[op](...(args || []));
    parentPort.postMessage({ ok: true, result });
  } catch (e) {
    parentPort.postMessage({ ok: false, error: { message: e?.message || String(e), status: e?.status } });
  }
})();
