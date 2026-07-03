#!/bin/bash
cd /home/z/my-project
while true; do
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    node_modules/.bin/next dev -p 3000 > dev.log 2>&1 &
    NEXT_PID=$!
    sleep 10
  else
    sleep 5
  fi
done
