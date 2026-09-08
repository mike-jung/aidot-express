# workspace

Your code lives here. Everything the framework ships with stays in `src/`.

```
workspace/
  controller/   @Controller classes
  service/      @Service classes
  sql/          named queries
```

## Why it is separate

Upgrading aidot-express means copying a release archive over the top. This folder is
never included in one, so an upgrade cannot overwrite your work. The `.env` file is
excluded for the same reason.

When you move the project to a new folder, copy `workspace/` and `.env` across —
otherwise your controllers will look like they vanished.

## Adding files by hand

You do not have to use the console. Drop a file in and the console lists it with a
**Not loaded** badge and a button to load it — no restart. Files created while the
server is running are not loaded automatically; that is deliberate, because loading
half-saved files causes worse problems than waiting for one click.

## Where tables go

`DB_APP_SCHEMA` (default `aidot_app`) holds the tables you create. Generated SQL is
qualified with it, and column lists are read from it. Leave it empty to use the same
schema as the framework tables.
