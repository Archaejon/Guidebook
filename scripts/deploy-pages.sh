#!/usr/bin/env bash
#
# Publish the built site to the `pages` branch of this repository, which is
# what Codeberg Pages serves at https://archaejon.codeberg.page/Guidebook/.
#
# Usage: bash scripts/deploy-pages.sh
#
# The publishing itself lives in scripts/publish-pages.mjs, so the local command
# and the Forgejo Actions workflow (.forgejo/workflows/deploy-pages.yml) run the
# same code and the same check: the branch is updated, then read back from the
# server and compared tree-for-tree with dist.
#
# The branch holds only build output, so its history is disposable. Deploys
# still fast-forward: if the branch already exists it is fetched, its contents
# replaced, and a normal commit added — no force-push, so nothing is rewritten.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
branch="${PAGES_BRANCH:-pages}"
remote="${PAGES_REMOTE:-origin}"

cd "$root"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "deploy-pages: commit or stash your changes first so the deploy matches a commit" >&2
  exit 1
fi

revision="$(git rev-parse --short HEAD)"
echo "deploy-pages: building from $revision"
npm run build:pages

node scripts/publish-pages.mjs --dist dist --remote "$remote" --branch "$branch"
