#!/bin/sh

set -eu

hook_name="${1:-unknown}"
repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
current_branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"

if [ "$current_branch" != "dev" ]; then
  exit 0
fi

if [ "$hook_name" = "post-checkout" ]; then
  old_ref="${2:-}"
  new_ref="${3:-}"
  is_branch_checkout="${4:-0}"

  if [ "$is_branch_checkout" != "1" ] || [ "$old_ref" = "$new_ref" ]; then
    exit 0
  fi
fi

echo "[git hook] On branch 'dev' - running npm run build"
cd "$repo_root"
npm run build
