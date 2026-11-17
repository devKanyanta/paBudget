#!/usr/bin/env bash
# Runs ON THE VPS after CI has rsynced the pre-built app into ~/pabudget.
# No git, no installs, no builds here: only migrate + restart.
set -euo pipefail
APP_DIR="${APP_DIR:-$HOME/pabudget}"
cd "$APP_DIR"

echo "==> Migrating database"
(cd backend && npx prisma migrate deploy)

echo "==> Restarting PM2"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
echo "==> Deployed"
