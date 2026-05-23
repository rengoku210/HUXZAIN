#!/usr/bin/env bash
# rollback.sh - Revert HUXZAIN marketplace to previous stable release
# Usage: ./scripts/rollback.sh [options]
# Options:
#   -t <tag>   Specify a git tag or commit to roll back to. If omitted, the script will attempt to roll back to the previous tag.
#   -d         Dry run mode – print actions without executing them.
#   -h         Show this help message.

set -euo pipefail

# Parse arguments
while getopts ":t:dh" opt; do
  case $opt in
    t) TARGET_TAG="$OPTARG" ;;
    d) DRY_RUN=true ;;
    h) echo "${0##*/} - Rollback to previous release"
       echo "Options: -t <tag> (target tag), -d (dry-run), -h (help)"
       exit 0 ;;
    \?) echo "Invalid option: -$OPTARG" >&2; exit 1 ;;
    :) echo "Option -$OPTARG requires an argument." >&2; exit 1 ;;
  esac
done

# Determine target tag if not provided
if [[ -z "${TARGET_TAG:-}" ]]; then
  # Get the previous tag (assumes tags are sorted chronologically)
  TARGET_TAG=$(git tag --sort=-v:refname | sed -n '2p')
  if [[ -z "$TARGET_TAG" ]]; then
    echo "❌ No previous tag found. Provide a tag with -t." >&2
    exit 1
  fi
fi

echo "🔙 Rolling back to tag: $TARGET_TAG"

run_cmd() {
  if [[ "${DRY_RUN:-false}" == true ]]; then
    echo "[dry-run] $*"
  else
    echo "[run] $*"
    eval "$@"
  fi
}

# 1. Checkout the target tag
run_cmd "git checkout $TARGET_TAG"

# 2. Restore Edge Function deployment (wrangler)
# Assumes wrangler is configured and the project name is set in wrangler.toml
run_cmd "wrangler deploy"

# 3. Re‑apply Supabase RLS policies
# The backup SQL file should exist at scripts/rls-backup.sql
if [[ -f "scripts/rls-backup.sql" ]]; then
  echo "🔐 Restoring Supabase RLS policies..."
  # Using supabase CLI (assumes supabase is installed and logged in)
  run_cmd "supabase db restore scripts/rls-backup.sql"
else
  echo "⚠️ No RLS backup file found at scripts/rls-backup.sql. Skipping Supabase policy restore."
fi

# 4. Confirm rollback complete
if [[ "${DRY_RUN:-false}" == true ]]; then
  echo "✅ Dry‑run complete. No changes were applied."
else
  echo "✅ Rollback to $TARGET_TAG completed successfully."
fi
