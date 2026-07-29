// Cookie / tracking consent management + Google Consent Mode v2.
//
// The site ships one non-essential tracker today — the LinkedIn Insight Tag
// (see `linkedinTracking.ts`) — and is wired for Google tags via Consent Mode.
// Nothing non-essential should run until the visitor has made a choice, and
// that choice must be revisitable. This module is the single source of truth:
//
//   1. `initConsentMode()` seeds Google Consent Mode v2 defaults (everything
//      denied) as early as possible, then replays any previously stored
//      decision so trackers load on repeat visits without re-prompting.
//   2. `getConsent()` / `setConsent()` read and persist the visitor's choice.
//   3. Subscribers (`onConsentChange`) react when the choice changes — the
//      LinkedIn tag hooks in here so it only loads once marketing is granted.
//
// Categories:
//   - necessary : always on (auth, session, security). Not user-toggleable.
//   - analytics : usage measurement (Google Analytics, etc.).
//   - marketing : advertising / conversion tracking (LinkedIn Insight Tag).

export type ConsentCategory = 'analytics' | 'marketing';

export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

export interface StoredConsent extends ConsentState {
  // Schema/decision version — bump to re-prompt everyone after a policy change.
  version: number;
  // When the decision was made, for audit / expiry purposes.
  timestamp: number;
}

// Bump when the set of trackers or the policy materially changes so returning
// visitors are asked again.
const CONSENT_VERSION = 1;
const STORAGE_KEY = 'mp_consent_v1';

const DENIED: ConsentState = { analytics: false, marketing: false };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type Listener = (state: ConsentState) => void;
const listeners = new Set<Listener>();

/** Reads the stored decision, or `null` if the visitor hasn't chosen yet. */
export function getStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    // Ignore decisions made against an older policy version.
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** True once the visitor has accepted, rejected, or customised. */
export function hasDecided(): boolean {
  return getStoredConsent() !== null;
}

/** Current consent, defaulting to all-denied before a decision is made. */
export function getConsent(): ConsentState {
  const stored = getStoredConsent();
  return stored ? { analytics: stored.analytics, marketing: stored.marketing } : { ...DENIED };
}

function ensureGtag(): (...args: unknown[]) => void {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    // Standard gtag shim — queues onto dataLayer until (and if) a Google tag
    // library loads. Safe to define even when no Google tag is present.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  return window.gtag;
}

/** Pushes the current consent to Google Consent Mode. */
function updateGoogleConsent(state: ConsentState): void {
  const grant = (v: boolean) => (v ? 'granted' : 'denied');
  ensureGtag()('consent', 'update', {
    analytics_storage: grant(state.analytics),
    ad_storage: grant(state.marketing),
    ad_user_data: grant(state.marketing),
    ad_personalization: grant(state.marketing),
  });
}

/**
 * Persists a decision and notifies subscribers + Google Consent Mode.
 * Pass a partial to update individual categories.
 */
export function setConsent(next: Partial<ConsentState>): ConsentState {
  const current = getConsent();
  const state: ConsentState = {
    analytics: next.analytics ?? current.analytics,
    marketing: next.marketing ?? current.marketing,
  };

  const record: StoredConsent = {
    ...state,
    version: CONSENT_VERSION,
    timestamp: Date.now(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      /* storage may be unavailable (private mode) — consent still applies for the session */
    }
    updateGoogleConsent(state);
  }

  listeners.forEach(l => {
    try { l(state); } catch { /* a bad listener must not break the rest */ }
  });

  return state;
}

/** Convenience: grant every category. */
export function acceptAll(): ConsentState {
  return setConsent({ analytics: true, marketing: true });
}

/** Convenience: deny every non-essential category. */
export function rejectAll(): ConsentState {
  return setConsent({ analytics: false, marketing: false });
}

/**
 * Subscribe to consent changes. Fires immediately with the current state, and
 * again on every `setConsent`. Returns an unsubscribe function.
 */
export function onConsentChange(listener: Listener): () => void {
  listeners.add(listener);
  try { listener(getConsent()); } catch { /* ignore */ }
  return () => { listeners.delete(listener); };
}

let consentModeInitialized = false;

/**
 * Seeds Google Consent Mode v2 defaults (deny everything, region-agnostic)
 * before any tag can fire, then replays a stored decision if one exists.
 * Idempotent. Call this once, as early as possible.
 */
export function initConsentMode(): void {
  if (consentModeInitialized || typeof window === 'undefined') return;
  consentModeInitialized = true;

  const gtag = ensureGtag();
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    // Give async tags a moment to observe an update() before hard-defaulting.
    wait_for_update: 500,
  });

  const stored = getStoredConsent();
  if (stored) {
    // Returning visitor with a saved choice — apply it and let subscribers run.
    updateGoogleConsent(stored);
    listeners.forEach(l => {
      try { l({ analytics: stored.analytics, marketing: stored.marketing }); } catch { /* ignore */ }
    });
  }
}
