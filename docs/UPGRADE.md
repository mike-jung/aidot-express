# Upgrade the Public edition

Back up the database, `.env` and your `workspace` before upgrading. Stop the
supervisor, desktop app or Windows service that uses those files. Keep the source
and database backup together so a rollback can restore a compatible pair.

1. Obtain the new Public source in a separate folder, or update your existing
   checkout after committing or backing up your own changes.
2. Reconnect your local configuration and workspace. Keep them outside the
   framework source replacement. Review `.env.example` for new settings.
3. Install the root and `admin-client` dependencies with `npm ci` in each folder.
4. Start the application with `npm start`. This builds the Public runtime console
   into `admin-client/dist` and applies pending database migrations.
5. Confirm successful migration, login, role permissions, console access and one
   representative application transaction before allowing normal traffic.

Version 1.43.4 changes Public source selection, build/development commands and
operator documentation. It does not add a database migration. Earlier local
patch helpers and maintainer verification reports are removed from the Public
source snapshot. Removing a tracked helper does not alter your application data.

## Upgrading from versions before 1.43.0

Authentication migrations add account versions and refresh issuance versions:
`009_user_token_version` for application accounts and `014_admin_token_version`
for console accounts. MariaDB and SQLite variants are provided. Start one instance
first and confirm those migrations complete before starting additional instances.
Do not mix old and new authentication implementations against the same database.

Replace `CORS_ORIGIN=*` or reflective settings with an empty value for same-origin
use or an explicit list of trusted frontend origins. Review cookie security and
proxy trust in [Security operations](SECURITY_OPERATIONS.md).
Initial-password accounts must change their password before using protected APIs.
Password and account changes invalidate earlier sessions; verify login and refresh.

Uploaded documents are served as attachments with an isolated CSP. Do not use the
upload directory to host executable application pages. Check unusually deeply
nested request schemas against the configured input limits.

## Rollback

Stop the new application, restore the backed-up source/database pair and local
configuration, then restart. Replacing source alone does not reverse migrations or
restore previous account versions. Reconcile data written after the backup.
