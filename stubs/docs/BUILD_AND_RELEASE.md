# Build and run the Public edition

This repository contains the Public framework and console. It includes the tools
needed to run, test and build that edition. Maintainer publication and Full ZIP
patch tools are not part of this repository.

## Prepare the source

Use Git and Node.js 22.19 or later, satisfying the version in `package.json`.
Install both locked dependency sets:

```sh
npm ci
cd admin-client
npm ci
cd ..
```

Copy `.env.example` to `.env` and set the database connection. For MariaDB, create
the database and a dedicated application account before starting the server.
Use a separate database for development. Keep credentials outside Git.
See [Security operations](SECURITY_OPERATIONS.md) for passwords, cookies and origins.

```sh
npm start
```

The startup script checks dependencies and builds the Public console when needed.
The running console is served from `admin-client/dist`. For console development,
run the server, then `npm run dev` inside `admin-client`; the Public Vite config
keeps Enterprise screens disabled in development as well as in builds.

## Checks

```sh
npm run check
npm test
npm run check:security
npm run check:sfc
npm run build:admin
npm run test:security:e2e
```

The security integration command starts isolated loopback servers and a temporary
SQLite database. Successful compilation or HTTP checks do not replace manual
browser, installer and deployment testing.

## Desktop builds

| Command | Output |
| --- | --- |
| `npm run dist:win` | Windows NSIS installer, x64 |
| `npm run dist:win:ia32` | Windows NSIS installer, ia32 |
| `npm run dist:linux` | Linux AppImage, x64 |
| `npm run dist:all` | Windows build followed by Linux build |
| `npm run pack` | Unpacked Windows application for inspection |

Windows installers need a Windows build environment. Linux AppImages need Linux,
WSL or Docker with the required build dependencies. Use `--wsl`, `--docker` or
`--targz` with the Linux command when selecting a build path explicitly.

Each Linux build uses a fresh output directory. Only the requested version and
edition are collected. Previous matching installers are moved below
`dist-electron/archive/`; the latest receipt records the file size and SHA-256.
Other editions and Windows installers are preserved.

Build through these commands so the edition policy and package verification hooks
run. The console marker must match the package version and Public edition. A
mismatch requires rebuilding the console; do not rename old binaries or edit markers.
A `mksquashfs ENOENT` error means the Linux environment needs squashfs-tools.

Test installation, upgrade and removal with an isolated profile before distribution.
Code signing and publisher trust are separate from a file's checksum. Read
[Windows operations](WINDOWS_OPERATIONS.md) and [Upgrading](UPGRADE.md).
