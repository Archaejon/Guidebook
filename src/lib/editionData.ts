import editionJson from '../../content/guidebook.json';
import { buildEdition, type EditionFile } from './edition';

/**
 * The committed edition, bundled at build time.
 *
 * This is what `/read` renders: a file in the repository rather than the
 * visitor's IndexedDB, so every visitor sees the same guide and every URL in
 * it is shareable. Regenerate it with `npm run content:sync -- <backup.json>`.
 */
export const EDITION_FILE = editionJson as unknown as EditionFile;
export const EDITION = buildEdition(EDITION_FILE);

/**
 * Cross-references inside published prose resolve only to methods that are
 * themselves published. A `[[method:…]]` token pointing at a draft stays as
 * plain text instead of linking a visitor into a workspace that is not theirs.
 */
export const EDITION_METHOD_HREF = (id: string): string | null =>
  EDITION.methods.find((entry) => entry.method.id === id)?.url ?? null;
