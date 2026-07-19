# Monthly Conference Blog Automation — Playbook

This file is the single source of truth for the **automated monthly blog post**.
A scheduled trigger fires once per month and runs an agent that follows these
steps to publish one new blog post about a high-tech conference **not already
covered on the site**, optimized for both SEO and LLMs, and registered in the
sitemap and `llms.txt`.

Keep this file up to date: when you publish a post, **remove that conference
from the backlog** below so it is never repeated.

---

## Goal (each run)

Publish **one** new blog post that:

1. Covers a **high-tech / business conference not already on the site**.
2. Is optimized for **SEO** (title, meta description, headings, keywords) and
   **LLMs** (clear structure, an FAQ section, factual, citable).
3. Is added to `public/sitemap.xml` and `public/llms.txt`.
4. Builds and type-checks cleanly, then is committed and pushed to the feature
   branch **and** fast-forwarded to `main` (production).

## Step 1 — See what's already covered (never repeat)

Read `components/Blog.tsx` → the `BLOG_POSTS` array. Note every existing `slug`
and `conference`. The new post **must** be a conference that does not already
appear there. Cross-check against the backlog below.

## Step 2 — Pick the conference (priority order)

Pick ONE conference that is **not already covered**, using this priority order:

1. **What our users attend (highest priority).** Run:
   `node scripts/user-conferences.mjs`
   It prints conference names our users have entered in the app, most-used
   first (or nothing if unavailable). Choose the most popular uncovered one. This
   is the whole point: write about the conferences our users actually care about.
2. **The static Backlog** at the bottom of this file — if the script returns
   nothing usable (empty, or every result already covered). Prefer one whose
   real-world dates are near the current month.
3. **Web research** — if both above are exhausted, use web search to find a
   well-known, currently-relevant high-tech/business conference not yet covered,
   and add it to the backlog for next time.

Whatever you pick, double-check it is not already in `BLOG_POSTS` or the
"Already covered" list before writing.

## Step 3 — Write the post

Add a new object to the **start** of the `BLOG_POSTS` array in
`components/Blog.tsx`, matching the existing `BlogPost` shape exactly:

- `slug`: kebab-case, unique, e.g. `money2020-2026-vegas-lead-capture-guide`.
- `title`: SEO-friendly, includes the conference name + year + a benefit
  ("Lead-Capture Guide", "Playbook", etc.). ~55–65 chars ideal.
- `description`: 1 sentence, ≤ ~155 chars, includes a concrete stat (attendees)
  and the value prop. Used for `<title>`/meta and the JSON-LD.
- `date`: `YYYY-MM-DD`. **Use a date no other post uses** (the firing date is
  fine). Posts must each be from a different date.
- `author`: `'The MemoPear Team'`.
- `readTime`: e.g. `'6 min read'`.
- `conference`, `location`: name and "City, Country".
- `tags`: 3–4 topical keywords.
- `excerpt`: 1–2 sentences for the index card.
- `blocks`: an array using the existing block types. **Required structure:**
  - Opening 2 paragraphs introducing the event (include a real attendance/scale
    figure and what kind of audience attends).
  - An `h2` + `ul` on why lead capture is hard at this specific event.
  - One `{ type: 'banner' }` block roughly in the middle (the subscribe/pricing CTA).
  - An `h2` + paragraph on how MemoPear helps (scan badge/card, voice notes,
    conference tagging, sync), plus a `quote` block.
  - An `h2` + paragraph on follow-up (personalized AI follow-up within 24–48h).
  - A `{ type: 'faq', items: [...] }` block with **3 Q&As** (great for LLMs and
    rich results). Phrase questions the way a user would ask them.
  - A closing paragraph.

Tone/voice: match the existing posts — practical, confident, field-marketing
oriented. Keep facts accurate; do not invent precise numbers you are unsure of
(round, well-known figures are fine; otherwise phrase qualitatively).

The renderer already injects per-post `BlogPosting` + `FAQPage` JSON-LD, canonical
URL, and Open Graph tags from this data, so no extra SEO wiring is needed.

**Hero image & table of contents are automatic** — no extra work required:
- A themed hero banner is generated from the post's `slug` (unique colours +
  a network motif) with the conference/location overlaid. To use a real photo
  instead, set the optional `heroImageUrl` field on the post.
- The table of contents (with scroll-spy highlighting) is built automatically
  from the post's `h2` headings plus the FAQ. So write clear, descriptive `h2`
  headings — they become the TOC labels.

