/**
 * tests/control-users.test.mjs — supervisor 제어 API · 사용자 관리 (v1.11.8)
 *   ① revokedUsers — 비활성/삭제 계정의 토큰을 즉시 막고, 다시 로그인해 받은 토큰은 통과
 *   ② 인증 미들웨어가 그것을 확인한다 (소스)
 *   ③ 비밀번호 규칙이 만들 때·바꿀 때 한 함수 (소스)
 *   ④ 관리자가 정해 준 비밀번호는 must_change_password=1
 *   ⑤ 제어 API — 127.0.0.1 · admin realm/role · 이미 실행/멈춤이면 409
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { revokeUser, unrevokeUser, isRevoked, revokedCount } from '../src/core/revokedUsers.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const nowSec = () => Math.floor(Date.now() / 1000);

test('① revokedUsers: 막기 전 토큰은 막고, 막은 뒤 받은 토큰은 통과', () => {
  const id = 4242;
  assert.equal(isRevoked(id, nowSec() - 60), false, '막지 않았으면 통과');
  revokeUser(id);
  assert.equal(isRevoked(id, nowSec() - 60), true, '막기 전에 발급된 토큰 → 차단');
  assert.equal(isRevoked(id, nowSec() + 5), false, '막은 뒤 새로 받은 토큰 → 통과');
  assert.equal(isRevoked(id, null), true, 'iat 를 모르면 막는다');
  assert.equal(isRevoked(9999, nowSec()), false, '다른 계정은 영향 없음');
  assert.ok(revokedCount() >= 1);
  unrevokeUser(id);
  assert.equal(isRevoked(id, nowSec() - 60), false, '다시 활성으로 돌리면 통과');
  assert.equal(isRevoked(null, nowSec()), false);
});

test('② 인증 미들웨어가 막힌 계정을 확인한다', () => {
  const src = read('src/core/controllerLoader.js');
  assert.match(src, /import \{ isRevoked \} from '\.\/revokedUsers\.js'/);
  assert.match(src, /if \(isRevoked\(req\.user\.id, req\.user\.iat\)\)/);
  assert.match(src, /ACCOUNT_REVOKED/);
});

test('③ 비밀번호 규칙은 한 함수 — 만들 때도 바꿀 때도', () => {
  const src = read('lib/admin/service/AdminUserService.js');
  assert.match(src, /assertPasswordPolicy\(password, username\) \{/);
  assert.equal((src.match(/this\.assertPasswordPolicy\(/g) || []).length, 2, 'create 와 changePassword 둘 다');
  assert.ok(!/password\.length < 6/.test(src), '옛 6자 검사가 남아 있으면 안 된다');
  for (const rule of ['minPasswordLength', 'WEAK_PASSWORDS', '영문자와 숫자', '아이디를 포함']) assert.ok(src.includes(rule), rule);
});

test('④ 관리자가 정해 준 비밀번호는 본인이 다시 바꾼다', () => {
  const svc = read('lib/admin/service/AdminUserService.js');
  assert.match(svc, /must_change_password: 1/, '생성 시');
  assert.match(svc, /skipCurrentCheck \? 'updatePasswordForceChange' : 'updatePassword'/, '관리자 재설정 시');
  const sql = read('lib/admin/database/sql/admin_user.sql');
  assert.match(sql, /-- @name: updatePasswordForceChange[\s\S]*must_change_password = 1/);
  assert.match(sql, /INSERT INTO admin_users \(name, username, email, password_hash, role, status, must_change_password\)/);
  // 비활성/삭제 시 세션 차단
  assert.match(svc, /revokeUser\(id\)/);
  assert.match(svc, /unrevokeUser\(id\)/);
});

test('⑤ 제어 API — 로컬 전용 · admin realm/role · 상태 충돌은 409', () => {
  const ctrl = read('src/controlServer.js');
  assert.match(ctrl, /payload\.role !== 'admin' \|\| \(payload\.realm && payload\.realm !== 'admin'\)/);
  assert.match(ctrl, /app\.get\('\/api\/control\/health'/);
  const sup = read('src/supervisor.js');
  assert.match(sup, /config\.control\?\.host \?\? '127\.0\.0\.1'/, '기본 127.0.0.1');
  assert.match(sup, /already running|not running/, '중복 시작·중지는 409로');
});

/* ══ v1.11.9 ══ */
test('⑥ 4xx 를 따로 센다 — 5xx 만 보던 오류율', () => {
  const src = read('src/core/metrics.js');
  assert.match(src, /const isFail = statusCode >= 400 && statusCode < 500/);
  assert.match(src, /failPct/, '비율도 낸다');
  assert.match(src, /httpFailCount/, '누적도 센다');
  assert.match(src, /errCount\(5xx\) 의 뜻은 그대로 둔다/, '경보 임계값의 뜻은 유지');
});

test('⑦ 임계값 저장은 rows 가 없으면 400 · 세션 강제 종료는 토큰까지 막는다', () => {
  const mc = read('lib/admin/controller/MetricsController.js');
  assert.match(mc, /rows 배열이 필요합니다/);
  const al = read('lib/admin/service/AccessLogService.js');
  assert.match(al, /revokeUser\(s\.user_id\)/);
  assert.match(al, /tokensRevoked: true/);
  /* ★ v1.19.4 — 문구가 사전으로 옮겨졌다. 화면은 키를 부르고 원문은 사전에 있다. */
  const ui = read('admin-client/src/views/AccessStatsPage.vue');
  assert.match(ui, /t\('access3\.forceEndConfirm'/, '강제 종료 전에 확인을 받는다');
  assert.match(read('admin-client/src/locales/ko.js'), /다른 기기·브라우저도 함께 끊깁니다/,
    '화면 문구가 실제 동작과 같아야 한다');
  // 로그인하면 차단 표시가 풀린다 (두 realm 모두)
  assert.match(read('lib/admin/service/AdminAuthService.js'), /unrevokeUser\(user\.id\)/);
  assert.match(read('src/service/AuthService.js'), /unrevokeUser\(user\.id\)/);
});

test('⑧ isRevoked: 막은 초까지 발급된 토큰은 막고, 로그인하면 표시가 풀린다', () => {
  const id = 777001;
  const t0 = Math.floor(Date.now() / 1000);
  revokeUser(id);
  assert.equal(isRevoked(id, t0 - 5), true);
  assert.equal(isRevoked(id, t0), true, '같은 초에 발급된 토큰도 차단');
  assert.equal(isRevoked(id, t0 + 5), false, '이후 발급 토큰은 통과');
  unrevokeUser(id);
  assert.equal(isRevoked(id, t0 - 5), false, '로그인(=표시 해제) 뒤에는 통과');
});
