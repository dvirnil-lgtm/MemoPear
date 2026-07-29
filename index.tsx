import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initLinkedInInsight } from './services/linkedinTracking';
import { initConsentMode, onConsentChange } from './services/consent';
import { initAccessibility } from './services/accessibility';

// Seed Google Consent Mode defaults (all denied) before any tag can fire, then
// replay a returning visitor's saved choice. Must run before trackers load.
initConsentMode();

// The LinkedIn Insight Tag is a marketing tracker — only inject it once the
// visitor has granted marketing consent. `onConsentChange` fires immediately
// with the current state and again whenever the choice changes, so a returning
// visitor who already opted in gets the tag straight away, and someone who
// opts in later gets it the moment they do.
onConsentChange(state => {
  if (state.marketing) initLinkedInInsight();
});

// Apply saved accessibility preferences (reduced motion, larger text, high
// contrast) to <html> before first paint so there's no visual flash.
initAccessibility();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
