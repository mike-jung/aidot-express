/**
 * leaveHint.js — “이 화면 이제 안 봐요” 를 서버에 알린다 (v1.18.0)
 *
 *  왜 이렇게밖에 못 하나 (조사 결과)
 *   · `beforeunload` / `unload` — 모바일에서 안 뜨고 **bfcache 를 깨뜨린다.** 쓰면 안 된다.
 *   · `pagehide` + `sendBeacon` — 브라우저를 완전히 끄면 안 가는 사례가 보고돼 있다
 *     (Firefox bug 1609653 · Chrome 도 한동안 막았다가 되돌렸다).
 *   · `visibilitychange`(hidden) — **가장 잘 오는 신호**지만 탭 전환·앱 전환에서도 온다.
 *
 *  그래서 여기서 보내는 것은 **힌트일 뿐**이다. 서버는 이걸 받고 바로 끝내지 않고,
 *  잠깐(기본 90초) 아무 요청이 없을 때만 닫는다. 돌아오면 다음 요청이 표시를 지운다.
 *  신호가 아예 안 와도 **무활동 청소(기본 30분)** 가 받쳐 준다 — 그쪽이 진짜 기준이다.
 */
const URL_PATH = '/api/admin/access/leave';
let lastSent = 0;

function tokenOf() {
  try {
    // 로그인 상태에서만 의미가 있다. 저장 방식이 바뀌어도 조용히 넘어간다.
    return JSON.parse(localStorage.getItem('aidot.auth') || '{}')?.accessToken || null;
  } catch { return null; }
}

function send() {
  const now = Date.now();
  if (now - lastSent < 5_000) return;        // 탭을 오가며 연달아 보내지 않게
  lastSent = now;
  const token = tokenOf();
  if (!token) return;
  const body = JSON.stringify({ token });
  /* fetch(keepalive) 를 먼저 쓴다 — 헤더를 붙일 수 있고 페이지가 사라져도 전송이 이어진다.
     막히면 sendBeacon 으로 물러선다(헤더를 못 붙여 본문의 token 을 서버가 읽는다). */
  try {
    if (typeof fetch === 'function') {
      fetch(URL_PATH, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
      }).catch(() => {});
      return;
    }
  } catch { /* 아래로 */ }
  try { navigator.sendBeacon?.(URL_PATH, new Blob([body], { type: 'application/json' })); }
  catch { /* 힌트라 실패해도 그만 */ }
}

export function installLeaveHint() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send();
  });
  // Safari 등에서 visibilitychange 가 늦는 경우를 위한 보조 (돌아오는 이동이면 보내지 않는다)
  window.addEventListener('pagehide', (e) => { if (!e.persisted) send(); });
}

export default { installLeaveHint };
