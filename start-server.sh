#!/bin/bash
cd server
nohup node server.js > ../.freebuff/server.log 2>&1 &
echo "Server PID: $!"
