/**
 * traceStore.js — 요청 추적을 모으고, 저장하고, **사람이 읽을 이야기로 되돌린다.** (v1.8.0)
 *
 *  ## 세 겹으로 나눈 이유
 *   1. **메모리 링버퍼** — 최근 N건은 DB 를 거치지 않고 즉시 조회된다.
 *      DB 가 죽은 순간의 요청도 남는다 (장애 조사에서 정확히 그때가 필요하다).
 *   2. **DB 영속** — `request_traces` / `request_steps`. 며칠 전 것을 찾을 수 있어야 한다.
 *   3. **서술 복원** — 단계 목록을 그대로 보여 주는 건 개발자용이다.
 *      감사/운영자는 "누가 무엇을 했는가" 를 문장으로 읽어야 한다.
 *
 *  ## 저장하지 않는 것
 *  요청 본문과 응답 본문은 **저장하지 않는다.** 환자 정보가 섞이는 순간
 *  추적 테이블 자체가 유출 경로가 된다. 경로의 숫자 ID 도 마스킹한다.
 */
import db from '../database/db.js';
import logger from '../util/logger.js';
import sqlRegistry from './sqlLoader.js';
import traceWriter from './traceWriter.js';
import config from '../config/index.js';

/** 최근 요청 링버퍼 — DB 가 없어도 동작해야 한다 */
/* ★ v1.11.3 — 설정 가능. 300 이면 200 rps 에서 1.5초어치라 "최근 요청" 이 순식간에 밀려 나갔다. 기본 1000. */
const RING_MAX = Math.max(50, Number(config.trace?.ringMax) || 1000);
const ring = [];

/** DB 적재 실패가 반복될 때 로그를 도배하지 않도록 */
let persistWarned = false;

/**
 * 경로에서 식별자를 지운다.
 *   `/api/admin/users/42/unlock` → `/api/admin/users/:id/unlock`
 * 감사 로그에 환자번호·계정 ID 가 그대로 남지 않게 하는 최소 방어선이다.
 */
export function maskPath(p) {
  return String(p || '')
    .split('?')[0]
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:uuid')
    .slice(0, 300);
}

/** 요청이 끝났을 때 컨텍스트를 추적 레코드로 굳힌다 */
export function finish(ctx, { status, bytes } = {}) {
  if (!ctx) return null;
  const rec = {
    requestId: ctx.requestId,
    traceId: ctx.traceId,
    ts: new Date(ctx.startedAt),
    method: ctx.method,
    path: maskPath(ctx.path),
    route: ctx.route || null,
    status: status ?? 0,
    durationMs: Date.now() - ctx.startedAt,
    userId: ctx.user?.id ?? null,
    username: ctx.user?.username ?? null,
    userKind: ctx.user?.kind ?? null,
    ip: ctx.ip,
    userAgent: String(ctx.userAgent || '').slice(0, 200),
    bytes: bytes ?? null,
    steps: ctx.steps,
    truncated: ctx.truncated,
  };
  ring.push(rec);
  if (ring.length > RING_MAX) ring.shift();
  return rec;
}

/* ══════════════════════════════════════════════════════════════════════════
   저장
   ══════════════════════════════════════════════════════════════════════════ */

/** 어떤 요청을 남길지 — 전부 남기면 표가 잡음으로 가득 찬다 */
function shouldPersist(rec) {
  const t = config.trace || {};
  if (t.enabled === false) return false;
  if (rec.status >= 400) return true;                       // 오류는 언제나
  if (rec.durationMs >= (t.slowMs ?? 500)) return true;     // 느린 요청
  if (rec.method !== 'GET') return true;                    // 변경 행위는 언제나 (감사 목적)
  /* ★ v1.10.36 — **로그인한 사람의 요청은 빠른 GET 이라도 남긴다.**
     예전에는 빠른 GET 을 전부 걸렀는데(표가 잡음으로 차니 타당하다),
     그러면 "방금 내가 보낸 요청" 이 목록에 없다. 개발자가 [요청 추적]을
     쓰는 가장 흔한 이유가 바로 그것이므로 예외를 둔다.
     익명 요청(헬스체크·정적 파일 등)은 그대로 걸러진다 — 그게 잡음의 대부분이다. */
  if (rec.username) return true;
  return (t.sampleGet ?? false);                            // 익명의 단순 조회는 표본 제외
}

