/**
 * compositeSchema — Composite 화면(대시보드 스타일) 스펙의 데이터 모델 + 팩토리.
 *
 * aidot-screen POC (aidot-screen/src/generator/screens/compositeSchema.js) 에서 이식.
 * admin-client 컨텍스트에 맞게 아래 조정:
 *   - pascal/camel 헬퍼를 POC 의 helpers.js 에 의존하지 않고 인라인으로 포함
 *   - enumerateStoreVariables 는 Phase 6 의 데이터 소스 picker 에서 서버 API 응답을
 *     소스로 재작성될 예정이므로 Phase 5-a 에선 생략
 *   - createDataSource 는 Phase 6 에서 쓰이므로 일단 유지 (source shape 문서화 용도)
 *
 * Row / Widget 멘탈 모델:
 *   - CompositeScreenSpec 은 rows: Row[] 를 가진다
 *   - Row 는 widths: number[] 를 가지며 합이 12 (Bootstrap 12-grid)
 *   - 각 widget 의 컬럼 폭 = widths[i]. 항상 widths.length === widgets.length.
 *   - 균등 분할: [12], [6,6], [4,4,4]. 비율 분할: [8,4], [3,6,3] 등.
 *
 * DataSource 종류 (Phase 6 에서 본격 사용):
 *   - endpoint     : API 엔드포인트 직접 호출 (widget 자체가 fetch)
 *   - storeState   : Vue 앱의 reactive state 값 읽기
 *   - storeCompute : storeState 파생 값 (count/sum/avg/filter 등)
 *   - customVar    : 스펙에 선언된 사용자 정의 computed
 */

/* ============ 헬퍼 ============ */

