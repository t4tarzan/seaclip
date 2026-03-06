#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SeaClip — PostgreSQL Database Backup Script
# Usage:
#   ./scripts/backup-db.sh [output_dir]
#
# Environment variables:
#   DATABASE_URL   — PostgreSQL connection string (required)
#   BACKUP_DIR     — Default backup directory (default: ./backups)
#   BACKUP_RETAIN  — Number of backup files to retain (default: 30)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

DATABASE_URL="${DATABASE_URL:-}"
BACKUP_DIR="${1:-${BACKUP_DIR:-$ROOT_DIR/backups}}"
BACKUP_RETAIN="${BACKUP_RETAIN:-30}"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
BACKUP_FILE="$BACKUP_DIR/seaclip-$TIMESTAMP.sql.gz"

# ── Validation ────────────────────────────────────────────────────────────────

if [[ -z "$DATABASE_URL" ]]; then
  # Try to load from ~/.seaclip/config.json via jq
  CONFIG_FILE="$HOME/.seaclip/config.json"
  if command -v jq &>/dev/null && [[ -f "$CONFIG_FILE" ]]; then
    DATABASE_URL="$(jq -r '.database.connectionString // empty' "$CONFIG_FILE")"
  fi
fi

if [[ -z "$DATABASE_URL" ]]; then
  echo "❌  DATABASE_URL is not set and could not be read from ~/.seaclip/config.json" >&2
  echo "    Export DATABASE_URL or run: seaclip onboard" >&2
  exit 1
fi

if ! command -v pg_dump &>/dev/null; then
  echo "❌  pg_dump not found. Install PostgreSQL client tools:" >&2
  echo "    Ubuntu/Debian: sudo apt install postgresql-client" >&2
  echo "    macOS:         brew install libpq && brew link --force libpq" >&2
  exit 1
fi

# ── Setup ─────────────────────────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"
echo "🗄️  SeaClip Database Backup"
echo "    Source:  $DATABASE_URL"
echo "    Output:  $BACKUP_FILE"
echo ""

# ── Backup ────────────────────────────────────────────────────────────────────

echo "⏳  Running pg_dump…"
if pg_dump \
  --clean \
  --if-exists \
  --no-password \
  "$DATABASE_URL" | gzip -9 > "$BACKUP_FILE"; then
  SIZE="$(du -sh "$BACKUP_FILE" | cut -f1)"
  echo "✅  Backup complete: $BACKUP_FILE ($SIZE)"
else
  echo "❌  pg_dump failed" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

# ── Rotation ──────────────────────────────────────────────────────────────────

if [[ "$BACKUP_RETAIN" -gt 0 ]]; then
  EXCESS=$(find "$BACKUP_DIR" -name "seaclip-*.sql.gz" | sort | head -n -"$BACKUP_RETAIN" | wc -l)
  if [[ "$EXCESS" -gt 0 ]]; then
    echo "🔄  Rotating old backups (keeping ${BACKUP_RETAIN}, removing ${EXCESS})…"
    find "$BACKUP_DIR" -name "seaclip-*.sql.gz" | sort | head -n -"$BACKUP_RETAIN" | xargs rm -f
  fi
fi

echo ""
echo "    Backups in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"/seaclip-*.sql.gz 2>/dev/null | awk '{print "   ", $5, $9}' || true
echo ""
