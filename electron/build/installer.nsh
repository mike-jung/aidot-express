; ============================================================
;  Aidot Express — 인스톨러 커스텀 스크립트 (electron-builder NSIS)
;
;  기능:
;    - 설치 경로 변경 (allowToChangeInstallationDirectory)
;    - 페이지 1: 서버 포트 설정 (메인 7901, 컨트롤 7902)
;    - 페이지 2: 데이터베이스 설정 (종류, 호스트, 포트, 사용자, 비밀번호, DB명)
;    - 입력값 검증 (포트 범위, DB 필수 필드)
;    - 설치 시 {InstallDir}\resources\.env 전체 작성 (포트 + DB + 인증/로그/MCI 기본값)
;    - 언인스톨 시 .env 삭제
;
;  배경: package.json 의 files 에서 .env 가 번들 제외되므로, Electron 설치본은
;  반드시 자체 .env 를 가져야 한다. 그 파일을 인스톨러가 책임지고 작성한다.
;
;  NSIS 주의사항:
;    1. electron-builder 가 installer + uninstaller 를 두 패스로 빌드한다.
;       BUILD_UNINSTALLER 가 정의된 패스에서는 customWelcomePage 가 expand 안 됨.
;       → 포트/DB 관련 Function 을 !ifndef BUILD_UNINSTALLER 로 감싼다.
;    2. LogicLib / nsDialogs 매크로 사용을 위해 nsDialogs.nsh 를 명시적 include
;       (!ifndef 가드 덕분에 electron-builder 기본 스크립트와 중복 시에도 안전).
;    3. MUI_HEADER_TEXT 는 top-level Function 에서 쓰면 파싱 순서 문제로 에러.
;       → 라벨 + Page sub-caption 으로 대체.
; ============================================================

!include "nsDialogs.nsh"

