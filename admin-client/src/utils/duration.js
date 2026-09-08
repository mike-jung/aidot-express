/**
 * duration.js — 시간 길이를 사람 말로 (v1.19.0)
 *
 *  왜 따로 두나
 *   화면마다 `fmtDuration` 을 각자 만들어 쓰면서 '3분 20초' 처럼 **한글이 박혀** 있었다.
 *   언어를 English 로 바꿔도 그 글자는 그대로 남는다. 한 곳에 모아 번역을 거치게 한다.
 *
 *  쓰는 쪽:  const { fmtDuration } = useDuration();   // t() 를 안에서 쓴다
 */
import { useI18n } from '../composables/useI18n';

export function useDuration() {
  const { t } = useI18n();

  /** 초 → "1시간 5분" / "1 h 5 m" (언어에 맞춰) */
  function fmtDuration(sec) {
    const n = Math.max(0, Math.floor(Number(sec) || 0));
    if (n < 60) return t('dur.sec', { n });
    const m = Math.floor(n / 60);
    if (m < 60) {
      const s = n % 60;
      return s ? `${t('dur.min', { n: m })} ${t('dur.sec', { n: s })}` : t('dur.min', { n: m });
    }
    const h = Math.floor(m / 60);
    if (h < 24) {
      const mm = m % 60;
      return mm ? `${t('dur.hour', { n: h })} ${t('dur.min', { n: mm })}` : t('dur.hour', { n: h });
    }
    const d = Math.floor(h / 24);
    const hh = h % 24;
    return hh ? `${t('dur.day', { n: d })} ${t('dur.hour', { n: hh })}` : t('dur.day', { n: d });
  }

  /** 밀리초 주기 → 새로고침 간격 표시 ("30초" / "30 s") */
  function fmtInterval(ms) {
    const n = Number(ms) || 0;
    return n >= 60_000 ? t('dur.min', { n: Math.round(n / 60_000) }) : t('dur.sec', { n: Math.round(n / 1000) });
  }

  return { fmtDuration, fmtInterval };
}

export default { useDuration };
