#!/bin/bash
# Dev server watchdog — keeps next-server alive forever.
# The sandbox kills background processes periodically; this script detects
# the kill and restarts the server within 3 seconds.
cd /home/z/my-project

LOG="/home/z/my-project/dev.log"
PIDFILE="/home/z/my-project/.dev-server.pid"

while true; do
  # Check if next-server is running
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    # Server is dead — restart it
    echo "[$(date)] watchdog: server dead, restarting..." >> "$LOG"
    # Start next dev directly (not via bun, to avoid pipeline issues)
    setsid node_modules/.bin/next dev -p 3000 >> "$LOG" 2>&1 &
    echo $! > "$PIDFILE"
    # Wait for it to boot
    sleep 8
    if pgrep -f "next-server" > /dev/null 2>&1; then
      echo "[$(date)] watchdog: server restarted OK" >> "$LOG"
    else
      echo "[$(date)] watchdog: server failed to start, retrying in 5s" >> "$LOG"
      sleep 5
    fi
  else
    # Server is alive — short sleep before next check
    sleep 3
  fi
done
