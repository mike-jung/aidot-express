-- v1.2.0: users.name 컬럼 (SQLite). 자세한 설명은 ../005_users_add_name.sql
ALTER TABLE users ADD COLUMN name TEXT NULL;
