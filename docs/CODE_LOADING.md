# 사용자 정의 Controller·Service 로딩 오류 분석 — 1.45.11

## 결론

1.45.10 소스를 기준으로 분석·재현했습니다. 로더에 `try/catch`가 없었던 것은 아닙니다.
일반적인 문법 오류와 `throw new Error(...)`는 이미 파일별로 건너뛰었습니다.
문제는 예외 값의 형태, import와 분리된 비동기 작업, 기존 코드를 교체하는 순서였습니다.
사용자가 겪은 당시의 서버 로그가 없으므로 현장 장애의 원인을 하나로 단정하지 않습니다.
아래는 소스 추적과 별도 프로세스 시험으로 확인한 재현 경로입니다.

| 원인 | 1.45.10에서 확인한 결과 | 1.45.11의 처리 |
| --- | --- | --- |
| `throw null`, `throw undefined` 후 catch에서 `e.message` 접근 | 오류를 기록하다 다시 TypeError가 발생해 디렉터리 로딩과 서버 기동까지 중단 | 모든 throw 값을 Error로 정규화하고 파일·단계·스택 기록; 다음 파일 계속 로딩 |
| import 중 `await` 없이 실행한 async 함수의 rejection | import의 catch 밖으로 빠짐. 기동 중에는 기본 Node 정책으로 종료, 기동 후에는 app의 전역 처리기가 shutdown 실행 | 로딩 시 생성한 Promise의 소유 파일을 추적해 해당 로딩 실패로 처리; 늦게 발생한 rejection도 파일을 식별해 기록 |
| 기존 라우터를 먼저 제거한 뒤 새 생성자/라우트를 생성 | 새 코드가 실패하면 기존 API까지 404. 등록 목록과 실제 라우터 상태도 달라짐 | 새 클래스·생성자·메서드·하위 경로·마운트 경로를 모두 검증한 후 교체; 실패하면 기존 라우터 유지 |
| `@Service`가 모듈 평가 도중 즉시 전역 DI를 변경 | 뒤에서 throw해도 새 factory가 남고 정상 singleton이 제거됨 | 로딩별 임시 DI 등록 후 성공 시에만 반영. 이미 사용한 서비스를 교체할 때는 새 생성자도 먼저 검증 |
| 잘못된 controller export, 누락된 decorator, 빈 routes를 `null` 반환으로 처리 | 콘솔은 await가 성공했으므로 로딩 성공으로 표시할 수 있음 | 명시적 로딩 오류. 잘못된 HTTP method나 handler도 전체 후보를 거절 |
| 디렉터리 재로딩의 고정 import URL, 단일 로딩의 `Date.now()` URL | 수정한 파일의 이전 결과/실패가 재사용되거나 같은 밀리초의 재로딩이 충돌 | 최초 부팅의 공유 helper 모듈은 유지하고, 재시도·개별 재로딩은 증가하는 세대 번호로 캐시 우회 |
| 콘솔의 파일명/basePath 변경 시 기존 파일·라우터부터 제거 | 새 코드가 실패하면 이전 파일 또는 경로까지 유실; 기존 롤백은 이름이 같을 때만 소스 재import, 메타는 미복원 | 새 로딩 성공까지 기존 파일 보존; 실패 시 변경한 소스와 메타를 원래 바이트로 복원. 기존 컨트롤러를 다시 생성하지 않음 |
| Workspace 일괄 로딩이 실패를 내부에서 삼킨 뒤 전체 수를 성공으로 계산 | 로딩 실패가 성공 건수에 포함 | 파일별 결과로 성공 건수와 오류 목록 계산 |

## 실행 경로와 수정 위치

`src/app.js`의 `main()`이 `createServer()`를 호출하고, `src/server.js`에서 서비스,
컨트롤러 순서로 기본 폴더와 workspace를 읽습니다. 콘솔의 생성·수정, 개별 올리기,
일괄 올리기 및 복구 경로도 `src/core/controllerLoader.js`의 단일 파일 로더를 이용합니다.

- `src/core/codeErrors.js`: Error가 아닌 예외 값을 안전하게 변환합니다. `throw null`이
  Express의 `next(null)`이 되어 오류가 사라지는 요청 처리 문제도 함께 수정했습니다.
- `src/core/codeLoadBoundary.js`: 로딩 경계, Promise 소유 파일 추적, 시간 제한,
  오류 목록과 로그를 관리합니다. `AsyncLocalStorage`와 `async_hooks`를 사용하며
  Promise 참조는 WeakMap으로 보관합니다.
