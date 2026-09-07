/**
 * 테스트 데이터 자동 생성.
 *
 *  키 이름의 패턴을 보고 적절한 fake 값을 생성:
 *    - id, *_id            → 정수 (1, 2, 3)
 *    - email               → 'test@example.com'
 *    - name, *_name        → '홍길동'
 *    - username            → 'test_user'
 *    - password            → 'Test1234'
 *    - phone, mobile, tel  → '010-1234-5678'
 *    - url                 → 'https://example.com'
 *    - date                → '2026-04-15' (오늘)
 *    - time                → '12:00:00'
 *    - datetime, created_at, updated_at → ISO 문자열
 *    - amount, price, cost, total → 1000
 *    - count, qty, quantity → 1
 *    - status              → 'active'
 *    - is_*                → true
 *    - 그 외 *_at *_date   → 날짜
 *    - 알 수 없으면 'sample'
 */

function todayDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nowDateTime() {
  return new Date().toISOString();
}

/** 키 이름 하나에 대한 fake 값 추론 */
export function fakeValueFor(key) {
  const k = String(key).toLowerCase();

  // 정수 ID
  if (k === 'id' || /_id$/.test(k) || /id$/i.test(k) && /^[a-z]+id$/i.test(k)) return 1;

  // 이메일
  if (k.includes('email')) return 'test@example.com';

  // 사용자
  if (k === 'username' || k === 'user_name' || k === 'login') return 'test_user';
  if (k === 'password' || k.includes('passwd') || k === 'pw') return 'Test1234';

  // 이름
  if (k === 'name' || k.endsWith('_name') || k === 'title') return '홍길동';
  if (k === 'description' || k === 'desc' || k === 'memo' || k === 'comment') return '테스트 설명';

  // 연락처
  if (k.includes('phone') || k === 'mobile' || k === 'tel' || k === 'cell') return '010-1234-5678';

  // URL
  if (k.includes('url') || k === 'link' || k === 'href') return 'https://example.com';

  // 시간
  if (k === 'date' || /_date$/.test(k)) return todayDate();
  if (k === 'time' || /_time$/.test(k)) return '12:00:00';
  if (k === 'datetime' || /_at$/.test(k) || k === 'timestamp') return nowDateTime();

  // 숫자
  if (k === 'amount' || k === 'price' || k === 'cost' || k === 'total' || k === 'fee' || k === 'salary') return 10000;
  if (k === 'count' || k === 'qty' || k === 'quantity' || k === 'limit' || k === 'size') return 10;
  if (k === 'page' || k === 'offset') return 1;
  if (k === 'age' || k === 'year') return 30;

  // 상태/타입
  if (k === 'status' || k === 'state') return 'active';
  if (k === 'role') return 'user';
  if (k === 'type' || k === 'kind') return 'default';
  if (k === 'lang' || k === 'language' || k === 'locale') return 'ko';

  // boolean
  if (k.startsWith('is_') || k.startsWith('has_') || k === 'enabled' || k === 'active') return true;

  // 토큰
  if (k.includes('token') || k.includes('hash')) return 'fake_token_' + Math.random().toString(36).slice(2, 10);

  // 주소
  if (k === 'address' || k === 'addr') return '서울특별시 강남구 테헤란로 123';
  if (k === 'city') return '서울';
  if (k === 'country') return 'KR';
  if (k === 'zip' || k === 'zipcode' || k === 'postal_code') return '06234';

  // 기타
  if (k === 'gender' || k === 'sex') return 'M';
  if (k === 'color' || k === 'colour') return '#3b82f6';

  return 'sample';
}

/** 키 배열로부터 객체 만들기 */
export function generateFakeObject(keys) {
  const out = {};
  for (const k of keys) out[k] = fakeValueFor(k);
  return out;
}