## Step 4 — Register in sitemap + llms.txt

- `public/sitemap.xml`: add a `<url>` entry for
  `https://go.memopear.com/blog/<slug>` with `<lastmod>` = the post date,
  `<changefreq>monthly</changefreq>`, `<priority>0.7</priority>`. Place it among
  the other blog-post entries.
- `public/llms.txt`: add a bullet under the `## Blog` section in the same format
  as the others: `- <Title> (<date>): <url> — <one-line summary>.`

## Step 5 — Verify

Run `npm run lint` and `npm run build` — both must pass. Validate the sitemap is
well-formed XML.

## Step 6 — Commit & open a Pull Request into main

**Do NOT push to `main` directly.** `main` is under active parallel development,
so all changes go through a PR that a human reviews and merges.

```
git fetch origin main
# Start the branch fresh from the latest main so the PR is clean:
git checkout -B claude/blog-monthly-<slug> origin/main
git add components/Blog.tsx public/sitemap.xml public/llms.txt docs/blog-automation-playbook.md
git commit -m "Add monthly conference blog post: <Conference>"
git push -u origin claude/blog-monthly-<slug>
```

Then open a Pull Request into `main` (base `main`, head `claude/blog-monthly-<slug>`).
Automated fire sessions have no `gh` CLI and no GitHub MCP tools, so open the PR
in whichever of these works, in order:

1. **GitHub MCP `create_pull_request`** — only if those tools are actually
   available in the session.
2. **REST API** — if a `GITHUB_TOKEN` / `GH_TOKEN` env var is present:
   `curl -sS -X POST -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" https://api.github.com/repos/dvirnil-lgtm/memopear/pulls -d '{"title":"...","head":"claude/blog-monthly-<slug>","base":"main","body":"..."}'`
3. **Fallback (no PR API available):** do NOT push to `main`. Report the
   one-click compare URL so a human can open the PR:
   `https://github.com/dvirnil-lgtm/memopear/compare/main...claude/blog-monthly-<slug>?expand=1`

Title: `Add monthly conference blog post: <Conference>`. Body: summarize the post
and confirm lint + build passed; mirror any `.github/pull_request_template.md`.
**Never merge the PR and never push to `main`.** Use the repo's commit/PR
co-author/footer conventions; never include any internal model identifier.

## Step 7 — Update this playbook

Remove the conference you just used from the **Backlog** below and commit that
change in the same commit.

---

## Backlog — conferences not yet covered

Pick from the top; remove when used. (Month is the typical real-world month.)

- Money20/20 USA — Las Vegas, USA (October) — fintech.
- Collision / Web Summit Vancouver — Vancouver, Canada (May) — startups.
- GITEX Global — Dubai, UAE (October) — enterprise tech & AI.
- Cannes Lions — Cannes, France (June) — marketing & creativity.
- SXSW — Austin, USA (March) — tech, film, culture.
- Slush — Helsinki, Finland (November) — startups & VC.
- Hannover Messe — Hannover, Germany (April) — industrial tech.
- Computex — Taipei, Taiwan (June) — computing hardware.
- Gamescom — Cologne, Germany (August) — gaming.
- NVIDIA GTC — San Jose, USA (March) — AI & accelerated computing.
- Adobe Summit — Las Vegas, USA (March) — digital experience/marketing.
- HubSpot INBOUND — Boston, USA (September) — marketing & sales.
- RSA Conference — San Francisco, USA (May) — cybersecurity.
- Black Hat USA — Las Vegas, USA (August) — cybersecurity.
- Snowflake Summit — San Francisco, USA (June) — data/AI.
- IFA Berlin — Berlin, Germany (September) — consumer electronics.
- Singapore FinTech Festival — Singapore (November) — fintech.
- TOKEN2049 — Singapore / Dubai (varies) — web3/crypto.
- NRF Big Show — New York, USA (January) — retail tech.
- Microsoft Ignite — varies, USA (November) — enterprise IT.
- Google Cloud Next — Las Vegas, USA (April) — cloud.
- ISE (Integrated Systems Europe) — Barcelona, Spain (February) — AV/integration.
- World Economic Forum — Davos, Switzerland (January) — business & policy.
- IAA Mobility — Munich, Germany (September) — automotive/mobility.
- DMEXCO — Cologne, Germany (September) — digital marketing.

## Already covered (do NOT repeat)

VivaTech, SaaStr Annual, Dreamforce, Web Summit, AWS re:Invent, CES,
Mobile World Congress (MWC).