function pascal(s) {
  return String(s || '')
    .replace(/[-_]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}
function camel(s) {
  const p = pascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/* ============ widget 카탈로그 ============ */

export const WIDGET_KINDS = [
  // ═════════ 데이터 표시 ═════════
  {
    id: 'stat',
    label: 'Stat',
    description: '숫자 하나 큼직하게 (label + value)',
    category: 'data',
    icon: 'stat',
    allowedSources: ['storeCompute', 'storeState', 'customVar', 'endpoint'],
    defaultConfig: { format: 'number', color: 'primary' },
  },
  {
    id: 'list',
    label: 'List',
    description: '작은 테이블 (rows 배열 렌더)',
    category: 'data',
    icon: 'list',
    allowedSources: ['endpoint', 'storeState', 'customVar'],
    rowClickable: true,   // ★ v1.9.0 — 행이 있어 클릭 대상이 된다
    defaultConfig: { maxRows: 5, columns: null },
  },
  {
    id: 'listPaged',
    label: 'List (Paged)',
    description: '페이지네이션 있는 테이블 (맨앞/이전/숫자/다음/맨뒤)',
    category: 'data',
    icon: 'list-paged',
    allowedSources: ['endpoint'],
    rowClickable: true,   // ★ v1.9.0 — 행이 있어 클릭 대상이 된다
    defaultConfig: { perPage: 10, columns: null },
  },
  {
    id: 'detail',
    label: 'Detail',
    description: 'key-value 데이터 (object 렌더)',
    category: 'data',
    icon: 'detail',
    allowedSources: ['storeState', 'customVar', 'endpoint'],
    defaultConfig: { fields: null },
  },
  {
    id: 'text',
    label: 'Text value',
    description: '한 줄 값 표시 (label + 작은 텍스트)',
    category: 'data',
    icon: 'text',
    allowedSources: ['storeState', 'storeCompute', 'customVar'],
    defaultConfig: { format: 'auto' },
  },
  {
    id: 'markdown',
    label: 'Markdown',
    description: '정적 텍스트 / 섹션 설명',
    category: 'data',
    icon: 'markdown',
    allowedSources: [],
    defaultConfig: { body: '' },
  },
  // ═════════ 시각화 (Phase 24 신규 — runtime 은 관련 kind 로 fallback) ═════════
  {
    id: 'chart',
    label: 'Chart',
    description: '차트/그래프 (막대/라인/파이)',
    category: 'viz',
    icon: 'chart',
    allowedSources: ['endpoint', 'storeState', 'customVar'],
    defaultConfig: { chartType: 'bar' },
    fallbackKind: 'list',   // 미구현 — runtime 은 list 로 fallback
  },
  {
    id: 'progress',
    label: 'Progress',
    description: '진행률 바 (0~100%)',
    category: 'viz',
    icon: 'progress',
    allowedSources: ['storeState', 'storeCompute', 'customVar'],
    defaultConfig: { max: 100 },
    fallbackKind: 'stat',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: '시간순 이벤트 목록',
    category: 'viz',
    icon: 'timeline',
    allowedSources: ['endpoint', 'storeState', 'customVar'],
    rowClickable: true,   // ★ v1.9.0 — 행이 있어 클릭 대상이 된다
    defaultConfig: {},
    fallbackKind: 'list',
  },
  // ═════════ 입력/액션 (Phase 24 신규) ═════════
  {
    id: 'form',
    label: 'Form',
    description: '입력 폼 (필드 기반 신규/수정)',
    category: 'action',
    icon: 'form',
    allowedSources: ['endpoint'],
    defaultConfig: { fields: [] },
    fallbackKind: 'detail',
  },
  {
    id: 'queryForm',
    label: 'Query Form',
    description: '입력 필드 + "조회" 버튼 — 같은 row 의 target widget 을 트리거',
    category: 'action',
    icon: 'form-query',
    allowedSources: ['endpoint'],
    defaultConfig: {
      fields: [],                 // [{ name, label, type, required, default, placeholder }]
      submitLabel: '조회',
      targetWidgetId: null,       // 같은 row 내 widget 의 id (null 이면 row 전체)
    },
  },
  {
    id: 'formDialog',
    label: 'Form Dialog',
    description: '버튼 클릭 → 모달 폼 → 제출 → 실행 (create/update/delete)',
    category: 'action',
    icon: 'form-dialog',
    allowedSources: ['endpoint'],
    defaultConfig: {
      buttonLabel: '실행',
      buttonVariant: 'primary',   // primary | success | danger | ...
      dialogTitle: '',
      fields: [],
      confirmBeforeSubmit: false, // DELETE 면 true
      refreshTargetWidgetId: null,
    },
  },
  {
    id: 'button',
    label: 'Action Button',
    description: '누르면 다른 화면으로 이동하는 버튼 (눌렀을 때 동작에서 설정)',
    category: 'action',
    icon: 'button',
    allowedSources: ['endpoint'],
    defaultConfig: { label: '버튼', variant: 'primary' },
    fallbackKind: 'markdown',
    rowClickable: true,   // ★ v1.11.7 — 행은 없지만 "눌렀을 때 동작(화면 이동)" 을 같은 골격으로 쓴다
  },
  {
    id: 'search',
    label: 'Search Bar',
    description: '검색어 입력 + 필터',
    category: 'action',
    icon: 'search',
    allowedSources: [],
    defaultConfig: { placeholder: '검색어 입력…' },
    fallbackKind: 'text',
  },
  // ═════════ 미디어 ═════════
  {
    id: 'image',
    label: 'Image',
    description: '이미지 표시',
    category: 'media',
    icon: 'image',
    allowedSources: ['storeState', 'customVar'],
    defaultConfig: { alt: '' },
    fallbackKind: 'markdown',
  },
];

export function getWidgetKind(id) {
  return WIDGET_KINDS.find((k) => k.id === id) || null;
}

/* ============ compute ops 카탈로그 ============ */

export const COMPUTE_OPS = [
  { id: 'count',       label: '개수 (count)',        input: 'array',  output: 'number',  needsField: false, needsValue: false },
  { id: 'sum',         label: '합계 (sum)',          input: 'array',  output: 'number',  needsField: true,  needsValue: false },
  { id: 'avg',         label: '평균 (avg)',          input: 'array',  output: 'number',  needsField: true,  needsValue: false },
  { id: 'min',         label: '최소값 (min)',        input: 'array',  output: 'number',  needsField: true,  needsValue: false },
  { id: 'max',         label: '최대값 (max)',        input: 'array',  output: 'number',  needsField: true,  needsValue: false },
  { id: 'filterCount', label: '조건 개수',           input: 'array',  output: 'number',  needsField: true,  needsValue: true },
  { id: 'pluck',       label: '필드 값',             input: 'object', output: 'any',     needsField: true,  needsValue: false },
  { id: 'custom',      label: '사용자 정의 함수',    input: 'any',    output: 'any',     needsField: false, needsValue: false, needsFn: true },
];

export function getComputeOp(id) {
  return COMPUTE_OPS.find((o) => o.id === id) || null;
}

/* ============ 상단 제목 유형 (새로 추가) ============

   POC 에는 없지만 사용자 요구사항 "상단 제목 유형은 여러 개 중 하나를 선택" 에 따라 추가.
   각 유형은 generator 에서 다른 SFC 를 만들어낼 수 있는 hint 가 됨. Phase 7 에서 사용.
 */

export const HEADER_KINDS = [
  { id: 'page-title', label: '기본 타이틀',      description: '제목 + 부제목 (가장 단순)' },
  { id: 'crumbs',     label: '경로 + 타이틀',    description: '브레드크럼 + 제목' },
  { id: 'stat-hero',  label: '히어로 + 통계',    description: '큰 숫자 통계를 포함한 헤더' },
  { id: 'tabs',       label: '탭 바',            description: '상단에 탭 네비게이션' },
  { id: 'none',       label: '제목 없음',        description: '헤더 영역 생략' },
];

export function getHeaderKind(id) {
  return HEADER_KINDS.find((h) => h.id === id) || HEADER_KINDS[0];
}

/* ============ id 생성기 ============ */

let _idSeq = Date.now();
export function newId(prefix = 'id') {
  _idSeq++;
  return `${prefix}_${_idSeq.toString(36)}`;
}

/* ============ 팩토리 ============ */

/**
 * 빈 Composite 스펙 생성. rows 는 비어서 시작하며 사용자가 필요한 만큼 추가.
 */
/**
 * ★ v1.11.7 — 경로에서 파라미터를 읽는다.  `/books/:id` · `/books/{id}` → [{ name: 'id', required: true }]
 *   화면을 만들 때 경로에 `:id` 를 적으면 그 화면은 자동으로 id 를 받는 화면이 된다.
 *   (예전에는 params 를 선언하는 화면이 없어 행 클릭 → 상세 화면 연결이 값을 넘기지 못했다)
 */
export function paramsFromPath(path) {
  const out = [];
  const seen = new Set();
  const re = /(?:^|\/)(?::([A-Za-z_][A-Za-z0-9_]*)(\?)?|\{([A-Za-z_][A-Za-z0-9_]*)\})/g;
  let m;
  while ((m = re.exec(String(path || ''))) !== null) {
    const name = m[1] || m[3];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, required: !m[2] });
  }
  return out;
}
/** 화면이 받는 파라미터 — 선언한 것이 있으면 그것, 없으면 경로에서 읽은 것 */
export function effectiveParams(screen) {
  if (Array.isArray(screen?.params) && screen.params.length) return screen.params;
  return paramsFromPath(screen?.path);
}

