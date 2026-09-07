import { createServer, bootStatus, readiness } from './server.js';
import config from './config/index.js';
import logger from './util/logger.js';
import db from './database/db.js';
import { versionLine } from './util/version.js';
import { buildBootSummary } from './core/bootSummary.js';
import { workspaceRoot } from './core/appPaths.js';
import sseHub from './core/sse.js';
import { clearTickets } from './core/sseTicket.js';
import metricsStream from '../lib/admin/service/MetricsStream.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateLegacyMetaFiles } from '../lib/admin/service/metaStorage.js';
import { initSecureColumns } from './secure/index.js';
import { installDbInterceptor } from './secure/dbInterceptor.js';
/* ★ v1.11.0 — v1.10.45 의 종료 코드가 traceWriter.drain() 을 부르지만 import 가 빠져 있었다.
   try/catch 안이라 조용히 실패해 "정상 종료 때 추적 기록을 비운다" 가 실제로는 동작하지 않았다.
   (이번 판에서 종료 절차를 손보다 발견) */
import traceWriter from './core/traceWriter.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');

async function main() {
  // 레거시 `.xxx.meta.json` → `meta/xxx.meta.json` 자동 이동
  try {
    const r = migrateLegacyMetaFiles([
      path.join(projectRoot, 'src', 'controller'),
      path.join(projectRoot, 'src', 'service'),
    ]);
    if (r.moved > 0 || r.skipped > 0) {
      logger.info(`[meta] 레거시 메타 파일 마이그레이션: moved=${r.moved}, skipped=${r.skipped}`);
    }
    if (r.errors.length) {
      logger.warn(`[meta] 마이그레이션 중 ${r.errors.length}건 오류: ${r.errors.slice(0,3).join(' ; ')}`);
    }
  } catch (e) {
    logger.warn(`[meta] 마이그레이션 실패(무시): ${e.message}`);
  }

  // 컬럼 암호화 초기화 (aidot-securedb 내장 + aidot-kms 키 공급)
  try {
    await initSecureColumns(config.secure, logger);
    // db.execute 자동 암복호화 인터셉터 설치 (Service 코드 수정 없이 정책 적용)
    installDbInterceptor(db, logger);
  } catch (e) {
    logger.error(`[secure] 컬럼 암호화 초기화 실패: ${e.message}`);
    throw e;   // 키가 준비 안 되면 암호화 컬럼을 평문 저장할 위험 → 부팅 중단
  }

  const app = await createServer();
  const port = config.server.port;

  const server = app.listen(port, () => {
    logger.info(`서버 기동 완료 http://localhost:${port}  ${versionLine()}  (env=${config.env}, db=${db.currentAdapter()})`);
    printBootSummary(port);
    // Electron 으로 실행된 경우, 부모 프로세스에 ready 시그널 전송.
    //   server-bridge.cjs 가 이 메시지를 대기하고 스플래시를 닫는다.
    if (process.send) {
      try { process.send({ type: 'ready', port }); } catch (_) { /* non-IPC 환경 */ }
    }
  });

  process.on('unhandledRejection', (reason) => {
    logger.error(reason instanceof Error ? reason : new Error(String(reason)));
  });
  process.on('uncaughtException', (err) => {
    logger.error(err);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} 수신, 서버 종료 중...`);

    /* v1.8.0: 먼저 '준비 안 됨' 으로 내려 트래픽을 끊는다.
       예전에는 이 단계가 없어서, 종료를 시작한 뒤에도 앞단(supervisor/프록시)이 계속
       새 요청을 보냈고 그 요청들이 종료 도중에 잘렸다. /health/ready 가 503 을 돌려주면
       앞단이 이 인스턴스를 뺀다. */
    readiness.markDraining();

    // 열려 있는 SSE 스트림을 먼저 닫는다. (안 닫으면 server.close() 가 끝나지 않는다)
    try { sseHub.closeAll(signal); } catch (e) { logger.warn(`[sse] 종료 처리 실패: ${e.message}`); }
    try { metricsStream.stopAll(); } catch { /* noop */ }
    try { clearTickets(); } catch { /* noop */ }
    // keep-alive 로 열려 있는 유휴 커넥션이 있으면 server.close() 콜백이 영영 호출되지 않는다.
    //   → 유휴 커넥션은 즉시 닫고, 3초 뒤에도 남아 있는 커넥션은 강제로 끊는다 (Node 18.2+).
    try { server.closeIdleConnections?.(); } catch { /* noop */ }
    setTimeout(() => { try { server.closeAllConnections?.(); } catch { /* noop */ } }, 3_000).unref();
    server.close(async () => {
      try {
        const accessSvc = app.get('accessLogService');
        if (accessSvc) {
          await accessSvc.stop();
          logger.info('[admin] AccessLogService 큐 flush 완료');
        }
      } catch (e) {
        logger.warn(`[admin] AccessLogService stop 실패: ${e.message}`);
      }
      /* ★ v1.10.45 — 큐에 남은 추적 기록을 비우고 나간다.
         갑작스런 종료(kill -9)에서는 최대 1초어치가 사라지지만,
         정상 종료에서는 살린다. 추적은 진단용 기록이므로 그 정도는
         감수할 만하다 — DB 를 닫기 **전에** 비워야 한다. */
      try { await traceWriter.drain(); } catch { /* 종료를 막지 않는다 */ }
      // ★ v1.11.0 — MCI 연결 정리 (유휴 소켓·탐침 타이머)
      try {
        const { default: container } = await import('./core/container.js');
        if (container.has('MciService')) await container.resolve('MciService').close?.();
      } catch { /* noop */ }
      await db.closeDb();
      logger.info('서버 종료 완료');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // supervisor 가 강제 종료(SIGKILL) 되면 이 프로세스만 남아 포트를 계속 점유한다.
  //   POSIX 는 부모가 죽으면 ppid 가 1(init) 로 바뀌므로 이를 감시해 스스로 정리한다.
  //   (Windows 는 supervisor 가 tree kill 을 사용하므로 이 감시가 필요 없다)
  if (process.env.AIDOT_SUPERVISED === '1' && process.platform !== 'win32') {
    const parentPid = process.ppid;
    const watchdog = setInterval(() => {
      if (process.ppid !== parentPid) {
        logger.warn('[watchdog] supervisor 프로세스가 사라졌습니다 — 메인 서버도 종료합니다.');
        clearInterval(watchdog);
        shutdown('PARENT_GONE');
      }
    }, 5_000);
    watchdog.unref();
  }
}

main().catch((err) => {
   
  console.error('서버 부팅 실패:', err);
  process.exit(1);
});

/**
 * 기동 요약 — 로그의 **맨 마지막**에 상태를 한 화면으로 정리해서 찍는다.
 *
 *  왜 필요한가
 *    DB 접속 실패 안내가 부팅 초반에 찍혀도, 그 뒤로 라우트 등록 로그가 200줄 넘게 흘러가면
 *    사용자가 마지막에 보는 건 "서버 기동 완료" 한 줄이라 정상으로 착각한다.
 *    사람이 실제로 읽는 위치(=마지막)에 결론을 둔다.
 */
function printBootSummary(port) {
  const st = db.getDbStatus();
  const { lines } = buildBootSummary({
    port,
    versionLine: versionLine(),
    env: config.env,
    dbStatus: st,
    dbTarget: st.adapter === 'sqlite'
      ? (config.db?.file || 'data/app.db')
      : (config.db?.database || ''),
    migration: bootStatus.migration || {},
    admin: bootStatus.admin || {},
    log: config.log || {},
    db: config.db || {},
    // ★ v1.10.42 — 작업 폴더가 지정돼 있으면 기동 요약에 알려 준다
    workspace: (() => {
      const ws = workspaceRoot();
      if (!ws) return '';
      return path.relative(projectRoot, ws).replace(/\\/g, '/') || '.';
    })(),
  });
  // 로거를 거치지 않고 그대로 출력 — 타임스탬프/레벨 없이 한 덩어리로 읽히게
  process.stderr.write(lines.join('\n') + '\n');
}
