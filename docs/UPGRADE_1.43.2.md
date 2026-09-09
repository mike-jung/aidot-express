# Upgrade from 1.43.1 to 1.43.2

- Workspace validation rejects framework-directory aliases, environment-line injection and linked paths on Windows and POSIX.
- Test imports use file URLs on Windows; `npm run electron:install` prepares the development binary.
- Private parent-child IPC performs graceful shutdown and cleans up orphaned Windows servers.

This update changes Windows/Electron startup behavior. It does not add a database
migration or change the HA protocol introduced in 1.43.1.

1. Stop the application and back up configuration, DB and workspace. Apply the
   checksum-verifying 1.43.1-to-1.43.2 patch or use a fresh source directory.
2. Install locked dependencies at root and in admin-client, then build the intended
   edition. Keep the Full and Public installer inputs separate.
3. Direct launches now open the console. Use `--hidden` for background startup.
   Automatic login startup is an explicit tray-menu setting; normal launches no
   longer overwrite the OS setting.
4. To connect Electron to an already running service, set `AIDOT_SERVER_PORT`
   explicitly. Otherwise Electron starts its own server using this profile.
5. A separate `--user-data-dir` profile no longer adopts legacy profile data or
   installer environment files. Migrate intended configuration explicitly.
6. Verify installation, startup, login, representative requests and normal shutdown.

Read WINDOWS_OPERATIONS.md for profile isolation and service attachment. From older
baselines, also complete the 1.43.0 authentication and 1.43.1 HA upgrade procedures.
