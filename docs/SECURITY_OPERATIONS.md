# Security operations

Applies to the Public edition. Read [Upgrading](UPGRADE.md) before changing an existing deployment.

## Deployment settings

Run a supported Node.js LTS release satisfying `engines`; check the minimum version in `package.json`. Install with `npm ci`, including the separate `admin-client` lockfile.
Do not expose the development console to untrusted users. Use TLS and a restricted
administration network or an authenticated reverse proxy. Keep the control listener
on loopback unless an explicitly secured management network requires otherwise.

| Setting | Behavior / operational choice |
| --- | --- |
| `AUTH_ACCESS_SECRET` | Use an independently generated secret; store it outside source control. Rotating it signs out existing JWT sessions. |
| `ADMIN_INITIAL_PASSWORD` | Set a unique initial password before first startup. Initial-password accounts can only complete password setup and inspect their own identity. |
| `ADMIN_SIGNUP_OPEN` | Keep `false` after controlled provisioning. |
| `AUTH_SIGNUP_OPEN` | Disable if the business application does not need self-registration. |
| `HOST` | Server default is `0.0.0.0`; set `127.0.0.1` behind a local proxy. Electron supplies loopback by default. |
| `ALLOWED_HOSTS` | Exact hostnames without schemes/ports; Electron defaults to loopback hostnames to limit DNS rebinding. Set explicitly for a management proxy. |
| `CONTROL_HOST` | Keep `127.0.0.1`. |
| `CORS_ORIGIN` | Empty means same-origin browser use. For separate frontends, provide exact origins separated by commas. Legacy `*` entries are ignored with a startup warning; they never allow arbitrary origins. Reflective `true`, wildcard host patterns and malformed URLs are rejected. |
| `AUTH_COOKIE_SECURE` | Use `true` with HTTPS. Local HTTP development requires `false`. |
| `AUTH_COOKIE_SAMESITE` | Prefer `lax`; `none` requires secure cookies and an explicit origin policy. |
| `TRUST_PROXY` | Trust only actual proxy hops or addresses supported by the configuration. A broadly trusted client-supplied forwarding header compromises IP and scheme decisions. |
| `BODY_LIMIT` | Explicit finite size, e.g. `1mb`; startup rejects malformed values or values over `1gb`. Choose a smaller workload-specific bound where possible. |
| `HTTP_HEADERS_TIMEOUT_MS` | Default 15000. |
| `HTTP_REQUEST_TIMEOUT_MS` | Default 120000; must be at least the header deadline. |
| `HTTP_KEEP_ALIVE_TIMEOUT_MS` | Default 5000. |
| `HTTP_MAX_REQUESTS_PER_SOCKET` | Default 1000. |

The HTTP deadlines bound request receipt; they do not impose a lifetime on SSE
responses. Proxy limits should match the intended upload and streaming behavior.
Requests without Origin remain available to non-browser clients. Fetch Metadata
rejects cross-site unsafe browser requests without an Origin when that header is
present. These checks do not replace authentication, TLS or protection from XSS.
For local Vite development, explicitly allow the actual Vite origin and port.

For a fresh production database without `ADMIN_INITIAL_PASSWORD`, a random bootstrap
credential is saved in `initial-admin-credentials.json` under Electron userData (desktop)
or `data/` (server). The desktop shows it locally. Restrict this directory to the
service account; POSIX files are created with mode 0600, and Windows relies on the
user-profile ACL. The file is deleted after that account changes its password.
Credentials are not printed through supervisor logs. Replace any historical known
default password before exposing an upgraded installation.

## Sessions and recovery

Password changes require a fresh login; the supplied console performs it after a
successful change. Role, status and account-version checks invalidate old access
tokens in both HTTP processes and survive restart. Refresh tokens also carry an
issuance version in the database. Legacy tokens map to version zero until the first
invalidation. To end all existing sessions during migration, rotate the JWT secret
and revoke refresh rows, or increment account versions as part of a maintenance
procedure.

The control API fails closed when it cannot verify account state in the database.
If the database is unavailable, use the local OS service manager or Electron process
controls to repair or restart the service. Do not add an authentication bypass.

Use long, unique passwords and a password manager. The existing application policy
still requires 10 characters for console accounts and 8 for application signup, with letters and digits. It has not been redesigned as
NIST SP 800-63B-4 compliance; a future shared password-policy module, compromised
password checks and MFA/passkeys are recommended for high-privilege deployments.

Uploaded documents are served as attachments with a sandboxed CSP at both
`/uploads` and `/public/uploads`; do not use uploads to host executable application
HTML. Applications that need uploaded media should use a dedicated asset origin
and an explicit content-type policy.

## Backups, logs and secrets

Back up the database, workspace and environment configuration through protected
channels before upgrading. Keep any application-managed encryption keys separate
from the data. The Public edition does not include the Enterprise backup/restore
console or column-encryption implementation; use your database and operating-system
backup tools and verify a restore before relying on the backup.

Query credentials and SSE tickets are redacted in HTTP URLs, referrers and request
context. Arbitrary application messages and SQL-driver error payloads can still
contain business data. Limit log access and retention, and configure service-specific
field redaction. The Public scanner is heuristic and skips binary content such as
PDFs; manually review documentation and third-party artifacts before publication.

## Dependencies

Install from the supplied root and console lockfiles with `npm ci`. Check dependency
advisories before deployment and review the affected code path before changing a
package version. A dependency scan, file hash or successful build does not by itself
establish that the application is safe for a particular deployment.
