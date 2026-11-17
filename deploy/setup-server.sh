#!/usr/bin/env bash
# One-time VPS bootstrap (Ubuntu/Debian). Run as a sudo-capable non-root user:
#   DOMAIN=pabudget.example.com API_DOMAIN=api.pabudget.example.com \
#   EMAIL=you@example.com bash deploy/setup-server.sh
set -euo pipefail
: "${DOMAIN:?set DOMAIN}"; : "${API_DOMAIN:?set API_DOMAIN}"; : "${EMAIL:?set EMAIL}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"   # any dir containing deploy/nginx (scp -r deploy ~/pabudget/)

sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx rsync curl
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
command -v pm2 >/dev/null || sudo npm i -g pm2

# nginx sites (placeholders -> real domains)
for site in web api; do
  sed -e "s/__DOMAIN__/$DOMAIN/g" -e "s/__API_DOMAIN__/$API_DOMAIN/g" \
    "$REPO_DIR/deploy/nginx/$site.conf" | sudo tee "/etc/nginx/sites-available/pabudget-$site" >/dev/null
  sudo ln -sf "/etc/nginx/sites-available/pabudget-$site" "/etc/nginx/sites-enabled/pabudget-$site"
done
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# TLS (certbot edits the nginx configs, adds redirect, auto-renews)
sudo certbot --nginx --non-interactive --agree-tos -m "$EMAIL" --redirect -d "$DOMAIN" -d "www.$DOMAIN"
sudo certbot --nginx --non-interactive --agree-tos -m "$EMAIL" --redirect -d "$API_DOMAIN"

# PM2 on boot
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | sudo bash || true

echo "Done. Next: create ~/pabudget/backend/.env, then push to main (CI ships the build)"
