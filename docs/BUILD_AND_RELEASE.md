# Build and release

Version 1.43.3. Run commands from the project root. Install root and admin-client
locked dependencies first. Windows NSIS builds require a Windows build environment;
Linux AppImage builds need the supported Linux/WSL/Docker dependencies.

## Local verification

```sh
npm ci
cd admin-client
npm ci
cd ..
npm run check
npm test
npm run check:security
npm run build:admin:full
npm run test:security:e2e
npm run build:admin
npm run check:public
```

`test:security:e2e` starts isolated loopback HTTP/control servers and a temporary
SQLite database. It changes only its generated test accounts and stops its processes.
For a disposable local MariaDB instance, set `TEST_DB_PORT`, `TEST_DB_USER` and
`TEST_DB_PASSWORD`, then run `node scripts/security-e2e.mjs --database mariadb`.
It creates and drops a randomly named `aidot_test_*` database. Do not point it at a
production database account. Browser render checks require the browser environment
used by the existing UI test tooling and are separate from these HTTP checks.

## Editions

| Deliverable | Command | Console input |
| --- | --- | --- |
| Public Windows NSIS | `npm run dist:win` | `admin-client/dist-public` |
| Full Windows NSIS | `npm run dist:win:full` | `admin-client/dist` |
| Public Linux | `npm run dist:linux` | Public |
| Full Linux | `npm run dist:linux:full` | Full |
| Public unpacked directory | `npm run pack` | Public; Windows target |
| Public Linux unpacked directory | `node scripts/build-edition.mjs --linux --dir` | Build Public console first |
| Inspect Public file selection | `node scripts/build-edition.mjs --plan` | Build Public console first |
| Inspect Full file selection | `node scripts/build-edition.mjs --full --plan` | Build Full console first |
| Public source export | `npm run export:public -- --output /absolute/empty/destination` | Build Public console first |

`public-filter.json` and its shared policy are the edition selection authority.
Public packaging replaces whole implementation directories with compatibility stubs;
it never renames or overwrites Full source. The generated FileSets and final packed
files are verified. Do not manually rename installers to change their edition.
Full-edition installers are never released to a public repository.

`--dir` uses a new edition-specific package directory under the configured output,
so repeated unpacked builds cannot inherit the other edition's files.

`--clean` remains accepted for old command compatibility but does not delete prior
build outputs. Use a clean checkout/output directory for a reproducible release.
The after-pack check rejects unexpected application files left in the package.

## Publication

Review the exported tree and `PUBLIC_MANIFEST.json` before a public update.

| Command | Result |
| --- | --- |
| `npm run check:public` | Check file selection and content; no export or remote writes. |
| `npm run sync:public -- --dry-run` | The same policy check, without committing or pushing. Authentication is not checked. |
| `npm run export:public` | Create a local Public tree and print its location. |
| `npm run sync:public` | Export, verify, commit and push Public source to GitHub. |

The 1.43.2 build-tool hotfix restores publication as the normal `sync:public`
command. In the original 1.43.2 package, this command only exported a temporary
directory unless `--push` was added. The legacy `--push` option remains accepted.

Set `PUBLIC_REPO=owner/public-repository` and `GITHUB_REPO=owner/private-repository`
with separate identities. Use a credential helper or scoped secret from the release
environment. Never embed a token in a remote URL, bundle, installer or document.
Settings are loaded from `.env`, then `.env.local`, then process environment values.
`GITHUB_TOKEN` or `GH_TOKEN` supplies an explicit token; without either, the configured
Git credential helper is used. Configure Git identity or `GIT_USER_NAME` and
`GIT_USER_EMAIL` for commits. A noninteractive credential failure exits nonzero.

`npm run sync:public` updates the existing Public history with a normal push and
refuses missing or identical Full/Public repository settings, including case-only
differences. Set `PUBLIC_BRANCH` if the Public branch is not `main`. A completely
empty repository can be initialized; a missing branch in a populated repository is
an error. Remote divergence stops the push; inspect and retry rather than force-pushing.

The isolated Git index must contain exactly the files listed in `PUBLIC_MANIFEST.json`
plus the manifest itself, including ignored console build files. Manifest hashes
describe the staged bytes after Git line-ending normalization. An unchanged snapshot
exits successfully without an empty commit. A failed publication retains its export
for inspection and reports failure instead of claiming completion.

