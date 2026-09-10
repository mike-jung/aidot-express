# Node.js server installation (1.45.0)

This distribution runs a Node.js HTTPS service with the existing browser console. Electron, Chromium and electron-builder are absent from the server package. Existing desktop build commands remain available in source distributions.

## Build on the target operating system

Use x64 Node.js 22.19 or later, including npm. Native SQLite and Argon2 modules are installed and exercised against the builder's Node.js. The same Node executable is bundled. Cross compilation is rejected: build Windows packages on Windows and Linux packages on Linux or WSL. Native build tools may be needed if an upstream prebuilt module is unavailable.

~~~powershell
npm ci --omit=dev
npm run dist:server:win
# Optional standalone NSIS installer; install NSIS and expose makensis.exe on PATH first.
npm run dist:server:win -- --installer
~~~

~~~bash
npm ci --omit=dev
npm run dist:server:linux
~~~

The console build installs its own development dependencies. The source root does not need Electron development dependencies. Outputs go to dist-server with version, edition, platform and architecture in each name. Every build uses a fresh staging directory; older outputs are never included as build inputs. Rebuilding an existing version fails without deleting it; use a new --output directory.

The ZIP/tar.gz contains app/, runtime/, service/, README.md and SERVER_MANIFEST.json. Dependencies are installed at build time; an installed service never invokes npm, Vite or an Internet download. The manifest detects changed or damaged files; it does not authenticate an unsigned package. Verify release checksums from a trusted channel. Production publishers should sign their Windows installer.

## Windows: first installation

The independent NSIS installer installs versioned server files and removal support. It does not automatically change an existing service, generate a certificate authority trusted by Windows, or migrate an existing database. Its installation directory must be inside Program Files for service registration. Configuration and service registration use the following commands in an administrator PowerShell session.

Extract the ZIP, or use the NSIS installer, so that the release root contains runtime, app and service. Use a new version directory under C:/Program Files/AidotExpressServer-public/. Configure a separate directory under C:/ProgramData/.

~~~powershell
Set-Location 'C:\Program Files\AidotExpressServer-public\1.45.0'
& .\runtime\node.exe .\app\scripts\server\config.mjs --data-dir C:/ProgramData/AidotExpressServer-public --hosts localhost,127.0.0.1,::1 --port 7901 --control-port 7902
# Inspect the generated .env; select your database and actual network interface.
notepad C:\ProgramData\AidotExpressServer-public\.env
.\service\install.ps1 -Plan
.\service\install.ps1
~~~

Initialization only accepts an empty data directory and generates a random authentication secret and a private CA/server certificate. It defaults to SQLite with samples disabled, HTTPS, loopback binding, and closed registration. For MariaDB, select --database mariadb then edit DB_HOST, DB_USER, DB_PASSWORD and DB_DATABASE before installation. Existing .env files, passwords, database files and certificates are never imported from a desktop profile automatically.

For remote access, use your actual DNS name/IP in --hosts and select --bind 0.0.0.0 (or a specific local interface). Set HTTPS_SERVER_NAME to the client-facing certificate name. Add a narrowly scoped Windows firewall rule according to your network policy. The installer does not open a firewall port.

The service runs as NT SERVICE/AidotExpressServer-public, a distinct virtual service account. Application files are read/execute only for that account; the data directory is writable. Administrators and SYSTEM retain access. Control API access remains on loopback. Missing, expired, mismatched or disabled HTTPS prevents startup. Main readiness, including database/migration state, must succeed before installation reports success.

WinSW 2.12.0 is downloaded only while building and checked against the SHA256 pinned in assets-lock.json. No executable is downloaded by the elevated installer. Changing the vendor binary requires reviewing and updating that pin. The installer first creates a stopped service, configures its virtual identity and ACLs, and only then starts it.

## Browser console and API tests

Open the HTTPS URL printed during configuration. Trust only the generated public ca.crt on authorized client devices through your organization or browser/OS certificate settings. Do not distribute server.key or the server .env. Never turn off TLS verification to use the console.

On first startup, read initial-admin-credentials.json in the protected data directory, sign in, and change the password. The bootstrap file is removed after that password change. Browser API tests use the current HTTPS origin and the application's authenticated routes; no desktop process or server private key is required on the client. The console HTTPS settings screen can rotate certificates and save TLS settings. Restart the complete Windows service after changing TLS; restarting only the worker does not change the supervisor's TLS configuration. Service mode rejects disabling HTTPS.

~~~powershell
& .\runtime\node.exe .\app\scripts\server\health.mjs --data-dir C:/ProgramData/AidotExpressServer-public --wait 30
Restart-Service AidotExpressServer-public
~~~

The health command verifies CA trust, certificate name and readiness, and only reads public CA bytes for its TLS request. It never opens the private key. The local .env is still required to identify the configured service; this command is an operator diagnostic, not a browser client.

## Upgrade and removal

Back up the database and the entire protected data directory first. Stop writes if your database backup method requires it. Install new files in a separate version directory. Run its service/install.ps1 -Upgrade with the same DataDir. It preflights configuration before stopping the old service and changes the existing SCM registration without deleting it. If startup fails, it restores the prior executable path and prior running state. It keeps both application versions and all data. Application rollback does not reverse database migrations; restore your database backup when required.

~~~powershell
.\service\install.ps1 -Upgrade -DataDir C:/ProgramData/AidotExpressServer-public
.\service\uninstall.ps1
~~~

Uninstall removes this installation's service registration and preserves configuration, keys, databases and workspace files. The NSIS uninstaller additionally removes unchanged manifest-listed application files. A newer version's service is not stopped by removing an older version. Unknown or modified application files are preserved. Do not copy an older ZIP over an installed version.

## Linux / systemd

Extract the tar.gz directly under /opt using its generated aidot-express-server-* folder name. Bash, Python 3, systemd, useradd, runuser and standard GNU utilities are required for installation. Configure with the bundled runtime before registering a service; root-owned application files and the service-owned data directory remain separate.

~~~bash
sudo ./runtime/node ./app/scripts/server/config.mjs --data-dir /var/lib/aidot-express-server-public
sudo bash ./service/install.sh /var/lib/aidot-express-server-public
sudo systemctl status aidot-express-server-public
sudo bash ./service/uninstall.sh public
~~~

The unit uses an unprivileged dedicated account, NoNewPrivileges, PrivateTmp, ProtectSystem=strict, ProtectHome and a single writable data tree. It restarts a failed process and forwards graceful shutdown to the supervisor. Linux automatic upgrades are not implemented: back up state, stop and unregister the unit, install the new version with the same data directory, then register it. Data and service accounts are preserved by removal.

## Migration and verification boundaries

Keep the old desktop profile and data until you have verified the new server. Copy only operator-selected settings, database and workspace data while both applications are stopped; update all absolute paths and regenerate or explicitly migrate certificates with appropriate ACLs. Never start both against the same SQLite file during migration. Source JS configuration under the installed app is intentionally read-only to the service; use .env and the external workspace for routine changes. Backups of external workspace assets use relative workspace paths.

Windows service registration, SCM recovery and reboot acceptance require administrator execution. A normal-user package build or HTTPS test does not prove these behaviors. WinSW/systemd recovery is local process recovery; it does not provide machine/network/database high availability. Real HA needs separate hosts, shared database/fencing design and failure-injection acceptance tests.

References: [WinSW configuration](https://github.com/winsw/winsw/blob/v2.12.0/doc/xmlConfigFile.md), [Windows service accounts](https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts), [NSIS](https://nsis.sourceforge.io/Docs/Chapter4.html), [systemd sandboxing](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html).
