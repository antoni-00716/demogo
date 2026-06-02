#!/bin/bash
set -e
# DemoGo Server Deploy Script (version read from VERSION file)

VERSION=$(cat /opt/demogo/current/VERSION 2>/dev/null || cat /opt/demogo/server/VERSION 2>/dev/null || echo "unknown")
DEPLOY_ROOT="/opt/demogo"
SERVER_DIR="$DEPLOY_ROOT/server"
SITE_ROOT="/var/www/demogo-preview"
TMP_DIR="/tmp"
BACKUP_DIR="$DEPLOY_ROOT/backups/v$VERSION-$(date +%Y%m%d-%H%M%S)"

echo "=== DemoGo v$VERSION Deployment ==="
echo "$(date): Starting deployment"

# 1. Backup node_modules before stopping
echo "Backing up node_modules..."
mkdir -p "$BACKUP_DIR"
if [ -d "$SERVER_DIR/node_modules" ]; then
    cp -r "$SERVER_DIR/node_modules" "$BACKUP_DIR/node_modules"
fi

# 2. Stop the service
echo "Stopping demogo-server service..."
systemctl stop demogo-server.service 2>/dev/null || true
sleep 2

# 3. Extract server package
echo "Extracting server package..."
mkdir -p "$TMP_DIR/server-package"
unzip -oq "$TMP_DIR/demogo-server-v$VERSION.zip" -d "$TMP_DIR/server-package"

# 4. Deploy server source files
echo "Deploying server files..."
if [ -d "$TMP_DIR/server-package/src" ]; then
    rm -rf "$SERVER_DIR/src"
    cp -r "$TMP_DIR/server-package/src" "$SERVER_DIR/"
fi
cp -f "$TMP_DIR/server-package/package.json" "$SERVER_DIR/"
cp -f "$TMP_DIR/server-package/package-lock.json" "$SERVER_DIR/" 2>/dev/null || true
cp -f "$TMP_DIR/server-package/VERSION" "$SERVER_DIR/" 2>/dev/null || true

# 5. Restore node_modules (no reinstall needed for v0.9.30->v0.9.31, deps unchanged)
if [ -d "$BACKUP_DIR/node_modules" ]; then
    echo "Restoring node_modules from backup..."
    rm -rf "$SERVER_DIR/node_modules"
    cp -r "$BACKUP_DIR/node_modules" "$SERVER_DIR/node_modules"
fi

# 6. Deploy site preview
echo "Syncing to current release..."
CURRENT_DIR="$DEPLOY_ROOT/current"
if [ -L "$CURRENT_DIR" ] || [ -d "$CURRENT_DIR" ]; then
    rm -rf "$CURRENT_DIR/src"
    cp -r "$SERVER_DIR/src" "$CURRENT_DIR/"
    cp -f "$SERVER_DIR/VERSION" "$CURRENT_DIR/"
    cp -f "$SERVER_DIR/package.json" "$CURRENT_DIR/"
    echo "Current release synced"
fi

echo "Deploying site preview..."
rm -f "$SITE_ROOT"/assets/main-*.js "$SITE_ROOT"/assets/main-*.css
mkdir -p "$SITE_ROOT"
if [ -f "$TMP_DIR/demogo-site-preview.zip" ]; then
    unzip -oq "$TMP_DIR/demogo-site-preview.zip" -d "$TMP_DIR/site-preview-new"
    cp -r "$TMP_DIR/site-preview-new/"* "$SITE_ROOT/"
chmod -R 755 "$SITE_ROOT/assets" 2>/dev/null || true
fi

# 7. Start the service
echo "Starting demogo-server service..."
systemctl start demogo-server.service
sleep 3

# 8. Health check
echo "Verifying deployment..."
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
    echo "ERROR: Health check failed"
    systemctl status demogo-server.service --no-pager
    exit 1
fi

echo "=== DemoGo v$VERSION deployment complete ==="
