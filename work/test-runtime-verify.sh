#!/bin/bash
set -e
echo "=== Docker check ==="
docker --version
echo "=== Capabilities ==="
curl -sf http://127.0.0.1:3001/api/hosting/capabilities | python3 -m json.tool | grep -E status | head -5
echo "=== Health ==="
curl -sf http://127.0.0.1:3001/api/health | python3 -c "import sys,json;d=json.load(sys.stdin);print('redis:',d.get('checks',{}).get('redis'));print('docker:',d.get('checks',{}).get('docker'))"
echo "=== Container test ==="
CID=$(docker run -d --rm -e PORT=3456 node:20-alpine node -e "const h=require('http');h.createServer((q,r)=>{r.end('ok')}).listen(3456,()=>console.log('up'))" 2>/dev/null) && echo "Started: $CID" || echo "FAILED"
sleep 2
curl -sf http://127.0.0.1:3456/ && echo " HTTP OK" || echo "HTTP FAIL"
docker stop $CID 2>/dev/null || true
echo "ALL_DONE"