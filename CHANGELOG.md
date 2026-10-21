# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as it applies to an
application: the major number changes when a stored project would no longer open
without a migration, the minor number when features are added, and the patch
number for fixes that keep the stored format and the routes intact.

The version here is the version of the *software*. The sample project also
carries its own numeric data-format version (`Project.version`); that only moves
when the stored shape changes, together with a migration.

## [Unreleased]

### Added

- **Automated deploys with a matching check.**
  [`.forgejo/workflows/deploy-pages.yml`](.forgejo/workflows/deploy-pages.yml)
  builds every push to `main`, publishes it to the `pages` branch, then fetches
  that branch back and compares its git tree with `dist`; the run fails unless the
  published files are exactly the build. `scripts/publish-pages.mjs` performs the
  publish and the check, and `scripts/deploy-pages.sh` now calls it too, so the
  local and automated deploys share one implementation instead of drifting apart.
  The Pages build writes `deploy.txt` naming its source commit, so the live site
  can be traced to a commit from the outside, and the publisher refuses a build
  whose marker names a different commit — a stale `dist` cannot be deployed.
  Both paths need the one-time Pages webhook and repository Actions to be enabled.
- **CI no longer runs on `pages`.** That branch holds build output with no
  `package.json`, so every deploy used to produce a failed CI run that was not a
  failure; the deploy workflow verifies that branch instead.

## [1.0.0] — 2026-10-21

The first release: a complete local-first authoring environment, published as a
static site with no backend to run and no account to create.

### Added

- **Reader-facing guide.** Five domains, their sections, methods and a
  multi-scale comparison, plus a published-only `/read` view and a self-contained
  reader HTML export.
- **Nine-part method template.** Identity, purpose, instructions, rationale,
  knowledge, evaluation, application, multi-scale impacts and author's notes,
  with per-section visibility toggles so sparse methods stay readable.
- **Writing studio.** A manuscript tree of parts, chapters, sections,
  subsections and passages; Markdown import; focus mode; autosave with word
  counts and completion scoring.
- **Research library.** Sources, reading notes, quotations and claims, with an
  explicit unverified-claim state so nothing unsourced is presented as findings.
- **Typed connections.** Ten relationship types with a force-laid-out map and a
  searchable index; links whose other end was deleted stop resolving, so no
  ghost records remain clickable.
- **Experiments, inbox and cross-entity search.** Capture undecided material and
  convert it into a method, note, manuscript section or experiment; search groups
  results by type with status, tag and date filters.
- **Local storage with recovery.** IndexedDB with a localStorage fallback,
  debounced autosave plus a flush on `pagehide`, 20 rotating backup points,
  recently-deleted restore, and a full JSON backup whose format is also the
  import format.
- **A visible save-failure banner.** If the browser refuses a write (quota,
  private browsing), the divergence between screen and storage is announced on
  every viewport instead of hiding in a sidebar indicator.
- **A root error boundary** that turns an unexpected render error into a page
  that can still export the stored project as a re-importable JSON backup.
- **Accessibility and page identity.** A skip link, `:focus-visible` outlines,
  `aria-label`s on navigation and icon buttons, mobile navigation, per-page
  browser titles derived from each page's heading, and a `<noscript>` notice.
- **Deployment and CI.** `scripts/deploy-pages.sh` publishes `dist/` to the
  `pages` branch for Codeberg Pages, `npm run build:pages` handles the
  `/Guidebook/` base path and the `404.html` deep-link fallback, and
  `.forgejo/workflows/ci.yml` runs typecheck, tests, build and an audit of the
  shipped dependencies on every push.

### Changed

- Node baseline is now **20.19+ or 22.12+**, the range Vite 7 supports; the
  CI container uses the official `node:20-bookworm` image, which satisfies it.
- `npm run verify` runs typecheck, tests and a production build in one step.

### Security

- `react-router-dom` moved from 6.30 to 7.18.4, clearing two moderate advisories
  that affect the shipped bundle (open redirect via backslash in `Link`, and
  arbitrary constructor injection in SSR hydration, which this app does not use).
- `vite` 5 → 7 and `vitest` 2 → 4, clearing the `tinypool` advisories that only
  affect the local test runner. `npm audit` now reports no vulnerabilities.
- Sample prose is licensed CC BY-SA 4.0 and code MIT, so no illustrative text is
  silently reusable as if it were a finding.

### Notes

- Sample content is illustrative. It contains no invented citations, quotations
  or efficacy claims; unresolved material is marked as a question or an
  unverified claim.
- Nothing a user writes is part of this repository, and no runtime request leaves
  the browser.
