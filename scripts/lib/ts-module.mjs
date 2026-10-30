/**
 * Imports a TypeScript module from a Node script without adding a build step.
 *
 * The content tooling has to share the slug and projection rules with the app,
 * and the app's rules live in `src/lib/edition.ts`. Copying them into a `.mjs`
 * script would let the two drift, which is exactly the failure this pipeline
 * exists to prevent: a URL that the generator thinks is fine and the page
 * cannot resolve.
 *
 * esbuild is already installed as Vite's dependency, so bundling to memory and
 * importing the result costs no new package. Only modules that leave the
 * browser out of their import graph can be loaded this way — `edition.ts` and
 * `seed.ts` do.
 */
import path from 'node:path';
import { build } from 'esbuild';

export async function importTs(relativeEntry) {
  const entry = path.resolve(relativeEntry);
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    target: 'node20',
    logLevel: 'silent',
    // The tooling needs the pure rules only; a React import would be a sign the
    // wrong module was loaded.
    external: ['react', 'react-dom', 'react-router-dom'],
  });
  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
