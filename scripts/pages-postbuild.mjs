/**
 * Post-build step for the Codeberg Pages build (`npm run build:pages`).
 *
 * `public/_redirects` asks Codeberg Pages to serve the app shell for unknown
 * paths, which is what makes a deep link like /Guidebook/studio work. This
 * repository is published as a *project* site under /Guidebook/, though, and
 * the rewrite rules there are not obviously scoped to that prefix, so the same
 * shell is also written to 404.html. If the rewrite applies it is never used;
 * if it does not, a deep link still boots the app (with a 404 status code)
 * instead of showing Codeberg's default error page.
 */
import { copyFileSync } from 'node:fs';

copyFileSync('dist/index.html', 'dist/404.html');
console.log('pages: copied dist/index.html -> dist/404.html');
