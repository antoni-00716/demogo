#!/bin/bash
set -e
echo "=== DemoGo v0.9.33 Deployment ==="
DEPLOY_ROOT="/opt/demogo"
SERVER_DIR="$DEPLOY_ROOT/server"
CURRENT_DIR="$DEPLOY_ROOT/current"
SITE_ROOT="/var/www/demogo-preview"
TMP_DIR="/tmp"
VERSION="0.9.33"
BACKUP_DIR="$DEPLOY_ROOT/backups/v$VERSION-$(date +%Y%m%d-%H%M%S)"

# 1. Backup + stop
echo "Backing up node_modules..."
mkdir -p "$BACKUP_DIR"
if [ -d "$SERVER_DIR/node_modules" ]; then
    cp -r "$SERVER_DIR/node_modules" "$BACKUP_DIR/node_modules"
fi

echo "Stopping services..."
systemctl stop demogo-server.service 2>/dev/null || true
systemctl stop demogo-worker.service 2>/dev/null || true
sleep 2

# 2. Extract packages
echo "Extracting server package..."
mkdir -p "$TMP_DIR/server-package"
rm -rf "$TMP_DIR/server-package"/*
unzip -oq "$TMP_DIR/demogo-server-v$VERSION.zip" -d "$TMP_DIR/server-package"

echo "Extracting ops scripts..."
mkdir -p "$TMP_DIR/ops-package"
rm -rf "$TMP_DIR/ops-package"/*
unzip -oq "$TMP_DIR/demogo-ops-scripts-v$VERSION.zip" -d "$TMP_DIR/ops-package"

# 3. Deploy server
echo "Deploying server files..."
if [ -d "$TMP_DIR/server-package/src" ]; then
    rm -rf "$SERVER_DIR/src"
    cp -r "$TMP_DIR/server-package/src" "$SERVER_DIR/"
fi
cp -f "$TMP_DIR/server-package/package.json" "$SERVER_DIR/"
cp -f "$TMP_DIR/server-package/package-lock.json" "$SERVER_DIR/" 2>/dev/null || true
cp -f "$TMP_DIR/server-package/VERSION" "$SERVER_DIR/" 2>/dev/null || true
echo "$VERSION" > "$SERVER_DIR/VERSION"

# 4. Install deps
echo "Installing server dependencies..."
cd "$SERVER_DIR"
npm install --omit=dev 2>&1 | tail -3

# 5. Sync to current
echo "Syncing to current release..."
if [ -L "$CURRENT_DIR" ] || [ -d "$CURRENT_DIR" ]; then
    rm -rf "$CURRENT_DIR/src"
    cp -r "$SERVER_DIR/src" "$CURRENT_DIR/"
    cp -f "$SERVER_DIR/VERSION" "$CURRENT_DIR/"
    cp -f "$SERVER_DIR/package.json" "$CURRENT_DIR/"
    cp -f "$SERVER_DIR/package-lock.json" "$CURRENT_DIR/"
fi

# 6. Deploy site preview
echo "Deploying site preview..."
rm -f "$SITE_ROOT"/assets/main-*.js "$SITE_ROOT"/assets/main-*.css
mkdir -p "$SITE_ROOT"
if [ -f "$TMP_DIR/demogo-site-preview.zip" ]; then
    rm -rf "$TMP_DIR/site-preview-new"
    unzip -oq "$TMP_DIR/demogo-site-preview.zip" -d "$TMP_DIR/site-preview-new"
    cp -r "$TMP_DIR/site-preview-new/"* "$SITE_ROOT/"
    chmod -R 755 "$SITE_ROOT/assets" 2>/dev/null || true
fi

# 7. Start services
echo "Starting services..."
systemctl start demogo-server.service
systemctl start demogo-worker.service
sleep 3

# 8. Health check
echo "Verifying deployment..."
HEALTH_OK=0
for i in 1 2 3 4 5; do
    if curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
        echo "Health check OK"
        HEALTH_OK=1
        break
    fi
    echo "Waiting... ($i/5)"
    sleep 2
done

if [ $HEALTH_OK -eq 0 ]; then
    echo "ERROR: Health check failed"
    exit 1
fi

echo "=== DemoGo v$VERSION deployment complete ==="
