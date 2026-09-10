#!/usr/bin/env bash
set -euo pipefail
edition="${1:?Usage: sudo bash service/uninstall.sh public|full}"
[[ $EUID -eq 0 && ( "$edition" == public || "$edition" == full ) ]] || exit 1
id="aidot-express-server-$edition"
unit="/etc/systemd/system/$id.service"
[[ -f "$unit" ]] || { echo 'No managed service unit found.'; exit 0; }
grep -Fq "Description=Aidot Express HTTPS server ($edition)" "$unit" || { echo 'Unrecognized service unit; stopping.' >&2; exit 1; }
systemctl disable --now "$id"
rm -- "$unit"
systemctl daemon-reload
echo 'Service removed. Application versions, account, settings, certificates and data are preserved.'
