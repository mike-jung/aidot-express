/**
 * AUTH_ACCESS_SECRET 자동 채움. (v1.10.38)
 *
 * ## 문제
 * 대시보드에서 Control API(7902)를 부르면 `Invalid token` 이 났다.
 *
 * ## 원인
 * `.env` 의 시크릿이 비어 있거나 배포본 기본값이면, 개발 모드에서
 * **프로세스마다 임시 시크릿을 따로 만든다.** supervisor(control API)와
 * 메인 서버는 **별개 프로세스**라 서로 다른 값을 갖게 되고, 메인이 발급한
 * 토큰을 control 이 검증하면 **반드시** 실패한다.
 *
 * ⚠ 소스에 고정 기본값을 넣는 방법은 쓰지 않는다. 배포본을 받은 사람이 모두
 *   같은 값을 갖게 되어 누구나 admin 토큰을 위조할 수 있다.
 *   설치본마다 **다른** 값을 만들어 `.env` 에 적어 두는 것이 맞다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** start.mjs 의 규칙 (같은 로직) */
const WEAK = new Set(['', 'CHANGE_ME_IN_ENV_FILE_MINIMUM_32_CHARS_LONG!']);
function ensureSecret(file) {
  if (!fs.existsSync(file)) return null;
  let text = fs.readFileSync(file, 'utf8');
  const cur = /^AUTH_ACCESS_SECRET=(.*)$/m.exec(text)?.[1]?.trim() ?? null;
  const weak = cur === null || WEAK.has(cur) || cur.length < 32;
  if (!weak) return null;
  const secret = crypto.randomBytes(48).toString('base64url');
  text = cur === null
    ? `${text.replace(/\s*$/, '')}\nAUTH_ACCESS_SECRET=${secret}\n`
    : text.replace(/^AUTH_ACCESS_SECRET=.*$/m, `AUTH_ACCESS_SECRET=${secret}`);
  fs.writeFileSync(file, text, 'utf8');
  return cur === null ? 'added' : 'replaced';
}

function withTempEnv(body, initial) {
  const f = path.join(ROOT, 'tests', `_env_${process.pid}_${Math.random().toString(36).slice(2)}`);
  try { fs.writeFileSync(f, initial, 'utf8'); return body(f); }
  finally { fs.rmSync(f, { force: true }); }
}
const secretOf = (f) => /^AUTH_ACCESS_SECRET=(.*)$/m.exec(fs.readFileSync(f, 'utf8'))?.[1] ?? null;

test('★ 배포본 기본값이면 새로 만든다', () => {
  withTempEnv((f) => {
    assert.equal(ensureSecret(f), 'replaced');
    const s = secretOf(f);
    assert.ok(s.length >= 32 && !WEAK.has(s), '여전히 약한 값이다');
  }, 'DB_TYPE=sqlite\nAUTH_ACCESS_SECRET=CHANGE_ME_IN_ENV_FILE_MINIMUM_32_CHARS_LONG!\n');
});

test('줄 자체가 없으면 덧붙인다', () => {
  withTempEnv((f) => {
    assert.equal(ensureSecret(f), 'added');
    assert.ok((secretOf(f) || '').length >= 32);
    // 기존 내용을 지우면 안 된다
    assert.match(fs.readFileSync(f, 'utf8'), /^DB_TYPE=sqlite$/m);
  }, 'DB_TYPE=sqlite\n');
});

test('★ 이미 쓸 만한 값은 건드리지 않는다', () => {
  // 매번 바꾸면 재기동마다 로그인 세션이 끊긴다
  const good = 'already-a-good-long-secret-value-32chars-plus';
  withTempEnv((f) => {
    assert.equal(ensureSecret(f), null);
    assert.equal(secretOf(f), good);
  }, `DB_TYPE=sqlite\nAUTH_ACCESS_SECRET=${good}\n`);
});

test('짧은 값도 약한 값으로 본다', () => {
  withTempEnv((f) => {
    assert.equal(ensureSecret(f), 'replaced');
    assert.ok((secretOf(f) || '').length >= 32);
  }, 'AUTH_ACCESS_SECRET=short\n');
});

test('★ 소스에 고정 기본값을 심지 않는다', () => {
  const start = fs.readFileSync(path.join(ROOT, 'scripts/start.mjs'), 'utf8');
  // 랜덤 생성이어야 한다 — 고정 문자열을 적어 두면 배포본 전체가 같은 값이 된다
  assert.match(start, /crypto\.randomBytes\(48\)\.toString\('base64url'\)/);
  assert.match(start, /const ensureSecret = \(file\) =>/);
});

test('기존 .env 도 보정한다', () => {
  const start = fs.readFileSync(path.join(ROOT, 'scripts/start.mjs'), 'utf8');
  /* 예전에는 `.env` 를 **새로 만들 때만** 랜덤 값을 넣었다. 그래서 예전 판부터
     쓰던 `.env` 는 기본값인 채로 남아 Invalid token 이 났다. */
  assert.match(start, /\} else \{\s*\n\s*\/\/ 이미 있는 \.env/);
  assert.match(start, /ensureSecret\(envPath\)/);
});
