# Guidebook for the Future

A private, local-first authoring environment for an interdisciplinary guide to human and collective flourishing. It has two halves that share one data model: a **reader-facing guide** of domains, sections and methods, and an **authoring studio** of manuscript, research, experiments and typed connections.

Understand → Practise → Evaluate → Teach.

## Prerequisites

- **Node.js 20.19+ or 22.12+** (the range Vite 7 supports; 22 is what this was built and tested on)
- **npm 10+**, which ships with Node 20 and later

`package.json` declares the same range under `engines`, so npm warns early rather than failing inside a build.

No database, server, or third-party account is required.

## Installation

```bash
npm ci               # reproducible install from package-lock.json
# or: npm install    # if you are intentionally changing dependencies
```

## Development

```bash
npm run dev          # http://127.0.0.1:5173
npm run typecheck    # tsc --noEmit
npm test             # Vitest: selectors, search, exports, page titles
npm run test:watch   # re-run tests on change
npm run verify       # typecheck + tests + production build, i.e. what CI runs
```

React 18 + TypeScript + Vite 7, `react-router-dom` 7 for routes. No backend and no accounts. The app makes no network calls unless you start or join a shared project (see [Writing together](#writing-together)).

## Configuration

There is nothing to configure and no environment variables to set: the app is entirely client-side and stores its data in the browser. No `.env` file is read, and none should be committed.

## Build

```bash
npm run build        # tsc --noEmit, then vite build -> dist/
npm run preview      # serve the built output at http://127.0.0.1:5174
```

`dist/` is a static site (one HTML file, JS and CSS assets, a data-URI favicon). The Pages build also writes `404.html` for deep links and a `deploy.txt` recording the source commit it was built from.

## Deployment

The app is a static site: upload the contents of `dist/` to any host — GitHub Pages, Netlify, Cloudflare Pages, or a plain web server. There is no server component, and no user data leaves the browser that loaded the page (shared projects travel browser to browser, never through the host).

Two things to get right:

1. **Single-page routing.** Routes are handled by `BrowserRouter`, so the host must serve `index.html` for unknown paths (SPA fallback). The Pages build copies the app shell to `404.html`, which GitHub Pages serves for any missing path; other hosts need their own equivalent.
2. **Path.** `vite.config.ts` uses a base of `/` so a root deployment needs no changes. `BrowserRouter` reads `import.meta.env.BASE_URL`, so an asset base prefix automatically becomes the router basename.

### GitHub Pages

This repository is published as a project site at **https://archaejon.github.io/Guidebook/**.

Every push to `main` deploys automatically. [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) installs, typechecks, tests and builds with `--mode pages`, then deploys with GitHub's official Pages actions. Finally it fetches `deploy.txt` from the live site and requires it to name the commit just built, so a deploy that served stale output fails the run instead of looking successful. Pull requests never deploy; only `main` does.

`npm run build:pages` builds with `--mode pages`, which sets `base` to `/Guidebook/` in `vite.config.ts`. [scripts/pages-postbuild.mjs](scripts/pages-postbuild.mjs) then checks the shell loads assets from that prefix, copies `index.html` to `404.html` so deep links such as `/Guidebook/studio` boot the app, and writes `deploy.txt`.

Because the build carries `deploy.txt`, the deployment is traceable from the outside: `curl https://archaejon.github.io/Guidebook/deploy.txt` names the commit being served, and comparing it with `git rev-parse main` answers "is the live site this commit?".

One-time setting: **Settings → Pages → Build and deployment → Source: GitHub Actions**. GitHub Pages on a free account requires the repository to be public.

## Publishing the edition

The deployed site's `/read` is not the visitor's workspace. It is **the edition committed to this repository**, at [content/guidebook.json](content/guidebook.json): a projection of a project containing only methods and manuscript nodes whose status is `Published`, plus the sections and domains those methods reach. So every visitor sees the same guide, a shared link means the same thing to everyone, and no draft, research note, quotation, claim, experiment or unpublished chapter is ever bundled into the site. Sections contribute their title, description, outcomes, frameworks and questions but never their `draft` text; a method's author's notes and a chapter's review comments are emptied, because no reader surface renders them.

| URL | Page |
|---|---|
| `/read` | Edition contents |
| `/read/<domain>` | One domain: purpose, outcomes, principles and its published sections |
| `/read/<domain>/<section>` | One section and the methods published under it |
| `/read/method/<method>` | One method, rendered as reading material |
| `/read/chapter/<chapter>` | One published manuscript node, with prev/next through the book |

Chapters are published the same way as methods: mark a manuscript node `Published`. A published part or chapter with no text of its own still gets a page listing its published contents, so a written section can sit under its part and chapter with a working breadcrumb; an ancestor that is still a draft breaks the chain instead, and the child appears at the top of the book rather than under a heading nobody published. Reading order follows the studio's own `order` field, and prev/next walks the flattened tree.

The browser's own reader — reading IndexedDB, including published chapters — is the **local preview** at `/preview`, linked from Settings. It is a preview, not the published edition.

### Regenerating the edition

Mark what is ready as Published in the app, export **Settings → Full JSON backup**, and run:

```bash
npm run content:sync -- ~/Downloads/guidebook-backup-2026-10-30.json
```

That rewrites `content/guidebook.json`. Slugs are keyed by record id and carried over from the existing file, so renaming an already-published method does not move or break its page; a new record gets a slug from its title, and a collision gets `-2`. Commit the file — the next deploy publishes it.

`npm run content:sample` regenerates the file from the illustrative sample project in `src/seed.ts`, which is how the shipped edition is built. The sample methods are marked Published by that generator alone (the workspace seed keeps them as drafts) so the deployed site has a public surface to show; every record keeps its `illustrative` flag, and the edition labels them as sample material.

`npm run content:check` runs before every build and in CI. It fails on an unpublished method in the file, a record without a slug, two records sharing a URL, a method whose domain or section is missing, a slug the router reserves, or a format version this build does not understand — so a broken or leaky edition cannot be deployed even if the file was edited by hand.

The rules themselves live in [src/lib/edition.ts](src/lib/edition.ts) and are used by the app, the scripts and the tests, so the generator cannot drift from the pages that consume it.

## Storage and privacy

- The whole project is a single JSON document persisted to **IndexedDB** (`guidebook-future`) with a **localStorage** fallback (`src/lib/storage.ts`).
- Debounced autosave (~650 ms) after any change; `pagehide`/`visibilitychange` flushes pending edits. The sidebar shows saved / saving / error state.
- Nothing is sent to a server. The personal project never syncs, so a cleared browser profile loses it — hence JSON export and in-browser backup points in Settings. A shared project syncs only between the browsers holding its invite link; see [Writing together](#writing-together).
- The reader surfaces — the public edition (`/read`), the local preview (`/preview`) and the reader HTML export — contain **only** records whose status is `Published`. Drafts never appear in a published surface.
- The public edition is a file in this repository, not the visitor's browser: what `/read` shows is what the last commit published. See [Publishing the edition](#publishing-the-edition).
- Deleting a record moves it to **Recently deleted** (Settings) with restore. The restore also reinstates what the deletion changed elsewhere: the record's relationships, the section and domain assignments it cleared, and the source links that pointed at it. An assignment made after the deletion is left alone, because it is the newer decision. Manuscript deletions keep the whole subtree, and each node restores on its own.
- `WorkspaceGate` (in `src/App.tsx`) renders a loading state until the stored project has loaded, so deep links never initialise an editor from placeholder data.

## Writing together

Two or more people can edit one project live. **Settings → Collaborate → Create shared project** makes a shared project, either from a copy of the current one or empty, and gives you an invite link to send. Whoever opens the link picks a display name and joins. Both of you then edit the same methods, manuscript, research and connections, and see each other's changes within a second or two.

- **A separate project.** A shared project is its own workspace. Your personal project stays private in this browser, and the sidebar shows which one is open. Settings lists every shared project in this browser and switches between them with a reload.
- **The invite link is the key.** It looks like `…/join#r=<room>&k=<key>&n=<name>`. The part after `#` is never sent to any server, including the one hosting the site. Anyone holding the link can read and edit, there are no accounts, and access can't be revoked; to cut someone off, start a new shared project. Opening the link replaces its own browser-history entry, so the key doesn't linger there.
- **Peer to peer, end-to-end encrypted.** Browsers find each other through public [Nostr](https://nostr.com) relays, using Trystero's default strategy. The relays see only a handshake encrypted with the link's key, under a topic derived from the room ID. After that, the project travels directly between browsers over WebRTC, which is itself encrypted. There is no server copy. Public STUN servers help browsers behind home routers connect, so each browser learns the other's network address, as on a video call. A network that blocks peer-to-peer traffic (some offices and mobile carriers) won't connect, because no TURN relay is configured.
- **Be online together.** Changes pass between people only while both have the app open. Each browser keeps a full copy and keeps working offline, and everything merges the next time you're both connected. A guest who joins sees a "waiting" banner until the host's project arrives.
- **How edits merge.** The project is mirrored into a [Yjs](https://yjs.dev) document (`src/lib/collab/bridge.ts`), with one map per record and one entry per field. Text fields are collaborative text, so two people typing in different parts of a chapter both keep their words. Other fields (lists, statuses, numbers) take the most recent write. Open editors fold a collaborator's change into what's on screen without losing unsaved typing, and they save only the fields the person changed, so a stale copy never overwrites someone else's edit (`src/lib/collab/rebase.ts`, `useRecordBase.ts`). If both people change the same stretch of text at the same moment, the person typing wins on their own screen and the last save wins in the shared copy.
- **What is not shared.** Dashboard layout, titles in Settings and your display name stay per person. Import, reset and restoring a backup point are hidden in a shared project, because they would replace the project for everyone. Backup points and JSON export still work.
- **Only when used.** Yjs and Trystero load only when a shared project is opened (a separate ~53 kB gzipped chunk). The public `/read` edition and the personal workspace never download them or touch the network.

## Layout

```
content/
  guidebook.json      the committed public edition (generated; see Publishing the edition)
src/
  types.ts            all entities + statuses, scales, relationship types
  seed.ts             illustrative sample project
  store.tsx           StoreProvider: load/save, update(), links, trash, snapshots
  lib/
    storage.ts        IndexedDB + localStorage fallback, backup points
    factory.ts        id/time helpers and blank records
    selectors.ts      hierarchy, entity lookup, incoming/outgoing relationships
    search.ts         cross-entity search and filtering
    exports.ts        Markdown/plain text/HTML/JSON generation
    edition.ts        published-only projection, slug assignment, URL helpers
    editionData.ts    the bundled committed edition
    pageTitle.ts      browser-tab titles derived from the page heading
    utils.ts          markdown helpers, word count, downloadFile
    collab/           shared projects: invite links, Yjs bridge, editor merge, peer-to-peer session
    __tests__/        Vitest suite + the shared project fixture
  components/         Layout, RouteTitle, ErrorBoundary, ui primitives (Modal, ConfirmDialog,
                      LinkDialog), Markdown, ReaderMethod, create dialogs
  pages/              Home, Guide, MethodPage, MethodEditor, Studio, Research, SourceDetail,
                      ResearchEditor, NoteEditor, Connections, Experiments, Scales, SearchPage,
                      Inbox, Settings, Reader (/preview), Edition (/read)
scripts/
  content-sync.mjs    regenerate the edition from a project backup
  content-sample.mjs  regenerate the shipped sample edition
  check-content.mjs   build-time validation of the edition file
```

### Data model

`Project` holds `domains`, `sections`, `methods`, `documents` (a self-referencing manuscript tree via `parentId` + `order`), `sources`, `notes`, `quotations`, `claims`, `experiments`, `inbox` and `relationships`. Every entity has a stable string id; `relationships` are `{ id, fromId, toId, type, note }` with types `Supports | Challenges | Extends | Contradicts | Applies | DependsOn | RelatedTo | References | Tests | InspiredBy`.

Methods carry the full nine-part template (identity, purpose, instructions, rationale, knowledge, evaluation, application, multi-scale impacts, author's notes) plus per-section visibility toggles, so sparse methods stay readable.

Manuscript passages reference methods with `[[method:<id>|Label]]`, resolved live to the canonical record — editing a method updates every chapter that cites it. `documentsForMethod()` and the Studio "Links" panel give the reverse direction.

## Tests

`npm test` runs Vitest against the pure logic in `src/lib` — no DOM, no browser, ~1 s. The suite exists because the fragile parts of this app are cross-record invariants that are tedious to re-check by hand after every change:

- **`selectors.test.ts`** — entity lookup and routes for all ten record types, relationship traversal in both directions, dangling relationships after a deletion, secondary domains and related sections, the inline `[[method:…]]` reverse index (including de-duplication when a document is both linked and mentioned), tree ordering and descendants, word counts, completion scoring and project statistics.
- **`search.test.ts`** — the ranking ladder (exact title > partial title > tag > body), case/whitespace handling, every filter including date ranges, the 150-result cap, excerpt centring, and the invariant that every result points at a resolvable record and its canonical route.
- **`exports.test.ts`** — Markdown rendering and escaping (raw HTML in a title must not become markup), manuscript heading order and draft exclusion, plain-text stripping, method and library Markdown, bibliography and unverified-claim output, and the Published-only boundary of the reader HTML.
- **`edition.test.ts`** — the published-only projection (a draft method and its domain stay out), the manuscript projection (text and its published ancestors only, drafts excluded, comments stripped), slug stability across a title change, per-domain and global uniqueness, reserved and malformed slugs, the domain/section/method/chapter URL shapes, the chapter tree and reading order, and every rejection in `editionProblems`.
- **`editionContent.test.ts`** — the committed `content/guidebook.json` is itself publishable, its URLs are distinct and correctly shaped, its chapters all resolve by slug, and a cross-reference to an unpublished method resolves to nothing.
- **`storage.test.ts`** — which stored copy loads: a newer localStorage fallback beats an older IndexedDB record, IndexedDB wins a tie, and an unstamped copy counts as the oldest.
- **`collab.test.ts`** — the single-splice text diff and three-way text merge (both edits kept when they don't overlap, mine kept when they do, surrogate pairs never split, caret shifting), record rebase and changed-field saves, an editor saving while a collaborator edits the same record (no revert, no duplicated text), and the Yjs bridge: round trip, per-person settings, a guest's first sync, concurrent field edits and concurrent typing in one chapter converging, additions and deletions placed where the app lists them, and no-op writes.
- **`trash.test.ts`** — a deletion records the relationships it removed and the section, domain and source assignments it cleared; a restore replays all of them for methods, sections, domains, sources and manuscript branches; an assignment made after the deletion survives the restore; and an entry written before effects were recorded still restores.

`src/lib/__tests__/pageTitle.test.ts` covers the browser-tab titles: heading-first ordering, whitespace collapsing, and the fallback when a page has no heading yet. `src/lib/__tests__/links.test.ts` covers the link policy both renderers share: only `http(s)` URLs and site-relative paths become links, so `javascript:`, `data:`, `mailto:` and protocol-relative targets stay inert in the workspace and in the HTML export alike.

`src/lib/__tests__/fixture.ts` builds the project the tests share. Its comments record why each record exists (a published method, a draft that is reachable only by inline reference, a relationship pointing at a deleted id, an old experiment for date filters). Extend it rather than building ad-hoc projects in individual tests.

## Releases

Releases are tagged `vX.Y.Z` on `main`, with the changes described in [CHANGELOG.md](CHANGELOG.md). [RELEASING.md](RELEASING.md) is the runbook: version policy, the checks to run, tagging, and how to verify the live site rather than assuming a push published it. Pushing a tag runs [`.github/workflows/release.yml`](.github/workflows/release.yml), which creates the GitHub release from that version's changelog section. The tag is only a marker: the site is deployed on every push to `main`.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to `main` and every pull request: on Node 20, the oldest supported line, it runs `npm ci`, `npm audit --omit=dev`, `npm run typecheck`, `npm test` and `npm run build` as separate steps, so a failure names the phase that broke. Runs are listed under the repository's **Actions** tab.

This exists to keep the published site honest. The suite is only useful if it runs without a human remembering to run it, and the typecheck catches the class of mistake (`noUnusedLocals`, unused test helpers, stale imports) that a browser smoke test will not.

## Behaviour worth knowing

- **Search** (`/search`, or `/` from anywhere) groups results by entity type with per-type filters and status/tag/date filters.
- **Connections** combines a force-laid-out SVG map with a searchable, filterable relationship index; the list is always the authoritative way to navigate.
- **Scales** compares the six scales (self → ecological) across domains, using the per-method multi-scale fields.
- **Inbox** captures undecided material and can convert an item into a method, reading note, manuscript section or experiment without losing the text.
- **Export** produces full JSON backup, manuscript Markdown, plain text, method library, sources & references, and a Published-only reader HTML. Import accepts a JSON backup and snapshots the current state first.
- **Import .md** in the Studio toolbar appends a Markdown or plain-text file to the open document as one undoable step; a leading `# Heading` becomes the document title when the document is still blank.
- **Backup points** are local snapshots (not cloud), created manually or automatically before a reset/import/restore.
- **A refused write is announced.** If the browser will not persist a change (full quota, private browsing), a banner says so on every screen and points at the JSON export — the sidebar indicator is behind the drawer on a phone, so it cannot be the only signal.
- **A render error still lets you escape.** A root error boundary replaces the page with a recovery screen that exports the stored project as a normal, re-importable JSON backup before suggesting a reload.
- **Links never resolve to ghosts.** A relationship whose other end no longer exists is invisible from both ends, so deleting a record cannot leave a clickable dead link behind.

## Sample content

The five domains, their sections, three methods (Strength Training, Reflective Journalling, Community Gardening), two research sources, a reading note, a quotation, two claims, one manuscript section and one experiment are **illustrative**. They are labelled `SAMPLE` and deliberately contain no invented citations, quotations or efficacy claims; anything unresolved is marked as a question or an unverified claim. Every record is editable and deletable, and Settings can restore the sample or start from an empty project.

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/Archaejon/Guidebook). [CONTRIBUTING.md](CONTRIBUTING.md) covers setup, the four checks to run before opening a pull request, the test conventions, and the constraints the project will not trade away (no network at runtime, data stays in the browser, drafts never reach a published surface, no invented scholarship).

## Licence

Two licences, split by what a file is:

- **Code — MIT.** Source, configuration, scripts and workflows: [LICENSE](LICENSE).
- **Written content — CC BY-SA 4.0.** The illustrative sample text defined in `src/seed.ts` and the documentation: [LICENSE-CONTENT](LICENSE-CONTENT).

The split is deliberate. The software is meant to be forked, modified and hosted with no strings attached, so MIT. The sample guidebook text is meant to be read and reused as a model — a seed for someone else's guidebook — which is exactly the case share-alike exists for: attribution, and any adaptation stays under the same terms.

Neither licence reaches what you write in the app. Your manuscript, notes and sources live in your browser and remain yours, as do the Markdown, HTML and JSON exports you make from them.
