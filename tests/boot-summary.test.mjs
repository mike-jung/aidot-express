/**
 * 기동 요약 (v1.7.4) 단위 테스트.
 *   실행: npm test
 *
 * 이 요약이 "로그인 가능" 이라고 거짓말한 사고가 두 번 있었다:
 *   ① 마이그레이션이 절반만 적용된 상태  ② 관리자 계정이 생성되지 않은 상태
 * 두 경우 모두 '로그인 불가' 로 나오는지 여기서 못 박는다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBootSummary } from '../src/core/bootSummary.js';

const base = {
  port: 7901,
  versionLine: 'v1.7.4 (release)',
  env: 'development',
  dbStatus: { available: true, adapter: 'mariadb' },
  dbTarget: 'aidot_express',
  migration: { ok: true },
  admin: { exists: true, username: 'admin', defaultPassword: null, normalized: false },
};
const text = (o) => buildBootSummary(o).lines.join('\n');

test('정상 상태 — 로그인 가능', () => {
  const r = buildBootSummary(base);
  assert.equal(r.ok, true);
  assert.equal(r.problems.length, 0);
  assert.match(r.lines.join('\n'), /Sign in   /);
});

test('관리자 계정이 없으면 로그인 불가로 표시한다', () => {
  const r = buildBootSummary({ ...base, admin: { exists: false, error: "Unknown column 'must_change_password'" } });
  assert.equal(r.ok, false);
  assert.equal(r.problems.some((p) => p.what === 'no admin account'), true);
  const s = r.lines.join('\n');
  assert.match(s, /Sign in   not possible/);
  /* ⚠ 영문에서는 '가능/불가' 가 같은 낱말로 시작한다 — `Sign in` 만 보면 늘 참이다.
     "가능" 쪽 문구가 없는지를 봐야 한다. */
  assert.equal(/Sign in   (admin|using|through)/.test(s), false);
  assert.match(s, /must_change_password/);        // 원인이 요약까지 전달되는지
});

test('마이그레이션 실패는 로그인 불가로 표시한다', () => {
  const r = buildBootSummary({ ...base, migration: { ok: false, error: 'SQL 실행 실패' } });
  assert.equal(r.ok, false);
  assert.match(r.lines.join('\n'), /Sign in   not possible/);
});

test('DB 미연결이면 hint 를 그대로 보여 준다', () => {
  const r = buildBootSummary({
    ...base,
    dbStatus: { available: false, adapter: 'mariadb', hint: 'DB_PASSWORD 가 예제값입니다' },
  });
  assert.equal(r.ok, false);
  assert.match(r.lines.join('\n'), /DB_PASSWORD/);
});

test('개발환경에서 기본 비밀번호를 쓰면 아이디/비밀번호를 요약에 보여 준다', () => {
  const s = text({ ...base, admin: { exists: true, username: 'admin', defaultPassword: 'admin1234', normalized: false } });
  assert.match(s, /Sign in   admin \/ admin1234/);
  assert.match(s, /this is the default password/);
});

test('옛 기본 비밀번호를 정렬한 경우 그 사실을 밝힌다', () => {
  const s = text({ ...base, admin: { exists: true, username: 'admin', defaultPassword: 'admin1234', normalized: true } });
  assert.match(s, /the old default password was reset/);
});

test('production 에서는 비밀번호 값을 절대 출력하지 않는다', () => {
  const s = text({
    ...base, env: 'production',
    admin: { exists: true, username: 'admin', defaultPassword: 'admin1234', normalized: false },
  });
  assert.equal(s.includes('admin1234'), false);
  assert.match(s, /using the default password/);
});

test('샘플 마이그레이션 부분 실패는 문제로 올리지 않되 알린다', () => {
  const r = buildBootSummary({
    ...base,
    migration: { ok: true, partial: true, failed: [{ file: 'src/database/migrations/004_init_samples.sql' }] },
  });
  assert.equal(r.ok, true);                       // 핵심 스키마는 정상 → 로그인 가능
  assert.match(r.lines.join('\n'), /Samples   1 failed/);
});
