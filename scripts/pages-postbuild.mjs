/**
 * Post-build step for the Codeberg Pages build (`npm run build:pages`).
 *
 * Two artefacts are added to `dist`, and both exist for deep links and deploys:
 *
 * - `404.html` is a copy of the app shell. `public/_redirects` asks Codeberg
 *   Pages to serve the shell for unknown paths, which is what makes a deep link
 *   like /Guidebook/studio work. This repository is published as a *project*
 *   site under /Guidebook/, though, and rewrite rules there are not obviously
 *   scoped to that prefix, so the shell is also written to 404.html: if the
 *   rewrite applies it is never used, and if it does not, a deep link still
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
import { copyFileSync, writeFileSync } from 'node:fs';

copyFileSync('dist/index.html', 'dist/404.html');
console.log('pages: copied dist/index.html -> dist/404.html');

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
