# Legacy source-tree service installation has been replaced by verified server packages.
param([string]$Base = '', [string]$NodeExe = '', [string]$WinswUrl = '')
$ErrorActionPreference = 'Stop'
throw 'Legacy installer retired. Run npm run dist:server:win (or dist:server:win:full), then use service/install.ps1 in the generated server package. See docs/SERVER_INSTALL.md. No service was changed.'
