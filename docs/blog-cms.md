# Blog CMS + SEO package

MemoPear's blog is now a self-service CMS. You write, edit, and publish posts
from inside the app — no code change or redeploy — and every published post
ships with a full SEO package that's indexable the moment it goes live.

## Using the CMS

1. Sign in with an authorised owner account (see `BLOG_ADMIN_EMAILS` in
   `firebase.ts`).
2. Go to **`/blog/admin`** (or click **Manage posts** on the blog page — the
   link only shows for owner accounts).
3. **New post** opens the editor:
   - **Title / slug** — the slug is the permalink (`/blog/<slug>`) and is fixed
     once the post is created.
   - **Meta description** — what Google and social cards show. Keep it ≲155 chars.
   - **Excerpt** — the teaser on the blog index card.
   - **Date, read time, author, conference/topic, location, tags** — metadata
     used across the UI, sitemap, and structured data.
   - **Hero image** — upload one, or leave it empty for an auto-generated,
     on-brand graphic.
   - **Content blocks** — add/reorder/delete paragraphs, headings, bullet lists,
     pull quotes, the CTA banner, links, **images** (uploaded to Firebase
     Storage), and an **FAQ** (rendered as an FAQ rich-result on Google).
   - **Preview** renders the post exactly as readers will see it.
4. **Save draft** keeps it private (owner-only). **Publish** makes it live.
   Toggle **Publish/Unpublish** anytime from the post list.

Posts are stored in the Firestore `blogPosts` collection (one doc per slug).
The first time you open the CMS on a fresh project, use **Import the built-in
starter posts** to migrate the bundled seed articles into Firestore.

## The SEO package

Every published post automatically gets:

- A route-specific `<title>` and meta description.
- `rel=canonical`, Open Graph, and Twitter card tags (using the hero image when
  set, else the site OG image).
- **JSON-LD structured data** — `BlogPosting` for every post, plus `FAQPage`
  when the post has an FAQ block, and a `Blog` graph on the index.
- An entry in the **live sitemap** at `/sitemap.xml` (generated from Firestore,
  so new posts appear the instant they're published).

Because the site is a static SPA, this content is delivered to crawlers by a
server-side renderer so that search engines **and non-JavaScript AI crawlers**
(GPTBot, ClaudeBot, PerplexityBot, CCBot, …) get complete HTML:

- `functions/blogSsr.js` (the `blogSsr` Cloud Function) renders `/blog`,
  `/blog/<slug>`, and `/sitemap.xml` from Firestore into the real app shell.
- `nginx.conf.template` proxies those paths to the function. `/blog/admin` is
  kept on the static SPA (it's the authenticated editor and is `noindex`).
- Real visitors still get the full interactive SPA — the server-rendered HTML
  hydrates into React on load.

## Deploying (one-time wiring)

The frontend (Cloud Run) deploys via `cloudbuild.yaml` as before. The CMS also
needs the backend pieces deployed once:

```bash
# Firestore + Storage security rules (blogPosts collection + blog image bucket)
firebase deploy --only firestore:rules,storage

# The SEO server-renderer + other functions
firebase deploy --only functions
```

Then point nginx at the function. The `BLOG_SSR_ORIGIN` build/runtime env var
in the `Dockerfile` defaults to:

```
https://us-central1-my-new-memopear.cloudfunctions.net
```

Override it on the Cloud Run service if your project id or region differs. nginx
appends the function name (`/blogSsr/...`) automatically.

**Prerequisites**

- Firebase **Storage** must be enabled for the project (for image uploads).
- The owner accounts in `BLOG_ADMIN_EMAILS` must match the allowlists in
  `firestore.rules` and `storage.rules`.

## Files

| File | Role |
| --- | --- |
| `components/BlogAdmin.tsx` | The CMS editor UI (owner-gated) |
| `components/Blog.tsx` | Public blog rendering + block types + seed posts |
| `firebase.ts` | Firestore CRUD, image upload, admin allowlist |
| `functions/blogSsr.js` | Server-side SEO renderer + dynamic sitemap |
| `firestore.rules` / `storage.rules` | Access control |
| `nginx.conf.template` | Routes blog/sitemap requests to the SSR function |
