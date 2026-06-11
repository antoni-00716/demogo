#!/bin/bash
# DemoGo Server Health Monitor
# Usage: ./server-monitor.sh [--alert]
#   --alert: send alerts for issues (requires mailx or similar)

set -e

ALERT=${1:-""}
WARNINGS=""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

check() {
  local label=$1
  local status=$2
  local detail=$3
  if [ "$status" = "ok" ]; then
    echo -e "  ${GREEN}✅${NC} $label"
  else
    echo -e "  ${RED}❌${NC} $label: $detail"
    WARNINGS="$WARNINGS\n❌ $label: $detail"
  fi
}

warn() {
  local label=$1
  local detail=$2
  echo -e "  ${YELLOW}⚠️${NC} $label: $detail"
  WARNINGS="$WARNINGS\n⚠️ $label: $detail"
}

echo "=========================================="
echo "  DemoGo Server Health Monitor"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# 1. Service status
echo "--- Service ---"
if systemctl is-active --quiet demogo-server.service; then
  check "demogo-server" "ok"
else
  check "demogo-server" "fail" "service is not running!"
fi

# 2. Health API
echo "--- Health API ---"
HEALTH=$(curl -sf http://127.0.0.1:3001/api/health 2>/dev/null || echo "")
if [ -n "$HEALTH" ]; then
  VERSION=$(echo "$HEALTH" | python3 -c "import sys,json;print(json.load(sys.stdin).get('version','?'))" 2>/dev/null)
  CHECKS=$(echo "$HEALTH" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('checks',{})
for k in ['mysql','redis','docker']: print(f'{k}={d.get(k,False)}')
" 2>/dev/null)
  echo "$CHECKS" | while read line; do
    key=$(echo "$line" | cut -d= -f1)
    val=$(echo "$line" | cut -d= -f2)
    if [ "$val" = "True" ]; then
      check "$key" "ok"
    else
      check "$key" "fail"
    fi
  done
  check "version" "ok" "$VERSION"
else
  check "health endpoint" "fail" "cannot reach /api/health"
fi

# 3. SSL Certificate
echo "--- SSL ---"
SSL_EXPIRY=$(openssl s_client -connect 127.0.0.1:443 -servername demogo.cn </dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$SSL_EXPIRY" ]; then
  EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$SSL_EXPIRY" +%s 2>/dev/null)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
  if [ "$DAYS_LEFT" -le 7 ]; then
    warn "SSL certificate" "expires in $DAYS_LEFT days!"
  elif [ "$DAYS_LEFT" -le 30 ]; then
    warn "SSL certificate" "expires in $DAYS_LEFT days"
  else
    check "SSL certificate" "ok" "$DAYS_LEFT days remaining"
  fi
else
  check "SSL certificate" "fail" "cannot read certificate"
fi

# 4. Disk
echo "--- Disk ---"
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
DISK_AVAIL=$(df -h / | tail -1 | awk '{print $4}')
if [ "$DISK_USAGE" -ge 85 ]; then
  check "Disk usage" "fail" "${DISK_USAGE}% used, ${DISK_AVAIL} available"
elif [ "$DISK_USAGE" -ge 70 ]; then
  warn "Disk usage" "${DISK_USAGE}% used, ${DISK_AVAIL} available"
else
  check "Disk usage" "ok" "${DISK_USAGE}% used, ${DISK_AVAIL} available"
fi

# 5. Memory
echo "--- Memory ---"
MEM_TOTAL=$(free -m | grep Mem | awk '{print $2}')
MEM_USED=$(free -m | grep Mem | awk '{print $3}')
MEM_AVAIL=$(free -m | grep Mem | awk '{print $7}')
MEM_PCT=$(( MEM_USED * 100 / MEM_TOTAL ))
if [ "$MEM_PCT" -ge 85 ]; then
  check "Memory" "fail" "${MEM_PCT}% used (${MEM_USED}M/${MEM_TOTAL}M)"
elif [ "$MEM_PCT" -ge 70 ]; then
  warn "Memory" "${MEM_PCT}% used (${MEM_USED}M/${MEM_TOTAL}M)"
else
  check "Memory" "ok" "${MEM_PCT}% used (${MEM_AVAIL}M available)"
fi

# 6. Data directory size
echo "--- Data ---"
DATA_SIZE=$(du -sh /var/lib/demogo/data/ 2>/dev/null | awk '{print $1}' || echo "?")
check "Data directory" "ok" "$DATA_SIZE"

# 7. Docker
echo "--- Docker ---"
if docker ps &>/dev/null; then
  RUNNING=$(docker ps -q 2>/dev/null | wc -l)
  DEAD=$(docker ps -a --filter 'status=exited' -q 2>/dev/null | wc -l)
  check "Docker" "ok" "$RUNNING running, $DEAD dead"
  if [ "$DEAD" -gt 0 ]; then
    warn "Docker" "$DEAD dead containers"
  fi
else
  check "Docker" "fail" "cannot access Docker"
fi

echo ""
echo "=========================================="
if [ -n "$WARNINGS" ]; then
  echo -e "${YELLOW}Issues found:${NC}$WARNINGS"
  echo "=========================================="
  exit 1
else
  echo -e "${GREEN}All checks passed ✅${NC}"
  echo "=========================================="
  exit 0
fi
