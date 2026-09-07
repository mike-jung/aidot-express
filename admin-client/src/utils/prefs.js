/**
 * prefs.js — 브라우저에만 저장되는 표시 설정. (v1.7.5)
 *
 *  서버에 올라가지 않는 값만 여기에 둔다. localStorage 를 쓰지만
 *  사파리 프라이빗 모드처럼 접근이 막히는 환경이 있어 전부 try/catch 로 감싸고,
 *  실패하면 기본값으로 조용히 동작한다 (설정 하나 때문에 콘솔이 죽으면 안 된다).
 */
const NS = 'aidot.ui.';

export const PREF_KEYS = Object.freeze({
  rememberSidebar: 'rememberSidebar',   // 사이드바 접힘 상태를 기억할지
  sidebarCollapsed: 'sidebarCollapsed', // 기억한 접힘 상태 자체
  confirmLogout: 'confirmLogout',       // 로그아웃 전 확인 대화상자
  theme: 'theme',                       // 'light' | 'dark' (v1.7.8)
  density: 'density',                   // 'compact' | 'comfortable' | 'spacious' (v1.7.9)
});

/** @param {string} key @param {*} fallback */
export function readPref(key, fallback) {
  try {
    const raw = window.localStorage.getItem(NS + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** @param {string} key @param {*} value */
export function writePref(key, value) {
  try {
    window.localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export default { PREF_KEYS, readPref, writePref };
