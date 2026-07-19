import React, { useState, useEffect, useMemo } from 'react';

// ---------------------------------------------------------------------------
// MemoPear Blog
//
// A lightweight, data-driven blog section. Each post is described by metadata
// (used for routing, SEO, the sitemap and llms.txt) plus a list of content
// "blocks" that render to semantic HTML. Keeping the content structured lets us
// generate JSON-LD (BlogPosting + FAQPage) for rich results and makes the posts
// easy for LLMs to parse and cite.
//
// When adding a post here, also add its URL to public/sitemap.xml and
// public/llms.txt so search engines and AI crawlers can discover it.
// ---------------------------------------------------------------------------

export const SITE_URL = 'https://go.memopear.com';

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'banner' }
  | { type: 'faq'; items: { q: string; a: string }[] };

export interface BlogPost {
  slug: string;
  title: string;
  /** Used for <title> and meta description. Keep under ~155 chars. */
  description: string;
  /** ISO date (YYYY-MM-DD). Each post is from a different date. */
  date: string;
  author: string;
  readTime: string;
  conference: string;
  location: string;
  /** Short keyword/topic tags surfaced in the UI and structured data. */
  tags: string[];
  /** One-line summary used on the index cards. */
  excerpt: string;
  /**
   * Optional hero image URL. When omitted, a themed, on-brand SVG hero is
   * generated automatically from the post's slug and conference/location.
   */
  heroImageUrl?: string;
  blocks: BlogBlock[];
}

