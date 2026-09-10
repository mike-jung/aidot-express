param([string]$BundleRoot = (Split-Path -Parent $PSScriptRoot), [string]$DataDir = '', [switch]$Initialize, [switch]$Upgrade, [switch]$Plan)
. (Join-Path $PSScriptRoot 'common.ps1')
try {
    $root = Get-SafeDirectory $BundleRoot
    $release = Read-Release $root -Verify
    $id = 'AidotExpressServer-' + $release.edition
    if (-not $DataDir) { $DataDir = Join-Path $env:ProgramData $id }
    $DataDir = Get-SafeDirectory $DataDir
    $exe = Join-Path $root 'service/aidot-service.exe'
    $node = Join-Path $root 'runtime/node.exe'
    $app = Join-Path $root 'app'
    if ($Plan) {
        [PSCustomObject]@{ Service=$id; Version=$release.version; Executable=$node; DataDir=$DataDir; Account=("NT SERVICE\"+$id); HTTPSRequired=$true; Electron=$false } | ConvertTo-Json
        exit 0
    }
    Assert-Administrator
    Assert-Under $root $env:ProgramFiles
    Assert-Under $DataDir $env:ProgramData
    $oldExe = Get-ServiceBinary $id
    if ($oldExe -and -not $Upgrade) { throw 'The service already exists. Use a new version directory and -Upgrade after backing up your database.' }
    if ($oldExe -eq $exe) { throw 'In-place replacement is not supported. Extract the new version to a separate directory.' }
    if ($Upgrade -and -not $oldExe) { throw 'No existing managed service to upgrade.' }
    if ($Initialize -and $oldExe) { throw 'Initialization cannot be combined with an upgrade.' }
    if ($Initialize) { Invoke-Checked $node @((Join-Path $app 'scripts/server/config.mjs'),'--data-dir',$DataDir) }
    Invoke-Checked $node @((Join-Path $app 'scripts/server/config.mjs'),'--data-dir',$DataDir,'--check')
    Write-ServiceXml $root $DataDir $id
    $created = $false; $changed = $false; $wasRunning = $false; $stoppedOld = $false
    try {
        if ($oldExe) {
            $wasRunning = (Get-Service -Name $id).Status -eq 'Running'
            $stoppedOld = $true
            Stop-Service -Name $id -ErrorAction Stop
            (Get-Service -Name $id).WaitForStatus('Stopped',[TimeSpan]::FromSeconds(40))
            Set-ServiceBinary $id $exe; $changed = $true
        } else { Invoke-Checked $exe @('install'); $created=$true }
        $svc=Get-CimInstance Win32_Service -Filter ("Name='" + $id + "'")
        $accountChange=Invoke-CimMethod -InputObject $svc -MethodName Change -Arguments @{ StartName=('NT SERVICE\'+$id); StartPassword='' }
        if ($accountChange.ReturnValue -ne 0) { throw ('Virtual service account configuration failed: ' + $accountChange.ReturnValue) }
        Invoke-Checked 'sc.exe' @('sidtype',$id,'unrestricted')
        $account=New-Object Security.Principal.NTAccount('NT SERVICE',$id)
        $sid=$account.Translate([Security.Principal.SecurityIdentifier]).Value
        Set-RestrictedTree $root $sid $false
        Set-RestrictedTree $DataDir $sid $true
        Start-Service -Name $id
        Invoke-Checked $node @((Join-Path $app 'scripts/server/health.mjs'),'--data-dir',$DataDir,'--wait','60')
    } catch {
        $failure=$_
        if ($created -or $stoppedOld) {
            Stop-Service -Name $id -ErrorAction SilentlyContinue
            if ($created) { Invoke-Checked $exe @('uninstall') }
            elseif ($stoppedOld) {
                if ($changed) { Set-ServiceBinary $id $oldExe }
                if ($wasRunning) { Start-Service -Name $id }
            }
        }
        throw $failure
    }
    Write-Host "Service ready: $id. Settings and data remain in $DataDir."
    Write-Host 'Open the HTTPS URL in your browser after trusting the public CA. Database migrations are not automatically rolled back.'
    exit 0
} catch { Write-Error $_; exit 1 }
