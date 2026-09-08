-- 접속 통계 관련 SQL. 접근키: 'admin_access:<n>'

-- ─────────────── 적재 ───────────────

-- @name: insertAccessLog
INSERT INTO access_logs
  (ts, user_id, username, session_kind, method, path, route_key, controller, handler, status, duration_ms, ip, user_agent, request_id)
VALUES
  (:ts, :user_id, :username, :session_kind, :method, :path, :route_key, :controller, :handler, :status, :duration_ms, :ip, :user_agent, :request_id);

-- @name: insertLoginEvent
INSERT INTO login_events
  (ts, user_id, username, session_kind, event_type, session_id, ip, user_agent)
VALUES
  (:ts, :user_id, :username, :session_kind, :event_type, :session_id, :ip, :user_agent);

-- @name: insertUserSession
INSERT INTO user_sessions
  (user_id, username, session_kind, started_at, last_seen_at, ip, user_agent)
VALUES
  (:user_id, :username, :session_kind, :started_at, :started_at, :ip, :user_agent);

-- @name: endUserSession
UPDATE user_sessions
   SET ended_at = :ended_at,
       duration_sec = TIMESTAMPDIFF(SECOND, started_at, :ended_at),
       end_reason = 'logout'
 WHERE id = :id
   AND ended_at IS NULL;

-- @name: touchSession
-- ★ v1.18.0 요청이 올 때마다 "여기까지 쓰고 있었다" 를 남긴다.
--   너무 자주 쓰지 않도록 마지막 갱신에서 일정 시간이 지난 것만 건드린다.
--   ⚠ 요청에는 세션 번호가 실려 있지 않다(로그아웃도 같은 사정이라 user_id 로 찾는다).
--     그래서 그 사람의 **아직 열려 있는 세션**을 갱신한다.
UPDATE user_sessions
   SET last_seen_at = :now, leave_hint_at = NULL
 WHERE user_id = :user_id
   AND ended_at IS NULL
   AND (last_seen_at IS NULL OR last_seen_at < :stale_before);

-- @name: countOpenSessions
SELECT COUNT(*) AS n FROM user_sessions WHERE user_id = :user_id AND ended_at IS NULL;

-- @name: markLeaveHint
-- 화면이 숨겨졌다는 브라우저의 힌트. **바로 끝내지 않는다** — 탭 전환일 수도 있다.
UPDATE user_sessions
   SET leave_hint_at = :now
 WHERE user_id = :user_id AND ended_at IS NULL;

-- @name: sweepIdleSessions
-- ★ 무활동 청소 — 여기가 **진짜 기준**이다.
--   브라우저 신호는 오지 않을 수 있으므로(모바일·강제 종료·크래시),
--   일정 시간 아무 요청이 없으면 그때까지 쓴 것으로 보고 닫는다.
--   ⚠ ended_at 을 NOW() 가 아니라 **마지막 활동 시각**으로 잡는다.
--     그래야 아무도 안 쓴 시간이 체류시간에 들어가지 않는다.
--
--   ⚠⚠ 조건에 COALESCE 를 쓰면 **인덱스를 못 탄다.**
--     열린 세션 5만 건으로 재 보니 10.02ms → 1.12ms (9배). 열린 세션이 많을수록 더 벌어진다.
--     그래서 last_seen_at 을 그대로 비교하고(인덱스 idx_user_sessions_open 사용),
--     값이 없는 옛 기록은 아래 sweepIdleLegacy 로 따로 정리한다.
--   LIMIT 으로 한 번에 닫는 양을 묶는다 — 처음 켰을 때 밀린 것이 한꺼번에 잠기지 않게.
UPDATE user_sessions
   SET ended_at = last_seen_at,
       /* SQLite 에는 GREATEST 가 없어 CASE 로 쓴다 (음수 방지) */
       duration_sec = CASE WHEN TIMESTAMPDIFF(SECOND, started_at, last_seen_at) > 0
                           THEN TIMESTAMPDIFF(SECOND, started_at, last_seen_at) ELSE 0 END,
       end_reason = 'idle'
 WHERE ended_at IS NULL
   AND last_seen_at IS NOT NULL
   AND last_seen_at < :idle_before
 LIMIT :lim;

-- @name: sweepLeaveHinted
-- 브라우저가 "숨겨졌다" 고 알린 뒤 유예 시간까지 조용한 것 (탭 전환이면 돌아와서 표시가 지워진다)
UPDATE user_sessions
   SET ended_at = COALESCE(last_seen_at, started_at),
       duration_sec = CASE WHEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(last_seen_at, started_at)) > 0
                           THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(last_seen_at, started_at)) ELSE 0 END,
       end_reason = 'closed'
 WHERE ended_at IS NULL
   AND leave_hint_at IS NOT NULL
   AND leave_hint_at < :hint_before
 LIMIT :lim;

