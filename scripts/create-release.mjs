/**
 * Create the GitHub release for a tag, from the changelog entry for that
 * version.
 *
 * Creating the entry by hand is the step most likely to drift from what was
 * tagged. This script runs from `.github/workflows/release.yml` on a `v*` tag,
 * takes the release notes from CHANGELOG.md, and refuses to publish when the
 * tag and `package.json` disagree.
 *
 * It is idempotent: an identical existing release is left alone, a different one
 * is updated, so re-running a failed job does not create duplicates.
 *
 * Run with `--dry-run` to print the notes without touching the API.
 */
import { readFileSync } from 'node:fs';

const dryRun = process.argv.includes('--dry-run');
const apiBase = (process.env.GITHUB_API_URL ?? 'https://api.github.com').replace(/\/$/, '');
const repo = process.env.GITHUB_REPOSITORY ?? 'Archaejon/Guidebook';
const tag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME || '';
const token = process.env.GITHUB_TOKEN ?? '';

if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  throw new Error(`expected a vMAJOR.MINOR.PATCH tag, got ${JSON.stringify(tag)}`);
}
const version = tag.slice(1);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (pkg.version !== version) {
  throw new Error(`package.json says ${pkg.version} but the tag is ${tag}; bump the version first`);
}

/** The `## [1.2.3]` section of CHANGELOG.md, without its heading. */
function changelogSection(v) {
  const lines = readFileSync('CHANGELOG.md', 'utf8').split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## [${v}]`));
  if (start === -1) throw new Error(`CHANGELOG.md has no section for ${v}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^## /.test(line));
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
  if (!body) throw new Error(`the ${v} entry in CHANGELOG.md is empty`);
  return body;
}

// The product name is the document title the app ships with, so a rename only
// has to happen in one place.
const title =
  readFileSync('index.html', 'utf8').match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? pkg.name;

const notes = changelogSection(version);
const body = [
  notes,
  '',
  '---',
  '',
  pkg.homepage ? `Open it at <${pkg.homepage}>` : '',
]
  .join('\n')
  .trim();

const payload = {
  tag_name: tag,
  target_commitish: process.env.GITHUB_SHA || 'main',
  name: `${title} ${version}`,
  body,
  draft: false,
  prerelease: /-(alpha|beta|rc)\./.test(version),
};

if (dryRun) {
  console.log(`tag:     ${payload.tag_name}`);
  console.log(`name:    ${payload.name}`);
  console.log(`target:  ${payload.target_commitish}`);
  console.log(`prerelease: ${payload.prerelease}`);
  console.log('--- notes ---');
  console.log(body);
  process.exit(0);
}

if (!token) throw new Error('GITHUB_TOKEN is empty; the release workflow needs the repository token');

const endpoint = `${apiBase}/repos/${repo}/releases`;
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
};

async function call(url, init = {}) {
  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${url} returned ${response.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

const existing = (await call(`${endpoint}?per_page=50`)).find((release) => release.tag_name === tag);
if (!existing) {
  const created = await call(endpoint, { method: 'POST', body: JSON.stringify(payload) });
  console.log(`created release ${created.tag_name}: ${created.html_url}`);
} else if (existing.body === payload.body && existing.name === payload.name && !existing.draft) {
  console.log(`release ${tag} is already published and unchanged`);
} else {
  const updated = await call(`${endpoint}/${existing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  console.log(`updated release ${updated.tag_name}: ${updated.html_url}`);
}
