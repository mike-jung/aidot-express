# Admin DevTool 클라이언트

Vue 3 + Vite + Pinia + Bootstrap 5 + CodeMirror 6 기반의 어드민 개발도구 화면.

## 실행

```bash
# 1) 백엔드 먼저 (project/)
cd ../project
npm install
npm start                       # http://localhost:3000

# 2) 어드민 DB 마이그레이션 (한 번만)
mysql -u root -p <DB> < lib/admin/database/migrations/001_init_admin.sql

# 3) 어드민 클라이언트
cd ../admin-client
npm install
npm run dev                     # http://localhost:5174
```

## 첫 어드민 계정 만들기

`/api/admin/auth/signup` 으로 가입하거나 (1회용으로 회원가입 화면을 추가하셔도 OK), 또는 직접 SQL 로:

```bash
# 1) argon2 해시 생성
cd ../project
node -e "
const argon2 = require('argon2');
argon2.hash('Admin1234', { type: argon2.argon2id, memoryCost:19456, timeCost:2, parallelism:1 })
  .then(h => console.log(h));
"

# 2) admin_users 에 직접 INSERT (출력된 해시 사용)
# INSERT INTO admin_users (name, username, email, password_hash, role)
# VALUES ('관리자', 'admin', 'admin@example.com', '$argon2id$v=19$...', 'admin');
```

또는 curl 로 회원가입 API 직접 호출:

```bash
curl -X POST http://localhost:3000/api/admin/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"관리자","username":"admin","email":"admin@example.com","password":"Admin1234"}'
```

## 기능

- 로그인 / 로그아웃 / silent refresh
- 좌측 토글 사이드바 + 상단 타이틀바 + 로그인 사용자 표시
- **컨트롤러 관리**:
  - 페이지네이션 목록 (맨앞/이전/1~10/이후/맨뒤)
  - 신규 컨트롤러 추가
    - 이름, 기본 경로, 설명 입력
    - 라우팅 함수 동적 추가/제거 (list, listPaged, getById, create, updateName, remove, custom)
    - "코드 생성" 버튼 → CodeMirror 에디터에 컨트롤러 코드 표시
    - 에디터에서 직접 수정 가능 (color highlight, 줄번호, 세로 스크롤)
    - 저장 → 서버가 `src/controller/<n>.js` 생성 + 동적 로딩 (서버 재시작 X)
  - 수정 (코드 변경 후 핫리로드)
  - 삭제 (파일 + 라우터 모두 제거)
