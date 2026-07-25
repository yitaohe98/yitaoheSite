#!/usr/bin/env bash

set -euo pipefail

database_name="${COMMENTS_DB_NAME:-yitaohe-comments}"
backup_directory="${COMMENTS_BACKUP_DIRECTORY:-backups/comments}"
timestamp="$(date -u '+%Y-%m-%d-%H%M%S')"
output_file="${backup_directory}/comments-${timestamp}.sql"

if ! command -v wrangler >/dev/null 2>&1; then
  echo "wrangler is required. Install it before running this backup script." >&2
  exit 1
fi

mkdir -p "${backup_directory}"
wrangler d1 export "${database_name}" \
  --remote \
  --output="${output_file}"

if [[ ! -s "${output_file}" ]]; then
  echo "Backup failed: ${output_file} is empty." >&2
  exit 1
fi

echo "Comments backup created: ${output_file}"
