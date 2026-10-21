/**
 * Post-build step for the Codeberg Pages build (`npm run build:pages`).
 *
 * Three artefacts are added to `dist`, and all of them exist for deep links and
 * deploys:
 *
 * - `_redirects` tells Codeberg Pages to serve the app shell for unknown paths,
 *   which is what makes a deep link like /Guidebook/studio work. The target must
 *   carry the project prefix — `/Guidebook/index.html`, not `/index.html` — even
 *   though Codeberg's documentation shows the unprefixed form. git-pages resolves
 *   a rewrite target as an absolute URL and then strips the project prefix from
 *   it; when the target lacks the prefix that strip fails and the request dies
 *   with a bare "invalid redirect" 404. The prefix comes from the same module
 *   Vite reads, and the shell is checked for it below, so the two cannot drift.
 *
 * - `404.html` is a copy of the app shell, so a path that no rule matches still
 *   boots the app instead of showing a default error page.
 *
 * - `deploy.txt` records which commit the site was built from. It makes the
 *   deployment auditable: `/Guidebook/deploy.txt` on the live site says which
 *   source commit is being served, and `scripts/publish-pages.mjs` publishes it
 *   as part of the tree it verifies. The value is the commit alone rather than a
 *   timestamp, so the same source commit always produces the same file and a
 *   redeploy stays a no-op instead of pushing noise.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { PAGES_BASE } from './pages-base.mjs';

const base = PAGES_BASE.endsWith('/') ? PAGES_BASE : `${PAGES_BASE}/`;
const shell = readFileSync('dist/index.html', 'utf8');
if (!shell.includes(`${base}assets/`)) {
  throw new Error(`dist/index.html does not load assets from ${base}; check base in vite.config.ts`);
}

copyFileSync('dist/index.html', 'dist/404.html');
console.log('pages: copied dist/index.html -> dist/404.html');

writeFileSync(
  'dist/_redirects',
  [
    '# Codeberg Pages rewrite for single-page routing.',
    '# Serves the app shell without changing the URL, so a refresh on /studio or',
    '# /read loads the app rather than a 404. Status 200 = rewrite, not a redirect.',
    '# The target must include the project prefix; see the note in this script.',
    `/* ${base}index.html 200`,
    '',
  ].join('\n'),
  'utf8',
);
console.log(`pages: wrote dist/_redirects rewriting to ${base}index.html`);

function sourceCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const commit = sourceCommit();
writeFileSync('dist/deploy.txt', `source-commit=${commit}\n`, 'utf8');
console.log(`pages: wrote dist/deploy.txt for ${commit.slice(0, 7)}`);