- `src/core/container.js`: 로딩 중의 등록과 인스턴스 생성을 임시 보관합니다.
  다른 요청은 확정된 인스턴스를 계속 사용합니다. 실패한 로딩은 자신이 만든 등록만
  버리므로 동시에 진행한 다른 로딩이나 정상 요청의 캐시를 되돌리지 않습니다.
  순환 주입은 stack overflow 대신 `Circular dependency: A -> B -> A`로 진단합니다.
- `src/core/controllerLoader.js`: 후보 라우터 전체를 만든 다음 기존 위치에 교체합니다.
  basePath나 파일명이 바뀌어도 이전 경로를 성공 시점에 정리합니다.
  단일 서비스 로딩에서 아무 서비스도 등록하지 않으면 오류를 돌려줍니다.
  디렉터리의 일반 helper 모듈은 서비스 decorator 없이 사용할 수 있습니다.
- `src/app.js`: 사용자 파일을 읽기 전에 rejection 처리기를 준비합니다.
  로딩에 귀속되지 않는 rejection은 기존의 치명적 오류 정책을 유지합니다.
- `lib/admin/service/codeFileUpdate.js`, `ControllerMetaService.js`, `ServiceMetaService.js`:
  콘솔 편집의 파일/메타 복원과 이름 변경 순서를 보완했습니다. 서비스 생성 실패 시에도
  실패한 새 파일과 메타를 제거해 다음 시도가 불필요하게 409가 되지 않도록 합니다.
- `WorkspaceLoadService.js`: 실패한 파일을 성공 수에 포함하지 않고 실제 재시도합니다.

## 오류 발생 후의 동작

새 controller를 올리지 못하면 그 API는 등록되지 않습니다. 기존 controller의 재로딩이
실패하면 마지막으로 정상 등록된 API가 계속 동작합니다. 서비스 import가 실패하면
부분 등록을 남기지 않으며, 이미 사용 중인 서비스의 교체 실패는 이전 인스턴스를 유지합니다.

새 서비스는 기존과 같이 lazy 생성합니다. 처음 사용하기 전까지 모든 생성자를 실행하면
파일 순서에 따른 미등록 의존성이나 불필요한 외부 연결이 발생할 수 있기 때문입니다.
따라서 **처음 요청받을 때 발생한 서비스 생성자 오류는 해당 요청의 500 응답**으로 처리하고,
다른 API와 서버는 계속 동작합니다. 정상적인 async handler가 반환한 rejection도 요청
오류 처리기로 전달됩니다.

로딩 중 즉시 발생한 detached Promise 실패는 후보 등록을 취소합니다. 이미 로딩이 끝난
뒤 발생한 해당 비동기 작업의 rejection은 `async` 단계로 기록하고 서버를 유지합니다.
그 경우 과거 로딩을 소급 취소하거나 이미 실행한 작업을 되돌리지는 않습니다.
비동기 초기화의 성공 여부가 서비스 가동 조건이라면 반드시 `await`해야 합니다.

로그에서 `[CodeLoad]`, 종류, 파일 경로, `load`/`async`/`scan` 단계와 스택을 확인합니다.
개발 환경의 `/health/ready`에는 기존 `details.skippedFiles` 항목으로 문제 목록이 나옵니다.
여기에는 재로딩 실패와 지연된 비동기 오류도 포함되므로, 목록에 있다고 항상 현재 API가
없는 것은 아닙니다. 같은 파일의 정상 재로딩은 이전 문제를 제거합니다.
production에서는 기존 정책대로 경로·스택을 헬스 응답에 노출하지 않습니다.
일부 사용자 코드 실패만으로 정상 API 전체를 트래픽에서 빼지 않도록 readiness 정책은 유지합니다.

이 보호 기능을 켜기 위한 `.env` 설정은 **필요하지 않습니다**. 파일 하나의 async 로딩이
끝나지 않을 때 기본 30초 후 실패 처리하고 다음 파일로 진행합니다. 필요할 때만 다음을 설정합니다.

```dotenv
CODE_LOAD_TIMEOUT_MS=30000
```

양수가 아닌 값이나 잘못된 값은 기본값을 사용합니다. 시간 제한 이후 늦게 실행되는
decorator/DI 등록은 거절해, 이미 실패 처리한 파일이 나중에 전역 등록을 바꾸지 못하게 합니다.

## 보장 범위와 운영 시 주의점

이 수정은 같은 Node.js 프로세스 안에서의 **로딩 오류 처리와 등록 상태 보호**입니다.
별도 프로세스의 샌드박스가 아닙니다. 다음 상황까지 서버 생존을 보장하지 않습니다.

