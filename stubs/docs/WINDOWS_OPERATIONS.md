# Windows installation and operation

Build the Public installer with `npm run dist:win` on Windows. NSIS installs the
application; Electron's first-run screen configures the database and ports.
Back up settings, database and workspace independently from the application files.
The default Electron profile is `%APPDATA%\Aidot Express`; changing the installation
folder alone does not create a separate data profile.

## Use an isolated profile

```powershell
& 'C:\path\Aidot Express.exe' --user-data-dir='C:\path\test-profile'
```

This profile does not automatically import the default profile's data or an older
installer's environment. Use a separate test database and ports. Login-startup
changes are disabled for custom profiles.

## Window and startup behavior

A direct launch opens the console. Closing its window hides it in the tray; use
the tray's server shutdown action to exit. `--hidden` starts in the tray.
Enable startup at Windows login explicitly through the tray checkbox. Normal
launches do not silently change an existing login-startup entry.

## Connect to an existing server

The desktop normally starts its profile's own server. To connect to an existing
Windows service instead, set its port explicitly:

```powershell
$env:AIDOT_SERVER_PORT = '7901'
& 'C:\path\Aidot Express.exe'
```

An invalid port or unavailable server produces an error. Closing the viewer does
not stop an external server. Remove that environment setting when starting a new
profile-owned server. Service scripts are in `scripts/windows`.

## Installation checks

Use a test profile to check installation, cancellation, custom paths, first-run
configuration, initial-password change, login after restart, tray behavior and
normal shutdown. Verify SQLite/Argon2 native modules, MariaDB access, port-conflict
errors and preservation of data during upgrade or removal.

Package verification checks Public files and edition markers. Test hidden feature
routes as well as menus; a checksum does not establish publisher identity or
SmartScreen trust. Compilation and HTTP tests do not prove installation or GUI
behavior on every target machine.

For a development Electron executable, run `npm ci`, `npm run electron:install`
and then `npm run electron:dev`. Workspace settings accept ordinary project-relative
folders; framework directories, absolute paths, reserved names and linked paths
are rejected. See [Build and run](BUILD_AND_RELEASE.md).
