#!/usr/bin/env node
// Compiles scripts/gen-static-blog-posts.entry.ts (which imports BLOG_POSTS
// from the React app) to a runnable ESM file with esbuild, executes it to
// write functions/staticBlogPosts.json, then cleans up. Run as part of
// `npm run build` so the JSON never drifts from components/Blog.tsx.

import { build } from 'esbuild';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(__dirname, 'gen-static-blog-posts.entry.ts');
const outfile = path.join(__dirname, '.gen-static-blog-posts.build.mjs');

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react-dom/server'],
  logLevel: 'warning',
});

try {
  await import(`${'file://' + outfile}?t=${Date.now()}`);
} finally {
  await unlink(outfile).catch(() => {});
}
