#!/bin/bash
cd "$(dirname "$0")/.."
PORT=8932
if ! curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$PORT/api/health"; then
  nohup python3 backend/server.py --port "$PORT" >/tmp/room-content-server.log 2>&1 &
  sleep 1
fi
open "http://127.0.0.1:$PORT/"
