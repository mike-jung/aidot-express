-- Person 테이블 테스트
-- @name: findAll
SELECT id, name, age, mobile FROM {{sample}}person ORDER BY id DESC;

-- @name: findById
SELECT id, name, age, mobile FROM {{sample}}person WHERE id = :id;

-- @name: insert
-- v1.7.6: PersonService.create() 가 이 이름을 부르는데 정의가 없어 호출 시 예외가 났다.
--   (PersonController 는 GET 만 열어 두어 HTTP 로는 도달하지 않았지만, 튜토리얼이 복사해 쓰는 샘플이다)
INSERT INTO {{sample}}person (name, age, mobile)
VALUES (:name, :age, :mobile);
