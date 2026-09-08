/**
 * bootSummary.js — 기동 요약 문구 생성 (순수 함수).
 *
 *  v1.7.4 에서 app.js 에 있던 printBootSummary() 의 판단 로직을 여기로 분리했다.
 *  이유: 이 요약이 "로그인 가능" 이라고 거짓말을 하는 사고가 두 번 있었는데
 *    (① 마이그레이션 절반 적용, ② 관리자 계정 미생성),
 *    서버를 실제로 띄우지 않고는 검증할 수 없는 구조라 회귀를 잡지 못했다.
 *    입력 → 문자열 배열의 순수 함수로 두면 단위 테스트가 가능하다.
 */

/**
 * @param {object}  o
 * @param {number}  o.port
 * @param {string}  o.versionLine   예: 'v1.7.4 (release, ...)'
 * @param {string}  o.env           config.env
 * @param {object}  o.dbStatus      db.getDbStatus() — { available, adapter, hint }
 * @param {string}  o.dbTarget      표시할 DB 이름 또는 sqlite 파일 경로
 * @param {object}  o.migration     bootStatus.migration — { ok, skipped, error, partial, failed }
 * @param {object}  o.admin         bootStatus.admin — { exists, username, defaultPassword, normalized, error }
 * @returns {{ ok: boolean, problems: Array<{what:string,how:string}>, lines: string[] }}
 */
/**
 * 현재 켜진 로그 대상을 한 줄로.
 *  꺼진 것도 **켜는 방법과 함께** 보여 준다 — 없다는 사실보다 켜는 법이 필요하다.
 */
function logDestinations(log = {}) {
  const dir = log.dir || 'log';
  const on = [`${dir}/ (everything)`];
  const off = [];
  if (log.sql) on.push(`${dir}/sql/ (SQL only)`);
  else off.push('set LOG_SQL=true to split SQL out');
  if (log.admin) on.push('including admin');
  else off.push('set LOG_ADMIN=true for admin logs');
  return on.join(' · ') + (off.length ? `   [${off.join(', ')}]` : '') + '  [set LOG_INTERNAL=true for internal logs]';
}

/**
 * 스키마 안 테이블의 부류를 한 줄로.
 *  예제를 껐으면 그것도 말해 준다 — 조용히 빠지면 "왜 테이블이 없지" 가 된다.
 */
function tableGroups(db = {}) {
  const pre = db.samplePrefix || 'sample_';
  const parts = ['admin_* (the console)', 'users · refresh_tokens (app auth)'];
  if (db.samples === false) parts.push(`no ${pre}* — DB_SAMPLES=false`);
  else parts.push(`${pre}* (samples — safe to drop)`);
  return parts.join(' · ');
}

