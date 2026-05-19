#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root."
  exit 1
fi

SITE_ZIP="/tmp/demogo-site-preview.zip"
SERVER_ZIP="/tmp/demogo-server-v0.1.5.zip"

if [[ ! -f "${SITE_ZIP}" ]]; then
  echo "Missing ${SITE_ZIP}. Upload it first."
  exit 1
fi

if [[ ! -f "${SERVER_ZIP}" ]]; then
  echo "Missing ${SERVER_ZIP}. Upload it first."
  exit 1
fi

echo "Deploying frontend..."
mkdir -p /var/www/demogo-preview
rm -rf /var/www/demogo-preview/*
unzip -o "${SITE_ZIP}" -d /var/www/demogo-preview || {
  code="$?"
  if [[ "${code}" -gt 1 ]]; then
    echo "Frontend unzip failed with code ${code}"
    exit "${code}"
  fi
  echo "Frontend unzip completed with warnings."
}
mkdir -p /var/www/demogo-preview/d

echo "Deploying backend..."
mkdir -p /opt/demogo/server
rm -rf /opt/demogo/server/*
unzip -o "${SERVER_ZIP}" -d /opt/demogo/server || {
  code="$?"
  if [[ "${code}" -gt 1 ]]; then
    echo "Backend unzip failed with code ${code}"
    exit "${code}"
  fi
  echo "Backend unzip completed with warnings."
}

echo "Installing backend dependencies..."
cd /opt/demogo/server
npm install --omit=dev

echo "Restarting demogo-server..."
mkdir -p /etc/systemd/system/demogo-server.service.d
cat >/etc/systemd/system/demogo-server.service.d/description.conf <<'EOF'
[Unit]
Description=DemoGo v0.1.5 API
EOF
systemctl daemon-reload
systemctl restart demogo-server

echo "Checking demogo-server status..."
systemctl status demogo-server --no-pager

echo "Checking API health..."
curl -fsS http://127.0.0.1:3001/api/health
echo

echo "Deploy complete."