/**
 * ★ v1.10.45 — 곧바로 쓰지 않고 **큐에 넣는다.**
 *
 *  예전에는 여기서 INSERT 를 여러 번 했습니다. 응답은 안 붙잡았지만
 *  **커넥션 풀과 CPU 는 그대로 써서**, 뒤따르는 요청이 밀렸습니다
 *  (실측: 처리량 168 → 241 rps, 44% 차이).
 *
 *  이제 큐에 넣고 즉시 반환합니다. 실제 쓰기는 1초마다 **한꺼번에**
 *  일어나며, 여러 요청의 단계를 다중 VALUES 한 문장으로 묶습니다.
 *
 *      요청 20건 × 5단계  →  예전 INSERT 120번  ·  지금 2번
 *
 *  ⚠ 부하가 심하면 큐에 넣기 전에 걸러냅니다 (traceWriter 참고).
 */
export async function persist(rec) {
  if (!rec || !shouldPersist(rec)) return;
  if (db.isDbUnavailable?.()) return;
  traceWriter.enqueue(rec);
}

/* ══════════════════════════════════════════════════════════════════════════
   조회
   ══════════════════════════════════════════════════════════════════════════ */

export function recentFromMemory(limit = 50) {
  return ring.slice(-limit).reverse();
}
export function ringCapacity() { return RING_MAX; }

export function findInMemory(requestId) {
  return ring.find((r) => r.requestId === requestId) || null;
}

/* ══════════════════════════════════════════════════════════════════════════
   서술 복원 — 단계 목록을 문장으로
   ══════════════════════════════════════════════════════════════════════════ */

/** 경로 → 사람이 아는 화면/행위 이름 */
const ROUTE_WORDS = [
  [/^\/api\/admin\/auth\/login$/, '관리자 콘솔에 로그인'],
  [/^\/api\/admin\/auth\/logout/, '로그아웃'],
  [/^\/api\/admin\/users/, '사용자 관리'],
  [/^\/api\/admin\/controllers/, '컨트롤러'],
  [/^\/api\/admin\/services/, '서비스'],
  [/^\/api\/admin\/sqls/, 'SQL 파일'],
  [/^\/api\/admin\/screen-projects/, '화면 프로젝트'],
  [/^\/api\/admin\/backup/, '백업/복원'],
  [/^\/api\/admin\/secure/, '컬럼 암호화 설정'],
  [/^\/api\/admin\/metrics/, '모니터링'],
  [/^\/api\/admin\/access/, '접속 통계'],
  [/^\/api\/admin\/logs/, '로그'],
  [/^\/api\/admin\/mci/, 'MCI 설정'],
  [/^\/api\/auth\/login$/, '로그인'],
];

const VERB = {
  GET: '조회했습니다', POST: '만들었습니다', PUT: '수정했습니다',
  PATCH: '수정했습니다', DELETE: '삭제했습니다',
};

/**
 * 한글 조사를 받침 유무에 맞춰 고른다.
 *   "컨트롤러을(를)" 처럼 나오면 기계가 쓴 티가 나고 읽기도 걸린다.
 *   한글 음절은 U+AC00 부터 28개 종성 주기로 배열되므로 (코드-0xAC00) % 28 로 받침을 안다.
 *   끝이 한글이 아니면(영문/숫자/기호) 받침 없는 쪽을 쓴다 — 'SQL를' 보다 'SQL을' 이 낫지만
 *   판단이 어려운 경우가 많아 안전한 기본값을 택한다.
 */
