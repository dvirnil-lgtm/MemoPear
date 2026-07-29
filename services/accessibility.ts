// User-facing accessibility preferences.
//
// Three opt-in adjustments, persisted to localStorage and applied as classes on
// <html> so plain CSS (see index.css) does the work — no re-render required:
//
//   - reduceMotion  → `a11y-reduce-motion` : strips animations / transitions.
//   - largeText     → `a11y-large-text`    : bumps the root font size.
//   - highContrast  → `a11y-high-contrast` : stronger text/border contrast.
//
// Reduced motion defaults to the OS setting (`prefers-reduced-motion`) until the
// visitor overrides it, so we honour the system preference out of the box.

export interface A11yPrefs {
  reduceMotion: boolean;
  largeText: boolean;
  highContrast: boolean;
}

const STORAGE_KEY = 'mp_a11y_v1';

const CLASS_MAP: Record<keyof A11yPrefs, string> = {
  reduceMotion: 'a11y-reduce-motion',
  largeText: 'a11y-large-text',
  highContrast: 'a11y-high-contrast',
};

function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function defaults(): A11yPrefs {
  return {
    reduceMotion: systemPrefersReducedMotion(),
    largeText: false,
    highContrast: false,
  };
}

/** Reads stored preferences, falling back to sensible (system-aware) defaults. */
export function getA11yPrefs(): A11yPrefs {
  if (typeof window === 'undefined') return defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as Partial<A11yPrefs>;
    const base = defaults();
    return {
      reduceMotion: parsed.reduceMotion ?? base.reduceMotion,
      largeText: parsed.largeText ?? base.largeText,
      highContrast: parsed.highContrast ?? base.highContrast,
    };
  } catch {
    return defaults();
  }
}

/** Toggles the matching <html> classes for the given preferences. */
function applyPrefs(prefs: A11yPrefs): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  (Object.keys(CLASS_MAP) as (keyof A11yPrefs)[]).forEach(key => {
    root.classList.toggle(CLASS_MAP[key], prefs[key]);
  });
}

/** Persists and applies a full or partial preference update. Returns the result. */
export function setA11yPrefs(next: Partial<A11yPrefs>): A11yPrefs {
  const merged: A11yPrefs = { ...getA11yPrefs(), ...next };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      /* private mode — preference still applies for this session */
    }
  }
  applyPrefs(merged);
  return merged;
}

/** Applies stored preferences to <html>. Call once at startup. */
export function initAccessibility(): void {
  applyPrefs(getA11yPrefs());
}
