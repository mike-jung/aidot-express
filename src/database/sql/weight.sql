-- 체중 기록·목표 SQL : src/database/sql/weight.sql
--   원본(구 구조): database/wt_sql.js 의 wt_records_*, wt_goals_* 쿼리들을
--   aidot-express 의 단일 파일 + `-- @name:` 마커 방식으로 변환.
--
--   바인딩 변수: MariaDB / MySQL 은 `:name` 형태를 드라이버가 네이티브 지원 하므로
--   그대로 사용. 컨트롤러/서비스에서 `{ date, weight, memo, ... }` 객체를 전달하면
--   이름이 일치하는 값이 자동 바인딩됨.
--
--   주의: 원본 CREATE TABLE 의 id 컬럼은 `bigint NOT NULL DEFAULT (0)` 이어서
--   AUTO_INCREMENT 가 아니다. 하지만 실제 데이터(INSERT 된 레코드) 에는 id=3,11,12...
--   같은 값이 이미 있고, 프론트엔드가 add 시 id 를 보내지 않으므로 서버쪽에서
--   `MAX(id)+1` 로 채워 주는 방식을 쓴다 (아래 insert 쿼리 참고).


-- @name: findAll
-- 체중 기록 전체 조회 (최신 날짜 → 가장 최근 등록 순)
SELECT id,
       DATE_FORMAT(`date`, '%Y-%m-%d')                        AS `date`,
       weight,
       memo,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')           AS created_at,
       DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s')           AS updated_at
  FROM {{sample}}weight_records
 ORDER BY `date` DESC, id DESC;


-- @name: findById
-- 단건 조회
SELECT id,
       DATE_FORMAT(`date`, '%Y-%m-%d')                        AS `date`,
       weight,
       memo,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')           AS created_at,
       DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s')           AS updated_at
  FROM {{sample}}weight_records
 WHERE id = :id;


-- @name: findByDate
-- 특정 날짜의 기록 (중복 체크용 — 같은 날짜는 1건만 유지한다는 프론트 UX 규칙 반영)
SELECT id,
       DATE_FORMAT(`date`, '%Y-%m-%d')                        AS `date`,
       weight,
       memo
  FROM {{sample}}weight_records
 WHERE `date` = :date
 LIMIT 1;


-- @name: insert
-- 체중 기록 추가.
--   원본 테이블의 id 가 AUTO_INCREMENT 가 아니어서 MAX(id)+1 을 직접 계산한다.
--   (테이블 DDL 을 수정해 AUTO_INCREMENT 로 바꾸면 이 COALESCE 는 제거 가능.)
INSERT INTO {{sample}}weight_records (id, `date`, weight, memo)
VALUES (
  (SELECT next_id FROM (SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM {{sample}}weight_records) AS t),
  :date,
  :weight,
  :memo
);


-- @name: updateById
-- 기록 수정
UPDATE {{sample}}weight_records
   SET `date`  = :date,
       weight  = :weight,
       memo    = :memo
 WHERE id = :id;


-- @name: deleteById
-- 기록 삭제
DELETE FROM {{sample}}weight_records
 WHERE id = :id;


-- @name: goalsFindAll
-- 체중 목표 조회 (레코드가 여러 개일 경우를 대비해 order 지정)
SELECT id,
       height,
       min_weight,
       max_weight,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')           AS created_at,
       DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s')           AS updated_at
  FROM {{sample}}weight_goals
 ORDER BY id;


-- @name: goalsFindById
-- 특정 목표 조회 (기본키 id 는 프론트 UI 상 항상 1 이지만, 범용적으로 제공)
SELECT id,
       height,
       min_weight,
       max_weight
  FROM {{sample}}weight_goals
 WHERE id = :id;


-- @name: goalsUpsert
-- 목표 갱신. 프론트가 id=1 로 고정된 단일 행을 편집하는 구조이므로 UPSERT 로 처리.
--   (원본 wt_goals_update 는 `WHERE id = 1` 하드코딩 + 레코드가 없으면 효과 없음.)
INSERT INTO {{sample}}weight_goals (id, height, min_weight, max_weight)
VALUES (1, :height, :min_weight, :max_weight)
ON DUPLICATE KEY UPDATE
  height       = VALUES(height),
  min_weight   = VALUES(min_weight),
  max_weight   = VALUES(max_weight),
  updated_at   = CURRENT_TIMESTAMP;
