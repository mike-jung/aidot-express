<script setup>
/**
 * ScreenCreateModal — 새 화면(screen) 생성용 모달.
 *
 *  Phase 5-a 시점에선 kind 는 composite 만 지원 (CRUD 화면들은 Phase 7 에서 generator 로 추가).
 *  앞으로 'list' / 'detail' / 'form' / 'composite' 로 확장될 예정이나 UI 는 단순 유지.
 *
 *  이름과 경로를 입력받고 생성 확인 → 부모의 'created' 이벤트로 새 screen 객체 전달.
 *  실제 저장(프로젝트.screens 배열에 추가 + savePatch) 은 부모 ScreensTab 이 책임.
 */
import { ref, nextTick, onMounted, computed } from 'vue';
// ★ v1.10.7 — 다국어
import { useI18n } from '../../composables/useI18n';

import { createCompositeSpecForKind } from '../../generator/screens/compositeSchema';

/* ★ v1.20.0 — import 뒤에 선언한다.
   import 는 끌어올려지지만 이 줄은 아니어서, 사이에 끼면 나중 코드가 먼저 실행돼
   "t is not defined" 로 화면이 통째로 죽는다(화면 디자이너 목록에서 실제로 겪었다). */
const { t } = useI18n();

const emit = defineEmits(['close', 'created']);

// Phase 23: 화면 종류 Palette — 10종.
//  currently all 'composite' 로 생성되지만, template 의 초기 row/widget 구성이 종류마다 다르게 prefill.
const PALETTE = [
  { kind: 'list',      label: t('screenCreate.k1'),         description: t('screenCreate.k2'),  category: 'data',    icon: 'list' },
  { kind: 'detail',    label: t('screenCreate.k3'),         description: t('screenCreate.k4'),      category: 'data',    icon: 'detail' },
  { kind: 'form-new',  label: t('screenCreate.k5'),    description: t('screenCreate.k6'),                     category: 'form',    icon: 'form-new' },
  { kind: 'form-edit', label: t('screenCreate.k7'),         description: t('screenCreate.k8'),            category: 'form',    icon: 'form-edit' },
  { kind: 'dashboard', label: t('screenCreate.k9'),     description: t('screenCreate.k10'),                  category: 'summary', icon: 'dashboard' },
  { kind: 'kanban',    label: t('screenCreate.k11'),    description: t('screenCreate.k12'),                 category: 'summary', icon: 'kanban' },
  { kind: 'calendar',  label: t('screenCreate.k13'),       description: t('screenCreate.k14'),                     category: 'summary', icon: 'calendar' },
  { kind: 'chart',     label: t('screenCreate.k15'),         description: t('screenCreate.k16'),                          category: 'summary', icon: 'chart' },
  { kind: 'report',    label: t('screenCreate.k17'),       description: t('screenCreate.k18'),                category: 'summary', icon: 'report' },
  { kind: 'empty',     label: t('screenCreate.k19'),      description: t('screenCreate.k20'),                        category: 'blank',   icon: 'empty' },
];

// 단계: 1 = 종류 선택, 2 = 제목/경로 입력
const step = ref(1);
const selectedKind = ref('list');
const selectedPreset = computed(() => PALETTE.find((p) => p.kind === selectedKind.value) || PALETTE[0]);

const title = ref('');
const path = ref('');
const pathManuallyEdited = ref(false);
const error = ref(null);
const nameInput = ref(null);

// title → path 자동 슬러그 (사용자가 path 를 수동 편집하지 않았을 때만).
// Phase 10: 한영 사전 매핑 + 로마자 fallback.
//
//  우선순위:
//   1) 공백 구분된 "단어" 단위로 먼저 사전 매핑 ("학생 리스트" → student list)
//   2) 사전에 없는 한국어는 로마자로 변환
//   3) 영문은 소문자화
//
//  사용자 기대 예:
//   "학생 리스트" → student-list  (학생→student, 리스트→list)
//   "사용자 대시보드" → user-dashboard
//   "상품 상세" → product-detail
//   "완전 새로운 말" → wan-jeon sae-ro-un mal → wan-jeon-sae-ro-un-mal (사전 miss)