export function josa(word, pair = '을/를') {
  const [withBatchim, withoutBatchim] = pair.split('/');
  const ch = String(word || '').trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (Number.isNaN(code)) return withoutBatchim;
  /* ★ v1.10.37 — 한글이 아니면 무조건 받침 있는 쪽을 썼더니
     `listPaged이`, `SnackService을` 처럼 읽히지 않는 말이 나왔다.
     영문·숫자는 **읽는 소리**로 판정한다: 'listPaged' 는 [드]로 끝나 받침이
     있고, 'BookService' 는 [스]로 끝나 받침이 없다. */
  if (code < 0xac00 || code > 0xd7a3) {
    const tail = String(word).trim().toLowerCase().slice(-1);
    // 모음과 n·l·m·r 로 끝나면 받침 없는 것처럼 읽는다
    const openEnd = 'aeiouy'.includes(tail);
    return openEnd ? withoutBatchim : withBatchim;
  }
  return (code - 0xac00) % 28 === 0 ? withoutBatchim : withBatchim;
}

/* ★ v1.11.7 — 사용자 API(/api/<자원>)의 낱말. 예전에는 "/api/books을 만들었습니다" 처럼 경로가 그대로 나왔다.
   사전에 없으면 자원 이름을 그대로 쓴다 (books → "books"). */
const RESOURCE_WORDS = {
  books: '책', book: '책', snacks: '간식', snack: '간식', supplies: '준비물', guestbook: '방명록', students: '학생', student: '학생',
  persons: '사람', person: '사람', users: '사용자', user: '사용자', weights: '체중 기록', weight: '체중 기록',
  bp: '혈압 기록', bloodsugar: '혈당 기록', files: '파일', uploads: '파일', events: '알림', mci: 'MCI 조회',
};
function subjectOf(path) {
  for (const [re, word] of ROUTE_WORDS) if (re.test(path)) return word;
  const m = /^\/api\/(?!admin\/)([a-zA-Z0-9_-]+)(?:\/([^/?]+))?/.exec(String(path || ''));
  if (m) {
    const noun = RESOURCE_WORDS[m[1].toLowerCase()] || m[1];
    return m[2] && /^(:id|\d+|[^/]+)$/.test(m[2]) ? `${noun} 한 건` : noun;
  }
  return path;
}

/* ★ v1.11.3 — 하위 행위. 예전에는 POST /api/admin/sqls/test 가 "SQL 파일을 만들었습니다" 로 서술됐다 —
   메서드만 보고 동사를 고르니 시험 실행이 '만들기' 가 됐다. 경로 끝의 행위 이름을 먼저 본다. */
const ACTION_WORDS = [
  [/\/test(-send)?$/, '시험 실행했습니다'], [/\/preview$/, '미리보기를 만들었습니다'], [/\/download$/, '내려받았습니다'],
  [/\/restore$/, '복원했습니다'], [/\/reset$/, '초기화했습니다'], [/\/analyze$/, '분석했습니다'], [/\/login$/, '로그인했습니다'],
  [/\/logout/, '로그아웃했습니다'], [/\/refresh$/, '토큰을 갱신했습니다'], [/\/query$/, '조회했습니다'], [/\/search$/, '검색했습니다'],
  [/\/publish$/, '알림을 보냈습니다'], [/\/retention\/run$/, '보관 정리를 실행했습니다'],
];
function actionOf(path, method) {
  const base = String(path || '').split('?')[0];
  for (const [re, word] of ACTION_WORDS) if (re.test(base)) return word;
  return VERB[method] || '요청했습니다';
}

/**
 * 요청 하나를 한 문장으로.
 *   "admin 님이 컨트롤러를 삭제했습니다 — 성공 (128ms, SQL 3회)"
 */
export function describe(rec) {
  const who = rec.username ? `${rec.username} 님이` : '익명 사용자가';
  const what = subjectOf(rec.path);
  const verb = actionOf(rec.path, rec.method);

  let result;
  if (rec.status === 0) result = '응답 없음';
  else if (rec.status >= 500) result = `서버 오류 (${rec.status})`;
  else if (rec.status === 401) result = '인증 실패';
  else if (rec.status === 403) result = '권한 없음';
  else if (rec.status === 404) result = '대상 없음';
  else if (rec.status >= 400) result = `요청 거부 (${rec.status})`;
  else result = '성공';

  const sqlCount = rec.steps.filter((s) => s.kind === 'sql').length;
  const bits = [`${rec.durationMs}ms`];
  if (sqlCount) bits.push(`SQL ${sqlCount}회`);
  const rows = rec.steps.reduce((a, s) => a + (s.rows || 0), 0);
  if (rows) bits.push(`${rows}건`);

  return `${who} ${what}${josa(what, '을/를')} ${verb} — ${result} (${bits.join(', ')})`;
}

