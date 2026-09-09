# Build and release

Version 1.43.2. Run commands from the project root. Install root and admin-client
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

Review the exported tree and `PUBLIC_MANIFEST.json` before a public update. No remote
write is performed by `export:public`, `check:public` or a normal `sync:public` call.

Set `PUBLIC_REPO=owner/public-repository` and `GITHUB_REPO=owner/private-repository`
with separate identities. Use a credential helper or scoped secret from the release
environment. Never embed a token in a remote URL, bundle, installer or document.
`npm run sync:public -- --push` updates the existing public main history with a normal
push and refuses a missing or identical repository setting. Remote divergence stops
the push; inspect and retry from current state rather than force-pushing.

`npm run push` commits Full source only after the target repository is verified as
private. Its dry run leaves the Git index and remotes unchanged.

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
