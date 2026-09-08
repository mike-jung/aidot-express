<script setup>
/**
 * SqlEditor v7 — 빈 SELECT 리스트 지원 + 날짜 포맷 삽입 버튼 추가.
 *
 *  변경점 (v6 → v7)
 *   - addColumnToSql / parseColumnsFromSql : "SELECT  FROM ..." (빈 컬럼 리스트) 처리
 *   - addColumnExprToSql : 임의 값표현식 삽입(SELECT alias / INSERT VALUES / UPDATE SET)
 *   - addDateFormatToSql + 컬럼 패널 UI : TO_CHAR / DATE_FORMAT(col) / DATE_FORMAT(now()) 버튼
 *   - freshQueryFields() 로 쿼리 객체 기본값 공통화 (중복 제거)
 *
 *  변경점 (v5 → v6)
 *   - ▶실행 버튼: 저장 전에도 편집 중인 SQL 을 즉시 실행 (sqlBody 전송)
 *   - addColumnToSql / removeColumnFromSql : INSERT·UPDATE 의 구조 기반 파싱으로 전면 재작성
 *   - addParamToSql  / removeParamFromSql  : UPDATE 의 WHERE 절에 정확히 추가/제거
 *   - splitCsv 로 콤마 분리(괄호/서브쿼리/문자열 리터럴 안전 처리)
 *   - parseInsertParts / parseUpdateParts : 구조 파싱 유틸
 */
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
// ★ v1.10.3 — 다국어
import { useI18n } from '../composables/useI18n';
import ScaffoldBar from '../components/ScaffoldBar.vue';
import http from '../api/http';
import CodeEditor from '../components/CodeEditor.vue';
import Pagination from '../components/Pagination.vue';
import { useDraggable } from '../composables/useDraggable';

const { modalRef, headerRef } = useDraggable();

const { t } = useI18n();

const props = defineProps({ id: { type: String, default: null } });
const emit = defineEmits(['close', 'saved']);
const isEdit = computed(() => props.id != null);
const title = computed(() => isEdit.value ? t('designer.sql_editTitle') : t('designer.sql_newTitle'));

const meta = reactive({ name: '', tableName: '', description: '' });
const queries = ref([]);
const queryPage = ref(1);
const QUERIES_PER_PAGE = 5;
const fullContent = ref('');
const fullEditedByUser = ref(false);
const loading = ref(false);
const saving = ref(false);
const error = ref(null);
const tableColumnCache = ref({});

function genQid() { return 'q_' + Math.random().toString(36).slice(2, 8); }

/** 쿼리 객체의 기본값 (세 곳에서 재사용) */
function freshQueryFields() {
  return {
    showCols: false, showVars: false, showTest: false,
    colInput: '', varInput: '', dateColInput: '',
    testParams: {}, testResult: null, testError: null, testing: false,
    _colQueryResult: null, _colQueryError: null, _colQueryLoading: false,
    _colQueryTable: null, _colQueryTables: null,
  };
}

function parseContent(content) {
  if (!content) return [];
  const lines = content.split(/\r?\n/); const out = []; let cur = null;
  for (const line of lines) {
    const m = line.match(/^--\s*@name:\s*(\w+)\s*$/);
    if (m) { if (cur) { cur.body = cur._l.join('\n').trim(); delete cur._l; out.push(cur); } cur = { id: genQid(), name: m[1], _l: [], ...freshQueryFields() }; }
    else if (cur) { cur._l.push(line); }
  }
  if (cur) { cur.body = cur._l.join('\n').trim(); delete cur._l; out.push(cur); }
  return out;
}
function buildFromQueries() { return queries.value.map(q => `-- @name: ${q.name}\n${q.body || '-- TODO'}`).join('\n\n') + '\n'; }
function syncFullFromQueries() { if (!fullEditedByUser.value) fullContent.value = buildFromQueries(); }
watch(queries, syncFullFromQueries, { deep: true });
function applyFullToQueries() { queries.value = parseContent(fullContent.value); fullEditedByUser.value = false; queryPage.value = 1; }
function onFullContentInput(val) { fullContent.value = val; fullEditedByUser.value = true; }

const totalQueryPages = computed(() => Math.max(1, Math.ceil(queries.value.length / QUERIES_PER_PAGE)));
const pagedQueries = computed(() => { const s = (queryPage.value-1)*QUERIES_PER_PAGE; return queries.value.slice(s, s+QUERIES_PER_PAGE); });
const pageOffset = computed(() => (queryPage.value - 1) * QUERIES_PER_PAGE);

/* ──── 쿼리 조작 ──── */
function addQuery() { queries.value.push({ id: genQid(), name: `newQuery${queries.value.length+1}`, body: 'SELECT 1', ...freshQueryFields() }); queryPage.value = totalQueryPages.value; }
function removeQuery(gi) { queries.value.splice(gi, 1); if (queryPage.value > totalQueryPages.value) queryPage.value = totalQueryPages.value; }
function moveQuery(gi, dir) { const j=gi+dir; if(j<0||j>=queries.value.length) return; [queries.value[gi], queries.value[j]] = [queries.value[j], queries.value[gi]]; }
function duplicateQuery(gi) { const s = queries.value[gi]; queries.value.splice(gi+1, 0, { id: genQid(), name: s.name+'_copy', body: s.body, ...freshQueryFields() }); }

/* ──── 변수 파싱 ──── */
function parseParamsFromSql(body) {
  if (!body) return [];
  const sanitized = body.replace(/'(?:[^'\\]|\\.)*'/g,"''").replace(/"(?:[^"\\]|\\.)*"/g,'""');
  const params = []; const seen = new Set();
  const re = /(?<!:):([a-zA-Z_][\w]*)\b/g; let m;
  while ((m = re.exec(sanitized)) !== null) { if (!seen.has(m[1])) { seen.add(m[1]); params.push(m[1]); } }
  return params;
}

