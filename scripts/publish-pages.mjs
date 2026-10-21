#!/usr/bin/env node
/**
 * Publish the built site to the `pages` branch, then prove the branch holds it.
 *
 * The deploy is a content swap: the branch carries build output and nothing
 * else, so its history is disposable. What matters is that the files on the
 * branch are exactly the files in `dist` — a deploy that silently publishes an
 * older build, or drops a file, is the failure mode worth guarding against. Both
 * the push and the check therefore go through this script:
 *
 *   node scripts/publish-pages.mjs --dist dist                 # publish, then verify
 *   node scripts/publish-pages.mjs --dist dist --verify-only   # verify without pushing
 *
 * Verification compares git *tree* hashes rather than listing files: a tree is
 * content-addressed, so equal trees mean identical names, contents and modes.
 * The published tree is fetched back from the server, so the check reads what
 * was actually published rather than what the script meant to publish.
 *
 * Credentials are never handled here. `actions/checkout` persists the workflow
 * token in the repository config, and `git worktree` shares that config, so the
 * push authenticates exactly as the checkout did. A local run uses the SSH
 * remote the same way.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

run();

function run() {
  try {
    main();
  } catch (error) {
    console.error(`pages: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

function main() {
  const argv = process.argv.slice(2);
  const option = (name, fallback) => {
    const index = argv.indexOf(name);
    if (index === -1) return fallback;
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${name} needs a value`);
    return value;
  };
  const say = (message) => console.log(`pages: ${message}`);

  const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const dist = resolve(repoRoot, option('--dist', 'dist'));
  const remote = option('--remote', process.env.PAGES_REMOTE ?? 'origin');
  const branch = option('--branch', process.env.PAGES_BRANCH ?? 'pages');
  const verifyOnly = argv.includes('--verify-only');
  const workRef = `refs/pages-work/${branch}`;
  const verifyRef = `refs/pages-verify/${branch}`;

  /** Run a git command, returning trimmed stdout. */
  const git = (args, cwd = repoRoot) => {
    try {
      return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    } catch (error) {
      const detail = (error.stderr ?? '').toString().trim();
      throw new Error(`git ${args[0]} failed${detail ? `: ${detail}` : ''}`);
    }
  };

  /** Run a git command whose non-zero exit is an answer rather than a failure. */
  const gitStatus = (args, cwd = repoRoot) => {
    try {
      execFileSync('git', args, { cwd, stdio: 'ignore' });
      return 0;
    } catch (error) {
      return typeof error.status === 'number' ? error.status : 1;
    }
  };

  const gitConfig = (key, fallback) => {
    try {
      const value = execFileSync('git', ['config', '--get', key], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      return value || fallback;
    } catch {
      return fallback;
    }
  };

  const remoteHead = () => {
    const output = git(['ls-remote', '--heads', remote, branch]);
    const line = output.split('\n').find((entry) => entry.endsWith(`\trefs/heads/${branch}`));
    return line ? line.split('\t')[0] : null;
  };

  const fetchPublished = (ref) => {
    git(['fetch', '--depth=1', '--force', remote, `+refs/heads/${branch}:${ref}`]);
  };

  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error(`no build found at ${dist}/index.html — run "npm run build:pages" first`);
  }

  const scratch = mkdtempSync(join(tmpdir(), 'pages-deploy-'));
  const worktree = join(scratch, 'branch');

  try {
    const source = git(['rev-parse', 'HEAD']);
    const existingHead = remoteHead();

    // The build records its own source commit. Publishing a `dist` that was
    // built from a different commit — or without the marker at all — is exactly
    // the stale deploy this script exists to prevent, so refuse it here rather
    // than push it and verify it happily against itself.
    const markerPath = join(dist, 'deploy.txt');
    const marker = existsSync(markerPath) ? readFileSync(markerPath, 'utf8') : '';
    const builtFrom = /^source-commit=(\S+)$/m.exec(marker)?.[1] ?? '';
    if (builtFrom !== source) {
      throw new Error(
        `${dist}/deploy.txt says ${builtFrom ? builtFrom.slice(0, 7) : 'nothing'}, ` +
          `but HEAD is ${source.slice(0, 7)} — rebuild with "npm run build:pages"`,
      );
    }

    if (verifyOnly && !existingHead) throw new Error(`the remote has no "${branch}" branch to verify`);

    if (existingHead) {
      fetchPublished(workRef);
      git(['worktree', 'add', '--detach', worktree, workRef]);
    } else {
      say(`no ${branch} branch yet — starting a fresh orphan branch`);
      git(['worktree', 'add', '--detach', worktree, 'HEAD']);
      // The first publish has no parent, so it is not a child of main.
      git(['checkout', '--orphan', branch], worktree);
    }

    // The branch holds build output only; whatever is already there is replaced.
    for (const entry of readdirSync(worktree)) {
      if (entry !== '.git') rmSync(join(worktree, entry), { recursive: true, force: true });
    }
    for (const entry of readdirSync(dist)) {
      cpSync(join(dist, entry), join(worktree, entry), { recursive: true });
    }

    git(['add', '-A', '--', '.'], worktree);
    const builtTree = git(['write-tree'], worktree);

    if (!verifyOnly) {
      publish(builtTree, source, existingHead);
    } else {
      fetchPublished(verifyRef);
      assertPublished(builtTree);
      say(`verified — ${branch} at ${existingHead.slice(0, 7)} holds exactly the files in ${dist}`);
    }
  } finally {
    try {
      execFileSync('git', ['worktree', 'remove', '--force', worktree], { cwd: repoRoot, stdio: 'ignore' });
    } catch {
      // Setup may have failed before the worktree existed; prune still clears the record.
    }
    execFileSync('git', ['worktree', 'prune'], { cwd: repoRoot, stdio: 'ignore' });
    rmSync(scratch, { recursive: true, force: true });
  }

  /** Push the staged build, then re-read the branch from the server. */
  function publish(tree, sourceSha, previousHead) {
    const hasParent = gitStatus(['rev-parse', '--verify', '--quiet', 'HEAD'], worktree) === 0;
    const unchanged = hasParent && gitStatus(['diff', '--cached', '--quiet', 'HEAD'], worktree) === 0;
    let pushed = null;

    if (unchanged) {
      say('published files are unchanged; nothing to push');
    } else {
      const name = process.env.PAGES_COMMIT_NAME ?? gitConfig('user.name', 'Codeberg Pages');
      const email = process.env.PAGES_COMMIT_EMAIL ?? gitConfig('user.email', 'pages@noreply.codeberg.org');
      const message = [
        `Publish site from ${sourceSha.slice(0, 7)}`,
        '',
        `Source-commit: ${sourceSha}`,
        `Built-by: ${process.env.GITHUB_ACTOR ?? 'local'}`,
      ].join('\n');
      git(
        ['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '--quiet', '--no-verify', '-m', message],
        worktree,
      );
      pushed = git(['rev-parse', 'HEAD'], worktree);
      git(['push', '--quiet', remote, `HEAD:refs/heads/${branch}`], worktree);
      say(`pushed ${branch} at ${pushed.slice(0, 7)} from ${sourceSha.slice(0, 7)}`);
    }

    // Read the branch back from the server: this is the check that matters.
    fetchPublished(verifyRef);
    const publishedHead = git(['rev-parse', verifyRef]);
    const publishedTree = git(['rev-parse', `${verifyRef}^{tree}`]);

    if (publishedTree !== tree) {
      throw new Error(`published tree ${publishedTree.slice(0, 7)} does not match the build ${tree.slice(0, 7)}`);
    }
    if (pushed && publishedHead !== pushed) {
      throw new Error(`the server reports ${publishedHead.slice(0, 7)} but ${pushed.slice(0, 7)} was pushed`);
    }
    say(
      pushed
        ? `verified — ${branch} at ${publishedHead.slice(0, 7)} matches the build`
        : `verified — ${branch} already holds this build (${publishedHead.slice(0, 7)}, unchanged)`,
    );
    if (previousHead && pushed) say(`previous ${branch} head was ${previousHead.slice(0, 7)}`);
  }

  /** Compare the tree fetched from the server with the tree built from dist. */
  function assertPublished(tree) {
    const publishedTree = git(['rev-parse', `${verifyRef}^{tree}`]);
    if (publishedTree === tree) return;
    const drift = git(['diff', '--stat', verifyRef], worktree);
    throw new Error(
      `published tree ${publishedTree.slice(0, 7)} does not match the build ${tree.slice(0, 7)}` +
        (drift ? `\n${drift}` : ''),
    );
  }
}
