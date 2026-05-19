#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root."
  exit 1
fi

SITE_ZIP="/tmp/demogo-site-preview.zip"
SERVER_ZIP="/tmp/demogo-server-v0.1.7.zip"
DB_ENV="/root/demogo-db.env"
DATA_DIR="/var/lib/demogo/data"
BACKUP_DIR="/var/lib/demogo/backups/pre-v0.1.7-$(date +%Y%m%d%H%M%S)"

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
unzip -o "${SITE_ZIP}" -d /var/www/demogo-preview
mkdir -p /var/www/demogo-preview/d

echo "Deploying backend..."
mkdir -p /opt/demogo/server
rm -rf /opt/demogo/server/*
unzip -o "${SERVER_ZIP}" -d /opt/demogo/server

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
Description=DemoGo v0.1.7 API
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
curl -fsS http://127.0.0.1:3001/api/health
echo

echo "Deploy complete. Backup: ${BACKUP_DIR}"
