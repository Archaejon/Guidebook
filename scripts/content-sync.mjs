#!/usr/bin/env node
/**
 * Regenerates the committed public edition from a project.
 *
 *   npm run content:sync -- path/to/guidebook-backup.json
 *   npm run content:sync -- backup.json --out content/guidebook.json
 *
 * The input is the JSON backup that Settings → Export produces. Only records
 * marked Published are copied, so a backup that contains drafts, notes and
 * research cannot publish them by accident. Run the command again after
 * publishing something; existing slugs are kept, new records get one derived
 * from their title.
 */
import { readFile } from 'node:fs/promises';
import { DEFAULT_OUT, describeEdition, headCommit, projectFromBackup, writeEdition } from './lib/edition-file.mjs';

const args = process.argv.slice(2);
let input = '';
let out = DEFAULT_OUT;
let commit = headCommit();

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--out') {
    out = args[i + 1];
    i += 1;
  } else if (arg === '--commit') {
    commit = args[i + 1];
    i += 1;
  } else if (arg === '--help' || arg === '-h') {
    input = '';
    break;
  } else {
    input = arg;
  }
}

if (!input) {
  console.error('usage: npm run content:sync -- <project-backup.json> [--out content/guidebook.json]');
  process.exit(2);
}

try {
  const raw = JSON.parse(await readFile(input, 'utf8'));
  const project = projectFromBackup(raw);
  const result = await writeEdition(project, out, { commit });
  console.log(describeEdition(result, out));
  if (!result.edition.methods.length) {
    console.log('\nnothing is Published yet, so the public edition is empty.');
    console.log('mark a method Published in the app, export a backup, and run this again.');
  }
} catch (error) {
  console.error(`content:sync failed: ${error.message}`);
  process.exit(1);
}
