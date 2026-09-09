# aidot-express 1.43.2 build/sync hotfix

Current PC project already has the hotfix applied.
For another unmodified 1.43.2 copy, extract this ZIP outside the project.

```powershell
node C:\path\to\hotfix\apply-hotfix.mjs --project D:\path\to\aidot-express --dry-run
node C:\path\to\hotfix\apply-hotfix.mjs --project D:\path\to\aidot-express
```

The helper verifies existing files and stops before writing if local changes conflict.
Existing files are backed up under the project's patch backup directory.
Reapplication is safe. Dependencies and the application version remain 1.43.2.

After applying, `npm run sync:public` publishes to GitHub.
Use `npm run sync:public -- --dry-run` for policy checks and `npm run export:public` for a local export.
`npm run dist:linux` builds the current AppImage and archives prior images of the same edition.
See the included Korean review for findings, exact verification and remaining limitations.
