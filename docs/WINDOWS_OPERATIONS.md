# Windows 설치와 실행 — 1.43.2

## 설치와 사용자 데이터

Public은 `npm run dist:win`, Full은 `npm run dist:win:full`로 빌드한다.
NSIS가 프로그램을 설치하고 Electron 첫 실행 화면에서 DB와 포트를 설정한다.
사용자 설정·DB·workspace는 설치 파일과 분리해 백업한다. 기본 Electron 프로필은
`%APPDATA%\Aidot Express`이며 설치 경로만 바꿔도 이 프로필은 공유될 수 있다.

별도 시험 프로필이 필요하면 실행 파일에 절대 경로를 지정한다.

```powershell
& 'C:\path\Aidot Express.exe' --user-data-dir='C:\path\isolated-profile'
```

이 프로필에서는 기존 프로필·이전 설치의 환경 파일을 자동 이관하지 않으며,
로그인 자동 시작 변경도 비활성화한다. 기존 자료를 사용하려면 운영자가 명시적으로
이관한다. 시험 DB와 서비스 포트를 별도로 사용하고 운영 DB에 시험 계정을 만들지 않는다.

## 창과 자동 시작

직접 실행하면 콘솔 창을 연다. 창 닫기는 트레이로 숨기며, 종료는 트레이의
`서버 종료`를 사용한다. `--hidden` 실행은 트레이에서 대기한다.

로그인 시 자동 시작은 트레이의 체크 항목으로 직접 선택한다. 앱을 실행할 때마다
자동 시작을 강제로 등록하지 않는다. 별도 시험 프로필에서는 이 항목을 바꿀 수 없다.
기존 자동 시작 등록은 실행만으로 삭제하거나 덮어쓰지 않는다.

## 이미 실행 중인 서버에 연결

기본 실행은 이 프로필의 서버를 시작한다. 기본 포트에서 응답하는 다른 서버에
자동으로 연결하지 않는다. Windows 서비스 등 기존 서버에 붙을 때만 명시한다.

```powershell
$env:AIDOT_SERVER_PORT = '7901'
& 'C:\path\Aidot Express.exe'
```

명시한 포트가 잘못되었거나 서버가 응답하지 않으면 오류를 표시한다. 연결한 외부
서버는 창을 종료해도 정지시키지 않는다. 이 값은 현재 프로세스의 환경 설정이며,
새 서버를 실행할 때는 제거한다.

## 설치 인수 확인

설치 파일 해시·버전·에디션을 기록하고 신규 시험 프로필에서 다음을 확인한다.

- 설치 취소·정상 완료·사용자 지정 경로·최초 설정
- 초기 비밀번호 변경, 제한 사용자 권한, 재시작 후 로그인
- Full/Public 메뉴 및 직접 URL/API의 에디션 경계
- 콘솔 표시·최소화·트레이 복원·정상 종료·해당 자식 프로세스 정리 (Windows도 IPC로 정상 종료하며 부모 프로세스 비정상 종료를 감지)
- 시험용 이전 버전의 설정·DB·workspace 보존과 제거 동작
- 네이티브 SQLite·Argon2, MariaDB 연결, 포트 충돌 오류

HTTP 시험과 Vue 컴파일은 실제 화면 조작 또는 NSIS 설치 검증을 대신하지 않는다.
코드 서명·SmartScreen 신뢰는 파일 해시와 별도 검증 항목이다.

참고: [Electron app 경로](https://www.electronjs.org/docs/latest/api/app),
[electron-builder NSIS](https://www.electron.build/docs/nsis/).

## 개발용 Electron 설치

`npm ci` 이후 `npm run electron:install`로 잠긴 Electron 버전에 맞는 실행 바이너리를 설치한 뒤 `npm run electron:dev`를 실행한다. Electron 43의 npm 패키지는 바이너리 설치 명령을 별도로 제공한다. 설치 파일 빌드 시에는 electron-builder가 대상 플랫폼의 바이너리를 준비한다.

작업 폴더를 설정 화면에서 변경할 때는 프로젝트 안의 일반 폴더를 상대 경로로 지정한다. Windows 역슬래시는 슬래시로 정규화한다. 프레임워크 폴더, 절대 경로, 숨김 폴더, 예약 이름, 링크·junction 및 설정 파일 구문에 영향을 주는 문자는 거부한다.