-- @name: sweepIdleLegacy
-- last_seen_at 이 없는 옛 기록 정리 (이 판 이전에 만들어진 것들 — 한 번 지나가면 더는 안 걸린다)
UPDATE user_sessions
   SET ended_at = started_at,
       duration_sec = 0,
       end_reason = 'idle'
 WHERE ended_at IS NULL
   AND last_seen_at IS NULL
   AND started_at < :idle_before
 LIMIT :lim;

-- @name: endUserSessionsByUser
-- user_id 의 아직 끝나지 않은 세션을 모두 종료 (logoutAll 용)
UPDATE user_sessions
   SET ended_at = :ended_at,
       duration_sec = TIMESTAMPDIFF(SECOND, started_at, :ended_at)
 WHERE user_id = :user_id
   AND ended_at IS NULL;

-- @name: findLatestOpenSession
-- user_id 의 미종료 세션 중 가장 최근 것 1건 (단일 로그아웃 시 사용)
SELECT id
  FROM user_sessions
 WHERE user_id = :user_id
   AND ended_at IS NULL
 ORDER BY started_at DESC
 LIMIT 1;

-- @name: findSessionById
-- 세션 상세 (강제 종료 전 검증용)
SELECT id, user_id, username, session_kind, started_at, ended_at, ip, user_agent
  FROM user_sessions
 WHERE id = :id;

-- ─────────────── 보관 정리 ───────────────
-- @name: deleteOldAccessLogs
DELETE FROM access_logs WHERE ts < :before_ts;

-- @name: countAccessLogs
-- access_logs 총 레코드 수 (maxRecords 초과분 계산용)
SELECT COUNT(*) AS c FROM access_logs;

-- @name: deleteOldestAccessLogs
-- 가장 오래된 N건을 삭제. mariadb/mysql 은 DELETE ... ORDER BY ... LIMIT 지원.
DELETE FROM access_logs ORDER BY ts ASC, id ASC LIMIT :lim;
-- @name: deleteOldLoginEvents
DELETE FROM login_events WHERE ts < :before_ts;
-- @name: deleteOldSessions
DELETE FROM user_sessions WHERE started_at < :before_ts;


-- ─────────────── 조회: 개요 ───────────────

-- @name: countTotal
SELECT COUNT(*) AS c
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts;

-- @name: countErrors
SELECT COUNT(*) AS c
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
   AND status >= 500;

-- @name: countDistinctUsers
SELECT COUNT(DISTINCT username) AS c
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
   AND username IS NOT NULL;

-- @name: countDistinctPaths
SELECT COUNT(DISTINCT path) AS c
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts;

-- ─────────────── 조회: 경로별 집계 ───────────────

-- @name: summaryByController
-- ★ v1.13.0 컨트롤러별 집계 — "어떤 기능을 얼마나 썼나" 는 경로보다 컨트롤러 단위가 읽기 쉽다.
SELECT COALESCE(NULLIF(controller, ''), '(기타)')       AS controller,
       COUNT(*)                                          AS count,
       COUNT(DISTINCT CONCAT(method, ' ', path))         AS distinct_routes,
       COUNT(DISTINCT username)                          AS distinct_users,
       SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END)    AS err_count,
       SUM(CASE WHEN status >= 400 AND status < 500 THEN 1 ELSE 0 END) AS fail_count,
       AVG(duration_ms)                                  AS avg_ms,
       MAX(duration_ms)                                  AS max_ms,
       MIN(ts)                                           AS first_ts,
       MAX(ts)                                           AS last_ts
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
   AND (:username IS NULL OR username = :username)
   AND (:exclude_admin = 0 OR (path LIKE '/api/%' AND path NOT LIKE '/api/admin/%'))   -- ★ v1.13.2 시스템 요청 제외 = 관리 API + 업무 API 가 아닌 것 전부
 GROUP BY COALESCE(NULLIF(controller, ''), '(기타)')
 ORDER BY count DESC
 LIMIT :lim OFFSET :off;

-- @name: summaryByPath
-- 경로별 집계. 동일 path 가 다른 method 로 들어오면 분리.
SELECT method,
       path,
       route_key,
       controller,
       handler,
       COUNT(*)                                  AS count,
       SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) AS err_count,
       AVG(duration_ms)                          AS avg_ms,
       MAX(duration_ms)                          AS max_ms,
       MIN(duration_ms)                          AS min_ms,
       COUNT(DISTINCT username)                  AS distinct_users
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
 GROUP BY method, path, route_key, controller, handler
 ORDER BY count DESC
 LIMIT :lim OFFSET :off;

