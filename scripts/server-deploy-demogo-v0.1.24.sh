#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root."
  exit 1
fi

SITE_ZIP="/tmp/demogo-site-preview.zip"
SERVER_ZIP="/tmp/demogo-server-v0.1.24.zip"
DB_ENV="/root/demogo-db.env"
DATA_DIR="/var/lib/demogo/data"
BACKUP_DIR="/var/lib/demogo/backups/pre-v0.1.24-$(date +%Y%m%d%H%M%S)"

safe_unzip() {
  local zip_file="$1"
  local target_dir="$2"
  set +e
  unzip -o "${zip_file}" -d "${target_dir}"
  local code=$?
  set -e
  if [[ "${code}" -gt 1 ]]; then
    echo "Failed to unzip ${zip_file}."
    exit "${code}"
  fi
}

wait_for_health() {
  for i in {1..20}; do
    if curl -fsS http://127.0.0.1:3001/api/health; then
      echo
      return 0
    fi
    sleep 1
  done
  echo "DemoGo health check failed after waiting."
  systemctl status demogo-server --no-pager || true
  journalctl -u demogo-server -n 80 --no-pager || true
  exit 1
}

if [[ ! -f "${SITE_ZIP}" ]]; then
  echo "Missing ${SITE_ZIP}. Upload it first."
  exit 1
fi

if [[ ! -f "${SERVER_ZIP}" ]]; then
  echo "Missing ${SERVER_ZIP}. Upload it first."
  exit 1
fi

if [[ ! -f "${DB_ENV}" ]]; then
  echo "Missing ${DB_ENV}. Create the MySQL environment file first."
  exit 1
fi

echo "Backing up current data and deployment..."
mkdir -p "${BACKUP_DIR}"
if [[ -d "${DATA_DIR}" ]]; then
  cp -a "${DATA_DIR}" "${BACKUP_DIR}/data"
fi
if [[ -d /opt/demogo/server ]]; then
  cp -a /opt/demogo/server "${BACKUP_DIR}/server"
fi
if [[ -d /var/www/demogo-preview ]]; then
  mkdir -p "${BACKUP_DIR}/site"
  find /var/www/demogo-preview -mindepth 1 -maxdepth 1 ! -name d -exec cp -a {} "${BACKUP_DIR}/site/" \;
fi

echo "Deploying frontend..."
mkdir -p /var/www/demogo-preview
mkdir -p /var/www/demogo-preview/d
find /var/www/demogo-preview -mindepth 1 -maxdepth 1 ! -name d -exec rm -rf {} +
safe_unzip "${SITE_ZIP}" /var/www/demogo-preview
mkdir -p /var/www/demogo-preview/d

echo "Deploying backend..."
mkdir -p /opt/demogo/server
rm -rf /opt/demogo/server/*
safe_unzip "${SERVER_ZIP}" /opt/demogo/server

echo "Installing backend dependencies..."
cd /opt/demogo/server
npm install --omit=dev

echo "Running MySQL migration..."
set -a
source "${DB_ENV}"
set +a
node src/db/migrate-json-to-mysql.js
node src/db/verify-migration.js

echo "Configuring systemd environment..."
mkdir -p /etc/systemd/system/demogo-server.service.d
cat >/etc/systemd/system/demogo-server.service.d/description.conf <<'EOF'
[Unit]
Description=DemoGo v0.1.24 API
EOF
cat >/etc/systemd/system/demogo-server.service.d/database.conf <<EOF
[Service]
EnvironmentFile=${DB_ENV}
EOF

echo "Restarting demogo-server..."
systemctl daemon-reload
systemctl restart demogo-server

echo "Checking demogo-server status..."
systemctl status demogo-server --no-pager

echo "Checking API health..."
wait_for_health

echo "Deploy complete. Backup: ${BACKUP_DIR}"
