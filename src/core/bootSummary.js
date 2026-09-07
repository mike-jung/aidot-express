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
  const on = [`${dir}/ (전체)`];
  const off = [];
  if (log.sql) on.push(`${dir}/sql/ (SQL 전용)`);
  else off.push('SQL 분리는 LOG_SQL=true');
  if (log.admin) on.push('admin 포함');
  else off.push('admin 로그는 LOG_ADMIN=true');
  return on.join(' · ') + (off.length ? `   [${off.join(', ')}]` : '') + '  [내부 로그는 LOG_INTERNAL=true]';
}

/**
 * 스키마 안 테이블의 부류를 한 줄로.
 *  예제를 껐으면 그것도 말해 준다 — 조용히 빠지면 "왜 테이블이 없지" 가 된다.
 */
function tableGroups(db = {}) {
  const pre = db.samplePrefix || 'sample_';
  const parts = ['admin_* (콘솔 운영)', 'users · refresh_tokens (앱 인증)'];
  if (db.samples === false) parts.push(`${pre}* 없음 — DB_SAMPLES=false`);
  else parts.push(`${pre}* (예제 — 지워도 됩니다)`);
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
    problems.push({ what: 'DB 연결 실패', how: dbStatus.hint || '.env 의 DB 접속 정보를 확인하세요' });
  }

  // 관리자 계정이 없으면 로그인이 불가능하다. v1.7.4 이전에는 이 경우에도 '로그인 가능' 이라고 찍혔다.
  if (admin.exists === false) {
    problems.push({
      what: '관리자 계정 없음',
      how: admin.error
        ? `${admin.error} — 원인을 고치고 다시 시작하면 자동 생성됩니다`
        : 'admin_users 가 비어 있는지 확인하고 서버를 다시 시작하세요',
    });
  }

  if (migration.ok === false) {
    problems.push({
      what: migration.skipped ? '마이그레이션 건너뜀 (DB 미연결)' : '마이그레이션 실패',
      how: migration.skipped
        ? 'DB 연결 후 서버를 다시 시작하면 자동 적용됩니다'
        : `${migration.error || '원인 미상'} — 고친 뒤 다시 시작하세요`,
    });
  }

  const lines = [''];

  if (problems.length === 0) {
    lines.push('  ─────────────────────────────────────────────────────────────');
    lines.push(`   기동 요약   ${versionLine}`);
    lines.push(`     서버    http://localhost:${port}`);
    /* ★ v1.9.3 — 어떤 로그 파일이 만들어지는지 알려 준다.
       SQL 전용 파일은 기본이 꺼짐인데, 그 사실을 알 방법이 없어
       "분리 저장되는 줄 알았는데 파일이 없다" 는 혼란이 있었다. */
    lines.push(`     로그    ${logDestinations(log)}`);
    /* ★ v1.10.16 — 스키마 안 테이블이 무엇인지 알려 준다.
       처음 여는 사람은 admin_* / users / sample_* 가 뒤섞인 목록을 보고
       무엇을 지워도 되는지 몰라 "복잡하다" 고 느낀다. */
    lines.push(`     테이블  ${tableGroups(db)}`);
  /* ★ v1.10.42 — 내가 만든 파일이 어디로 가는지 알려 준다.
     지정하지 않았으면 아예 말하지 않는다 — 안 쓰는 기능을 설명하면 잡음이다.
     ⚠ 이 파일은 import 가 없는 순수 함수다. 경로는 **인자로** 받는다. */
  if (workspace) {
    lines.push(`     작업폴더 ${workspace}/  — 콘솔에서 만드는 컨트롤러·서비스·SQL 이 여기 저장됩니다`);
  }
    lines.push(`     DB      OK  ${dbStatus.adapter || '?'}${dbTarget ? ` / ${dbTarget}` : ''}`);

    // 샘플 마이그레이션이 non-blocking 으로 실패한 경우 — 핵심 스키마는 정상이므로 문제로 올리지 않되 알린다.
    if (migration.partial && (migration.failed?.length)) {
      lines.push(`     샘플    ${migration.failed.length}건 실패 (핵심 스키마는 정상) — 위 로그의 [migration] 항목 참고`);
    }

    // 기본 비밀번호를 그대로 쓰는 중이면 여기서 알려 준다.
    //   수백 줄 로그 사이의 WARN 한 줄은 사용자에게 도달하지 않는다는 것이 v1.7.3 에서 확인됐다.
    //   운영(production)에서는 비밀번호 값을 절대 출력하지 않는다.
    if (admin.defaultPassword && env !== 'production') {
      lines.push(`     로그인  가능 — ${admin.username || 'admin'} / ${admin.defaultPassword}`);
      lines.push(`     ⚠ 주의  ${admin.normalized ? '옛 기본 비밀번호를 기본값으로 맞췄습니다. ' : ''}`
        + '기본 비밀번호입니다 — 로그인 후 [사용자 관리 → 내 비밀번호 변경]');
    } else if (admin.defaultPassword) {
      lines.push('     로그인  가능 — 기본 비밀번호 사용 중, 로그인 후 즉시 변경하세요');
    } else {
      lines.push('     로그인  가능 — 콘솔에서 로그인하세요');
    }
    lines.push('  ─────────────────────────────────────────────────────────────');
  } else {
    lines.push('  ╔════════════════════════════════════════════════════════════════════════════╗');
    lines.push('  ║  ⚠ 서버는 떴지만 정상 동작 상태가 아닙니다 — 아래를 해결해야 합니다          ║');
    lines.push('  ╚════════════════════════════════════════════════════════════════════════════╝');
    lines.push(`     서버    http://localhost:${port}   (${versionLine})`);
    problems.forEach((p, i) => {
      lines.push(`     ${i + 1}) ${p.what}`);
      lines.push(`        → ${p.how}`);
    });
    lines.push('     로그인  불가 — 위 문제를 해결하고 서버를 다시 시작하세요');
    lines.push('     도움말  docs/GUIDE_01_MARIADB_AND_ENV.md (9번 문제 해결 표)');
    lines.push('  ══════════════════════════════════════════════════════════════════════════════');
  }
  lines.push('');

  return { ok: problems.length === 0, problems, lines };
}

export default { buildBootSummary };
