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

- **A public reader edition built from a committed file.** The deployed site no
  longer renders whatever is in the visitor's browser: `/read` is built at
  deploy time from [content/guidebook.json](content/guidebook.json), a
  projection of a project containing only `Published` methods and the sections
  and domains they reach, with a section's `draft` text and a method's author's
  notes emptied because no reader surface renders them. `npm run content:sync -- <backup.json>` regenerates it
  from a Settings JSON export, `npm run content:sample` regenerates the shipped
  sample edition from `src/seed.ts`, and `npm run content:check` fails the build
  on a draft in the file, a missing or duplicate slug, an unresolvable
  domain/section, a reserved slug or an unknown format version.
- **Stable URLs per domain, section and method.** `/read/<domain>`,
  `/read/<domain>/<section>` and `/read/method/<method>` are derived from slugs
  recorded in the edition and keyed by record id, so editing a published title
  does not move or break its page. Sections are unique within their domain,
  methods across the edition, and `method` is a reserved domain slug so
  `/read/method/…` cannot be shadowed.
- **Published manuscript chapters at stable URLs.** `/read/chapter/<chapter>`
  renders a published part, chapter, section or subsection, with a breadcrumb
  through its published ancestors, prev/next through the book in the studio's
  own order, and cross-references to edition methods. A published ancestor with
  no text of its own still gets a contents page, so a written section keeps its
  part; a draft ancestor breaks the chain and its children become roots. Review
  comments are stripped from the file like drafts and author's notes.
- **Cross-references resolve to the surface they appear on.** `[[method:…]]`
  links inside the public edition point at published edition pages; a reference
  to an unpublished method renders as plain text instead of linking a visitor
  into a workspace that is not theirs.
- The edition file format moved to **version 2** for manuscript documents. An
  older file is refused by the build with an instruction to regenerate, rather
  than served silently without its chapters.

### Changed

- **`/read` is the public edition; the workspace reader moved to `/preview`** and
  is linked from Settings. The reader component (`ReaderMethod`) is shared by
  both, so a method cannot be edited into looking different from its published
  form.
- `npm run build` and `npm run build:pages` validate the committed edition before
  typechecking.
- **Restoring a deleted record restores what its deletion changed.** A deletion
  now records the relationships it removed and the section, domain and source
  assignments it cleared, and a restore replays them. An assignment made after
  the deletion is newer and is left alone; trash entries written before this
  change still restore, as before, without their links.
- `chapter` is reserved as a domain slug alongside `method`, so a domain cannot
  shadow `/read/chapter/…` and send its sections to the chapter route.

### Fixed

- **A save is only reported once it has landed.** IndexedDB writes now resolve
  when the transaction commits rather than when the request succeeds, so a
  transaction aborted afterwards (quota, a closed database) is an error, not a
  silent loss.
- **A newer localStorage copy is no longer ignored on load.** When IndexedDB
  refused a save and the fallback took it, the next load returned the older
  IndexedDB record and rolled the project back. Both copies are now stamped
  when written and the newer one wins.
- **Import, reset and snapshot restore stop if the backup point fails.** They
  used to carry on after a refused snapshot write, replacing the project with
  no way back.
- **Unsafe link targets stay inert everywhere.** The workspace and the HTML
  export now share one rule: only `http(s)` URLs and site-relative paths become
  links, so `javascript:`, `data:`, `mailto:` and `//host` targets render as the
  text written. The standalone export no longer links site-relative paths it
  cannot resolve.
- The release workflow uses the Forgejo-hosted checkout action, like the CI and
  deploy workflows.

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
- **Automated deploys with a matching check.**
  [`.forgejo/workflows/deploy-pages.yml`](.forgejo/workflows/deploy-pages.yml)
  builds every push to `main`, publishes it to the `pages` branch, then fetches
  that branch back and compares its git tree with `dist`; the run fails unless the
  published files are exactly the build. `scripts/publish-pages.mjs` performs the
  publish and the check, and `scripts/deploy-pages.sh` calls it too, so the local
  and automated deploys share one implementation instead of drifting apart. The
  Pages build writes `deploy.txt` naming its source commit, so the live site can
  be traced to a commit from the outside, and the publisher refuses a build whose
  marker names a different commit — a stale `dist` cannot be deployed.
- **CI no longer runs on `pages`.** That branch holds build output with no
  `package.json`, so every deploy used to produce a failed CI run that was not a
  failure; the deploy workflow verifies that branch instead.
- **Releases from tags.**
  [`.forgejo/workflows/release.yml`](.forgejo/workflows/release.yml) turns a `v*`
  tag into the Codeberg release entry: `scripts/create-release.mjs` takes the
  notes from the matching changelog section, links the live site, refuses a tag
  that disagrees with `package.json`, and updates an existing entry instead of
  duplicating it when re-run.

### Fixed

- **Deep links 404 on the live site.** Codeberg Pages rejected the unprefixed
  `/* /index.html 200` rewrite with "invalid redirect": git-pages resolves the
  target as an absolute URL and strips the project prefix from it, so the rule has
  to name `/Guidebook/index.html`. The static `public/_redirects` is gone and
  `scripts/pages-postbuild.mjs` writes the rule from the same prefix Vite builds
  with, after checking the shell really loads assets from it. Local servers ignore
  `_redirects`, so this could only appear on the real host.

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
