#!/bin/sh

set -eu

hook_name="${1:-unknown}"
repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
current_branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"

if [ "$hook_name" != "post-merge" ]; then
  exit 0
fi

if [ "$current_branch" != "dev" ]; then
  exit 0
fi

echo "[git hook] On branch 'dev' after merge - removing generated block CSS"
cd "$repo_root"
find ./blocks -type f -name '*.css' ! -name '*.tw.css' -delete

echo "[git hook] On branch 'dev' after merge - running npm run build"
npm run build
