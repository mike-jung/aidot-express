# Release 1.43.3

Full source publication now connects fresh extractions to the existing private repository history.
Read [the upgrade guide](docs/UPGRADE_1.43.3.md). This release includes the Public sync and Linux artifact isolation fixes.

# Release notes

- Workspace validation rejects framework-directory aliases, environment-line injection and linked paths on Windows and POSIX.
- Test imports use file URLs on Windows; `npm run electron:install` prepares the development binary.
- Private parent-child IPC performs graceful shutdown and cleans up orphaned Windows servers.

## v1.43.2 — Explicit desktop startup and isolated Windows profiles

Direct launches open the console. Login startup is opt-in through the tray menu.
Electron connects to an existing service only when AIDOT_SERVER_PORT is specified.
Custom profiles preserve separation from existing user data and installer configuration.
Read `docs/UPGRADE_1.43.2.md` before updating.

## v1.43.1 — HA lease and database transition hardening

A failed DB promotion no longer reports Active. Standby startup confirms read-only
state, configured witness failures deny takeover, and HTTP writes check lease expiry
even before the next timer. Witness state now survives restart. File witness is
refused; no-witness automatic takeover is disabled.

A real local two-MariaDB replication harness passed 21 scenarios. This is not a
two-machine fencing certification or a Windows installer/GUI test. Review
`docs/UPGRADE_1.43.1.md` and, for Enterprise deployment, `docs/HA_OPERATIONS.md`.

## v1.43.0 — Security boundaries and reliable edition builds

Refresh tokens now rotate atomically. Account and password changes revoke old sessions
across restarts. Initial administrator passwords must be changed before protected
console APIs can be used.

Browser requests use exact trusted origins. Electron validates IPC senders and setup
values. Public installers use the same distribution policy as public source exports,
without modifying full sources. Each console bundle carries an edition/version marker.

HTTP limits, URL redaction and backup restore checks have also been strengthened.

Before upgrading, read `docs/UPGRADE_1.43.0.md`. Replace wildcard CORS settings with exact
origins, stop the server, back up the database and apply the new migrations. Password
changes reauthenticate the current console and invalidate other sessions.

## v1.42.1 — Supplied baseline

Baseline for the 1.43.0 upgrade. See the current operation and upgrade guides for
supported behavior and verification instructions.
