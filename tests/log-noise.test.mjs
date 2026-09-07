/**
 * 로그 잡음 분리 시험. (v1.10.26)
 *
 * ## 문제
 * 컨트롤러를 한 번 부르면 프레임워크가 `request_steps` 에 단계를 여러 건 적고,
 * 실시간 화면이 붙어 있으면 `[sse] 발행` 도 계속 찍습니다.
 * 실측하니 **로그의 26% 가 배관**이었고, 개발자가 보고 싶은 SQL(27%)과
 * 거의 1:1 로 섞여 있었습니다.
 *
 * ## 방침
 * **끄지 않고 나눕니다.** 추적 기능 자체가 이상할 때는 이 로그를 봐야 하는데,
 * 지워 버리면 그때 손쓸 방법이 없습니다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logger = fs.readFileSync(path.join(ROOT, 'src/util/logger.js'), 'utf8');

/** logger.js 의 판정 규칙 (같은 정규식) */
const FRAMEWORK = new RegExp(
  '\\b(?:admin_[a-z_][a-z0-9_]*|request_[a-z_][a-z0-9_]*'
  + '|access_logs|user_sessions|login_events|schema_migrations)\\b', 'i');

test('★ request_steps / request_traces 가 프레임워크로 분류된다', () => {
  // 이 둘이 목록에서 빠져 있어 로그의 26% 를 차지했다
  assert.ok(FRAMEWORK.test('INSERT INTO request_steps (id) VALUES (1)'));
  assert.ok(FRAMEWORK.test('INSERT INTO request_traces (id) VALUES (1)'));
});

test('콘솔 운영 테이블도 프레임워크다', () => {
  for (const sql of ['SELECT * FROM admin_users', 'SELECT * FROM access_logs',
    'SELECT * FROM login_events', 'SELECT * FROM schema_migrations']) {
    assert.ok(FRAMEWORK.test(sql), sql);
  }
});

test('★ 개발자 테이블을 오탐하지 않는다', () => {
  // 오탐하면 개발자가 자기 SQL 을 못 본다 — 문제가 거꾸로 된다
  for (const sql of ['SELECT * FROM sample.book', 'SELECT * FROM users WHERE id=1',
    'SELECT * FROM my_request_log', 'SELECT * FROM administrator']) {
    assert.equal(FRAMEWORK.test(sql), false, sql);
  }
});

test('★ 이름 나열이 아니라 접두사 규칙을 쓴다', () => {
  // 나열하면 새 테이블이 생길 때마다 또 빠뜨린다 — 실제로 그래서 생긴 문제다
  assert.match(logger, /request_\[a-z_\]\[a-z0-9_\]\*/, 'request_* 접두사 규칙');
  assert.match(logger, /admin_\[a-z_\]\[a-z0-9_\]\*/, 'admin_* 접두사 규칙');
});

test('★ 끄지 않고 나눈다 — 필요할 때 볼 수 있어야 한다', () => {
  const def = fs.readFileSync(path.join(ROOT, 'src/config/default.js'), 'utf8');
  const idx = fs.readFileSync(path.join(ROOT, 'src/config/index.js'), 'utf8');
  assert.match(def, /internal:\s*false/, '기본은 숨김');
  assert.match(idx, /process\.env\.LOG_INTERNAL/, '켤 수 없으면 지운 것과 같다');
  assert.match(logger, /kind === 'internal'/, '필터가 kind 로 판단해야 한다');
});

test('필터가 format 단계에 있다 — transport 마다 걸면 새어 나온다', () => {
  assert.match(logger, /const dropInternal = winston\.format\(/);
  // combine 에 실제로 끼워져 있어야 한다
  assert.ok((logger.match(/dropInternal\(\)/g) || []).length >= 1);
});

test('SSE 는 발행만 배관 — 구독/종료는 실제 사건이다', () => {
  const sse = fs.readFileSync(path.join(ROOT, 'src/core/sse.js'), 'utf8');
  assert.match(sse, /\[sse\] 발행[\s\S]{0,120}kind: 'internal'/, '발행은 internal');
  // 구독은 사람이 접속한 사건이므로 남긴다
  const sub = /\[sse\] 구독[^\n]*\n?[^\n]*/.exec(sse);
  assert.ok(sub && !/kind: 'internal'/.test(sub[0]), '구독까지 숨기면 안 된다');
});

test('찾는 방법을 알려 준다', () => {
  const bs = fs.readFileSync(path.join(ROOT, 'src/core/bootSummary.js'), 'utf8');
  assert.match(bs, /LOG_INTERNAL/, '숨기기만 하면 "왜 안 나오지" 가 된다');
  const env = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  assert.match(env, /^LOG_INTERNAL=/m);
});
