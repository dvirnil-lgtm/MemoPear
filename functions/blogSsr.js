// ---------------------------------------------------------------------------
// Server-side blog renderer (SEO)
//
// The MemoPear site is a static, client-rendered SPA served from nginx. Blog
// posts, however, live in Firestore and are published from the in-app CMS, so
// they are NOT in the static build. This Cloud Function renders those posts
// into fully SEO-optimised HTML on the fly, so every published post is
// indexable by search engines AND non-JavaScript crawlers (GPTBot, ClaudeBot,
// PerplexityBot, CCBot, …) the instant it goes live — no rebuild.
//
// nginx proxies /blog, /blog/<slug> and /sitemap.xml to this function (see
// nginx.conf). For each request it:
//   1. fetches the real built app shell (so the correct hashed JS/CSS bundles
//      are present and the page still hydrates into the full interactive SPA),
//   2. loads the post(s) from Firestore,
//   3. injects route-specific <title>, meta description, canonical, Open Graph,
//      Twitter and JSON-LD (BlogPosting + FAQPage / Blog) tags, and
//   4. server-renders the post body into <div id="root"> for crawlers.
//
// The block -> HTML mapping here mirrors the React <Block> renderer in
// components/Blog.tsx. Keep the two in sync when adding block types.
// ---------------------------------------------------------------------------

const SITE_URL = process.env.SITE_ORIGIN || 'https://memopear.com';
const COLLECTION = 'blogPosts';

// The app shell rarely changes between deploys; cache it briefly in memory to
// avoid re-fetching it on every crawler hit.
let _shellCache = { html: '', at: 0 };
const SHELL_TTL_MS = 60 * 1000;

async function getShell() {
  const now = Date.now();
  if (_shellCache.html && now - _shellCache.at < SHELL_TTL_MS) return _shellCache.html;
  const res = await fetch(`${SITE_URL}/index.html`, { headers: { 'x-ssr-shell': '1' } });
  if (!res.ok) throw new Error(`shell fetch failed: ${res.status}`);
  const html = await res.text();
  _shellCache = { html, at: now };
  return html;
}

const escapeHtml = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeAttr = escapeHtml;

const escapeJsonLdForScript = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

const slugifyHeading = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const formatDate = (iso) => {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
};

// ── Block -> HTML (mirrors components/Blog.tsx <Block>) ──────────────────────

