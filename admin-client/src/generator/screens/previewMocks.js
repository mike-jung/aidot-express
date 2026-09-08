/**
 * previewMocks — iframe preview 용 fake data 생성기 (admin-client 버전).
 *
 * POC 버전과 차이:
 *   - POC 는 파서 결과(resource.model.fields, outputFields) 를 받아서 필드별
 *     한국어 fake data 를 생성했지만, admin-client 에는 파서가 없음.
 *   - 따라서 여기선 "resource name" (보통 endpoint path 에서 추출) 만으로
 *     적당히 그럴듯한 데이터 8개를 만들어냄.
 *   - 필드 이름은 일반적인 것(id, name, status, createdAt, value) 을 쓰고,
 *     값은 결정적 (같은 입력 → 같은 출력) 으로 생성해서 preview 가 깜빡일 때
 *     매번 다른 데이터로 보이지 않도록.
 */

const KOREAN_NAMES = [
  '김민준', '이서연', '박지우', '최도윤', '정하은',
  '강시우', '조예준', '윤아린', '장수호', '임채은',
];

const ROLES = ['관리자', '일반 사용자', '게스트', '운영자'];
const STATUSES = ['활성', '대기', '비활성', '처리중', '완료'];
const CATEGORIES = ['기본', '프리미엄', '엔터프라이즈', '무료'];

/** 해시 함수 (결정적 fake data 생성용) */
function hash(s) {
  let h = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * 주어진 resource name 에 어울리는 fake row 배열을 8개 생성.
 *   예: name='book' → [{ id, title, author, status, price, createdAt }, ...]
 *       name='order' → [{ id, customerName, amount, status, createdAt }, ...]
 *       (heuristic; 정확할 필요는 없고 "그럴듯하기만" 하면 됨)
 */
export function fakeRowsFor(name, count = 8) {
  const base = String(name || 'item').toLowerCase();
  const rows = [];
  for (let i = 0; i < count; i++) {
    const seed = hash(`${base}:${i}`);
    const row = {
      id: i + 1,
    };

    // heuristic: 이름에 따라 추가 필드
    if (/user|member|account/.test(base)) {
      row.name = KOREAN_NAMES[seed % KOREAN_NAMES.length];
      row.email = `${base}${i + 1}@example.com`;
      row.role = ROLES[seed % ROLES.length];
      row.active = (seed % 3) !== 0;
    } else if (/order|transaction|payment/.test(base)) {
      row.customerName = KOREAN_NAMES[seed % KOREAN_NAMES.length];
      row.amount = ((seed % 900) + 100) * 100;
      row.status = STATUSES[seed % STATUSES.length];
    } else if (/product|item|book/.test(base)) {
      row.name = `${base.charAt(0).toUpperCase() + base.slice(1)} ${i + 1}`;
      row.category = CATEGORIES[seed % CATEGORIES.length];
      row.price = ((seed % 99) + 1) * 1000;
      row.stock = seed % 100;
    } else if (/post|article|comment/.test(base)) {
      row.title = `샘플 제목 ${i + 1}`;
      row.author = KOREAN_NAMES[seed % KOREAN_NAMES.length];
      row.views = seed % 10000;
    } else {
      // 기본 shape
      row.name = `${base} ${i + 1}`;
      row.value = (seed % 1000);
      row.status = STATUSES[seed % STATUSES.length];
    }

    // 공통 createdAt
    const day = 1 + (seed % 28);
    const month = 1 + (seed % 12);
    row.createdAt = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    rows.push(row);
  }
  return rows;
}

/**
 * endpoint path 에서 리소스 이름을 추론.
 *   /api/books         → 'book'
 *   /api/books/:id     → 'book'
 *   /api/admin/users   → 'user'
 *   /orders/pending    → 'order'
 *   (경로 segment 중 영문자 이름 + 복수형 -s 제거)
 */
export function extractResourceName(path) {
  if (!path) return 'item';
  const segs = String(path).split('/').filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    // 빈 것, :param, api/admin/v1 같은 프리픽스 스킵
    if (!s || s.startsWith(':') || /^(api|admin|v\d+|auth|internal)$/i.test(s)) continue;
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)) continue;
    // 복수형 → 단수
    let name = s.toLowerCase();
    if (name.endsWith('ies')) name = name.slice(0, -3) + 'y';
    else if (name.endsWith('s') && !name.endsWith('ss')) name = name.slice(0, -1);
    return name || 'item';
  }
  return 'item';
}
