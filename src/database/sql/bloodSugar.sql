-- 혈당 기록·목표 SQL : src/database/sql/bloodSugar.sql
--   원본(구 구조): database/bs_sql.js 의 bs_records_*, bs_goals_* 쿼리들을
--   aidot-express 의 단일 파일 + `-- @name:` 마커 방식으로 변환.


-- @name: findAll
-- 혈당 기록 전체 조회 (최신 날짜 → 가장 최근 등록 순)
SELECT id,
       DATE_FORMAT(`date`, '%Y-%m-%d')                        AS `date`,
       label,
       meal_time,
       `value`,
       memo,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')           AS created_at,
       DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s')           AS updated_at
  FROM {{sample}}blood_sugar_records
 ORDER BY `date` DESC, id DESC;


-- @name: findById
-- 단건 조회
SELECT id,
       DATE_FORMAT(`date`, '%Y-%m-%d')                        AS `date`,
       label,
       meal_time,
       `value`,
       memo,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')           AS created_at,
       DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s')           AS updated_at
  FROM {{sample}}blood_sugar_records
 WHERE id = :id;


-- @name: insert
-- 혈당 기록 추가.
--   원본 테이블의 id 가 AUTO_INCREMENT 가 아니어서 MAX(id)+1 을 직접 계산한다.
INSERT INTO {{sample}}blood_sugar_records (id, `date`, label, meal_time, `value`, memo)
VALUES (
  (SELECT next_id FROM (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM {{sample}}blood_sugar_records) AS t),
  :date,
  :label,
  :meal_time,
  :value,
  :memo
);


-- @name: updateById
-- 기록 수정
UPDATE {{sample}}blood_sugar_records
   SET `date`    = :date,
       label     = :label,
       meal_time = :meal_time,
       `value`   = :value,
       memo      = :memo
 WHERE id = :id;


-- @name: deleteById
-- 기록 삭제
DELETE FROM {{sample}}blood_sugar_records
 WHERE id = :id;


-- @name: goalsFindAll
-- 혈당 목표 전체 조회
SELECT id,
       type,
       min_value,
       max_value,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')           AS created_at,
       DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s')           AS updated_at
  FROM {{sample}}blood_sugar_goals
 ORDER BY id;


-- @name: goalsFindByType
-- 특정 type 목표 조회
SELECT id, type, min_value, max_value
  FROM {{sample}}blood_sugar_goals
 WHERE type = :type;


-- @name: goalsUpsert
-- 목표 갱신. type 컬럼이 UNIQUE KEY 이므로 type 기준 UPSERT.
INSERT INTO {{sample}}blood_sugar_goals (id, type, min_value, max_value)
VALUES (
  (SELECT next_id FROM (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM {{sample}}blood_sugar_goals) AS t),
  :type,
  :min_value,
  :max_value
)
ON DUPLICATE KEY UPDATE
  min_value  = VALUES(min_value),
  max_value  = VALUES(max_value),
  updated_at = CURRENT_TIMESTAMP;
