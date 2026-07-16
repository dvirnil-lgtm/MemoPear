// ---------------------------------------------------------------------------
// Build-time prerender.
//
// The site is a client-side-rendered SPA served as static files from nginx
// (see Dockerfile / nginx.conf) — there is no server to run React on
// request. Most search engines execute JavaScript before indexing, but many
// LLM crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot, and similar) fetch
// raw HTML and do not run the bundle, so without this step every public URL
// would resolve to the same generic, contentless shell.
//
// This script runs after `vite build` (see package.json) and, for each
// public route, writes a standalone dist/<route>/index.html: the real built
// HTML shell (same JS/CSS bundle, so the page still hydrates into the full
// interactive app for real visitors) with route-specific <title>, meta
// description, canonical link, Open Graph tags, JSON-LD, and — for the
// purely static/data-driven pages — real server-rendered body content in
// place of the empty #root div.
//
// Home and Pricing are stateful views defined inline in the main App
// component (auth, live subscription data, etc.) and are not safely
// server-renderable here, so they only get corrected <head> metadata.
// Every other public page (Blog, Integrations, Company, Contact, Privacy,
// Terms) is a small, self-contained component that takes no data props, so
// it is rendered with react-dom/server for byte-for-byte accurate content —
// there is no hand-duplicated copy to drift out of sync with the real app.
// ---------------------------------------------------------------------------

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BLOG_POSTS, SITE_URL, BlogIndex, BlogPostView } from '../components/Blog';
import { Integrations } from '../components/Integrations';
import { PrivacyPolicy, TermsAndConditions, ContactUs, Company } from '../components/LegalPages';
import { PAGE_META } from '../content/pageMeta';
import { buildBlogPostJsonLd, buildBlogIndexJsonLd } from '../content/seo';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

const noop = () => {};

interface Route {
  urlPath: string;
  title: string;
  description: string;
  jsonLd?: object;
  bodyHtml?: string;
  isArticle?: boolean;
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeJsonLdForScript = (data: object): string =>
  // Prevent the JSON payload from prematurely closing the surrounding
  // <script> tag if a string field ever contains "</script>".
  JSON.stringify(data).replace(/</g, '\\u003c');

function renderPage(template: string, route: Route): string {
  let html = template;
  html = html.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(route.title)}</title>`);
  html = html.replace(
    /<meta name="description" content=".*?">/s,
    `<meta name="description" content="${escapeHtml(route.description)}">`
  );
  html = html.replace(
    /<meta property="og:title" content=".*?">/s,
    `<meta property="og:title" content="${escapeHtml(route.title)}">`
  );
  html = html.replace(
    /<meta property="og:description" content=".*?">/s,
    `<meta property="og:description" content="${escapeHtml(route.description)}">`
  );
  html = html.replace(
    /<meta name="twitter:title" content=".*?">/s,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}">`
  );
  html = html.replace(
    /<meta name="twitter:description" content=".*?">/s,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}">`
  );

  const canonical = `${SITE_URL}${route.urlPath}`;
  const extraHead = [
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:type" content="${route.isArticle ? 'article' : 'website'}">`,
    route.jsonLd
      ? `<script type="application/ld+json">${escapeJsonLdForScript(route.jsonLd)}</script>`
      : '',
  ]
    .filter(Boolean)
    .join('\n    ');
  html = html.replace('</head>', `    ${extraHead}\n  </head>`);

  if (route.bodyHtml) {
    html = html.replace('<div id="root"></div>', `<div id="root">${route.bodyHtml}</div>`);
  }

  return html;
}

async function main() {
  const template = await readFile(path.join(distDir, 'index.html'), 'utf8');

  const routes: Route[] = [
    {
      urlPath: '/',
      title: PAGE_META.home.title,
      description: PAGE_META.home.description,
    },
    {
      urlPath: '/pricing',
      title: PAGE_META.pricing.title,
      description: PAGE_META.pricing.description,
    },
    {
      urlPath: '/integrations',
      title: PAGE_META.integrations.title,
      description: PAGE_META.integrations.description,
      bodyHtml: renderToStaticMarkup(<Integrations onBack={noop} />),
    },
    {
      urlPath: '/company',
      title: PAGE_META.company.title,
      description: PAGE_META.company.description,
      bodyHtml: renderToStaticMarkup(<Company onBack={noop} />),
    },
    {
      urlPath: '/contact',
      title: PAGE_META.contact.title,
      description: PAGE_META.contact.description,
      bodyHtml: renderToStaticMarkup(<ContactUs onBack={noop} />),
    },
    {
      urlPath: '/privacy',
      title: PAGE_META.privacy.title,
      description: PAGE_META.privacy.description,
      bodyHtml: renderToStaticMarkup(<PrivacyPolicy onBack={noop} />),
    },
    {
      urlPath: '/terms',
      title: PAGE_META.terms.title,
      description: PAGE_META.terms.description,
      bodyHtml: renderToStaticMarkup(<TermsAndConditions onBack={noop} />),
    },
    {
      urlPath: '/blog',
      title: PAGE_META.blog.title,
      description: PAGE_META.blog.description,
      jsonLd: buildBlogIndexJsonLd(),
      bodyHtml: renderToStaticMarkup(
        <BlogIndex onBack={noop} onOpenPost={noop} onGetStarted={noop} />
      ),
    },
    ...BLOG_POSTS.map((post) => ({
      urlPath: `/blog/${post.slug}`,
      title: `${post.title} | MemoPear Blog`,
      description: post.description,
      jsonLd: buildBlogPostJsonLd(post),
      isArticle: true,
      bodyHtml: renderToStaticMarkup(
        <BlogPostView post={post} onBack={noop} onOpenPost={noop} onGetStarted={noop} />
      ),
    })),
  ];

  for (const route of routes) {
    const html = renderPage(template, route);
    const outPath =
      route.urlPath === '/'
        ? path.join(distDir, 'index.html')
        : path.join(distDir, route.urlPath.replace(/^\//, ''), 'index.html');
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, html, 'utf8');
    console.log(`  prerendered ${route.urlPath} -> ${path.relative(root, outPath)}`);
  }

  console.log(`Prerendered ${routes.length} public routes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
