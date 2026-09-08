-- 어드민 모니터링 관련 SQL. 접근키: 'admin_metrics:<n>'

-- ─────────────── 샘플 (시계열) ───────────────

-- @name: insertSample
INSERT INTO admin_metric_samples (ts, kind, metric, value)
VALUES (:ts, :kind, :metric, :value);

-- @name: findSamplesByRange
SELECT ts, kind, metric, value
  FROM admin_metric_samples
 WHERE ts >= :from_ts
   AND ts <= :to_ts
 ORDER BY ts ASC;

-- @name: findSamplesByKindRange
SELECT ts, kind, metric, value
  FROM admin_metric_samples
 WHERE ts >= :from_ts
   AND ts <= :to_ts
   AND kind = :kind
 ORDER BY ts ASC;

-- @name: deleteOldSamples
DELETE FROM admin_metric_samples
 WHERE ts < :before_ts;

-- @name: countSamples
-- admin_metric_samples 총 레코드 수 (maxRecords 초과분 계산용)
SELECT COUNT(*) AS c FROM admin_metric_samples;

-- @name: deleteOldestSamples
-- 가장 오래된 N건 삭제 (레코드 수 한도 유지용)
DELETE FROM admin_metric_samples ORDER BY ts ASC, id ASC LIMIT :lim;

-- ─────────────── 임계값 ───────────────

-- @name: findAllThresholds
SELECT id, kind, metric, comparator, threshold, duration_sec, enabled, label,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
       DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
  FROM admin_metric_thresholds
 ORDER BY kind, metric;

-- @name: findEnabledThresholds
SELECT id, kind, metric, comparator, threshold, duration_sec, enabled, label
  FROM admin_metric_thresholds
 WHERE enabled = 1;

-- @name: upsertThreshold
INSERT INTO admin_metric_thresholds (kind, metric, comparator, threshold, duration_sec, enabled, label)
VALUES (:kind, :metric, :comparator, :threshold, :duration_sec, :enabled, :label)
ON DUPLICATE KEY UPDATE
  comparator   = VALUES(comparator),
  threshold    = VALUES(threshold),
  duration_sec = VALUES(duration_sec),
  enabled      = VALUES(enabled),
  label        = VALUES(label);

-- @name: deleteThreshold
DELETE FROM admin_metric_thresholds WHERE id = :id;

-- ─────────────── 알림 ───────────────

-- @name: insertAlert
INSERT INTO admin_metric_alerts
  (triggered_at, kind, metric, comparator, threshold, peak_value, duration_sec, status, label)
VALUES
  (:triggered_at, :kind, :metric, :comparator, :threshold, :peak_value, :duration_sec, 'active', :label);

-- @name: updateAlertPeak
UPDATE admin_metric_alerts
   SET peak_value = :peak_value
 WHERE id = :id;

-- @name: resolveAlert
UPDATE admin_metric_alerts
   SET status = 'resolved',
       resolved_at = :resolved_at
 WHERE id = :id;

-- @name: findActiveAlerts
SELECT id, kind, metric, comparator, threshold, peak_value, duration_sec, status, label,
       DATE_FORMAT(triggered_at, '%Y-%m-%d %H:%i:%s') AS triggered_at,
       DATE_FORMAT(resolved_at,  '%Y-%m-%d %H:%i:%s') AS resolved_at
  FROM admin_metric_alerts
 WHERE status = 'active'
 ORDER BY triggered_at DESC;

-- @name: findRecentAlerts
SELECT id, kind, metric, comparator, threshold, peak_value, duration_sec, status, label,
       DATE_FORMAT(triggered_at, '%Y-%m-%d %H:%i:%s') AS triggered_at,
       DATE_FORMAT(resolved_at,  '%Y-%m-%d %H:%i:%s') AS resolved_at
  FROM admin_metric_alerts
 ORDER BY triggered_at DESC
 LIMIT :lim;
