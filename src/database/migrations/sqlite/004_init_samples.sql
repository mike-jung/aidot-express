-- @migration-options: non-blocking
--   샘플 데이터 파일입니다. 이 파일이 실패해도 뒤따르는 마이그레이션(users.name,
--   화면 프로젝트, admin 비밀번호 정책 등)은 계속 실행됩니다 — 샘플 하나 때문에
--   로그인/콘솔이 깨지지 않도록. 실패한 파일은 기록되지 않으므로 원인을 고치고
--   서버를 다시 시작하면 자동으로 재시도합니다.
-- v1.2.0: 샘플 컨트롤러용 테이블 (SQLite 변형). 자세한 설명은 ../004_init_samples.sql 참고.
CREATE TABLE IF NOT EXISTS {{sample}}person (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL,
  age     INTEGER NULL,
  mobile  TEXT    NULL
);
INSERT INTO {{sample}}person (name, age, mobile) SELECT '홍길동', 34, '010-1111-2222' WHERE NOT EXISTS (SELECT 1 FROM {{sample}}person);
INSERT INTO {{sample}}person (name, age, mobile) SELECT '김영희', 28, '010-3333-4444' WHERE (SELECT COUNT(*) FROM {{sample}}person) < 2;

CREATE TABLE IF NOT EXISTS {{sample}}students (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
);
INSERT INTO {{sample}}students (id, name) SELECT 1, '학생1' WHERE NOT EXISTS (SELECT 1 FROM {{sample}}students WHERE id = 1);
INSERT INTO {{sample}}students (id, name) SELECT 2, '학생2' WHERE NOT EXISTS (SELECT 1 FROM {{sample}}students WHERE id = 2);

CREATE TABLE IF NOT EXISTS {{sample}}secure_member (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NULL,
  ssn       TEXT NULL,
  phone     TEXT NULL,
  phone_ai  TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_secure_member_phone_ai ON {{sample}}secure_member (phone_ai);

CREATE TABLE IF NOT EXISTS {{sample}}weight_records (
  id         INTEGER PRIMARY KEY,
  date       TEXT    NOT NULL,
  weight     REAL    NOT NULL,
  memo       TEXT    NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS {{sample}}weight_goals (
  id         INTEGER PRIMARY KEY,
  height     REAL NULL,
  min_weight REAL NULL,
  max_weight REAL NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS {{sample}}blood_pressure_records (
  id         INTEGER PRIMARY KEY,
  date       TEXT    NOT NULL,
  label      TEXT    NULL,
  systolic   INTEGER NULL,
  diastolic  INTEGER NULL,
  memo       TEXT    NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS {{sample}}blood_pressure_goals (
  id         INTEGER PRIMARY KEY,
  type       TEXT    NOT NULL UNIQUE,
  min_value  INTEGER NULL,
  max_value  INTEGER NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS {{sample}}blood_sugar_records (
  id         INTEGER PRIMARY KEY,
  date       TEXT    NOT NULL,
  label      TEXT    NULL,
  meal_time  TEXT    NULL,
  value      INTEGER NULL,
  memo       TEXT    NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS {{sample}}blood_sugar_goals (
  id         INTEGER PRIMARY KEY,
  type       TEXT    NOT NULL UNIQUE,
  min_value  INTEGER NULL,
  max_value  INTEGER NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
);