const SUBSCRIBE_BANNER: BlogBlock = { type: 'banner' };

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'why-more-business-cards-means-worse-follow-up',
    title: 'Why the Rep With the Most Business Cards Has the Worst Follow-Up',
    description:
      'The rep who collects the most business cards at a conference is usually worst at follow-up. Here is why lead volume kills conversion, and what actually works instead.',
    date: '2026-07-16',
    author: 'The MemoPear Team',
    readTime: '11 min read',
    conference: 'Conference Follow-Up',
    location: 'For Sales Teams & Founders',
    tags: ['Lead Capture', 'Sales Strategy', 'Follow-Up', 'B2B Sales'],
    excerpt:
      'Collecting the most business cards at a conference feels productive. It usually predicts the worst follow-up. Here is why depth beats volume, and how to capture just enough context to actually convert.',
    blocks: [
      {
        type: 'p',
        text: 'Here is an unpopular opinion that holds up every time you look closely at a sales team\'s post-conference numbers: the rep who comes home with the most business cards is usually the worst at follow-up. Not occasionally. Usually. Walk any expo floor and you will spot them — moving fast, collecting cards at every booth and every handshake, treating the stack in their bag as a scoreboard. It looks like hustle. It photographs well for a LinkedIn recap post. It is almost never the thing that produces pipeline.',
      },
      {
        type: 'p',
        text: 'Volume feels productive because it is easy to measure in the moment. You can watch the stack get thicker. You cannot watch context evaporate at the same rate, because that happens quietly, on the flight home, in the three days it takes to "get through" everything from the show. By the time a rep is back at their desk, a pile of 40 cards is not a lead list. It is a to-do list they will never finish — and worse, one where half the entries are unreadable even to the person who collected them.',
      },
      { type: 'h2', text: 'The math of a 40-card stack' },
      {
        type: 'ul',
        items: [
          'No context survives the day. Without a note attached at the moment of the conversation, a business card fifteen hours later tells you a name, a title, and nothing about why that person mattered.',
          'Every card looks the same. The person who wanted a demo next week and the person who was just being polite while waiting for the coffee line to move both end up as identical rectangles in the same pile.',
          'Prioritization becomes guesswork. Facing 40 undifferentiated contacts, most reps either follow up with none of them properly or blast all 40 with the same generic template — the email equivalent of a form letter, and buyers can tell.',
          'The backlog compounds. A stack that is not processed within a day or two just gets a second stack stacked on top of it at the next event, and the "I\'ll get to it" pile never actually gets got to.',
        ],
      },
      {
        type: 'p',
        text: 'None of this is a discipline problem. It is a design problem. Collecting a card is nearly free — a few seconds, a polite exchange, a place to put it. Reconstructing the context of a conversation after the fact is expensive, and it gets more expensive the longer you wait and the more conversations you are trying to reconstruct at once. Volume without capture is not a lead-gen strategy. It is a bet that your memory will outperform forty other conversations happening at the same event, and that bet always loses.',
      },
      { type: 'banner' },
      { type: 'h2', text: 'The three things worth writing down — and nothing else' },
      {
        type: 'p',
        text: 'The reps who actually convert are not the ones running the widest net. They are the ones who capture almost nothing extra. Watch them closely at a conference and the pattern is consistent: what the person said, what they need, and one detail worth remembering. That is the entire capture. Not a transcript, not a form with twelve fields, not a personality assessment — three pieces of signal, recorded in the ten seconds after the handshake ends and before the next conversation starts. Everything else is noise that slows down capture without improving follow-up.',
      },
      {
        type: 'p',
        text: 'This matters because the goal of conference lead capture is not documentation. It is retrieval. You are not writing for an archive — you are writing a note to the version of yourself who will sit down in two days and needs to remember, instantly, why this specific contact deserves a specific message instead of a generic one. "VP Ops, evaluating a replacement for their current tool, wants pricing for a 40-seat team" does more work than a scanned badge and a business card photo ever could, because it tells future-you exactly what to write and why it matters.',
      },
      {
        type: 'quote',
        text: 'A stack of cards with no context is not a lead list. It is a to-do list you will never finish.',
      },
      { type: 'h2', text: 'Speed vs. depth is a false choice' },
      {
        type: 'p',
        text: 'This is usually where the debate splits into two camps. One camp optimizes conference follow-up for speed — reply to everyone within a day, keep the message short, treat momentum as the whole game. The other optimizes for depth — take time to understand each lead properly, write something considered, accept that it will take longer. Framed that way, it looks like a real tradeoff. It is not. The reps who convert best are fast and specific, and the reason they can be both is that they refused to let depth become expensive in the first place.',
      },
      {
        type: 'p',
        text: 'Depth only competes with speed when you capture it the slow way — typing notes into a spreadsheet after the fact, trying to recall a conversation from six hours and a dozen handshakes ago. Capture the "what they need" and "the one detail" in the moment, while it costs you ten seconds instead of ten minutes of reconstruction, and depth stops being the thing that delays your follow-up. It becomes the thing that makes your fast follow-up worth opening. The real failure mode is not choosing speed over depth or depth over speed — it is deferring capture until later, which quietly destroys both.',
      },
      { type: 'h2', text: 'How MemoPear closes the gap between conversation and CRM' },
      {
        type: 'p',
        text: 'We built MemoPear around that exact bet: that the winning move is not choosing between speed and depth, but making depth cheap enough that speed is automatic. Scan a business card or a badge and the AI fills in the contact fields instantly — no typing, no squinting at a name you half-caught over conference-floor noise. Say the context out loud in one sentence while it is still fresh, and the AI structures it — who they are, what they need, the detail worth remembering. That lead lands in your CRM, or as a drafted, personalized follow-up email, before the next session even starts. No pile of cards to process on the flight home. No guessing, three days later, which of the forty people you met actually asked for a demo.',
      },
      {
        type: 'p',
        text: 'The follow-up email that goes out because of this is not a template with a name merged in. It references the actual thing the person said — the tool they are replacing, the timeline they mentioned, the objection they raised. That is the difference between an email that gets a reply and one that gets deleted alongside the nine other "great to meet you" messages sitting in the same inbox that Monday. And because it happens within a day rather than after everything gets "organized" a week later, you are the first message in that inbox, not the tenth.',
      },
      {
        type: 'faq',
        items: [
          {
            q: 'Why does collecting more business cards at a conference lead to worse follow-up?',
            a: 'Because context, not contact information, is what makes a follow-up land — and context decays fast. A rep who collects 40 cards without capturing why each conversation mattered is left with 40 identical-looking contacts and no way to prioritize or personalize outreach. By the time they are back at their desk, most of the detail is gone, so the follow-up either never happens or goes out as one generic message to everyone.',
          },
          {
            q: 'Should conference follow-up be optimized for speed or for depth of the conversation?',
            a: 'Both, and they are not actually in tension if you capture context at the moment of the conversation rather than afterward. Depth becomes expensive only when you try to reconstruct it later from memory — captured in real time, it costs seconds, not minutes, and it is what makes a fast follow-up specific enough to earn a reply instead of getting deleted with every other generic "great to meet you" email.',
          },
          {
            q: 'What should you actually write down when you meet a lead at a conference?',
            a: 'Three things: what the person said, what they need, and one detail worth remembering. That is enough to write a specific, personalized follow-up later — a full transcript or a dozen extra fields just slow down capture without improving the outcome. The test is retrieval, not documentation: will this note tell you, two days from now, exactly why this person deserves a tailored message?',
          },
        ],
      },
      {
        type: 'p',
        text: 'So here is the genuine question worth sitting with, the same one that sparks this debate every time it comes up among sales and founder crowds: when you think about conference follow-up, do you optimize for speed, or for depth of the conversation? Most people pick a camp. The reps who actually convert stopped treating it as a choice — they made depth cheap enough to capture in the moment, which is the only thing that lets speed follow naturally. Which camp are you in, and has it been working?',
      },
    ],
  },
  {
    slug: 'vivatech-2026-paris-lead-capture-guide',
    title: 'VivaTech 2026 Paris: A Lead-Capture Guide for Startups & Scale-ups',
    description:
      'VivaTech 2026 drew 165,000+ attendees to Paris. How startups, scale-ups, and enterprise teams can capture investor, partner, and customer leads at Europe’s biggest tech event.',
    date: '2026-06-30',
    author: 'The MemoPear Team',
    readTime: '6 min read',
    conference: 'VivaTech 2026',
    location: 'Paris, France',
    tags: ['Startups', 'Europe', 'Investors', 'Innovation'],
    excerpt:
      'VivaTech turns Paris into Europe’s startup capital for four days. Here is how to leave with investor meetings and customer pipeline — not a lanyard full of forgotten names.',
    blocks: [
      {
        type: 'p',
        text: 'Viva Technology — VivaTech — has become Europe’s flagship technology conference. Held each June at the Porte de Versailles in Paris, it brings together startups, scale-ups, investors, CAC 40 enterprises, and government leaders. The 2026 edition again drew more than 165,000 attendees from over 160 countries, with thousands of exhibiting startups, a packed investor program, and keynote stages that set the tone for European innovation.',
      },
      {
        type: 'p',
        text: 'For a founder or a commercial team, VivaTech is a uniquely concentrated opportunity. In a single hall you can meet a venture investor, an enterprise buyer running an open-innovation program, and a distribution partner for a new market — often within the same hour. The hard part is not finding people worth meeting. It is making sure none of them evaporate before you can follow up.',
      },
      { type: 'h2', text: 'Why lead capture breaks down at VivaTech' },
      {
        type: 'ul',
        items: [
          'The crowd is enormous and international, so names, companies, and email spellings are easy to lose in a loud, fast conversation.',
          'Roles blur: one badge might be an investor, the next an enterprise innovation lead, the next a journalist — each needing a completely different follow-up.',
          'Startup teams are tiny. Two or three people cannot manually log hundreds of conversations across four days and still demo their product.',
        ],
      },
      {
        type: 'p',
        text: 'The teams that win VivaTech treat capture as a core workflow, not an afterthought. They record the contact and the context together, in the moment, on the phone already in their hand.',
      },
      { type: 'banner' },
      { type: 'h2', text: 'Capturing investors, buyers, and partners in one flow' },
      {
        type: 'p',
        text: 'MemoPear was built for exactly this environment. Scan a badge or snap a business card and the AI fills in the name, title, company, and contact details instantly — no squinting at unfamiliar spellings. Then add a one-line voice note that classifies the lead while it is fresh: “Series A investor, asked about our European traction.” “Enterprise innovation lead, wants a pilot in Q4.” “Partner, covers the DACH region.” Every contact is tagged to VivaTech and synced across your team, so your co-founder sees the same pipeline you do.',
      },
      {
        type: 'quote',
        text: 'At VivaTech, the lead you capture cleanly becomes your next round, your first enterprise pilot, or your entry into a new market. The one you lose simply never happened.',
      },
      { type: 'h2', text: 'The follow-up that actually gets a reply' },
      {
        type: 'p',
        text: 'Investors and enterprise buyers leave VivaTech with hundreds of business cards and a flooded inbox. A generic “great to meet you” gets ignored. Because MemoPear captured the specific context of each conversation, it can draft a personalized follow-up per contact — one that references the actual question that investor asked or the pilot that buyer described. Personalized, specific, and sent within a day: that is how a 30-second hallway exchange in Paris becomes a real meeting back home.',
      },
      {
        type: 'faq',
        items: [
          {
            q: 'What is the best way to capture leads at VivaTech?',
            a: 'Capture the contact and the context together in the moment. Use a mobile tool like MemoPear to scan the badge or business card, then add a short voice note describing who the person is and why they matter before moving on. This beats a booth scanner alone, which records who stopped by but not why they cared.',
          },
          {
            q: 'How can a small startup team cover an event as large as VivaTech?',
            a: 'Lean on fast mobile capture and a shared, synced pipeline. When every team member scans badges and adds voice notes into one place, even a two- or three-person startup can cover far more ground than its headcount suggests and avoid duplicate follow-ups.',
          },
          {
            q: 'How should you follow up with VivaTech leads?',
            a: 'Within 24 to 48 hours, with a personalized message that references the specific conversation. Segment investors, enterprise buyers, and partners so each receives a relevant follow-up rather than one generic email sent to everyone you met.',
          },
        ],
      },
      {
        type: 'p',
        text: 'Paris in June is Europe’s innovation engine running at full speed. Walk into VivaTech with a capture system, and you walk out with relationships — and a pipeline — you can actually act on.',
      },
    ],
  },
  {
    slug: 'saastr-annual-2025-lead-capture-playbook',
    title: 'SaaStr Annual 2025: The Field Sales Lead-Capture Playbook',
    description:
      'How B2B SaaS teams turned 12,500+ SaaStr Annual 2025 attendees into clean pipeline. Booth tactics, badge scanning, and AI follow-up that actually closes.',
    date: '2025-09-09',
    author: 'The MemoPear Team',
    readTime: '6 min read',
    conference: 'SaaStr Annual 2025',
    location: 'San Mateo, California',
    tags: ['SaaS', 'B2B Sales', 'Field Marketing', 'Lead Capture'],
    excerpt:
      'SaaStr Annual packs the densest concentration of SaaS buyers on earth into three days. Here is how to leave with pipeline, not a tote bag of business cards.',
    blocks: [
      {
        type: 'p',
        text: 'SaaStr Annual is the largest community event for B2B SaaS, drawing more than 12,500 founders, revenue leaders, and operators to the San Francisco Bay Area each September. For a field sales or field marketing team, the 2025 edition was a rare gift: thousands of qualified buyers walking the campus, coffee in hand, genuinely open to conversations about the next tool in their stack.',
      },
      {
        type: 'p',
        text: 'It is also a trap. The same density that makes SaaStr valuable makes it brutal for lead capture. Conversations are fast, the WiFi buckles under the crowd, and the badge scanner your booth vendor rented exports a messy CSV days after the show — long after the moment, and the context, have evaporated.',
      },
      { type: 'h2', text: 'Why SaaStr is different from a typical trade show' },
      {
        type: 'ul',
        items: [
          'Buyers, not browsers: a huge share of attendees are VPs of Sales, RevOps leaders, and founders with real budget authority.',
          'Hallway-track heavy: some of the best conversations happen in line for coffee or between sessions — nowhere near your booth scanner.',
          'High intent, short memory: a great five-minute chat is worthless if nobody writes down who said what before the next one starts.',
        ],
      },
      {
        type: 'p',
        text: 'The teams that win SaaStr are not the ones with the biggest booth. They are the ones who capture context in the moment — the name, the company, and the one sentence about why this person cared — and get it into their CRM while it is still warm.',
      },
      SUBSCRIBE_BANNER,
      { type: 'h2', text: 'A four-step lead-capture system for SaaStr' },
      {
        type: 'ul',
        items: [
          'Scan the badge or snap the card in under three seconds. With MemoPear you point your phone at a conference badge QR code or a business card and the contact fields fill themselves — no typing, no app-switching.',
          'Capture the "why" by voice. Right after the conversation, hold the record button and say the one thing that mattered: "Evaluating a new CRM in Q1, frustrated with Salesforce reporting." MemoPear transcribes it and attaches it to the lead.',
          'Tag the conference automatically so every contact from SaaStr is grouped, segmented, and ready for a tailored follow-up sequence.',
          'Sync to Google Sheets or export before you leave the building — not three days later when marketing finally emails you the booth-scanner dump.',
        ],
      },
      {
        type: 'quote',
        text: 'The lead you remember in detail on Tuesday is the deal you close in Q4. The one you scanned but never annotated is a row in a spreadsheet nobody opens.',
      },
      { type: 'h2', text: 'Following up before your competitors do' },
      {
        type: 'p',
        text: 'Speed wins post-conference. The SaaStr inbox effect is real: every attendee gets dozens of "great to meet you" emails the following Monday, almost all of them generic. MemoPear writes a personalized follow-up for each contact using the notes you captured, so your message references the actual conversation instead of a mail-merge field. That is the difference between a reply and a delete.',
      },
      {
        type: 'faq',
        items: [
          {
            q: 'What is the best way to capture leads at SaaStr Annual?',
            a: 'Capture the contact and the context together in the moment. Use a phone-based tool like MemoPear to scan the badge QR code or business card, then add a quick voice note about why the lead matters before moving to the next conversation. This beats relying on a booth badge scanner alone, which loses the context of each conversation.',
          },
          {
            q: 'How many leads should a SaaS team expect from SaaStr?',
            a: 'It varies by booth size and staffing, but well-run teams capture several hundred qualified conversations across the three days. The metric that matters is not raw scans — it is how many leads have enough context attached to drive a personalized follow-up.',
          },
          {
            q: 'When should you follow up with SaaStr leads?',
            a: 'Within 24 to 48 hours, while the conversation is still fresh for both sides. Personalized follow-ups that reference the specific discussion dramatically outperform the generic "nice to meet you" emails every attendee receives.',
          },
        ],
      },
      {
        type: 'p',
        text: 'SaaStr Annual rewards preparation and punishes improvisation. Walk in with a capture system, and you walk out with a pipeline you can actually work.',
      },
    ],
  },
  {
    slug: 'dreamforce-2025-turn-conversations-into-pipeline',
    title: 'Dreamforce 2025: Turning 40,000 Conversations Into Pipeline',
    description:
      'Dreamforce 2025 brought 40,000+ attendees to San Francisco. A practical guide to capturing, organizing, and following up on leads at the biggest software event of the year.',
    date: '2025-09-16',
    author: 'The MemoPear Team',
    readTime: '7 min read',
    conference: 'Dreamforce 2025',
    location: 'San Francisco, California',
    tags: ['Salesforce', 'Enterprise', 'CRM', 'Networking'],
    excerpt:
      'Dreamforce is a city inside a city for three days. Here is how to make sure the people you meet do not disappear into the crowd.',
    blocks: [
      {
        type: 'p',
        text: "Dreamforce is the gravitational center of the enterprise software calendar. Salesforce's annual gathering takes over Moscone Center and most of downtown San Francisco, drawing tens of thousands of admins, architects, executives, and partners. In 2025 the show again topped 40,000 in-person attendees, with a sprawling expo, hundreds of sessions, and a partner ecosystem that turns every hallway into a sales floor.",
      },
      {
        type: 'p',
        text: 'For anyone working the event — whether you run a booth in the partner pavilion or simply have 30 meetings on your calendar — the challenge is scale. You will meet more relevant people in three days than you might in a quarter. Without a system, that abundance becomes a blur by Thursday.',
      },
      { type: 'h2', text: 'The three places leads slip away at Dreamforce' },
      {
        type: 'ul',
        items: [
          'The expo floor, where booth scanners capture a badge but none of the conversation, leaving sales to guess at intent weeks later.',
          'The hallway and party track, where the best introductions happen with a drink in hand and zero chance of getting to a laptop.',
          'The follow-up window, where a thousand vendors email the same attendee on the same Monday and your message gets buried.',
        ],
      },
      {
        type: 'p',
        text: 'Each of these is solvable with the same principle: capture the contact and the context at the speed of conversation, on the device already in your hand.',
      },
      SUBSCRIBE_BANNER,
      { type: 'h2', text: 'Capturing at Dreamforce speed' },
      {
        type: 'p',
        text: 'MemoPear was built on conference floors exactly like this one. Snap a business card or scan a badge and the AI reads every field — name, title, company, email, phone — and fills the form for you. Then record a quick voice memo while the details are fresh: which product they asked about, which competitor they are leaving, what timeline they mentioned. By the time you shake the next hand, the last lead is already saved, tagged to Dreamforce, and syncing to your pipeline.',
      },
      {
        type: 'quote',
        text: 'At a 40,000-person event, the constraint is never how many people you meet. It is how many you can still remember accurately by the time you sit down to follow up.',
      },
      { type: 'h2', text: 'Organizing the haul before you fly home' },
      {
        type: 'p',
        text: 'The worst version of Dreamforce ends with a phone full of half-remembered names and a stack of cards in a hotel drawer. The best version ends with a clean, exportable list — every contact grouped by conference, annotated with context, and ready to push to Google Sheets or your CRM. MemoPear keeps each contact for 30 days across every device you sign in from, so you can review, refine, and export on the flight home instead of weeks later.',
      },
      {
        type: 'faq',
        items: [
          {
            q: 'How do you keep track of so many contacts at Dreamforce?',
            a: 'Use a mobile-first capture tool that records both the contact details and a short note about the conversation immediately after each meeting. Grouping every contact under a "Dreamforce 2025" tag keeps the entire haul organized and ready to segment for follow-up.',
          },
          {
            q: 'Is a booth badge scanner enough for lead capture?',
            a: 'A booth scanner captures who stopped by, but not why they cared. Pairing it with a tool that adds voice notes and AI follow-up gives your sales team the context they need to prioritize and personalize outreach.',
          },
          {
            q: 'What should you do with Dreamforce leads after the event?',
            a: 'Export them quickly, segment by intent and product interest, and send personalized follow-ups within 48 hours. Referencing the specific conversation is what separates your email from the hundreds of generic ones every attendee receives.',
          },
        ],
      },
      {
        type: 'p',
        text: 'Dreamforce is a once-a-year shot at a year of pipeline. Treat lead capture as the core workflow it is, and the city-sized chaos starts working in your favor.',
      },
    ],
  },
  {
    slug: 'web-summit-2025-lisbon-lead-capture-guide',
    title: 'Web Summit 2025 Lisbon: A Lead-Capture Guide for Startups',
    description:
      'Web Summit 2025 gathered 70,000+ attendees in Lisbon. How founders and startup sales teams can capture investor and customer leads without losing the conversation.',
    date: '2025-11-10',
    author: 'The MemoPear Team',
    readTime: '6 min read',
    conference: 'Web Summit 2025',
    location: 'Lisbon, Portugal',
    tags: ['Startups', 'Founders', 'Investors', 'Europe'],
    excerpt:
      'Web Summit throws founders, investors, and press into one enormous arena. For a startup, every badge is a potential customer, hire, or check.',
    blocks: [
      {
        type: 'p',
        text: 'Web Summit has grown into one of the largest technology conferences in the world, filling Lisbon every November with founders, investors, journalists, and operators from well over a hundred countries. The 2025 edition again drew north of 70,000 attendees to the Altice Arena and FIL pavilions, turning the Portuguese capital into a week-long collision of startups and capital.',
      },
      {
        type: 'p',
        text: 'For a startup, Web Summit is a uniquely high-stakes lead environment. The person in line next to you might be your next enterprise customer, your next investor, or a reporter who can put you in front of thousands of readers. The cost of forgetting who they were is enormous.',
      },
      { type: 'h2', text: 'Why startup lead capture breaks down at Web Summit' },
      {
        type: 'ul',
        items: [
          'You are understaffed. Most startups send one to three people to cover a venue built for tens of thousands.',
          'Roles blur. A single conversation might be half sales pitch, half fundraising, half recruiting — and you need to remember which.',
          'Connectivity is unreliable. Packed halls mean spotty signal exactly when you want to log a contact.',
        ],
      },
      {
        type: 'p',
        text: 'A founder cannot afford to lose a single warm introduction to a dead phone battery or an unreadable scribble. Capture has to be instant, reliable, and able to hold nuance — was this a customer lead, an investor lead, or a partner lead?',
      },
      SUBSCRIBE_BANNER,
      { type: 'h2', text: 'Capturing investors and customers in the same flow' },
      {
        type: 'p',
        text: 'MemoPear lets you scan a badge or business card in seconds and immediately attach a voice note classifying the lead. "Seed investor, asked about our retention numbers." "Enterprise buyer, evaluating in Q1." "Press, writes for a fintech newsletter." That one sentence is the difference between a follow-up that lands and a name you cannot place a week later. Every contact is tagged to Web Summit and kept in sync across your devices, so your co-founder sees the same pipeline you do.',
      },
      {
        type: 'quote',
        text: 'At Web Summit, the leads you capture cleanly become your next round, your next ten customers, or your next key hire. The ones you lose simply never happened.',
      },
      { type: 'h2', text: 'The follow-up that gets a reply' },
      {
        type: 'p',
        text: 'Investors and buyers at Web Summit are deluged. A generic "great to meet you" gets ignored. MemoPear drafts a personalized follow-up email per contact using your captured notes, so your message to that seed investor actually references the retention question they asked. Personalized, specific, and sent within a day — that is how a 30-second hallway conversation turns into a real meeting back home.',
      },
      {
        type: 'faq',
        items: [
          {
            q: 'How can a small startup team cover a huge event like Web Summit?',
            a: 'Lean on fast mobile capture and clear tagging. With every team member scanning badges and adding voice notes into a shared, synced pipeline, even a two-person startup can cover far more ground than its headcount suggests.',
          },
          {
            q: 'How do you tell investor leads from customer leads at a conference?',
            a: 'Classify each lead the moment you capture it. A one-line voice note — "seed investor" versus "enterprise buyer" — lets you segment instantly and send the right follow-up to the right person instead of one generic message to everyone.',
          },
          {
            q: 'What is the biggest lead-capture mistake founders make at Web Summit?',
            a: 'Relying on memory and a phone camera roll. Without structured capture, the volume of conversations means the most valuable introductions blur together and the best follow-ups never get sent.',
          },
        ],
      },
      {
        type: 'p',
        text: 'Lisbon in November is a startup pressure cooker. Walk in with a capture system and you leave with relationships you can actually act on.',
      },
    ],
  },
  {
    slug: 'aws-reinvent-2025-lead-capture-in-the-vegas-chaos',
    title: 'AWS re:Invent 2025: Capturing Every Lead in the Vegas Chaos',
    description:
      'AWS re:Invent 2025 spread 60,000+ cloud builders across the Las Vegas Strip. A field guide to capturing technical leads and partners without losing the thread.',
    date: '2025-12-01',
    author: 'The MemoPear Team',
    readTime: '7 min read',
    conference: 'AWS re:Invent 2025',
    location: 'Las Vegas, Nevada',
    tags: ['Cloud', 'AWS', 'Developers', 'Partners'],
    excerpt:
      're:Invent is spread across half a dozen Vegas casinos and 60,000 builders. Capturing leads across that sprawl takes a system, not a stack of cards.',
    blocks: [
      {
        type: 'p',
        text: "AWS re:Invent is the cloud industry's defining week. Each December, Amazon Web Services takes over a half-dozen Las Vegas resorts — the Venetian, Caesars Forum, MGM Grand, and more — to host tens of thousands of engineers, architects, and decision-makers. The 2025 edition again pushed past 60,000 in-person attendees, with a partner expo, hands-on labs, and keynotes that set the agenda for cloud computing for the year ahead.",
      },
      {
        type: 'p',
        text: 'The defining feature of re:Invent is sprawl. Sessions and expo halls are spread across miles of the Strip, and you can easily walk 25,000 steps a day shuttling between venues. For anyone doing business development, that geography is the enemy of lead capture. The conversation that happens at a Venetian happy hour has to survive the walk to the next session at Caesars.',
      },
      { type: 'h2', text: 'Capturing technical leads is its own challenge' },
      {
        type: 'ul',
        items: [
          'The buyer is technical. A re:Invent lead often wants to talk architecture, not pricing — so your notes need to capture the technical context, not just contact details.',
          'The decision is multi-threaded. You might meet an engineer, then their manager, then the procurement lead — all separate badges that belong to one account.',
          'The signal is in the details. "Running EKS, hitting cost issues at scale" is the kind of note that makes a follow-up land. A badge scan alone never captures it.',
        ],
      },
      SUBSCRIBE_BANNER,
      { type: 'h2', text: 'A capture system built for the Strip' },
      {
        type: 'p',
        text: 'MemoPear turns your phone into the only tool you need to walk re:Invent. Scan a badge or snap a business card and the AI fills in name, title, company, and contact details instantly. Then record the technical context by voice while it is fresh: the workload they are running, the bottleneck they described, the timeline they mentioned. Every contact is tagged to re:Invent and synced across your devices, so the lead you captured at the Venetian is already in your pipeline by the time you reach Caesars.',
      },
      {
        type: 'quote',
        text: 'At re:Invent, the deal is in the technical detail. "Migrating off-prem in Q2, worried about data egress" is worth more than fifty anonymous badge scans.',
      },
      { type: 'h2', text: 'Connecting the threads after the show' },
      {
        type: 'p',
        text: 'Because re:Invent deals are multi-threaded, organization is everything. With every contact grouped by conference and annotated with context, you can reconstruct the full account map when you get home: the engineer who loved the demo, the manager who controls the budget, the procurement lead who needs the paperwork. MemoPear then drafts personalized follow-ups per contact, so each person hears about exactly what they cared about — and your sales motion picks up right where the hallway conversation left off.',
      },
      {
        type: 'faq',
        items: [
          {
            q: 'How do you capture leads across the spread-out re:Invent venues?',
            a: 'Use a mobile capture tool so you are never tied to a booth or a laptop. Scan badges and add voice notes on the spot, wherever the conversation happens, and let everything sync to one pipeline across the different casinos and halls.',
          },
          {
            q: 'What should you note when capturing a technical lead at re:Invent?',
            a: 'Capture the technical context: the workloads they run, the problems they described, and their timeline. That detail is what makes a follow-up resonate with an engineering buyer, far more than contact info alone.',
          },
          {
            q: 'How do you handle multiple contacts from the same company?',
            a: 'Tag and annotate each contact with their role and the conversation you had. Grouping them under the conference and the account lets you rebuild the full buying committee when you follow up after the event.',
          },
        ],
      },
      {
        type: 'p',
        text: 'Vegas in December is chaos by design. A capture system that lives in your pocket is how you walk out of re:Invent with an account map instead of aching feet and a blur of badges.',
      },
    ],
  },
  {
    slug: 'ces-2026-lead-capture-playbook',
    title: 'CES 2026 Lead-Capture Playbook: From Vegas Foot Traffic to Pipeline',
    description:
      'CES 2026 drew over 140,000 attendees to Las Vegas. How hardware, IoT, and tech brands can capture the right leads from the busiest show floor in tech.',
    date: '2026-01-09',
    author: 'The MemoPear Team',
    readTime: '7 min read',
    conference: 'CES 2026',
    location: 'Las Vegas, Nevada',
    tags: ['Hardware', 'IoT', 'Consumer Tech', 'Trade Show'],
    excerpt:
      'CES is the largest, loudest show floor in tech. The challenge is not meeting people — it is capturing the right ones before they vanish into the crowd.',
    blocks: [
      {
        type: 'p',
        text: 'CES is the opening act of the technology year. Each January, the Consumer Electronics Show fills the Las Vegas Convention Center and surrounding venues with the entire hardware and consumer-tech ecosystem — manufacturers, retailers, automakers, chipmakers, distributors, and press. CES 2026 again drew well over 140,000 attendees and tens of thousands of exhibitors across millions of square feet of show floor.',
      },
      {
        type: 'p',
        text: 'That scale is a double-edged sword. The opportunity is staggering, but so is the noise. A booth at CES can see thousands of badge scans in a day, the overwhelming majority of which are tire-kickers, students, and competitors. The job is not to capture everyone — it is to capture the right ones and remember why they mattered.',
      },
      { type: 'h2', text: 'The CES lead-quality problem' },
      {
        type: 'ul',
        items: [
          'Volume drowns signal. A raw badge dump of 3,000 scans tells you nothing about which 50 are real buyers.',
          'Conversations are loud and short. The show floor is deafening, and you have seconds before the next person steps up.',
          'Roles are everything. A distributor lead, a retail buyer, and a journalist all need completely different follow-ups.',
        ],
      },
      {
        type: 'p',
        text: 'The brands that win CES are ruthless about capturing context, not just contacts. They tag the buyer versus the browser in the moment, so their post-show pipeline is a short list of real opportunities instead of a giant, useless spreadsheet.',
      },
      SUBSCRIBE_BANNER,
      { type: 'h2', text: 'Qualifying as you capture' },
      {
        type: 'p',
        text: 'MemoPear lets your booth staff capture and qualify in a single motion. Scan the badge or snap the card, then add a one-line voice note that doubles as qualification: "Retail buyer, 200 stores, wants a Q2 order." "Distributor, EU coverage, send wholesale pricing." "Press, covers smart home." Because the note is captured by voice in seconds, even your busiest staffer can do it between handshakes. Every lead is tagged to CES and syncs across the whole booth team in real time.',
      },
      {
        type: 'quote',
        text: 'At CES, a thousand badge scans is a vanity metric. Fifty qualified, annotated leads is a pipeline.',
      },
      { type: 'h2', text: 'Turning the show floor into a working list' },
      {
        type: 'p',
        text: 'The morning after CES ends, you do not want a CSV of anonymous scans — you want a ranked list of real opportunities you can hand straight to sales. Because MemoPear captures the qualifier with each contact, you can sort the entire haul by intent the moment the doors close, export to Google Sheets, and send personalized follow-ups that reference the actual conversation. The retail buyer hears about your order minimums; the journalist gets your press kit. Same show, completely different messages.',
      },
      {
        type: 'faq',
        items: [
          {
            q: 'How do you get quality leads out of a huge show like CES?',
            a: 'Qualify in the moment instead of after. Capture each contact with a quick voice note describing their role and intent, so your post-show list is already segmented into real buyers, partners, and press rather than an undifferentiated pile of badge scans.',
          },
          {
            q: 'How many leads can a CES booth realistically follow up on?',
            a: 'Far fewer than it scans. The teams that convert focus on the qualified subset — the buyers and partners with real intent — and send each of them a personalized, role-specific follow-up rather than blasting the entire scan list.',
          },
          {
            q: 'What is the fastest way to capture a lead on a loud CES show floor?',
            a: 'Scan the badge or business card with your phone and add a short spoken note. Voice capture is faster than typing and works even when the floor is too loud for a real conversation, so your staff can keep the line moving.',
          },
        ],
      },
      {
        type: 'p',
        text: 'CES sets the tone for your whole year. Capture the right leads with the context that makes them actionable, and you leave Las Vegas with January pipeline instead of a spreadsheet hangover.',
      },
    ],
  },
  {
    slug: 'mwc-2026-barcelona-lead-capture-guide',
    title: 'MWC 2026 Barcelona: Capturing Global Telecom & Mobile Leads',
    description:
      'Mobile World Congress 2026 brought 100,000+ attendees to Barcelona. How telecom, mobile, and connectivity vendors can capture international leads that convert.',
    date: '2026-03-02',
    author: 'The MemoPear Team',
    readTime: '6 min read',
    conference: 'MWC Barcelona 2026',
    location: 'Barcelona, Spain',
    tags: ['Telecom', 'Mobile', '5G', 'International'],
    excerpt:
      'MWC is the global summit for mobile and connectivity, with buyers from every continent. Capturing leads across languages and time zones takes a tighter system.',
    blocks: [
      {
        type: 'p',
        text: 'Mobile World Congress is the largest and most influential gathering in the mobile and connectivity industry. Held each spring in Barcelona, MWC brings together operators, device makers, infrastructure vendors, and enterprise buyers from around the globe. The 2026 edition again topped 100,000 attendees across the Fira Gran Via, spanning everything from 5G and satellite connectivity to enterprise AI and the device ecosystem.',
      },
      {
        type: 'p',
        text: 'What sets MWC apart is its international density. The buyer you meet might be a network operator from Southeast Asia, a systems integrator from the Gulf, or an enterprise CTO from Latin America. That global mix is the opportunity — and it is exactly what makes lead capture harder than at a domestic show.',
      },
      { type: 'h2', text: 'The international lead-capture challenge' },
      {
        type: 'ul',
        items: [
          'Names and companies are unfamiliar. Spelling a contact correctly from a noisy hallway conversation is genuinely hard — and a misspelled email never reaches its target.',
          'Context spans time zones. Follow-up timing and relevance differ by region, so you need to remember where each lead is based.',
          'Business cards still rule. At a global telecom event, the exchanged business card remains the dominant ritual — and a stack of them is impossible to act on later.',
        ],
      },
      {
        type: 'p',
        text: 'Accuracy is the whole game at MWC. A capture method that mangles an international name or company is worse than useless, because it produces follow-ups that never land.',
      },
      SUBSCRIBE_BANNER,
      { type: 'h2', text: 'Reading the card, not retyping it' },
      {
        type: 'p',
        text: 'MemoPear is built for exactly this. Photograph a business card and the AI reads every field — name, title, company, email, phone, website — and fills the form, so you are not squinting at unfamiliar spellings in a loud hall. Add a voice note for the regional context: "Operator, Southeast Asia, evaluating private 5G for ports." Every contact is tagged to MWC and synced, so your whole team shares one accurate, organized pipeline by the end of each day.',
      },
      {
        type: 'quote',
        text: 'At a global show, an accurately captured contact is the only kind worth having. A misspelled email is a lead that quietly disappears.',
      },
      { type: 'h2', text: 'Following up across the globe' },
      {
        type: 'p',
        text: 'After MWC, your leads are scattered across continents and time zones. Because each contact is annotated with its region and context, you can prioritize follow-ups intelligently and send personalized messages that reflect the specific conversation. MemoPear drafts those follow-ups per contact, so the operator in Asia and the integrator in the Gulf each get a relevant note — not the same generic template. That precision is what turns a Barcelona handshake into a real international deal.',
      },
      {
        type: 'faq',
        items: [
          {
            q: 'How do you accurately capture international leads at MWC?',
            a: 'Use AI business-card scanning rather than manual typing. Photographing the card captures unfamiliar names, companies, and email addresses accurately, which is essential when a misspelled contact detail means your follow-up never arrives.',
          },
          {
            q: 'Why are business cards still important at Mobile World Congress?',
            a: 'MWC is a global event where the business-card exchange remains a core professional ritual across many cultures. The winning approach is to honor that ritual but digitize each card instantly so the contact becomes actionable data instead of a stack in your bag.',
          },
          {
            q: 'How should you prioritize follow-ups from a global conference?',
            a: 'Annotate each lead with its region and context at capture time, then prioritize by intent and time zone afterward. Personalized, region-aware follow-ups sent promptly outperform a single generic blast to every contact.',
          },
        ],
      },
      {
        type: 'p',
        text: 'Barcelona in spring is the world\'s mobile industry under one roof. Capture every lead accurately, annotate it with context, and the whole globe becomes your follow-up list.',
      },
    ],
  },
];

