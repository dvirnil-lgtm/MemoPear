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

## Step 2 — Pick the conference

Choose one conference from the **Backlog** at the bottom of this file. Prefer one
whose real-world dates are **near the current month** (timeliness helps SEO), but
any uncovered major event is fine. If the backlog is empty, pick another
well-known high-tech conference not yet covered and add it.

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

## Step 6 — Commit & push to production

```
git fetch origin <default-branch>
git checkout -B claude/memopear-blog-section-suhrdp origin/claude/memopear-blog-section-suhrdp   # or create from main if absent
# (commit the changes)
git add components/Blog.tsx public/sitemap.xml public/llms.txt docs/blog-automation-playbook.md
git commit -m "Add monthly conference blog post: <Conference>"
git push -u origin claude/memopear-blog-section-suhrdp
# Fast-forward main (production) and push:
git checkout main && git merge --ff-only claude/memopear-blog-section-suhrdp && git push origin main
git checkout claude/memopear-blog-section-suhrdp
```

Use commit/PR co-author/footer conventions per the repo's standing instructions.
Do **not** include any internal model identifiers in commits or pushed files.

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
