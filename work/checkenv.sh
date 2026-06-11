#!/bin/bash
SPID=$(ps aux | grep "node.*server.js" | grep -v grep | head -1 | tr -s " " | cut -d" " -f2)
WPID=$(ps aux | grep "node.*worker.js" | grep -v grep | head -1 | tr -s " " | cut -d" " -f2)
echo "Server PID: $SPID"
echo "Worker PID: $WPID"
echo "=== SERVER ENV ==="
cat /proc/$SPID/environ 2>/dev/null | tr "\0" "\n" | grep -E "DB_|DEMOGO|REDIS|NODE"
echo "=== WORKER ENV ==="
cat /proc/$WPID/environ 2>/dev/null | tr "\0" "\n" | grep -E "DB_|DEMOGO|REDIS|NODE"
