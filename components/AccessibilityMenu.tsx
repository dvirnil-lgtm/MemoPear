import React, { useEffect, useRef, useState } from 'react';
import { A11yPrefs, getA11yPrefs, setA11yPrefs } from '../services/accessibility';

const ToggleRow: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ title, description, checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="w-full flex items-start justify-between gap-4 py-3 text-left group"
  >
    <span className="flex-1">
      <span className="block text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{title}</span>
      <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</span>
    </span>
    <span
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-1 ${
        checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-white/20'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </span>
  </button>
);

const AccessibilityMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(() => getA11yPrefs());
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const update = (patch: Partial<A11yPrefs>) => {
    setPrefs(setA11yPrefs(patch));
  };

  // Close on outside click or Escape while open.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="fixed bottom-4 left-4 z-[280] print:hidden">
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Accessibility settings"
          className="absolute bottom-14 left-0 w-72 glass rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Accessibility</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close accessibility settings"
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <ToggleRow
              title="Reduce motion"
              description="Minimise animations and transitions."
              checked={prefs.reduceMotion}
              onChange={(v) => update({ reduceMotion: v })}
            />
            <ToggleRow
              title="Larger text"
              description="Increase the base text size across the site."
              checked={prefs.largeText}
              onChange={(v) => update({ largeText: v })}
            />
            <ToggleRow
              title="High contrast"
              description="Stronger text and borders for readability."
              checked={prefs.highContrast}
              onChange={(v) => update({ highContrast: v })}
            />
          </div>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Accessibility settings"
        title="Accessibility settings"
        className="w-11 h-11 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {/* Universal accessibility (person) glyph */}
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="4" r="2" />
          <path d="M12 7c-1.5 0-4.5.6-6.5 1.2a1 1 0 00.4 1.95c1.4-.28 3.1-.6 4.1-.72V13l-2.3 6.4a1.1 1.1 0 002.06.76L12 15.5l2.24 4.66a1.1 1.1 0 002.06-.76L14 13V9.43c1 .12 2.7.44 4.1.72a1 1 0 00.4-1.95C16.5 7.6 13.5 7 12 7z" />
        </svg>
      </button>
    </div>
  );
};

export default AccessibilityMenu;