/** 자주 쓰는 UI 용어 한영 사전 */
const HANGUL_DICT = {
  // 엔티티/리소스
  '학생': 'student',   '사용자': 'user',     '회원': 'member',     '관리자': 'admin',
  '상품': 'product',   '주문': 'order',      '결제': 'payment',    '배송': 'shipping',
  '게시판': 'board',   '게시글': 'post',     '댓글': 'comment',    '공지': 'notice',
  '공지사항': 'notice','문의': 'inquiry',    '알림': 'notification','고객': 'customer',
  '직원': 'employee',  '부서': 'department', '팀': 'team',         '회사': 'company',
  '교사': 'teacher',   '강사': 'instructor', '과목': 'subject',    '수업': 'lesson',
  '카테고리': 'category', '태그': 'tag',     '파일': 'file',       '이미지': 'image',
  '정산': 'settlement','재고': 'inventory',  '매출': 'sales',      '통화': 'currency',
  '보고서': 'report',  '리포트': 'report',
  // ★ v1.11.7 — 따라하기(초등) 에서 쓰는 낱말. 사전에 없으면 로마자(책→chaeg)가 되어 어색했다
  '책': 'book',        '도서': 'book',       '간식': 'snack',      '학교': 'school',
  '선생님': 'teacher', '친구': 'friend',     '반': 'class',        '숙제': 'homework',
  '점수': 'score',     '시험': 'exam',       '급식': 'meal',       '동아리': 'club',
  '환자': 'patient',   '진료': 'care',       '진료과': 'department', '처방': 'prescription',
  '병동': 'ward',      '의사': 'doctor',     '간호사': 'nurse',    '예약': 'reservation',
  // 동작
  '목록': 'list',      '리스트': 'list',     '상세': 'detail',
  '조회': 'view',      '보기': 'view',       '확인': 'view',
  '추가': 'add',       '등록': 'register',   '생성': 'create',     '신규': 'new',
  '수정': 'edit',      '편집': 'edit',       '변경': 'change',     '삭제': 'delete',
  '제거': 'remove',    '검색': 'search',     '필터': 'filter',     '정렬': 'sort',
  '가져오기': 'import','내보내기': 'export', '업로드': 'upload',   '다운로드': 'download',
  '로그인': 'login',   '로그아웃': 'logout', '가입': 'signup',     '회원가입': 'signup',
  '인증': 'auth',      '권한': 'permission',
  // 화면/UI
  '대시보드': 'dashboard', '홈': 'home',    '메뉴': 'menu',        '네비': 'nav',
  '설정': 'settings',  '환경설정': 'settings',
  '프로필': 'profile', '계정': 'account',    '비밀번호': 'password',
  '통계': 'stats',     '차트': 'chart',      '그래프': 'graph',    '분석': 'analytics',
  '리뷰': 'review',    '평가': 'rating',     '캘린더': 'calendar', '일정': 'schedule',
  '관리': 'manage',    '페이지': 'page',     '화면': 'screen',     '탭': 'tab',
  // 연결어 / 지시 (path 에는 대부분 제외하지만 dict 에 없으면 로마자로 갈 것)
  '및': 'and',         '또는': 'or',         '모든': 'all',        '전체': 'all',
  '나의': 'my',        '내': 'my',
};

const INITIALS = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const VOWELS   = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','yi','i'];
const FINALS   = ['','g','kk','gs','n','nj','nh','d','l','lg','lm','lb','ls','lt','lp','lh','m','b','bs','s','ss','ng','j','ch','k','t','p','h'];

function hangulCharToRoman(ch) {
  const code = ch.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return null;
  const offset = code - 0xAC00;
  const initialIdx = Math.floor(offset / (21 * 28));
  const vowelIdx = Math.floor((offset % (21 * 28)) / 28);
  const finalIdx = offset % 28;
  return INITIALS[initialIdx] + VOWELS[vowelIdx] + FINALS[finalIdx];
}

