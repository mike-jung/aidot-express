-- ============================================================
--  어드민 도구 — Screen Designer 프로젝트 테이블
--   화면 디자이너 메뉴에서 관리하는 "화면 생성용 프로젝트" 들을 저장.
--   각 프로젝트는 layout, screens, customVars, theme 등 전체 설정을
--   JSON 으로 묶어서 유지한다 (POC 의 localStorage 구조를 DB 화).
--
--  실행: mysql -u root -p <DB> < lib/admin/database/migrations/007_init_screen_projects.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_screen_projects (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(200)    NOT NULL COMMENT '사용자에게 보이는 프로젝트 이름',
  description  VARCHAR(500)    NULL      COMMENT '선택 설명',

  -- 전체 설정은 JSON 으로 한 번에 저장/교체한다. 스키마는 app 레벨에서 관리.
  --   config_json   : { apiBaseUrl, cssFramework: 'metronic'|'bootstrap', theme:{ primary, font, customCss } }
  --   layout_json   : { kind: 'sidebar-left'|'sidebar-dark'|'top-nav',
  --                     title: {...}, sidebar: {...}, mainArea: {...} }
  --   screens_json  : ScreenSpec[]   (composite/list/detail/form/auth)
  --   vars_json     : 사용자 정의 스토어 변수 목록
  config_json  JSON NOT NULL            COMMENT '프로젝트 설정 (apiBaseUrl, theme, cssFramework)',
  layout_json  JSON NOT NULL            COMMENT '전체 화면 구조 + 타이틀/사이드바 편집 상태',
  screens_json JSON NOT NULL            COMMENT 'ScreenSpec[] (컴포지트/리스트/상세/폼 등)',
  vars_json    JSON NOT NULL            COMMENT '사용자 정의 스토어 변수 목록',

  status       VARCHAR(20)     NOT NULL DEFAULT 'active'
               COMMENT 'active | deleted (soft delete)',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_admin_screen_projects_status (status),
  KEY idx_admin_screen_projects_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