/**
 * 단계들을 사람이 읽는 줄로 편다.
 *   개발자에게는 폭포수가 낫지만, 감사·운영자에게는 이 줄들이 필요하다.
 */
export function narrate(rec) {
  const out = [];
  out.push({ at: 0, icon: 'bi-box-arrow-in-right', text: `${rec.method} ${rec.path} 요청이 들어왔습니다`, tone: 'muted' });

  for (const s of rec.steps) {
    if (s.kind === 'auth') {
      out.push({ at: s.at, icon: 'bi-person-check', tone: s.ok ? 'ok' : 'bad',
        text: s.ok ? `${s.name} 으로 인증되었습니다` : `인증에 실패했습니다 — ${s.detail || s.name}` });
    } else if (s.kind === 'controller') {
      /* ★ v1.10.37 — 진입과 완료를 갈라 말한다.
         v1.10.35 에서 완료 단계를 `이름 완료` 로 넣었더니
         "…완료가 요청을 받았습니다" 라는 말이 안 되는 문장이 나왔다. */
      const done = / 완료$/.test(s.name);
      const who = s.name.replace(/ 완료$/, '');
      out.push({
        at: s.at, icon: 'bi-diagram-3', tone: 'muted',
        text: done
          ? `${who}${josa(who, '이/가')} 처리를 마쳤습니다 (${s.ms ?? '?'}ms)`
          : `${who}${josa(who, '이/가')} 요청을 받았습니다`,
      });
    } else if (s.kind === 'service') {
      out.push({ at: s.at, icon: 'bi-gear', tone: 'muted', text: `${s.name}${josa(s.name, '을/를')} 호출했습니다` });
    } else if (s.kind === 'sql') {
      const rows = s.rows != null ? ` → ${s.rows}건` : '';
      out.push({ at: s.at, icon: 'bi-database', tone: s.ok ? 'muted' : 'bad',
        text: s.ok ? `SQL ${s.name} 실행 (${s.ms ?? '?'}ms)${rows}` : `SQL ${s.name} 실패 — ${s.detail || ''}` });
    } else if (s.kind === 'sse') {
      out.push({ at: s.at, icon: 'bi-broadcast', tone: 'muted', text: `실시간 채널 ${s.name} — ${s.detail || ''}` });
    } else if (s.kind === 'mci') {
      out.push({ at: s.at, icon: 'bi-plug', tone: s.ok ? 'muted' : 'bad', text: `MCI ${s.name} (${s.ms ?? '?'}ms)` });
    } else if (s.kind === 'error') {
      out.push({ at: s.at, icon: 'bi-exclamation-triangle', tone: 'bad', text: `오류: ${s.name}${s.detail ? ' — ' + s.detail : ''}` });
    } else {
      out.push({ at: s.at, icon: 'bi-dot', tone: 'muted', text: `${s.name}${s.detail ? ' — ' + s.detail : ''}` });
    }
  }

  if (rec.truncated) {
    out.push({ at: rec.durationMs, icon: 'bi-three-dots', tone: 'muted',
      text: '단계가 너무 많아 이후는 기록하지 않았습니다 (상한 200)' });
  }
  out.push({
    at: rec.durationMs,
    icon: rec.status >= 400 ? 'bi-x-circle' : 'bi-check-circle',
    tone: rec.status >= 400 ? 'bad' : 'ok',
    text: `${rec.status} 응답으로 끝났습니다 (총 ${rec.durationMs}ms)`,
  });
  return out;
}

export default {
  josa, maskPath, finish, persist, recentFromMemory, findInMemory, describe, narrate, ringCapacity,
};
