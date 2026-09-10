#!/usr/bin/env bash
set -euo pipefail
bundle="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
data_dir="${1:?Usage: sudo bash service/install.sh /var/lib/aidot-express-server-public}"
node="$bundle/runtime/node"
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
[[ "$bundle" =~ ^/opt/aidot-express-server-[A-Za-z0-9._/-]+$ ]] || { echo 'Extract the release under /opt/aidot-express-server-<version>-<edition>-linux-x64.' >&2; exit 1; }
[[ "$data_dir" =~ ^/var/lib/aidot-express-server-[A-Za-z0-9._/-]+$ ]] || { echo 'Use a dedicated /var/lib/aidot-express-server-* data directory.' >&2; exit 1; }
python3 "$bundle/service/verify.py" "$bundle"
edition="$("$node" -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1])).edition' "$bundle/SERVER_MANIFEST.json")"
[[ "$edition" == public || "$edition" == full ]] || exit 1
id="aidot-express-server-$edition"
unit="/etc/systemd/system/$id.service"
[[ ! -e "$unit" ]] || { echo 'A service already exists. Back up the database and use the documented manual upgrade procedure.' >&2; exit 1; }
[[ "$(realpath -m -- "$data_dir")" == "$data_dir" ]] || { echo 'Use a canonical data path without links or traversal.' >&2; exit 1; }
[[ -f "$data_dir/.env" ]] || { echo 'Initialize the data directory with the bundled config.mjs first.' >&2; exit 1; }
[[ -z "$(find "$bundle" "$data_dir" -type l -print -quit)" ]] || { echo 'Linked files are not supported in installed server trees.' >&2; exit 1; }
getent passwd "$id" >/dev/null || useradd --system --user-group --home-dir "$data_dir" --shell /usr/sbin/nologin "$id"
chown -R root:root "$bundle"
chmod -R go-w "$bundle"
chown -R "$id:$id" "$data_dir"
chmod 700 "$data_dir"
runuser -u "$id" -- "$node" "$bundle/app/scripts/server/config.mjs" --data-dir "$data_dir" --check
cat > "$unit" <<EOF
[Unit]
Description=Aidot Express HTTPS server ($edition)
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=$id
Group=$id
WorkingDirectory=$bundle/app
ExecStart=$node $bundle/app/scripts/server/run.mjs --data-dir $data_dir
Restart=on-failure
RestartSec=10
TimeoutStopSec=30
KillMode=mixed
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$data_dir
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now "$id"
if ! runuser -u "$id" -- "$node" "$bundle/app/scripts/server/health.mjs" --data-dir "$data_dir" --wait 60; then
  systemctl disable --now "$id"
  echo 'Readiness failed. The service is stopped; configuration and data are preserved.' >&2
  exit 1
fi
echo "Service ready: $id"