export function createCompositeSpec({ title = '새 화면', path = '/screen' } = {}) {
  return {
    id: newId('composite'),
    kind: 'composite',
    title,
    path,
    header: {
      kind: 'page-title',
      title,
      subtitle: '',
    },
    rows: [],
    /* ★ v1.9.0 — 이 화면이 받는 파라미터.
       리스트에서 수정 화면으로 넘어갈 때 무엇을 들려 보내야 하는지의 계약이다.
       이게 선언돼 있어야 ① 리스트 쪽 속성 창이 "무엇을 넘겨야 하는지" 를 보여 주고
       ② 이 화면의 detail/form 위젯이 `param.id` 를 데이터 소스로 쓸 수 있다.
       [{ name: 'id', required: true }] */
    params: paramsFromPath(path),   // ★ v1.11.7 경로의 :id 에서 자동으로
    // customVars / customFns 는 Phase 6 에서 도입
    customVars: [],
    customFns: [],
  };
}

/**
 * ★ v1.9.0 — 행 클릭 동작.
 *
 *  로우코드 빌더들이 수렴한 세 칸 골격을 그대로 따른다.
 *      [언제] 행 클릭 → [무엇을] action → [무엇을 들고] params
 *
 *  `params` 의 값은 `row.<필드>` 형태로만 쓴다.
 *  `{{ }}` 같은 표현식을 허용하면 파서·오류 처리·자동완성이 통째로 따라오는데,
 *  실제로 필요한 건 "행의 어느 필드냐" 뿐이라 드롭다운으로 충분하다.
 */
export function createRowClick({ action = 'none', target = '', params = {} } = {}) {
  return { action, target, params: { ...params } };
}

/** 행 클릭 동작 목록 — 'modal' 자리는 비워 둔다(화면 전환과 상태 관리가 달라 따로 설계해야 한다) */
export const ROW_CLICK_ACTIONS = [
  { id: 'none', label: '아무 것도 안 함', description: '클릭해도 반응하지 않습니다' },
  { id: 'navigate', label: '화면 이동', description: '같은 프로젝트의 다른 화면으로 넘어갑니다' },
];

/** 행 클릭을 설정할 수 있는 위젯인가 (행이 있는 것만) */
export function isRowClickable(kindId) {
  return !!getWidgetKind(kindId)?.rowClickable;
}

/** `row.id` → `id` (바인딩 값에서 필드 이름만) */
export function rowFieldOf(binding) {
  const m = /^row\.([\w$]+)$/.exec(String(binding || ''));
  return m ? m[1] : null;
}

/**
 * Phase 24: 선택한 화면 종류 (ScreenCreateModal Palette 의 kind) 에 맞춰
 *  composite spec 을 prefill. 빈 화면 대신 기본적인 widget 구성이 미리 들어가 있어
 *  사용자가 즉시 작업을 시작할 수 있음.
 *
 *  kind: 'list' | 'detail' | 'form-new' | 'form-edit' | 'dashboard'
 *      | 'kanban' | 'calendar' | 'chart' | 'report' | 'empty'
 */
