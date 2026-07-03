#!/bin/bash
cd /home/z/my-project
if ! pgrep -f "next-server" > /dev/null 2>&1; then
  nohup node_modules/.bin/next dev -p 3000 </dev/null >dev.log 2>&1 &
fi