-- @name: summaryByPathExcludeAdmin
-- admin (/api/admin/*) 경로를 제외한 경로별 집계
SELECT method,
       path,
       route_key,
       controller,
       handler,
       COUNT(*)                                  AS count,
       SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) AS err_count,
       AVG(duration_ms)                          AS avg_ms,
       MAX(duration_ms)                          AS max_ms,
       MIN(duration_ms)                          AS min_ms,
       COUNT(DISTINCT username)                  AS distinct_users
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
   AND (session_kind IS NULL OR session_kind <> 'admin')
   AND (path LIKE '/api/%' AND path NOT LIKE '/api/admin/%')
 GROUP BY method, path, route_key, controller, handler
 ORDER BY count DESC
 LIMIT :lim OFFSET :off;

-- @name: summaryByPathCount
-- 경로별 집계의 총 행수 (페이지네이션용)
SELECT COUNT(*) AS c FROM (
  SELECT 1 FROM access_logs
   WHERE ts >= :from_ts AND ts < :to_ts
   GROUP BY method, path, route_key, controller, handler
) t;

-- @name: summaryByPathCountExcludeAdmin
SELECT COUNT(*) AS c FROM (
  SELECT 1 FROM access_logs
   WHERE ts >= :from_ts AND ts < :to_ts
     AND (session_kind IS NULL OR session_kind <> 'admin')
     AND (path LIKE '/api/%' AND path NOT LIKE '/api/admin/%')
   GROUP BY method, path, route_key, controller, handler
) t;

-- ─────────────── 조회: 사용자별 집계 ───────────────

-- @name: summaryByUser
SELECT username,
       MAX(user_id)                               AS user_id,
       MAX(session_kind)                          AS session_kind,
       COUNT(*)                                   AS count,
       SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) AS err_count,
       AVG(duration_ms)                           AS avg_ms,
       MAX(duration_ms)                           AS max_ms,
       COUNT(DISTINCT path)                       AS distinct_paths,
       MIN(ts)                                    AS first_ts,
       MAX(ts)                                    AS last_ts
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
   AND username IS NOT NULL
 GROUP BY username
 ORDER BY count DESC
 LIMIT :lim OFFSET :off;

-- @name: summaryByUserCount
SELECT COUNT(*) AS c FROM (
  SELECT 1 FROM access_logs
   WHERE ts >= :from_ts AND ts < :to_ts
     AND username IS NOT NULL
   GROUP BY username
) t;

-- @name: pathsByUser
-- 특정 사용자의 경로별 요청수
SELECT method,
       path,
       route_key,
       COUNT(*)                                   AS count,
       SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) AS err_count,
       AVG(duration_ms)                           AS avg_ms,
       MAX(duration_ms)                           AS max_ms,
       MIN(ts)                                    AS first_ts,
       MAX(ts)                                    AS last_ts
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
   AND username = :username
   /* ★ v1.15.1 — 로그인 같은 시스템 요청을 접었다 폈다 한다.
      감사 관점에서는 로그인도 그 사람의 행적이라 지우지 않고 **숨기기만** 한다.
      (언제 들어오고 나갔나 는 [로그인/세션] 탭이 더 잘 보여 준다) */
   AND (:exclude_admin = 0 OR (path LIKE '/api/%' AND path NOT LIKE '/api/admin/%'))
 GROUP BY method, path, route_key
 ORDER BY count DESC
 LIMIT :lim OFFSET :off;

-- ─────────────── 조회: 타임라인 (시간대별) ───────────────

-- @name: timelineDay
-- 일 단위 집계
SELECT DATE_FORMAT(ts, '%Y-%m-%d') AS bucket,
       COUNT(*)                                   AS count,
       SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) AS err_count,
       COUNT(DISTINCT username)                   AS distinct_users
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
 GROUP BY bucket
 ORDER BY bucket;

