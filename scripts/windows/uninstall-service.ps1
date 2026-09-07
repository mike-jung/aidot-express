<#
  uninstall-service.ps1 — aidot-express Windows 서비스를 내린다 (관리자 PowerShell)
#>
param([string]$Base = "")
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Base) { $Base = (Resolve-Path (Join-Path $here "..\..")).Path }
$winsw = Join-Path $Base "scripts\windows\aidot-express.exe"
if (-not (Test-Path $winsw)) { Write-Error "aidot-express.exe(WinSW) 가 없습니다. 설치된 적이 없거나 경로가 다릅니다."; exit 1 }
& $winsw stop      2>$null | Out-Null
& $winsw uninstall
Write-Host "서비스를 내렸습니다. (파일은 그대로 둡니다)"
