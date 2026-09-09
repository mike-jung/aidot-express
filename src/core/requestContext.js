/**
 * requestContext.js — 요청 하나의 생애를 하나의 ID 로 묶는다. (v1.8.0)
 *
 *  ## 왜 필요한가
 *  지금까지 로그는 줄 단위로는 훌륭한데 **요청 단위로 묶이지 않았다.**
 *  [로그] 화면에서 500 오류 하나를 추적하려면 시각을 눈대중해 앞뒤 줄을 짐작해야 했고,
 *  동시 요청이 겹치면 사실상 불가능했다.
 *
 *  ## 무엇을 쓰는가
 *  Node 내장 `AsyncLocalStorage` — 별도 라이브러리가 필요 없다.
 *  (`express-correlation-id` 같은 패키지가 있지만 전부 이걸 감싼 것뿐이다.
 *   OpenTelemetry 도 내부적으로 같은 메커니즘을 쓴다.)
 *
 *  ## ID 두 종류를 함께 쓰는 이유
 *   - `requestId` (8자리 hex) — **사람이 읽고 말하는 용도.** 화면에 뜨는 오류 번호를
 *     전화로 불러 줄 수 있어야 해서 짧아야 한다. `a3f9c210`
 *   - `traceId` (32자리 hex) — **W3C Trace Context** 표준. 나중에 OpenTelemetry 나
 *     외부 게이트웨이와 붙일 때 그대로 통한다. 앞단에서 `traceparent` 헤더가 오면 이어받는다.
 *
 *  ## ⚠ AsyncLocalStorage 의 대표적인 함정
 *  `getStore()` 가 undefined 로 나오는 원인은 거의 항상 **비동기 사슬에서 빠져나간 것**이다.
 *  가장 흔한 경우가 요청 중에 등록된 EventEmitter 리스너가 나중에 실행될 때인데,
 *  이 프로젝트는 SSE 구독이 정확히 그 모양이다 (요청 안에서 구독하고, 발행은 한참 뒤에 일어난다).
 *  → 그래서 모든 조회 함수는 컨텍스트가 없을 때 **던지지 않고 안전한 기본값**을 돌려준다.
 *    컨텍스트가 없다고 로그가 끊기거나 요청이 실패하면 안 된다.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';
import { redactUrl } from './logRedaction.js';

const storage = new AsyncLocalStorage();

/** 한 요청에서 기록할 수 있는 단계 수 상한 — 폭주하는 반복문이 메모리를 먹지 않게 */
const MAX_STEPS = 200;

const hex = (bytes) => crypto.randomBytes(bytes).toString('hex');

/** W3C traceparent: `00-<32hex traceId>-<16hex spanId>-<2hex flags>` */
const TRACEPARENT_RE = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

/**
 * 들어온 요청에서 추적 정보를 만든다. 앞단이 W3C traceparent 를 보냈으면 이어받는다.
 * @param {import('express').Request} req
 */
export function createContext(req) {
  let traceId = null;
  let parentSpanId = null;

  const tp = req.get?.('traceparent');
  const m = tp && TRACEPARENT_RE.exec(String(tp).trim().toLowerCase());
  if (m && m[1] !== '0'.repeat(32) && m[2] !== '0'.repeat(16)) {
    traceId = m[1];
    parentSpanId = m[2];
  }

  // 클라이언트가 X-Request-Id 를 지정했으면 존중한다 (재현 요청을 같은 번호로 묶을 수 있다).
  const given = String(req.get?.('x-request-id') || '').trim();
  const requestId = /^[0-9a-zA-Z_-]{4,64}$/.test(given) ? given : hex(4);

  return {
    requestId,
    traceId: traceId || hex(16),
    spanId: hex(8),
    parentSpanId,
    method: req.method,
    path: redactUrl(req.originalUrl || req.url || ''),
    ip: req.ip || req.socket?.remoteAddress || '',
    userAgent: req.get?.('user-agent') || '',
    user: null,              // 인증 미들웨어가 나중에 채운다
    route: null,             // 컨트롤러가 매칭되면 채운다
    startedAt: Date.now(),
    steps: [],
    truncated: false,
    txDepth: 0,              // ★ v1.11.0 — db.transaction() 안에 있는가 (MCI 호출 격리 검사용)
  };
}