export function createCompositeSpecForKind(kind, { title, path } = {}) {
  const spec = createCompositeSpec({ title, path });
  spec.screenKind = kind;

  // 각 kind 별로 기본 row 들 prefill
  switch (kind) {
    case 'list':
      // 제목 + 하나의 list widget
      spec.rows.push(makeRowOne('list', { title: title || '목록' }));
      break;

    case 'detail': {
      // Phase 31 (patch-10): 단건 조회는 입력값이 필요하므로 QueryForm + Detail 2-row 템플릿.
      //  rowContext 는 composite-level 에서 provide 되므로 row 간 경계 없음 — 자연스러운 읽기 순서로
      //  Row 1 = QueryForm (위), Row 2 = Detail (아래) 배치.
      //  사용자는 Properties Panel 에서 필드명/경로 파라미터를 실제 값으로 수정.
      const resultWidget = createWidget({ kind: 'detail' });
      resultWidget.title = title ? (title + ' 결과') : '상세';
      const queryWidget = createWidget({ kind: 'queryForm' });
      queryWidget.title = title ? (title + ' 조회') : '조회';
      queryWidget.config = {
        fields: [
          // 기본 id 필드 — 사용자가 Properties Panel 에서 실제 path param 이름으로 수정.
          { name: 'id', label: 'ID', type: 'number', required: true, default: '' },
        ],
        submitLabel: '조회',
        targetWidgetId: resultWidget.id,
      };
      spec.rows.push({
        id: newId('row'),
        widths: [12],
        widgets: [queryWidget],
        style: { ...DEFAULT_ROW_STYLE },
      });
      spec.rows.push({
        id: newId('row'),
        widths: [12],
        widgets: [resultWidget],
        style: { ...DEFAULT_ROW_STYLE },
      });
      break;
    }

    case 'form-new': {
      // Phase 31 (patch-10): 단일 create 액션은 FormDialog (버튼 → 모달 → 폼 → 제출).
      //  기존의 "form + 저장/취소 버튼" 2-row 구조 대신 공간 덜 차지하는 dialog 버튼 하나.
      const fd = createWidget({ kind: 'formDialog' });
      fd.title = title || '신규 등록';
      fd.config = {
        buttonLabel: '+ 신규 등록',
        buttonVariant: 'success',
        dialogTitle: (title || '신규 등록'),
        fields: [],   // 사용자가 Properties Panel 에서 추가
        confirmBeforeSubmit: false,
        refreshTargetWidgetId: null,
      };
      spec.rows.push({
        id: newId('row'),
        widths: [12],
        widgets: [fd],
        style: { ...DEFAULT_ROW_STYLE },
      });
      break;
    }

    case 'form-edit': {
      // Phase 31 (patch-10): 수정 역시 FormDialog. 기본 variant=primary.
      const fd = createWidget({ kind: 'formDialog' });
      fd.title = title || '수정';
      fd.config = {
        buttonLabel: '수정',
        buttonVariant: 'primary',
        dialogTitle: (title || '수정'),
        fields: [],   // 사용자가 Properties Panel 에서 추가
        confirmBeforeSubmit: false,
        refreshTargetWidgetId: null,
      };
      // 삭제 전용 dialog 도 같이 — danger variant + confirm.
      const del = createWidget({ kind: 'formDialog' });
      del.title = '삭제';
      del.config = {
        buttonLabel: '삭제',
        buttonVariant: 'danger',
        dialogTitle: '삭제 확인',
        fields: [
          { name: 'id', label: 'ID', type: 'number', required: true, default: '' },
        ],
        confirmBeforeSubmit: true,
        refreshTargetWidgetId: null,
      };
      /* ★ v1.23.0 — **현재 값을 보여 주는 카드**를 맨 위에 둔다.
       *
       *  예전에는 [수정] [삭제] 버튼 두 개만 만들었다. 그래서 목록에서 눌러 넘어와도
       *  **선택한 항목이 화면에 하나도 보이지 않았다.** 무엇을 고치는 중인지 모르는 채
       *  수정 버튼을 누르는 셈이라, 사람이 "아무것도 안 보인다" 고 느끼는 것이 당연했다.
       *
       *  상세 화면(detail)은 이미 조회+표시를 갖추고 있다. 수정 화면도 같아야 한다:
       *  위에 현재 값, 아래에 [수정] [삭제].
       */
      const current = createWidget({ kind: 'detail' });
      current.title = title ? (title + ' — 현재 값') : '현재 값';
      spec.rows.push({
        id: newId('row'),
        widths: [12],
        widgets: [current],
        style: { ...DEFAULT_ROW_STYLE },
      });
      spec.rows.push({
        id: newId('row'),
        widths: [6, 6],
        widgets: [fd, del],
        style: { ...DEFAULT_ROW_STYLE },
      });
      break;
    }

    case 'dashboard':
      // 4개 stat 카드 한 줄
      spec.rows.push(makeRowCustom([3, 3, 3, 3], [
        { kind: 'stat', title: '지표 1', config: { color: 'primary' } },
        { kind: 'stat', title: '지표 2', config: { color: 'success' } },
        { kind: 'stat', title: '지표 3', config: { color: 'warning' } },
        { kind: 'stat', title: '지표 4', config: { color: 'danger' } },
      ]));
      // 메인 차트 + 보조 리스트
      spec.rows.push(makeRowCustom([8, 4], [
        { kind: 'chart', title: '추이' },
        { kind: 'list',  title: '최근' },
      ]));
      break;

    case 'kanban':
      // 3개 컬럼 (To Do / In Progress / Done)
      spec.rows.push(makeRowCustom([4, 4, 4], [
        { kind: 'list', title: 'To Do' },
        { kind: 'list', title: 'In Progress' },
        { kind: 'list', title: 'Done' },
      ]));
      break;

    case 'calendar':
      spec.rows.push(makeRowOne('markdown', {
        title: '캘린더',
        config: { body: '# 월별 일정\n\n캘린더 widget 은 Phase 24 확장 예정. 현재는 placeholder.' },
      }));
      break;

    case 'chart':
      // 상단에 stat 3개, 하단에 큰 chart
      spec.rows.push(makeRowCustom([4, 4, 4], [
        { kind: 'stat', title: '총계' },
        { kind: 'stat', title: '평균' },
        { kind: 'stat', title: '최대' },
      ]));
      spec.rows.push(makeRowOne('chart', { title: '분포' }));
      break;

    case 'report':
      spec.rows.push(makeRowOne('markdown', {
        title: '리포트 제목',
        config: { body: '리포트 개요 / 요약문…' },
      }));
      spec.rows.push(makeRowOne('list', { title: '상세 내역' }));
      break;

    case 'empty':
      // 빈 화면 — 의도적으로 rows 비워둠. 사용자가 Studio 에서 직접 구성.
      break;

    default:
      // Phase 27 (patch-06): 알 수 없는 kind 가 들어오면 경고를 남기고
      //  안전하게 빈 스펙으로 처리. 기존에는 'empty' 와 하나의 case 로 묶여있어
      //  예상치 못한 kind 가 잠수함처럼 통과됐음 — 개발 중 오타를 잡기 어려움.
      console.warn(
        `[compositeSchema] createCompositeSpecForKind: unknown kind "${kind}", ` +
        `falling back to empty composite. Expected one of: ` +
        `list | detail | form-new | form-edit | dashboard | kanban | calendar | chart | report | empty`
      );
      break;
  }

  return spec;
}

