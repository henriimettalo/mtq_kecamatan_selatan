#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
env_file="${MTQ_ENV_FILE:-.env}"
compose=(docker compose --env-file "$env_file")
backup_dir="${1:-./backups/$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$(dirname "$backup_dir")"
mkdir "$backup_dir"
backup_dir="$(cd "$backup_dir" && pwd)"
"${compose[@]}" stop app
trap '"${compose[@]}" up -d app >/dev/null' EXIT
"${compose[@]}" exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u "$MYSQL_USER" --single-transaction --no-tablespaces "$MYSQL_DATABASE"' > "$backup_dir/database.sql"
"${compose[@]}" cp app:/app/storage "$backup_dir/storage"
tar -czf "$backup_dir/storage.tar.gz" -C "$backup_dir/storage" uploads event-assets
rm -r "$backup_dir/storage"
cp "$env_file" "$backup_dir/environment.env"
printf 'Backup tersimpan: %s\n' "$backup_dir"
