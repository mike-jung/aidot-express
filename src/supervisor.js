/**
 * supervisor.js — 메인 서버(aidot-express)를 자식 프로세스로 관리 + 컨트롤 서버 기동.
 *
 *  아키텍처:
 *     $ npm start
 *     └─ node src/supervisor.js
 *        ├─ spawn('node', ['--import', 'src/loader/register.mjs', 'src/app.js'])   ← 메인 서버 (7901)
 *        └─ controlServer.listen(7902)                                             ← 컨트롤 API
 *
 *  특징:
 *   - 메인 프로세스가 죽어도 supervisor 는 계속 살아 있음 → 재시작 가능
 *   - 메인의 stdout/stderr 는 supervisor 의 stdout 으로 pass-through (기존 로그 위치 유지)
 *   - 종료 시그널(SIGINT, SIGTERM) 을 받으면 메인에 전파 → 정상 종료 유도
 *   - ★ v1.11.0 생존 감시(watchdog): /health/live 무응답이 이어지거나 메인이 스스로 죽으면
 *     진단 로그를 남기고 자동 재기동한다. 이력은 control API 의 status.watchdog 으로 대시보드에 보인다.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';
import logger from './util/logger.js';
import config from './config/index.js';
import { createControlApp } from './controlServer.js';
import { configureHttpServer } from './core/httpLimits.js';
import { Watchdog } from './watchdog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class Supervisor {
  constructor() {
    this.child = null;
    this.startedAt = null;    // 메인이 start() 된 시각 (ms)
    this.stoppingPromise = null;  // stop() 진행 중이면 resolve 되는 Promise
    this.lastExit = null;     // { code, signal, at }
    this.mainPort = null;     // 메인 서버가 듣는 포트 (환경변수/config 에서)
    this.watchdog = null;     // ★ v1.11.0 — bootstrap 이 붙인다
    this.expectedExit = false; // 사람이 stop() 을 부른 뒤의 종료인가 (자동 재기동 대상 아님)
    this.restartCount = { manual: 0, auto: 0 };
  }

  /** 현재 상태 반환 (control API 응답용) */
  getStatus() {
    const running = !!this.child && this.child.exitCode === null && this.child.signalCode === null;
    const now = Date.now();
    return {
      running,
      /* ★ v1.35.8 — 죽었을 때 원인을 보여 주려면 자식의 마지막 출력이 필요하다 */
      lastOutput: this.lastOutput || [],
      pid: this.child?.pid ?? null,
      startedAt: this.startedAt,
      uptimeSec: (running && this.startedAt) ? Math.floor((now - this.startedAt) / 1000) : null,
      mainPort: this.mainPort,
      controlPort: config.control?.port ?? null,
      lastExit: this.lastExit,
      stopping: !!this.stoppingPromise,
      // ★ v1.11.0 — 대시보드가 그대로 보여 준다
      restartCount: { ...this.restartCount },
      inspectPort: this.inspectPort ?? null,
      watchdog: this.watchdog ? this.watchdog.status() : { enabled: false },
    };
  }

  /** 메인 프로세스 시작 (이미 실행 중이면 409) */
  async start() {
    if (this.child && this.child.exitCode === null && this.child.signalCode === null) {
      throw Object.assign(new Error('already running'), { status: 409 });
    }
    if (this.stoppingPromise) {
      // stop 진행 중이면 완료까지 기다림
      await this.stoppingPromise;
    }

    const mainPort = process.env.PORT
      || process.env.SERVER_PORT
      || config.server.port;
    this.mainPort = Number(mainPort);

    // 기본 커맨드: node --import file://.../src/loader/register.mjs src/app.js
    // 중요: --import 는 module specifier 를 받으며, Windows 의 절대경로(D:\...)를
    //       URL 스킴(d:)으로 오인하여 ERR_UNSUPPORTED_ESM_URL_SCHEME 을 던진다.
    //       반드시 pathToFileURL 로 file:// URL 로 변환해 전달해야 한다.
    const registerUrl = pathToFileURL(path.join(projectRoot, 'src', 'loader', 'register.mjs')).href;
    const appPath     = path.join(projectRoot, 'src', 'app.js');
    const cmd = process.execPath;
    const args = ['--import', registerUrl, appPath];
    /* ★ v1.11.0 — 멈춘 프로세스의 스택을 밖에서 꺼내기 위한 준비.
       --inspect-port 만으로는 인스펙터가 **켜지지 않는다.** 나중에 watchdog 이 process._debugProcess(pid) 로
       켤 때 어느 포트를 쓸지만 정해 둔다 (127.0.0.1 전용). 평소에는 아무 포트도 열리지 않는다.
       (--report-on-signal 은 쓰지 않는다 — 실측 결과 보고서는 이벤트 루프가 풀린 **뒤에야** 써진다.) */
    this.inspectPort = Number(config.control?.watchdog?.inspectPort) || (this.mainPort + 2000);
    if (config.control?.watchdog?.hangDump !== false) {
      args.unshift(`--inspect-port=127.0.0.1:${this.inspectPort}`);
    }
    const env = { ...process.env, PORT: String(this.mainPort), AIDOT_SUPERVISED: '1' };
    this.expectedExit = false;

    logger.info(`[supervisor] starting the main server (port=${this.mainPort})`);
    logger.debug(`[supervisor] spawn: ${cmd} ${args.join(' ')}`);
    /* ★ v1.35.8 — 자식의 출력을 **파일로 붙잡는다.**
     *
     *  예전에는 stdio: 'inherit' 였다. 콘솔에서 띄우면 보이지만, 설치본은 GUI 앱이라
     *  그 콘솔이 아무 데도 없다. 그래서 서버가 죽어도 로그에는
     *  "종료 감지 code=1" 한 줄뿐이고 **왜 죽었는지가 어디에도 남지 않았다.**
     *  사용자는 "DB 정보를 확인하세요" 라는 말만 보고 무엇이 틀렸는지 알 수 없었다.
     *
     *  이제 pipe 로 받아 로그에 남기고, 마지막 몇 줄은 오류 창에도 보여 준다. */
    this.child = spawn(cmd, args, {
      cwd: projectRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });

    /* 자식이 뱉은 마지막 줄들을 기억한다 — 죽었을 때 원인이 대개 여기 있다 */
    this.lastOutput = this.lastOutput || [];
    const capture = (stream, level) => {
      if (!stream) return;
      let buf = '';
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        buf += chunk;
        const lines = buf.split(/\r?\n/);
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          /* ★ v1.36.5 — **어느 스트림인지가 아니라 내용으로** 등급을 정한다.
             서버는 기동 완료 배너를 stderr 로 찍는다(콘솔에서 눈에 띄게 하려고).
             그것을 전부 ERROR 로 기록했더니, 정상 기동한 로그에도 ERROR 가 9줄 남아
             "실패한 것 아니냐" 는 오해를 낳았다. 로그는 읽는 사람을 속이면 안 된다. */
          const looksBad = /\b(error|err!|fatal|exception|EPERM|EACCES|ENOENT|ECONN|ERR_[A-Z_]+)\b/i.test(line)
            || /^\s+at .+\(.*\)$/.test(line)                 /* 스택 줄 */
            || /^\s*(Error|TypeError|RangeError|SyntaxError):/.test(line);
          logger[looksBad ? 'error' : 'info'](`[server] ${line}`);
          this.lastOutput.push(line);
          /* 실패했을 때 스택 전체를 보여 주려면 40줄로는 모자란다 */
          if (this.lastOutput.length > 300) this.lastOutput.shift();
        }
      });
    };
    capture(this.child.stdout, 'info');
    capture(this.child.stderr, 'error');

    this.startedAt = Date.now();
    this.lastExit = null;

    const child = this.child;
    child.once('exit', (code, signal) => {
      this.lastExit = { code, signal, at: Date.now(), expected: this.expectedExit };
      logger.info(`[supervisor] main server exited code=${code} signal=${signal}${this.expectedExit ? ' (requested)' : ''}`);
      // child 레퍼런스는 유지 (running=false 로 표시됨)
      // ★ v1.11.0 — 스스로 죽은 것이면 watchdog 이 판단해 다시 띄운다 (restart() 도중이면 restart 가 처리)
      if (this.watchdog && !this.expectedExit && !this.stoppingPromise && this.child === child) {
        setTimeout(() => { this.watchdog.onChildExit({ code, signal, expected: false }).catch(() => {}); }, 500).unref?.();
      }
    });
    this.child.once('error', (err) => {
      logger.error(`[supervisor] could not spawn the main server: ${err.message}`);
    });

    // 메인이 정상 기동됐는지 헬스체크로 확인 (최대 8초)
    // ⚠ v1.7.2: 8초는 너무 짧았다. DB 접속이 늦으면(예: 비밀번호가 틀려 풀 획득에 10초 대기)
    //   서버가 아직 listen 전인데 "응답 없음" 으로 오진하고, Electron 은 실패 대화상자를 띄웠다.
    //   → 기본 30초로 늘리고, 자식 프로세스가 살아 있는 동안에만 재시도한다.
    const healthTimeout = Number(process.env.SUPERVISOR_HEALTH_TIMEOUT_MS) || 30_000;
    const ok = await waitForHealth(this.mainPort, healthTimeout, () => this.child && this.child.exitCode === null);
    this.healthy = ok;
    if (!ok) {
      logger.warn(`[supervisor] health check failed — the process may still be running`);
    }
    return this.getStatus();
  }

  /** 메인 프로세스 중지 (SIGTERM → timeout 후 SIGKILL). timeoutMs 를 주면 그만큼만 기다린다 (멈춘 프로세스는 SIGTERM 을 처리하지 못한다) */
  async stop({ timeoutMs: stopTimeoutMs } = {}) {
    if (!this.child || this.child.exitCode !== null || this.child.signalCode !== null) {
      throw Object.assign(new Error('not running'), { status: 409 });
    }
    if (this.stoppingPromise) return this.stoppingPromise;
    this.expectedExit = true;

    const timeoutMs = stopTimeoutMs ?? config.control?.stopTimeoutMs ?? 10_000;
    this.stoppingPromise = new Promise((resolve) => {
      const child = this.child;
      let killed = false;
      const doneHandler = (code, signal) => {
        killed = true;
        clearTimeout(timer);
        this.stoppingPromise = null;
        resolve({ code, signal });
      };
      child.once('exit', doneHandler);

      try {
        if (child.connected) {
          child.send({ type: 'aidot:shutdown' }, (error) => {
            if (error && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
          });
        } else {
          child.kill('SIGTERM');
        }
      } catch (e) {
        logger.warn(`[supervisor] SIGTERM failed: ${e.message}`);
      }

      const timer = setTimeout(() => {
        if (!killed) {
          logger.warn(`[supervisor] SIGTERM timed out — sending SIGKILL`);
          try { child.kill('SIGKILL'); } catch { /* noop */ }
        }
      }, timeoutMs);
    });

    await this.stoppingPromise;
    return this.getStatus();
  }

  /** 중지 → 시작. auto=true 면 watchdog 이 부른 것 (횟수를 따로 센다) */
  async restart({ auto = false, stopTimeoutMs } = {}) {
    /* ★ v1.24.0 — **신호로 죽은 프로세스는 exitCode 가 null 이다.**
     *  (정상 종료면 exitCode 에 숫자, 신호로 죽으면 signalCode 에 'SIGKILL' 같은 값이 들어간다)
     *  예전에는 exitCode === null 만 보고 "아직 살아 있다" 고 판단해 stop() 을 불렀고,
     *  stop() 은 "not running" 을 던져 **자동 재기동이 매번 실패**했다.
     *  실측: 메인을 kill -9 → "자동 재기동 #1 실패: not running" → 서버가 돌아오지 않음.
     *  비정상 종료(크래시·OOM·kill)가 바로 이 경로다 — 가장 필요한 순간에 안 되는 셈이었다. */
    const alive = this.child && this.child.exitCode === null && this.child.signalCode === null;
    if (alive) {
      await this.stop({ timeoutMs: stopTimeoutMs });
    }
    const cooldown = config.control?.restartCooldownMs ?? 1_000;
    await new Promise((r) => setTimeout(r, cooldown));
    if (auto) this.restartCount.auto++; else this.restartCount.manual++;
    await this.start();
    return this.getStatus();
  }
}

