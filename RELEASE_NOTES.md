# Release notes

What users see on the GitHub releases page. English, and written for someone who has
not read the internal changelog.

`CHANGELOG.md` is the internal record — it is in Korean, covers every fix, and is not
published. This file is the public summary: what changed that a user would notice.

Keep the heading format `## vX.Y.Z — short title`. The release script matches on it.

---

## v1.35.4 — Releases go to the public repository, in English

Releases were being created on the private development repository, where nobody can
download them, and the description was taken from the internal Korean changelog.

- Releases now target the public repository (`--to-full` overrides for internal builds)
- Descriptions come from `RELEASE_NOTES.md` — this file — rather than the changelog
- The download instructions attached to each release are in English

## v1.35.3 — Releases now carry only the current build

The release step used to pick installers by file extension. Since the build folder is
not emptied between builds, a release could end up carrying installers from older
versions alongside the current one — leaving users unsure which file to download.

- Releases now include only files matching the version being released
- Each build clears its own previous artifacts first, so they stop piling up
- Open-edition and full-edition artifacts do not delete each other, so you can keep both

## v1.35.2 — Full-edition installers can no longer be published by accident

Building the full edition leaves a `-full` installer in the same folder as the open one.
The release step now skips those. Overriding it requires an explicit flag and a
five-second confirmation, because a published release cannot be quietly taken back.

- Added `docs/RELEASING.md`: the five release steps, why they run in that order,
  the difference between editions, and what to do when each known failure appears

## v1.35.0 — One command for the whole release

```bash
npm run all
```

Builds the Windows installer, builds the Linux one, pushes the source, drafts a GitHub
release, and regenerates the public repository. A failure part-way through keeps
whatever finished before it.

## v1.34.0 — Open and full editions

The framework now ships in two editions from one source tree.

| | |
|---|---|
| **Open** | Everything in this repository. Complete and production-ready on its own. |
| **Full** | Adds middleware integration, high availability, backup and restore, and column encryption. |

What separates them is one file of exclusion rules, read by both the public repository
sync and the public installer build, so the two cannot drift apart.

## v1.33.0 — Apache-2.0

Licensed under Apache-2.0, with an explicit patent grant. Use it, modify it, embed it in
a commercial product; keep the copyright notice and state significant changes.

## v1.32.0 — Files you add by hand are picked up properly

Dropping a controller, service or SQL file into `workspace/` used to leave the console
showing incomplete information about it until a restart.

- The console reads the base path from the file itself when no metadata exists yet
- Loading a hand-written file now generates its metadata, so editing and deleting work
- Lists show a **Not loaded** badge with a one-click load button, and a bulk load action

## v1.31.0 — Descriptions come from the file

A comment at the top of a controller or service becomes its description in the console,
the way SQL files already worked. `///`, `//` and `/** */` are all recognised.

## v1.30.0 — Console screens can be turned off

Backup, column encryption and high availability can be hidden from the console.
Menus for screens that are not present in the running build are never shown.
