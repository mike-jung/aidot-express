-- @migration-options: non-blocking
--   ★ v1.11.4 — request_traces.ts 를 밀리초 정밀도로.
--   초 단위(DATETIME)라 같은 초의 요청은 정렬이 임의였고, 기록 시각도 DB 삽입 시각(배치 1초 뒤)이었다.
--   이제 요청이 **시작된 시각**을 밀리초까지 직접 넣는다 (traceWriter).
ALTER TABLE request_traces MODIFY ts DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
