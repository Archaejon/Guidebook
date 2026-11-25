/**
 * Post-build step for the GitHub Pages build (`npm run build:pages`).
 *
 * Two artefacts are added to `dist`:
 *
 * - `404.html` is a copy of the app shell. GitHub Pages serves it for any path
 *   that has no file, so a deep link like /Guidebook/studio or a refresh on
 *   /Guidebook/read still boots the app, and the router takes it from there.
 *
 * - `deploy.txt` records which commit the site was built from. It makes the
 *   deployment auditable: `/Guidebook/deploy.txt` on the live site says which
 *   source commit is being served, and the deploy workflow checks it after
 *   every deploy. The value is the commit alone rather than a timestamp, so the
 *   same source commit always produces the same file.
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
