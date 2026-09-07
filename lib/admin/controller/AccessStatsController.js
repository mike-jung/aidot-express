/**
 * AccessStatsController — /api/admin/access/*
 *
 *  접속 통계 조회 / 다운로드 엔드포인트.
 *
 *    GET  /overview                         기간 요약 (총 요청수, 에러수, 사용자수, 경로수)
 *    GET  /summary/by-path                  경로별 집계
 *    GET  /summary/by-user                  사용자별 집계
 *    GET  /users/:username/paths            특정 사용자의 경로별 요청
 *    GET  /timeline?bucket=10min|30min|hour|day   시간대별 요청량
 *    GET  /logs                             원본 로그 (페이지네이션, 필터)
 *    GET  /login-stats                      로그인 / 체류시간 통계
 *    GET  /sessions                         세션 리스트
 *    GET  /export/:kind                     CSV 다운로드
 *    GET  /stream                           접속 기록이 실제로 늘어날 때만 알려 주는 SSE (폴링 대체)
 *
 *  공통 쿼리 파라미터:
 *    fromMs, toMs (ms epoch), limit, offset, username?, path?
 */
import {
  Controller, GetMapping, PostMapping, SseMapping, Autowired, Auth, Roles, Log,
} from '../../../src/core/decorators.js';
import { ACCESS_CHANNEL } from '../service/AccessLogService.js';

@Controller('/api/admin/access')
export default class AccessStatsController {

  @Autowired('AccessLogService') accessService;
  @Log log;

  /**
   * GET /api/admin/access/stream
   *
   *  콘솔 [접속 통계] 화면이 10초마다 집계 쿼리를 다시 돌리던 폴링을 대체한다.
   *  서버는 **접속 기록이 실제로 저장됐을 때만** `access-changed` 를 보내고,
   *  화면은 그 신호를 받았을 때만 현재 탭을 다시 읽는다.
   *    → 아무도 접속하지 않는 동안에는 집계 쿼리가 0건 (예전에는 접속자 수 × 6회/분).
   *
   *  EventSource 는 헤더를 못 보내므로 `?ticket=` (1회용 티켓) 또는 `?access_token=` 을 쓴다.
   */
  @SseMapping('/stream')
  @Roles('admin')
  async stream(params, req) {
    this.log.info(`[access-stream] 구독 user=${req.user?.username ?? '-'}`);
    req.sse.send({ event: 'hello', data: { channel: ACCESS_CHANNEL, ts: new Date().toISOString() } });
    return ACCESS_CHANNEL;
  }

