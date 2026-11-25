# Releasing

The app ships as a static site. A release is three separate things that are easy
to conflate:

1. **A commit on `main`** — the source of truth, which CI verifies.
2. **A tag** — `v1.2.3`, marking that exact commit as a release.
3. **A deployment** — the built site that GitHub Pages serves at
   https://archaejon.github.io/Guidebook/.

The deployment is automatic: any push to `main` publishes it (see
[Deploying](#deploying)). The tag is not: it is still a deliberate step, because
tagging every main commit would make the tag meaningless. This file is the order
in which to do them, so the thing people download is the thing that was tested.

## Version numbers

- **Major** — a stored project would no longer open correctly without a
  migration. Bumping this means `normalizeProject()` in `src/store.tsx` grew a
  migration for the previous format, and `Project.version` moved with it.
- **Minor** — new capability, stored data and routes unchanged.
- **Patch** — fixes only.

Add the entry to [CHANGELOG.md](CHANGELOG.md) in the same commit as the version
bump, so the released number and its description cannot drift apart.

## Before you start

- You can push to `main` on GitHub.
- In the repository settings, **Pages → Source** is "GitHub Actions". With any
  other source the deploy workflow fails at its deploy step.
- `git status` is clean and you are on `main`.

## The release itself

```bash
git pull --ff-only github main

npm ci                  # install exactly what the lockfile pins
npm run verify          # typecheck + tests + production build
npm audit               # must be clean before you call it a release

npm version minor --no-git-tag-version   # or major / patch; updates package.json and the lockfile
# Edit CHANGELOG.md: add the new version section with today's date.

git add package.json package-lock.json CHANGELOG.md
git commit -m "Release v1.1.0"
git tag -a v1.1.0 -m "Guidebook for the Future v1.1.0"
git push github main
git push github v1.1.0
```

`npm version --no-git-tag-version` deliberately does not tag: the tag has to
point at the commit that contains the changelog entry, which does not exist yet
at that moment.

Pushing the tag is what publishes the release entry. The **Release** workflow
([`.github/workflows/release.yml`](.github/workflows/release.yml)) reads the
`## [1.1.0]` section from [CHANGELOG.md](CHANGELOG.md) and creates the release on
GitHub, with the live site linked at the end. It refuses a tag whose version
disagrees with `package.json`, and re-running it updates the existing entry
rather than creating a second one. To see the notes before tagging:

```bash
RELEASE_TAG=v1.1.0 node scripts/create-release.mjs --dry-run
```

## Deploying

Publishing is automatic. Every push to `main` runs
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml),
which installs, typechecks, tests, builds with `--mode pages` and deploys with
GitHub's Pages actions. It then fetches `deploy.txt` from the live site until it
names the commit just built, and fails if it never does. So a green run is
evidence that the live site serves the commit, not merely that a script exited
zero.

A release therefore ends with a push to `main` and a look at the **Deploy Pages**
run under the repository's Actions tab. Then check the live site rather than
trusting the run:

- `https://archaejon.github.io/Guidebook/deploy.txt` names the commit being
  served. Compare it with `git rev-parse main`.
- `https://archaejon.github.io/Guidebook/` answers 200 and renders the home
  page, not a blank page.
- A deep link such as `/Guidebook/studio` boots the app through the `404.html`
  fallback. This is the check that catches a broken base path.
- The browser console is free of errors and the asset requests are 200s.
- The public edition `/Guidebook/read` shows the methods and chapters committed
  in `content/guidebook.json`, not drafts, and deep links such as
  `/Guidebook/read/physical-health/strength` and
  `/Guidebook/read/chapter/sleep-and-the-architecture-of-a-day` render on reload.
  `/Guidebook/preview` is the browser-local reader.
- Local data survives: open the site, add a note, reload, and confirm it is still
  there. This exercises IndexedDB on the real origin, which local builds do not.
- A shared project connects: create one in Settings → Collaborate, open the invite
  link in a second browser, and see each other's edits.

GitHub Pages' CDN caches for a few minutes, so a change deployed seconds ago can
briefly serve the previous asset. Re-check before concluding a deploy failed.

## If a deploy is wrong

Fix it forward, or revert the faulty commit on `main`: the next push redeploys,
and the failed run stays visible in Actions. To redeploy an earlier commit while
a fix is prepared, run **Deploy Pages** by hand (Actions → Deploy Pages → Run
workflow) on a branch pointing at the last good commit. That is a stopgap: the
next push to `main` redeploys `main`.

## After a release

- Close the milestone or the issue list for the version.
- If the release changed anything a contributor would trip over (Node baseline,
  scripts, test conventions), update [README.md](README.md) and
  [CONTRIBUTING.md](CONTRIBUTING.md) in the same release.
- Remember that the site, once public, is public: anyone with the URL gets the
  sample project in their own browser storage. A release never publishes a
  user's manuscript, because the app has nowhere to send it.
