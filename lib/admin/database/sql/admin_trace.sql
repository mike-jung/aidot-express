-- ============================================================
--  요청 추적 (v1.8.0)
--    ⚠ 본문은 저장하지 않는다. path 는 마스킹된 값이 들어온다.
-- ============================================================

-- @name: insertTrace
INSERT INTO request_traces
  (request_id, trace_id, ts, method, path, route, status, duration_ms,
   user_id, username, user_kind, ip, user_agent, step_count)
VALUES
  (:request_id, :trace_id, :ts, :method, :path, :route, :status, :duration_ms,
   :user_id, :username, :user_kind, :ip, :user_agent, :step_count);

-- @name: insertStep
INSERT INTO request_steps
  (request_id, seq, at_ms, kind, name, ms, ok, rows_count, detail)
VALUES
  (:request_id, :seq, :at_ms, :kind, :name, :ms, :ok, :rows, :detail);

-- @name: findTrace
SELECT request_id, trace_id, ts, method, path, route, status, duration_ms,
       user_id, username, user_kind, ip, user_agent, step_count
  FROM request_traces
 WHERE request_id = :request_id;

-- @name: findSteps
SELECT seq, at_ms, kind, name, ms, ok, rows_count, detail
  FROM request_steps
 WHERE request_id = :request_id
 ORDER BY seq ASC;

-- @name: searchTraces
-- 빈 조건은 통과시키는 형태 — 화면에서 일부만 채워도 동작한다
SELECT request_id, trace_id, ts, method, path, route, status, duration_ms,
       username, user_kind, ip, step_count
  FROM request_traces
 WHERE (:username   IS NULL OR username = :username)
   AND (:method     IS NULL OR method = :method)
   AND (:request_id IS NULL OR request_id = :request_id)
   AND (:trace_id   IS NULL OR trace_id = :trace_id)
   AND (:path_like  IS NULL OR path LIKE :path_like)
   AND (:min_status IS NULL OR status >= :min_status)
   AND (:min_ms     IS NULL OR duration_ms >= :min_ms)
   AND (:from_ts    IS NULL OR ts >= :from_ts)
   AND (:to_ts      IS NULL OR ts <= :to_ts)
 ORDER BY ts DESC
 LIMIT :limit;

-- @name: countTraces
SELECT COUNT(*) AS cnt
  FROM request_traces
 WHERE (:username   IS NULL OR username = :username)
   AND (:method     IS NULL OR method = :method)
   AND (:request_id IS NULL OR request_id = :request_id)
   AND (:trace_id   IS NULL OR trace_id = :trace_id)
   AND (:path_like  IS NULL OR path LIKE :path_like)
   AND (:min_status IS NULL OR status >= :min_status)
   AND (:min_ms     IS NULL OR duration_ms >= :min_ms)
   AND (:from_ts    IS NULL OR ts >= :from_ts)
   AND (:to_ts      IS NULL OR ts <= :to_ts);

-- @name: findByTraceId
SELECT request_id, ts, method, path, status, duration_ms, username
  FROM request_traces
 WHERE trace_id = :trace_id
 ORDER BY ts ASC;

-- @name: userActivity
-- 한 사람의 행적 — 시간순으로 편다
SELECT request_id, ts, method, path, route, status, duration_ms, ip
  FROM request_traces
 WHERE username = :username
   AND (:from_ts IS NULL OR ts >= :from_ts)
   AND (:to_ts   IS NULL OR ts <= :to_ts)
   /* ★ v1.16.0 — 무엇을 볼지 고른다.
        :only_business = 1 → 업무 API(/api/*)만, 관리 API(/api/admin/*)는 뺀다
        :only_system   = 1 → 관리 API 만 (보안 점검용)
        둘 다 0 이면 전부. 한 사람의 기록은 금방 수백 줄이 되므로 기본은 업무 API 만 본다. */
   AND (:only_business = 0 OR (path LIKE '/api/%' AND path NOT LIKE '/api/admin/%'))
   AND (:only_system   = 0 OR path LIKE '/api/admin/%')
 ORDER BY ts DESC
 LIMIT :limit OFFSET :offset;

-- @name: distinctUsers
SELECT username, COUNT(*) AS cnt, MAX(ts) AS last_ts
  FROM request_traces
 WHERE username IS NOT NULL
 GROUP BY username
 ORDER BY last_ts DESC
 LIMIT 100;

-- @name: deleteOldTraces
DELETE FROM request_traces WHERE ts < :before_ts;

-- @name: deleteOrphanSteps
DELETE FROM request_steps
 WHERE request_id NOT IN (SELECT request_id FROM request_traces);
