#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root."
  exit 1
fi

echo "This script will clean DemoGo user/demo data on this server."
echo "A backup will be created under /var/lib/demogo/backups before cleaning."
echo "It will remove:"
echo "- MySQL business rows: users, sessions, demos, versions, jobs, inspections, reviews, forms, submissions, feedback, audit logs, plan upgrade requests"
echo "- /var/lib/demogo/data/users.json"
echo "- /var/lib/demogo/data/sessions.json"
echo "- /var/lib/demogo/data/demos.json"
echo "- /var/lib/demogo/data/deployment-events.json"
echo "- /var/lib/demogo/data/deployment-jobs.json"
echo "- /var/lib/demogo/data/audit-logs.json"
echo "- /var/lib/demogo/data/feedback.json"
echo "- /var/lib/demogo/data/forms.json"
echo "- /var/lib/demogo/data/form-submissions.json"
echo "- /var/lib/demogo/data/plan-upgrade-requests.json"
echo "- /var/lib/demogo/data/content-reviews.json"
echo "- /var/lib/demogo/data/offline-demos"
echo "- /var/lib/demogo/data/update-staging"
echo "- /var/lib/demogo/data/update-backups"
echo "- /var/lib/demogo/uploads/*"
echo "- /var/www/demogo-preview/d/*"
echo "- old /var/www/demo"
echo "- old /tmp DemoGo packages, excluding the current deployment packages"
echo
read -r -p "Type DELETE_DEMOGO_DATA to continue: " CONFIRM
if [[ "${CONFIRM}" != "DELETE_DEMOGO_DATA" ]]; then
  echo "Cancelled."
  exit 1
fi

DB_ENV="/root/demogo-db.env"
DATA_DIR="/var/lib/demogo/data"
UPLOAD_DIR="/var/lib/demogo/uploads"
DEMO_ROOT="/var/www/demogo-preview/d"
BACKUP_DIR="/var/lib/demogo/backups/clean-data-$(date +%Y%m%d%H%M%S)"
BUSINESS_TABLES=(
  form_submissions
  forms
  feedback
  plan_upgrade_requests
  content_reviews
  project_inspections
  demo_versions
  deployment_events
  audit_logs
  demos
  sessions
  users
)

if [[ ! -f "${DB_ENV}" ]]; then
  echo "Missing ${DB_ENV}. Refuse to clean because MySQL may still contain business data."
  exit 1
fi

if ! command -v mysql >/dev/null 2>&1; then
  echo "Missing mysql client."
  exit 1
fi

if ! command -v mysqldump >/dev/null 2>&1; then
  echo "Missing mysqldump client."
  exit 1
fi

set -a
source "${DB_ENV}"
set +a

if [[ -z "${DEMOGO_DB_HOST:-}" || -z "${DEMOGO_DB_NAME:-}" || -z "${DEMOGO_DB_USER:-}" || -z "${DEMOGO_DB_PASSWORD:-}" ]]; then
  echo "DEMOGO_DB_* environment variables are incomplete."
  exit 1
fi

MYSQL_ARGS=(
  -h "${DEMOGO_DB_HOST}"
  -P "${DEMOGO_DB_PORT:-3306}"
  -u "${DEMOGO_DB_USER}"
)

echo "Stopping demogo-server..."
systemctl stop demogo-server || true

echo "Backing up current business data..."
mkdir -p "${BACKUP_DIR}"
if [[ -d "${DATA_DIR}" ]]; then
  cp -a "${DATA_DIR}" "${BACKUP_DIR}/data"
fi
if [[ -d "${UPLOAD_DIR}" ]]; then
  cp -a "${UPLOAD_DIR}" "${BACKUP_DIR}/uploads"
fi
if [[ -d "${DEMO_ROOT}" ]]; then
  mkdir -p "${BACKUP_DIR}/published-demos"
  cp -a "${DEMO_ROOT}/." "${BACKUP_DIR}/published-demos/" 2>/dev/null || true
fi
MYSQL_PWD="${DEMOGO_DB_PASSWORD}" mysqldump \
  --single-transaction \
  --quick \
  --skip-lock-tables \
  --no-tablespaces \
  "${MYSQL_ARGS[@]}" \
  "${DEMOGO_DB_NAME}" \
  "${BUSINESS_TABLES[@]}" >"${BACKUP_DIR}/business-data.sql"

echo "Cleaning MySQL business tables..."
{
  echo "SET FOREIGN_KEY_CHECKS=0;"
  for table in "${BUSINESS_TABLES[@]}"; do
    echo "TRUNCATE TABLE \`${table}\`;"
  done
  echo "SET FOREIGN_KEY_CHECKS=1;"
} | MYSQL_PWD="${DEMOGO_DB_PASSWORD}" mysql "${MYSQL_ARGS[@]}" "${DEMOGO_DB_NAME}"

echo "Cleaning DemoGo data..."
rm -f "${DATA_DIR}/users.json"
rm -f "${DATA_DIR}/sessions.json"
rm -f "${DATA_DIR}/demos.json"
rm -f "${DATA_DIR}/deployment-events.json"
rm -f "${DATA_DIR}/deployment-jobs.json"
rm -f "${DATA_DIR}/audit-logs.json"
rm -f "${DATA_DIR}/feedback.json"
rm -f "${DATA_DIR}/forms.json"
rm -f "${DATA_DIR}/form-submissions.json"
rm -f "${DATA_DIR}/plan-upgrade-requests.json"
rm -f "${DATA_DIR}/content-reviews.json"
rm -f "${DATA_DIR}/mysql-migration-status.json"
rm -rf "${DATA_DIR}/offline-demos"
rm -rf "${DATA_DIR}/update-staging"
rm -rf "${DATA_DIR}/update-backups"

mkdir -p "${DATA_DIR}"
mkdir -p "${UPLOAD_DIR}"
find "${UPLOAD_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +

mkdir -p "${DEMO_ROOT}"
find "${DEMO_ROOT}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +

rm -rf /var/www/demo
find /tmp -maxdepth 1 -type f -name 'demogo-server-v*.zip' ! -name 'demogo-server-v0.2.6.zip' -delete
find /tmp -maxdepth 1 -type f -name 'demogo-ops-scripts-v*.zip' ! -name 'demogo-ops-scripts-v0.2.6.zip' -delete
find /tmp -maxdepth 1 -type f -name 'demogo-site-preview*.zip' ! -name 'demogo-site-preview.zip' -delete
rm -f /tmp/static-demo-test.zip
rm -f /tmp/source-demo-test.zip

echo "Restarting demogo-server..."
systemctl start demogo-server

echo "Checking health..."
for i in {1..20}; do
  if curl -fsS http://127.0.0.1:3001/api/health; then
    echo
    break
  fi
  if [[ "${i}" -eq 20 ]]; then
    echo "DemoGo health check failed after waiting."
    systemctl status demogo-server --no-pager || true
    exit 1
  fi
  sleep 1
done

echo "Clean complete."
echo "Backup: ${BACKUP_DIR}"
