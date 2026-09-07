-- 어드민 Screen Designer 프로젝트 메타 SQL. 접근키: 'admin_screen_project:<name>'

-- @name: countProjects
SELECT COUNT(*) AS cnt
  FROM admin_screen_projects
 WHERE status = 'active';

-- @name: listProjectsPaged
-- 목록 조회 — Phase 25: cssFramework 뱃지 표시를 위해 config_json 포함.
-- Phase 13: :limit / :offset 은 MariaDB 예약어 LIMIT 과 충돌하여 namedPlaceholders 파싱이 실패.
--   → :lim / :off 로 변경. Service 의 listPaged 도 { lim, off } 로 바인딩함.
-- Phase 27: Phase 25 작업 중 Phase 13 의 수정이 실수로 :limit/:offset 으로 되돌려졌던 회귀를 복구.
SELECT id, name, description, status, config_json, created_at, updated_at
  FROM admin_screen_projects
 WHERE status = 'active'
 ORDER BY updated_at DESC, id DESC
 LIMIT :lim OFFSET :off;

-- @name: listAllProjectsBrief
-- 드롭다운 등에서 쓰는 가벼운 전체 목록.
SELECT id, name, description, updated_at
  FROM admin_screen_projects
 WHERE status = 'active'
 ORDER BY name ASC;

-- @name: findProjectById
-- 상세 조회 — JSON 컬럼까지 전부.
SELECT id, name, description,
       config_json, layout_json, screens_json, vars_json,
       status, created_at, updated_at
  FROM admin_screen_projects
 WHERE id = :id;

-- @name: findProjectByName
SELECT id, name
  FROM admin_screen_projects
 WHERE name = :name
   AND status = 'active';

-- @name: insertProject
INSERT INTO admin_screen_projects
  (name, description, config_json, layout_json, screens_json, vars_json)
VALUES
  (:name, :description, :config_json, :layout_json, :screens_json, :vars_json);

-- @name: updateProject
UPDATE admin_screen_projects
   SET name         = :name,
       description  = :description,
       config_json  = :config_json,
       layout_json  = :layout_json,
       screens_json = :screens_json,
       vars_json    = :vars_json
 WHERE id = :id
   AND status = 'active';

-- @name: touchProject
-- 프로젝트의 updated_at 만 갱신 (특정 필드만 바꾸고 싶을 때도 활용).
UPDATE admin_screen_projects
   SET updated_at = CURRENT_TIMESTAMP
 WHERE id = :id
   AND status = 'active';

-- @name: softDeleteProject
UPDATE admin_screen_projects
   SET status = 'deleted'
 WHERE id = :id
   AND status = 'active';
