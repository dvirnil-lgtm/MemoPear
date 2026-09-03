// ---------------------------------------------------------------------------
// Static, crawler-facing content for the Home and Pricing pages.
//
// WHY THIS EXISTS
// The Home and Pricing views live inline in the main <App> component and are
// stateful (auth, live subscription data, billing toggles), so they can't be
// safely server-rendered from the prerender script the way the Blog / legal
// pages are. That left those two URLs — the site's two most important
// commercial pages — serving an *empty* `<div id="root"></div>` to any client
// that doesn't execute JavaScript. Google can render JS, but it uses the
// initially-served HTML to decide how valuable a URL is and whether to spend
// crawl budget on it. An empty shell is a weak signal and contributes to the
// "Discovered – currently not indexed" state in Search Console.
//
// HOW IT'S SAFE
// index.tsx mounts the app with `ReactDOM.createRoot(root).render(<App/>)`
// (NOT hydrateRoot). createRoot *discards* whatever is already inside #root
// and paints the real, interactive app on top. So this markup:
//   - is seen by crawlers and no-JS clients (real, indexable content), and
//   - is thrown away for real visitors the instant the bundle boots,
// with no hydration-mismatch risk.
//
// KEEP IN SYNC
// The copy below mirrors the Home/Pricing views in App.tsx. It is presentation
// text only (no data props, no hooks) so it renders with renderToStaticMarkup.
// If the marketing copy or price changes in App.tsx, update it here too.
// ---------------------------------------------------------------------------

import React from 'react';

const HOME_STEPS: { n: number; title: string; body: string; features: string[] }[] = [
  {
    n: 1,
    title: 'Capture Contacts in Seconds',
    body: 'Just met someone cool? Type their name, scan their badge, or snap a photo of their business card. Done.',
    features: ['AI Badge & Card Scanner', 'Quick Manual Entry', 'Conference Tagging'],
  },
  {
    n: 2,
    title: 'Let AI Do the Heavy Lifting',
    body: 'Our AI reads business cards, extracts every field, and pulls LinkedIn profiles automatically. You just have the conversation.',
    features: ['Business Card OCR', 'Badge QR Scanning', 'LinkedIn Lookup'],
  },
  {
    n: 3,
    title: 'All Your Contacts, Organized',
    body: "Browse everyone you've met, search by name or company, and see your AI-generated follow-up notes — all in one clean list.",
    features: [],
  },
  {
    n: 4,
    title: 'Follow Up Without the Hassle',
    body: 'Export to Google Sheets with one tap, or let AI write a personalized follow-up email for every contact you captured.',
    features: [],
  },
];

const HOME_TESTIMONIALS: { quote: string; author: string; role: string }[] = [
  { quote: 'MemoPear turned our trade show chaos into a streamlined pipeline. We captured 300% more context than ever before.', author: 'Sarah Chen', role: 'VP Field Marketing, HyperScale' },
  { quote: 'Snapping a business card and having every field filled in instantly is a game-changer. I capture leads in seconds between meetings.', author: 'Mike Ross', role: 'Field Event Lead, TechPulse' },
  { quote: 'LinkedIn enrichment helps me personalize follow-ups immediately. It’s the SDR’s dream tool.', author: 'Elena Vance', role: 'Senior SDR, Zenith Cloud' },
];

/**
 * Server-rendered marketing content for `/`. Wiped and replaced by the live
 * React app on mount; only ever shown to crawlers and no-JS clients.
 */