/** 메인 포트에 /health 호출 성공할 때까지 대기 */
/**
 * 메인 서버가 HTTP 응답을 시작할 때까지 기다린다.
 *   isAlive: 자식 프로세스가 살아 있는지 확인하는 콜백 — 죽었으면 기다리지 않고 바로 실패 처리
 */
function waitForHealth(port, timeoutMs, isAlive = () => true) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const req = http.request({
        host: '127.0.0.1',
        port,
        path: '/health',
        method: 'GET',
        timeout: 1000,
      }, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve(true);
        retry();
      });
      req.on('error', retry);
      req.on('timeout', () => { req.destroy(); retry(); });
      req.end();
    };
    const retry = () => {
      if (!isAlive()) return resolve(false);              // 자식이 죽었으면 더 기다릴 이유가 없다
      if (Date.now() > deadline) return resolve(false);
      setTimeout(attempt, 300);
    };
    setTimeout(attempt, 200);
  });
}

/* ───────────────────── bootstrap ───────────────────── */

async function bootstrap() {
  if (config.control?.enabled === false) {
    logger.warn('[supervisor] config.control.enabled=false — supervisor mode off, starting the main server only.');
    // fallback: 메인을 직접 require/spawn (여기선 spawn 유지, control API 만 끔)
  }

  const sup = new Supervisor();
  const app = createControlApp(sup);

  const controlPort = Number(config.control?.port ?? 7902);
  const controlHost = config.control?.host ?? '127.0.0.1';

  const server = app.listen(controlPort, controlHost, () => {
    logger.info(`[supervisor] Control API http://${controlHost}:${controlPort}`);
  });
  configureHttpServer(server, config.server);

  // ★ v1.11.0 — 생존 감시. 메인이 기동된 뒤 켠다 (기동 실패는 아래 로그가 이미 설명한다)
  const wdCfg = config.control?.watchdog || {};
  sup.watchdog = new Watchdog({
    sup,
    config: wdCfg,
    logger,
    eventsFile: path.resolve(projectRoot, config.log?.dir || 'log', 'supervisor-events.jsonl'),
  });

  // 메인 서버 자동 기동
  try {
    await sup.start();
    sup.watchdog.start();
    const st = sup.getStatus();
    if (st.running && sup.healthy) {
      logger.info(`[supervisor] started (main pid=${st.pid}, port=${st.mainPort}, control=${controlHost}:${controlPort})`);
      // Electron 에서 fork 된 경우 부모에게 ready 시그널을 전달.
      //   main 포트가 실제 HTTP 응답하므로 이것을 "서버 준비 완료" 로 간주.
      if (process.send) {
        try { process.send({ type: 'ready', port: st.mainPort, controlPort }); } catch (_) {}
      }
    } else {
      const why = st.running
        ? `메인 서버(포트 ${st.mainPort})가 HTTP 응답을 하지 않습니다`
        : `메인 서버가 기동 직후 종료되었습니다 (exit code=${st.lastExit?.code}, signal=${st.lastExit?.signal})`;
      logger.error(`[supervisor] ${why} — the control API is waiting at ${controlHost}:${controlPort} — /api/control/start can retry.`);
      // ⚠ 여기서 ready 를 보내면 Electron 이 죽은 포트를 향해 창을 띄워 사용자가 원인을 알 수 없다.
      //   error 를 보내 "서버 시작 실패" 대화상자에 원인을 표시한다.
      if (process.send) {
        try {
          /* ★ v1.35.6 — **실제 경로**를 알려 준다.
             예전에는 `.env` 와 `log/general` 을 보라고 했는데, 설치본에서는
             둘 다 그 자리에 없다. 없는 곳을 가리키면 사용자가 할 수 있는 일이 없다. */
          const envPath = process.env.AIDOT_ENV_FILE
            || (process.env.ELECTRON_USER_DATA ? path.join(process.env.ELECTRON_USER_DATA, '.env') : path.join(process.cwd(), '.env'));
          const logPath = process.env.LOG_DIR || path.join(process.cwd(), 'log');
          /* ★ v1.35.8 — 자식이 마지막에 뱉은 줄을 함께 보여 준다.
             로그 파일을 찾아 열지 않고도 원인을 알 수 있어야 한다.
             DB 오류라면 여기에 ER_ACCESS_DENIED_ERROR 같은 것이 그대로 나온다. */
          /* ★ v1.36.4 — 자식이 뱉은 것을 **전부** 보낸다.
             6줄로 자르면 스택이 잘려 나가 정작 필요한 줄이 사라진다.
             예전 로그에서 `at ... _ensureMeta` 같은 줄이 그렇게 없어졌다.
             자르는 일은 보여 주는 쪽(대화상자)이 판단한다. */
          const output = (st.lastOutput || []);
          process.send({
            type: 'error',
            reason: why,
            output,
            envPath, logPath,
            version: process.env.npm_package_version || '',
            node: process.version,
            /* 예전 형태도 함께 — 이것만 보는 곳이 있을 수 있다 */
            message: `${why}.\n\n${output.slice(-8).join('\n')}`,
          });
        } catch (_) {}
      }
    }
  } catch (e) {
    logger.error(`[supervisor] could not start the main server: ${e.message}`);
  }

  // 종료 시그널 → 메인도 종료하고 자신도 종료
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[supervisor] ${signal} received, shutting down…`);
    try {
      if (sup.child && sup.child.exitCode === null && sup.child.signalCode === null) await sup.stop();
    } catch (e) { logger.warn(`[supervisor] could not stop the main server: ${e.message}`); }
    // stop() 이 실패했거나 경쟁 상태였더라도, 남아 있는 메인 프로세스는 반드시 정리한다 (포트 점유 방지)
    try {
      if (sup.child && sup.child.exitCode === null && sup.child.signalCode === null) sup.child.kill('SIGKILL');
    } catch { /* noop */ }
    server.close(() => {
      logger.info('[supervisor] stopped');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('message', (message) => {
    if (message?.type === 'aidot:shutdown') shutdown('PARENT_REQUEST');
  });
  // Electron(부모) 이 강제 종료되면 fork IPC 채널이 끊긴다 → 메인 서버까지 정리하고 종료.
  //   (이게 없으면 앱을 강제 종료했을 때 서버 프로세스가 남아 포트를 계속 점유한다)
  process.on('disconnect', () => shutdown('PARENT_DISCONNECT'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`[supervisor] unhandledRejection: ${reason}`);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`[supervisor] uncaughtException: ${err.message}`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('supervisor bootstrap failed:', err);
  process.exit(1);
});
