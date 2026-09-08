# scenarios

Scenario tests created in the console are stored here, one JSON file per scenario
(`<id>.json`).

With `APP_WORKSPACE=workspace` set in `.env` they go to `workspace/scenarios/` instead,
alongside your controllers and services — so an upgrade cannot overwrite them.

They are included in the backup zip.
