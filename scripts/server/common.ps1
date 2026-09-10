Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Invoke-Checked([string]$Exe, [string[]]$Arguments) {
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $Exe (exit $LASTEXITCODE)" }
}
function Assert-Administrator {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Run this command in an administrator PowerShell session.' }
}
function Get-SafeDirectory([string]$Value) {
    if (-not [IO.Path]::IsPathRooted($Value) -or $Value -match '[\x00-\x1f%]' -or $Value.StartsWith('\\')) { throw 'Use an absolute local path without control characters or percent signs.' }
    $full = [IO.Path]::GetFullPath($Value).TrimEnd('\')
    if ($full.Length -le 3) { throw 'Do not use a drive root.' }
    $current = $full
    while ($current) {
        if (Test-Path -LiteralPath $current) {
            if ((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked path is not allowed: $current" }
        }
        $next = Split-Path -Parent $current
        if ($next -eq $current) { break }
        $current = $next
    }
    return $full
}
function Assert-Under([string]$Child, [string]$Parent) {
    if (-not $Child.StartsWith($Parent.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "The directory must be inside $Parent" }
}
function Read-Release([string]$Root, [switch]$Verify) {
    $m = Get-Content -LiteralPath (Join-Path $Root 'SERVER_MANIFEST.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($m.schema -ne 1 -or $m.platform -ne 'win32' -or $m.arch -ne 'x64' -or $m.edition -notin @('public','full') -or $m.version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid Windows server manifest.' }
    $seen = @{}
    foreach ($entry in $m.files) {
        if ($entry.path -match '(^/|\\|:|[\x00-\x1f]|(^|/)\.\.?(/|$))' -or $seen.ContainsKey($entry.path)) { throw 'Unsafe or duplicate manifest path.' }
        $seen[$entry.path] = $true
        if ($Verify) {
            $file = Join-Path $Root $entry.path
            [void](Get-SafeDirectory $file)
            if (-not (Test-Path -LiteralPath $file -PathType Leaf) -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $entry.sha256) { throw "Package integrity check failed: $($entry.path)" }
        }
    }
    foreach ($required in @('runtime/node.exe','service/aidot-service.exe','app/scripts/server/run.mjs','app/scripts/server/config.mjs','app/scripts/server/health.mjs')) {
        if (-not $seen.ContainsKey($required)) { throw "Missing runtime file: $required" }
    }
    return $m
}
function Set-RestrictedTree([string]$Root, [string]$ServiceSid, [bool]$Writable) {
    $items = @((Get-Item -LiteralPath $Root -Force)) + @(Get-ChildItem -LiteralPath $Root -Recurse -Force)
    foreach ($item in $items) {
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked file in ACL target: $($item.FullName)" }
        # Preserve owner/group/audit sections; update the DACL only.
        # A blank security descriptor can unnecessarily request SeSecurityPrivilege.
        $acl = Get-Acl -LiteralPath $item.FullName
        $acl.SetAccessRuleProtection($true, $false)
        foreach ($existingRule in @($acl.Access)) { $acl.RemoveAccessRuleSpecific($existingRule) }
        $inherit = if ($item.PSIsContainer) { [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit' } else { [Security.AccessControl.InheritanceFlags]::None }
        foreach ($sid in @('S-1-5-18','S-1-5-32-544',$ServiceSid)) {
            $rights = if ($sid -eq $ServiceSid) { if ($Writable) { 'Modify' } else { 'ReadAndExecute' } } else { 'FullControl' }
            $identity = New-Object Security.Principal.SecurityIdentifier($sid)
            $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity,$rights,$inherit,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)
            [void]$acl.AddAccessRule($rule)
        }
        # Persist only the access section; PowerShell Set-Acl can also request audit privileges.
        $daclOnly = if ($item.PSIsContainer) { New-Object Security.AccessControl.DirectorySecurity } else { New-Object Security.AccessControl.FileSecurity }
        $daclOnly.SetSecurityDescriptorSddlForm($acl.GetSecurityDescriptorSddlForm([Security.AccessControl.AccessControlSections]::Access), [Security.AccessControl.AccessControlSections]::Access)
        $item.SetAccessControl($daclOnly)
    }
}
function Get-ServiceBinary([string]$Id) {
    $record = Get-CimInstance Win32_Service -Filter ("Name='" + $Id + "'") -ErrorAction Stop
    if (-not $record) { return $null }
    if ($record.PathName -notmatch '^"([^"]+\\service\\aidot-service\.exe)"$') { throw 'Existing service is not a managed Aidot server installation.' }
    if ($record.StartName -ne ('NT SERVICE\' + $Id)) { throw 'Existing service uses a custom account; review its identity before upgrading.' }
    $exe = Get-SafeDirectory $Matches[1]
    $oldRoot = Split-Path -Parent (Split-Path -Parent $exe)
    $old = Read-Release $oldRoot
    if ($Id -ne ('AidotExpressServer-' + $old.edition)) { throw 'Existing service edition does not match.' }
    return $exe
}
function Set-ServiceBinary([string]$Id, [string]$Exe) {
    $service=Get-CimInstance Win32_Service -Filter ("Name='" + $Id + "'")
    $result=Invoke-CimMethod -InputObject $service -MethodName Change -Arguments @{ PathName=('"' + $Exe + '"') }
    if ($result.ReturnValue -ne 0) { throw ('Service executable configuration failed: ' + $result.ReturnValue) }
}
function Write-ServiceXml([string]$Root, [string]$DataDir, [string]$Id) {
    $doc = New-Object Xml.XmlDocument
    $service = $doc.CreateElement('service'); [void]$doc.AppendChild($service)
    $values = [ordered]@{
        id=$Id; name=("Aidot Express Server (" + $Id.Split('-')[-1] + ")")
        description='Node.js HTTPS server with a browser console'
        executable=(Join-Path $Root 'runtime/node.exe')
        arguments=('scripts/server/run.mjs --data-dir "' + $DataDir + '"')
        workingdirectory=(Join-Path $Root 'app')
        logpath=(Join-Path $DataDir 'log/service')
        startmode='Automatic'; delayedAutoStart='true'; stoptimeout='30 sec'; stopparentprocessfirst='true'; resetfailure='1 day'
    }
    foreach ($key in $values.Keys) { $e=$doc.CreateElement($key); $e.InnerText=$values[$key]; [void]$service.AppendChild($e) }
    # SCM switches to a distinct virtual account before the service is ever started.
    $account=$doc.CreateElement('serviceaccount')
    foreach ($pair in @(@('domain','NT AUTHORITY'),@('user','LocalService'))) { $e=$doc.CreateElement($pair[0]); $e.InnerText=$pair[1]; [void]$account.AppendChild($e) }
    [void]$service.AppendChild($account)
    foreach ($delay in @('10 sec','30 sec','1 min')) { $e=$doc.CreateElement('onfailure'); $e.SetAttribute('action','restart'); $e.SetAttribute('delay',$delay); [void]$service.AppendChild($e) }
    $log=$doc.CreateElement('log'); $log.SetAttribute('mode','roll-by-size')
    foreach ($pair in @(@('sizeThreshold','10240'),@('keepFiles','8'))) { $e=$doc.CreateElement($pair[0]); $e.InnerText=$pair[1]; [void]$log.AppendChild($e) }
    [void]$service.AppendChild($log)
    $doc.Save((Join-Path $Root 'service/aidot-service.xml'))
}