export const getPostBySlug = (slug: string): BlogPost | undefined =>
  BLOG_POSTS.find((p) => p.slug === slug);

const sortedPosts = (): BlogPost[] =>
  [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

const formatDate = (iso: string): string =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

// ---------------------------------------------------------------------------
// Table-of-contents + hero helpers
// ---------------------------------------------------------------------------

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export interface TocItem {
  id: string;
  label: string;
}

// The table of contents is built from every h2 heading plus the FAQ section.
// Each id must match the id rendered on the corresponding heading (see Block).
export function getSections(post: BlogPost): TocItem[] {
  const items: TocItem[] = [];
  post.blocks.forEach((b) => {
    if (b.type === 'h2') items.push({ id: slugify(b.text), label: b.text });
    else if (b.type === 'faq') items.push({ id: 'faq', label: 'FAQ' });
  });
  return items;
}

// Deterministic 32-bit hash of a string (for stable per-post hero styling).
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Small seeded PRNG so a post's generated hero art is stable across renders.
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gradient palettes for the generated hero — picked deterministically per post
// so each article has its own look but the set stays on-brand.
const HERO_PALETTES: { from: string; to: string; accent: string }[] = [
  { from: '#155e63', to: '#08312f', accent: '#5eead4' }, // teal (brand)
  { from: '#0c4a6e', to: '#082033', accent: '#7dd3fc' }, // sky
  { from: '#3730a3', to: '#1e1b4b', accent: '#a5b4fc' }, // indigo
  { from: '#6d28d9', to: '#2e1065', accent: '#d8b4fe' }, // violet
  { from: '#9d174d', to: '#4a0e2a', accent: '#fda4af' }, // rose
  { from: '#b45309', to: '#4a2408', accent: '#fcd34d' }, // amber
  { from: '#065f46', to: '#052e26', accent: '#6ee7b7' }, // emerald
];

// A generated, on-brand hero banner. Renders the post's own image when
// heroImageUrl is set; otherwise draws a themed gradient with a "network of
// connections" motif (nodes + links) — a nod to capturing contacts at an event.
export const BlogHero: React.FC<{ post: BlogPost; variant?: 'full' | 'card' }> = ({ post, variant = 'full' }) => {
  const card = variant === 'card';
  const { nodes, links, palette } = useMemo(() => {
    const seed = hashString(post.slug);
    const rnd = mulberry32(seed);
    const palette = HERO_PALETTES[seed % HERO_PALETTES.length];
    const count = 16;
    const nodes = Array.from({ length: count }, () => ({
      x: Math.round(rnd() * 100),
      y: Math.round(rnd() * 100),
      r: 0.6 + rnd() * 1.8,
    }));
    // Link each node to its nearest couple of neighbours for a constellation look.
    const links: { x1: number; y1: number; x2: number; y2: number }[] = [];
    nodes.forEach((n, i) => {
      const nearest = nodes
        .map((m, j) => ({ j, d: (m.x - n.x) ** 2 + (m.y - n.y) ** 2 }))
        .filter((o) => o.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      nearest.forEach((o) => {
        if (o.j > i) links.push({ x1: n.x, y1: n.y, x2: nodes[o.j].x, y2: nodes[o.j].y });
      });
    });
    return { nodes, links, palette };
  }, [post.slug]);

  return (
    <div className={card ? 'relative w-full h-32 overflow-hidden' : 'relative w-full h-52 md:h-72 rounded-[2rem] overflow-hidden mb-8 shadow-xl'}>
      {post.heroImageUrl ? (
        <img src={post.heroImageUrl} alt={`${post.conference} — ${post.location}`} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)` }}
          />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            {links.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#ffffff" strokeWidth={0.15} strokeOpacity={0.25} />
            ))}
            {nodes.map((n, i) => (
              <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={i % 4 === 0 ? palette.accent : '#ffffff'} fillOpacity={i % 4 === 0 ? 0.9 : 0.4} />
            ))}
          </svg>
        </>
      )}
      {/* Legibility gradient + overlaid conference / location */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      {card ? (
        <div className="absolute left-4 right-4 bottom-3">
          <p className="text-white font-black tracking-tight text-sm drop-shadow flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {post.location}
          </p>
        </div>
      ) : (
        <div className="absolute left-6 right-6 bottom-6 md:left-8 md:right-8 md:bottom-8">
          <span className="inline-block text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] text-white/90 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full">
            {post.conference}
          </span>
          <p className="mt-3 text-white font-black tracking-tight text-lg md:text-2xl drop-shadow flex items-center gap-2">
            <svg className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {post.location}
          </p>
        </div>
      )}
    </div>
  );
};

// Table of contents with scroll-spy highlighting of the active section.
export const TableOfContents: React.FC<{
  items: TocItem[];
  activeId: string;
  onJump: (id: string) => void;
}> = ({ items, activeId, onJump }) => (
  <nav className="border-l border-slate-200 dark:border-white/10" aria-label="Table of contents">
    {items.map((s) => {
      const active = activeId === s.id;
      return (
        <button
          key={s.id}
          onClick={() => onJump(s.id)}
          aria-current={active ? 'true' : undefined}
          className={`block w-full text-left pl-4 -ml-px border-l-2 py-1.5 text-[11px] font-bold leading-snug transition-colors ${
            active
              ? 'border-pear-500 text-pear-600 dark:text-pear-400'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {s.label}
        </button>
      );
    })}
  </nav>
);

// ---------------------------------------------------------------------------
// Subscribe banner — the CTA woven through every post. Drives readers to the
// pricing page to start with MemoPear. The pricing-navigation callback is
// provided via context so banners nested deep inside post content (rendered by
// <Block>) can reach it without prop drilling.
// ---------------------------------------------------------------------------

export const BlogCtaContext = React.createContext<() => void>(() => {});

export const SubscribeBanner: React.FC = () => {
  const onGetStarted = React.useContext(BlogCtaContext);

  return (
    <aside
      className="not-prose my-10 md:p-10 p-7 rounded-[2rem] bg-pear-600 text-white shadow-2xl border border-pear-500/40 overflow-hidden relative"
      aria-label="Get started with MemoPear"
    >
      <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="relative">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-pear-100 mb-3">
          MemoPear
        </p>
        <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
          Never lose a conference lead again.
        </h3>
        <p className="text-sm font-medium text-pear-50/90 max-w-xl mb-6">
          Scan badges, snap business cards, and capture notes in the moment — then follow up with AI.
          See how affordable it is to turn your next event into pipeline.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-pear-700 font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-lg hover:scale-[1.03] active:scale-95 transition-transform whitespace-nowrap"
          >
            Get Started
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="text-[11px] font-bold uppercase tracking-widest text-pear-100/80">
            See plans &amp; pricing
          </span>
        </div>
      </div>
    </aside>
  );
};

// ---------------------------------------------------------------------------
// Block renderer
// ---------------------------------------------------------------------------

const Block: React.FC<{ block: BlogBlock; id?: string }> = ({ block, id }) => {
  switch (block.type) {
    case 'p':
      return <p>{block.text}</p>;
    case 'h2':
      return (
        <h2 id={id} className="scroll-mt-24 text-2xl font-black text-slate-900 dark:text-white mt-12 mb-4 tracking-tight">
          {block.text}
        </h2>
      );
    case 'ul':
      return (
        <ul className="list-disc pl-6 space-y-3 marker:text-pear-500">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'quote':
      return (
        <blockquote className="not-prose my-10 border-l-4 border-pear-500 pl-6 py-2 text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white italic">
          {block.text}
        </blockquote>
      );
    case 'banner':
      return <SubscribeBanner />;
    case 'faq':
      return (
        <section id={id} className="not-prose scroll-mt-24 mt-12">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {block.items.map((item, i) => (
              <div
                key={i}
                className="p-6 bg-slate-100 dark:bg-white/5 rounded-[1.5rem] border border-slate-200 dark:border-white/10"
              >
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">{item.q}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      );
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// Blog index — lists every post, newest first.
// ---------------------------------------------------------------------------

export const BlogIndex: React.FC<{
  onBack: () => void;
  onOpenPost: (slug: string) => void;
  onGetStarted: () => void;
}> = ({ onBack, onOpenPost, onGetStarted }) => {
  const posts = sortedPosts();
  return (
    <BlogCtaContext.Provider value={onGetStarted}>
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500 pb-32">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 hover:text-pear-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
        </svg>
        Go Back
      </button>

      <p className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">The MemoPear Blog</p>
      <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-pear-600 dark:text-pear-400">
        Field notes from the conference floor.
      </h1>
      <p className="text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl mb-12">
        Tactical guides to capturing, organizing, and following up on leads at the biggest events in
        high tech — from CES and re:Invent to Web Summit, Dreamforce, MWC, and SaaStr.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((post) => (
          <article
            key={post.slug}
            onClick={() => onOpenPost(post.slug)}
            className="group cursor-pointer glass rounded-[2rem] border border-slate-200 dark:border-white/10 hover:border-pear-500/50 transition-all shadow-lg flex flex-col overflow-hidden"
          >
            <BlogHero post={post} variant="card" />
            <div className="p-7 flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-pear-600/10 text-pear-600 dark:text-pear-400">
                {post.conference}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {formatDate(post.date)}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight mb-3 group-hover:text-pear-600 transition-colors">
              {post.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed flex-1">
              {post.excerpt}
            </p>
            <div className="flex items-center justify-between mt-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {post.readTime}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-pear-600 dark:text-pear-400 flex items-center gap-1">
                Read
                <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-12">
        <SubscribeBanner />
      </div>
    </div>
    </BlogCtaContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Single blog post
// ---------------------------------------------------------------------------

export const BlogPostView: React.FC<{
  post: BlogPost;
  onBack: () => void;
  onOpenPost: (slug: string) => void;
  onGetStarted: () => void;
}> = ({ post, onBack, onOpenPost, onGetStarted }) => {
  const related = sortedPosts()
    .filter((p) => p.slug !== post.slug)
    .slice(0, 2);

  const sections = useMemo(() => getSections(post), [post.slug]);
  const [activeId, setActiveId] = useState<string>('');

  // Scroll-spy: highlight the section currently in view. The rootMargin biases
  // the "active" band to just below the fixed nav so the highlight tracks the
  // heading the reader is actually looking at.
  useEffect(() => {
    setActiveId(sections[0]?.id || '');
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId((visible[0].target as HTMLElement).id);
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [post.slug, sections]);

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  };

  // Per-block id: h2 headings and the FAQ section are the scroll anchors.
  const blockId = (block: BlogBlock): string | undefined => {
    if (block.type === 'h2') return slugify(block.text);
    if (block.type === 'faq') return 'faq';
    return undefined;
  };

  return (
    <BlogCtaContext.Provider value={onGetStarted}>
    <div className="px-6 md:px-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-32 pt-2">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 hover:text-pear-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
        </svg>
        All Articles
      </button>

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
        {/* Sticky table of contents (desktop) */}
        {sections.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 pl-4">On this page</p>
              <TableOfContents items={sections} activeId={activeId} onJump={jumpTo} />
            </div>
          </aside>
        )}

        <article className="min-w-0">
          <BlogHero post={post} />

          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-pear-600/10 text-pear-600 dark:text-pear-400">
              {post.conference}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              {post.location}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black mb-5 tracking-tighter text-slate-900 dark:text-white leading-[1.05]">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 flex-wrap">
            <span>{post.author}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>{post.readTime}</span>
          </div>

          {/* Collapsible table of contents (mobile / tablet) */}
          {sections.length > 0 && (
            <details className="lg:hidden mb-10 glass rounded-2xl border border-slate-200 dark:border-white/10 p-4">
              <summary className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 cursor-pointer select-none">
                On this page
              </summary>
              <div className="mt-3">
                <TableOfContents items={sections} activeId={activeId} onJump={jumpTo} />
              </div>
            </details>
          )}

          <div className="space-y-6 text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {post.blocks.map((block, i) => (
              <Block key={i} block={block} id={blockId(block)} />
            ))}
          </div>

          <SubscribeBanner />

          {related.length > 0 && (
            <section className="mt-16 pt-10 border-t border-slate-200 dark:border-white/10">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
                Keep reading
              </h2>
              <div className="grid gap-5 md:grid-cols-2">
                {related.map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => onOpenPost(p.slug)}
                    className="group text-left glass p-6 rounded-[1.5rem] border border-slate-200 dark:border-white/10 hover:border-pear-500/50 transition-all"
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-pear-600 dark:text-pear-400">
                      {p.conference}
                    </span>
                    <h3 className="text-base font-black tracking-tight mt-2 group-hover:text-pear-600 transition-colors">
                      {p.title}
                    </h3>
                  </button>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </div>
    </BlogCtaContext.Provider>
  );
};
