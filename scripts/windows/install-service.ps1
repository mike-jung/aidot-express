<#
  install-service.ps1 — aidot-express 를 Windows 서비스로 올린다 (관리자 PowerShell)

  하는 일
    1) WinSW(서비스 래퍼)를 준비한다 — 옆에 winsw.exe 가 없으면 GitHub 릴리스에서 받는다
    2) aidot-express.xml 의 %BASE% 를 실제 설치 경로로 채운다
    3) 서비스를 등록하고 시작한다
    4) SCM 복구 옵션을 건다 — 실패 시 1분 후 다시 시작 (WinSW 의 <onfailure> 와 이중으로)

  사용
    PS> Set-ExecutionPolicy -Scope Process Bypass
    PS> .\install-service.ps1 -Base "C:\aidot-express"
    (Base 를 비우면 이 스크립트가 있는 곳의 상위 폴더로 잡는다)

  전제
    · Base\node\node.exe 가 있어야 한다 (포터블 Node) — 없으면 -NodeExe 로 지정
    · Base\.env 에 운영 설정이 있어야 한다
#>
param(
  [string]$Base = "",
  [string]$NodeExe = "",
  [string]$WinswUrl = "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe"
)
$ErrorActionPreference = "Stop"

# ── 관리자 권한 확인 ─────────────────────────────────────────────
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { Write-Error "관리자 PowerShell 에서 실행하세요."; exit 1 }

# ── 경로 ───────────────────────────────────────────────────────
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Base) { $Base = (Resolve-Path (Join-Path $here "..\..")).Path }
if (-not $NodeExe) { $NodeExe = Join-Path $Base "node\node.exe" }
if (-not (Test-Path $NodeExe)) {
  $onPath = (Get-Command node -ErrorAction SilentlyContinue).Source
  if ($onPath) { $NodeExe = $onPath } else { Write-Error "node.exe 를 찾지 못했습니다: $NodeExe  (-NodeExe 로 지정하세요)"; exit 1 }
}
if (-not (Test-Path (Join-Path $Base "src\supervisor.js"))) { Write-Error "src\supervisor.js 가 없습니다: $Base"; exit 1 }
if (-not (Test-Path (Join-Path $Base ".env"))) { Write-Warning ".env 가 없습니다 — 기본 설정으로 뜹니다 (.env.example 을 복사해 두세요)" }
New-Item -ItemType Directory -Force -Path (Join-Path $Base "log\service") | Out-Null

# ── 1) WinSW 준비 ──────────────────────────────────────────────
$svcDir = Join-Path $Base "scripts\windows"
$winsw  = Join-Path $svcDir "aidot-express.exe"     # WinSW 는 exe 이름과 같은 xml 을 읽는다
if (-not (Test-Path $winsw)) {
  $local = Join-Path $svcDir "winsw.exe"
  if (Test-Path $local) { Copy-Item $local $winsw }
  else {
    Write-Host "WinSW 를 내려받습니다: $WinswUrl"
    Invoke-WebRequest -Uri $WinswUrl -OutFile $winsw -UseBasicParsing
  }
}

# ── 2) xml 의 %BASE% 를 실제 경로로 ─────────────────────────────
$tpl = Get-Content (Join-Path $svcDir "aidot-express.xml") -Raw
$xml = $tpl.Replace("%BASE%\node\node.exe", $NodeExe).Replace("%BASE%", $Base)
# MariaDB 서비스가 없으면 <depend> 를 뺀다 (없는 서비스에 의존하면 시작이 막힌다)
if (-not (Get-Service -Name MariaDB -ErrorAction SilentlyContinue)) {
  $xml = $xml -replace "\s*<depend>MariaDB</depend>", ""
  Write-Host "MariaDB 서비스가 없어 의존 관계를 뺐습니다."
}
Set-Content -Path (Join-Path $svcDir "aidot-express.xml") -Value $xml -Encoding UTF8

# ── 3) 등록 + 시작 ─────────────────────────────────────────────
$existing = Get-Service -Name aidot-express -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "이미 등록돼 있어 멈추고 다시 등록합니다."
  & $winsw stop   | Out-Null
  & $winsw uninstall | Out-Null
  Start-Sleep -Seconds 2
}
& $winsw install
if ($LASTEXITCODE -ne 0) { Write-Error "서비스 등록 실패 (exit $LASTEXITCODE)"; exit 1 }

# ── 4) SCM 복구 옵션 — 실패 시 1분 후 다시 시작 ────────────────
#   WinSW 의 <onfailure> 와 별개로 OS 수준에서도 건다. 둘 중 하나만 있어도 살아난다.
#   reset=86400 : 하루 지나면 실패 횟수를 0 으로
#   actions     : 1차·2차·3차 모두 60초 뒤 재시작
sc.exe failure aidot-express reset= 86400 actions= restart/60000/restart/60000/restart/60000 | Out-Null
sc.exe failureflag aidot-express 1 | Out-Null     # 비정상 종료뿐 아니라 "오류로 멈춤" 도 실패로 친다

& $winsw start
Start-Sleep -Seconds 3
$svc = Get-Service -Name aidot-express
Write-Host ""
Write-Host "서비스 상태 : $($svc.Status)"
Write-Host "복구 옵션   :"; sc.exe qfailure aidot-express | Select-String "RESTART|RESET|재시작|다시" | ForEach-Object { "  " + $_.Line.Trim() }
Write-Host ""
Write-Host "확인: http://localhost:7901/health/live 가 200 이면 정상입니다."
Write-Host "로그: $Base\log\service\  (서비스)  ·  $Base\log\  (앱)"
