#!/bin/bash
# DemoGo v0.9.34 server rollback script
set -e

DEPLOY_ROOT="/opt/demogo"
SERVER_DIR="$DEPLOY_ROOT/server"
SITE_ROOT="/var/www/demogo-preview"

TARGET_VERSION="0.9.34"

echo "=== DemoGo Rollback to v${TARGET_VERSION} ==="
echo "$(date): Starting rollback"

# 1. 查找备份
BACKUP_DIR=$(ls -dt "$DEPLOY_ROOT/backups/v${TARGET_VERSION}"-* 2>/dev/null | head -1)
if [ -z "$BACKUP_DIR" ]; then
    echo "ERROR: No backup found for v${TARGET_VERSION}"
    exit 1
fi
echo "Found backup at $BACKUP_DIR"

# 2. 检查备份完整性
if [ ! -d "$BACKUP_DIR/node_modules" ] && [ ! -d "$BACKUP_DIR/src" ]; then
    echo "ERROR: Backup incomplete - missing data"
    exit 1
fi

# 3. 停止服务
echo "Stopping demogo-server service..."
systemctl stop demogo-server.service 2>/dev/null || true
sleep 2

# 4. 恢复 src 目录
if [ -d "$BACKUP_DIR/src" ]; then
    echo "Restoring source files..."
    rm -rf "$SERVER_DIR/src"
    cp -r "$BACKUP_DIR/src" "$SERVER_DIR/"
fi

# 5. 恢复 package.json 和 VERSION
if [ -f "$BACKUP_DIR/package.json" ]; then
    cp -f "$BACKUP_DIR/package.json" "$SERVER_DIR/"
fi
if [ -f "$BACKUP_DIR/VERSION" ]; then
    cp -f "$BACKUP_DIR/VERSION" "$SERVER_DIR/"
fi

# 6. 恢复 node_modules
if [ -d "$BACKUP_DIR/node_modules" ]; then
    echo "Restoring node_modules..."
    rm -rf "$SERVER_DIR/node_modules"
    cp -r "$BACKUP_DIR/node_modules" "$SERVER_DIR/"
fi

# 7. 同步 current 目录
CURRENT_DIR="$DEPLOY_ROOT/current"
if [ -L "$CURRENT_DIR" ] || [ -d "$CURRENT_DIR" ]; then
    rm -rf "$CURRENT_DIR/src"
    cp -r "$SERVER_DIR/src" "$CURRENT_DIR/"
    cp -f "$SERVER_DIR/VERSION" "$CURRENT_DIR/" 2>/dev/null || true
    cp -f "$SERVER_DIR/package.json" "$CURRENT_DIR/" 2>/dev/null || true
    echo "Current release synced"
fi

# 8. 启动服务
echo "Starting demogo-server service..."
systemctl start demogo-server.service
sleep 3

# 9. 健康检查
echo "Verifying rollback..."
HEALTH_OK=0
for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
        HEALTH=$(curl -s http://127.0.0.1:3001/api/health)
        echo "Health check OK: $HEALTH"
        HEALTH_OK=1
        break
    fi
    echo "Waiting for health... ($i/10)"
    sleep 2
done

if [ $HEALTH_OK -eq 0 ]; then
    echo "ERROR: Health check failed after rollback"
    systemctl status demogo-server.service --no-pager || true
    exit 1
fi

echo "=== Rollback to v${TARGET_VERSION} complete ==="
