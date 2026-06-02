#!/usr/bin/env bash
set -euo pipefail

echo "Backend health:"
curl -fsS http://127.0.0.1:3001/api/health
echo

echo "Database env:"
if [[ -f /root/demogo-db.env ]]; then
  echo "/root/demogo-db.env exists"
else
  echo "/root/demogo-db.env missing"
fi

echo "Nginx API proxy:"
curl -fsS http://127.0.0.1/api/health
echo

echo "Hosting capabilities:"
curl -fsS http://127.0.0.1:3001/api/hosting/capabilities
echo

echo "Nginx /d/ route:"
if nginx -T 2>/dev/null | grep -A10 -E 'location /d/' | grep -q 'proxy_pass http://127.0.0.1:3001'; then
  echo "/d/ is proxied to demogo-server"
else
  echo "WARNING: /d/ is not proxied to demogo-server; Node.js runtime links may fail through Nginx"
fi

echo "Frontend pages:"
curl -I http://127.0.0.1/ | head
curl -I http://127.0.0.1/login.html | head
curl -I http://127.0.0.1/app.html | head
curl -I http://127.0.0.1/admin.html | head

echo "Key files:"
ls -lh /var/www/demogo-preview/index.html /var/www/demogo-preview/app.html /var/www/demogo-preview/admin.html
ls -lh /opt/demogo/server/package.json /opt/demogo/server/src/server.js

echo "DemoGo service:"
systemctl status demogo-server --no-pager
