#!/usr/bin/env bash
# ============================================================
# Deterministic DB setup script.
# ------------------------------------------------------------
# Fixes the gap where `npm run db:migrate` only ran schema.sql and
# silently skipped every migration_*.sql file. Not a migration
# framework — just runs schema.sql, then each migration_*.sql in
# filename order. Every migration in this repo already uses
# IF NOT EXISTS / IF EXISTS / ADD COLUMN IF NOT EXISTS guards, so
# this is safe to re-run on an already-migrated database.
#
# Usage:
#   DATABASE_URL=postgresql://user:pass@host:5432/dbname ./db/migrate.sh
# (run from the repo root, or from backend/ via `npm run db:migrate`)
# ============================================================
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# schema.sql itself has no IF NOT EXISTS guards on its CREATE TABLE
# statements (unlike every migration_*.sql file), so re-running it on an
# already-set-up database fails with "relation already exists". Check
# first so this script is safe to re-run — e.g. after a container
# restart on a persisted volume, or after pulling new migrations.
SCHEMA_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT to_regclass('public.complaints') IS NOT NULL;")
if [ "$SCHEMA_EXISTS" = "t" ]; then
  echo "==> Base schema already present — skipping db/schema.sql"
else
  echo "==> Applying db/schema.sql"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/schema.sql"
fi

for f in "$SCRIPT_DIR"/migration_*.sql; do
  [ -e "$f" ] || continue
  echo "==> Applying $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "==> Database setup complete."
