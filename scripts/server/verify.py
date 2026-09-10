"""Verify a Linux server bundle before invoking its bundled Node executable."""
import hashlib
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1]).absolute()
if any(p.is_symlink() for p in (root, *root.parents)):
    raise SystemExit("Linked release directories are not supported")
release = json.loads((root / "SERVER_MANIFEST.json").read_text(encoding="utf-8"))
if release.get("schema") != 1 or release.get("platform") != "linux" or release.get("arch") != "x64" or release.get("edition") not in ("public", "full"):
    raise SystemExit("Invalid Linux release manifest")
seen = set()
for entry in release["files"]:
    name = entry["path"]
    parts = name.split("/")
    if not name or any(p in ("", ".", "..") for p in parts) or any(c in name for c in "\\:\0\n\r"):
        raise SystemExit("Unsafe manifest path")
    if name.casefold() in seen:
        raise SystemExit("Duplicate manifest path")
    seen.add(name.casefold())
    target = root / name
    if any(p.is_symlink() for p in (target, *target.parents)):
        raise SystemExit("Linked release file")
    if not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() != entry["sha256"]:
        raise SystemExit("Integrity check failed: " + name)
if not {"runtime/node", "app/scripts/server/run.mjs", "app/scripts/server/config.mjs"}.issubset(seen):
    raise SystemExit("Missing server runtime")
print("Verified " + str(len(seen)) + " release files.")
