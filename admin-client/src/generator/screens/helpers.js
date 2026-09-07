/**
 * helpers — 코드 생성용 공용 유틸.
 *  pascal / camel : 이름 case 변환
 *  assembleSfc     : Vue SFC 문자열 조립 (script setup + template + style)
 *  indentLines     : 여러 줄 문자열 들여쓰기
 *  escapeAttr      : HTML 속성 이스케이프
 */

export function pascal(s) {
  return String(s || '').replace(/(?:^|[-_\s])(.)/g, (_, c) => c.toUpperCase());
}
export function camel(s) {
  const p = pascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/** 파일명 안전 — 영문/숫자/_/-/./ 만. 없으면 screen */
export function fileSafe(s) {
  const out = String(s || '').replace(/[^a-zA-Z0-9_\-.]/g, '');
  return out || 'screen';
}

/** 여러 줄 string 을 prefix 만큼 들여쓰기 */
export function indentLines(s, prefix = '  ') {
  return String(s || '').split('\n').map((l) => l.length ? prefix + l : l).join('\n');
}

/** HTML attribute 값으로 안전하게 이스케이프 */
export function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * endpoint path 에서 리소스 이름 추론. Phase 7-a 의 previewMocks 와 동일 로직.
 *   /api/books         → 'book'
 *   /api/books/:id     → 'book'
 *   /api/admin/users   → 'user'
 *   /orders/pending    → 'pending' (마지막 영문 segment)
 *
 *  compositeGen 과 compositePreviewBuilder 양쪽에서 쓰이므로 여기에 둠
 *  (Phase 7-a 의 previewMocks 와 중복되지만 별 문제 없음 — 동일 로직).
 */
export function extractResourceName(path) {
  if (!path) return 'item';
  const segs = String(path).split('/').filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    if (!s || s.startsWith(':') || s.startsWith('{') || /^(api|admin|v\d+|auth|internal)$/i.test(s)) continue;
    // Phase 33 (patch-12): 'paged', 'search', 'count' 같은 route-type 키워드는 resource name 이 아님.
    //  이전에는 `/api/books/paged` → 'paged' 로 잘못 추론 → pagedStore 라는 엉뚱한 store 생성.
    if (/^(paged|search|count|summary|export|import|batch|bulk|new|edit)$/i.test(s)) continue;
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)) continue;
    let name = s.toLowerCase();
    if (name.endsWith('ies')) name = name.slice(0, -3) + 'y';
    else if (name.endsWith('s') && !name.endsWith('ss')) name = name.slice(0, -1);
    return name || 'item';
  }
  return 'item';
}

/**
 * Vue SFC 조립.
 * parts = { imports: string[], setup: string, template: string, style?: string }
 */
export function assembleSfc({ imports = [], setup = '', template = '', style = '' } = {}) {
  const importBlock = imports.filter(Boolean).join('\n');
  const scriptBody = [importBlock, '', setup].filter(Boolean).join('\n');
  const out = [];
  out.push('<script setup>');
  out.push(scriptBody);
  out.push('</script>');
  out.push('');
  out.push('<template>');
  out.push(indentLines(template, '  '));
  out.push('</template>');
  if (style && style.trim()) {
    out.push('');
    out.push('<style scoped>');
    out.push(style.trim());
    out.push('</style>');
  }
  out.push('');
  return out.join('\n');
}
