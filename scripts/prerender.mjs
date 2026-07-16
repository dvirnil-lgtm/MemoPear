#!/usr/bin/env node
// Compiles scripts/prerender-entry.tsx (JSX + local TS imports) to a runnable
// ESM file with esbuild, executes it against the just-built dist/, then
// cleans up. Run automatically as part of `npm run build`.

import { build } from 'esbuild';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(__dirname, 'prerender-entry.tsx');
const outfile = path.join(__dirname, '.prerender-entry.build.mjs');

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  // Resolve react/react-dom from node_modules at run time instead of
  // bundling them, so both the app code and react-dom/server share the
  // same React instance.
  external: ['react', 'react-dom', 'react-dom/server'],
  logLevel: 'warning',
});

try {
  await import(`${'file://' + outfile}?t=${Date.now()}`);
} finally {
  await unlink(outfile).catch(() => {});
}
