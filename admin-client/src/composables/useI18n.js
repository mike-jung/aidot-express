/**
 * i18n — 다국어 처리. (v1.10.0)
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  왜 라이브러리를 안 쓰는가
 * ══════════════════════════════════════════════════════════════════════════
 *  vue-i18n 은 훌륭하지만 이 프로젝트에는 과합니다.
 *   · 콘솔은 의존성이 이미 무겁고, 폐쇄망 배포에서 번들 크기가 곧 배포 부담입니다.
 *   · 필요한 것은 **평문 치환과 복수형 없는 문장** 정도입니다.
 *   · 무엇보다 vue-i18n 의 강점(SFC `<i18n>` 블록, 컴파일 타임 최적화)은
 *     빌드 파이프라인에 손을 대야 얻어지는데, 그만한 값이 아닙니다.
 *
 *  대신 `t()` 하나와 `ref` 하나로 끝냅니다. Vue 의 반응성이 재렌더를 알아서 합니다.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  언어를 정하는 순서 — 위가 이깁니다
 * ══════════════════════════════════════════════════════════════════════════
 *   1. 사용자가 화면에서 고른 값      (localStorage)
 *   2. 로그인 화면에서 고른 값        (같은 저장소)
 *   3. 서버가 `.env` 로 정한 기본값   (`/api/admin/config/public`)
 *   4. 브라우저 언어                  (navigator.language)
 *   5. 영어                           (최종 기본)
 *
 *  ⚠ 브라우저 언어를 서버 기본값보다 **아래**에 둡니다.
 *    운영자가 `.env` 로 "이 설치는 영어" 라고 정했으면 그게 의도입니다.
 *    한국어 브라우저를 쓴다는 이유로 그 의도를 뒤집으면 안 됩니다.
 *    (사용자가 직접 고른 값은 여전히 맨 위입니다 — 개인 선택이 조직 기본을 이깁니다)
 */
import { ref, computed, watch } from 'vue';
import en from '../locales/en.js';
import ko from '../locales/ko.js';

/** 지원 언어. 여기에 추가하면 설정·로그인 화면에 자동으로 나타납니다. */
export const LOCALES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ko', label: 'Korean', native: '한국어' },
];

const MESSAGES = { en, ko };
const STORAGE_KEY = 'aidot.locale';

/** 최종 기본값 — 요구사항대로 영어 */
export const FALLBACK_LOCALE = 'en';

const supported = (code) => LOCALES.some((l) => l.code === code);

/** 서버가 .env 로 정한 기본값. 부팅 때 한 번 채워집니다. */
const serverDefault = ref(null);

function detect() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supported(saved)) return saved;              // ① 사용자가 고른 값
  } catch { /* 시크릿 모드 등 */ }
  if (serverDefault.value && supported(serverDefault.value)) {
    return serverDefault.value;                                // ③ .env 기본값
  }
  const nav = (navigator?.language || '').slice(0, 2).toLowerCase();
  if (supported(nav)) return nav;                              // ④ 브라우저 언어
  return FALLBACK_LOCALE;                                      // ⑤ 영어
}

export const locale = ref(detect());

/* ★ v1.42.0 — <html lang> 은 **locale 이 바뀔 때마다** 따라간다.
   예전에는 setLocale() 안에서만 놓았다. 그래서
     · English 를 저장해 둔 사람이 새로고침하면 index.html 의 lang="ko" 가 남고
     · 서버 기본값(applyServerDefault)이 늦게 와도 반영되지 않았다.
   <input type="datetime-local"> 같은 브라우저 기본 위젯은 이 속성으로 표기 언어를
   정한다 — English 인데 날짜 칸이 한글이던 이유다. 실측: Chromium 은 OS 로캘이 아니라
   lang 을 따른다. 한 곳에서 watch 하면 어느 경로로 바뀌든 빠지지 않는다. */