function renderBlock(block) {
  switch (block && block.type) {
    case 'p':
      return `<p>${escapeHtml(block.text)}</p>`;
    case 'h2':
      return `<h2 id="${escapeAttr(slugifyHeading(block.text))}" class="scroll-mt-24 text-2xl font-black text-slate-900 dark:text-white mt-12 mb-4 tracking-tight">${escapeHtml(block.text)}</h2>`;
    case 'ul':
      return `<ul class="list-disc pl-6 space-y-3 marker:text-pear-500">${(block.items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
    case 'quote':
      return `<blockquote class="not-prose my-10 border-l-4 border-pear-500 pl-6 py-2 text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white italic">${escapeHtml(block.text)}</blockquote>`;
    case 'banner':
      return `<aside class="not-prose my-10 p-7 md:p-10 rounded-[2rem] bg-pear-600 text-white shadow-2xl"><p class="text-[10px] font-black uppercase tracking-[0.25em] text-pear-100 mb-3">MemoPear</p><h3 class="text-2xl md:text-3xl font-black tracking-tight mb-2">Never lose a conference lead again.</h3><p class="text-sm font-medium text-pear-50/90 max-w-xl mb-6">Scan badges, snap business cards, and capture notes in the moment — then follow up with AI.</p><a href="/pricing" class="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-pear-700 font-black rounded-2xl text-[11px] uppercase tracking-widest">Get Started</a></aside>`;
    case 'link':
      return `<p class="not-prose"><a href="${escapeAttr(block.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-sm font-black text-pear-600 dark:text-pear-400 hover:underline underline-offset-2">${escapeHtml(block.label)}</a></p>`;
    case 'image':
      return `<figure class="not-prose my-8"><img src="${escapeAttr(block.url)}" alt="${escapeAttr(block.alt || '')}" loading="lazy" class="w-full rounded-[1.5rem] border border-slate-200 dark:border-white/10 shadow-lg">${block.caption ? `<figcaption class="mt-3 text-center text-xs font-medium text-slate-400">${escapeHtml(block.caption)}</figcaption>` : ''}</figure>`;
    case 'faq':
      return `<section id="faq" class="not-prose scroll-mt-24 mt-12"><h2 class="text-2xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">Frequently Asked Questions</h2><div class="space-y-4">${(block.items || []).map((qa) => `<div class="p-6 bg-slate-100 dark:bg-white/5 rounded-[1.5rem] border border-slate-200 dark:border-white/10"><h3 class="text-base font-black text-slate-900 dark:text-white mb-2">${escapeHtml(qa.q)}</h3><p class="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">${escapeHtml(qa.a)}</p></div>`).join('')}</div></section>`;
    default:
      return '';
  }
}

function renderPostBody(post) {
  const hero = post.heroImageUrl
    ? `<div class="relative w-full h-52 md:h-72 rounded-[2rem] overflow-hidden mb-8 shadow-xl"><img src="${escapeAttr(post.heroImageUrl)}" alt="${escapeAttr(post.conference + ' — ' + post.location)}" class="absolute inset-0 w-full h-full object-cover"></div>`
    : `<div class="relative w-full h-52 md:h-72 rounded-[2rem] overflow-hidden mb-8 shadow-xl" style="background:linear-gradient(135deg,#155e63 0%,#08312f 100%)"></div>`;
  const blocks = (post.blocks || []).map(renderBlock).join('\n');
  return `<div class="px-6 md:px-8 max-w-5xl mx-auto pb-32 pt-2"><article class="min-w-0">${hero}<div class="flex items-center gap-2 mb-5 flex-wrap"><span class="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-pear-600/10 text-pear-600 dark:text-pear-400">${escapeHtml(post.conference)}</span><span class="text-[9px] font-bold uppercase tracking-widest text-slate-400">${escapeHtml(post.location)}</span></div><h1 class="text-3xl md:text-5xl font-black mb-5 tracking-tighter text-slate-900 dark:text-white leading-[1.05]">${escapeHtml(post.title)}</h1><div class="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 flex-wrap"><span>${escapeHtml(post.author)}</span><time datetime="${escapeAttr(post.date)}">${escapeHtml(formatDate(post.date))}</time><span>${escapeHtml(post.readTime)}</span></div><div class="space-y-6 text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">${blocks}</div></article></div>`;
}

function renderIndexBody(posts) {
  const cards = posts
    .map(
      (p) => `<article class="glass rounded-[2rem] border border-slate-200 dark:border-white/10 overflow-hidden"><div class="p-7"><div class="flex items-center gap-2 mb-4 flex-wrap"><span class="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-pear-600/10 text-pear-600 dark:text-pear-400">${escapeHtml(p.conference)}</span><span class="text-[9px] font-bold uppercase tracking-widest text-slate-400">${escapeHtml(formatDate(p.date))}</span></div><h2 class="text-xl font-black tracking-tight mb-3"><a href="/blog/${escapeAttr(p.slug)}">${escapeHtml(p.title)}</a></h2><p class="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">${escapeHtml(p.excerpt)}</p></div></article>`,
    )
    .join('');
  return `<div class="p-8 max-w-4xl mx-auto pb-32"><p class="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">The MemoPear Blog</p><h1 class="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-pear-600 dark:text-pear-400">Field notes from the conference floor.</h1><p class="text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl mb-12">Tactical guides to capturing, organizing, and following up on leads at the biggest events in high tech.</p><div class="grid gap-6 md:grid-cols-2">${cards}</div></div>`;
}

// ── JSON-LD (mirrors content/seo.ts) ─────────────────────────────────────────

function buildPostJsonLd(post) {
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const faq = (post.blocks || []).find((b) => b.type === 'faq');
  const graph = [
    {
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      author: { '@type': 'Organization', name: post.author, url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'MemoPear', logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon-512.png` } },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      keywords: (post.tags || []).join(', '),
      image: post.heroImageUrl || `${SITE_URL}/og-image-1200x630.png`,
    },
  ];
  if (faq) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.items.map((qa) => ({ '@type': 'Question', name: qa.q, acceptedAnswer: { '@type': 'Answer', text: qa.a } })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

function buildIndexJsonLd(posts) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'MemoPear Blog',
    url: `${SITE_URL}/blog`,
    blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, description: p.description, datePublished: p.date, url: `${SITE_URL}/blog/${p.slug}` })),
  };
}

// ── Head injection (mirrors scripts/prerender-entry.tsx renderPage) ──────────