-- @name: timeline10min
-- ★ v1.15.0 10분 단위. 최근 상황을 보려면 시간 단위로는 너무 굵다 —
--   방금 보낸 요청이 다음 정시가 될 때까지 화면에 안 보인다.
--   (묶는 크기를 파라미터로 받으면 드라이버가 값을 제대로 넘기지 못해 문장을 나눠 둔다)
-- ⚠ DATE_FORMAT 의 '%H:%i' 를 쓰면 안 된다 — SQL 로더가 **:i 를 이름 파라미터로 읽어** 삼켜 버린다.
--    (그래서 21:57 요청이 21:00 칸에 들어갔다) 콜론+글자 조합이 없게 CONCAT 으로 만든다.
-- 분 앞자리만 떼어 10분 칸을 만든다 (MINUTE()·LPAD 는 SQLite 에 없어 DATE_FORMAT 으로만 만든다)
SELECT CONCAT(DATE_FORMAT(ts, '%Y-%m-%d %H'), '_', SUBSTR(DATE_FORMAT(ts, '%i'), 1, 1), '0') AS bucket,
       COUNT(*)                                   AS count,
       SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) AS err_count,
       COUNT(DISTINCT username)                   AS distinct_users
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
 GROUP BY bucket
 ORDER BY bucket;

-- @name: timeline30min
-- 30분 단위
-- ⚠ DATE_FORMAT 의 '%H:%i' 를 쓰면 안 된다 — SQL 로더가 **:i 를 이름 파라미터로 읽어** 삼켜 버린다.
--    (그래서 21:57 요청이 21:00 칸에 들어갔다) 콜론+글자 조합이 없게 CONCAT 으로 만든다.
SELECT CONCAT(DATE_FORMAT(ts, '%Y-%m-%d %H'), '_',
              CASE WHEN SUBSTR(DATE_FORMAT(ts, '%i'), 1, 1) IN ('0','1','2') THEN '00' ELSE '30' END) AS bucket,
       COUNT(*)                                   AS count,
       SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) AS err_count,
       COUNT(DISTINCT username)                   AS distinct_users
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
 GROUP BY bucket
 ORDER BY bucket;

-- @name: timelineHour
-- 시간 단위 집계
SELECT DATE_FORMAT(ts, '%Y-%m-%d %H:00') AS bucket,
       COUNT(*)                                   AS count,
       SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) AS err_count,
       COUNT(DISTINCT username)                   AS distinct_users
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
 GROUP BY bucket
 ORDER BY bucket;

-- ─────────────── 조회: 원본 로그 (페이지네이션) ───────────────

-- @name: logsPaged
SELECT id,
       request_id,
       DATE_FORMAT(ts, '%Y-%m-%d %H:%i:%s.%f')    AS ts,
       user_id, username, session_kind,
       method, path, route_key, controller, handler,
       status, duration_ms, ip, user_agent
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
   AND (:username IS NULL OR username = :username)
   AND (:path IS NULL OR path = :path)
 ORDER BY ts DESC
 LIMIT :lim OFFSET :off;

-- @name: logsCount
SELECT COUNT(*) AS c
  FROM access_logs
 WHERE ts >= :from_ts AND ts < :to_ts
   AND (:username IS NULL OR username = :username)
   AND (:path IS NULL OR path = :path);

-- ─────────────── 로그인 / 세션 통계 ───────────────

-- @name: loginStatsByUser
SELECT le.username,
       MAX(le.user_id)     AS user_id,
       MAX(le.session_kind) AS session_kind,
       SUM(CASE WHEN le.event_type = 'login'         THEN 1 ELSE 0 END) AS login_count,
       SUM(CASE WHEN le.event_type = 'login_failed'  THEN 1 ELSE 0 END) AS failed_count,
       SUM(CASE WHEN le.event_type = 'logout'        THEN 1 ELSE 0 END) AS logout_count,
       MAX(le.ts)          AS last_login_ts
  FROM login_events le
 WHERE le.ts >= :from_ts AND le.ts < :to_ts
 GROUP BY le.username
 ORDER BY login_count DESC
 LIMIT :lim OFFSET :off;

-- @name: sessionStatsByUser
-- 사용자별 체류시간 통계. ended_at 이 NULL 인 진행중 세션은 현재시각 기준 duration 으로 포함.
SELECT username,
       MAX(user_id)   AS user_id,
       MAX(session_kind) AS session_kind,
       COUNT(*)       AS session_count,
       SUM(CASE WHEN ended_at IS NULL THEN TIMESTAMPDIFF(SECOND, started_at, NOW())
                ELSE duration_sec END) AS total_sec,
       AVG(CASE WHEN ended_at IS NULL THEN TIMESTAMPDIFF(SECOND, started_at, NOW())
                ELSE duration_sec END) AS avg_sec,
       MAX(CASE WHEN ended_at IS NULL THEN TIMESTAMPDIFF(SECOND, started_at, NOW())
                ELSE duration_sec END) AS max_sec,
       SUM(CASE WHEN ended_at IS NULL THEN 1 ELSE 0 END) AS active_count,
       MAX(last_seen_at) AS last_seen_at,
       /* ★ v1.15.0 — 끝난 세션만으로 낸 평균.
          진행 중 세션을 "지금까지" 로 계산하면, 로그아웃하지 않고 브라우저만 닫은 사람 때문에
          평균이 몇 시간씩 부풀어 오른다(실제로 17시간 39분으로 나온 사례). 둘을 나눠서 보여 준다. */
       AVG(CASE WHEN ended_at IS NOT NULL THEN duration_sec END) AS avg_closed_sec,
       SUM(CASE WHEN ended_at IS NOT NULL THEN 1 ELSE 0 END)     AS closed_count
  FROM user_sessions
 WHERE started_at >= :from_ts AND started_at < :to_ts
 GROUP BY username
 ORDER BY total_sec DESC
 LIMIT :lim OFFSET :off;

