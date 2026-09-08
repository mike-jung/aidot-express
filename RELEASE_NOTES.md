# Release notes

What users see on the GitHub releases page. English, and written for someone who has
not read the internal changelog.

`CHANGELOG.md` is the internal record — it is in Korean, covers every fix, and is not
published. This file is the public summary: what changed that a user would notice.

Keep the heading format `## vX.Y.Z — short title`. The release script matches on it.

---

## v1.41.3 — Build and publish output is in English

Everything `npm run dist:win`, `npm run push` and `npm run sync:public` print is now
English, including the pre-publish scan report — its line numbers were unreadable in a
terminal that could not render Korean.

## v1.41.2 — Every server log line is in English

All 198 remaining Korean log messages across services, controllers and the legacy loader
are now English. The README quick-start now points at the real repository, and the API
tester screen follows the console language.

## v1.41.1 — The whole startup output is in English

The startup summary, the config loader, the SQL and controller loaders and the legacy
loader were still Korean. Everything printed while the server starts now reads in English.

## v1.41.0 — Server logs are in English

Log messages are what you search when something goes wrong, so they are now fixed in
English rather than following the console language. Everything on the startup path —
server, database, supervisor, watchdog and migrations — reads in English.

The screen editor also picked up more translations: row presets, the canvas hints and the
properties panel.

## v1.40.4 — Confirmations and list screens follow your language

Confirm dialogs, the SQL and controller lists, the dashboard, the command palette, the
request trace and the API tester still showed Korean in English.

## v1.40.3 — Widget and header names follow your language

The widget palette, header-type buttons, the new-screen dialog, the properties panel and
the preview banner still showed Korean in English. Widget and header names now come from
the dictionary rather than being fixed in the schema.

## v1.40.2 — More screen-designer text follows your language

The save-status line, the sidebar section label, the empty-preview message and the file
count still showed Korean in English. A new check now looks for text that is visible on
screen rather than counting every Korean character in the source, so this class of miss
is caught rather than argued about.

## v1.40.1 — The generated README follows your language too

Exporting in English produced a Korean README. Both are now written in the language you
chose.

## v1.40.0 — Generated projects follow your language too

Exporting a project used to produce Korean labels regardless of the console language,
because the exported project runs on its own and cannot read the console's dictionary.
The chosen language is now baked into the generated files: build in English and the
screens read `Live` and `Loading` rather than their Korean equivalents.

Also translated: the column-encryption, EAI and scenario screens.

## v1.39.2 — The screen designer follows your language

Layout names and descriptions, the editing panels, the screen wizard and the data-source
picker were still Korean with the console set to English. They now follow the setting.

## v1.39.1 — More of the console follows your language

Request trace summaries and the screen designer still showed Korean when the console
language was set to English. Both now follow the setting.

## v1.39.0 — The console tells you which server you are looking at

Running the installed app and a development server at the same time gives you two
identical consoles on two ports, with nothing to tell them apart. A badge beside the page
title now names the mode: **Installed**, **Release** or **Dev**.

## v1.38.2 — File paths read the same however you run it

An installed build showed paths like `../../../../Users/…/workspace/sql/snack.sql`,
because the install folder and your files live in different places. Paths are now shown
relative to the workspace they belong to, so they read as `workspace/sql/snack.sql`
whether you run from source or from an installed build.

## v1.38.1 — Files you create are usable immediately

A file created from the console showed as "Not loaded" and needed a second click, even
though it was already registered and working. The list was simply out of date. It now
reflects the true state as soon as the file is created.

## v1.38.0 — The tutorial is now in English

All 75 slides of the getting-started tutorial have been translated. The Korean original
remains alongside it as `_ko`.

## v1.37.0 — A real PII scanner before publishing

Pattern matching alone flagged test fixtures twice, and each fix added another exemption
to maintain. The pre-publish check now validates check digits, reads surrounding context,
and recognises hand-written placeholder values — so exemption lists are no longer needed.

Findings are reported with the value masked.

## v1.36.7 — Placeholder identifiers no longer block publishing

The pre-publish scan flagged obviously-fake identifiers used in tests. Well-known
placeholder values are now recognised as such, while anything resembling a real one still
stops the publish.

