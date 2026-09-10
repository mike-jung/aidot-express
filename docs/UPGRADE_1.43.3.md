# 1.43.3 업그레이드

이 릴리스는 Full push 이력 처리와 앞선 Public 동기화·Linux 빌드 수정을 모두 포함합니다.
서버 API나 데이터베이스 스키마 변경은 없습니다.

## 새 폴더에서 사용

1. Full ZIP의 `aidot-express` 폴더를 원하는 새 위치에 풉니다.
2. `.env.example`을 참고해 `.env`를 만들고 기존 DB/서버 설정을 옮깁니다.
3. GitHub 설정을 넣습니다. 토큰은 실제 값으로 설정하고 파일을 공개하지 않습니다.

```dotenv
GITHUB_REPO=mike-jung/aidot-express-full
PUBLIC_REPO=mike-jung/aidot-express
GITHUB_BRANCH=main
GITHUB_TOKEN=YOUR_TOKEN
GIT_USER_NAME=YOUR_NAME
GIT_USER_EMAIL=YOUR_EMAIL
```

```powershell
npm run push -- --dry-run
npm run push
```

Git과 Node.js 22.19 이상이 필요합니다. push 스크립트는 npm 의존성 설치 없이 실행됩니다.
별도의 `git init`이나 `git pull`은 필요하지 않습니다. 기존 private 브랜치를 가져와
그 마지막 커밋 위에 새 파일 변경을 기록합니다. 원격에만 있는 파일은 보존합니다.
환경 설정·DB·로그는 배포와 커밋 대상에서 제외합니다.

## 기존 1.43.2 폴더에 적용

누적 Patch ZIP은 최초 1.43.2 Full과 이전 build/sync hotfix 적용본 모두를 지원합니다.
패치는 프로젝트 밖에 풀고 아래처럼 적용하세요.

```powershell
node .\aidot-express-1.43.3-patch\apply-patch.mjs --target "D:\path\to\aidot-express" --dry-run
node .\aidot-express-1.43.3-patch\apply-patch.mjs --target "D:\path\to\aidot-express"
```

변경 대상 파일이 사용자가 수정한 상태이면 해시 검증에서 중단합니다. 다른 파일을
덮어쓰지 않으며 백업 위치를 출력합니다. `.env`, 사용자 `workspace`, DB와 기존 Git
폴더를 교체하지 않습니다. 새 Full ZIP에는 패치를 다시 적용할 필요가 없습니다.

기존 스크립트가 만든 독립적인 첫 커밋이 이미 있으면 두 이력을 먼저 검토하세요.
`npm run push -- --link-history`는 이를 연결하되, 내용 충돌이 있으면 자동 선택하지
않고 경로와 해결 명령을 안내합니다. `--force` 옵션은 지원하지 않습니다.

Linux 설치 파일은 이 버전으로 `npm run dist:linux`를 실행해 새로 빌드합니다.
Full 소스 ZIP은 설치 프로그램이 아니며 이전 AppImage의 이름만 바꾸지 않습니다.
