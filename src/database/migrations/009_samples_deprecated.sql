-- 정리 대상 샘플 — `.env` 의 DB_SAMPLES=all 일 때만 만들어집니다.
--
--   person        : 목록 하나뿐 — book 이 상위 호환입니다.
--   weight_*      : 기록+목표 형태 예제.
--   blood_*       : weight 와 **구조가 거의 같습니다** (라우트 24개가 중복).
--
-- 배울 것이 겹쳐 기본에서 뺐습니다. 이미 쓰고 계시면 DB_SAMPLES=all 로 켜세요.

CREATE TABLE IF NOT EXISTS {{sample}}person (
  id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name    VARCHAR(100)    NOT NULL,
  age     INT             NULL,
  mobile  VARCHAR(30)     NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO {{sample}}person (name, age, mobile)
SELECT * FROM (SELECT '홍길동', 34, '010-1111-2222') AS s WHERE NOT EXISTS (SELECT 1 FROM {{sample}}person);
INSERT INTO {{sample}}person (name, age, mobile)
SELECT * FROM (SELECT '김영희', 28, '010-3333-4444') AS s WHERE (SELECT COUNT(*) FROM {{sample}}person) < 2;

CREATE TABLE IF NOT EXISTS {{sample}}weight_records (
  id         BIGINT        NOT NULL,
  `date`     DATE          NOT NULL,
  weight     DECIMAL(6,2)  NOT NULL,
  memo       VARCHAR(500)  NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_weight_records_date (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS {{sample}}weight_goals (
  id         BIGINT        NOT NULL,
  height     DECIMAL(6,2)  NULL,
  min_weight DECIMAL(6,2)  NULL,
  max_weight DECIMAL(6,2)  NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS {{sample}}blood_pressure_records (
  id         BIGINT        NOT NULL,
  `date`     DATE          NOT NULL,
  label      VARCHAR(50)   NULL,
  systolic   INT           NULL,
  diastolic  INT           NULL,
  memo       VARCHAR(500)  NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bp_records_date (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS {{sample}}blood_pressure_goals (
  id         BIGINT        NOT NULL,
  type       VARCHAR(30)   NOT NULL,
  min_value  INT           NULL,
  max_value  INT           NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bp_goals_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS {{sample}}blood_sugar_records (
  id         BIGINT        NOT NULL,
  `date`     DATE          NOT NULL,
  label      VARCHAR(50)   NULL,
  meal_time  VARCHAR(30)   NULL,
  `value`    INT           NULL,
  memo       VARCHAR(500)  NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bs_records_date (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS {{sample}}blood_sugar_goals (
  id         BIGINT        NOT NULL,
  type       VARCHAR(30)   NOT NULL,
  min_value  INT           NULL,
  max_value  INT           NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bs_goals_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
