import React, { useEffect, useState } from 'react';
import {
  ConsentState,
  getConsent,
  hasDecided,
  acceptAll,
  rejectAll,
  setConsent,
} from '../services/consent';

// Custom event used to (re)open the preferences panel from anywhere — e.g. the
// "Cookie Preferences" link in the footer.
const OPEN_EVENT = 'mp:open-consent';

/** Opens the cookie preferences panel from outside the component tree. */
export function openConsentPreferences(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  }
}

interface ConsentBannerProps {
  /** Navigate to the Privacy Policy view (wired to the app router). */
  onNavigatePrivacy?: () => void;
}

const ToggleRow: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}> = ({ title, description, checked, disabled, onChange }) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <div className="flex-1">
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{title}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={title}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-1 ${
        checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-white/20'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const ConsentBanner: React.FC<ConsentBannerProps> = ({ onNavigatePrivacy }) => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [draft, setDraft] = useState<ConsentState>(() => getConsent());

  // Show automatically on first visit; allow reopening via the custom event.
  useEffect(() => {
    if (!hasDecided()) setVisible(true);
    const reopen = () => {
      setDraft(getConsent());
      setShowDetails(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  if (!visible) return null;

  const close = () => setVisible(false);

  const handleAcceptAll = () => { acceptAll(); close(); };
  const handleRejectAll = () => { rejectAll(); close(); };
  const handleSave = () => { setConsent(draft); close(); };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[300] p-3 sm:p-4 flex justify-center pointer-events-none"
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
    >
      <div className="pointer-events-auto w-full max-w-2xl glass rounded-[1.75rem] border border-slate-200 dark:border-white/10 shadow-2xl p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-9 h-9 rounded-xl bg-blue-600/10 items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0a3 3 0 003 3 3 3 0 00-1 4 3 3 0 002 3m-8-6a2 2 0 11-2 2m6 4a2 2 0 100 2" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">We value your privacy</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              We use essential cookies to run MemoPear, plus optional analytics and marketing
              cookies to understand usage and measure our campaigns. You choose what to allow.
              {onNavigatePrivacy && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={onNavigatePrivacy}
                    className="underline font-semibold hover:text-blue-600 transition-colors"
                  >
                    Read our Privacy Policy
                  </button>
                  .
                </>
              )}
            </p>
          </div>
        </div>

        {showDetails && (
          <div className="mt-3 border-t border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
            <ToggleRow
              title="Strictly necessary"
              description="Required for sign-in, security and core features. Always active."
              checked
              disabled
            />
            <ToggleRow
              title="Analytics"
              description="Anonymous usage measurement that helps us improve the product."
              checked={draft.analytics}
              onChange={(v) => setDraft((d) => ({ ...d, analytics: v }))}
            />
            <ToggleRow
              title="Marketing"
              description="Conversion tracking (LinkedIn Insight Tag) to measure our ads."
              checked={draft.marketing}
              onChange={(v) => setDraft((d) => ({ ...d, marketing: v }))}
            />
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          {!showDetails ? (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="order-3 sm:order-1 sm:mr-auto px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
            >
              Customize
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="order-3 sm:order-1 sm:mr-auto px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
            >
              Save choices
            </button>
          )}
          <button
            type="button"
            onClick={handleRejectAll}
            className="order-2 px-5 py-2.5 rounded-full border border-slate-200 dark:border-white/15 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all active:scale-95"
          >
            Reject all
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="order-1 sm:order-3 px-5 py-2.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-sm hover:scale-[1.03] active:scale-95 transition-all"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
