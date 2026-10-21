# Contributing

Thanks for looking. This is a small, single-author project that happens to be public, so the most useful contributions are focused fixes and well-argued improvements rather than large refactors.

By contributing you agree that your work is licensed under the terms in [LICENSE](LICENSE) (MIT). There is no CLA to sign, and no copyright assignment: your contribution stays yours, and everyone gets it under the same permissive terms as the rest of the project.

## The things this project will not do

Most of the design follows from four constraints. A change that breaks one of them will be declined even if it is well built.

- **No network at runtime.** No analytics, no telemetry, no fonts or scripts from a CDN, no sync service. The app must work with the tab offline after load. This is why there is no backend and no auth.
- **Data stays in the browser.** The whole project is one JSON document in IndexedDB, with a `localStorage` fallback (`src/lib/storage.ts`). Anything that moves user data off the device is out of scope.
- **Drafts never appear in published surfaces.** The reader view (`/read`) and the reader HTML export include only records whose status is `Published`. New reader-facing features must keep that boundary.
- **No invented scholarship.** The illustrative sample in `src/seed.ts` deliberately contains no real quotations, citations or efficacy claims. If you add sample content, keep it obviously placeholder, and do not attribute wording to a real author.

## Getting set up

You need **Node.js 20 LTS or newer** and the npm that ships with it. Nothing else — no database, no containers, no accounts.

```bash
npm ci                # install exactly what the lockfile pins
npm run dev           # http://127.0.0.1:5173
```

React 18 + TypeScript + Vite, with `react-router-dom` for routing. If you are changing dependencies, use `npm install` and commit the updated `package-lock.json`; otherwise always prefer `npm ci`, which cannot silently rewrite it.

## Before you open a pull request

Run the same four checks the project's CI runs (`.forgejo/workflows/ci.yml`):

```bash
npm run typecheck     # tsc --noEmit
npm test              # Vitest, no DOM, about a second
npm run build         # tsc --noEmit && vite build
```

Plus, if your change is user-visible, look at it: `npm run dev` and click through the affected page at both a wide and a narrow viewport. A green build proves the code compiles, not that the page renders.

Codeberg requires Actions to be enabled on the repository before those checks run automatically, so do not assume CI will catch something you skipped locally.

## Tests

The suite lives in `src/lib/__tests__` and covers the pure logic only — selectors, search and export generation. Those are the parts where cross-record invariants bite: a link surviving deletion, a subtree moving, an export staying complete.

- Put new tests next to the code they exercise, as `*.test.ts`.
- **Extend [the shared fixture](src/lib/__tests__/fixture.ts) rather than building a project inline.** Its comments explain why each record exists (a published method, a draft reachable only by an inline reference, a relationship pointing at a deleted id, a deliberately old experiment). A fixture record that no test explains is a record nobody understands.
- Because the tests live under `src/`, `tsc` typechecks them too, and `noUnusedLocals` applies. An unused import in a test fails the build.
- There is no browser or component testing yet, and `store.tsx` (update semantics, trash/restore, snapshots, migrations) is still verified by hand. Testing it honestly needs a fake IndexedDB and a DOM environment; if you want to add that, say so in an issue first so the approach can be agreed.

## Code conventions

- TypeScript strict mode, with `noUnusedLocals` and `noUnusedParameters` on. Do not silence them with `any` or suppression comments; fix the cause.
- Function components and hooks. No class components, no state library — the store is a context provider in `src/store.tsx`.
- Styling goes in `src/styles.css`, next to the existing selectors. There is no CSS-in-JS and no utility framework; adding one is a project decision, not a detail of a bug fix.
- Pure logic belongs in `src/lib` and should stay free of React, so it can be tested without a DOM. Pages compose; `lib` decides.
- Records are referenced by stable string ids, relationships are `{ fromId, toId, type, note }`, and manuscript passages cite methods with `[[method:<id>|Label]]` tokens resolved live. Never store a denormalised copy of another record's text.
- New runtime dependencies need an argument. The app is deliberately small and offline; a dependency that helps one screen but ships 200 kB to everyone is a hard sell.

## Submitting changes

1. Fork the repository on [Codeberg](https://codeberg.org/Archaejon/Guidebook) with the **Fork** button, then clone your fork and keep the original as `upstream`:

   ```bash
   git clone git@codeberg.org:<your-username>/Guidebook.git
   cd Guidebook
   git remote add upstream ssh://git@codeberg.org/Archaejon/Guidebook.git
   ```

2. Branch from `main`, with a name that says what it does: `fix/dangling-relationship`, `feature/export-odt`.

   ```bash
   git switch -c fix/dangling-relationship
   ```

   If `main` moves while you work, rebase onto it instead of merging it in: `git fetch upstream && git rebase upstream/main`.

3. Commit in logical steps. Write the subject in the imperative mood and explain *why* in the body — the diff already shows what changed.
4. Push to your fork and open a pull request against `main`. Forgejo calls it a "pull request" in the web UI; it is the same thing as a merge request.
5. Keep one concern per pull request. Drive-by reformatting makes a real fix impossible to review.

Things that will get a pull request sent back:

- committed build output (`dist/`), `node_modules/`, screenshots or `.env` files — `.gitignore` covers these, so this usually means a `git add -f` slipped in;
- a change to the deployment (`bash scripts/deploy-pages.sh`, the `pages` branch) — publishing is the maintainer's job;
- new sample content that reads like a real citation.

## Reporting bugs

Open an issue on Codeberg with what you did, what you expected, and what happened. If the project data is involved, an exported JSON backup is the most useful attachment — it reproduces the state exactly. Screenshots help for layout problems, but please check the browser console first: a runtime error is usually the actual report.
