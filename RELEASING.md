# Releasing

The app ships as a static site. A release is three separate things that are easy
to conflate:

1. **A commit on `main`** — the source of truth, which CI verifies.
2. **A tag** — `v1.2.3`, marking that exact commit as a release.
3. **A deployment** — the built files on the `pages` branch that Codeberg Pages
   serves.

Nothing automates the last two. The tag does not publish anything, and the
`pages` branch is built by hand with `scripts/deploy-pages.sh`. This file is the
order in which to do them, so the thing people download is the thing that was
tested.

## Version numbers

- **Major** — a stored project would no longer open correctly without a
  migration. Bumping this means `normalizeProject()` in `src/store.tsx` grew a
  migration for the previous format, and `Project.version` moved with it.
- **Minor** — new capability, stored data and routes unchanged.
- **Patch** — fixes only.

Add the entry to [CHANGELOG.md](CHANGELOG.md) in the same commit as the version
bump, so the released number and its description cannot drift apart.

## Before you start

- You can push to `main` and to the `pages` branch.
- In the repository settings, **Actions** is enabled (Settings → Units → Enable
  Actions) and the Pages webhook exists (Settings → Webhooks → Add webhook →
  Forgejo, target `https://archaejon.codeberg.page/Guidebook/`, branch filter
  `pages`). Without the webhook, a deploy succeeds and the site keeps returning
  HTTP 400 — that is the single most confusing failure mode of this setup.
- `git status` is clean and you are on `main`.

## The release itself

```bash
git pull --ff-only origin main

npm ci                  # install exactly what the lockfile pins
npm run verify          # typecheck + tests + production build
npm audit               # must be clean before you call it a release

npm version minor --no-git-tag-version   # or major / patch; updates package.json and the lockfile
# Edit CHANGELOG.md: add the new version section with today's date.

git add package.json package-lock.json CHANGELOG.md
git commit -m "Release v1.1.0"
git tag -a v1.1.0 -m "Guidebook for the Future v1.1.0"
git push origin main
git push origin v1.1.0
```

`npm version --no-git-tag-version` deliberately does not tag: the tag has to
point at the commit that contains the changelog entry, which does not exist yet
at that moment.

## Deploying

```bash
bash scripts/deploy-pages.sh
```

The script refuses to run on a dirty tree, builds with `--mode pages`, copies the
result onto the `pages` branch and fast-forwards it. It prints either the pushed
commit or `published files are unchanged`.

Then check the live site rather than trusting the push:

- `https://archaejon.codeberg.page/Guidebook/` answers 200 and renders the home
  page — not a blank page, and not Codeberg's 404.
- A deep link such as `/Guidebook/studio` boots the app (either via `_redirects`
  or the `404.html` fallback). This is the check that catches a broken base path.
- The browser console is free of errors and the asset requests are 200s with
  `text/css` and `text/javascript` content types.
- The reader route `/Guidebook/read` shows the published view, not drafts.
- Local data survives: open the site, add a note, reload, and confirm it is still
  there. This exercises IndexedDB on the real origin, which local builds do not.

## If a deploy is wrong

The `pages` branch is disposable. Rebuild from the last good commit and push
again; nothing is rewritten in `main`:

```bash
git switch --detach <last-good-commit>
bash scripts/deploy-pages.sh
git switch main
```

If the fault is in `main`, fix it forward with a patch release. Do not edit the
`pages` branch by hand — the next deploy replaces its contents.

## After a release

- Close the milestone or the issue list for the version.
- If the release changed anything a contributor would trip over (Node baseline,
  scripts, test conventions), update [README.md](README.md) and
  [CONTRIBUTING.md](CONTRIBUTING.md) in the same release.
- Remember that the site, once public, is public: anyone with the URL gets the
  sample project in their own browser storage. A release never publishes a
  user's manuscript, because the app has nowhere to send it.
