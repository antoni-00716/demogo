#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root."
  exit 1
fi

BACKUP_DIR="${1:-}"

if [[ -z "${BACKUP_DIR}" || ! -d "${BACKUP_DIR}" ]]; then
  echo "Usage: $0 /var/lib/demogo/backups/pre-v0.1.14-YYYYmmddHHMMSS"
  exit 1
fi

echo "Stopping demogo-server..."
systemctl stop demogo-server || true

if [[ -d "${BACKUP_DIR}/server" ]]; then
  echo "Restoring backend..."
  rm -rf /opt/demogo/server
  cp -a "${BACKUP_DIR}/server" /opt/demogo/server
fi

if [[ -d "${BACKUP_DIR}/site" ]]; then
  echo "Restoring frontend..."
  find /var/www/demogo-preview -mindepth 1 -maxdepth 1 ! -name d -exec rm -rf {} +
  cp -a "${BACKUP_DIR}/site/"* /var/www/demogo-preview/ 2>/dev/null || true
fi

if [[ -d "${BACKUP_DIR}/data" ]]; then
  echo "Restoring JSON backup copy..."
  rm -rf /var/lib/demogo/data
  cp -a "${BACKUP_DIR}/data" /var/lib/demogo/data
fi

echo "Keeping database environment override if it existed before deployment."
cat >/etc/systemd/system/demogo-server.service.d/description.conf <<'EOF'
[Unit]
Description=DemoGo rollback target API
EOF

systemctl daemon-reload
systemctl start demogo-server
sleep 3
curl -fsS http://127.0.0.1:3001/api/health
echo
echo "Rollback complete."