const syncHtmlLang = (code) => { try { document.documentElement.setAttribute('lang', code); } catch { /* SSR */ } };
syncHtmlLang(locale.value);
watch(locale, syncHtmlLang);


/**
 * 서버 기본값을 반영합니다.
 *  ⚠ 사용자가 이미 고른 값이 있으면 **바꾸지 않습니다.** 화면에서 고른 언어가
 *    새로고침마다 서버 기본값으로 되돌아가면 설정이 고장 난 것으로 보입니다.
 */
export function applyServerDefault(code) {
  if (!supported(code)) return;
  serverDefault.value = code;
  let userChose = false;
  try { userChose = !!localStorage.getItem(STORAGE_KEY); } catch { /* 무시 */ }
  if (!userChose) locale.value = code;
}

export function setLocale(code) {
  if (!supported(code)) return;
  locale.value = code;
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* 무시 */ }
}

/** 사용자 선택을 지우고 서버/브라우저 기본으로 되돌립니다 */
export function resetLocale() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* 무시 */ }
  locale.value = detect();
}

/** `a.b.c` 로 중첩 객체를 꺼냅니다 */
function dig(obj, key) {
  let cur = obj;
  for (const part of String(key).split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/**
 * 번역.
 *
 *   t('common.save')                        → 'Save'
 *   t('logs.total', { n: 42 })              → '42 lines'
 *   t('없는.키')                             → '없는.키'  (키를 그대로 — 빈 화면보다 낫다)
 *
 * ⚠ 키가 없으면 **영어로 폴백하고, 그것도 없으면 키를 그대로 돌려줍니다.**
 *   번역 누락으로 화면이 비면 무엇이 빠졌는지조차 알 수 없습니다.
 *   키가 보이면 어디를 채워야 하는지 바로 알 수 있습니다.
 */
export function translate(key, params) {
  const raw = dig(MESSAGES[locale.value], key)
    ?? dig(MESSAGES[FALLBACK_LOCALE], key)
    ?? String(key);
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) =>
    (params[name] === undefined || params[name] === null ? m : String(params[name])));
}

/**
 * ★ v1.10.15 — 카탈로그 항목의 라벨/설명을 id 로 조회한다.
 *
 *  `compositeSchema.js` 는 **데이터 파일**이라 `t()` 를 쓸 수 없다.
 *  거기에 `t()` 를 박으면 모듈 로드 시점에 한 번만 평가되어
 *  언어를 바꿔도 문구가 그대로 남는다(메뉴·탭에서 이미 겪었다).
 *
 *  그래서 카탈로그는 데이터로 두고, **화면에서 id 로 사전을 조회**한다.
 *  사전에 없는 id 는 카탈로그의 원래 값으로 떨어진다 — 새 위젯을 추가해도
 *  번역을 깜빡했다고 화면이 비지 않는다.
 *
 *    catalogLabel('widget', kind)  ·  catalogDesc('widget', kind, kind.description)
 */
export function catalogLabel(group, item) {
  const id = typeof item === 'string' ? item : item?.id;
  if (!id) return '';
  const key = `${group}.${id}.label`;
  const hit = translate(key);
  return hit === key ? (item?.label ?? id) : hit;
}

export function catalogDesc(group, item) {
  const id = typeof item === 'string' ? item : item?.id;
  if (!id) return '';
  const key = `${group}.${id}.desc`;
  const hit = translate(key);
  return hit === key ? (item?.description ?? '') : hit;
}

/** 컴포넌트에서 쓰는 진입점 */
export function useI18n() {
  return {
    t: translate,
    catalogLabel,
    catalogDesc,
    locale,
    localeLabel: computed(() =>
      LOCALES.find((l) => l.code === locale.value)?.native || locale.value),
    locales: LOCALES,
    setLocale,
    resetLocale,
  };
}

/** 번역 없이 t 만 필요할 때 */
export const t = translate;

export default { t: translate, locale, setLocale, resetLocale, useI18n, LOCALES, applyServerDefault };
