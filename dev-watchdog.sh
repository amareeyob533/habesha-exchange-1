#!/bin/bash
cd /home/z/my-project
LOG="/home/z/my-project/dev.log"
while true; do
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    echo "[$(date)] watchdog: server dead, restarting..." >> "$LOG"
    node_modules/.bin/next dev -p 3000 >> "$LOG" 2>&1 &
    sleep 10
  else
    sleep 5
  fi
done