function injectHead(template, { title, description, canonical, isArticle, jsonLd, image }) {
  let html = template;
  const img = image || `${SITE_URL}/og-image-1200x630.png`;
  html = html.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta name="description" content=".*?">/s, `<meta name="description" content="${escapeAttr(description)}">`);
  html = html.replace(/<meta property="og:title" content=".*?">/s, `<meta property="og:title" content="${escapeAttr(title)}">`);
  html = html.replace(/<meta property="og:description" content=".*?">/s, `<meta property="og:description" content="${escapeAttr(description)}">`);
  html = html.replace(/<meta property="og:image" content=".*?">/s, `<meta property="og:image" content="${escapeAttr(img)}">`);
  html = html.replace(/<meta name="twitter:title" content=".*?">/s, `<meta name="twitter:title" content="${escapeAttr(title)}">`);
  html = html.replace(/<meta name="twitter:description" content=".*?">/s, `<meta name="twitter:description" content="${escapeAttr(description)}">`);
  html = html.replace(/<meta name="twitter:image" content=".*?">/s, `<meta name="twitter:image" content="${escapeAttr(img)}">`);
  // The app shell we fetch is the home-prerendered index.html, which already
  // carries home's canonical / og:url / og:type. Strip those so we don't emit
  // duplicate, conflicting tags before appending this route's own.
  html = html
    .replace(/\s*<link rel="canonical"[^>]*>/g, '')
    .replace(/\s*<meta property="og:url"[^>]*>/g, '')
    .replace(/\s*<meta property="og:type"[^>]*>/g, '');
  const extraHead = [
    `<link rel="canonical" href="${escapeAttr(canonical)}">`,
    `<meta property="og:url" content="${escapeAttr(canonical)}">`,
    `<meta property="og:type" content="${isArticle ? 'article' : 'website'}">`,
    jsonLd ? `<script type="application/ld+json">${escapeJsonLdForScript(jsonLd)}</script>` : '',
  ].filter(Boolean).join('\n    ');
  html = html.replace('</head>', `    ${extraHead}\n  </head>`);
  return html;
}

function injectBody(template, bodyHtml) {
  return template.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
}

// ── Data access ──────────────────────────────────────────────────────────────

