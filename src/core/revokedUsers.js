/**
 * revokedUsers.js — 지금 막아야 하는 계정 (v1.11.8)
 *
 *  왜: 계정을 비활성으로 바꾸거나 지워도, **이미 발급된 access 토큰**은 만료(기본 15분)까지 그대로 통했다
 *      (실행 검증 `npm run control:check` 에서 확인). 토큰은 서명만 보고 DB 를 보지 않기 때문이다.
 *  어떻게: 막을 계정 id 를 메모리에 담아 두고, 인증 미들웨어가 매 요청 확인한다. DB 조회 없음(요청당 Set 조회 1회).
 *  ⚠ 프로세스 메모리라 서버를 다시 켜면 비워진다 — 그래도 되는 이유는 재기동 뒤에는 refresh 도 다 폐기되어
 *     새 access 토큰을 받을 수 없고, 남은 토큰도 그때쯤 만료되기 때문이다. 여러 대로 늘릴 때는 공유 저장소가 필요하다.
 */
const revoked = new Map();   // id → 막기 시작한 시각(ms)

/** 이 계정의 토큰을 지금부터 막는다 */
export function revokeUser(id) {
  if (id == null) return;
  revoked.set(Number(id), Date.now());
}
/** 다시 허용 (비활성 → 활성) */
export function unrevokeUser(id) {
  if (id == null) return;
  revoked.delete(Number(id));
}
/** 이 토큰이 막힌 계정의 것인가 — iat(발급 시각)이 막기 시작한 시각보다 이르면 막는다 */
export function isRevoked(userId, iatSeconds) {
  if (userId == null) return false;
  const at = revoked.get(Number(userId));
  if (!at) return false;
  if (iatSeconds == null) return true;
  /* ★ v1.11.9 — JWT 의 iat 는 **초** 단위다. 막은 그 초에 다시 로그인해 받은 토큰까지 막으면
     막은 초까지 발급된 토큰은 막는다. 그러면 "막은 그 초에 다시 로그인" 도 막히는데,
     로그인에 성공하면 unrevokeUser 로 표시 자체를 지우므로(AuthService) 다시 로그인하는 길은 열려 있다. */
  return iatSeconds <= Math.floor(at / 1000);   // 막은 초까지 발급된 토큰은 차단
}
export function revokedCount() { return revoked.size; }
export default { revokeUser, unrevokeUser, isRevoked, revokedCount };
