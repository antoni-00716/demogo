#!/bin/bash
set -e
echo "=== Deploying v0.9.32 ==="
systemctl stop demogo-server.service
sleep 1
mkdir -p /tmp/server-package
unzip -oq /tmp/demogo-server-v0.9.32.zip -d /tmp/server-package
rm -rf /opt/demogo/server/src
cp -r /tmp/server-package/src /opt/demogo/server/
cp -f /tmp/server-package/package.json /opt/demogo/server/
cp -f /tmp/server-package/VERSION /opt/demogo/server/
rm -rf /opt/demogo/current/src
cp -r /tmp/server-package/src /opt/demogo/current/
cp -f /tmp/server-package/VERSION /opt/demogo/current/
cp -f /tmp/server-package/package.json /opt/demogo/current/
unzip -oq /tmp/demogo-site-preview.zip -d /tmp/site-preview-new
cp -r /tmp/site-preview-new/* /var/www/demogo-preview/
systemctl start demogo-server.service
sleep 3
curl -s http://127.0.0.1:3001/api/health
echo ""
echo "=== Deploy complete ==="