async function loadPublishedPosts(db) {
  const snap = await db.collection(COLLECTION).where('status', '==', 'published').get();
  const posts = snap.docs.map((d) => d.data());
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

async function loadPost(db, slug) {
  const doc = await db.collection(COLLECTION).doc(slug).get();
  if (!doc.exists) return null;
  const data = doc.data();
  return data && data.status === 'published' ? data : null;
}

// ── Route handling ───────────────────────────────────────────────────────────

function pathFromReq(req) {
  const raw = (req.headers['x-original-path'] || req.originalUrl || req.url || req.path || '/').toString();
  const clean = raw.split('?')[0];
  // Strip a leading function-name segment if the platform kept it.
  return clean.replace(/^\/blogSsr/, '') || '/';
}

function buildSitemap(posts) {
  const staticRoutes = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/pricing', priority: '0.9', changefreq: 'monthly' },
    { loc: '/integrations', priority: '0.8', changefreq: 'monthly' },
    { loc: '/blog', priority: '0.8', changefreq: 'weekly' },
    { loc: '/company', priority: '0.6', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.5', changefreq: 'yearly' },
    { loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
    { loc: '/terms', priority: '0.3', changefreq: 'yearly' },
  ];
  const urls = staticRoutes
    .map((r) => `  <url>\n    <loc>${SITE_URL}${r.loc}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`)
    .concat(
      posts.map(
        (p) => `  <url>\n    <loc>${SITE_URL}/blog/${escapeHtml(p.slug)}</loc>\n    <lastmod>${new Date(p.updatedAt || Date.now()).toISOString().slice(0, 10)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
      ),
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// Static preamble/appendix for /llms.txt. Only the "## Blog" section is
// generated from Firestore (see buildLlmsTxt); everything else is constant and
// must be kept in sync with public/llms.txt, which serves as the fallback when
// this function is unavailable.
const LLMS_TXT_HEAD = `# MemoPear

> MemoPear is an AI-powered field intelligence and lead capture platform built for conference and trade show professionals. It turns in-person encounters into structured pipeline data using Gemini AI.

## What MemoPear does

- Captures contact information from business cards via camera (AI OCR)
- Transcribes spoken notes in real time using Google Gemini Live Audio
- Generates AI-written personalized follow-up emails per contact
- Exports leads to Google Sheets in one tap
- Supports team seat plans with shared pipeline access

## Public pages

- Home: ${SITE_URL}/
- Pricing: ${SITE_URL}/pricing
- Blog: ${SITE_URL}/blog
- Company: ${SITE_URL}/company
- Contact: ${SITE_URL}/contact
- Privacy Policy: ${SITE_URL}/privacy
- Terms of Service: ${SITE_URL}/terms

## Blog

The MemoPear blog publishes tactical lead-capture playbooks for the biggest conferences in high tech. Each article covers a specific event and how field marketers, field sales reps, founders, and exhibitors can capture, organize, and follow up on leads at it.
`;

const LLMS_TXT_TAIL = `
## App pages (require sign-in, not indexed)

- Login / Sign up: ${SITE_URL}/login
- Gather (lead capture): ${SITE_URL}/gather
- Pipeline (saved leads): ${SITE_URL}/pipeline
- Profile: ${SITE_URL}/profile
- Team management: ${SITE_URL}/team

## Technology

- Frontend: React + TypeScript + Vite
- AI: Google Gemini (vision, live audio, text generation)
- Auth: Firebase Authentication
- Payments: Stripe
- Hosting: Google Cloud Run

## Contact

For questions about data use or API access, visit ${SITE_URL}/contact
`;

// llms.txt is plain text (Markdown), so collapse newlines that would otherwise
// break a bullet across lines but keep the single-line-per-post shape.
const oneLine = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

function buildLlmsTxt(posts) {
  const bullets = posts
    .map((p) => {
      const summary = oneLine(p.excerpt || p.description);
      const base = `- ${oneLine(p.title)} (${p.date}): ${SITE_URL}/blog/${p.slug}`;
      return summary ? `${base} — ${summary}` : base;
    })
    .join('\n');
  return `${LLMS_TXT_HEAD}\n${bullets}\n${LLMS_TXT_TAIL}`;
}

/**
 * Returns an Express-style (req, res) handler bound to the given Firestore
 * instance. Exported so functions/index.js can wrap it in onRequest().
 */
function createBlogSsrHandler(db) {
  return async function handler(req, res) {
    const path = pathFromReq(req);
    try {
      // Dynamic sitemap.
      if (path === '/sitemap.xml') {
        const posts = await loadPublishedPosts(db);
        res.set('Content-Type', 'application/xml; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
        return res.status(200).send(buildSitemap(posts));
      }

      // Dynamic llms.txt (blog section generated from Firestore).
      if (path === '/llms.txt') {
        const posts = await loadPublishedPosts(db);
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
        return res.status(200).send(buildLlmsTxt(posts));
      }

      const shell = await getShell();

      // The CMS lives at /blog/admin: it's an authenticated SPA view, never
      // server-rendered or indexed — return the plain shell.
      if (path === '/blog/admin' || path === '/blog/admin/') {
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('X-Robots-Tag', 'noindex, nofollow');
        return res.status(200).send(shell);
      }

      // Blog index.
      if (path === '/blog' || path === '/blog/') {
        const posts = await loadPublishedPosts(db);
        let html = injectHead(shell, {
          title: 'Blog: Conference Lead-Capture Playbooks | MemoPear',
          description:
            'Tactical guides to capturing, organizing, and following up on leads at the biggest high-tech conferences.',
          canonical: `${SITE_URL}/blog`,
          isArticle: false,
          jsonLd: buildIndexJsonLd(posts),
        });
        html = injectBody(html, renderIndexBody(posts));
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=120, s-maxage=300');
        return res.status(200).send(html);
      }

      // Single post: /blog/<slug>
      if (path.startsWith('/blog/')) {
        const slug = decodeURIComponent(path.slice('/blog/'.length).replace(/\/$/, ''));
        const post = await loadPost(db, slug);
        if (!post) {
          // Unknown/unpublished slug — return the shell so the SPA can show its
          // own "not found" fallback, with a 404 status for crawlers.
          res.set('Content-Type', 'text/html; charset=utf-8');
          return res.status(404).send(shell);
        }
        let html = injectHead(shell, {
          title: `${post.title} | MemoPear Blog`,
          description: post.description,
          canonical: `${SITE_URL}/blog/${post.slug}`,
          isArticle: true,
          jsonLd: buildPostJsonLd(post),
          image: post.heroImageUrl,
        });
        html = injectBody(html, renderPostBody(post));
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=120, s-maxage=300');
        return res.status(200).send(html);
      }

      // Anything else proxied here: just serve the shell.
      res.set('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(shell);
    } catch (err) {
      console.error('[blogSsr] error for', path, err);
      // Fail open: try to return the shell so users still get the SPA.
      try {
        const shell = await getShell();
        res.set('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
      } catch (_) {
        return res.status(500).send('Internal Server Error');
      }
    }
  };
}

module.exports = { createBlogSsrHandler };
