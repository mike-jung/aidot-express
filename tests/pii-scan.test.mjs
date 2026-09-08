/**
 * 개인정보 검사기 — 모양이 아니라 검사 숫자로 판정한다.
 *
 *  정규식만 쓰던 검사가 두 번 헛짚었다. 둘 다 암호화 시험용 문자열이었고,
 *  고칠 때마다 예외 목록이 길어졌다. **오탐이 잦은 검사기는 결국 꺼진다.**
 *
 *  현행 도구들(gitleaks · TruffleHog · sensitive-canary · prowl)이 쓰는 방법:
 *    ① 모양 ② 구조(날짜) ③ 검사 숫자 ④ 문맥 ⑤ 무작위도
 *
 *  ⚠ 이 파일에 진짜 형태의 값을 적지 않는다. 검사 숫자를 **계산해서** 만든다 —
 *    시험 파일이 또 하나의 걸림돌이 되면 안 된다. 실제로 그렇게 됐었다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText, rrnCheckDigit, luhn } from '../scripts/publish/pii-scan.mjs';

/** 검사 숫자가 맞는 카드번호를 만든다 — Luhn 을 뒤집어 마지막 자리를 구한다.
    ⚠ 같은 실수를 세 번 했다: 시험 파일에 진짜 형태를 적었다가 공개 검사기에 걸렸다.
      주민번호 · 카드 · 사업자번호 모두 **계산해서** 만든다. 파일에는 앞자리만 남는다. */
function makeCard(first15) {
  let sum = 0, dbl = true;                       /* 마지막(검사) 자리 앞에서 시작하므로 첫 자리가 2배 */
  for (let i = first15.length - 1; i >= 0; i--) {
    let n = Number(first15[i]);
    if (dbl) { n *= 2; if (n > 9) n -= 9; }
    sum += n; dbl = !dbl;
  }
  return first15 + String((10 - (sum % 10)) % 10);
}

/** 검사 숫자가 맞는 사업자등록번호를 만든다 */
function makeBizNo(first9) {
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(first9[i]) * w[i];
  sum += Math.floor((Number(first9[8]) * 5) / 10);
  const c = (10 - (sum % 10)) % 10;
  return `${first9.slice(0, 3)}-${first9.slice(3, 5)}-${first9.slice(5)}${c}`;
}

/** 검사 숫자가 맞는 주민번호를 만든다 (값을 파일에 적지 않으려고) */
function makeRRN(first12) {
  const w = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * w[i];
  const c = (11 - (sum % 11)) % 10;
  return `${first12.slice(0, 6)}-${first12.slice(6)}${c}`;
}

test('검사 숫자 — 지어낸 값은 거의 다 걸러진다', () => {
  /* 흔한 자리표시들. 검사 숫자를 계산해 보면 맞지 않는다 —
     그래서 예외 목록을 손으로 관리할 필요가 없다. */
  for (const front of ['900101', '123456', '000000']) {
    const digits = front + '123456';
    const right = Number(makeRRN(digits).slice(-1));
    assert.notEqual(right, 7, `${front}… 자리표시는 검사 숫자가 7이 아니다`);
  }
  assert.equal(rrnCheckDigit(makeRRN('850315284716').replace('-', '')), true);
  const card = makeCard(['4539', '5787', '6362', '148'].join(''));
  assert.equal(luhn(card), true, '계산한 카드번호는 Luhn 통과');
  assert.equal(luhn(card.slice(0, -1) + ((Number(card.at(-1)) + 1) % 10)), false, '검사 숫자 하나 바꾸면 실패');
});

test('시험용 문자열과 자리표시는 통과시킨다', () => {
  const passes = [
    "envelopeEncrypt('900101-1234567', ...)",   /* 암호화 왕복 시험 */
    '주민번호 형태 (123456-1234567)',
    "const v = '000000-0000000';",
    "VALUES ('홍길동', '010-1111-2222')",
    '연락처 010-1234-5678',                      /* 연속 — 사람이 채운 값 */
    'card: 4111-1111-1111-1111',
    'timestamp 2026-09-08 07:30:10',
    'port 3306 · 7901 · 7902',
    "const orderId = '01012345678';",            /* 전화 모양이나 문맥 없음 */
  ];
  for (const t of passes) {
    assert.deepEqual(scanText(t), [], `통과해야 한다: ${t.slice(0, 40)}`);
  }
});

test('진짜 형태 + 문맥이면 막는다', () => {
  const rrn = makeRRN('850315284716');
  assert.equal(scanText(`ssn='${rrn}'`).length, 1, '검사 숫자가 맞고 문맥이 있다');
  /* ⚠ 검사 숫자를 통과한 것(verified)은 **문맥 없이도** 막는다.
     주민번호는 우연히 만들어지기 어렵다 — 문맥을 요구하면 놓친다.
     문맥을 요구하는 것은 검사할 수단이 없는 것(unverified·전화번호)뿐이다. */
  assert.equal(scanText(`const x = '${rrn}';`).length, 1, '검사 숫자가 맞으면 문맥 없이도 막는다');
  /* 전화번호도 파일에 적지 않는다 — 앞 줄의 '전화' 가 문맥 범위(40자)에 들어와 걸렸다 */
  const phone = ['010', String(3847), String(2916)].join('-');
  assert.equal(scanText(`const t = "${phone}";`).length, 0, 'no context, so not flagged');

  assert.equal(scanText(`결제 카드번호 ${makeCard(['4539', '5787', '6362', '148'].join(''))}`).length, 1);
  const biz = makeBizNo(['220', '81', '6251'].join(''));
  assert.equal(scanText(`사업자등록번호 ${biz}`).length, 1);
  assert.equal(scanText(`코드 ${biz.slice(0, -1)}${(Number(biz.at(-1)) + 1) % 10}`).length, 0, '검사 숫자가 틀리다');
});

test('보고서가 또 하나의 유출이 되면 안 된다', () => {
  const hit = scanText(`ssn='${makeRRN('850315284716')}'`)[0];
  assert.ok(hit.sample.includes('*'), '값은 가려서 보고한다');
  assert.equal(/\d{6}-\d{7}/.test(hit.sample), false);
});

test('주민번호를 카드번호로 세지 않는다', () => {
  /* 실제로 그렇게 오인했다 — 하이픈 하나로 나뉜 6-7 자리를 카드로 잡았다 */
  const hits = scanText(`주민 ${makeRRN('991231100000')}`);
  assert.ok(hits.every((h) => h.rule !== 'creditCard'));
});
