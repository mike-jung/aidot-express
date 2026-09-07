<div align="center">

# aidot-express

**Write a Spring Boot–style backend in JavaScript — and watch it appear while the server is still running.**

Annotations you already know (`@Controller`, `@Service`, `@Autowired`, `@Sql`),
a browser console that writes the boilerplate for you,
and hot-reload that means you almost never restart.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
![Version](https://img.shields.io/badge/version-1.32.0-orange)

</div>

---

## Why another Node framework?

Most Node backends start the same way: pick a router, pick a DB client, wire them
together, then re-invent the same folder layout every project. Teams coming from
Java ask the same question every time — *"where is my `@Service`?"*

**aidot-express** is that missing layer. It keeps Express underneath, adds the
Spring-style structure on top, and puts a console in front of it so you can create
an endpoint without opening an editor.

```js
@Controller('/api/snack')
export default class SnackController {
  @Autowired('SnackService') snackService;
  @Log log;

  @GetMapping('/')
  async list() { return { data: await this.snackService.listAll() }; }
}
```

That is a working REST endpoint. No route table, no manual DI container, no restart.

---

## What you get

| | |
|---|---|
| **Spring-style annotations** | `@Controller` `@Service` `@Autowired` `@Sql` `@Log` `@Roles` `@Auth` — in plain `.js` or `.ts`, no build step required |
| **SQL in SQL files** | Named queries in `.sql` files with `:param` binding. MariaDB / MySQL / Oracle native binding, not string concatenation |
| **Hot reload that holds** | Save a controller and the route is live. Add a file by hand and the console offers to load it — no restart |
| **A console, not just a framework** | Create controllers, services and SQL from the browser. Test endpoints. Watch load, logs and per-request traces |
| **Screen designer** | Compose CRUD screens visually and export a complete Vue 3 project you can build and run |
| **Request tracing** | Follow one request from route to service to SQL, with timings — then find who made it |
| **Runs offline** | Hospital networks, air-gapped sites. Vendored assets, no CDN at runtime |

---

## Quick start

```bash
git clone https://github.com/<your-account>/aidot-express.git
cd aidot-express
npm install
cp .env.example .env        # set DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE
npm start
```

Open **http://localhost:7901** and log in with `admin` / `admin1234`
(change it immediately — the console will nag you until you do).

### Your first endpoint, in about a minute

1. Console → **SQL** → *New SQL file* → name it `snack`, table `snack`
   Five queries are generated for you.
2. Console → **Service** → *New service* → pick `snack.sql`
   The methods are wired to the queries.
3. Console → **Controller** → *New controller* → base path `/api/snack`
   Routes appear immediately — no restart.
4. Console → **API Test** → call `GET /api/snack/` and see the rows.

Prefer your own editor? Drop the files into `workspace/controller`,
`workspace/service` and `workspace/sql`. The console lists them with a
**Not loaded** badge and a one-click button to load each one.

---

## How it is laid out

```
workspace/            ← your code lives here (never overwritten by upgrades)
  controller/         @Controller classes
  service/            @Service classes
  sql/                named queries
src/                  the framework
admin-client/         the console (Vue 3)
docs/                 tutorial deck, guides, licensing
```

Upgrading is copying a zip over the top. `workspace/` and `.env` are yours and are
never included in a release archive — that separation is deliberate.

---

## Building desktop apps

```bash
npm run dist:win      # Windows installer (NSIS, x64)
npm run dist:linux    # Linux AppImage (x64)
npm run dist:all      # both
```

These check that the build tools are actually installed before they start, and install
them if not. `electron` is over 200 MB, so the first run takes a few minutes.

**Building the Linux AppImage on Windows.** AppImage cannot be cross-compiled — it has to
be produced on Linux. `npm run dist:linux` detects what is available and uses it:

| Available | What happens |
|---|---|
| WSL2 | Builds inside WSL (recommended — fastest). Source is copied to a WSL-native folder so your Windows `node_modules` is left alone. |
| Docker | Builds in `electronuserland/builder`, with `node_modules` in a named volume for the same reason. |
| Neither | Falls back to `tar.gz`, which *can* be produced on Windows. Recipients unpack and run the binary directly. |

Force one with `npm run dist:linux -- --wsl` / `--docker` / `--targz`.
`npm run dist:all` builds Windows **first**, so a Linux failure still leaves you a working
installer.

On Windows the recommended production layout is the server as a **Windows service**
(`scripts/windows/install-service.ps1`) with the Electron app as a viewer. The service
restarts itself on crash, and the app attaches to it instead of starting a second copy.

---

## Verification

Every release runs:

```bash
npm test          # unit and regression tests
npm run check     # syntax, unresolved references, SQL name collisions, i18n keys
npm run smoke     # opens every console screen in a real browser and checks for errors
```

The smoke test exists because syntax checks kept passing while a screen was broken.
If a screen fails to open, the build fails.

---

## Enterprise edition

Some capabilities are built for regulated deployments — hospitals, and other places where
the network is closed and an outage has to be measured in seconds. Those live in a separate
edition rather than in this repository:

| | |
|---|---|
| **Middleware integration** | Connect to hospital middleware over persistent socket sessions, with connection pooling, telegram templates and a per-channel abbreviation dictionary. |
| **High availability** | Two-node active/standby with automatic failover and manual failback — no third witness machine required, because a spare server is not always something you can ask for. |
| **Backup and restore** | Snapshot controllers, services and SQL to a zip and roll back to it. |
| **Column encryption** | Store sensitive columns encrypted at rest, with key rotation. |

The open edition in this repository is complete and production-ready on its own; the
enterprise edition adds the pieces above rather than unlocking anything held back here.

**Contact:** mike.jung.global@gmail.com

---

## License

**Apache License 2.0** — see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

Use it, modify it, embed it in a commercial product. Keep the copyright notice and
state significant changes; that is the whole obligation. The explicit patent grant is
the reason most enterprise legal teams accept Apache-2.0 without a review.

"aidot-express" is a trademark of Aidot Link Co., Ltd. The licence covers the code,
not the name — see [`docs/LICENSING.md`](docs/LICENSING.md) for the reasoning behind the
choice and what it means in practice.

© 2026 Aidot Link Co., Ltd. · mike.jung.global@gmail.com
