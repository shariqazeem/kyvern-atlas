#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# push-commerce.sh — one-shot deploy of the local working tree to
# the Oracle VM (Kyvern Commerce at app.kyvernlabs.com, port 3001).
#
# Usage:
#     ./scripts/push-commerce.sh
#
# What it does:
#   1. rsyncs the LOCAL project tree → VM ~/kyvernlabs-commerce
#      (excludes node_modules, .next, .git, .claude, anchor/target, db files)
#   2. SSHs in and runs ~/deploy-commerce.sh (build + pm2 restart)
#
# What it does NOT touch:
#   • the old pm2 'kyvernlabs' process
#   • /etc/nginx/sites-available/kyvernlabs
#   • the kyvernlabs.com certificate
#
# Expected wall time:
#   • ~20s rsync (only changed files)
#   • ~90s next build
#   • ~3s pm2 restart + health check
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Config (override via env if needed) ──
VM_USER="${VM_USER:-ubuntu}"
VM_HOST="${VM_HOST:-80.225.209.190}"
SSH_KEY="${SSH_KEY:-$HOME/Documents/ssh-key3.key}"
REMOTE_DIR="${REMOTE_DIR:-kyvernlabs-commerce}"

# Resolve repo root from this script's location so it works no matter
# where the user calls it from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "→ Rsync $REPO_ROOT → $VM_USER@$VM_HOST:~/$REMOTE_DIR"
# Using -v + --stats for portability with stock mac rsync (no --info=progress2)
rsync -azv --stats --delete-after \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='.claude' \
  --exclude='anchor/target' \
  --exclude='.DS_Store' \
  --exclude='*.db' \
  --exclude='*.db-shm' \
  --exclude='*.db-wal' \
  --exclude='.vercel' \
  -e "ssh -i $SSH_KEY" \
  "$REPO_ROOT/" "$VM_USER@$VM_HOST:$REMOTE_DIR/"

echo "→ Running deploy-commerce.sh on the VM..."
ssh -i "$SSH_KEY" "$VM_USER@$VM_HOST" "bash ~/deploy-commerce.sh"

echo ""
echo "✓ Live at: https://app.kyvernlabs.com"
