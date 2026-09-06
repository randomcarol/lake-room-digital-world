#!/usr/bin/env bash
set -euo pipefail

KEY="${ROOM_SSH_KEY:-$HOME/Downloads/sshkey_carol.pem}"
HOST="${ROOM_SSH_HOST:-ubuntu@101.33.230.97}"
SOURCE_DIR="/Users/dengzhilei/Documents/Codex/2026-08-15/wo-xi/outputs/room-preview"
ARCHIVE="/tmp/room-preview-deploy.tar.gz"
REMOTE_DIR="/var/www/room-preview"

if [[ ! -f "$KEY" ]]; then
  echo "找不到 SSH 私钥: $KEY" >&2
  exit 1
fi

chmod 600 "$KEY"
COPYFILE_DISABLE=1 tar -czf "$ARCHIVE" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")"
scp -i "$KEY" -o IdentitiesOnly=yes "$ARCHIVE" "$HOST:/tmp/room-preview-deploy.tar.gz"
ssh -i "$KEY" -o IdentitiesOnly=yes "$HOST" \
  "sudo mkdir -p '$REMOTE_DIR' && sudo tar -xzf /tmp/room-preview-deploy.tar.gz -C /var/www && sudo chown -R www-data:www-data '$REMOTE_DIR' && rm -f /tmp/room-preview-deploy.tar.gz"
rm -f "$ARCHIVE"
echo "部署完成: http://101.33.230.97/room/"