/** 단일 widget 으로 구성된 row 하나 생성 (width 12) */
function makeRowOne(widgetKind, { title = '', config = {} } = {}) {
  const row = {
    id: newId('row'),
    widths: [12],
    widgets: [createWidget({ kind: widgetKind })],
    style: { ...DEFAULT_ROW_STYLE },
  };
  if (title) row.widgets[0].title = title;
  if (config) row.widgets[0].config = { ...row.widgets[0].config, ...config };
  return row;
}

/** 버튼들 한 줄 (오른쪽 정렬, 각 버튼 col-2 정도) */
function makeRowButtons(btns) {
  const n = btns.length;
  const perWidth = Math.max(2, Math.floor(4));
  const gap = 12 - perWidth * n;
  const widths = [];
  if (gap > 0) widths.push(gap);
  for (let i = 0; i < n; i++) widths.push(perWidth);

  const widgets = [];
  if (gap > 0) widgets.push(createWidget({ kind: 'markdown' }));  // spacer
  for (const b of btns) {
    const w = createWidget({ kind: b.kind });
    w.title = b.title || '';
    if (b.config) w.config = { ...w.config, ...b.config };
    widgets.push(w);
  }
  return {
    id: newId('row'),
    widths,
    widgets,
    style: { ...DEFAULT_ROW_STYLE },
  };
}

/** widths 배열과 widget 스펙 배열로 row 생성 */
function makeRowCustom(widths, widgetSpecs) {
  if (widths.length !== widgetSpecs.length) {
    throw new Error('widths 와 widgetSpecs 길이 불일치');
  }
  const widgets = widgetSpecs.map((spec) => {
    const w = createWidget({ kind: spec.kind });
    if (spec.title) w.title = spec.title;
    if (spec.config) w.config = { ...w.config, ...spec.config };
    return w;
  });
  return {
    id: newId('row'),
    widths: [...widths],
    widgets,
    style: { ...DEFAULT_ROW_STYLE },
  };
}

/**
 * 균등 분할 또는 주어진 widths 로 Row 생성. widths 는 합이 12 여야 함.
 * 각 칼럼에 기본 widget(text) 하나씩 자동 생성.
 */
export function createRow({ widths = [12], widgets = null } = {}) {
  if (!validateWidths(widths)) {
    throw new Error(`Row widths 는 합이 12 여야 합니다; 받은 값 [${widths.join(',')}]`);
  }
  // Phase 31 (patch-10): widgets 인자가 있으면 그대로 사용. 없으면 기본 text widget 생성.
  //  widths 와 widgets 의 개수는 같아야 함. 개수가 다르면 에러.
  let widgetList;
  if (Array.isArray(widgets)) {
    if (widgets.length !== widths.length) {
      throw new Error(
        `Row 의 widgets 개수 (${widgets.length}) 와 widths 개수 (${widths.length}) 가 일치해야 합니다.`
      );
    }
    widgetList = widgets;
  } else {
    widgetList = widths.map(() => createWidget({ kind: 'text' }));
  }
  return {
    id: newId('row'),
    widths: [...widths],
    widgets: widgetList,
    style: { ...DEFAULT_ROW_STYLE },
  };
}

