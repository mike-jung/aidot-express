/**
 * pii-scan.mjs — 개인정보 검사기.
 *
 *  ══════════════════════════════════════════════════════════════════════
 *   왜 다시 만들었나
 *  ══════════════════════════════════════════════════════════════════════
 *  정규식만 쓰던 검사기가 두 번 헛짚었다. 둘 다 암호화 시험용 문자열이었고,
 *  고칠 때마다 예외 목록이 길어졌다. **오탐이 잦은 검사기는 결국 꺼진다.**
 *
 *  현행 도구들(gitleaks · TruffleHog · sensitive-canary · prowl)이 쓰는 방법을
 *  따랐다. 핵심은 "정규식 하나로 판정하지 않는다" 는 것이다:
 *
 *    ① 모양 검사   정규식으로 후보를 고른다 (여기까지가 예전 방식)
 *    ② 구조 검사   날짜·범위가 실제로 성립하는가
 *    ③ 검사 숫자   체크섬이 맞는가 (주민번호 mod 11 · 카드 Luhn)
 *    ④ 문맥        가까이에 이름표가 있는가 ("주민번호:", "card:")
 *    ⑤ 무작위도    자리표시처럼 뻔한 값인가 (1234, 0000, 반복)
 *
 *  ══════════════════════════════════════════════════════════════════════
 *   판정은 세 갈래다
 *  ══════════════════════════════════════════════════════════════════════
 *    verified    검사 숫자까지 맞다 → 막는다
 *    unverified  검사할 수단이 없다 → 문맥이 있으면 막고, 없으면 알리기만
 *    rejected    검사 숫자가 틀리다 → 자리표시다. 통과
 *
 *  검사 숫자가 왜 강력한가: `900101-1234567` 은 검사 숫자가 8이어야 하는데 7이다.
 *  사람이 지어낸 값은 거의 다 여기서 걸러진다 — 예외 목록을 손으로 관리할 필요가 없다.
 *  (Luhn 은 무작위 숫자의 약 10%를 통과시키므로 카드에는 발급사 번호 검사를 더한다)
 */

/* ── 검사 숫자 ─────────────────────────────────────────────────────── */

/** 주민등록번호 — 가중치 합 mod 11 */
export function rrnCheckDigit(digits) {
  if (digits.length !== 13) return false;
  const w = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * w[i];
  return ((11 - (sum % 11)) % 10) === Number(digits[12]);
}

/** 신용카드 — Luhn */
export function luhn(digits) {
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (dbl) { n *= 2; if (n > 9) n -= 9; }
    sum += n; dbl = !dbl;
  }
  return sum % 10 === 0;
}

/* ── 구조 검사 ─────────────────────────────────────────────────────── */