export function buildBootSummary({
  port, versionLine = '', env = 'development',
  dbStatus = {}, dbTarget = '', migration = {}, admin = {},
  // ★ v1.10.16 — 테이블 부류 안내를 위한 db 설정 스냅샷
  db = {},
  // ★ v1.9.3 — 어떤 로그 파일이 만들어지는지 알려 주기 위한 설정 스냅샷
  log = {},
  /* ★ v1.10.42 — 작업 폴더의 상대 경로 (없으면 빈 문자열).
     이 파일은 import 가 없는 순수 함수라, 경로는 부르는 쪽이 넘긴다. */
  workspace = '',
} = {}) {
  const problems = [];

  if (dbStatus.available === false) {
    problems.push({ what: 'database connection failed', how: dbStatus.hint || 'check the database settings in .env' });
  }

  // 관리자 계정이 없으면 로그인이 불가능하다. v1.7.4 이전에는 이 경우에도 '로그인 가능' 이라고 찍혔다.
  if (admin.exists === false) {
    problems.push({
      what: 'no admin account',
      how: admin.error
        ? `${admin.error} — fix it and restart; the account is created automatically`
        : 'check whether admin_users is empty, then restart the server',
    });
  }

  if (migration.ok === false) {
    problems.push({
      what: migration.skipped ? 'migrations skipped (no database)' : 'migrations failed',
      how: migration.skipped
        ? 'connect the database and restart; they apply automatically'
        : `${migration.error || 'reason unknown'} — fix it and restart`,
    });
  }

  const lines = [''];

  if (problems.length === 0) {
    lines.push('  ─────────────────────────────────────────────────────────────');
    lines.push(`   Startup summary   ${versionLine}`);
    lines.push(`     Server    http://localhost:${port}`);
    /* ★ v1.9.3 — 어떤 로그 파일이 만들어지는지 알려 준다.
       SQL 전용 파일은 기본이 꺼짐인데, 그 사실을 알 방법이 없어
       "분리 저장되는 줄 알았는데 파일이 없다" 는 혼란이 있었다. */
    lines.push(`     Logs      ${logDestinations(log)}`);
    /* ★ v1.10.16 — 스키마 안 테이블이 무엇인지 알려 준다.
       처음 여는 사람은 admin_* / users / sample_* 가 뒤섞인 목록을 보고
       무엇을 지워도 되는지 몰라 "복잡하다" 고 느낀다. */
    lines.push(`     Tables    ${tableGroups(db)}`);
  /* ★ v1.10.42 — 내가 만든 파일이 어디로 가는지 알려 준다.
     지정하지 않았으면 아예 말하지 않는다 — 안 쓰는 기능을 설명하면 잡음이다.
     ⚠ 이 파일은 import 가 없는 순수 함수다. 경로는 **인자로** 받는다. */
  if (workspace) {
    lines.push(`     Workspace ${workspace}/  — controllers, services and SQL you create in the console live here`);
  }
    lines.push(`     DB      OK  ${dbStatus.adapter || '?'}${dbTarget ? ` / ${dbTarget}` : ''}`);

    // 샘플 마이그레이션이 non-blocking 으로 실패한 경우 — 핵심 스키마는 정상이므로 문제로 올리지 않되 알린다.
    if (migration.partial && (migration.failed?.length)) {
      lines.push(`     Samples   ${migration.failed.length} failed (the core schema is fine) — see the [migration] lines above`);
    }

    // 기본 비밀번호를 그대로 쓰는 중이면 여기서 알려 준다.
    //   수백 줄 로그 사이의 WARN 한 줄은 사용자에게 도달하지 않는다는 것이 v1.7.3 에서 확인됐다.
    //   운영(production)에서는 비밀번호 값을 절대 출력하지 않는다.
    if (admin.defaultPassword && env !== 'production') {
      lines.push(`     Sign in   ${admin.username || 'admin'} / ${admin.defaultPassword}`);
      lines.push(`     ⚠ Note    ${admin.normalized ? 'the old default password was reset to the default. ' : ''}`
        + 'this is the default password — change it under Users → My password');
    } else if (admin.defaultPassword) {
      lines.push('     Sign in   using the default password — change it as soon as you sign in');
    } else {
      lines.push('     Sign in   through the console');
    }
    lines.push('  ─────────────────────────────────────────────────────────────');
  } else {
    lines.push('  ╔════════════════════════════════════════════════════════════════════════════╗');
    lines.push('  ║  ⚠ The server is up but not healthy — the items below need fixing        ║');
    lines.push('  ╚════════════════════════════════════════════════════════════════════════════╝');
    lines.push(`     Server    http://localhost:${port}   (${versionLine})`);
    problems.forEach((p, i) => {
      lines.push(`     ${i + 1}) ${p.what}`);
      lines.push(`        → ${p.how}`);
    });
    lines.push('     Sign in   not possible — fix the above and restart the server');
    lines.push('     Help      docs/GUIDE_01_MARIADB_AND_ENV.md (troubleshooting table 9)');
    lines.push('  ══════════════════════════════════════════════════════════════════════════════');
  }
  lines.push('');

  return { ok: problems.length === 0, problems, lines };
}

export default { buildBootSummary };