/**
 * Row 공통 style 기본값.
 *  - gap: widget 간 간격(px)
 *  - padding: row 외곽 여백(px)
 *  - bgColor: 배경 (투명이 기본)
 */
export const DEFAULT_ROW_STYLE = Object.freeze({
  gap: 16,
  padding: 0,
  bgColor: 'transparent',
});

export function ensureRowStyle(row) {
  if (!row) return row;
  row.style = { ...DEFAULT_ROW_STYLE, ...(row.style || {}) };
  return row;
}

/**
 * 빈 widget 생성. source 는 null (Phase 6 의 picker 에서 설정).
 *  style 은 공통 시각 속성 — Properties Panel 에서 편집 가능 (Phase 5-c).
 */
export function createWidget({ kind = 'text' } = {}) {
  const meta = getWidgetKind(kind) || getWidgetKind('text');
  return {
    id: newId('wdg'),
    kind: meta.id,
    title: '',
    source: null,
    config: { ...meta.defaultConfig },
    style: { ...DEFAULT_WIDGET_STYLE },
    // ★ v1.9.0 — 행이 있는 위젯만 뜻이 있다. 없으면 클릭해도 아무 일 없음(기존 동작).
    ...(meta.rowClickable ? { onRowClick: createRowClick() } : {}),
  };
}

/**
 * Widget 공통 style 의 기본값.
 *  - height: 'auto' | number(px)
 *  - padding: card 내부 여백(px)
 *  - border: 카드 테두리 표시 여부
 *  - shadow: 'none' | 'sm' | 'md'
 *  - bgColor: 배경색
 */
export const DEFAULT_WIDGET_STYLE = Object.freeze({
  height: 'auto',
  padding: 16,
  border: true,
  shadow: 'none',
  bgColor: '#ffffff',
});

/** shadow 프리셋 카탈로그 — Properties Panel 용 */
export const SHADOW_OPTIONS = [
  { id: 'none', label: '없음' },
  { id: 'sm',   label: '약함' },
  { id: 'md',   label: '중간' },
];

/**
 * 주어진 widget 에 누락된 style 필드들을 기본값으로 보강.
 *  오래된 프로젝트 (Phase 5-b 이전) 에서 불러온 widget 은 style 필드가 없으므로
 *  편집 시점에 보강이 필요.
 */
export function ensureWidgetStyle(widget) {
  if (!widget) return widget;
  widget.style = { ...DEFAULT_WIDGET_STYLE, ...(widget.style || {}) };
  return widget;
}

/**
 * DataSource 팩토리. Phase 6 에서 widget editor 가 호출.
 */
export function createDataSource(type, params = {}) {
  switch (type) {
    case 'endpoint':
      return {
        type: 'endpoint',
        method: params.method || 'GET',
        path: params.path || null,
        resultKey: params.resultKey || null,       // e.g. 'rows', 'data'
        controllerId: params.controllerId ?? null, // 서버 admin_controllers.id (추적용)
      };
    case 'storeState':
      return { type: 'storeState', resourceKey: params.resourceKey || null, stateName: params.stateName || null };
    case 'storeCompute':
      return {
        type: 'storeCompute',
        resourceKey: params.resourceKey || null,
        stateName: params.stateName || null,
        op: params.op || 'count',
        field: params.field || null,
        value: params.value ?? null,
        fnName: params.fnName || null,
      };
    case 'customVar':
      return { type: 'customVar', varName: params.varName || null };
    default:
      throw new Error(`Unknown data source type: ${type}`);
  }
}

/* ============ widths 프리셋 ============ */

export const ROW_PRESETS = [
  { label: '1분할',       widths: [12] },
  { label: '2분할 균등',  widths: [6, 6] },
  { label: '3분할 균등',  widths: [4, 4, 4] },
  { label: '2:1',         widths: [8, 4] },
  { label: '1:2',         widths: [4, 8] },
  { label: '1:2:1',       widths: [3, 6, 3] },
  { label: '4분할 균등',  widths: [3, 3, 3, 3] },
];

export function validateWidths(widths) {
  if (!Array.isArray(widths) || widths.length === 0) return false;
  if (widths.length > 6) return false;
  for (const w of widths) {
    if (!Number.isInteger(w) || w < 1 || w > 12) return false;
  }
  return widths.reduce((a, b) => a + b, 0) === 12;
}

/* ============ widths 조정 헬퍼 ============ */

/**
 * widget 추가 시 widths 재배분. 가장 넓은 widget 에서 1칼럼씩 뺏어 새 widget 에 할당.
 * 결코 어떤 widget 도 1 미만으로 내려가지 않음. 입력을 변경하지 않고 새 배열 반환.
 */
