# Upgrade from 1.43.0 to 1.43.1

This maintenance update changes Enterprise HA safety behavior and rebuilds both
console editions with version 1.43.1. Public keeps disabled HA compatibility modules.
No new database schema migration is introduced by this update.

1. Stop the application/supervisor and back up source, configuration, DB and workspace.
   Apply the checksum-verifying 1.43.0-to-1.43.1 patch to the previously supplied
   Full 1.43.0 baseline, or use a fresh Full directory.
2. From 1.42.1, first follow `UPGRADE_1.43.0.md`, including authentication migrations
   and CORS changes. This incremental patch is not for an arbitrary repository commit.
3. Install locked dependencies with `npm ci` at root and in `admin-client`. Build Full
   with `npm run build:admin:full`, or Public with `npm run build:admin`. Use supported
   edition build scripts for Electron installers.
4. For Enterprise HA, replace file witness with authenticated HTTP witness or select
   manual operation without a witness. An unavailable configured witness no longer
   permits takeover; no-witness automatic promotion is disabled.
5. Deploy the new witness with persistent state and the same protected client secret.
   Do not delete ownership state to recover a startup error. Review the Full
   distribution's HA operations guide before enabling HA again.
6. Rejoin the old primary before starting its application. Confirm standby read-only
   startup, replication readiness and explicit recovery. Mixed old/new agents or
   witness implementations are not a supported rolling upgrade. Use a maintenance
   window with one controlled writer.
7. Verify login, password change, edition menus and representative business requests.
   Standby rejects administrative SQL and account changes; use the Active console.

Rollback requires stopping both agents and restoring a compatible application,
witness state and DB/configuration set under one controlled writer. Source rollback
must not reset lease ownership while a former writer remains alive.
