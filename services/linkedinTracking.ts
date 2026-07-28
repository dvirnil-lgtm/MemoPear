// LinkedIn Insight Tag + conversion tracking.
//
// `window.lintrk('track', { conversion_id })` only works once the LinkedIn
// Insight Tag base code has loaded and defined `window.lintrk`. This module
// owns both halves of that:
//   1. `initLinkedInInsight()` injects the official Insight Tag base snippet
//      once, driven by the `VITE_LINKEDIN_PARTNER_ID` env var. Without a
//      partner id it no-ops, so the app is unaffected in dev / previews.
//   2. `trackLinkedInConversion(id)` fires a conversion. It's safe to call
//      even before the tag has finished loading — the base snippet queues
//      calls on `window.lintrk.q` and replays them once ready — and it never
//      throws if the tag is absent entirely.
//
// Conversion ids come from LinkedIn Campaign Manager (Analyze → Conversion
// tracking). They're not secret; they identify a conversion rule, not a user.

// The two conversions this app reports.
export const LINKEDIN_CONVERSIONS = {
  // Fired when a brand-new account finishes registering.
  registration: 29551625,
  // Fired the first time an account completes payment.
  firstPayment: 29551633,
} as const;

// LinkedIn Insight Tag partner id (from Campaign Manager). Public, not secret.
// Overridable via env for other environments; falls back to the production id.
const LINKEDIN_PARTNER_ID = (import.meta.env.VITE_LINKEDIN_PARTNER_ID as string | undefined) || '10575465';

declare global {
  interface Window {
    lintrk?: ((action: 'track', data: { conversion_id: number }) => void) & { q?: unknown[] };
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
  }
}

let initialized = false;

/**
 * Injects the LinkedIn Insight Tag base code exactly once. Safe to call
 * repeatedly (e.g. under React StrictMode double-invoke). No-ops when no
 * partner id is configured, or when a tag is already present on the page
 * (e.g. loaded via Google Tag Manager).
 */
export function initLinkedInInsight(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // A tag loaded elsewhere (GTM, etc.) already defines lintrk — don't add a
  // second copy, just reuse it for the track() calls below.
  if (typeof window.lintrk === 'function') return;

  const partnerId = LINKEDIN_PARTNER_ID;
  if (!partnerId) return;

  window._linkedin_partner_id = partnerId;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(partnerId);

  // Define the queueing shim so track() calls made before the async script
  // loads aren't lost.
  if (typeof window.lintrk !== 'function') {
    const lintrk = function (a: 'track', b: { conversion_id: number }) {
      (lintrk as any).q.push([a, b]);
    } as Window['lintrk'] & { q: unknown[] };
    lintrk.q = [];
    window.lintrk = lintrk;
  }

  const first = document.getElementsByTagName('script')[0];
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  first?.parentNode?.insertBefore(script, first);
}

/**
 * Fires a LinkedIn conversion. Guarded so a missing tag (no partner id, or a
 * blocked script) never breaks the calling flow.
 */
export function trackLinkedInConversion(conversionId: number): void {
  try {
    if (typeof window !== 'undefined' && typeof window.lintrk === 'function') {
      window.lintrk('track', { conversion_id: conversionId });
    }
  } catch {
    /* analytics must never interrupt the app */
  }
}