export function appendWidth(widths, preferred = null) {
  const existing = [...widths];
  if (existing.length >= 6) return existing;
  let target = preferred ?? Math.max(1, Math.floor(12 / (existing.length + 1)));
  const stealable = existing.reduce((a, w) => a + Math.max(0, w - 1), 0);
  target = Math.min(target, stealable, 12 - existing.length);
  if (target < 1) return existing;
  let remaining = target;
  const indexed = existing.map((w, i) => ({ w, i })).sort((a, b) => b.w - a.w);
  let cursor = 0;
  while (remaining > 0) {
    const p = indexed[cursor % indexed.length];
    if (existing[p.i] > 1) {
      existing[p.i]--;
      remaining--;
    }
    cursor++;
    if (cursor > 1000) break;
  }
  existing.push(target);
  return existing;
}

/**
 * idx 위치의 widget 제거 후 남은 widget 들에 width 재분배.
 */
export function removeWidth(widths, idx) {
  if (widths.length <= 1) return widths;
  const freed = widths[idx];
  const out = widths.filter((_, i) => i !== idx);
  let remaining = freed;
  let cursor = Math.min(idx, out.length - 1);
  while (remaining > 0) {
    out[cursor % out.length]++;
    remaining--;
    cursor++;
  }
  return out;
}

/**
 * a, b 위치의 widths 교환 (widget 이동 시 사용).
 */
export function swapWidths(widths, a, b) {
  const out = [...widths];
  const t = out[a]; out[a] = out[b]; out[b] = t;
  return out;
}

/* ============ 내보내기 — 이름 case 유틸 (다른 파일에서도 쓸 수 있도록) ============ */

export { pascal, camel };

/* ══════════════════════════════════════════════════════════════════════════
   ★ v1.9.0 — 화면 전환 검증
   로우코드 도구의 품질은 **잘못 만들 수 없게 막는 정도**로 갈린다.
   속성 창과 저장 시점이 같은 규칙을 써야 하므로 여기 한 곳에 둔다.
   ══════════════════════════════════════════════════════════════════════════ */

/** 위젯 소스에서 고를 수 있는 행 필드 후보 */
export function rowFieldCandidates(widget) {
  const cfg = widget?.config || {};
  const cols = cfg.columns || cfg.fields || cfg.keys;
  const names = Array.isArray(cols)
    ? cols.map((c) => (typeof c === 'string' ? c : c?.key || c?.name)).filter(Boolean)
    : [];
  // id 는 거의 항상 쓰이는데 columns 에는 빠져 있는 경우가 많다 — 후보에 넣어 준다
  return [...new Set(['id', ...names])];
}

/**
 * 한 위젯의 행 클릭 설정을 검사한다.
 * @param {object} widget
 * @param {object[]} screens  같은 프로젝트의 화면 목록 [{ id, title, params }]
 * @param {string}  selfScreenId  이 위젯이 놓인 화면 id
 * @returns {{level:'error'|'warn', message:string}[]}
 */
/**
 * ★ v1.22.5 — **이 화면이 왜 비어 보이는지** 를 짚어 준다.
 *
 *  "목록에서 눌러 넘어가면 화면은 뜨는데 아무것도 안 보인다" 는 일이 반복됐다.
 *  원인은 늘 셋 중 하나였는데, 화면은 아무 말도 하지 않아 사람이 찾아내야 했다.
 *    ① 위젯에 **데이터 소스가 없다** → 부를 API 가 없으니 값도 입력란도 없다
 *    ② 단건 화면인데 **경로에 :id 가 없다** → 목록에서 값을 넘길 통로가 없다
 *    ③ 입력 폼인데 **필드가 비어 있다**(또는 id 하나뿐) → 입력란이 안 그려진다
 *  이제 화면이 스스로 알려 준다.
 *
 * @param {object} spec  화면 spec
 * @returns {{level:'error'|'warn', message:string, widgetId?:string}[]}
 */
