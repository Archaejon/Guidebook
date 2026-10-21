# Guidebook for the Future

A private, local-first authoring environment for an interdisciplinary guide to human and collective flourishing. It has two halves that share one data model: a **reader-facing guide** of domains, sections and methods, and an **authoring studio** of manuscript, research, experiments and typed connections.

Understand → Practise → Evaluate → Teach.

## Prerequisites

- **Node.js 20 LTS or newer** (Vite 5 needs Node 18.18+, and 20 LTS is what this was built and tested on)
- **npm 10+**, which ships with Node 20

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
npm test             # Vitest: selectors, search, exports
npm run test:watch   # re-run tests on change
```

React 18 + TypeScript + Vite, `react-router-dom` for routes. No backend, no accounts, no network calls at runtime.

## Configuration

There is nothing to configure and no environment variables to set: the app is entirely client-side and stores its data in the browser. No `.env` file is read, and none should be committed.

## Build

```bash
npm run build        # tsc --noEmit, then vite build -> dist/
npm run preview      # serve the built output at http://127.0.0.1:5174
```

`dist/` is a static site (one HTML file, JS and CSS assets, a data-URI favicon).

## Deployment

The app is a static site: upload the contents of `dist/` to any host — Codeberg Pages, GitHub Pages, Netlify, Cloudflare Pages, or a plain web server. There is no server component, and no user data leaves the browser that loaded the page.

Two things to get right:

1. **Single-page routing.** Routes are handled by `BrowserRouter`, so the host must serve `index.html` for unknown paths (SPA fallback). `public/_redirects` carries the Codeberg Pages rewrite `/* /index.html 200`; other hosts need their own equivalent.
2. **Path.** `vite.config.ts` uses a base of `/` so a root deployment needs no changes. `BrowserRouter` reads `import.meta.env.BASE_URL`, so an asset base prefix automatically becomes the router basename.

### Codeberg Pages

This repository is published as a project site at **https://archaejon.codeberg.page/Guidebook/**, from the `pages` branch.

```bash
bash scripts/deploy-pages.sh   # build:pages, then commit and push the pages branch
```

`npm run build:pages` is the one non-obvious part: it builds with `--mode pages`, which sets `base` to `/Guidebook/` in `vite.config.ts`, and then copies `index.html` to `404.html`. That copy is a fallback for deep links, because whether Codeberg Pages applies a `_redirects` rewrite inside a project-site prefix is not documented; the shell costs 900 bytes and makes `/Guidebook/studio` work either way.

Codeberg Pages only publishes a branch once a **Forgejo webhook** points at the site URL, so a first-time deploy needs this in the repository settings: **Settings → Webhooks → Add webhook → Forgejo**, target `https://archaejon.codeberg.page/Guidebook/`, branch filter `pages`.
## Storage and privacy

- The whole project is a single JSON document persisted to **IndexedDB** (`guidebook-future`) with a **localStorage** fallback (`src/lib/storage.ts`).
- Debounced autosave (~650 ms) after any change; `pagehide`/`visibilitychange` flushes pending edits. The sidebar shows saved / saving / error state.
- Nothing is sent to a server. There is no sync, so a cleared browser profile loses the project — hence JSON export and in-browser backup points in Settings.
- The reader view (`/read`) and the reader HTML export contain **only** records whose status is `Published`. Drafts never appear in a published surface.
- Deleting a record moves it to **Recently deleted** (Settings) with restore; manuscript deletions keep the whole subtree.
- `WorkspaceGate` (in `src/App.tsx`) renders a loading state until the stored project has loaded, so deep links never initialise an editor from placeholder data.

## Layout

```
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
    utils.ts          markdown helpers, word count, downloadFile
    __tests__/        Vitest suite + the shared project fixture
  components/         Layout, ui primitives (Modal, ConfirmDialog, LinkDialog), Markdown, create dialogs
  pages/              Home, Guide, MethodPage, MethodEditor, Studio, Research, SourceDetail,
                      ResearchEditor, NoteEditor, Connections, Experiments, Scales, SearchPage,
                      Inbox, Settings, Reader
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

`src/lib/__tests__/fixture.ts` builds the project the tests share. Its comments record why each record exists (a published method, a draft that is reachable only by inline reference, a relationship pointing at a deleted id, an old experiment for date filters). Extend it rather than building ad-hoc projects in individual tests.

## Continuous integration

[`.forgejo/workflows/ci.yml`](.forgejo/workflows/ci.yml) runs on every push and pull request on Codeberg: a `codeberg-small` shared runner starts the official `node:20-bookworm` image, checks out the repository, then runs `npm ci`, `npm run typecheck`, `npm test` and `npm run build` as separate steps, so a failure names the phase that broke. Runs are listed under the repository's **Actions** tab.

This exists to keep the published branch honest. The suite is only useful if it runs without a human remembering to run it, and the typecheck catches the class of mistake (`noUnusedLocals`, unused test helpers, stale imports) that a browser smoke test will not.

Repository Actions are disabled by default on Codeberg, so a maintainer has to tick **Settings → Units → Enable Actions** once before jobs will be scheduled. Codeberg's hosted runners also require the project to be public and under a free/libre licence; the code is MIT and the written content CC BY-SA 4.0, so both halves qualify.

## Behaviour worth knowing

- **Search** (`/search`, or `/` from anywhere) groups results by entity type with per-type filters and status/tag/date filters.
- **Connections** combines a force-laid-out SVG map with a searchable, filterable relationship index; the list is always the authoritative way to navigate.
- **Scales** compares the six scales (self → ecological) across domains, using the per-method multi-scale fields.
- **Inbox** captures undecided material and can convert an item into a method, reading note, manuscript section or experiment without losing the text.
- **Export** produces full JSON backup, manuscript Markdown, plain text, method library, sources & references, and a Published-only reader HTML. Import accepts a JSON backup and snapshots the current state first.
- **Import .md** in the Studio toolbar appends a Markdown or plain-text file to the open document as one undoable step; a leading `# Heading` becomes the document title when the document is still blank.
- **Backup points** are local snapshots (not cloud), created manually or automatically before a reset/import/restore.
- **Links never resolve to ghosts.** A relationship whose other end no longer exists is invisible from both ends, so deleting a record cannot leave a clickable dead link behind.

## Sample content

The five domains, their sections, three methods (Strength Training, Reflective Journalling, Community Gardening), two research sources, a reading note, a quotation, two claims, one manuscript section and one experiment are **illustrative**. They are labelled `SAMPLE` and deliberately contain no invented citations, quotations or efficacy claims; anything unresolved is marked as a question or an unverified claim. Every record is editable and deletable, and Settings can restore the sample or start from an empty project.

## Contributing

Issues and pull requests are welcome on [Codeberg](https://codeberg.org/Archaejon/Guidebook). [CONTRIBUTING.md](CONTRIBUTING.md) covers setup, the four checks to run before opening a pull request, the test conventions, and the constraints the project will not trade away (no network at runtime, data stays in the browser, drafts never reach a published surface, no invented scholarship).

## Licence

Two licences, split by what a file is:

- **Code — MIT.** Source, configuration, scripts and workflows: [LICENSE](LICENSE).
- **Written content — CC BY-SA 4.0.** The illustrative sample text defined in `src/seed.ts` and the documentation: [LICENSE-CONTENT](LICENSE-CONTENT).

The split is deliberate. The software is meant to be forked, modified and hosted with no strings attached, so MIT. The sample guidebook text is meant to be read and reused as a model — a seed for someone else's guidebook — which is exactly the case share-alike exists for: attribution, and any adaptation stays under the same terms.

Neither licence reaches what you write in the app. Your manuscript, notes and sources live in your browser and remain yours, as do the Markdown, HTML and JSON exports you make from them.
