param([string]$BundleRoot=(Split-Path -Parent $PSScriptRoot), [switch]$RemoveFiles)
. (Join-Path $PSScriptRoot 'common.ps1')
try {
    Assert-Administrator
    $root=Get-SafeDirectory $BundleRoot
    Assert-Under $root $env:ProgramFiles
    $release=Read-Release $root
    $id='AidotExpressServer-'+$release.edition
    $expected=Join-Path $root 'service/aidot-service.exe'
    $active=Get-ServiceBinary $id
    if ($active -eq $expected) {
        Stop-Service -Name $id -ErrorAction Stop
        (Get-Service -Name $id).WaitForStatus('Stopped',[TimeSpan]::FromSeconds(40))
        Invoke-Checked $expected @('uninstall')
    } elseif ($active) { Write-Host 'A newer version owns the service; it remains running.' }
    if ($RemoveFiles) {
        foreach ($file in $release.files) {
            $abs=Join-Path $root $file.path
            if ((Test-Path -LiteralPath $abs -PathType Leaf) -and (Get-FileHash -LiteralPath $abs -Algorithm SHA256).Hash -eq $file.sha256) { Remove-Item -LiteralPath $abs }
        }
        Remove-Item -LiteralPath (Join-Path $root 'SERVER_MANIFEST.json') -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath (Join-Path $root 'service/aidot-service.xml') -ErrorAction SilentlyContinue
        Get-ChildItem -LiteralPath $root -Directory -Recurse | Sort-Object { $_.FullName.Length } -Descending | ForEach-Object {
            if (-not @(Get-ChildItem -LiteralPath $_.FullName -Force).Count) { Remove-Item -LiteralPath $_.FullName }
        }
    }
    Write-Host 'Service removal finished. Configuration, certificates, databases and workspaces are preserved.'
    exit 0
} catch { Write-Error $_; exit 1 }
