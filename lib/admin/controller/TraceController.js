import { Controller, GetMapping, Auth, Roles, Log } from '../../../src/core/decorators.js';
import db from '../../../src/database/db.js';
import sqlRegistry from '../../../src/core/sqlLoader.js';
import traceStore from '../../../src/core/traceStore.js';
import traceWriter from '../../../src/core/traceWriter.js';
import config from '../../../src/config/index.js';

/**
 * TraceController — 요청 추적 조회. (v1.8.0)
 *
 *  세 가지 질문에 답한다.
 *   1. "이 오류 번호가 뭐였지?"        → GET /api/admin/trace/:requestId
 *   2. "누가 어제 뭘 했지?"            → GET /api/admin/trace/user/:username
 *   3. "느린/실패한 요청 뭐 있었지?"   → GET /api/admin/trace  (검색)
 *
 *  ⚠ 추적 데이터에는 누가 무엇을 봤는지가 들어 있다. **admin 만 볼 수 있어야 한다.**
 */
function positiveInteger(value, fallback, max) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

// DB 장애 시에도 검색 조건을 먼저 적용한 뒤 페이지를 나눈다.
function memoryMatches(row, p) {
  const like = p.path_like == null ? null : new RegExp('^' + p.path_like
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
  return (!p.username || row.username === p.username)
    && (!p.method || row.method === p.method)
    && (!p.request_id || row.request_id === p.request_id)
    && (!p.trace_id || row.trace_id === p.trace_id)
    && (!like || like.test(row.path))
    && (p.min_status == null || row.status >= p.min_status)
    && (p.min_ms == null || row.duration_ms >= p.min_ms)
    && (!p.from_ts || new Date(row.ts) >= new Date(p.from_ts))
    && (!p.to_ts || new Date(row.ts) <= new Date(p.to_ts));
}

@Controller('/api/admin/trace')
export default class TraceController {
  @Log log;

  /** 최근/조건 검색. 메모리 링버퍼와 DB 를 합쳐 보여 준다. */
  @GetMapping('/')
  @Auth()
  @Roles('admin')
  async search(q = {}, req, res) {
    const limit = positiveInteger(q.perPage ?? q.limit, 25, 500);
    let page = positiveInteger(q.page, 1, 1_000_000);
    /* ★ v1.11.3 — 요청 ID·추적 ID(traceparent) 로도 찾는다. 앞단(nginx/모바일) 로그에 남은 X-Request-Id 나
       W3C traceparent 의 trace-id 를 그대로 붙여 넣을 수 있다. */
    const params = {
      username: q.username || null,
      method: q.method || null,
      request_id: q.requestId || null,
      trace_id: q.traceId ? String(q.traceId).toLowerCase() : null,
      path_like: q.path ? `%${q.path}%` : null,
      min_status: q.minStatus ? Number(q.minStatus) : null,
      min_ms: q.minMs ? Number(q.minMs) : null,
      from_ts: q.from || null,
      to_ts: q.to || null,
      limit,
      offset: (page - 1) * limit,
    };

    let rows = [];
    let total = 0;
    let source = 'db';
    try {
      const sql = sqlRegistry.getFile('admin_trace');
      // 페이지 이동 직전에 전체 건수를 확인한다. 보관 정리 후 빈 마지막 페이지도 보정한다.
      const c = await db.execute(sql.get('countTraces'), params);
      total = Number(c.rows?.[0]?.cnt ?? 0);
      page = Math.min(page, Math.max(1, Math.ceil(total / limit)));
      params.offset = (page - 1) * limit;
      const r = await db.execute(sql.get('searchTraces'), params);
      rows = r.rows || [];
    } catch (e) {
      // DB 가 없거나 마이그레이션 전이면 메모리 버퍼만으로도 최근 것은 보여 준다
      this.log?.warn?.(`[trace] DB 조회 실패, 메모리 버퍼로 대체: ${e.message}`);
      source = 'memory';
      rows = traceStore.recentFromMemory(traceStore.ringCapacity()).map((m) => ({
        request_id: m.requestId, trace_id: m.traceId, ts: m.ts, method: m.method,
        path: m.path, route: m.route, status: m.status, duration_ms: m.durationMs,
        username: m.username, user_kind: m.userKind, ip: m.ip, step_count: m.steps.length,
      })).filter((row) => memoryMatches(row, params))
        .sort((a, b) => new Date(b.ts) - new Date(a.ts) || b.request_id.localeCompare(a.request_id));
      total = rows.length;
      page = Math.min(page, Math.max(1, Math.ceil(total / limit)));
      rows = rows.slice((page - 1) * limit, page * limit);
    }

    res.json({
      code: 200, message: 'OK', data: rows, total, source,
      header: { page, perPage: limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  }

  /**
   * ★ v1.11.3 — 기록 상태. "왜 내 요청이 목록에 없지" 의 답이 여기 있다:
   *   부하로 물러난 단계(level), 큐 깊이, 버린 건수, 보관 정리 결과, 저장 규칙.
   *   ⚠ '/:requestId' 보다 앞에 있어야 한다 (선언 순서 = 라우트 순서).
   */
  @GetMapping('/status')
  @Auth()
  @Roles('admin')
  async status(params, req, res) {
    const t = config.trace || {};
    let dbCount = null;
    try {
      const c = await db.execute('SELECT COUNT(*) AS cnt FROM request_traces', {});
      dbCount = Number(c.rows?.[0]?.cnt ?? 0);
    } catch { /* DB 없음 */ }
    res.json({
      code: 200, message: 'OK',
      data: {
        writer: traceWriter.status(),
        ring: { size: traceStore.recentFromMemory(100000).length, max: traceStore.ringCapacity() },
        db: { rows: dbCount },
        rules: { enabled: t.enabled !== false, slowMs: t.slowMs ?? 500, sampleGet: !!t.sampleGet, retentionDays: t.retentionDays ?? 0, maxRecords: t.maxRecords ?? 0,
          note: '오류(4xx/5xx) · 느린 요청 · 변경(POST/PUT/DELETE) · 로그인 사용자의 요청은 저장, 익명의 빠른 GET 은 메모리(최근 300건)에만' },
      },
    });
  }

  /** ★ v1.11.3 — 보관 정리를 지금 실행 (운영자가 버튼으로) */
  @GetMapping('/retention/run')
  @Auth()
  @Roles('admin')
  async retention(params, req, res) {
    const r = await traceWriter.runRetention();
    res.json({ code: 200, message: 'OK', data: r });
  }

  /** 최근 요청 — DB 저장 대상이 아닌 것까지 포함 (조사 시작점) */
  @GetMapping('/recent')
  @Auth()
  @Roles('admin')
  async recent(params, req, res) {
    const limit = Math.min(Number(params?.limit) || 50, 300);
    const list = traceStore.recentFromMemory(limit).map((m) => ({
      requestId: m.requestId, ts: m.ts, method: m.method, path: m.path,
      status: m.status, durationMs: m.durationMs, username: m.username,
      stepCount: m.steps.length, summary: traceStore.describe(m),
    }));
    res.json({ code: 200, message: 'OK', data: list });
  }

  /** 추적 대상 사용자 목록 */
  @GetMapping('/users')
  @Auth()
  @Roles('admin')
  async users(params, req, res) {
    try {
      const sql = sqlRegistry.getFile('admin_trace');
      const r = await db.execute(sql.get('distinctUsers'), {});
      res.json({ code: 200, message: 'OK', data: r.rows || [] });
    } catch {
      res.json({ code: 200, message: 'OK', data: [] });
    }
  }

  /**
   * 한 사람의 행적을 시간순으로.
   *   감사관이 "이 사람이 무엇을 했는가" 를 읽는 화면의 데이터원이다.
   */
  @GetMapping('/user/:username')
  @Auth()
  @Roles('admin')
  async userActivity(params, req, res) {
    const sql = sqlRegistry.getFile('admin_trace');
    /* ★ v1.16.0 — 종류를 고르고 조금씩 가져온다.
       예전에는 최대 1000건을 한 번에 내려보내 화면이 끝없이 길어졌다. */
    const kind = String(params?.kind || 'business');     // business | system | all
    const limit = Math.min(Number(params?.limit) || 50, 200);
    const offset = Math.max(0, Number(params?.offset) || 0);
    const r = await db.execute(sql.get('userActivity'), {
      username: params.username,
      from_ts: params?.from || null,
      to_ts: params?.to || null,
      only_business: kind === 'business' ? 1 : 0,
      only_system: kind === 'system' ? 1 : 0,
      limit: limit + 1,                                   // 한 건 더 받아 "더 있음" 을 판단한다
      offset,
    });
    let rows = r.rows || [];
    const hasMore = rows.length > limit;
    if (hasMore) rows = rows.slice(0, limit);
    rows = rows.slice().reverse();                        // 화면은 시간순으로 읽는다

    // 30분 이상 간격이 벌어지면 다른 '작업 묶음' 으로 나눈다.
    //   로그인 세션 ID 가 없어도 사람이 읽기에는 이 편이 자연스럽다.
    const GAP_MS = 30 * 60 * 1000;
    const groups = [];
    let cur = null;
    for (const row of rows) {
      const t = new Date(row.ts).getTime();
      if (!cur || t - cur.endedAt > GAP_MS) {
        cur = { startedAt: t, endedAt: t, items: [] };
        groups.push(cur);
      }
      cur.endedAt = t;
      cur.items.push({
        requestId: row.request_id, ts: row.ts, method: row.method, path: row.path,
        status: row.status, durationMs: row.duration_ms, ip: row.ip,
        summary: traceStore.describe({
          username: params.username, path: row.path, method: row.method,
          status: row.status, durationMs: row.duration_ms, steps: [],
        }),
      });
    }
    res.json({ code: 200, message: 'OK', data: { username: params.username, groups, hasMore, offset, limit, kind } });
  }

  /**
   * 요청 하나의 전 생애.
   *   `narrative` 는 사람이 읽는 문장, `steps` 는 폭포수용 원자료다.
   */
  @GetMapping('/:requestId')
  @Auth()
  @Roles('admin')
  async detail(params, req, res) {
    const id = String(params.requestId);

    // 메모리에 있으면 그게 가장 완전하다 (저장 대상이 아니었어도 단계가 다 있다)
    const mem = traceStore.findInMemory(id);
    if (mem) {
      return res.json({
        code: 200, message: 'OK', source: 'memory',
        data: {
          requestId: mem.requestId, traceId: mem.traceId, ts: mem.ts,
          method: mem.method, path: mem.path, route: mem.route, status: mem.status,
          durationMs: mem.durationMs, username: mem.username, userKind: mem.userKind,
          ip: mem.ip, userAgent: mem.userAgent,
          summary: traceStore.describe(mem),
          narrative: traceStore.narrate(mem),
          steps: mem.steps,
        },
      });
    }

    const sql = sqlRegistry.getFile('admin_trace');
    const t = await db.execute(sql.get('findTrace'), { request_id: id });
    const row = t.rows?.[0];
    if (!row) return res.status(404).json({ code: 404, message: '해당 요청 기록이 없습니다.' });

    const st = await db.execute(sql.get('findSteps'), { request_id: id });
    const steps = (st.rows || []).map((s) => ({
      at: s.at_ms, kind: s.kind, name: s.name, ms: s.ms,
      ok: !!s.ok, rows: s.rows_count, detail: s.detail,
    }));
    const rec = {
      requestId: row.request_id, traceId: row.trace_id, ts: row.ts,
      method: row.method, path: row.path, route: row.route, status: row.status,
      durationMs: row.duration_ms, username: row.username, userKind: row.user_kind,
      ip: row.ip, userAgent: row.user_agent, steps, truncated: false,
    };
    res.json({
      code: 200, message: 'OK', source: 'db',
      data: { ...rec, summary: traceStore.describe(rec), narrative: traceStore.narrate(rec) },
    });
  }
}
