#!/usr/bin/env node
/**
 * Validates the committed edition before a build.
 *
 *   node scripts/check-content.mjs [--file content/guidebook.json]
 *
 * Called by `npm run build` and `npm run build:pages`, so a broken edition
 * fails the build instead of deploying links that 404 or a URL space with two
 * records behind the same slug. The rules are the app's own (`editionProblems`
 * in src/lib/edition.ts), not a second copy of them.
 */
import { readFile } from 'node:fs/promises';
import { DEFAULT_OUT, editionApi } from './lib/edition-file.mjs';

const args = process.argv.slice(2);
const fileIndex = args.indexOf('--file');
const filePath = fileIndex >= 0 ? args[fileIndex + 1] : DEFAULT_OUT;

let raw;
try {
  raw = JSON.parse(await readFile(filePath, 'utf8'));
} catch (error) {
  console.error(`content: could not read ${filePath}: ${error.message}`);
  if (error.code === 'ENOENT') {
    console.error('content: run "npm run content:sample" or "npm run content:sync -- <backup.json>" to create it.');
  }
  process.exit(1);
}

const { editionProblems, buildEdition } = await editionApi();
const problems = editionProblems(raw);

if (problems.length) {
  console.error(`content: ${filePath} is not publishable (${problems.length} problem(s)):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const edition = buildEdition(raw);
if (!edition.methods.length) {
  console.log(`content: ${filePath} is valid but has no Published methods; the public edition will be empty.`);
} else {
  console.log(
    `content: ${edition.methods.length} published method(s) across ${edition.domains.length} domain(s), built from ${raw.source?.commit ?? 'unknown'}`,
  );
}
