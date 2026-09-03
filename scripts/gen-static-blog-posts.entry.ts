// Extracts the minimal metadata for the built-in (hardcoded) blog posts from
// components/Blog.tsx into functions/staticBlogPosts.json, so the blog SSR
// Cloud Function can include them in the sitemap and llms.txt even when they
// have not been seeded into Firestore via the CMS.
//
// components/Blog.tsx is the single source of truth; this generator keeps the
// JSON from drifting. It is compiled + run by scripts/gen-static-blog-posts.mjs
// (part of `npm run build`).

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BLOG_POSTS } from '../components/Blog';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, '../functions/staticBlogPosts.json');

const slim = BLOG_POSTS.map((p) => ({
  slug: p.slug,
  title: p.title,
  date: p.date,
  description: p.description,
  excerpt: p.excerpt,
}));

await writeFile(outPath, JSON.stringify(slim, null, 2) + '\n', 'utf8');
console.log(`Wrote ${slim.length} static blog posts -> functions/staticBlogPosts.json`);
