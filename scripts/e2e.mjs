#!/usr/bin/env node
/**
 * scripts/e2e.mjs — 실행 검증 (서버가 떠 있는 상태에서 HTTP 로 호출)
 *   사용: node scripts/e2e.mjs [baseUrl]   (기본 http://localhost:7901)
 *   환경: E2E_ADMIN_USER / E2E_ADMIN_PASS (기본 admin / admin1234)
 *
 *  검증 항목
 *   1) 관리자 로그인 / 토큰 realm / 콘솔 API 접근
 *   2) 보안 회귀: 무인증 admin signup 차단, user 토큰으로 콘솔 API 차단(403 REALM_MISMATCH),
 *      경로 탈출 id 거부(400), 잠금/실패 응답
 *   3) 샘플 컨트롤러 CRUD (Book/Person/Student/Weight/BP/BS/SecureMember/Home/Auth)
 *   4) 관리자 콘솔이 쓰는 조회 API 스모크 (routes/openapi/metrics/logs/system/users/sqls/controllers/services)
 */
const base = (process.argv[2] || process.env.E2E_BASE || 'http://localhost:7901').replace(/\/$/, '');
const ADMIN = { username: process.env.E2E_ADMIN_USER || 'admin', password: process.env.E2E_ADMIN_PASS || 'admin1234' };
let pass = 0, fail = 0; const failures = [];
const stamp = Date.now().toString(36);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, path, { body, token, cookie, rawBody } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const payload = rawBody !== undefined ? rawBody : (body === undefined ? undefined : JSON.stringify(body));
  const res = await fetch(base + path, { method, headers, body: payload, redirect: 'manual' });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text, setCookie: res.headers.get('set-cookie') };
}
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ✗ ${name}  ${detail ? '— ' + String(detail).slice(0, 160) : ''}`); }
}
const okData = (r) => r.status === 200 && (r.json?.code === 200 || r.json?.ok === true || r.json?.data !== undefined);

console.log(`e2e → ${base}`);
// ───────────────────── 0. health
{
  const h = await req('GET', '/health');
  check('GET /health 200', h.status === 200 && h.json?.ok === true, h.text);
  const hv = await req('GET', '/health');
  check('/health 에 버전 정보 포함', typeof hv.json?.version === 'string' && hv.json.version !== 'unknown', JSON.stringify(hv.json));
  const sh = await req('GET', '/api/admin/system/health');
  check('GET /api/admin/system/health (무인증) ok=true', sh.json?.data?.ok === true, sh.text);
}
// ───────────────────── 1. 관리자 로그인
let adminToken = null; let adminCookie = null;
{
  const r = await req('POST', '/api/admin/auth/login', { body: ADMIN });
  check('admin login 200', r.status === 200 && r.json?.data?.accessToken, r.text);
  adminToken = r.json?.data?.accessToken; adminCookie = (r.setCookie || '').split(';')[0];
  const payload = adminToken ? JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64url').toString()) : {};
  check('admin token realm=admin', payload.realm === 'admin', JSON.stringify(payload));
  check('login 응답에 mustChangePassword 포함', typeof r.json?.data?.user?.mustChangePassword === 'boolean', JSON.stringify(r.json?.data?.user));
  const bad = await req('POST', '/api/admin/auth/login', { body: { username: 'admin', password: 'wrong-password-x' } });
  check('admin 잘못된 비밀번호 401', bad.status === 401, bad.text);
  const me = await req('GET', '/api/admin/auth/me', { token: adminToken });
  check('GET /api/admin/auth/me 200', me.status === 200 && me.json?.data?.user?.realm === 'admin', me.text);
  const rf = await req('POST', '/api/admin/auth/refresh', { cookie: adminCookie });
  check('admin refresh(rotation) 200', rf.status === 200 && rf.json?.data?.accessToken, rf.text);
  const reuse = await req('POST', '/api/admin/auth/refresh', { cookie: adminCookie });
  check('admin refresh 재사용 감지 401', reuse.status === 401, reuse.text);
  // 재사용 감지로 family 가 폐기됐으므로 새로 로그인
  const r2 = await req('POST', '/api/admin/auth/login', { body: ADMIN });
  adminToken = r2.json?.data?.accessToken; adminCookie = (r2.setCookie || '').split(';')[0];
}
// ───────────────────── 2. 보안 회귀
{
  const s = await req('POST', '/api/admin/auth/signup', { body: { name: 'x', username: `evil_${stamp}`, email: `evil_${stamp}@x.io`, password: 'Evil-pass-12345' } });
  check('무인증 /api/admin/auth/signup 403', s.status === 403, s.text);
  const s2 = await req('POST', '/api/admin/auth/signup', { token: adminToken, body: { name: 'x', username: `ok_${stamp}`, email: `ok_${stamp}@x.io`, password: 'Strong-pass-12345' } });
  check('admin 토큰으로 signup 201', s2.status === 201, s2.text);

  // 일반 사용자 가입/로그인 → 콘솔 API 차단
  const us = await req('POST', '/api/auth/signup', { body: { requestCode: 'e2e', name: '일반', username: `user_${stamp}`, email: `user_${stamp}@x.io`, password: 'User-pass-1234' } });
  check('user signup 201', us.status === 201, us.text);
  const ul = await req('POST', '/api/auth/login', { body: { requestCode: 'e2e', username: `user_${stamp}`, password: 'User-pass-1234' } });
  check('user login 200', ul.status === 200 && ul.json?.data?.accessToken, ul.text);
  const userToken = ul.json?.data?.accessToken;
  const esc = await req('GET', '/api/admin/sqls/all', { token: userToken });
  check('user 토큰으로 콘솔 API → 403 REALM_MISMATCH', esc.status === 403 && esc.json?.errorCode === 'REALM_MISMATCH', esc.text);
  const esc2 = await req('POST', '/api/admin/sqls/test', { token: userToken, body: { sqlBody: 'SELECT 1' } });
  check('user 토큰으로 SQL 실행 → 403', esc2.status === 403, esc2.text);
  const me = await req('GET', '/api/auth/me', { token: userToken });
  check('user 토큰으로 /api/auth/me 200', me.status === 200, me.text);
  const trav = await req('GET', '/api/admin/controllers/..%2F..%2Fcore%2Fdecorators', { token: adminToken });
  check('경로 탈출 id → 400', trav.status === 400, trav.text);
  const trav2 = await req('DELETE', '/api/admin/services/..%2Fcore%2Fcontainer', { token: adminToken });
  check('경로 탈출 DELETE → 400', trav2.status === 400, trav2.text);
  const noauth = await req('PUT', '/api/admin/config/file', { body: { id: 'env', content: 'X=1' } });
  check('무인증 .env 쓰기 401', noauth.status === 401, noauth.text);
  const pol = await req('GET', '/api/books?__proto__=1', { token: adminToken });
  check('prototype pollution 쿼리 400', pol.status === 400, pol.text);
  const polb = await req('POST', '/api/home/echo', { rawBody: '{"a":1,"nested":{"__proto__":{"polluted":true}}}' });
  check('prototype pollution 본문 400', polb.status === 400, polb.text);
  const hpp = await req('GET', '/api/home/hello?name=a&name=b');
  check('HPP 중복 파라미터 → 마지막 값만', hpp.status === 200 && !Array.isArray(hpp.json?.data?.name) && JSON.stringify(hpp.json).includes('b'), hpp.text);
  const weak = await req('PUT', '/api/admin/users/me/password', { token: adminToken, body: { currentPassword: ADMIN.password, newPassword: 'admin12345' } });
  check('약한 새 비밀번호 거부 400', weak.status === 400, weak.text);
}
// ───────────────────── 3. 샘플 컨트롤러
{
  const b = await req('GET', '/api/books'); check('GET /api/books', okData(b) && Array.isArray(b.json.data), b.text);
  const bc = await req('POST', '/api/books', { body: { title: `e2e-${stamp}`, author: 'tester', price: 100 } });
  check('POST /api/books 201', bc.status === 201 || bc.status === 200, bc.text);
  const bid = bc.json?.data?.id ?? bc.json?.data?.insertId ?? bc.json?.data?.book?.id;
  if (bid) {
    const bu = await req('PUT', `/api/books/${bid}`, { body: { title: `e2e2-${stamp}`, author: 'tester2', price: 200 } }); check('PUT /api/books/:id', okData(bu), bu.text);
    const bg = await req('GET', `/api/books/${bid}`); check('GET /api/books/:id', okData(bg), bg.text);
    const bd = await req('DELETE', `/api/books/${bid}`); check('DELETE /api/books/:id', okData(bd), bd.text);
  } else check('books insert id 반환', false, bc.text);

  const p = await req('GET', '/api/person/', { token: adminToken }); check('GET /api/person (@Auth)', okData(p), p.text);
  const p401 = await req('GET', '/api/person/'); check('GET /api/person 무인증 401', p401.status === 401, p401.text);

  const st = await req('GET', '/api/students/'); check('GET /api/students', okData(st), st.text);
  const sp = await req('GET', '/api/students/paged?page=1&perPage=5'); check('GET /api/students/paged', okData(sp), sp.text);
  const sid = 9000 + (Date.now() % 1000);
  const sc = await req('POST', '/api/students/', { body: { id: sid, name: `학생-${stamp}` } }); check('POST /api/students', sc.status === 201 || okData(sc), sc.text);
  const sg = await req('GET', `/api/students/${sid}`); check('GET /api/students/:id', okData(sg), sg.text);

  const wl = await req('GET', '/api/wt/records'); check('GET /api/wt/records', okData(wl), wl.text);
  const wc = await req('POST', '/api/wt/records', { body: { date: '2026-08-01', weight: 70.5, memo: 'e2e' } }); check('POST /api/wt/records', okData(wc) || wc.status === 201, wc.text);
  const wid = wc.json?.data?.id ?? wc.json?.data?.insertId;
  if (wid) { const wd = await req('DELETE', `/api/wt/records/${wid}`); check('DELETE /api/wt/records/:id', okData(wd), wd.text); }
  const wg = await req('PUT', '/api/wt/goals', { body: { height: 175, min_weight: 65, max_weight: 72 } }); check('PUT /api/wt/goals (upsert)', okData(wg), wg.text);
  const wg2 = await req('PUT', '/api/wt/goals', { body: { height: 176, min_weight: 66, max_weight: 73 } }); check('PUT /api/wt/goals 2회차(ON DUPLICATE)', okData(wg2), wg2.text);
  const wgl = await req('GET', '/api/wt/goals'); check('GET /api/wt/goals', okData(wgl), wgl.text);

  const bpl = await req('GET', '/api/bp/records'); check('GET /api/bp/records', okData(bpl), bpl.text);
  const bpc = await req('POST', '/api/bp/records', { body: { date: '2026-08-02', label: '아침', systolic: 120, diastolic: 80, memo: 'e2e' } }); check('POST /api/bp/records', okData(bpc) || bpc.status === 201, bpc.text);
  const bpg = await req('PUT', '/api/bp/goals', { body: { type: 'systolic', min_value: 90, max_value: 130 } }); check('PUT /api/bp/goals', okData(bpg), bpg.text);
  const bpg2 = await req('PUT', '/api/bp/goals', { body: { type: 'systolic', min_value: 95, max_value: 135 } }); check('PUT /api/bp/goals 2회차', okData(bpg2), bpg2.text);
  const bpgl = await req('GET', '/api/bp/goals'); check('GET /api/bp/goals', okData(bpgl), bpgl.text);

  const bsl = await req('GET', '/api/bs/records'); check('GET /api/bs/records', okData(bsl), bsl.text);
  const bsc = await req('POST', '/api/bs/records', { body: { date: '2026-08-03', label: '공복', meal_time: 'before', value: 95, memo: 'e2e' } }); check('POST /api/bs/records', okData(bsc) || bsc.status === 201, bsc.text);
  const bsg = await req('PUT', '/api/bs/goals', { body: { type: 'fasting', min_value: 70, max_value: 100 } }); check('PUT /api/bs/goals', okData(bsg), bsg.text);

  const h1 = await req('GET', '/api/home/hello?name=e2e'); check('GET /api/home/hello', okData(h1), h1.text);
  const h2 = await req('POST', '/api/home/echo', { body: { a: 1 } }); check('POST /api/home/echo', okData(h2), h2.text);

  // 방명록(기본 샘플) — 설치 직후 바로 동작해야 한다
  const gl = await req('GET', '/api/guestbook/'); check('GET /api/guestbook', okData(gl) && Array.isArray(gl.json.data), gl.text);
  const gc = await req('POST', '/api/guestbook/', { body: { writer: `e2e-${stamp}`, message: '방명록 e2e' } });
  check('POST /api/guestbook 201', gc.status === 201 && gc.json?.data?.insertId > 0, gc.text);
  const gid = gc.json?.data?.insertId;
  if (gid) {
    const gg = await req('GET', `/api/guestbook/${gid}`); check('GET /api/guestbook/:id', okData(gg) && gg.json.data.writer.includes('e2e'), gg.text);
    const gu = await req('PUT', `/api/guestbook/${gid}`, { body: { writer: `e2e-${stamp}`, message: '고침' } }); check('PUT /api/guestbook/:id', okData(gu), gu.text);
    const gd = await req('DELETE', `/api/guestbook/${gid}`); check('DELETE /api/guestbook/:id', okData(gd), gd.text);
  }
  const gbad = await req('POST', '/api/guestbook/', { body: { writer: '', message: '' } });
  check('방명록 빈 값 검증 400', gbad.status === 400, gbad.text);

  const sm = await req('GET', '/api/secure-members/'); check('GET /api/secure-members', okData(sm) || sm.status === 503, sm.text);
}
// ───────────────────── 4. 콘솔 조회 API 스모크
{
  const paths = ['/api/admin/routes/', '/api/admin/openapi/spec', '/api/admin/metrics/current', '/api/admin/metrics/thresholds',
    '/api/admin/metrics/routes', '/api/admin/logs/kinds', '/api/admin/system/db-info', '/api/admin/system/ui-flags',
    '/api/admin/users/paged?page=1&perPage=5', '/api/admin/sqls/all', '/api/admin/sqls/paged?page=1&perPage=5',
    '/api/admin/controllers/paged?page=1&perPage=5', '/api/admin/controllers/BookController', '/api/admin/services/all',
    '/api/admin/services/BookService', '/api/admin/sqls/book', '/api/admin/access/overview', '/api/admin/access/status',
    '/api/admin/screen-projects/paged?page=1&perPage=5', '/api/admin/secure/status', '/api/admin/config/files',
    '/api/admin/backup/download'];
  for (const pth of paths) {
    const r = await req('GET', pth, { token: adminToken });
    check(`GET ${pth}`, r.status === 200, `${r.status} ${r.text.slice(0, 120)}`);
  }
  const sqlt = await req('POST', '/api/admin/sqls/test', { token: adminToken, body: { sqlBody: 'SELECT COUNT(*) AS c FROM book' } });
  check('POST /api/admin/sqls/test (admin)', sqlt.json?.data?.success === true, sqlt.text);
  const cols = await req('POST', '/api/admin/sqls/table-columns', { token: adminToken, body: { tableName: 'book' } });
  check('POST /api/admin/sqls/table-columns', cols.json?.data?.columns?.length > 0, cols.text);
  // 접속 통계 — 변경이 있을 때만 알려 주는 스트림 (폴링 대체)
  {
    const t = await req('POST', '/api/admin/sse/ticket', { token: adminToken, body: {} });
    const ticket = t.json?.data?.ticket;
    const ac = new AbortController();
    const seen = [];
    const r = await fetch(`${base}/api/admin/access/stream?ticket=${encodeURIComponent(ticket)}`,
      { headers: { Accept: 'text/event-stream' }, signal: ac.signal });
    check('콘솔: 접속통계 스트림 200', r.status === 200 && String(r.headers.get('content-type')).includes('event-stream'), `${r.status}`);
    (async () => {
      const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
      try {
        for (;;) {
          const { value, done } = await rd.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          let i; while ((i = buf.indexOf('\n\n')) >= 0) {
            const raw = buf.slice(0, i); buf = buf.slice(i + 2);
            const ev = /event: ([\w-]+)/.exec(raw); if (ev) seen.push(ev[1]);
          }
        }
      } catch { /* abort */ }
    })();
    // ⚠ e2e 자신이 만든 접속 기록이 아직 flush 대기 중일 수 있다(배치 주기 5초).
    //   먼저 그것들이 다 빠져나가길 기다린 뒤에야 "조용한 구간" 을 관찰할 수 있다.
    await sleep(6500);
    seen.length = 0;
    await sleep(2500);
    check('콘솔: 조용할 때는 알림이 오지 않음', seen.filter((e) => e === 'access-changed').length === 0, seen.join(','));
    // 감사 대상 요청(로그인)을 발생시키면 flush 후 신호가 와야 한다
    await req('POST', '/api/admin/auth/login', { body: { username: ADMIN.username, password: ADMIN.password } });
    await sleep(6500);
    check('콘솔: 접속 기록이 생기면 access-changed 수신', seen.includes('access-changed'), seen.join(','));
    ac.abort();
    await sleep(200);
  }

  // SSE 1회용 티켓 인증
  {
    const t = await req('POST', '/api/admin/sse/ticket', { token: adminToken, body: {} });
    check('콘솔: SSE 티켓 발급', t.status === 200 && typeof t.json?.data?.ticket === 'string' && t.json.data.expiresIn > 0, t.text.slice(0, 120));
    const ticket = t.json?.data?.ticket;
    const noAuthTicket = await req('POST', '/api/admin/sse/ticket', { body: {} });
    check('콘솔: 무인증 티켓 발급 401', noAuthTicket.status === 401, noAuthTicket.text.slice(0, 80));

    const ac = new AbortController();
    const r1 = await fetch(`${base}/api/admin/metrics/stream?intervalMs=2000&ticket=${encodeURIComponent(ticket)}`,
      { headers: { Accept: 'text/event-stream' }, signal: ac.signal });
    check('콘솔: 티켓으로 스트림 접속 200', r1.status === 200, `${r1.status}`);
    const reuse = await req('GET', `/api/admin/metrics/stream?ticket=${encodeURIComponent(ticket)}`);
    check('콘솔: 티켓 재사용 401 (1회용)', reuse.status === 401 && reuse.json?.errorCode === 'TICKET_INVALID', reuse.text.slice(0, 100));
    const forged = await req('GET', '/api/admin/metrics/stream?ticket=forged-value-1234');
    check('콘솔: 위조 티켓 401', forged.status === 401, forged.text.slice(0, 80));
    ac.abort();
    await sleep(300);
  }

  // 콘솔 [부하 모니터링] SSE 푸시 (폴링 대체)
  const msNoAuth = await req('GET', '/api/admin/metrics/stream');
  check('콘솔: 지표 스트림 무인증 401', msNoAuth.status === 401, msNoAuth.text.slice(0, 80));
  {
    const ac = new AbortController();
    const r = await fetch(`${base}/api/admin/metrics/stream?windowSec=30&intervalMs=1000&access_token=${encodeURIComponent(adminToken)}`,
      { headers: { Accept: 'text/event-stream' }, signal: ac.signal });
    check('콘솔: 지표 스트림 200 (쿼리 토큰 허용)', r.status === 200 && String(r.headers.get('content-type')).includes('event-stream'), `${r.status}`);
    const events = [];
    (async () => {
      const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
      try {
        for (;;) {
          const { value, done } = await rd.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          let i; while ((i = buf.indexOf('\n\n')) >= 0) {
            const raw = buf.slice(0, i); buf = buf.slice(i + 2);
            const ev = /event: ([\w-]+)/.exec(raw); if (ev) events.push(ev[1]);
          }
        }
      } catch { /* abort */ }
    })();
    await new Promise((res) => setTimeout(res, 2600));
    const n = events.filter((e) => e === 'metrics').length;
    check('콘솔: 지표 스냅샷이 주기적으로 푸시됨', n >= 2, `metrics 이벤트 ${n}건`);
    const st = await req('GET', '/api/admin/metrics/stream-status', { token: adminToken });
    check('콘솔: 발행 타이머 등록됨', Array.isArray(st.json?.data) && st.json.data.some((x) => x.clients >= 1), st.text.slice(0, 120));
    ac.abort();
    await new Promise((res) => setTimeout(res, 2200));
    const st2 = await req('GET', '/api/admin/metrics/stream-status', { token: adminToken });
    check('콘솔: 구독자 0명이면 타이머 정리', (st2.json?.data || []).length === 0, st2.text.slice(0, 120));
  }

  const cfg = await req('GET', '/api/admin/config/file?id=env&mask=1', { token: adminToken });
  check('GET /api/admin/config/file mask', cfg.status === 200, cfg.text.slice(0, 100));
}
// ───────────────────── 5. 콘솔 생성/수정/삭제 워크플로 (UI 가 호출하는 순서 그대로)
{
  const suffix = stamp.replace(/[^a-z0-9]/gi, '').slice(-6);
  const sqlName = `e2etmp_${suffix}`;
  const svcName = `E2eTmp${suffix}Service`;
  const ctlName = `E2eTmp${suffix}Controller`;
  const basePath = `/api/e2e-tmp-${suffix}`;
  try {
    // 5-1 SQL 파일 생성 (SqlList → 새 SQL)
    const sqlBody = `-- @name: findAll\nSELECT id, title, author, price FROM book ORDER BY id DESC;\n\n-- @name: findById\nSELECT id, title, author, price FROM book WHERE id = :id;\n\n-- @name: insert\nINSERT INTO book (title, author, price) VALUES (:title, :author, :price);\n`;
    const sc = await req('POST', '/api/admin/sqls/', { token: adminToken, body: { name: sqlName, content: sqlBody, description: 'e2e temp' } });
    check('콘솔: SQL 파일 생성', sc.status === 200 || sc.status === 201, sc.text);
    const sg = await req('GET', `/api/admin/sqls/${sqlName}`, { token: adminToken });
    check('콘솔: SQL 파일 조회(queries 3개)', sg.json?.data?.queries?.length === 3 || sg.json?.data?.statements, sg.text);
    const st = await req('POST', '/api/admin/sqls/test', { token: adminToken, body: { sqlFile: sqlName, queryName: 'findAll', testParams: {} } });
    check('콘솔: SQL 테스트 실행(레지스트리)', st.json?.data?.success === true, st.text);

    // 5-2 서비스 생성 (ServiceList → 새 서비스) + preview
    const svcMeta = { name: svcName, sqlFile: sqlName, description: 'e2e temp', methods: ['list', 'getById', 'create'], multiSqlMethods: [] };
    const sp = await req('POST', '/api/admin/services/preview', { token: adminToken, body: svcMeta });
    check('콘솔: 서비스 코드 미리보기', sp.status === 200 && /class\s+\w+Service/.test(sp.text), sp.text.slice(0, 120));
    const sv = await req('POST', '/api/admin/services/', { token: adminToken, body: svcMeta });
    check('콘솔: 서비스 생성+핫로드', sv.status === 200 || sv.status === 201, sv.text);

    // 5-3 컨트롤러 생성 (ControllerEditor → 저장) → 새 라우트 즉시 호출
    const ctlMeta = {
      name: ctlName, basePath, controllerType: 'DB', serviceName: svcName, description: 'e2e temp', auth: false, roles: [],
      routes: [
        { type: 'list', method: 'get', path: '/', handlerName: 'list', auth: false, roles: [] },
        { type: 'getById', method: 'get', path: '/:id', handlerName: 'get', auth: false, roles: [] },
      ],
    };
    const cp = await req('POST', '/api/admin/controllers/preview', { token: adminToken, body: ctlMeta });
    check('콘솔: 컨트롤러 코드 미리보기', cp.status === 200 && /@Controller/.test(cp.text), cp.text.slice(0, 120));
    const cc = await req('POST', '/api/admin/controllers/', { token: adminToken, body: ctlMeta });
    check('콘솔: 컨트롤러 생성+핫로드(registered=true)', (cc.status === 200 || cc.status === 201) && cc.json?.data?.registered === true, cc.text);
    const live = await req('GET', `${basePath}/`);
    check('콘솔: 생성된 라우트 즉시 호출', okData(live) && Array.isArray(live.json.data), live.text);
    const live1 = await req('GET', `${basePath}/1`);
    check('콘솔: 생성된 라우트 /:id 호출', okData(live1), live1.text);
    const cg = await req('GET', `/api/admin/controllers/${ctlName}`, { token: adminToken });
    check('콘솔: 컨트롤러 상세(source 포함)', cg.status === 200 && typeof cg.json?.data?.source === 'string', cg.text.slice(0, 100));
    const routes = await req('GET', '/api/admin/routes/', { token: adminToken });
    check('콘솔: 라우트 카탈로그에 새 라우트 반영', routes.text.includes(basePath), '');
    const cu = await req('PUT', `/api/admin/controllers/${ctlName}`, { token: adminToken, body: { ...ctlMeta, description: 'e2e temp updated' } });
    check('콘솔: 컨트롤러 수정+재로드', cu.status === 200 && cu.json?.data?.registered !== false, cu.text);
    const sw = await req('GET', `/api/admin/screen-wizard/analyze?controllerId=${ctlName}&handler=list`, { token: adminToken });
    check('콘솔: 화면 마법사 analyze', sw.status === 200, sw.text.slice(0, 100));

    // 5-3b 실시간(SSE) 컨트롤러 — 콘솔에서 체크 하나로 만드는 경로
    //   ⚠ 중간에 실패해도 반드시 지운다 (예전엔 여기서 죽으면 컨트롤러 파일이 소스에 남았다)
    const rtName = `E2eRt${suffix}Controller`;
    try {
      const rtBase = `/api/e2e-rt-${suffix}`;
      const rtMeta = {
        name: rtName, basePath: rtBase, controllerType: 'DB', serviceName: svcName,
        description: 'e2e realtime', auth: false, roles: [],
        realtime: { enabled: true, channel: `e2ert${suffix}` },
        routes: [
          { type: 'list', method: 'get', path: '/', handlerName: 'list', auth: false, roles: [] },
          { type: 'create', method: 'post', path: '/', handlerName: 'create', auth: false, roles: [] },
          { type: 'sse', method: 'get', path: '/events', handlerName: 'events', auth: false, roles: [] },
        ],
      };
      const pv = await req('POST', '/api/admin/controllers/preview', { token: adminToken, body: rtMeta });
      check('콘솔: 실시간 컨트롤러 미리보기(@SseMapping + publish)',
        pv.status === 200 && /@SseMapping\('\/events'\)/.test(pv.text) && /sseHub\.publish\(REALTIME_CHANNEL/.test(pv.text),
        pv.text.slice(0, 120));

      const rc = await req('POST', '/api/admin/controllers/', { token: adminToken, body: rtMeta });
      check('콘솔: 실시간 컨트롤러 생성+핫로드', (rc.status === 200 || rc.status === 201) && rc.json?.data?.registered === true, rc.text.slice(0, 140));

      // 구독 → 생성 → change 이벤트 수신
      const ac = new AbortController();
      const seen = [];
      const sres = await fetch(`${base}${rtBase}/events`, { headers: { Accept: 'text/event-stream' }, signal: ac.signal });
      check('콘솔: 생성된 구독 주소가 스트림 응답', sres.status === 200 && String(sres.headers.get('content-type')).includes('event-stream'), `${sres.status}`);
      (async () => {
        const rd = sres.body.getReader(); const dec = new TextDecoder(); let buf = '';
        try {
          for (;;) {
            const { value, done } = await rd.read(); if (done) break;
            buf += dec.decode(value, { stream: true });
            let i; while ((i = buf.indexOf('\n\n')) >= 0) {
              const raw = buf.slice(0, i); buf = buf.slice(i + 2);
              const ev = /event: ([\w-]+)/.exec(raw); const dt = /data: (.*)/.exec(raw);
              if (ev) seen.push({ event: ev[1], data: dt?.[1] || '' });
            }
          }
        } catch { /* abort */ }
      })();
      await sleep(400);
      const made = await req('POST', `${rtBase}/`, { body: { title: `rt-${suffix}`, author: 'e2e', price: 1 } });
      check('콘솔: 실시간 컨트롤러로 생성 요청', made.status === 201 || made.status === 200, made.text.slice(0, 120));
      await sleep(700);
      const changed = seen.find((e) => e.event === 'change');
      check('콘솔: 데이터 변경이 change 이벤트로 전달됨', !!changed && /"action":"created"/.test(changed.data), JSON.stringify(seen).slice(0, 200));
      ac.abort();

      const rd2 = await req('DELETE', `/api/admin/controllers/${rtName}`, { token: adminToken });
      check('콘솔: 실시간 컨트롤러 삭제', rd2.status === 200, rd2.text.slice(0, 80));
    } finally {
      // 위에서 이미 지웠으면 404 — 남아 있으면 여기서 정리된다
      await req('DELETE', `/api/admin/controllers/${rtName}`, { token: adminToken }).catch(() => {});
    }

    // 5-4 백업 다운로드 → 복원(dryRun)
    const bk = await fetch(base + '/api/admin/backup/download', { headers: { Authorization: `Bearer ${adminToken}` } });
    const zipBuf = Buffer.from(await bk.arrayBuffer());
    check('콘솔: 백업 zip 다운로드', bk.status === 200 && zipBuf.length > 200 && zipBuf[0] === 0x50, `status=${bk.status} len=${zipBuf.length}`);
    const rs = await req('POST', '/api/admin/backup/restore', { token: adminToken, body: { zipBase64: zipBuf.toString('base64'), dryRun: true, overwrite: true, reload: false } });
    check('콘솔: 백업 복원 dryRun', rs.status === 200 && rs.json?.data?.summary?.written > 0, rs.text.slice(0, 160));
    const rsBad = await req('POST', '/api/admin/backup/restore', { token: adminToken, body: { zipBase64: Buffer.from('not a zip').toString('base64'), dryRun: true } });
    check('콘솔: 잘못된 zip 복원 → 4xx', rsBad.status >= 400 && rsBad.status < 500, rsBad.text.slice(0, 100));

    // 5-5 화면 디자이너 프로젝트 CRUD
    const pj = await req('POST', '/api/admin/screen-projects/', { token: adminToken, body: { name: `e2e-proj-${suffix}`, description: 'tmp' } });
    check('콘솔: 화면 프로젝트 생성', pj.status === 200 || pj.status === 201, pj.text.slice(0, 120));
    const pid = pj.json?.data?.id;
    if (pid) {
      const pg = await req('GET', `/api/admin/screen-projects/${pid}`, { token: adminToken }); check('콘솔: 화면 프로젝트 조회', pg.status === 200, pg.text.slice(0, 100));
      const pu = await req('PUT', `/api/admin/screen-projects/${pid}`, { token: adminToken, body: { description: 'tmp2' } }); check('콘솔: 화면 프로젝트 수정', pu.status === 200, pu.text.slice(0, 100));
      const pd = await req('DELETE', `/api/admin/screen-projects/${pid}`, { token: adminToken }); check('콘솔: 화면 프로젝트 삭제', pd.status === 200, pd.text.slice(0, 100));
    }

    // 5-6 모니터링 임계값 / 로그 / 접속통계 / 사용자 관리
    const th = await req('PUT', '/api/admin/metrics/thresholds', { token: adminToken, body: { thresholds: [{ metric: 'cpu', operator: '>', value: 95, severity: 'warning', enabled: true }] } });
    check('콘솔: 임계값 저장', th.status === 200, th.text.slice(0, 140));
    const lf = await req('GET', '/api/admin/logs/folders?kind=general', { token: adminToken }); check('콘솔: 로그 폴더 목록', lf.status === 200, lf.text.slice(0, 100));
    const lfi = await req('GET', '/api/admin/logs/files?kind=general&page=1&perPage=5', { token: adminToken }); check('콘솔: 로그 파일 목록', lfi.status === 200, lfi.text.slice(0, 100));
    const firstLog = lfi.json?.data?.rows?.[0]?.relPath || lfi.json?.data?.rows?.[0]?.file;
    if (firstLog) { const lc = await req('GET', `/api/admin/logs/content?kind=general&file=${encodeURIComponent(firstLog)}&page=1&perPage=20`, { token: adminToken }); check('콘솔: 로그 내용 조회', lc.status === 200, lc.text.slice(0, 100)); }
    const lt = await req('GET', '/api/admin/logs/content?kind=general&file=..%2F..%2F.env', { token: adminToken }); check('콘솔: 로그 경로 탈출 차단', lt.status >= 400, lt.text.slice(0, 100));
    const tl = await req('GET', '/api/admin/access/timeline?range=1h', { token: adminToken }); check('콘솔: 접속통계 타임라인', tl.status === 200, tl.text.slice(0, 100));
    const ex = await req('GET', '/api/admin/access/export/logs?range=1h', { token: adminToken }); check('콘솔: 접속통계 CSV export', ex.status === 200, ex.text.slice(0, 100));
    const uc = await req('POST', '/api/admin/users/', { token: adminToken, body: { name: 'e2e', username: `e2eu_${suffix}`, email: `e2eu_${suffix}@x.io`, password: 'E2e-user-pass-123', role: 'viewer' } });
    check('콘솔: 사용자 생성', uc.status === 200 || uc.status === 201, uc.text.slice(0, 120));
    const uid = uc.json?.data?.id;
    if (uid) {
      const up = await req('PUT', `/api/admin/users/${uid}/password`, { token: adminToken, body: { newPassword: 'E2e-user-pass-456' } }); check('콘솔: 사용자 비밀번호 재설정', up.status === 200, up.text.slice(0, 100));
      const ud = await req('DELETE', `/api/admin/users/${uid}`, { token: adminToken }); check('콘솔: 사용자 삭제', ud.status === 200, ud.text.slice(0, 100));
    }
    const selfDel = await req('DELETE', `/api/admin/users/1`, { token: adminToken }); check('콘솔: 자기 자신/마지막 admin 삭제 차단', selfDel.status === 400, selfDel.text.slice(0, 100));
  } finally {
    // 정리 — 생성한 컨트롤러/서비스/SQL 삭제 (라우트 해제 포함)
    const d1 = await req('DELETE', `/api/admin/controllers/${ctlName}`, { token: adminToken }); check('콘솔: 컨트롤러 삭제', d1.status === 200, d1.text.slice(0, 100));
    const gone = await req('GET', `${basePath}/`); check('콘솔: 삭제된 라우트 404', gone.status === 404, gone.text.slice(0, 80));
    const d2 = await req('DELETE', `/api/admin/services/${svcName}`, { token: adminToken }); check('콘솔: 서비스 삭제', d2.status === 200, d2.text.slice(0, 100));
    const d3 = await req('DELETE', `/api/admin/sqls/${sqlName}`, { token: adminToken }); check('콘솔: SQL 삭제', d3.status === 200, d3.text.slice(0, 100));
  }
}
console.log(`\ne2e 결과: pass=${pass} fail=${fail}` + (fail ? `\n실패: ${failures.join(' | ')}` : ''));
process.exit(fail ? 1 : 0);