`npm run push` commits Full source only after the target repository is verified as
private with write access. Set `GITHUB_TOKEN` or `GH_TOKEN`, `GITHUB_REPO` and
optionally `GITHUB_BRANCH` (default `main`). Its dry run needs no token and leaves
the Git index and remotes unchanged; it does not check remote freshness.

A fresh Full ZIP needs no manual `git init`, clone or pull. The command fetches
the existing branch and uses that commit as the parent of the extracted files.
Remote-only files are retained and restored locally: absence from a ZIP is not
an instruction to delete a file. In an established checkout, explicit local
deletions are committed normally. A branch missing from a populated remote is
rejected to catch configuration mistakes.

Every push fetches before comparing history. A checkout behind the remote is
fast-forwarded; compatible divergent commits are merged. Conflicts are previewed
before starting a merge, and the local commit remains available for resolution.
An old extraction that already has an independent root stops with instructions;
after reviewing both trees, `npm run push -- --link-history` allows a normal
merge of those histories. Conflicting content is never chosen automatically.
Recovery refs are recorded under `refs/aidot-backups/` before changing an existing
local history. Origin identity, the selected branch and unfinished Git operations
are checked. Existing Git hooks stay enabled, and pushes never use force.

A non-fast-forward rejection indicates a remote history advance, not a cached
password. Retry to fetch and integrate it; resolve any reported conflicts first.
Authentication, network and branch-protection failures have separate guidance.
The candidate tree and unpublished commit history are checked for excluded local
files, including credentials that were committed and subsequently deleted.

`npm run release:github` creates or updates a draft in `PUBLIC_REPO` and filters
installers by the exact current version and Public filename convention. For internal
Full drafts use `npm run release:github -- --to-full --allow-full`; visibility must
be verified as private before upload. `npm run all` also publishes; use
`npm run all -- --no-publish` for build-only work.

NSIS now installs application files and leaves database/port setup to Electron on
first launch. This removes a second, inconsistent environment-file serializer.
Existing userData is retained on upgrade and uninstall.

After reviewing the draft and its artifact checks, choose **Publish release** in
GitHub to make the intended Public release visible.

Code signing, macOS notarization, installer upgrade/uninstall checks and the signing
secret configuration remain release-environment responsibilities. Local hashes prove
file equality, not publisher identity. Keep public and internal artifacts in separate
CI jobs and output directories; add signed attestations and a reviewed SBOM.

## When something fails

| Failure | Action |
| --- | --- |
| Missing console marker or edition/version mismatch | Rebuild the intended console; do not edit the marker manually. |
| Missing or extra packaged file | Inspect FileSets and the after-pack error; do not bypass the verification hook. |
| `mksquashfs ENOENT` | Use a Linux environment with squashfs-tools, or the documented tar.gz target. |
| Native dependency rebuild failure | Use matching Electron headers, architecture and supported native build tools. |
| Public scanner failure | Remove or replace the actual sensitive content; review any narrowly justified exemption. |
| Private repository cannot be verified | Confirm repository identity and token access; do not publish Full artifacts to another target. |
| No current installer found | Build the current package version; do not relabel a stale binary. |

## Linux output isolation

Each Linux build uses a new output directory. WSL also copies sources into a new
directory below `$HOME/.cache/aidot-express-linux-build/runs`; successful work directories
are removed and failed ones are retained for diagnosis. Electron and npm download
caches remain reusable. Windows `node_modules`, local environment files, databases,
logs, backup copies and prior installers are not copied into the WSL work tree.

Only the exact current version and edition of the requested AppImage or tar.gz is
collected. Missing output or a failed copy fails the command. After a verified copy,
previous artifacts of the same product, edition and format are moved under
`dist-electron/archive/<edition>/<run>/`, including an older build with the same
filename. Other editions, Windows installers and unrelated files are preserved.
`linux-<edition>-<appimage|targz>-latest.json` records the current file, size, SHA-256
and archive locations. This applies to WSL, native Linux, Docker and tar.gz builds.

Before this hotfix, WSL reused one directory for all releases. Its rsync command
excluded `dist-electron` from both copying and normal deletion, then copied every
`*.AppImage` back to Windows. That could make old versions reappear with new copy
timestamps. The existing historical WSL cache is not read by the new build path.
