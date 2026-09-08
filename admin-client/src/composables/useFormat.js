/**
 * useFormat — 날짜·시각·숫자를 **현재 언어에 맞춰** 표시한다. (v1.10.9)
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  왜 필요한가
 * ══════════════════════════════════════════════════════════════════════════
 *  화면 문구를 전부 영어로 옮겨도, 시각이 이렇게 나오면 어색합니다.
 *
 *      Last sign-in    2026. 8. 26. 오후 4:48
 *
 *  `toLocaleString('ko-KR')` 이 코드 곳곳에 하드코딩돼 있기 때문입니다.
 *  이건 **번역 사전으로는 풀리지 않습니다** — 문구가 아니라 포맷이니까요.
 *
 *  그래서 로캘을 인자로 넘기지 않고 **현재 언어를 따라가는** 헬퍼로 감쌉니다.
 *  언어를 바꾸면 날짜 표기도 함께 바뀝니다.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  설계 원칙
 * ══════════════════════════════════════════════════════════════════════════
 *  ① **잘못된 입력에 던지지 않는다.** 화면 한 칸의 날짜 때문에 전체가 깨지면
 *     안 됩니다. 파싱에 실패하면 원본을 그대로 돌려줍니다.
 *  ② **로그·파일명에 쓰는 형식은 언어와 무관합니다.** `2026-08-26 14:30:11` 같은
 *     정렬 가능한 표기는 어느 언어에서든 같아야 하므로 `iso()` 로 따로 둡니다.
 *  ③ Intl 은 브라우저 내장이라 **의존성이 늘지 않습니다.**
 */
import { computed } from 'vue';
import { locale } from './useI18n';

/** BCP-47 태그 — Intl 이 이해하는 형태로 */
const TAG = { en: 'en-US', ko: 'ko-KR' };

const tagOf = (code) => TAG[code] || TAG.en;

/** Date 로 만들 수 있으면 Date, 아니면 null (던지지 않는다) */
function toDate(v) {
  if (v == null || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function useFormat() {
  const tag = computed(() => tagOf(locale.value));

  /** 날짜 + 시각 — 목록의 '생성일', '최근 로그인' 등 */
  const dateTime = (v, opts) => {
    const d = toDate(v);
    if (!d) return v == null ? '' : String(v);
    try { return d.toLocaleString(tag.value, opts); }
    catch { return d.toISOString(); }
  };

  /** 날짜만 */
  const date = (v, opts) => {
    const d = toDate(v);
    if (!d) return v == null ? '' : String(v);
    try { return d.toLocaleDateString(tag.value, opts); }
    catch { return d.toISOString().slice(0, 10); }
  };

  /** 시각만 — 차트 축, 로그 줄 등 */
  const time = (v, opts) => {
    const d = toDate(v);
    if (!d) return v == null ? '' : String(v);
    try { return d.toLocaleTimeString(tag.value, opts); }
    catch { return d.toISOString().slice(11, 19); }
  };

  /** 짧은 시각 (HH:MM) — 좁은 자리용 */
  const timeShort = (v) => time(v, { hour: '2-digit', minute: '2-digit' });

  /** 숫자 — 천 단위 구분 */
  const number = (v, opts) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return v == null ? '' : String(v);
    try { return n.toLocaleString(tag.value, opts); }
    catch { return String(n); }
  };

  /**
   * 정렬 가능한 고정 형식 — `2026-08-26 14:30:11`.
   * ⚠ 로그·파일명·복사해서 붙일 값에 씁니다. **언어와 무관해야** 합니다.
   */
  const iso = (v, { withTime = true } = {}) => {
    const d = toDate(v);
    if (!d) return v == null ? '' : String(v);
    const p = (x) => String(x).padStart(2, '0');
    const ymd = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    return withTime ? `${ymd} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` : ymd;
  };

  /** 소요시간 — 1000ms 이상은 초로 */
  const duration = (ms) => {
    const n = Number(ms);
    if (!Number.isFinite(n)) return '—';
    return n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${Math.round(n)}ms`;
  };

  return { dateTime, date, time, timeShort, number, iso, duration, localeTag: tag };
}

export default useFormat;
