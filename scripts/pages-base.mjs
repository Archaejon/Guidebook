/**
 * The URL prefix this repository is published under.
 *
 * Codeberg Pages serves a project site at `/<repository>/`, and two artefacts
 * have to agree on that prefix: Vite's `base` (so assets resolve) and the
 * rewrite rule in `_redirects` (so deep links resolve). Both read this value,
 * because a mismatch between them is invisible locally and only shows up as a
 * 404 on the live site.
 */
export const PAGES_BASE = '/Guidebook/';
