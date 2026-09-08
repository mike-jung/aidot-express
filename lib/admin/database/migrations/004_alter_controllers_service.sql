-- @migration-options: ignore-already-applied
-- ============================================================
-- admin_controllers 테이블에 service_name 컬럼 추가
--
-- 컨트롤러가 어떤 Service 를 사용하는지 명시적으로 저장.
-- (기존에는 클래스명에서 자동 추론했지만, 이제 셀렉트박스로 직접 지정)
--
-- 헤더 옵션 ignore-already-applied:
--   컬럼이 이미 존재하면 1060 에러가 발생하지만 자동으로 무시 → 재실행 안전
-- ============================================================

ALTER TABLE admin_controllers
  ADD COLUMN service_name VARCHAR(100) NULL COMMENT '주입할 Service 클래스명' AFTER base_path;
