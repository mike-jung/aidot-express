/**
 * genStrings.js — **생성되는 프로젝트 안에 들어갈** 문구.
 *
 *  ## 콘솔 번역(locales/)과 왜 나뉘어 있나
 *  콘솔의 `t()` 는 이 화면이 쓰는 것이고, 여기 있는 것은 **내보낸 프로젝트가 쓰는 것**이다.
 *  내보낸 프로젝트는 이 콘솔과 무관하게 혼자 돌아간다 — 콘솔의 사전을 가져다 쓸 수 없다.
 *
 *  그래서 생성할 때 **선택된 언어의 낱말을 코드 안에 박아** 내보낸다.
 *  한국어로 만들면 `실시간`, English 로 만들면 `Live` 가 들어간 Vue 파일이 나온다.
 *
 *  ⚠ 여기에 낱말을 더할 때는 **두 언어를 함께** 채워야 한다. 한쪽이 비면
 *    그 언어로 생성했을 때 `undefined` 가 화면에 찍힌다.
 */

const KO = {
  /* 공통 상태 */
  loading: '불러오는 중…',
  noData: '데이터가 없습니다.',
  noSelection: '선택된 항목이 없습니다.',
  yes: '예',
  no: '아니오',
  done: '완료되었습니다.',
  confirmProceed: '계속 진행할까요?',

  /* 실시간 배지 */
  live: '실시간',
  disconnected: '연결 끊김',
  refreshed: '갱신됨',

  /* 목록 */
  moreCount: '{n}개 더',
  totalCount: '총 {n}건',

  /* 폼 */
  submitQuery: '조회',
  submitRun: '실행',
  valueRequired: ' 값을 입력하세요.',
  close: '닫기',
  cancel: '취소',

  /* 페이저 */
  first: '맨앞',
  prev: '이전',
  next: '다음',
  last: '맨뒤',
};

const EN = {
  loading: 'Loading…',
  noData: 'No data.',
  noSelection: 'Nothing selected.',
  yes: 'Yes',
  no: 'No',
  done: 'Done.',
  confirmProceed: 'Go ahead?',

  live: 'Live',
  disconnected: 'Disconnected',
  refreshed: 'Updated',

  moreCount: '{n} more',
  totalCount: '{n} total',

  submitQuery: 'Search',
  submitRun: 'Run',
  valueRequired: ' is required.',
  close: 'Close',
  cancel: 'Cancel',

  first: 'First',
  prev: 'Previous',
  next: 'Next',
  last: 'Last',
};

/**
 * 생성에 쓸 문구 묶음.
 *
 * @param {string} [lang] 'ko' | 'en' — 없으면 한국어
 * @returns {Record<string,string>}
 */
export function genStrings(lang) {
  return String(lang || '').startsWith('en') ? EN : KO;
}

/** 두 언어에 같은 키가 있는지 — 시험이 쓴다 */
export const GEN_STRING_KEYS = Object.keys(KO);
export const _tables = { KO, EN };
