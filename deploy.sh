#!/bin/bash
set -e

TRUENAS_IP="192.168.10.181"
REMOTE_USER="root"
REMOTE_PATH="/mnt/tank/apps/scout-docmgr"
SSH_KEY="$HOME/.ssh/id_truenas"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=accept-new"

echo "==> Syncing to TrueNAS at $TRUENAS_IP..."
rsync -avz -e "ssh $SSH_OPTS" \
  --exclude 'node_modules' --exclude '__pycache__' --exclude '.git' \
  ./ "${REMOTE_USER}@${TRUENAS_IP}:${REMOTE_PATH}/"

echo "==> Building and starting containers..."
ssh $SSH_OPTS "${REMOTE_USER}@${TRUENAS_IP}" "cd ${REMOTE_PATH} && docker compose pull db && docker compose up -d --build"

echo ""
echo "✓ Deployed! App available at:"
echo "  Frontend: http://${TRUENAS_IP}:3003"
echo "  API docs: http://${TRUENAS_IP}:8003/docs"