/* ★ v1.11.0 — 트랜잭션 안에서 외부 호출(MCI)을 하면 DB 커넥션을 쥔 채 기다리게 된다.
   MCI 가 멈추면 그 커넥션들이 돌아오지 않아 **DB 를 쓰는 모든 API 가 같이 멈춘다.**
   db.transaction() 이 아래 두 함수로 깊이를 세고, MciService 가 inTransaction() 으로 경고한다. */
export function enterTransaction() {
  const ctx = storage.getStore();
  if (ctx) ctx.txDepth = (ctx.txDepth || 0) + 1;
}
export function exitTransaction() {
  const ctx = storage.getStore();
  if (ctx && ctx.txDepth > 0) ctx.txDepth--;
}
export function inTransaction() {
  return (storage.getStore()?.txDepth || 0) > 0;
}

/** 컨텍스트 안에서 fn 을 실행 */
export function runWith(ctx, fn) {
  return storage.run(ctx, fn);
}

/** 현재 컨텍스트 (없으면 null) */
export function getContext() {
  return storage.getStore() ?? null;
}

/** 현재 요청 ID (없으면 null) — logger 가 매 줄마다 부른다 */
export function currentRequestId() {
  return storage.getStore()?.requestId ?? null;
}

/** 인증 이후 사용자 정보를 붙인다 */
export function setUser(user) {
  const ctx = storage.getStore();
  if (!ctx || !user) return;
  ctx.user = {
    id: user.id ?? user.sub ?? null,
    username: user.username ?? user.sub ?? null,
    role: user.role ?? null,
    kind: user.kind ?? null,          // 'admin' | 'app'
  };
}

/** 매칭된 라우트를 붙인다 (경로 파라미터가 아니라 패턴으로 집계하기 위해) */
export function setRoute(route) {
  const ctx = storage.getStore();
  if (ctx && route) ctx.route = String(route);
}

/**
 * 단계 하나를 기록한다. 컨텍스트가 없으면 조용히 무시한다.
 * @param {'auth'|'controller'|'service'|'sql'|'sse'|'mci'|'error'|'note'} kind
 * @param {string} name   사람이 읽는 이름 (`BookController.list`, `book:findAll`)
 * @param {{ms?:number, detail?:string, ok?:boolean, rows?:number}} [info]
 */
export function addStep(kind, name, info = {}) {
  const ctx = storage.getStore();
  if (!ctx) return;
  if (ctx.steps.length >= MAX_STEPS) { ctx.truncated = true; return; }
  ctx.steps.push({
    at: Date.now() - ctx.startedAt,     // 요청 시작 기준 상대시간(ms) — 폭포수 그리기에 그대로 쓴다
    kind,
    name: String(name).slice(0, 200),
    ms: info.ms ?? null,
    ok: info.ok ?? true,
    rows: info.rows ?? null,
    detail: info.detail ? String(info.detail).slice(0, 500) : null,
  });
}

/** 밖으로 나가는 호출에 붙일 W3C 헤더 (MCI/외부 API 연동 시) */
export function outboundHeaders() {
  const ctx = storage.getStore();
  if (!ctx) return {};
  return {
    traceparent: `00-${ctx.traceId}-${ctx.spanId}-01`,
    'X-Request-Id': ctx.requestId,
  };
}

export default {
  createContext, runWith, getContext, currentRequestId,
  setUser, setRoute, addStep, outboundHeaders,
  enterTransaction, exitTransaction, inTransaction,
};
