#!/usr/bin/env bash
# Daily Postgres backup with 14-day retention (NFR-13). Cron example:
#   15 2 * * * DATABASE_URL=postgresql://... BACKUP_DIR=/var/backups/pabudget /path/to/scripts/backup.sh
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$DIR"
FILE="$DIR/pabudget-$(date +%Y%m%d-%H%M%S).sql.gz"
pg_dump --no-owner "$DATABASE_URL" | gzip > "$FILE"
find "$DIR" -name 'pabudget-*.sql.gz' -mtime +14 -delete
echo "Backup written to $FILE"
