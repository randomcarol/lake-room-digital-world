#!/bin/bash
# 双击运行:启动本地服务器并打开 3D 房间预览
cd "$(dirname "$0")"
PORT=8931
if ! curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$PORT/index.html"; then
  nohup python3 -m http.server $PORT >/dev/null 2>&1 &
  sleep 1
fi
open "http://127.0.0.1:$PORT/index.html"