- `process.exit()`/`process.abort()`, native crash, 메모리 고갈, 동기 무한 루프.
- `setTimeout(() => { throw ... })` 같은 callback의 uncaught exception, 처리하지 않은
  EventEmitter `error`. 로딩의 Promise rejection과 다른 경로입니다.
- 로딩 컨텍스트 밖, 예를 들어 요청 handler에서 반환/await하지 않고 시작한 Promise의 오류.
- Node를 별도로 `--unhandled-rejections=strict` 모드로 실행한 경우의 강제 종료 정책.
  로딩 유래 rejection 처리는 프로젝트 기본 실행 명령과 Node의 기본 `throw` 모드에서 검증했습니다.
- 모듈 코드가 이미 실행한 DB 변경, 파일 삭제, 네트워크 요청, 타이머/소켓의 부작용.
  DI 롤백과 로딩 시간 제한은 이런 작업을 취소하거나 되돌리는 기능이 아닙니다.
- 직접 import한 하위 모듈 전체의 재귀적인 cache 무효화. 하위 모듈의 이전 평가 결과가
  ESM 캐시에 남아 수정이 반영되지 않는 경우에는 서버 재시작이 필요할 수 있습니다.

`uncaughtException`을 무조건 무시하도록 바꾸면 실행 상태가 손상된 채 운영될 수 있습니다.
그래서 기존 종료/감시 재기동 정책을 유지했습니다. Node.js 역시 uncaught exception 후의
정상 실행 재개를 안전하다고 보지 않습니다.
[Node.js process 문서](https://nodejs.org/docs/latest-v24.x/api/process.html#warning-using-uncaughtexception-correctly).
임의의 사용자 코드가 어떤 오류를 내더라도 호스트 프로세스가 살아 있어야 한다면 별도
프로세스 실행과 IPC로 요청/응답·DI 경계를 분리하는 추가 구조 변경이 필요합니다.

모듈 최상위 코드는 선언과 짧은 초기화 위주로 작성하고 초기화 Promise를 await하세요.
타이머/이벤트 callback은 내부에서 오류를 처리하고, 종료 시 자원을 정리하도록 작성하세요.

## 재현과 검증

Node.js 24.19.0, 잠금 파일의 실제 Express/SQLite 의존성으로 검증했습니다.
수정 전 소스에서 `throw null`의 로더 TypeError, 실패한 controller 재로딩 뒤 404,
실패한 서비스 import의 기존 인스턴스 교체, detached Promise에 의한 프로세스 종료를 재현했습니다.

```bash
npm run test:loading
npm run test:runtime -- --http-only
```

`tests/code-loading.test.mjs`와 `tests/fixtures/code-loading.mjs`는 다음을 확인합니다.

- 다양한 비-Error throw 이후에도 다음 파일 로딩 및 정상 API 응답.
- 생성자, 문법, import, decorator, handler, HTTP method, 하위 경로와 basePath 오류 시
  기존 라우터 유지; 성공한 basePath 변경과 같은 시각의 연속 재로딩.
- 실패한 DI 등록/생성자와 동시 요청의 기존 인스턴스 보존, 순환 주입 진단.
- 부팅 중/부팅 후의 로딩 유래 Promise rejection, 비동기 로딩 timeout 및 늦은 등록 거부.
- 일괄 로딩의 정확한 실패 수, 실패한 파일을 고친 뒤 재시도.
- 콘솔 수정/이름 변경 실패 시 소스·메타 복원, 기존 생성자를 다시 호출하지 않음.
- 잘못된 파일들을 포함한 실제 `src/app.js` 서버의 정상 API·health 응답과 **동일 PID 유지**,
  lazy 생성자 오류와 `throw null` 요청의 500 응답 및 정상 종료.
- 로딩에 속하지 않는 framework rejection은 여전히 비정상 종료됨.

기존 Full HTTP 회귀 시험도 121개 요청/검증을 통과했습니다. 새 로딩 시험을 포함한
관련 회귀 64개(기존 CORS·보안·handler·Public export/sync 포함)가 통과했습니다.
Public export의 실제 HTTP/HTTPS 기동·관리자 로그인·API·추적 검증 28개와
버전/문서 링크/배포 정책 검사도 통과했습니다. 두 콘솔을 1.45.11로 다시 빌드했습니다.
별도로 실행한 기존 `blocklist.test.mjs`에는 변경하지 않은 `ApiUserService.js`의
한국어 로그 5문구 때문에 영문 로그 규칙 검사가 실패하는 기존 문제가 있습니다.
이를 로더 수정의 성공으로 포함하거나 전체 `npm test`가 통과했다고 보고하지 않습니다.