export function diagnoseScreen(spec) {
  const out = [];
  if (!spec) return out;
  const rows = spec.rows || [];
  const widgets = rows.flatMap((r) => r.widgets || []);
  if (!widgets.length) return out;

  const wantsParam = /:[A-Za-z_]\w*/.test(String(spec.path || ''));
  const singleKinds = new Set(['detail', 'form', 'formDialog', 'queryForm']);
  const usesSingle = widgets.some((w) => singleKinds.has(w.kind));

  /* ② 단건을 다루는 화면인데 경로에 파라미터가 없다 */
  if (usesSingle && !wantsParam) {
    out.push({ level: 'warn',
      message: '이 화면은 항목 하나를 다루는데 경로에 :id 같은 파라미터가 없습니다. '
             + '목록에서 값을 넘길 통로가 없어 빈 화면이 됩니다.' });
  }

  for (const w of widgets) {
    /* ① 데이터 소스가 없다 */
    if (!w.source) {
      out.push({ level: 'warn', widgetId: w.id,
        message: `'${w.title || w.kind}' 에 데이터 소스가 없습니다. `
               + '카드의 [데이터 소스] 딱지를 눌러 API 를 고르세요.' });
      continue;
    }
    /* ③ 입력 폼인데 필드가 비어 있다 (틀에서 넣어 준 id 하나는 빈 것으로 본다) */
    if (['queryForm', 'formDialog', 'form'].includes(w.kind)) {
      const f = Array.isArray(w.config?.fields) ? w.config.fields : [];
      const real = f.filter((x) => x?.name && x.name !== 'id');
      if (!real.length) {
        out.push({ level: 'warn', widgetId: w.id,
          /* ⚠ 기준은 **HTTP 메서드가 아니라 그 API 가 받는 입력**이다.
             GET 이어도 SQL 에 :param 이 있으면 입력란이 만들어진다
             (`GET /api/snack-insert` 처럼 조회 메서드로 등록·수정하는 서버도 흔하다).
             그러니 "POST 를 쓰라" 고 하지 않고, 무엇을 확인하면 되는지만 알려 준다. */
          /* ⚠ 안내는 **실제로 할 수 있는 것**만 가리켜야 한다.
             예전 문구는 "아래에서 직접 추가하세요" 였는데, 직접 추가하는 UI 가 없다.
             입력란은 데이터 소스 분석으로만 채워지므로, 다시 고르라고 안내한다. */
          message: `'${w.title || w.kind}' 에 입력란이 없습니다. `
                 + '[데이터 소스] 딱지를 눌러 API 를 다시 고르면 입력란을 다시 분석합니다. '
                 + '그래도 비어 있으면 그 API 가 받는 입력이 없거나, 서비스에서 SQL 을 따라가지 못한 경우입니다.' });
      }
    }
  }
  return out;
}

export function validateRowClick(widget, screens = [], selfScreenId = null) {
  const rc = widget?.onRowClick;
  const out = [];
  if (!rc || rc.action === 'none') return out;

  // 위젯 종류를 바꿨는데 설정이 남은 경우 — 생성기가 쓰지 않으므로 쓰레기다
  if (!isRowClickable(widget.kind)) {
    out.push({ level: 'warn',
      message: `'${widget.kind}' 위젯에는 행이 없어 클릭 설정이 동작하지 않습니다. 지워도 됩니다.` });
    return out;
  }

  if (rc.action === 'navigate') {
    if (!rc.target) {
      out.push({ level: 'error', message: '이동할 화면을 고르세요.' });
      return out;
    }
    if (selfScreenId && rc.target === selfScreenId) {
      out.push({ level: 'error', message: '자기 자신으로 이동하면 무한 루프가 됩니다.' });
      return out;
    }
    const target = screens.find((sc) => sc.id === rc.target);
    if (!target) {
      out.push({ level: 'error',
        message: `이동할 화면을 찾을 수 없습니다 (${rc.target}). 화면이 지워졌을 수 있습니다.` });
      return out;
    }
    // 필수 파라미터가 채워졌는가 — 이게 없으면 수정 화면이 빈 화면으로 뜬다 (★ v1.11.7 경로의 :id 도 본다)
    for (const prm of effectiveParams(target)) {
      if (!prm.required) continue;
      const bound = rc.params?.[prm.name];
      if (!bound) {
        out.push({ level: 'error',
          message: `'${target.title || target.id}' 화면이 요구하는 '${prm.name}' 이(가) 비어 있습니다.` });
      }
    }
    // 바인딩한 필드가 실제로 있는가 — 오타 하나로 undefined 가 URL 에 들어간다
    const cands = rowFieldCandidates(widget);
    for (const [name, binding] of Object.entries(rc.params || {})) {
      if (!binding) continue;
      const field = rowFieldOf(binding);
      if (!field) {
        out.push({ level: 'error', message: `'${name}' 의 값 '${binding}' 은 row.필드 형식이어야 합니다.` });
      } else if (cands.length && !cands.includes(field)) {
        out.push({ level: 'warn',
          message: `'${name}' ← row.${field} — 이 위젯의 열 목록에 '${field}' 가 없습니다. 오타가 아닌지 확인하세요.` });
      }
    }
  }
  return out;
}

/** 화면 하나 전체를 검사 */
export function validateScreenNavigation(screen, screens = []) {
  const out = [];
  for (const row of (screen?.rows || [])) {
    for (const w of (row.widgets || [])) {
      for (const issue of validateRowClick(w, screens, screen.id)) {
        out.push({ ...issue, widgetId: w.id, widgetTitle: w.title || w.kind });
      }
    }
  }
  return out;
}

/** 이 화면을 가리키는 곳 — 화면을 지우기 전에 경고하기 위해 */
export function findReferrers(screenId, screens = []) {
  const refs = [];
  for (const sc of screens) {
    for (const row of (sc.rows || [])) {
      for (const w of (row.widgets || [])) {
        if (w?.onRowClick?.action === 'navigate' && w.onRowClick.target === screenId) {
          refs.push({ screenId: sc.id, screenTitle: sc.title, widgetId: w.id, widgetTitle: w.title || w.kind });
        }
      }
    }
  }
  return refs;
}
