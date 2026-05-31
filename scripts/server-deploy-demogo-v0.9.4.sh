#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root."
  exit 1
fi

SITE_ZIP="/tmp/demogo-site-preview.zip"
SERVER_ZIP="/tmp/demogo-server-v0.9.4.zip"
DB_ENV="/root/demogo-db.env"
DATA_DIR="/var/lib/demogo/data"
BACKUP_DIR="/var/lib/demogo/backups/pre-v0.9.4-$(date +%Y%m%d%H%M%S)"
NGINX_CONF_FILES=(
  "/etc/nginx/conf.d/demogo.cn.conf"
  "/etc/nginx/conf.d/demogo-preview.conf"
)

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

patch_nginx_demo_routes() {
  local changed=0
  local python_cmd=""
  if command -v python3 >/dev/null 2>&1; then
    python_cmd="python3"
  elif command -v python >/dev/null 2>&1; then
    python_cmd="python"
  else
    echo "Python is required to patch Nginx routes."
    exit 1
  fi
  for conf in "${NGINX_CONF_FILES[@]}"; do
    if [[ ! -f "${conf}" ]]; then
      continue
    fi
    if ! grep -q "location /d/ {" "${conf}"; then
      echo "No /d/ route found in ${conf}; skipped."
      continue
    fi
    if grep -q "location /d/ {" "${conf}" && grep -A12 "location /d/ {" "${conf}" | grep -q "proxy_pass http://127.0.0.1:3001"; then
      continue
    fi
    local backup="${conf}.bak-v0.9.4-$(date +%Y%m%d%H%M%S)"
    cp -a "${conf}" "${backup}"
    "${python_cmd}" - "$conf" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
replacement = """location /d/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }"""
next_text, count = re.subn(r"location\s+/d/\s*\{[^{}]*\}", replacement, text, count=1, flags=re.S)
if count == 0:
    raise SystemExit("No location /d/ block found")
path.write_text(next_text, encoding="utf-8")
PY
    echo "Patched Nginx /d/ route in ${conf}; backup: ${backup}"
    changed=1
  done

  if [[ "${changed}" -eq 1 ]]; then
    nginx -t
    systemctl reload nginx
  fi
}

patch_nginx_proxy_timeouts() {
  local changed=0
  local python_cmd=""
  if command -v python3 >/dev/null 2>&1; then
    python_cmd="python3"
  elif command -v python >/dev/null 2>&1; then
    python_cmd="python"
  else
    echo "Python is required to patch Nginx timeouts."
    exit 1
  fi
  for conf in "${NGINX_CONF_FILES[@]}"; do
    if [[ ! -f "${conf}" ]]; then
      continue
    fi
    local backup="${conf}.timeouts-v0.9.4-$(date +%Y%m%d%H%M%S)"
    cp -a "${conf}" "${backup}"
    if "${python_cmd}" - "$conf" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
changed = False

def ensure_timeouts(match):
    global changed
    block = match.group(0)
    if "proxy_read_timeout" in block and "proxy_send_timeout" in block and "proxy_connect_timeout" in block:
        return block
    lines = block.splitlines()
    insert_at = len(lines) - 1
    timeout_lines = [
        "        proxy_connect_timeout 180s;",
        "        proxy_send_timeout 180s;",
        "        proxy_read_timeout 180s;",
    ]
    lines = lines[:insert_at] + timeout_lines + lines[insert_at:]
    changed = True
    return "\n".join(lines)

text = re.sub(r"location\s+/(?:api|d)/\s*\{[^{}]*\}", ensure_timeouts, text, flags=re.S)
if changed:
    path.write_text(text, encoding="utf-8")
raise SystemExit(0 if changed else 10)
PY
    then
      echo "Patched Nginx proxy timeouts in ${conf}; backup: ${backup}"
      changed=1
    else
      local code=$?
      if [[ "${code}" -eq 10 ]]; then
        rm -f "${backup}"
      else
        exit "${code}"
      fi
    fi
  done

  if [[ "${changed}" -eq 1 ]]; then
    nginx -t
    systemctl reload nginx
  fi
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

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for DemoGo v0.9.4 Node.js runtime."
  exit 1
fi

if ! systemctl is-active --quiet docker; then
  echo "Docker service is not active. Starting docker..."
  systemctl start docker
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
Description=DemoGo v0.9.4 API
EOF
cat >/etc/systemd/system/demogo-server.service.d/database.conf <<EOF
[Service]
EnvironmentFile=${DB_ENV}
EOF
cat >/etc/systemd/system/demogo-server.service.d/runtime.conf <<'EOF'
[Service]
Environment=DEMOGO_RUNTIME_ENABLED=1
Environment=DEMOGO_RUNTIME_NODE_ENABLED=1
Environment=DEMOGO_RUNTIME_DRIVER=docker
Environment=DEMOGO_RUNTIME_DOCKER_IMAGE=node:20-alpine
Environment=DEMOGO_RUNTIME_MEMORY=512m
Environment=DEMOGO_RUNTIME_CPUS=1
Environment=DEMOGO_RUNTIME_TTL_MINUTES=120
Environment=DEMOGO_RUNTIME_START_TIMEOUT_SECONDS=180
Environment=DEMOGO_RUNTIME_MAX_INSTANCES=10
Environment=DEMOGO_DEMO_DB_ENABLED=1
Environment=DEMOGO_DEMO_DB_HOST=172.17.0.1
Environment=DEMOGO_DEMO_DB_PORT=3306
EOF

echo "Restarting demogo-server..."
systemctl daemon-reload
systemctl restart demogo-server

echo "Checking demogo-server status..."
systemctl status demogo-server --no-pager

echo "Checking API health..."
wait_for_health

echo "Checking hosting capabilities..."
curl -fsS http://127.0.0.1:3001/api/hosting/capabilities
echo

echo "Ensuring Nginx routes /d/ requests through DemoGo API..."
patch_nginx_demo_routes
echo "Ensuring Nginx proxy timeouts support runtime startup..."
patch_nginx_proxy_timeouts

echo "Deploy complete. Backup: ${BACKUP_DIR}"
