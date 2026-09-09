# Architecture and trust boundaries

Version: 1.43.0. This document describes the implementation in this tree.

## Runtime

`npm start` checks dependencies and the console bundle, then starts the supervisor.
The supervisor owns the loopback control API and starts the main HTTP process.
The main process loads SQL, runs migrations, registers services in the dependency
container, and mounts decorated controllers. The Electron application starts the
same supervisor through `electron/server-bridge.cjs`.

| Layer | Responsibility | Main locations |
| --- | --- | --- |
| Configuration | Environment files, validation, edition restrictions | `src/config/` |
| HTTP | Origin checks, receiving limits, validation, authentication, error responses | `src/server.js`, `src/core/controllerLoader.js` |
| Services | Application behavior and transaction boundaries | `src/service/`, `lib/admin/service/` |
| SQL and migrations | Named parameter queries and persistent state | `src/database/`, `lib/admin/database/` |
| Console | Vue administration application and screen generators | `admin-client/` |
| Desktop | Isolated renderer, validated IPC, child process lifecycle | `electron/` |
| Distribution | Public selection, stubs, bundle identity, package verification | `scripts/publish/`, `scripts/build-edition.mjs` |

The console can edit and execute server code and SQL. A console administrator
therefore has application deployment authority. Workspace JavaScript and TypeScript
are trusted code; the loader and dependency container are not a security sandbox.
Use separate processes, operating-system accounts and databases for untrusted tenants.

## Authentication

Application users and console users have separate realms, tables and refresh-cookie
paths. Protected controller requests verify the JWT, then query the current account
status, role and `token_version`. The control process performs the same persistent
check. Database failure denies protected operations.

A refresh token is stored as a hash and bound to the account version at issuance.
A conditional SQL update claims it inside a transaction before a successor is
created. Reuse revokes the family, and that revocation commits before a rejection is
returned. MariaDB deadlocks and lock timeouts are retried at this narrow, database-only
boundary, at most five total attempts. Network errors and arbitrary service actions
are not retried.

Global logout and password/account changes invalidate prior sessions through database
state. Ordinary single-session logout revokes that refresh token; an already issued
access token can remain valid until expiration. Already-open streams are not
continuously reauthorized by the new request guard.

## Editions

| Capability | Public | Full / Enterprise source |
| --- | --- | --- |
| Controllers, services, named SQL, console, screen designer | Included | Included |
| MCI/EAI implementation | Excluded | Included; configuration controls use |
| High availability implementation | Replaced by disabled compatibility stubs | Included |
| Backup and restore administration | Excluded; dependency stub retained | Included |
| Secure-column implementation | Replaced by compatibility stubs | Included |

`package.json.aidotEdition` sets the server edition. Public configuration cannot
activate Enterprise implementations through environment or console switches.
`vite.public.js` replaces Enterprise screens before bundling. Public and Full console
outputs have separate directories and an `aidot-edition.json` marker.

The Public source export and Electron build share `public-filter.json` and `policy.mjs`.
The build uses selected directory FileSets without overwriting Full source files.
After packaging, `verify-packed-edition.cjs` verifies every selected runtime file,
rejects unexpected application files, and writes `AIDOT_PACKAGE_MANIFEST.json`.
Dependency contents require their own supply-chain review; file hashes are not a
publisher signature. Edition markers prevent accidental mixing, not deliberate
modification by someone who controls the source.

## Service design limits

SQLite suits a single local process or modest local installations. MariaDB is the
primary path for shared services. A separate account lookup on every protected
request adds database work and deliberately avoids stale authorization caches.
Measure latency and pool usage under the application's real workload before scaling.

Rate-limit counters and SSE tickets remain process-local. Multiple HTTP workers need
a shared counter store and a coordinated ticket design, or explicit routing affinity.
An HA role decision is not database fencing or a consensus protocol. Production
failover needs replication, fencing, split-brain drills and an external witness.

Oracle adapters exist, but this release's new migrations and concurrency paths were
validated for SQLite and MariaDB only. PostgreSQL is not implemented.
