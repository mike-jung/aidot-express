-- 혈압 기록·목표 SQL : src/database/sql/bloodPressure.sql
--   원본(구 구조): database/bp_sql.js 의 bp_records_*, bp_goals_* 쿼리들을
--   aidot-express 의 단일 파일 + `-- @name:` 마커 방식으로 변환.
--
--   바인딩 변수: MariaDB / MySQL 은 `:name` 형태를 드라이버가 네이티브 지원 하므로
--   그대로 사용.
--
--   주의: 원본 CREATE TABLE 의 id 컬럼은 `bigint NOT NULL DEFAULT (0)` 이어서
--   AUTO_INCREMENT 가 아니다. 프론트엔드가 add 시 id 를 보내지 않으므로 서버쪽에서
--   `MAX(id)+1` 로 채워 주는 방식을 쓴다 (weight_db 와 동일 전략).


-- @name: findAll
-- 혈압 기록 전체 조회 (최신 날짜 → 가장 최근 등록 순)
SELECT id,
       DATE_FORMAT(`date`, '%Y-%m-%d')                        AS `date`,
       label,
       systolic,
       diastolic,
       memo,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')           AS created_at,
       DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s')           AS updated_at
  FROM {{sample}}blood_pressure_records
 ORDER BY `date` DESC, id DESC;


-- @name: findById
-- 단건 조회
SELECT id,
       DATE_FORMAT(`date`, '%Y-%m-%d')                        AS `date`,
       label,
       systolic,
       diastolic,
       memo,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')           AS created_at,
       DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s')           AS updated_at
  FROM {{sample}}blood_pressure_records
 WHERE id = :id;


-- @name: insert
-- 혈압 기록 추가.
--   원본 테이블의 id 가 AUTO_INCREMENT 가 아니어서 MAX(id)+1 을 직접 계산한다.
INSERT INTO {{sample}}blood_pressure_records (id, `date`, label, systolic, diastolic, memo)
VALUES (
  (SELECT next_id FROM (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM {{sample}}blood_pressure_records) AS t),
  :date,
  :label,
  :systolic,
  :diastolic,
  :memo
);


-- @name: updateById
-- 기록 수정
UPDATE {{sample}}blood_pressure_records
   SET `date`    = :date,
       label     = :label,
       systolic  = :systolic,
       diastolic = :diastolic,
       memo      = :memo
 WHERE id = :id;


-- @name: deleteById
-- 기록 삭제
DELETE FROM {{sample}}blood_pressure_records
 WHERE id = :id;


-- @name: goalsFindAll
-- 혈압 목표 전체 조회
SELECT id,
       type,
       min_value,
       max_value,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')           AS created_at,
       DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s')           AS updated_at
  FROM {{sample}}blood_pressure_goals
 ORDER BY id;


-- @name: goalsFindByType
-- 특정 type 목표 조회
SELECT id, type, min_value, max_value
  FROM {{sample}}blood_pressure_goals
 WHERE type = :type;


-- @name: goalsUpsert
-- 목표 갱신. type 컬럼이 UNIQUE KEY 이므로 type 기준 UPSERT.
--   goals 테이블에 해당 type 의 row 가 아직 없어도 자동 생성.
--   id 는 MAX(id)+1 — 원본 DDL 이 AUTO_INCREMENT 가 아닌 점 대응.
INSERT INTO {{sample}}blood_pressure_goals (id, type, min_value, max_value)
VALUES (
  (SELECT next_id FROM (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM {{sample}}blood_pressure_goals) AS t),
  :type,
  :min_value,
  :max_value
)
ON DUPLICATE KEY UPDATE
  min_value  = VALUES(min_value),
  max_value  = VALUES(max_value),
  updated_at = CURRENT_TIMESTAMP;