/* ──── SQL 구조 분석 공통 유틸 ──── */
function getSqlType(body) {
  const u = (body || '').replace(/\s+/g, ' ').trim().toUpperCase();
  if (u.startsWith('SELECT')) return 'SELECT';
  if (u.startsWith('INSERT')) return 'INSERT';
  if (u.startsWith('UPDATE')) return 'UPDATE';
  if (u.startsWith('DELETE')) return 'DELETE';
  return 'UNKNOWN';
}

/** 괄호 중첩을 고려한 콤마 분리 (subquery, CAST 등 안전) */
function splitCsv(str) {
  const out = [];
  let depth = 0, inS = false, inD = false, cur = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (!inD && ch === "'" && str[i - 1] !== '\\') inS = !inS;
    else if (!inS && ch === '"' && str[i - 1] !== '\\') inD = !inD;
    else if (!inS && !inD) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    }
    cur += ch;
  }
  if (cur.length) out.push(cur);
  return out;
}

/** INSERT 의 컬럼리스트/값리스트 구조 파싱 — 없으면 null */
function parseInsertParts(body) {
  // INSERT INTO <table> (cols...) VALUES (vals...) — VALUES 가 소문자/여러줄인 경우까지 지원
  const m = body.match(
    /^(\s*INSERT\s+INTO\s+\S+\s*)\(([\s\S]*?)\)(\s*VALUES\s*)\(([\s\S]*?)\)([\s\S]*)$/i,
  );
  if (!m) return null;
  return {
    head: m[1],         // "INSERT INTO book "
    colsRaw: m[2],      // "id, name, author"
    mid: m[3],          // " VALUES "
    valsRaw: m[4],      // ":id, :name, :author"
    tail: m[5],         // "" 또는 "; RETURNING ..." 등
  };
}

/** UPDATE 의 SET 절과 WHERE 절 구조 파싱 — 없으면 null */
function parseUpdateParts(body) {
  // UPDATE <table> SET <assignments> [WHERE <cond>] [;]
  const m = body.match(/^(\s*UPDATE\s+\S+\s*SET\s+)([\s\S]*?)(\s+WHERE\b[\s\S]*?)?(\s*;?\s*)$/i);
  if (!m) return null;
  return {
    head: m[1],            // "UPDATE book SET "
    setRaw: m[2],          // "name = :name, author = :author"
    whereRaw: m[3] || '',  // " WHERE id = :id" 또는 ''
    tail: m[4] || '',      // 말미 공백/세미콜론
  };
}

