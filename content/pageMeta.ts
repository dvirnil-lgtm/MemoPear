// ---------------------------------------------------------------------------
// Public route + <title>/description registry.
//
// Single source of truth for both the client-side meta tags App.tsx sets at
// runtime (for real browsers) and the build-time prerender script (for
// crawlers that don't execute JavaScript, including most LLM crawlers).
// Keep this in sync with App.tsx's AppView union.
// ---------------------------------------------------------------------------

export const VIEW_URLS: Record<string, string> = {
  home: '/', login: '/login', pricing: '/pricing', form: '/gather',
  history: '/pipeline', payment: '/payment', profile: '/profile',
  privacy: '/privacy', terms: '/terms', contact: '/contact', team: '/team', company: '/company',
  blog: '/blog', integrations: '/integrations',
};

export interface PageMeta {
  title: string;
  description: string;
}

export const PAGE_META: Record<string, PageMeta> = {
  home: { title: 'MemoPear: Simply Better Lead Collection', description: 'Stop losing contacts at conferences. MemoPear lets you scan badges, snap business cards, and record notes — all in one place.' },
  login: { title: 'Sign In | MemoPear', description: 'Log in or create your MemoPear account to start capturing conference contacts.' },
  pricing: { title: 'Pricing | MemoPear', description: 'One simple plan. Scan badges, snap business cards, sync to Google Sheets, and more for just $2.80/month.' },
  form: { title: 'Add a Contact | MemoPear', description: 'Quickly add a new contact from a conference — scan a badge, snap a card, or just type their info.' },
  history: { title: 'Your Contacts | MemoPear', description: 'Browse and manage all the contacts you\'ve gathered at events and conferences.' },
  payment: { title: 'Upgrade | MemoPear', description: 'Unlock AI scanning, business card OCR, LinkedIn lookup, and Google Sheets sync.' },
  profile: { title: 'Profile | MemoPear', description: 'Manage your MemoPear profile, conferences, and billing settings.' },
  privacy: { title: 'Privacy Policy | MemoPear', description: 'How MemoPear handles your data and protects your privacy.' },
  terms: { title: 'Terms & Conditions | MemoPear', description: 'MemoPear terms of service and subscription details.' },
  contact: { title: 'Contact Us | MemoPear', description: 'Get in touch with the MemoPear team.' },
  team: { title: 'Team | MemoPear', description: 'Invite your team members and manage your seats.' },
  company: { title: 'Our Story | MemoPear', description: 'Born on the conference floor — how years of working trade shows built MemoPear, and our mission to help field marketers, field sales, and attendees gather leads and follow up with ease.' },
  integrations: { title: 'Integrations | MemoPear', description: 'Push your captured leads to email, Google Sheets, and HubSpot CRM — with Salesforce, monday.com, Zoho, and more on the way.' },
  blog: { title: 'Blog: Conference Lead-Capture Playbooks | MemoPear', description: 'Tactical guides to capturing, organizing, and following up on leads at the biggest high-tech conferences — CES, AWS re:Invent, Web Summit, Dreamforce, MWC, and SaaStr.' },
};

/**
 * Views that are public and meant to be indexed — the marketing site, not
 * the authenticated app (login, gather, pipeline, payment, profile, team).
 * Drives both public/sitemap.xml coverage checks and the prerender script.
 */
export const PUBLIC_VIEWS = [
  'home', 'pricing', 'integrations', 'blog', 'company', 'contact', 'privacy', 'terms',
] as const;