export const HomeSeoContent: React.FC = () => (
  <main className="mx-auto max-w-3xl px-6 py-16 text-slate-800 dark:text-slate-200">
    <h1 className="text-4xl font-black tracking-tight">MemoPear — Simply Better Lead Collection</h1>
    <p className="mt-4 text-lg">
      Never lose a contact at a conference again. Scan badges, snap business cards, and follow up
      in seconds — all with AI. MemoPear is the lead-capture app for trade shows, conferences, and
      networking events.
    </p>

    <section className="mt-12">
      <h2 className="text-2xl font-bold">How MemoPear works</h2>
      {HOME_STEPS.map((step) => (
        <div key={step.n} className="mt-8">
          <h3 className="text-xl font-semibold">
            {step.n}. {step.title}
          </h3>
          <p className="mt-2">{step.body}</p>
          {step.features.length > 0 && (
            <ul className="mt-2 list-disc pl-6">
              {step.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>

    <section className="mt-12">
      <h2 className="text-2xl font-bold">What people say about MemoPear</h2>
      {HOME_TESTIMONIALS.map((t) => (
        <blockquote key={t.author} className="mt-6 border-l-4 border-blue-600 pl-4 italic">
          <p>&ldquo;{t.quote}&rdquo;</p>
          <footer className="mt-1 text-sm not-italic text-slate-500">
            — {t.author}, {t.role}
          </footer>
        </blockquote>
      ))}
    </section>

    <section className="mt-12">
      <h2 className="text-2xl font-bold">Ready to never miss a follow-up again?</h2>
      <p className="mt-2">
        Join thousands of people using MemoPear at conferences, trade shows, and networking events.
        Start your free trial today.
      </p>
      <p className="mt-4">
        <a href="/pricing">See pricing</a> · <a href="/integrations">Integrations</a> ·{' '}
        <a href="/blog">Read the blog</a>
      </p>
    </section>
  </main>
);

const PRICING_FEATURES: { title: string; desc: string }[] = [
  { title: 'AI Badge & Card Scanner', desc: 'Snap a photo or scan a QR code — we fill in the details automatically.' },
  { title: 'Business Card OCR', desc: 'Our AI reads any business card with incredible accuracy.' },
  { title: 'Quick Notes', desc: 'Jot down context and next steps right alongside every contact.' },
  { title: 'LinkedIn Lookup', desc: 'Find anyone on LinkedIn with one tap — right from their contact card.' },
  { title: 'Google Sheets Export', desc: 'Push all your contacts to a spreadsheet with a single click.' },
  { title: 'Private & Secure', desc: 'Your contacts never leave your account. We keep them for 30 days, then delete them for your security.' },
  { title: 'AI Follow-up Emails', desc: 'Get a personalized follow-up email drafted for every contact.' },
  { title: 'Unlimited Contacts', desc: 'Capture as many contacts as you want — no limits, ever.' },
];

/**
 * Server-rendered marketing content for `/pricing`. Wiped and replaced by the
 * live React app on mount; only ever shown to crawlers and no-JS clients.
 */
export const PricingSeoContent: React.FC = () => (
  <main className="mx-auto max-w-3xl px-6 py-16 text-slate-800 dark:text-slate-200">
    <h1 className="text-4xl font-black tracking-tight">Simple Pricing — MemoPear Pro</h1>
    <p className="mt-4 text-lg">One plan. Everything included. No surprises.</p>
    <p className="mt-2">
      MemoPear Pro is <strong>$2.80/month</strong> per seat, or <strong>$30.24/year</strong> per
      seat when billed annually (save 10%). Your first days are free — a card is required, and you
      can cancel anytime before you&rsquo;re billed.
    </p>

    <section className="mt-12">
      <h2 className="text-2xl font-bold">Everything in MemoPear Pro</h2>
      <ul className="mt-4 space-y-4">
        {PRICING_FEATURES.map((f) => (
          <li key={f.title}>
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p>{f.desc}</p>
          </li>
        ))}
      </ul>
    </section>

    <section className="mt-12">
      <h2 className="text-2xl font-bold">Get started</h2>
      <p className="mt-2">
        Start capturing conference contacts today. <a href="/">Learn how MemoPear works</a> or{' '}
        <a href="/integrations">see the integrations</a>.
      </p>
    </section>
  </main>
);