  /**
   * ★ v1.18.0 — 브라우저가 "이 화면 숨겨졌어요" 라고 보내는 힌트.
   *
   *  ⚠ 이것만 믿으면 안 된다. 조사해 보면(MDN·Chrome Page Lifecycle·Firefox bug 1609653)
   *    · beforeunload/unload 는 모바일에서 안 뜨고 bfcache 를 깨뜨린다
   *    · pagehide + sendBeacon 도 브라우저를 끄면 실패하는 사례가 보고돼 있다
   *    · visibilitychange(hidden) 가 그나마 가장 잘 오지만 **탭 전환에서도** 온다
   *  그래서 여기서는 **바로 끝내지 않고 표시만** 한다. 잠깐 뒤에도 아무 요청이 없으면
   *  무활동 청소가 닫고, 돌아오면 다음 요청이 이 표시를 지운다.
   *
   *  sendBeacon 은 헤더를 못 붙이므로 본문의 token 도 받는다.
   */
  @PostMapping('/leave')
  async leave(params, req) {
    let uid = req.user?.id ?? req.user?.userId ?? null;
    if (!uid) {
      const raw = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1] || req.body?.token;
      if (raw) {
        try {
          const { verifyAccessToken } = await import('../../../src/core/tokens.js');
          const u = verifyAccessToken(String(raw));
          /* 토큰의 사용자 번호는 표준대로 sub 에 들어 있다 (id/userId 가 아니다) */
          uid = u?.id ?? u?.userId ?? (u?.sub != null ? Number(u.sub) : null) ?? null;
        } catch { /* 힌트일 뿐이라 조용히 */ }
      }
    }
    if (uid) await this.accessService.markLeaveHint(uid);
    return { data: { ok: true } };
  }

  @GetMapping('/overview')
  @Auth()
  async overview(params) {
    const data = await this.accessService.getOverview({ fromMs: params.fromMs, toMs: params.toMs });
    return { data };
  }

  /** GET /status — 접속 통계 서비스 상태 진단
   *  "데이터가 안 보여요" 할 때 tablesMissing / queueLength 등으로 원인 파악.
   */
  @GetMapping('/status')
  @Auth()
  async status() {
    const data = this.accessService.getStatus();
    return { data };
  }

  @GetMapping('/summary/by-path')
  @Auth()
  async summaryByPath(params) {
    const excludeAdmin = params.excludeAdmin === '1' || params.excludeAdmin === 'true';
    const data = await this.accessService.getSummaryByPath({
      fromMs: params.fromMs, toMs: params.toMs,
      limit: params.limit, offset: params.offset,
      excludeAdmin,
    });
    return { data };
  }

  @GetMapping('/summary/by-user')
  @Auth()
  async summaryByUser(params) {
    const data = await this.accessService.getSummaryByUser({
      fromMs: params.fromMs, toMs: params.toMs,
      limit: params.limit, offset: params.offset,
    });
    return { data };
  }

  @GetMapping('/users/:username/paths')
  @Auth()
  async pathsByUser(params) {
    const data = await this.accessService.getPathsByUser({
      fromMs: params.fromMs, toMs: params.toMs,
      username: params.username,
      limit: params.limit, offset: params.offset,
      excludeAdmin: params.excludeAdmin === 'true' || params.excludeAdmin === true,
    });
    return { data };
  }

  @GetMapping('/timeline')
  @Auth()
  async timeline(params) {
    const data = await this.accessService.getTimeline({
      fromMs: params.fromMs, toMs: params.toMs,
      bucket: ['day', 'hour', '10min', '30min'].includes(params.bucket) ? params.bucket : 'hour',
    });
    return { data };
  }

  @GetMapping('/logs')
  @Auth()
  async logs(params) {
    const data = await this.accessService.getLogs({
      fromMs: params.fromMs, toMs: params.toMs,
      username: params.username || null,
      path: params.path || null,
      limit: params.limit, offset: params.offset,
    });
    return { data };
  }

  @GetMapping('/login-stats')
  @Auth()
  async loginStats(params) {
    const data = await this.accessService.getLoginStats({
      fromMs: params.fromMs, toMs: params.toMs,
      limit: params.limit, offset: params.offset,
    });
    return { data };
  }

  @GetMapping('/sessions')
  @Auth()
  async sessions(params) {
    const data = await this.accessService.getSessions({
      fromMs: params.fromMs, toMs: params.toMs,
      username: params.username || null,
      limit: params.limit, offset: params.offset,
    });
    return { data };
  }

  /** GET /api/admin/access/sessions/active — 현재 활성(미종료) 세션만 */
  @GetMapping('/sessions/active')
  @Auth()
  async activeSessions(params) {
    const data = await this.accessService.getActiveSessions({
      fromMs: params.fromMs, toMs: params.toMs,
      username: params.username || null,
      limit: params.limit, offset: params.offset,
    });
    return { data };
  }

  /** POST /api/admin/access/sessions/:id/force-end
   *  관리자가 활성 세션을 강제 종료.
   *   - user_sessions.ended_at 세팅
   *   - 해당 사용자의 refresh_tokens 전체 폐기 (실제 로그인 무효화)
   *   - login_events 에 'force_logout' 감사 기록
   */
  @PostMapping('/sessions/:id/force-end')
  @Roles('admin')
  async forceEndSession(params, req) {
    const sessionId = Number(params.id);
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      throw Object.assign(new Error('invalid session id'), { status: 400 });
    }
    const actorUsername = req?.user?.username || null;
    this.log.warn(`[access] 세션 강제종료 요청: sessionId=${sessionId} by=${actorUsername || '(unknown)'}`);
    const data = await this.accessService.forceEndSession({ sessionId, actorUsername });
    return { data };
  }

  /** CSV 다운로드. kind = byPath | byUser | timeline | logs | sessions | loginStats
   *  응답을 text/csv 로 세팅하고, req/res 객체를 직접 받아 파일 다운로드 응답 만듦.
   */
  /** ★ v1.13.0 — 컨트롤러별 접속 통계 (username 을 주면 그 사람만) */
  @GetMapping('/summary/by-controller')
  @Auth()
  async byController(params) {
    return {
      data: await this.accessService.getSummaryByController({
        fromMs: params.fromMs, toMs: params.toMs,
        limit: params.limit, offset: params.offset,
        username: params.username || null,
        excludeAdmin: params.excludeAdmin === 'true' || params.excludeAdmin === true,
      }),
    };
  }

  @GetMapping('/export/:kind')
  @Auth()
  async exportCsv(params, req, res) {
    const kind = String(params.kind || '');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const opts = {
      kind,
      fromMs: params.fromMs,
      toMs:   params.toMs,
      username: params.username || null,
      path:     params.path     || null,
      excludeAdmin: params.excludeAdmin === 'true' || params.excludeAdmin === true,
    };
    /* ★ v1.13.0 — format=xlsx 면 엑셀 파일. CSV 는 엑셀에서 한글이 깨지거나
       긴 숫자가 지수로 바뀌는 일이 잦아 "엑셀로 받기" 를 따로 둔다. */
    if (String(params.format || '').toLowerCase() === 'xlsx') {
      const buf = await this.accessService.exportXlsx(opts);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="access-${kind}-${stamp}.xlsx"`);
      res.status(200).end(buf);
      return undefined;
    }
    const csv = await this.accessService.exportCsv(opts);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="access-${kind}-${stamp}.csv"`);
    res.status(200).send(csv);
    // 컨트롤러 프레임워크가 결과를 한 번 더 JSON 으로 감싸지 않게 명시적으로 응답 종료
    return undefined;
  }
}
