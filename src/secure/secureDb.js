/**
 * ★ v1.36.1 — 공개판 자리지킴이(stub).
 *
 *  파일을 하나씩 막는 방식은 계속 샜다. index.js 를 대체했더니 agent.js 가,
 *  그것을 막았더니 readOnlyGuard.js 가 없다고 죽었다. 설치본을 세 번 고쳤다.
 *
 *  그래서 **폴더 전체**를 자리지킴이로 바꾼다. 진짜 구현이 서로를 어떻게 참조하든,
 *  공개판에는 이 폴더의 파일만 들어가므로 빠질 것이 없다.
 *
 *  ⚠ 진짜 구현과 **같은 이름을 모두** 내보내야 한다. 시험이 매번 대조한다.
 */
export function encryptParamsFor(v) { return v; }
export function decryptRowsFor(v) { return v; }
export function indexValueFor() { return null; }
export function indexColumnFor() { return null; }
export function secureInsert() { return null; }
export function secureSelect() { return null; }
export function isSecured() { return false; }

export default { encryptParamsFor, decryptRowsFor, indexValueFor, indexColumnFor, secureInsert, secureSelect, isSecured };
