/**
 * deriveAutoVars — 화면의 widget 들로부터 자동 변수 목록을 계산.
 *
 *  Phase 19: 사용자가 widget 에 데이터 소스를 지정하면 그 결과를 변수로 노출.
 *  원칙:
 *   - widget 마다 하나의 자동 변수
 *   - 이름은 widget.title 로부터 slugify → camelCase identifier
 *     · "학생 목록" 같은 한글 title 은 widget.id 기반 fallback ('w_<id>')
 *   - 이름 충돌 시 숫자 suffix 추가
 *   - source 가 없는 widget (markdown, text 등) 은 자동 변수 생성 안 함
 *   - 자동 변수는 { name, source, widgetId, kind } 형태로 반환
 *     - source: 사람에게 보여줄 요약 (예: "GET /api/students → rows")
 *
 *  쓰임:
 *   - CustomVarsPanel 에 autoVars prop 로 전달 → 읽기 전용으로 표시
 *   - 사용자가 이 변수를 expression 에서 참조 가능
 *   - (향후 generator 에서 이 변수를 실제 computed 로 선언할 때도 이 목록 사용)
 */

/** ASCII 식별자로 slugify (camelCase) */
function toIdentifier(s) {
  if (!s) return null;
  // ASCII 영문/숫자/공백/하이픈만 남김
  const ascii = String(s).replace(/[^a-zA-Z0-9\s_-]/g, '').trim();
  if (!ascii) return null;
  // 공백/하이픈 기준으로 word 로 쪼개서 camelCase
  const words = ascii.split(/[\s_-]+/).filter(Boolean);
  if (!words.length) return null;
  const first = words[0].toLowerCase();
  const rest = words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const ident = [first, ...rest].join('');
  // JS 예약어/숫자 시작 방지
  if (/^[0-9]/.test(ident)) return null;
  return ident;
}

/**
 * screen 에서 자동 변수 목록 계산.
 *  @param {Object} screen { id, rows, ... } 또는 ScreenSpec
 *  @returns {Array<{name, source, widgetId, kind}>}
 */
export function deriveAutoVars(screen) {
  if (!screen || !Array.isArray(screen.rows)) return [];
  const out = [];
  const usedNames = new Set();

  for (const row of screen.rows) {
    for (const widget of row.widgets || []) {
      if (!widget || !widget.source || !widget.source.type) continue;

      // 이름 결정: title → identifier, 실패 시 widget.id
      let base = toIdentifier(widget.title) || `w_${widget.id}`;
      // 숫자 시작 방지
      if (/^[0-9]/.test(base)) base = `w_${base}`;

      // 충돌 회피
      let name = base;
      let i = 2;
      while (usedNames.has(name)) {
        name = `${base}${i++}`;
      }
      usedNames.add(name);

      // source 요약
      let src;
      const s = widget.source;
      if (s.type === 'endpoint') {
        src = `${s.method || 'GET'} ${s.path || '(없음)'}${s.resultKey ? ` → ${s.resultKey}` : ''}`;
      } else if (s.type === 'storeState') {
        src = `store state: ${s.expression || s.key || '?'}`;
      } else if (s.type === 'storeCompute') {
        src = `store computed: ${s.expression || s.key || '?'}`;
      } else if (s.type === 'customVar') {
        src = `custom var: ${s.expression || s.name || '?'}`;
      } else {
        src = `${s.type}`;
      }

      out.push({
        name,
        source: src,
        widgetId: widget.id,
        kind: widget.kind,
      });
    }
  }
  return out;
}
