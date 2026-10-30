#!/usr/bin/env node
/**
 * Regenerates the edition that ships with the repository from the sample
 * project in `src/seed.ts`.
 *
 *   npm run content:sample
 *
 * The workspace seed leaves its methods as drafts, which is deliberate: a new
 * workspace should demonstrate the Published-only boundary of the reader. The
 * *shipped edition* is different — it exists so the deployed site has a real
 * public surface to show and to test — so the three illustrative methods are
 * marked Published here, inside the generator, together with the sample part,
 * chapter and the one written section, which gives the public edition a
 * manuscript with a breadcrumb and a chapter to read. They keep
 * `illustrative: true`, and the edition pages label them as sample material.
 *
 * When a real guidebook replaces the sample, this script is not used again:
 * `npm run content:sync -- <backup.json>` is.
 */
import { DEFAULT_OUT, describeEdition, headCommit, writeEdition } from './lib/edition-file.mjs';
import { importTs } from './lib/ts-module.mjs';

const SAMPLE_METHODS = ['m_strength', 'm_journal', 'm_garden'];
/** Part I, its Physical Health chapter, and the one section that has prose. */
const SAMPLE_CHAPTERS = ['doc_part1', 'doc_ch_physical', 'doc_ch_sleep'];

const { createSeedProject } = await importTs('src/seed.ts');
const project = createSeedProject();

for (const method of project.methods) {
  if (SAMPLE_METHODS.includes(method.id)) method.status = 'Published';
}
for (const doc of project.documents) {
  if (SAMPLE_CHAPTERS.includes(doc.id)) doc.status = 'Published';
}

const result = await writeEdition(project, DEFAULT_OUT, { commit: headCommit() });
console.log(describeEdition(result, DEFAULT_OUT));
console.log('  sample methods published: ' + SAMPLE_METHODS.join(', '));
console.log('  sample manuscript published: ' + SAMPLE_CHAPTERS.join(', '));