## v1.36.6 — Enterprise source stays out of the public repository

The public repository was receiving the real encryption implementation instead of the
stand-ins the packaged build uses. Both paths now go through the same replacement, so
what is published matches what ships.

## v1.36.5 — Every bundled example works out of the box

Four of the bundled examples returned 500 on a fresh install: their tables were only
created under a non-default setting, but the endpoints were still there. They have been
removed rather than half-shipped — the remaining examples all work with no configuration.

Startup log lines are now graded by content. The server prints its ready banner to
stderr, and grading by stream alone made a successful start look like nine errors.

## v1.36.4 — Startup failures are readable and copyable

When the server fails to start, the dialog now shows the whole thing — the full stack
trace, in a scrollable panel — rather than a truncated summary you cannot select.

- **Copy error** puts everything on the clipboard, including the version and paths, so a
  bug report needs no follow-up questions. Ctrl+C works too.
- Buttons open the log folder and the settings file directly, instead of printing a path
  to retype.

## v1.36.3 — Works from a read-only install location

An installed build lives under Program Files, which cannot be written to without
administrator rights. The server was trying to create folders there during startup and
died before it finished.

- Files you create are written under your user profile, and the install folder is only
  read from
- Several workspace folders can now be listed in `APP_WORKSPACE`, separated by commas;
  later entries win when a name appears twice
- The console shows which folders are being read and which one new files go to

## v1.36.2 — A cleaner open-edition console, and a visible password field

The console bundle no longer contains references to screens the open edition does not
ship. Those screens are replaced at build time rather than deleted afterwards, so
nothing points at a file that is not there.

During installation, the database password field now has a **Show** box. A typo there
used to surface much later as a server that would not start.

## v1.36.1 — The open edition starts, verified end to end

Removing enterprise modules one file at a time kept breaking the install in a new place:
each module referenced the next one, so patching the first only moved the failure. Whole
directories are now replaced together, and the packaged build is booted as part of
verification rather than assumed to work.

## v1.36.0 — The default password no longer blocks startup

A production install refused to start while the admin account still had the default
password — but you could not change the password without logging in, and you could not
log in while the server refused to start. There was no way out.

The check now warns instead, and forces a password change at the next login.

Also: a failed build no longer leaves placeholder files in your source tree, and
`--clean` copes with files Windows has locked.

## v1.35.9 — The installed app starts

The open-edition build removed modules that the server still imports, so the installed
app exited immediately with a module-not-found error. Stand-ins now ship in their place:
the enterprise features remain absent, but the imports resolve and the server starts.

## v1.35.8 — Failures now say why

When the server failed to start, the log contained only "exited, code=1" — the actual
error was written to a console that a windowed application does not have. There was
nothing to go on.

- Server output is captured into the log file, and the last few lines appear in the
  failure dialog itself
- Details entered during installation are now used on first run instead of being
  discarded, so you are not asked twice
- The installer shows where settings and logs are kept
- Rebuilding no longer leaves the previous build's files behind

## v1.35.7 — First run asks for your database

Starting the installed app for the first time now opens a short setup dialog: database
type, address, credentials, schema, and the server port. **Test connection** checks the
details before anything is saved, and reports what to fix when it fails — wrong password,
nothing listening on that port, host not found.

The answers are written into your settings file. MariaDB is the default; SQLite is there
for a quick trial without a database server.

Skipping the dialog is allowed — the app starts with defaults and you can edit the
settings file yourself.

## v1.35.6 — The installer now produces a working install

Installing on Windows and launching produced only an error: the server exited
immediately, and the message pointed at a settings file and a log folder that did not
exist. There was nothing the user could act on.

- The installed app creates its settings file on first run, defaulting to SQLite so it
  starts without a database server to configure
- The example settings file now ships with the installer
- Failure messages show the real paths on this machine, and say what to change

Settings live under your user profile, not the install folder, so upgrading never
overwrites them.

## v1.35.5 — Windows and Linux builds no longer delete each other

Building for one platform removed the other platform's installer from the output folder,
so you could never have both ready to release at the same time.

- Cleanup now matches on operating system as well as edition
- What was left untouched is listed after each build, so nothing looks lost
- The console's own README describes the current setup rather than the original prototype

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
