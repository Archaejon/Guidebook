/**
 * The browser tab is usually one of several when working on a manuscript, so it
 * needs to say which page this is. The heading each page already renders is the
 * most accurate label available (a domain, a method, a chapter title), and
 * reading it here means no page has to remember to set a title of its own.
 */
const SITE = 'Guidebook for the Future';

export function pageTitle(heading: string | null | undefined): string {
  const clean = (heading ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return SITE;
  // The reader page's own title already carries the site name; appending it again reads badly.
  if (clean.includes(SITE)) return clean;
  const label = clean.length > 70 ? `${clean.slice(0, 69).trimEnd()}…` : clean;
  return `${label} — ${SITE}`;
}