/** YYMMDD 가 실제로 있는 날짜인가 */
function validYYMMDD(s) {
  const mm = Number(s.slice(2, 4)), dd = Number(s.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dd <= days[mm - 1];
}

/** 뒷자리 첫 숫자 — 1~4 내국인, 5~8 외국인, 9·0 1900년 이전 */
const validGenderDigit = (c) => '1234567890'.includes(c);

/* ── 자리표시 판정 ─────────────────────────────────────────────────── */

/**
 * 사람이 지어낸 값인가.
 *
 *  같은 숫자 반복(000000), 오름차순(123456), 낮은 무작위도.
 *  검사 숫자를 통과했더라도 이런 모양이면 진짜일 가능성이 낮다.
 */
function looksSynthetic(digits, { runLimit = 4 } = {}) {
  if (/^(\d)\1+$/.test(digits)) return true;                  /* 0000000 */
  if (new Set(digits).size <= 3) return true;                  /* 종류가 너무 적다 */

  /* 오름차순·내림차순이 이어지는가. `1234-5678` 처럼 사람이 손으로 채운 값은
     거의 다 여기 걸린다. 실제로 testDataGenerator.js 의 `010-1234-5678` 을 놓쳤다. */
  let asc = 1, desc = 1, maxRun = 1;
  for (let i = 1; i < digits.length; i++) {
    const d = Number(digits[i]) - Number(digits[i - 1]);
    asc = d === 1 ? asc + 1 : 1;
    desc = d === -1 ? desc + 1 : 1;
    maxRun = Math.max(maxRun, asc, desc);
  }
  if (maxRun >= runLimit) return true;

  /* 같은 토막이 되풀이되는가 — `1212...`, `123123...` */
  for (const len of [2, 3, 4]) {
    if (digits.length >= len * 2) {
      const head = digits.slice(0, len);
      if (digits.startsWith(head.repeat(Math.ceil(digits.length / len)).slice(0, digits.length))) return true;
    }
  }
  return false;
}

/* ── 문맥 ──────────────────────────────────────────────────────────── */

/** 앞뒤 40자에 이름표가 있는가 — 있으면 진짜일 가능성이 크게 오른다 */
function hasContext(text, index, labels) {
  const around = text.slice(Math.max(0, index - 40), index + 40);
  return labels.some((l) => around.toLowerCase().includes(l));
}

/* ── 규칙 ──────────────────────────────────────────────────────────── */

export const RULES = [
  {
    id: 'krRRN',
    label: 'a resident registration number',
    /* 앞뒤가 숫자면 다른 번호의 일부다 */
    pattern: /(?<![\d-])(\d{6})\s*-\s*([1-90]\d{6})(?![\d-])/g,
    context: ['주민', 'rrn', 'ssn', '신분', 'resident', '개인정보'],
    verify(m) {
      const [ , front, back ] = m;
      if (!validYYMMDD(front)) return 'rejected';
      if (!validGenderDigit(back[0])) return 'rejected';
      const digits = front + back;
      if (!rrnCheckDigit(digits)) return 'rejected';   /* 검사 숫자가 틀리면 자리표시다 */
      /* ⚠ 주민번호는 검사 숫자(mod 11)가 이미 강하다. 연속 판정까지 세게 걸면
         `900101-1234568` 같은 **검사 숫자가 맞는** 값을 놓친다 — 실제로 놓쳤다.
         검사 숫자를 통과했다면 연속은 우연일 수 있으므로 기준을 늦춘다. */
      if (looksSynthetic(digits, { runLimit: 6 })) return 'rejected';
      return 'verified';
    },
  },
  {
    id: 'creditCard',
    label: 'a card number',
    /* ⚠ 하이픈 하나로 나뉜 6-7 자리는 주민번호다 — 카드로 세면 안 된다.
       실제로 `991231-1000001` 을 카드번호로 잡았다. 구분자가 하나뿐이면 제외한다. */
    pattern: /(?<![\d-])(?:\d[ -]?){12,18}\d(?![\d-])/g,
    context: ['card', '카드', 'pan', 'credit', '결제'],
    verify(m) {
      const raw = m[0];
      /* 주민번호 모양(6자리-7자리)은 카드가 아니다 */
      if (/^\d{6}\s*-\s*\d{7}$/.test(raw)) return 'rejected';
      /* 카드는 4자리씩 끊거나 붙여 쓴다. 구분자가 하나뿐이면 다른 번호다. */
      const seps = (raw.match(/[ -]/g) || []).length;
      if (seps === 1 || seps === 2) return 'rejected';
      const digits = raw.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return 'rejected';
      if (!luhn(digits)) return 'rejected';
      if (looksSynthetic(digits)) return 'rejected';
      /* 발급사 번호 — Luhn 만으로는 무작위의 10%가 통과한다 */
      const iin = /^(4|5[1-5]|3[47]|6(?:011|5)|9\d{3})/.test(digits);
      return iin ? 'verified' : 'unverified';
    },
  },
  {
    id: 'krPhone',
    label: 'a mobile number',
    pattern: /(?<![\d-])01[016789][ -]?\d{3,4}[ -]?\d{4}(?![\d-])/g,
    context: ['전화', 'phone', 'tel', 'mobile', '연락', 'hp'],
    verify(m) {
      const d = m[0].replace(/\D/g, '');
      if (looksSynthetic(d.slice(3))) return 'rejected';   /* 010-1111-2222 */
      return 'unverified';    /* 검사 숫자가 없다 — 문맥으로 판단한다 */
    },
  },
  {
    id: 'krBizNo',
    label: 'a business registration number',
    pattern: /(?<![\d-])(\d{3})-(\d{2})-(\d{5})(?![\d-])/g,
    context: ['사업자', 'business', '법인', '등록번호'],
    verify(m) {
      const d = (m[1] + m[2] + m[3]);
      const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += Number(d[i]) * w[i];
      sum += Math.floor((Number(d[8]) * 5) / 10);
      return ((10 - (sum % 10)) % 10) === Number(d[9]) ? 'verified' : 'rejected';
    },
  },
];

/**
 * 파일 내용을 검사한다.
 *
 * @returns {{rule:string,label:string,line:number,verdict:string,sample:string}[]}
 *   verdict: 'verified' | 'unverified'  (rejected 는 돌려주지 않는다)
 */
export function scanText(text, { requireContextFor = ['unverified'] } = {}) {
  const out = [];
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    for (const m of text.matchAll(rule.pattern)) {
      const verdict = rule.verify(m);
      if (verdict === 'rejected') continue;
      /* 검사 수단이 없는 것은 문맥이 있을 때만 문제 삼는다 —
         그러지 않으면 버전 번호·주문 번호까지 잡아 검사기가 짐이 된다 */
      if (requireContextFor.includes(verdict) && !hasContext(text, m.index, rule.context)) continue;
      out.push({
        rule: rule.id,
        label: rule.label,
        line: text.slice(0, m.index).split('\n').length,
        verdict,
        /* ⚠ 값을 그대로 남기지 않는다 — 보고서가 또 하나의 유출이 된다 */
        sample: m[0].replace(/\d/g, (d, i) => (i < 2 ? d : '*')),
      });
    }
  }
  return out;
}