-- @name: sessionsPaged
SELECT id,
       DATE_FORMAT(started_at, '%Y-%m-%d %H:%i:%s') AS started_at,
       DATE_FORMAT(ended_at,   '%Y-%m-%d %H:%i:%s') AS ended_at,
       DATE_FORMAT(last_seen_at, '%Y-%m-%d %H:%i:%s') AS last_seen_at,
       end_reason,
       duration_sec, user_id, username, session_kind, ip, user_agent
  FROM user_sessions
 WHERE started_at >= :from_ts AND started_at < :to_ts
   AND (:username IS NULL OR username = :username)
 ORDER BY started_at DESC
 LIMIT :lim OFFSET :off;

-- @name: sessionsCount
SELECT COUNT(*) AS c
  FROM user_sessions
 WHERE started_at >= :from_ts AND started_at < :to_ts
   AND (:username IS NULL OR username = :username);

-- @name: lazyCloseExpiredSessions
-- 조회 직전에 호출 — TTL 이 지난 "활성" 세션을 자동으로 종료 처리.
--   ended_at = started_at + TTL 로 설정하여 duration_sec 도 정확히 TTL 값으로 기록.
--   세션 종료 시점을 "마지막 활동" 이 아닌 "TTL 경계" 로 보는 이유:
--     실제 마지막 활동 시각은 별도 추적 없음. TTL 지나면 재인증 없이 사용 불가.
--   이후 activeSessionsPaged/Count 쿼리는 이미 닫힌 세션을 배제하게 됨.
UPDATE user_sessions
   SET ended_at = DATE_ADD(started_at, INTERVAL :ttl_sec SECOND),
       duration_sec = :ttl_sec
 WHERE ended_at IS NULL
   AND started_at < DATE_SUB(NOW(), INTERVAL :ttl_sec SECOND);

-- @name: activeSessionsPaged
-- 현재 활성(미종료 & TTL 내) 세션만. started_at 이 기간 내에 있고,
--   ended_at 이 NULL 이며, TTL 이 아직 경과하지 않은 것.
SELECT id,
       DATE_FORMAT(started_at, '%Y-%m-%d %H:%i:%s') AS started_at,
       /* ★ v1.18.1 — 지금까지가 아니라 **마지막 활동까지**를 쓴 시간으로 본다.
          화면을 켜 두고 자리를 비운 시간이 "쓴 시간" 으로 잡히지 않게. */
       /* 음수가 나오지 않게 막는다 — 시계가 흔들리거나 옛 기록이 뒤섞이면 0 으로 */
       CASE WHEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(last_seen_at, started_at)) > 0
            THEN TIMESTAMPDIFF(SECOND, started_at, COALESCE(last_seen_at, started_at)) ELSE 0 END AS duration_sec,
       DATE_FORMAT(last_seen_at, '%Y-%m-%d %H:%i:%s') AS last_seen_at,
       TIMESTAMPDIFF(SECOND, COALESCE(last_seen_at, started_at), NOW())      AS idle_sec,
       leave_hint_at,
       user_id, username, session_kind, ip, user_agent
  FROM user_sessions
 WHERE ended_at IS NULL
   AND started_at >= DATE_SUB(NOW(), INTERVAL :ttl_sec SECOND)
   AND started_at >= :from_ts AND started_at < :to_ts
   AND (:username IS NULL OR username = :username)
 ORDER BY started_at DESC
 LIMIT :lim OFFSET :off;

-- @name: activeSessionsCount
SELECT COUNT(*) AS c
  FROM user_sessions
 WHERE ended_at IS NULL
   AND started_at >= DATE_SUB(NOW(), INTERVAL :ttl_sec SECOND)
   AND started_at >= :from_ts AND started_at < :to_ts
   AND (:username IS NULL OR username = :username);
