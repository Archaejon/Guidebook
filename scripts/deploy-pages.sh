#!/usr/bin/env bash
#
# Publish the built site to the `pages` branch of this repository, which is
# what Codeberg Pages serves at https://archaejon.codeberg.page/Guidebook/.
#
# Usage: bash scripts/deploy-pages.sh
#
# The branch holds only build output, so its history is disposable. Deploys
# still fast-forward: if the branch already exists it is cloned, its contents
# replaced, and a normal commit added — no force-push, so nothing is rewritten.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
remote="${PAGES_REMOTE:-ssh://git@codeberg.org/Archaejon/Guidebook.git}"
branch="${PAGES_BRANCH:-pages}"

cd "$root"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "deploy-pages: commit or stash your changes first so the deploy matches a commit" >&2
  exit 1
fi

revision="$(git rev-parse --short HEAD)"
echo "deploy-pages: building from $revision"
npm run build:pages

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

if git ls-remote --exit-code --heads "$remote" "$branch" >/dev/null 2>&1; then
  git clone --quiet --branch "$branch" --single-branch "$remote" "$work"
  find "$work" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
else
  git init --quiet -b "$branch" "$work"
  git -C "$work" remote add origin "$remote"
fi

git -C "$work" config user.name "$(git config user.name)"
git -C "$work" config user.email "$(git config user.email)"

cp -R dist/. "$work/"

git -C "$work" add -A
if git -C "$work" diff --cached --quiet; then
  echo "deploy-pages: published files are unchanged; nothing to push"
  exit 0
fi

git -C "$work" commit --quiet -m "Publish site from $revision"
git -C "$work" push --quiet origin "$branch"
echo "deploy-pages: pushed $branch ($(git -C "$work" rev-parse --short HEAD)) from $revision"
