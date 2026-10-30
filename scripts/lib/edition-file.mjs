/**
 * Reading, validating and writing `content/guidebook.json`.
 *
 * The committed file is a projection of a project, never the project itself:
 * only Published methods (and the sections and domains they reach) are written.
 * Slugs are carried over from the file that is already there, so re-running a
 * sync after editing a title does not move a published URL.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { importTs } from './ts-module.mjs';

export const DEFAULT_OUT = 'content/guidebook.json';

export async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export function headCommit() {
  if (process.env.SOURCE_COMMIT) return process.env.SOURCE_COMMIT;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export function editionApi() {
  return importTs('src/lib/edition.ts');
}

/** A backup exported from Settings wraps the project; a bare project is also accepted. */
export function projectFromBackup(raw) {
  const project = raw && typeof raw === 'object' && raw.project ? raw.project : raw;
  if (!project || typeof project !== 'object' || !Array.isArray(project.domains) || !Array.isArray(project.methods)) {
    throw new Error('not a Guidebook project: expected domains and methods arrays');
  }
  return project;
}

export async function writeEdition(project, out = DEFAULT_OUT, options = {}) {
  const { makeEditionFile, editionProblems, buildEdition } = await editionApi();
  const existing = await readJson(out);
  const previousSlugs = existing?.edition?.slugs ?? {};
  const meta = {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    commit: options.commit ?? headCommit(),
  };
  const file = makeEditionFile(project, previousSlugs, meta);
  const problems = editionProblems(file);
  if (problems.length) {
    throw new Error(`refusing to write ${out}:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  }
  const edition = buildEdition(file);
  const changes = Object.entries(file.edition.slugs)
    .filter(([id, slug]) => previousSlugs[id] !== slug)
    .map(([id, slug]) => ({ id, slug, previous: previousSlugs[id] }));

  await mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await writeFile(out, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  return { file, edition, changes, meta };
}

export function describeEdition({ file, edition, changes, meta }, out) {
  const lines = [
    `wrote ${out}`,
    `  ${edition.domains.length} domain(s), ${file.edition.sections.length} section(s), ${edition.methods.length} published method(s)`,
    `  ${file.edition.documents.length} published manuscript node(s) in ${edition.chapters.length} tree(s)`,
    `  title: ${edition.title}`,
    `  source commit: ${meta.commit}`,
  ];
  if (changes.length) {
    lines.push(`  slug(s) assigned or changed:`);
    for (const change of changes) {
      lines.push(`    ${change.id}: ${change.previous ? `${change.previous} -> ` : ''}${change.slug}`);
    }
  }
  return lines.join('\n');
}
