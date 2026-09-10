# admin-client

The browser console for aidot-express. Vue 3 + Vite + Pinia + Bootstrap 5 + CodeMirror 6.

You do not need to build this separately to use aidot-express — `npm start` in the project
root serves the console from `admin-client/dist`. This folder is only for working on the console
itself.

## Running it in dev mode

```bash
# 1. the server, from the project root
npm start

# 2. the console, from here
npm install
npm run dev
```

`npm run dev` opens on **5174**. The port is fixed (`strictPort`) because the Electron
dev launcher waits for it.

### Where /api goes

The dev server proxies `/api` to the Express server, resolved in this order:

1. `VITE_API_TARGET` if set
2. `PORT` from the project root `.env` — this is the normal case
3. `http://localhost:3000` as a last resort

The chosen target is printed at startup:

```
[vite] API proxy target: http://localhost:7901 (from ../.env PORT)
```

If login fails with `ECONNREFUSED`, compare that line with the port in the server's
startup log. They have to match.

## Building

```bash
npm run build            # from here
npm run build:admin      # from the project root — same thing
```

The runtime serves `admin-client/dist`. The project-root Public build produces
`dist-public` for packaging. In an exported Public tree, the local build command
uses the Public Vite config and writes `dist`.

## Signing in

The first admin account is created for you on first start — `admin` / `admin1234` in
development. The console will keep telling you to change it until you do.

For production, set `ADMIN_INITIAL_PASSWORD` before first start. If omitted on a
fresh database, the generated initial credential is stored in the protected local
data directory and shown by the desktop setup flow; it is not printed in server
logs. See [Security operations](../docs/SECURITY_OPERATIONS.md).

## Layout

```
src/
  views/          one file per screen
  components/     shared pieces
  composables/    shared behaviour (load state, formatting, confirmations)
  stores/         Pinia — auth and screen-designer projects
  locales/        ko.js · en.js — every string lives here
  api/http.js     axios instance, token refresh, error envelope
```

## Adding a string

Both locale files must have the same keys. `npm run check:i18n` in the project root fails if
they drift:

```
OK    모든 언어의 키가 일치합니다
```

## Checks

From the project root:

```bash
npm run check:sfc     # every .vue actually compiles
npm run check:i18n    # compare locale keys
```

Also check the running console in a browser after changing screen behavior.
