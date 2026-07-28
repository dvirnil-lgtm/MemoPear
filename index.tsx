import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initLinkedInInsight } from './services/linkedinTracking';

// Load the LinkedIn Insight Tag as early as possible so conversion tracking
// (registration / first payment) is ready by the time those events fire.
initLinkedInInsight();

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