!ifndef BUILD_UNINSTALLER

  ; ========= 전역 변수 (포트) =========
  Var PortMain
  Var PortControl
  Var PortMainInput
  Var PortControlInput
  Var PortConfigDialog

  ; ========= 전역 변수 (DB) =========
  Var DbType
  Var DbHost
  Var DbPort
  Var DbUser
  Var DbPassword
  Var DbDatabase
  Var DbTypeInput
  Var DbHostInput
  Var DbPortInput
  Var DbUserInput
  Var DbPasswordInput
  Var DbDatabaseInput
  Var DbConfigDialog

  Var ValidateResult

  !define DEFAULT_PORT_MAIN    "7901"
  !define DEFAULT_PORT_CONTROL "7902"
  !define DEFAULT_DB_TYPE      "mariadb"
  !define DEFAULT_DB_HOST      "localhost"
  !define DEFAULT_DB_PORT      "3306"
  !define DEFAULT_DB_USER      "root"
  !define DEFAULT_DB_DATABASE  "aidot_express"

  ; ============================================================
  ; preInit — .OnInit 맨 앞. 전역 변수 초기화.
  ; ============================================================

  !macro preInit
    StrCpy $PortMain    "${DEFAULT_PORT_MAIN}"
    StrCpy $PortControl "${DEFAULT_PORT_CONTROL}"
    StrCpy $DbType      "${DEFAULT_DB_TYPE}"
    StrCpy $DbHost      "${DEFAULT_DB_HOST}"
    StrCpy $DbPort      "${DEFAULT_DB_PORT}"
    StrCpy $DbUser      "${DEFAULT_DB_USER}"
    StrCpy $DbPassword  ""
    StrCpy $DbDatabase  "${DEFAULT_DB_DATABASE}"
  !macroend

  ; ============================================================
  ; customPageAfterChangeDir — 설치 경로 선택 후 포트/DB 페이지 삽입
  ;
  ; 주의: 'customWelcomePage' 매크로를 쓰면 electron-builder 가 Welcome 페이지를
  ; 통째로 "대체" 한다 (이름은 오해의 소지가 있지만 공식 문서가 그렇게 정의).
  ; 그래서 기본 Welcome 화면이 사라지고 바로 커스텀 페이지가 첫 화면으로 뜬다.
  ;
  ; 반면 'customPageAfterChangeDir' 는 디렉토리 선택 페이지 직후에 새 페이지를 '추가'한다.
  ; 최종 페이지 순서:
  ;   Welcome → License(없음) → ChangeDir(설치 경로) → PortConfig → DbConfig → Install → Finish
  ; ============================================================

  !macro customPageAfterChangeDir
    Page custom PortConfigPageCreate PortConfigPageLeave ": 서버 포트 설정"
    Page custom DbConfigPageCreate   DbConfigPageLeave   ": 데이터베이스 설정"
  !macroend

  ; ============================================================
  ; 페이지 1: 포트 설정
  ; ============================================================

  Function PortConfigPageCreate
    nsDialogs::Create 1018
    Pop $PortConfigDialog
    ${If} $PortConfigDialog == error
      Abort
    ${EndIf}

    ${If} $PortMain == ""
      StrCpy $PortMain "${DEFAULT_PORT_MAIN}"
    ${EndIf}
    ${If} $PortControl == ""
      StrCpy $PortControl "${DEFAULT_PORT_CONTROL}"
    ${EndIf}

    ${NSD_CreateLabel} 0 0u 100% 14u "서버 포트 설정"
    Pop $0
    CreateFont $1 "$(^Font)" "11" "700"
    SendMessage $0 ${WM_SETFONT} $1 0

    ${NSD_CreateLabel} 0 18u 100% 24u "Aidot Express 가 사용할 네트워크 포트를 확인하세요.$\r$\n다른 프로그램과 충돌하는 경우에만 기본값을 변경하세요 (1024~65535)."
    Pop $0

    ${NSD_CreateLabel} 0 50u 40% 12u "메인 서버 포트"
    Pop $0
    ${NSD_CreateLabel} 0 62u 60% 10u "admin-client UI 와 API 가 이 포트를 사용합니다."
    Pop $0
    ${NSD_CreateNumber} 45% 48u 20% 14u "$PortMain"
    Pop $PortMainInput

    ${NSD_CreateLabel} 0 86u 40% 12u "컨트롤 서버 포트"
    Pop $0
    ${NSD_CreateLabel} 0 98u 60% 10u "서버 재시작 등 관리 API 가 이 포트를 사용합니다."
    Pop $0
    ${NSD_CreateNumber} 45% 84u 20% 14u "$PortControl"
    Pop $PortControlInput

    ${NSD_CreateButton} 0 120u 30% 14u "기본값 복원"
    Pop $0
    ${NSD_OnClick} $0 PortConfigRestoreDefault

    ${NSD_CreateLabel} 0 142u 100% 20u "※ 설치 후 resources\.env 파일을 편집해 언제든 변경할 수 있습니다 (앱 재시작 필요)."
    Pop $0

    nsDialogs::Show
  FunctionEnd

  Function PortConfigRestoreDefault
    ${NSD_SetText} $PortMainInput    "${DEFAULT_PORT_MAIN}"
    ${NSD_SetText} $PortControlInput "${DEFAULT_PORT_CONTROL}"
  FunctionEnd

  Function PortConfigPageLeave
    ${NSD_GetText} $PortMainInput    $PortMain
    ${NSD_GetText} $PortControlInput $PortControl

    Push $PortMain
    Call ValidatePort
    Pop $ValidateResult
    ${If} $ValidateResult != "1"
      MessageBox MB_OK|MB_ICONEXCLAMATION "메인 서버 포트 값이 올바르지 않습니다.$\r$\n1024 이상 65535 이하의 숫자를 입력하세요."
      Abort
    ${EndIf}

    Push $PortControl
    Call ValidatePort
    Pop $ValidateResult
    ${If} $ValidateResult != "1"
      MessageBox MB_OK|MB_ICONEXCLAMATION "컨트롤 서버 포트 값이 올바르지 않습니다.$\r$\n1024 이상 65535 이하의 숫자를 입력하세요."
      Abort
    ${EndIf}

    ${If} $PortMain == $PortControl
      MessageBox MB_OK|MB_ICONEXCLAMATION "메인 서버 포트와 컨트롤 서버 포트는 달라야 합니다."
      Abort
    ${EndIf}
  FunctionEnd

  ; ============================================================
  ; 페이지 2: DB 설정
  ; ============================================================

  Function DbConfigPageCreate
    nsDialogs::Create 1018
    Pop $DbConfigDialog
    ${If} $DbConfigDialog == error
      Abort
    ${EndIf}

    ${If} $DbType == ""
      StrCpy $DbType "${DEFAULT_DB_TYPE}"
    ${EndIf}
    ${If} $DbHost == ""
      StrCpy $DbHost "${DEFAULT_DB_HOST}"
    ${EndIf}
    ${If} $DbPort == ""
      StrCpy $DbPort "${DEFAULT_DB_PORT}"
    ${EndIf}
    ${If} $DbUser == ""
      StrCpy $DbUser "${DEFAULT_DB_USER}"
    ${EndIf}
    ${If} $DbDatabase == ""
      StrCpy $DbDatabase "${DEFAULT_DB_DATABASE}"
    ${EndIf}

    ${NSD_CreateLabel} 0 0u 100% 14u "데이터베이스 설정"
    Pop $0
    CreateFont $1 "$(^Font)" "11" "700"
    SendMessage $0 ${WM_SETFONT} $1 0

    ${NSD_CreateLabel} 0 16u 100% 20u "Aidot Express 가 사용할 데이터베이스 접속 정보를 입력하세요.$\r$\n'sqlite' 를 선택하면 외부 DB 없이 내장 파일 DB(SQLite)에 데이터가 저장됩니다."
    Pop $0

    ; DB 종류
    ${NSD_CreateLabel} 0 42u 30% 12u "DB 종류"
    Pop $0
    ${NSD_CreateDropList} 32% 40u 30% 14u ""
    Pop $DbTypeInput
    ${NSD_CB_AddString} $DbTypeInput "mariadb"
    ${NSD_CB_AddString} $DbTypeInput "mysql"
    ${NSD_CB_AddString} $DbTypeInput "oracle"
    ${NSD_CB_AddString} $DbTypeInput "sqlite"
    ${NSD_CB_SelectString} $DbTypeInput "$DbType"
    ; DB 종류 변경 시 host/port/user/password/database 입력을 활성/비활성 토글
    ${NSD_OnChange} $DbTypeInput DbTypeChanged

    ; 호스트
    ${NSD_CreateLabel} 0 60u 30% 12u "호스트"
    Pop $0
    ${NSD_CreateText} 32% 58u 50% 14u "$DbHost"
    Pop $DbHostInput

    ; 포트
    ${NSD_CreateLabel} 0 78u 30% 12u "포트"
    Pop $0
    ${NSD_CreateNumber} 32% 76u 20% 14u "$DbPort"
    Pop $DbPortInput

    ; 사용자
    ${NSD_CreateLabel} 0 96u 30% 12u "사용자"
    Pop $0
    ${NSD_CreateText} 32% 94u 50% 14u "$DbUser"
    Pop $DbUserInput

    ; 비밀번호
    ${NSD_CreateLabel} 0 114u 30% 12u "비밀번호"
    Pop $0
    ${NSD_CreatePassword} 32% 112u 50% 14u "$DbPassword"
    Pop $DbPasswordInput

    ; 데이터베이스명
    ${NSD_CreateLabel} 0 132u 30% 12u "데이터베이스"
    Pop $0
    ${NSD_CreateText} 32% 130u 50% 14u "$DbDatabase"
    Pop $DbDatabaseInput

    ${NSD_CreateButton} 0 152u 30% 14u "기본값 복원"
    Pop $0
    ${NSD_OnClick} $0 DbConfigRestoreDefault

    ${NSD_CreateLabel} 0 172u 100% 10u "※ 설치 후 resources\.env 파일 편집으로 언제든 변경 가능합니다."
    Pop $0

    ; 초기 선택 값에 맞춰 접속 정보 입력을 활성/비활성 (sqlite 기본이면 비활성)
    Push $0
    Call DbTypeChanged

    nsDialogs::Show
  FunctionEnd

  Function DbConfigRestoreDefault
    ${NSD_CB_SelectString} $DbTypeInput "${DEFAULT_DB_TYPE}"
    ${NSD_SetText} $DbHostInput         "${DEFAULT_DB_HOST}"
    ${NSD_SetText} $DbPortInput         "${DEFAULT_DB_PORT}"
    ${NSD_SetText} $DbUserInput         "${DEFAULT_DB_USER}"
    ${NSD_SetText} $DbPasswordInput     ""
    ${NSD_SetText} $DbDatabaseInput     "${DEFAULT_DB_DATABASE}"
  FunctionEnd

  Function DbConfigPageLeave
    ${NSD_GetText} $DbTypeInput     $DbType
    ${NSD_GetText} $DbHostInput     $DbHost
    ${NSD_GetText} $DbPortInput     $DbPort
    ${NSD_GetText} $DbUserInput     $DbUser
    ${NSD_GetText} $DbPasswordInput $DbPassword
    ${NSD_GetText} $DbDatabaseInput $DbDatabase

    ; sqlite 는 외부 DB 입력 검증 전부 생략 — 내장 파일 DB 라 접속정보 불필요
    ${If} $DbType == "sqlite"
      Return
    ${EndIf}

    ${If} $DbHost == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "DB 호스트를 입력해주세요."
      Abort
    ${EndIf}
    ${If} $DbUser == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "DB 사용자를 입력해주세요."
      Abort
    ${EndIf}

    Push $DbPort
    Call ValidatePort
    Pop $ValidateResult
    ${If} $ValidateResult != "1"
      MessageBox MB_OK|MB_ICONEXCLAMATION "DB 포트가 올바르지 않습니다.$\r$\n1024 이상 65535 이하의 숫자를 입력하세요."
      Abort
    ${EndIf}

    ; mariadb / mysql 은 database 명 필수
    ${If} $DbType == "mariadb"
    ${OrIf} $DbType == "mysql"
      ${If} $DbDatabase == ""
        MessageBox MB_OK|MB_ICONEXCLAMATION "$DbType 에서는 데이터베이스 이름이 필요합니다."
        Abort
      ${EndIf}
    ${EndIf}
  FunctionEnd

  ; ============================================================
  ; DbTypeChanged — 드롭다운 변경 시 host/port/user/password/database 입력 토글
  ;   sqlite 선택 시: 모든 접속 정보 입력 비활성 (내장 DB 라 불필요)
  ;   그 외:          모든 접속 정보 입력 활성
  ; ============================================================

  Function DbTypeChanged
    Pop $0  ; handle (무시)
    ${NSD_GetText} $DbTypeInput $DbType

    ${If} $DbType == "sqlite"
      EnableWindow $DbHostInput     0
      EnableWindow $DbPortInput     0
      EnableWindow $DbUserInput     0
      EnableWindow $DbPasswordInput 0
      EnableWindow $DbDatabaseInput 0
    ${Else}
      EnableWindow $DbHostInput     1
      EnableWindow $DbPortInput     1
      EnableWindow $DbUserInput     1
      EnableWindow $DbPasswordInput 1
      EnableWindow $DbDatabaseInput 1
    ${EndIf}
  FunctionEnd

  ; ============================================================
  ; ValidatePort — 숫자 & 범위(1024~65535) 검증
  ;   Stack in:  포트 문자열
  ;   Stack out: "1"=valid / "0"=invalid
  ; ============================================================

  Function ValidatePort
    Exch $R0
    Push $R1
    Push $R2

    ${If} $R0 == ""
      StrCpy $R1 "0"
      Goto ValidateDone
    ${EndIf}

    IntOp $R1 $R0 + 0
    ${If} $R1 < 1024
      StrCpy $R1 "0"
      Goto ValidateDone
    ${EndIf}
    ${If} $R1 > 65535
      StrCpy $R1 "0"
      Goto ValidateDone
    ${EndIf}

    IntFmt $R2 "%d" $R1
    ${If} $R0 != $R2
      StrCpy $R1 "0"
      Goto ValidateDone
    ${EndIf}

    StrCpy $R1 "1"

    ValidateDone:
    Pop $R2
    Exch $R1
    Exch
    Pop $R0
  FunctionEnd

  ; ============================================================
  ; customInstall — 설치 완료 후 .env 전체 작성
  ;
  ; 인스톨러 페이지에서 받은 값 (포트, DB) + 나머지 필수 기본값을
  ; 모두 resources\.env 에 기록한다. 사용자는 필요 시 이 파일을
  ; 직접 편집하여 AUTH 시크릿, MCI 접속 등을 조정할 수 있다.
  ; ============================================================

  !macro customInstall
    ; 혹시 페이지가 스킵됐을 가능성 대비하여 기본값 보장
    ${If} $PortMain == ""
      StrCpy $PortMain "${DEFAULT_PORT_MAIN}"
    ${EndIf}
    ${If} $PortControl == ""
      StrCpy $PortControl "${DEFAULT_PORT_CONTROL}"
    ${EndIf}
    ${If} $DbType == ""
      StrCpy $DbType "${DEFAULT_DB_TYPE}"
    ${EndIf}
    ${If} $DbHost == ""
      StrCpy $DbHost "${DEFAULT_DB_HOST}"
    ${EndIf}
    ${If} $DbPort == ""
      StrCpy $DbPort "${DEFAULT_DB_PORT}"
    ${EndIf}
    ${If} $DbUser == ""
      StrCpy $DbUser "${DEFAULT_DB_USER}"
    ${EndIf}
    ${If} $DbDatabase == ""
      StrCpy $DbDatabase "${DEFAULT_DB_DATABASE}"
    ${EndIf}

    DetailPrint "설정 저장: port=$PortMain control=$PortControl db=$DbType@$DbHost:$DbPort/$DbDatabase"

    ; .env 는 userData (Roaming) 에만 쓴다. resources/.env 는 쓰지 않음.
    ;   - Roaming (%APPDATA%\Aidot Express\) 은 사용자 쓰기 공간, 업그레이드 시 보존
    ;   - resources/ (Program Files 하위) 는 읽기 전용이어야 하며 앱 재설치 시 덮어씌워짐
    ; 두 위치에 파일이 있으면 사용자가 혼란스러워 할 수 있어서 단일 소스로 통일한다.

    StrCpy $1 "$APPDATA\Aidot Express"
    CreateDirectory "$1"

    ClearErrors
    FileOpen $0 "$1\.env" w
    ${If} ${Errors}
      MessageBox MB_OK|MB_ICONEXCLAMATION "경고: 사용자 설정 디렉토리에 .env 파일을 쓸 수 없습니다.$\r$\n경로: $1\.env"
      DetailPrint "경고: userData\.env 쓰기 실패"
    ${Else}
      Call WriteBOM
      Call WriteEnvContent
      FileClose $0
      DetailPrint "저장 완료: $1\.env  (canonical 설정 파일)"
    ${EndIf}

    ; 이전 설치본에서 남아있을 수 있는 resources\.env 는 제거해서 혼란 방지
    IfFileExists "$INSTDIR\resources\.env" 0 WriteEnvDone
      Delete "$INSTDIR\resources\.env"
      DetailPrint "정리: $INSTDIR\resources\.env 제거됨 (userData 단일화)"

    Goto WriteEnvDone

  WriteEnvDone:
  !macroend

  ; ============================================================
  ; WriteBOM — BOM 3바이트 (UTF-8) 기록. 하지만 electron-builder 의 Unicode NSIS 는
  ; FileWrite 를 UTF-16LE 로 내보내므로 실제로는 FE FF (UTF-16BE) 가 맞거나 또는
  ; NSIS 가 자동 BOM 을 붙이기도 한다. 여기선 안전하게 아무것도 쓰지 않음.
  ;
  ; 핵심 우회법: 본문을 전부 ASCII 로 유지하면 어떤 인코딩으로 저장되든 dotenv 가 파싱 가능.
  ; 단 사용자 입력값 (DB_PASSWORD 등) 은 ASCII 만 권장한다.
  ; ============================================================

  Function WriteBOM
    ; no-op — 본문이 ASCII 이면 BOM 없이도 UTF-8 호환
  FunctionEnd

  ; ============================================================
  ; WriteEnvContent — $0 에 열려있는 파일 핸들에 .env 내용 기록.
  ; 한글 주석을 제거하고 ASCII 만 사용 → NSIS 의 CP949 인코딩 문제 우회.
  ; ============================================================

  Function WriteEnvContent
      FileWrite $0 "# Aidot Express - Installer generated config$\r$\n"
      FileWrite $0 "# Edit this file directly to adjust settings.$\r$\n"
      FileWrite $0 "# After changing values, restart the server from the tray menu.$\r$\n"
      FileWrite $0 "$\r$\n"
      FileWrite $0 "NODE_ENV=production$\r$\n"
      FileWrite $0 "PORT=$PortMain$\r$\n"
      FileWrite $0 "CONTROL_PORT=$PortControl$\r$\n"
      FileWrite $0 "$\r$\n"
      FileWrite $0 "# ===== Database =====$\r$\n"
      FileWrite $0 "DB_TYPE=$DbType$\r$\n"
      ${If} $DbType == "sqlite"
        FileWrite $0 "# SQLite embedded DB. DB_FILE defaults to Electron userData/app.db.$\r$\n"
        FileWrite $0 "# To pin the path, uncomment and set an absolute path:$\r$\n"
        FileWrite $0 "# DB_FILE=C:\\ProgramData\\AidotExpress\\app.db$\r$\n"
      ${Else}
        FileWrite $0 "DB_HOST=$DbHost$\r$\n"
        FileWrite $0 "DB_PORT=$DbPort$\r$\n"
        FileWrite $0 "DB_USER=$DbUser$\r$\n"
        FileWrite $0 "DB_PASSWORD=$DbPassword$\r$\n"
        FileWrite $0 "DB_DATABASE=$DbDatabase$\r$\n"
        FileWrite $0 "DB_CONN_LIMIT=10$\r$\n"
        FileWrite $0 "# Keep configured DB type on connection failure (do NOT silently fallback to sqlite).$\r$\n"
        FileWrite $0 "DB_FALLBACK_TO_SQLITE=false$\r$\n"
      ${EndIf}
      FileWrite $0 "$\r$\n"
      FileWrite $0 "# ===== Auth =====$\r$\n"
      FileWrite $0 "# Security: replace AUTH_ACCESS_SECRET below with a random 32+ char string.$\r$\n"
      FileWrite $0 "# Generator: node -e $\"console.log(require('crypto').randomBytes(48).toString('base64'))$\"$\r$\n"
      FileWrite $0 "AUTH_ACCESS_SECRET=CHANGE_ME_to_a_strong_random_secret_of_at_least_32_chars_please$\r$\n"
      FileWrite $0 "AUTH_ACCESS_TTL=15m$\r$\n"
      FileWrite $0 "AUTH_REFRESH_TTL=1h$\r$\n"
      FileWrite $0 "AUTH_COOKIE_SECURE=false$\r$\n"
      FileWrite $0 "$\r$\n"
      FileWrite $0 "# ===== Logging =====$\r$\n"
      FileWrite $0 "LOG_LEVEL=info$\r$\n"
      FileWrite $0 "LOG_SQL=false$\r$\n"
      FileWrite $0 "LOG_ADMIN=false$\r$\n"
      FileWrite $0 "$\r$\n"
      FileWrite $0 "ACCESS_MAX_RECORDS=1000000$\r$\n"
      FileWrite $0 "METRICS_MAX_RECORDS=500000$\r$\n"
      FileWrite $0 "METRICS_RETENTION_DAYS=30$\r$\n"
      FileWrite $0 "$\r$\n"
      FileWrite $0 "# CORS$\r$\n"
      FileWrite $0 "CORS_ORIGIN=*$\r$\n"
      FileWrite $0 "$\r$\n"
      FileWrite $0 "# ===== MCI code generator =====$\r$\n"
      FileWrite $0 "MCI_GENERATOR_ENABLED=true$\r$\n"
      FileWrite $0 "$\r$\n"
      FileWrite $0 "# ===== MCI connection (optional) =====$\r$\n"
      FileWrite $0 "# 미설정 시 app default 적용: host=localhost, port=7101 (Mock MCI 서버).$\r$\n"
      FileWrite $0 "# 운영 환경 등에서 다른 MCI 서버를 사용할 경우 아래 주석을 풀고 값 수정.$\r$\n"
      FileWrite $0 "# MCI_HOST=10.0.1.50$\r$\n"
      FileWrite $0 "# MCI_PORT=9999$\r$\n"
      FileWrite $0 "# MCI_TIMEOUT_MS=10000$\r$\n"
      FileWrite $0 "$\r$\n"
      FileWrite $0 "# MCI pool tuning$\r$\n"
      FileWrite $0 "MCI_POOL_MODE=per-request$\r$\n"
      FileWrite $0 "MCI_POOL_MAX=20$\r$\n"
      FileWrite $0 "MCI_POOL_ACQUIRE_TIMEOUT_MS=5000$\r$\n"
      FileWrite $0 "MCI_POOL_IDLE_TIMEOUT_MS=30000$\r$\n"
  FunctionEnd

!endif  ; !ifndef BUILD_UNINSTALLER

; ============================================================
; customUnInstall — 언인스톨 시 .env 삭제 (두 위치 다)
; (uninstaller 빌드에서 사용되므로 BUILD_UNINSTALLER 가드 바깥)
; ============================================================

!macro customUnInstall
  Delete "$INSTDIR\resources\.env"
  ; userData 쪽은 기본적으로 보존 (사용자 설정이 담겨있을 수 있음).
  ; 완전 제거를 원하면 아래 주석 해제:
  ; Delete "$APPDATA\Aidot Express\.env"
  ; RMDir  "$APPDATA\Aidot Express"
!macroend