/* ──── 컬럼 분석 (SELECT/INSERT/UPDATE 모두 지원) ──── */
function parseColumnsFromSql(body) {
  if (!body) return [];
  const type = getSqlType(body);
  if (type === 'SELECT') {
    const u = body.replace(/\s+/g, ' ').trim();
    if (/^SELECT\s+\*\s+FROM/i.test(u)) return ['*'];
    // "SELECT  FROM ..." 처럼 컬럼이 비어있는 경우 — 빈 배열
    if (/^SELECT\s+FROM\b/i.test(u) || /^SELECT\s*$/i.test(u)) return [];
    const m = body.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
    if (!m) return [];
    return splitCsv(m[1]).map(c => {
      const t = c.trim();
      const d = t.lastIndexOf('.');
      return (d >= 0 ? t.slice(d + 1) : t)
        .replace(/[`"[\]\s]/g, '')
        .replace(/\bas\s+\w+$/i, '')
        .trim();
    }).filter(Boolean);
  }
  if (type === 'INSERT') {
    const p = parseInsertParts(body);
    if (!p) return [];
    return splitCsv(p.colsRaw).map(c => c.trim().replace(/[`"[\]]/g, '')).filter(Boolean);
  }
  if (type === 'UPDATE') {
    const p = parseUpdateParts(body);
    if (!p) return [];
    return splitCsv(p.setRaw).map(assign => {
      const eq = assign.indexOf('=');
      return eq > 0 ? assign.slice(0, eq).trim().replace(/[`"[\]]/g, '') : '';
    }).filter(Boolean);
  }
  return [];
}

/* ──── 컬럼 추가 (SELECT/INSERT/UPDATE) ──── */
function addColumnToSql(gi, colName) {
  if (!colName?.trim()) return;
  const col = colName.trim();
  const q = queries.value[gi];
  let body = q.body || '';
  const type = getSqlType(body);

  if (type === 'SELECT') {
    const flat = body.replace(/\s+/g, ' ');
    // ★ 빈 SELECT 리스트 ("SELECT  FROM ..." 또는 "SELECT\n\nFROM ...") 우선 처리
    //   정규식 [\s\S]+? 은 최소 1문자 필요해서 아래 일반 경로가 매칭 못함.
    if (/^\s*SELECT\s+FROM\b/i.test(flat)) {
      body = body.replace(/(SELECT)(\s+)(FROM)/i, (_, sel, ws, from) => {
        // 공백 사이에 개행이 있으면 원본 포맷 유지(멀티라인 스타일 존중),
        // 단일 라인이면 과잉 공백을 정리해 "SELECT col FROM" 로 정규화.
        return /\n/.test(ws) ? `${sel} ${col}${ws}${from}` : `${sel} ${col} ${from}`;
      });
    } else if (/SELECT\s+\*\s+FROM/i.test(flat)) {
      body = body.replace(/SELECT\s+\*/i, `SELECT *, ${col}`);
    } else {
      body = body.replace(/(SELECT\s+)([\s\S]+?)(\s+FROM)/i,
        (_, s, c, f) => `${s}${c.trimEnd()}, ${col}${f}`);
    }
  } else if (type === 'INSERT') {
    const p = parseInsertParts(body);
    if (!p) return;
    const cols = splitCsv(p.colsRaw).map(c => c.trim()).filter(Boolean);
    const vals = splitCsv(p.valsRaw).map(v => v.trim()).filter(Boolean);
    // 중복 방지
    if (cols.some(c => c.replace(/[`"[\]]/g, '').toLowerCase() === col.toLowerCase())) return;
    cols.push(col);
    vals.push(`:${col}`);
    body = `${p.head}(${cols.join(', ')})${p.mid}(${vals.join(', ')})${p.tail}`;
  } else if (type === 'UPDATE') {
    const p = parseUpdateParts(body);
    if (!p) return;
    const sets = splitCsv(p.setRaw).map(s => s.trim()).filter(Boolean);
    // 중복 방지
    const exists = sets.some(s => {
      const eq = s.indexOf('=');
      const name = eq > 0 ? s.slice(0, eq).trim().replace(/[`"[\]]/g, '') : '';
      return name.toLowerCase() === col.toLowerCase();
    });
    if (exists) return;
    sets.push(`${col} = :${col}`);
    body = `${p.head}${sets.join(', ')}${p.whereRaw}${p.tail}`;
  } else if (type === 'DELETE') {
    // DELETE 에는 컬럼 개념이 없음 — 무시
    return;
  }
  queries.value[gi] = { ...q, body };
}

/* ──── 컬럼 + 값 표현식 페어 추가 (날짜 포맷 등 계산식 삽입용) ──────────────
 *  addColumnToSql 는 "이름 = :이름" 형식으로만 추가하는 반면,
 *  이 함수는 임의의 값 표현식(예: TO_CHAR(...), DATE_FORMAT(...)) 을 지원.
 *
 *   SELECT : `${valueExpr} AS ${colName}` 를 SELECT 리스트에 추가 (colName 비면 alias 생략)
 *   INSERT : cols 에 colName, VALUES 에 valueExpr 추가 (colName 필수)
 *   UPDATE : SET 에 `${colName} = ${valueExpr}` 추가 (colName 필수)
 *   DELETE : no-op
 */
function addColumnExprToSql(gi, colName, valueExpr) {
  if (!valueExpr || !String(valueExpr).trim()) return;
  const expr = String(valueExpr).trim();
  const col = (colName || '').trim();
  const q = queries.value[gi];
  let body = q.body || '';
  const type = getSqlType(body);

  if (type === 'SELECT') {
    const flat = body.replace(/\s+/g, ' ');
    // SELECT 리스트에 넣을 텍스트 ("expr AS col" 또는 "expr")
    const piece = col ? `${expr} AS ${col}` : expr;
    if (/^\s*SELECT\s+FROM\b/i.test(flat)) {
      body = body.replace(/(SELECT)(\s+)(FROM)/i, (_, sel, ws, from) => {
        return /\n/.test(ws) ? `${sel} ${piece}${ws}${from}` : `${sel} ${piece} ${from}`;
      });
    } else if (/SELECT\s+\*\s+FROM/i.test(flat)) {
      body = body.replace(/SELECT\s+\*/i, `SELECT *, ${piece}`);
    } else {
      body = body.replace(/(SELECT\s+)([\s\S]+?)(\s+FROM)/i,
        (_, s, c, f) => `${s}${c.trimEnd()}, ${piece}${f}`);
    }
  } else if (type === 'INSERT') {
    if (!col) return; // INSERT 는 컬럼명 필수
    const p = parseInsertParts(body);
    if (!p) return;
    const cols = splitCsv(p.colsRaw).map(c => c.trim()).filter(Boolean);
    const vals = splitCsv(p.valsRaw).map(v => v.trim()).filter(Boolean);
    // 중복 방지 (있으면 값 표현식 교체)
    const lower = col.toLowerCase();
    const idx = cols.findIndex(c => c.replace(/[`"[\]]/g, '').toLowerCase() === lower);
    if (idx >= 0) {
      vals[idx] = expr;
    } else {
      cols.push(col);
      vals.push(expr);
    }
    body = `${p.head}(${cols.join(', ')})${p.mid}(${vals.join(', ')})${p.tail}`;
  } else if (type === 'UPDATE') {
    if (!col) return; // UPDATE 도 좌변 컬럼명 필수
    const p = parseUpdateParts(body);
    if (!p) return;
    const sets = splitCsv(p.setRaw).map(s => s.trim()).filter(Boolean);
    const lower = col.toLowerCase();
    // 이미 같은 컬럼이 SET 에 있으면 값 표현식 교체
    const idx = sets.findIndex(s => {
      const eq = s.indexOf('=');
      const name = eq > 0 ? s.slice(0, eq).trim().replace(/[`"[\]]/g, '') : '';
      return name.toLowerCase() === lower;
    });
    if (idx >= 0) {
      sets[idx] = `${col} = ${expr}`;
    } else {
      sets.push(`${col} = ${expr}`);
    }
    body = `${p.head}${sets.join(', ')}${p.whereRaw}${p.tail}`;
  } else {
    return; // DELETE 및 UNKNOWN 은 no-op
  }
  queries.value[gi] = { ...q, body };
}

/* ──── 날짜 포맷 변환식 삽입 ──── */
/**
 *  kind 종류:
 *    'to_char'        : TO_CHAR(<col>, 'YYYY-MM-DD HH24:MI:SS') [col 없으면 SYSDATE]
 *    'date_format'    : DATE_FORMAT(<col>, '%Y-%m-%d %H:%i:%s') [col 필수]
 *    'date_format_now': DATE_FORMAT(now(), '%Y-%m-%d %H:%i:%s') [col 선택: alias/좌변으로만 사용]
 */
function addDateFormatToSql(gi, colName, kind) {
  const col = (colName || '').trim();
  let expr;
  if (kind === 'to_char') {
    const target = col || 'SYSDATE';
    expr = `TO_CHAR(${target}, 'YYYY-MM-DD HH24:MI:SS')`;
  } else if (kind === 'date_format') {
    if (!col) return; // col 필수
    expr = `DATE_FORMAT(${col}, '%Y-%m-%d %H:%i:%s')`;
  } else if (kind === 'date_format_now') {
    expr = `DATE_FORMAT(now(), '%Y-%m-%d %H:%i:%s')`;
  } else {
    return;
  }
  addColumnExprToSql(gi, col, expr);
}

/* ──── 컬럼 삭제 (SELECT/INSERT/UPDATE) ──── */
function removeColumnFromSql(gi, colName) {
  if (!colName?.trim()) return;
  const q = queries.value[gi];
  let body = q.body || '';
  const type = getSqlType(body);
  const target = colName.trim().toLowerCase();

  if (type === 'SELECT') {
    const flat = body.replace(/\s+/g, ' ');
    // SELECT * 면 제거할 대상 없음
    if (/SELECT\s+\*\s+FROM/i.test(flat)) return;
    body = body.replace(/(SELECT\s+)([\s\S]+?)(\s+FROM)/i, (_, s, c, f) => {
      const items = splitCsv(c).map(x => x.trim()).filter(Boolean);
      const kept = items.filter(item => {
        const base = item.replace(/\bas\s+\w+$/i, '').trim();
        const lastDot = base.lastIndexOf('.');
        const name = (lastDot >= 0 ? base.slice(lastDot + 1) : base).replace(/[`"[\]\s]/g, '').toLowerCase();
        return name !== target;
      });
      // 전부 지워지면 * 로 복구 (유효한 SQL 유지)
      return `${s}${kept.length ? kept.join(', ') : '*'}${f}`;
    });
  } else if (type === 'INSERT') {
    const p = parseInsertParts(body);
    if (!p) return;
    const cols = splitCsv(p.colsRaw).map(c => c.trim()).filter(Boolean);
    const vals = splitCsv(p.valsRaw).map(v => v.trim()).filter(Boolean);
    // 컬럼 이름 기준으로 동일 index 의 값도 함께 제거
    const keepIdx = [];
    cols.forEach((c, i) => {
      const n = c.replace(/[`"[\]]/g, '').toLowerCase();
      if (n !== target) keepIdx.push(i);
    });
    const newCols = keepIdx.map(i => cols[i]);
    const newVals = keepIdx.map(i => vals[i] ?? '');
    body = `${p.head}(${newCols.join(', ')})${p.mid}(${newVals.join(', ')})${p.tail}`;
  } else if (type === 'UPDATE') {
    const p = parseUpdateParts(body);
    if (!p) return;
    const sets = splitCsv(p.setRaw).map(s => s.trim()).filter(Boolean);
    const kept = sets.filter(s => {
      const eq = s.indexOf('=');
      const name = eq > 0 ? s.slice(0, eq).trim().replace(/[`"[\]]/g, '').toLowerCase() : '';
      return name !== target;
    });
    // SET 이 모두 비면 placeholder 유지 (SQL 유효성은 사용자가 보정)
    body = `${p.head}${kept.length ? kept.join(', ') : '/* SET 비어있음 */'}${p.whereRaw}${p.tail}`;
  }
  queries.value[gi] = { ...q, body };
}

/* ──── 변수 추가 (WHERE 중심; INSERT 는 컬럼+값 쌍) ──── */
function addParamToSql(gi, paramName) {
  if (!paramName?.trim()) return;
  const p = paramName.trim();
  const q = queries.value[gi];
  let body = q.body || '';
  const type = getSqlType(body);

  if (type === 'SELECT' || type === 'DELETE') {
    // WHERE 가 있으면 AND 로, 없으면 ORDER/LIMIT/GROUP 앞 또는 말미에 WHERE 추가
    const hasWhere = /\bWHERE\b/i.test(body);
    const clauseRe = /\b(ORDER\s+BY|LIMIT|GROUP\s+BY|HAVING)\b/i;
    if (hasWhere) {
      if (clauseRe.test(body)) {
        body = body.replace(clauseRe, (kw) => `AND ${p} = :${p}\n${kw}`);
      } else {
        body = body.replace(/;?\s*$/, '') + `\nAND ${p} = :${p}`;
      }
    } else {
      if (clauseRe.test(body)) {
        body = body.replace(clauseRe, (kw) => `WHERE ${p} = :${p}\n${kw}`);
      } else {
        body = body.replace(/;?\s*$/, '') + `\nWHERE ${p} = :${p}`;
      }
    }
  } else if (type === 'UPDATE') {
    // 기본적으로 WHERE 조건으로 추가 (사용자 요구: "변수를 where 절에 추가")
    const parts = parseUpdateParts(body);
    if (!parts) return;
    if (parts.whereRaw) {
      // 이미 WHERE 가 있으면 AND 조건 추가
      const newWhere = parts.whereRaw.replace(/;?\s*$/, '') + `\n   AND ${p} = :${p}`;
      body = `${parts.head}${parts.setRaw}${newWhere}${parts.tail}`;
    } else {
      body = `${parts.head}${parts.setRaw}\n WHERE ${p} = :${p}${parts.tail}`;
    }
  } else if (type === 'INSERT') {
    // INSERT 는 WHERE 개념 없음 → 컬럼+값 쌍 추가 (컬럼 아이콘과 동일 동작)
    addColumnToSql(gi, p);
    return;
  }
  queries.value[gi] = { ...q, body };
}

/* ──── 변수 삭제 (WHERE 에서 제거; INSERT 는 컬럼 제거로 위임) ──── */
function removeParamFromSql(gi, paramName) {
  if (!paramName?.trim()) return;
  const q = queries.value[gi];
  let body = q.body || '';
  const type = getSqlType(body);
  const e = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (type === 'INSERT') {
    // INSERT 에서는 컬럼 삭제와 동일
    removeColumnFromSql(gi, paramName);
    return;
  }

  if (type === 'UPDATE') {
    const parts = parseUpdateParts(body);
    if (!parts) return;
    // 1) WHERE 내부에서 제거 시도
    let where = parts.whereRaw;
    if (where) {
      // "AND col = :col" / "col = :col AND" / "WHERE col = :col" 패턴 모두 제거
      where = where.replace(new RegExp(`\\s*\\bAND\\s+${e}\\s*=\\s*:\\w+`, 'gi'), '');
      where = where.replace(new RegExp(`\\b${e}\\s*=\\s*:\\w+\\s*\\bAND\\s+`, 'gi'), '');
      where = where.replace(new RegExp(`\\bWHERE\\s+${e}\\s*=\\s*:\\w+\\s*(?=$|;|\\s+(ORDER|LIMIT|GROUP))`, 'gi'), '');
      // 비어버린 WHERE 절 제거 ("WHERE" 만 남은 경우)
      where = where.replace(/\bWHERE\s*$/i, '').replace(/\bWHERE\s+AND\s+/i, 'WHERE ');
      if (/^\s*WHERE\s*$/i.test(where.trim())) where = '';
    }
    // 2) SET 내부의 "col = :col" 도 사용자가 원할 수 있음 → SET 에서도 제거
    let setRaw = parts.setRaw;
    const sets = splitCsv(setRaw).map(s => s.trim()).filter(Boolean);
    const kept = sets.filter(s => {
      const eq = s.indexOf('=');
      const name = eq > 0 ? s.slice(0, eq).trim().replace(/[`"[\]]/g, '').toLowerCase() : '';
      return name !== paramName.trim().toLowerCase();
    });
    setRaw = kept.length ? kept.join(', ') : '/* SET 비어있음 */';
    body = `${parts.head}${setRaw}${where}${parts.tail}`;
  } else {
    // SELECT / DELETE
    body = body.replace(new RegExp(`\\s*\\bAND\\s+${e}\\s*=\\s*:\\w+`, 'gi'), '');
    body = body.replace(new RegExp(`\\b${e}\\s*=\\s*:\\w+\\s*\\bAND\\s+`, 'gi'), '');
    body = body.replace(new RegExp(`\\bWHERE\\s+${e}\\s*=\\s*:\\w+\\s*(?=$|;|\\s+(ORDER|LIMIT|GROUP))`, 'gi'), '');
    body = body.replace(/\bWHERE\s*$/gim, '').replace(/\bWHERE\s+AND\s+/i, 'WHERE ');
  }
  queries.value[gi] = { ...q, body: body.trimEnd() };
}

/* ──── SQL 쿼리 테스트 실행 ──── */
async function runTest(gi) {
  const q = queries.value[gi];
  q.testing = true; q.testResult = null; q.testError = null;
  try {
    // 편집 중인 SQL 본문을 그대로 전송 → 서버가 즉시 실행.
    // (저장 여부와 무관하게 테스트 가능)
    const r = await http.post('/api/admin/sqls/test', {
      sqlFile: meta.name || null,
      queryName: q.name,
      testParams: q.testParams || {},
      sqlBody: q.body || '',
    });
    const data = r.data.data;
    // ★ success: false 인 경우 에러로 표시
    if (data && data.success === false) {
      q.testError = data.error || t('designer.sql_runFailed');
      q.testResult = data;  // elapsed 등 추가 정보 표시용
    } else {
      q.testResult = data;
    }
  } catch (e) {
    const status = e.response?.status;
    if (status === 404) {
      q.testError = t('designer.sql_noEndpoint');
    } else {
      q.testError = e.response?.data?.message || e.message;
    }
  } finally { q.testing = false; }
}

/** 테스트 패널 열 때 파라미터 초기화 */
function openTestPanel(gi) {
  const q = queries.value[gi];
  q.showTest = !q.showTest;
  if (q.showTest) {
    q.showCols = false; q.showVars = false;
    // 기존 파라미터 유지하되 새 파라미터 추가
    const params = parseParamsFromSql(q.body);
    const newTestParams = {};
    for (const p of params) newTestParams[p] = q.testParams?.[p] || '';
    q.testParams = newTestParams;
  }
}

/* ──── FROM 테이블 후보 ──── */
function getFromTable(body){const m=body?.match(/FROM\s+([A-Za-z_][\w.]*)/i);return m?m[1]:null;}
async function loadTableColumns(tbl){if(!tbl||tableColumnCache.value[tbl])return;try{const r=await http.get(`/api/admin/sqls/${tbl.includes('.')?tbl.split('.').pop():tbl}`);const d=r.data.data;if(d){const cols=new Set();for(const q of(d.queriesWithParams||[]))for(const p of q.params)cols.add(p);const parsed=parseContent(d.content||'');for(const pq of parsed)for(const c of parseColumnsFromSql(pq.body))if(c!=='*')cols.add(c);tableColumnCache.value={...tableColumnCache.value,[tbl]:[...cols]};}}catch{};}
function getColumnSuggestions(body){const tbl=getFromTable(body);if(!tbl)return[];const cached=tableColumnCache.value[tbl];if(!cached){loadTableColumns(tbl);return[];}return cached.filter(c=>!new Set(parseParamsFromSql(body)).has(c));}

/* ──── DB 테이블 {{ t('sql.loadColumns') }} ──── */
async function queryTableColumns(gi, overrideTable) {
  const q = queries.value[gi];
  const tbl = overrideTable || getFromTable(q.body);
  if (!tbl) { q._colQueryError = t('designer.sql_noFrom'); return; }
  q._colQueryLoading = true; q._colQueryError = null; q._colQueryResult = null; q._colQueryTables = null;
  try {
    const r = await http.post('/api/admin/sqls/table-columns', { tableName: tbl });
    const data = r.data.data;
    if (data.error) { q._colQueryError = data.error; }
    else if (data.needSchemaSelection) {
      // 여러 스키마에 같은 테이블 → 선택지 표시
      q._colQueryTables = data.tables;
      q._colQueryTable = tbl;
    } else {
      q._colQueryResult = data.columns || []; q._colQueryTable = data.tableName || tbl; q._colQueryTables = null;
    }
  } catch (e) { q._colQueryError = e.response?.data?.message || e.message; }
  finally { q._colQueryLoading = false; }
}
function addColumnFromQuery(gi, col) {
  addColumnToSql(gi, col.name);
}

/* ──── 5개 기본 쿼리 ──── */
async function generateFromTable(){error.value=null;if(!meta.name){error.value='파일명 필요';return;}if(!meta.tableName){error.value='테이블명 필요';return;}try{const r=await http.post('/api/admin/sqls/preview',{fileName:meta.name,tableName:meta.tableName,description:meta.description,columns:[]});const parsed=parseContent(r.data.data.content);const existing=new Set(queries.value.map(q=>q.name));for(const nq of parsed){if(existing.has(nq.name))nq.name+='_new';existing.add(nq.name);queries.value.push(nq);}fullEditedByUser.value=false;await nextTick();queryPage.value=totalQueryPages.value;}catch(e){error.value=e.response?.data?.message||e.message;}}

/* ──── 로딩/저장 ──── */
async function loadExisting(){const r=await http.get(`/api/admin/sqls/${props.id}`);const d=r.data.data;if(!d)return;meta.name=d.name;meta.tableName=d.table_name||'';meta.description=d.description||'';queries.value=parseContent(d.content||'');fullContent.value=d.content||'';}
async function save(){saving.value=true;error.value=null;try{if(!fullEditedByUser.value){const names=queries.value.map(q=>q.name);const dups=names.filter((n,i)=>names.indexOf(n)!==i);if(dups.length){error.value=`중복 쿼리 이름: ${[...new Set(dups)].join(', ')}`;saving.value=false;return;}}const payload={name:meta.name,tableName:meta.tableName,description:meta.description,content:fullEditedByUser.value?fullContent.value:buildFromQueries()};if(isEdit.value)await http.put(`/api/admin/sqls/${props.id}`,payload);else await http.post('/api/admin/sqls',payload);emit('saved');}catch(e){error.value=e.response?.data?.errors?.map(er=>`${er.field}: ${er.message}`).join(', ')||e.response?.data?.message||e.message;}finally{saving.value=false;}}
onMounted(async()=>{loading.value=true;try{if(isEdit.value)await loadExisting();}finally{loading.value=false;}});
</script>

<template>
  <div class="app-modal-backdrop" @mousedown.self="$emit('close')">
    <div ref="modalRef" class="app-modal" style="max-width:1200px">
      <div ref="headerRef" class="modal-header"><h5 class="mb-0">{{ title }}</h5><button class="btn-close" @click="$emit('close')"></button></div>
      <div class="modal-body" style="max-height:80vh; overflow-y:auto">
        <div v-if="loading" class="text-center text-secondary py-5"><span class="spinner-border spinner-border-sm me-2"></span>{{ t('common.loading') }}</div>
        <div v-else>
          <div v-if="error" class="alert alert-danger small">{{ error }}</div>
          <div class="row g-3 mb-3">
            <div class="col-md-4"><label class="form-label small">{{ t('sql.fileName') }} <span class="text-danger">*</span></label><div class="input-group input-group-sm"><input v-model="meta.name" type="text" class="form-control" :disabled="isEdit" /><span class="input-group-text">.sql</span></div></div>
            <div class="col-md-4"><label class="form-label small">{{ t('sql.tableName') }}</label><input v-model="meta.tableName" type="text" class="form-control form-control-sm" /></div>
            <div class="col-md-4"><label class="form-label small">{{ t('sqlEd.description') }}</label><input v-model="meta.description" type="text" class="form-control form-control-sm" /></div>
          </div>
          <!-- ★ v1.10.29 — 세 생성 화면이 같은 줄을 씁니다 (ScaffoldBar) -->
          <ScaffoldBar
            :label="t('scaffold.make5')"
            :source="meta.tableName"
            :empty-hint="t('scaffold.needTable')"
            :ready-hint="t('scaffold.readyTable', { name: meta.tableName })"
            :existing="queries.length"
            @generate="generateFromTable" />

          <!-- 쿼리 목록 -->
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0"><i class="bi bi-list-ol me-2"></i>{{ t('sql.queryList') }} <small class="text-secondary">({{ queries.length }}개)</small></h6>
            <button class="btn btn-sm btn-outline-primary" @click="addQuery"><i class="bi bi-plus-lg me-1"></i>{{ t('sql.addQuery') }}</button>
          </div>
          <div v-if="queries.length===0" class="text-center text-secondary small py-3 border rounded mb-3">{{ t('sql.noQueries') }}</div>

          <div v-for="(q,li) in pagedQueries" :key="q.id" class="mb-2 p-2 rounded" style="background:#f9fafb; border:1px solid #e8eaee">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="badge bg-secondary">{{ pageOffset+li+1 }}</span>
              <span class="text-secondary small">@name:</span>
              <input type="text" class="form-control form-control-sm font-monospace" style="width:200px" v-model="q.name" @input="fullEditedByUser=false" />
              <span class="flex-grow-1"></span>
              <!-- ▶ 테스트 버튼 -->
              <!-- title 은 HTML 속성이라 {{ }} 가 해석되지 않는다 — :title 로 묶어야 한다 -->
              <button class="btn btn-sm" :class="q.showTest?'btn-warning':'btn-outline-warning'" @click="openTestPanel(pageOffset+li)" :title="t('sql.testRun')">
                <i class="bi bi-play-fill"></i>
              </button>
              <button class="btn btn-sm" :class="q.showCols?'btn-info':'btn-outline-secondary'" @click="q.showCols=!q.showCols;q.showVars=false;q.showTest=false" :title="t('sqlEd.columnsTip')"><i class="bi bi-layout-three-columns"></i></button>
              <button class="btn btn-sm" :class="q.showVars?'btn-primary':'btn-outline-secondary'" @click="q.showVars=!q.showVars;q.showCols=false;q.showTest=false;if(q.showVars)loadTableColumns(getFromTable(q.body))" :title="t('sqlEd.varsTip')"><i class="bi bi-braces"></i></button>
              <button class="btn btn-sm btn-outline-secondary" @click="duplicateQuery(pageOffset+li)" :title="t('sqlEd.duplicate')"><i class="bi bi-copy"></i></button>
              <button class="btn btn-sm btn-outline-secondary" @click="moveQuery(pageOffset+li,-1)" :disabled="pageOffset+li===0" :title="t('sqlEd.moveUp')"><i class="bi bi-arrow-up"></i></button>
              <button class="btn btn-sm btn-outline-secondary" @click="moveQuery(pageOffset+li,1)" :disabled="pageOffset+li===queries.length-1" :title="t('sqlEd.moveDown')"><i class="bi bi-arrow-down"></i></button>
              <button class="btn btn-sm btn-outline-danger" @click="removeQuery(pageOffset+li)" :title="t('sqlEd.removeQuery')"><i class="bi bi-x-lg"></i></button>
            </div>
            <textarea v-model="q.body" class="form-control form-control-sm font-monospace small" rows="4" spellcheck="false" style="resize:vertical;tab-size:2" @input="fullEditedByUser=false"></textarea>

            <!-- ▶ SQL 테스트 패널 -->
            <div v-if="q.showTest" class="mt-2 p-2 rounded" style="background:#fff8e8; border:1px solid #ffd080">
              <div class="d-flex align-items-center gap-2 mb-2">
                <small class="fw-bold text-secondary"><i class="bi bi-play-fill me-1"></i>SQL 테스트 {{ t('sqlEd.run') }}</small>
                <small class="text-secondary fst-italic">{{ t('sql.testHint') }}</small>
              </div>
              <!-- 파라미터 입력 -->
              <div v-if="parseParamsFromSql(q.body).length" class="mb-2">
                <small class="text-secondary d-block mb-1">{{ t('sql.paramsInput') }}</small>
                <div v-for="p in parseParamsFromSql(q.body)" :key="p" class="d-flex align-items-center gap-2 mb-1">
                  <code class="small" style="width:120px">:{{ p }}</code>
                  <input type="text" class="form-control form-control-sm" style="width:250px" v-model="q.testParams[p]" :placeholder="`${p} 값`" />
                </div>
              </div>
              <div v-else class="small text-secondary mb-2 fst-italic">{{ t('sql.noParams') }}</div>
              <button class="btn btn-sm btn-warning" @click="runTest(pageOffset+li)" :disabled="q.testing || !q.body?.trim()">
                <span v-if="q.testing" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-play-fill me-1"></i>{{ t('sqlEd.run') }}
              </button>
              <!-- 결과 -->
              <div v-if="q.testError" class="alert alert-danger small mt-2 mb-0">
                <i class="bi bi-exclamation-triangle me-1"></i>{{ q.testError }}
                <div v-if="q.testResult?.elapsed" class="mt-1 small text-muted">{{ q.testResult.elapsed }}ms</div>
              </div>
              <div v-if="q.testResult && q.testResult.success !== false" class="mt-2">
                <div class="small text-secondary mb-1">
                  <strong>{{ t('sqlEd.result') }}</strong> {{ q.testResult.rowCount ?? 0 }}행 · {{ q.testResult.elapsed }}ms
                  <span v-if="q.testResult.mock" class="badge bg-secondary ms-1">{{ t('sqlEd.mockMode') }}</span>
                  <span v-if="q.testResult.detectedParams?.length" class="ms-2">감지 파라미터: {{ q.testResult.detectedParams.join(', ') }}</span>
                </div>
                <div v-if="q.testResult.rows && q.testResult.rows.length" style="max-height:200px; overflow:auto">
                  <table class="table table-sm table-bordered small mb-0">
                    <thead class="table-light"><tr><th v-for="col in Object.keys(q.testResult.rows[0])" :key="col">{{ col }}</th></tr></thead>
                    <tbody><tr v-for="(row,ri) in q.testResult.rows.slice(0,20)" :key="ri"><td v-for="col in Object.keys(q.testResult.rows[0])" :key="col">{{ row[col] }}</td></tr></tbody>
                  </table>
                  <small v-if="q.testResult.rows.length>20" class="text-secondary">... 외 {{ q.testResult.rows.length - 20 }}행</small>
                </div>
                <div v-else-if="q.testResult.rows" class="small text-secondary fst-italic">{{ t('sql.zeroRows') }}</div>
                <div v-if="q.testResult.boundSql" class="mt-1">
                  <small class="text-secondary">{{ t('sql.executedSql') }}</small>
                  <pre class="small p-1 rounded mb-0" style="background:#f8f8f8; max-height:100px; overflow:auto">{{ q.testResult.boundSql }}</pre>
                </div>
              </div>
            </div>

            <!-- 컬럼 분석 -->
            <div v-if="q.showCols" class="mt-2 p-2 rounded" style="background:#f0f4ff; border:1px solid #c8d8f8">
              <div class="d-flex align-items-center flex-wrap gap-1 mb-1">
                <small class="text-secondary me-1"><i class="bi bi-layout-three-columns me-1"></i>{{ t('sqlEd.columns') }}</small>
                <span v-for="col in parseColumnsFromSql(q.body)" :key="col" class="badge bg-light text-dark border">{{ col }}<button v-if="col!=='*'" class="btn-close ms-1" style="font-size:8px" @click="removeColumnFromSql(pageOffset+li,col)"></button></span>
              </div>
              <div class="d-flex gap-2 mb-2">
                <input type="text" class="form-control form-control-sm" style="width:200px" v-model="q.colInput" :placeholder="t('sqlEd.columnName')" @keyup.enter="addColumnToSql(pageOffset+li,q.colInput);q.colInput=''" />
                <button class="btn btn-sm btn-outline-primary" @click="addColumnToSql(pageOffset+li,q.colInput);q.colInput=''"><i class="bi bi-plus-lg me-1"></i>{{ t('sqlEd.add') }}</button>
                <button class="btn btn-sm btn-outline-info" @click="queryTableColumns(pageOffset+li)" :disabled="q._colQueryLoading">
                  <span v-if="q._colQueryLoading" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-table me-1"></i>{{ t('sqlEd.loadColumns') }}
                </button>
              </div>
              <!-- ▶ 날짜 포맷 변환식 삽입 -->
              <div class="d-flex gap-2 mb-2 align-items-center flex-wrap" style="border-top:1px dashed #c8d8f8; padding-top:6px">
                <small class="text-secondary"><i class="bi bi-calendar-date me-1"></i>{{ t('sqlEd.dateFormat') }}</small>
                <input type="text" class="form-control form-control-sm" style="width:140px"
                       v-model="q.dateColInput" :placeholder="t('sqlEd.colNameOptional')"
                       :title="t('sqlEditor.k1')" />
                <button class="btn btn-sm btn-outline-success"
                        @click="addDateFormatToSql(pageOffset+li, q.dateColInput, 'to_char'); q.dateColInput=''"
                        :title="t('sqlEditor.k2')">
                  <i class="bi bi-plus-lg"></i> TO_CHAR
                </button>
                <button class="btn btn-sm btn-outline-success"
                        @click="addDateFormatToSql(pageOffset+li, q.dateColInput, 'date_format'); q.dateColInput=''"
                        :disabled="!(q.dateColInput && q.dateColInput.trim())"
                        :title="t('sqlEditor.k3')">
                  <i class="bi bi-plus-lg"></i> DATE_FORMAT
                </button>
                <button class="btn btn-sm btn-outline-success"
                        @click="addDateFormatToSql(pageOffset+li, q.dateColInput, 'date_format_now'); q.dateColInput=''"
                        :title="t('sqlEditor.k4')">
                  <i class="bi bi-plus-lg"></i> DATE_FORMAT(now())
                </button>
              </div>
              <!-- DB 컬럼 조회 결과 -->
              <div v-if="q._colQueryError" class="alert alert-danger small py-1 mb-1">{{ q._colQueryError }}</div>
              <!-- 테이블 선택 (여러 스키마에 같은 이름 존재 시) -->
              <div v-if="q._colQueryTables && q._colQueryTables.length" class="mb-2">
                <small class="text-secondary d-block mb-1"><i class="bi bi-exclamation-triangle me-1"></i>'{{ q._colQueryTable }}' 테이블이 여러 스키마에 존재합니다. 선택하세요:</small>
                <div class="d-flex gap-2 flex-wrap">
                  <button v-for="t in q._colQueryTables" :key="t" class="btn btn-sm btn-outline-info"
                          @click="queryTableColumns(pageOffset+li, t)">
                    <i class="bi bi-database me-1"></i>{{ t }}
                  </button>
                </div>
              </div>
              <div v-if="q._colQueryResult && q._colQueryResult.length" class="mb-1">
                <small class="text-secondary d-block mb-1"><i class="bi bi-table me-1"></i>{{ q._colQueryTable }} 컬럼 (클릭하여 추가):</small>
                <div style="max-height:150px; overflow-y:auto">
                  <table class="table table-sm table-hover small mb-0">
                    <thead class="table-light"><tr><th></th><th>{{ t('sqlEd.columnName') }}</th><th>{{ t('sqlEd.type') }}</th><th>{{ t('sqlEd.key') }}</th><th>NULL</th></tr></thead>
                    <tbody>
                      <tr v-for="c in q._colQueryResult" :key="c.name" style="cursor:pointer" @click="addColumnFromQuery(pageOffset+li, c)">
                        <td><button class="btn btn-sm btn-outline-primary py-0 px-1" @click.stop="addColumnFromQuery(pageOffset+li, c)"><i class="bi bi-plus"></i></button></td>
                        <td class="font-monospace">{{ c.name }}</td>
                        <td><small>{{ c.type }}{{ c.maxLength ? `(${c.maxLength})` : '' }}</small></td>
                        <td><span v-if="c.key" class="badge bg-warning text-dark small">{{ c.key }}</span></td>
                        <td><small>{{ c.nullable ? 'Y' : 'N' }}</small></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <!-- 변수 관리 -->
            <div v-if="q.showVars" class="mt-2 p-2 rounded" style="background:#fff8f0; border:1px solid #f0d8a0">
              <div class="d-flex align-items-center flex-wrap gap-1 mb-2">
                <small class="text-secondary me-1"><i class="bi bi-braces me-1"></i>{{ t('sqlEd.variables') }}</small>
                <span v-for="p in parseParamsFromSql(q.body)" :key="p" class="badge bg-warning text-dark border">:{{ p }}<button class="btn-close ms-1" style="font-size:8px" @click="removeParamFromSql(pageOffset+li,p)"></button></span>
              </div>
              <div class="d-flex gap-2 mb-1"><input type="text" class="form-control form-control-sm" style="width:200px" v-model="q.varInput" :placeholder="t('sqlEditor.k5')" @keyup.enter="addParamToSql(pageOffset+li,q.varInput);q.varInput=''" /><button class="btn btn-sm btn-outline-warning" @click="addParamToSql(pageOffset+li,q.varInput);q.varInput=''"><i class="bi bi-plus-lg me-1"></i>{{ t('sql.addVariable') }}</button></div>
              <div v-if="getColumnSuggestions(q.body).length" class="mt-1"><small class="text-secondary">{{ t('sqlEd.candidates') }}</small><div class="d-flex flex-wrap gap-1 mt-1"><button v-for="s in getColumnSuggestions(q.body)" :key="s" class="btn btn-sm btn-outline-secondary py-0 px-2" @click="addParamToSql(pageOffset+li,s)"><small>:{{ s }}</small></button></div></div>
            </div>
          </div>
          <div v-if="totalQueryPages>1" class="mb-3"><Pagination v-model:page="queryPage" :total-pages="totalQueryPages" :window-size="10" /></div>

          <!-- SQL 전체 에디터 -->
          <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <h6 class="mb-0"><i class="bi bi-code-slash me-2"></i>{{ t('sqlEd.fullSql') }} <small v-if="fullEditedByUser" class="text-warning ms-2">{{ t('sqlEd.editedDirectly') }}</small></h6>
              <button v-if="fullEditedByUser" class="btn btn-sm btn-outline-warning" @click="applyFullToQueries"><i class="bi bi-arrow-up-circle me-1"></i>{{ t('sqlEd.applyToList') }}</button>
            </div>
            <div style="max-height:400px; overflow-y:auto; border:1px solid #e0e3e7; border-radius:4px">
              <CodeEditor :model-value="fullEditedByUser?fullContent:buildFromQueries()" @update:model-value="onFullContentInput" language="sql" />
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-outline-secondary" @click="$emit('close')" :disabled="saving">{{ t('common.cancel') }}</button>
        <button class="btn btn-sm btn-primary" @click="save" :disabled="loading||saving||(queries.length===0&&!fullContent.trim())">
          <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span><i v-else class="bi bi-save me-1"></i>{{ isEdit?t('sqlEditor.k6'):t('sqlEditor.k7') }}
        </button>
      </div>
    </div>
  </div>
</template>