function isHangul(ch) {
  const c = ch.charCodeAt(0);
  return c >= 0xAC00 && c <= 0xD7A3;
}

/**
 * 한국어 '단어' 하나를 변환.
 *  - 사전에 있으면 사전 매핑
 *  - 없으면 각 음절 로마자로 변환하여 하이픈 연결
 */
function translateWord(word) {
  if (!word) return '';
  // 사전 정확 매치 우선
  if (HANGUL_DICT[word]) return HANGUL_DICT[word];
  // 한글 포함 여부
  const hasHangul = [...word].some(isHangul);
  if (!hasHangul) return word;   // 영문 단어는 그대로
  // 전부 한글이면 음절별 로마자로 하이픈 연결
  return [...word].map((ch) => isHangul(ch) ? hangulCharToRoman(ch) : ch).join('-');
}

/**
 * title → 안전한 path slug.
 *  공백 단위로 분리하여 각 단어를 translateWord 로 변환 후 '-' 로 연결.
 */
function slugify(s) {
  const input = String(s || '').trim();
  if (!input) return '';
  const words = input.split(/\s+/);
  const translated = words.map(translateWord).join('-');
  return translated
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* ★ v1.22.2 — 단건을 다루는 화면(상세·수정)은 **경로에 :id 가 있어야 한다.**
 *
 *  왜 중요한가: 목록에서 이 화면으로 넘어갈 때 값을 전달하는 통로가 경로 파라미터다.
 *  경로에 `:id` 가 없으면
 *    · 목록 위젯의 [눌렀을 때 → 화면 이동] 에서 이어 줄 파라미터가 **하나도 안 나오고**
 *    · 넘어간 화면은 props 로 아무것도 못 받아 **빈 화면**이 된다.
 *  실제로 이것 때문에 "수정 화면에 아무것도 안 보인다" 는 일이 있었다.
 *
 *  그래서 만들 때부터 붙여 준다. 물론 직접 고칠 수 있다. */
const NEEDS_ID = new Set(['detail', 'form-edit']);   // 유형 키는 PALETTE 와 같아야 한다

const needsId = computed(() => NEEDS_ID.has(selectedKind.value));
const hasIdParam = computed(() => /:[A-Za-z_]\w*/.test(path.value || ''));

function suggestPath(titleText, kind) {
  const s = slugify(titleText);
  if (!s) return '';
  return NEEDS_ID.has(kind) ? `/${s}/:id` : `/${s}`;
}

function onTitleInput() {
  if (!pathManuallyEdited.value) path.value = suggestPath(title.value, selectedKind.value);
}

function onPathInput() {
  pathManuallyEdited.value = true;
}

function onPickKind(kind) {
  selectedKind.value = kind;
  /* 유형을 바꾸면 경로 제안도 따라간다 (직접 고친 뒤에는 건드리지 않는다) */
  if (!pathManuallyEdited.value) path.value = suggestPath(title.value, kind);
  step.value = 2;
  nextTick(() => nameInput.value?.focus());
}

function onBack() {
  step.value = 1;
  error.value = null;
}

function onSubmit() {
  const t = title.value.trim();
  if (!t) {
    error.value = '화면 제목을 입력하세요';
    return;
  }
  let p = path.value.trim() || '/untitled';
  if (!p.startsWith('/')) p = '/' + p;

  // Phase 24: 선택한 kind 에 따라 prefill 된 spec 생성 (list → ListWidget 1개, dashboard → stat 4개 등)
  const spec = createCompositeSpecForKind(selectedKind.value, { title: t, path: p });
  emit('created', spec);
  emit('close');
}

onMounted(async () => {
  await nextTick();
  nameInput.value?.focus();
});

function onKeydown(e) {
  if (e.key === 'Escape') emit('close');
}
</script>

<template>
  <div class="modal-backdrop-custom" @click.self="emit('close')" @keydown="onKeydown" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered"
         :style="{ maxWidth: step === 1 ? '900px' : '560px' }">
      <div class="modal-content">
        <!-- 헤더 -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-plus-square me-2"></i>
            {{ t('screenCreate.title') }} <span v-if="step === 2" class="text-muted fs-6">— {{ selectedPreset.label }}</span>
          </h5>
          <button type="button" class="btn-close" @click="emit('close')"></button>
        </div>

        <!-- 단계 1: Palette -->
        <div v-if="step === 1" class="modal-body">
          <p class="text-muted small mb-3">
            {{ t('screenCreate.pickKind') }}
          </p>
          <div class="row g-3">
            <div v-for="p in PALETTE" :key="p.kind" class="col-md-4 col-sm-6">
              <button class="kind-card"
                      :class="{ selected: selectedKind === p.kind }"
                      @click="onPickKind(p.kind)"
                      @mouseenter="selectedKind = p.kind">
                <div class="kind-icon">
                  <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
                    <!-- 배경 -->
                    <rect width="80" height="60" fill="#f8fafc" rx="3" />
                    <!-- LIST: 3개 가로줄 -->
                    <template v-if="p.icon === 'list'">
                      <rect x="6" y="8" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="6" y="20" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="6" y="32" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="6" y="44" width="68" height="10" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="10" y="12" width="16" height="2" fill="#94a3b8" />
                      <rect x="10" y="24" width="24" height="2" fill="#94a3b8" />
                      <rect x="10" y="36" width="20" height="2" fill="#94a3b8" />
                    </template>
                    <!-- DETAIL: key-value 쌍 -->
                    <template v-else-if="p.icon === 'detail'">
                      <rect x="6" y="6" width="68" height="48" rx="3" fill="#fff" stroke="#cbd5e1" />
                      <rect x="12" y="14" width="16" height="2" fill="#94a3b8" />
                      <rect x="32" y="14" width="36" height="3" fill="#0f172a" />
                      <rect x="12" y="22" width="12" height="2" fill="#94a3b8" />
                      <rect x="32" y="22" width="30" height="3" fill="#0f172a" />
                      <rect x="12" y="30" width="14" height="2" fill="#94a3b8" />
                      <rect x="32" y="30" width="26" height="3" fill="#0f172a" />
                      <rect x="12" y="38" width="18" height="2" fill="#94a3b8" />
                      <rect x="32" y="38" width="32" height="3" fill="#0f172a" />
                    </template>
                    <!-- FORM NEW: 입력 필드 + 초록 버튼 -->
                    <template v-else-if="p.icon === 'form-new'">
                      <rect x="10" y="8" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="10" y="20" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="10" y="32" width="60" height="8" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="46" y="46" width="24" height="9" rx="2" fill="#198754" />
                      <rect x="52" y="49" width="12" height="3" fill="#fff" />
                    </template>
                    <!-- FORM EDIT: 필드(값 채움) + 파랑 버튼 -->
                    <template v-else-if="p.icon === 'form-edit'">
                      <rect x="10" y="8" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" />
                      <rect x="14" y="11" width="20" height="2" fill="#0f172a" />
                      <rect x="10" y="20" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" />
                      <rect x="14" y="23" width="30" height="2" fill="#0f172a" />
                      <rect x="10" y="32" width="60" height="8" rx="2" fill="#eff6ff" stroke="#bfdbfe" />
                      <rect x="14" y="35" width="24" height="2" fill="#0f172a" />
                      <rect x="46" y="46" width="24" height="9" rx="2" fill="#0d6efd" />
                      <rect x="53" y="49" width="10" height="3" fill="#fff" />
                    </template>
                    <!-- DASHBOARD: 4개 stat card -->
                    <template v-else-if="p.icon === 'dashboard'">
                      <rect x="4" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="23" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="42" y="6" width="17" height="20" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="61" y="6" width="15" height="20" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="8" y="14" width="8" height="6" fill="#0d6efd" />
                      <rect x="27" y="14" width="8" height="6" fill="#198754" />
                      <rect x="46" y="14" width="8" height="6" fill="#ffc107" />
                      <rect x="65" y="14" width="7" height="6" fill="#dc3545" />
                      <rect x="4" y="30" width="72" height="24" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <polyline points="10,50 20,42 30,46 40,36 50,40 60,32 70,38" stroke="#0d6efd" stroke-width="1.5" fill="none" />
                    </template>
                    <!-- KANBAN: 3 columns with cards -->
                    <template v-else-if="p.icon === 'kanban'">
                      <rect x="4"  y="6" width="22" height="48" rx="2" fill="#f1f5f9" />
                      <rect x="29" y="6" width="22" height="48" rx="2" fill="#f1f5f9" />
                      <rect x="54" y="6" width="22" height="48" rx="2" fill="#f1f5f9" />
                      <rect x="7"  y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" />
                      <rect x="7"  y="22" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" />
                      <rect x="32" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" />
                      <rect x="32" y="22" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" />
                      <rect x="32" y="32" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" />
                      <rect x="57" y="12" width="16" height="6" rx="1" fill="#fff" stroke="#cbd5e1" />
                    </template>
                    <!-- CALENDAR: grid of days -->
                    <template v-else-if="p.icon === 'calendar'">
                      <rect x="4" y="6" width="72" height="48" rx="3" fill="#fff" stroke="#cbd5e1" />
                      <rect x="4" y="6" width="72" height="10" fill="#f1f5f9" />
                      <line v-for="i in 6" :key="'vl' + i" :x1="4 + i * 12" y1="6" :x2="4 + i * 12" y2="54" stroke="#e2e8f0" stroke-width="0.5" />
                      <line v-for="i in 3" :key="'hl' + i" x1="4" :y1="16 + i * 10" x2="76" :y2="16 + i * 10" stroke="#e2e8f0" stroke-width="0.5" />
                      <circle cx="28" cy="30" r="2" fill="#0d6efd" />
                      <circle cx="52" cy="40" r="2" fill="#198754" />
                      <circle cx="16" cy="50" r="2" fill="#ffc107" />
                    </template>
                    <!-- CHART: bar chart -->
                    <template v-else-if="p.icon === 'chart'">
                      <rect x="4" y="6" width="72" height="48" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <line x1="10" y1="46" x2="70" y2="46" stroke="#94a3b8" />
                      <line x1="10" y1="12" x2="10" y2="46" stroke="#94a3b8" />
                      <rect x="14" y="30" width="8" height="16" fill="#0d6efd" />
                      <rect x="26" y="20" width="8" height="26" fill="#198754" />
                      <rect x="38" y="26" width="8" height="20" fill="#ffc107" />
                      <rect x="50" y="14" width="8" height="32" fill="#dc3545" />
                      <rect x="62" y="22" width="8" height="24" fill="#6610f2" />
                    </template>
                    <!-- REPORT: title + table -->
                    <template v-else-if="p.icon === 'report'">
                      <rect x="4" y="6" width="72" height="48" rx="2" fill="#fff" stroke="#cbd5e1" />
                      <rect x="10" y="10" width="40" height="4" fill="#0f172a" />
                      <rect x="10" y="17" width="24" height="2" fill="#94a3b8" />
                      <line x1="10" y1="23" x2="70" y2="23" stroke="#e2e8f0" />
                      <rect x="10" y="26" width="60" height="4" fill="#f1f5f9" />
                      <rect x="10" y="32" width="60" height="3" rx="0.5" fill="#e2e8f0" />
                      <rect x="10" y="37" width="60" height="3" rx="0.5" fill="#f1f5f9" />
                      <rect x="10" y="42" width="60" height="3" rx="0.5" fill="#e2e8f0" />
                      <rect x="10" y="47" width="60" height="3" rx="0.5" fill="#f1f5f9" />
                    </template>
                    <!-- EMPTY: dashed rectangle -->
                    <template v-else-if="p.icon === 'empty'">
                      <rect x="8" y="10" width="64" height="40" rx="3" fill="none"
                            stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 2" />
                      <circle cx="40" cy="30" r="4" fill="#cbd5e1" />
                      <rect x="36" y="28" width="8" height="4" fill="#cbd5e1" />
                    </template>
                  </svg>
                </div>
                <div class="kind-body">
                  <div class="kind-label">{{ p.label }}</div>
                  <div class="kind-desc">{{ p.description }}</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- 단계 2: 제목/경로 입력 -->
        <div v-else class="modal-body">
          <div class="mb-3">
            <label class="form-label">
              {{ t('screenCreate.screenTitle') }} <span class="text-danger">*</span>
            </label>
            <input ref="nameInput" v-model="title"
                   @input="onTitleInput"
                   type="text" class="form-control"
                   :placeholder="t('screenCreate.titlePlaceholder')"
                   maxlength="100"
                   @keyup.enter="onSubmit" />
            <div class="form-text">{{ t('screenCreate.titleHint') }}</div>
          </div>
          <div class="mb-3">
            <label class="form-label">{{ t('screenCreate.pathLabel') }}</label>
            <input v-model="path" @input="onPathInput"
                   type="text" class="form-control"
                   placeholder="/dashboard"
                   maxlength="100" />
            <div class="form-text">
              {{ t('screenCreate.pathHint') }}
            </div>
            <!-- ★ v1.22.2 — 단건 화면에는 :id 가 왜 필요한지 그 자리에서 알려 준다.
                 (경로에 :id 가 없으면 목록에서 값을 넘길 통로가 없다) -->
            <div v-if="needsId" class="form-text text-primary d-flex align-items-start gap-1 mt-1">
              <i class="bi bi-info-circle mt-1"></i>
              <span v-html="t('screenCreate.idParamHint')"></span>
            </div>
            <div v-if="needsId && !hasIdParam" class="alert alert-warning py-2 px-2 small mt-2 mb-0">
              <i class="bi bi-exclamation-triangle me-1"></i>
              <span v-html="t('screenCreate.noIdWarn')"></span>
            </div>
          </div>
          <div class="alert alert-info small mb-0 py-2">
            <i class="bi bi-info-circle me-1"></i>
            {{ t('screenCreate.createdAs', { label: selectedPreset.label }) }}
            화면 스튜디오에서 widget 을 추가/수정할 수 있습니다.
          </div>
          <div v-if="error" class="text-danger small mt-2">
            <i class="bi bi-exclamation-triangle me-1"></i>{{ error }}
          </div>
        </div>

        <!-- 풋터 -->
        <div class="modal-footer">
          <button v-if="step === 2" class="btn btn-link me-auto" @click="onBack">
            <i class="bi bi-arrow-left me-1"></i>{{ t('screenCreate.pickAgain') }}
          </button>
          <button class="btn btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
          <button v-if="step === 2" class="btn btn-primary" @click="onSubmit">
            <i class="bi bi-check2 me-1"></i>{{ t('screenCreate.create') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop-custom {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1050;
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
.modal-content {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
.modal-header, .modal-footer { padding: 1rem 1.25rem; }
.modal-body { padding: 1rem 1.25rem; max-height: calc(100vh - 200px); overflow-y: auto; }
.modal-header {
  border-bottom: 1px solid #e5e7eb;
  display: flex; justify-content: space-between; align-items: center;
}
.modal-footer {
  border-top: 1px solid #e5e7eb;
  display: flex; justify-content: flex-end; gap: 0.5rem;
}

/* Phase 23: Palette 카드 */
.kind-card {
  display: block;
  width: 100%;
  text-align: left;
  border: 1.5px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #fff;
  padding: 0;
  cursor: pointer;
  transition: border-color 0.1s, box-shadow 0.1s, transform 0.1s;
  overflow: hidden;
}
.kind-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}
.kind-card.selected {
  border-color: #0d6efd;
  box-shadow: 0 0 0 3px rgba(13,110,253,0.15);
}
.kind-icon {
  padding: 0.5rem;
  background: #f1f5f9;
  border-bottom: 1px solid #e5e7eb;
}
.kind-icon svg {
  width: 100%; height: auto; display: block;
}
.kind-body {
  padding: 0.75rem 1rem;
}
.kind-label {
  font-weight: 600;
  font-size: 0.95rem;
  color: #0f172a;
}
.kind-desc {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.25rem;
  line-height: 1.3;
}
</style>
