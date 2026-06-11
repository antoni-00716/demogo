#!/bin/bash
# DemoGo 每日备份脚本
# 备份 MySQL 数据库和数据目录，保留最近14天备份
set -e

# ========== 配置 ==========
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-demogo}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-demogo}"

DATA_DIR="${STORAGE_PATH:-/opt/demogo/data}"
BACKUP_BASE="${BACKUP_DIR:-/opt/demogo/backups}"
RETENTION_DAYS=14

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_BASE}/daily-${TIMESTAMP}"
NOTIFY_EMAIL="${ADMIN_EMAIL:-root@localhost}"

# ========== 函数 ==========
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error_exit() {
    log "ERROR: $*"
    echo "DemoGo 备份失败: $*" | mail -s "[DemoGo] Backup Failed - ${TIMESTAMP}" "${NOTIFY_EMAIL}"
    exit 1
}

# ========== 主流程 ==========
log "=== DemoGo 每日备份开始 ==="

# 1. 创建备份目录
mkdir -p "${BACKUP_DIR}" || error_exit "无法创建备份目录 ${BACKUP_DIR}"

# 2. 备份 MySQL
log "备份 MySQL 数据库: ${DB_NAME}"
MYSQLDUMP_OPTS="--host=${DB_HOST} --port=${DB_PORT} --user=${DB_USER} --single-transaction --routines --events --triggers"
if [ -n "${DB_PASSWORD}" ]; then
    MYSQLDUMP_OPTS="${MYSQLDUMP_OPTS} --password=${DB_PASSWORD}"
fi
mysqldump ${MYSQLDUMP_OPTS} "${DB_NAME}" > "${BACKUP_DIR}/demogo-db.sql" 2>/dev/null || error_exit "MySQL 备份失败"
gzip -f "${BACKUP_DIR}/demogo-db.sql"
log "MySQL 备份完成: ${BACKUP_DIR}/demogo-db.sql.gz"

# 3. 备份数据目录
if [ -d "${DATA_DIR}" ]; then
    log "备份数据目录: ${DATA_DIR}"
    tar czf "${BACKUP_DIR}/demogo-data.tar.gz" -C "$(dirname "${DATA_DIR}")" "$(basename "${DATA_DIR}")" 2>/dev/null || error_exit "数据目录备份失败"
    log "数据目录备份完成: ${BACKUP_DIR}/demogo-data.tar.gz"
else
    log "警告: 数据目录 ${DATA_DIR} 不存在，跳过"
fi

# 4. 生成备份摘要
{
    echo "DemoGo 每日备份报告"
    echo "====================="
    echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "备份目录: ${BACKUP_DIR}"
    echo ""
    echo "备份文件:"
    ls -lh "${BACKUP_DIR}/" 2>/dev/null || true
} > "${BACKUP_DIR}/backup-report.txt"

# 5. 清理过期备份
log "清理 ${RETENTION_DAYS} 天前的旧备份..."
find "${BACKUP_BASE}" -maxdepth 1 -type d -name "daily-*" -mtime +${RETENTION_DAYS} -exec rm -rf {} \; 2>/dev/null || true
log "过期备份清理完成"

# 6. 通知成功
echo "DemoGo 备份成功 - ${TIMESTAMP}" | mail -s "[DemoGo] Backup Success - ${TIMESTAMP}" "${NOTIFY_EMAIL}"

log "=== DemoGo 每日备份完成 ==="
