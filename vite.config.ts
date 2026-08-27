import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  // NOTE: the Gemini API key is deliberately NOT injected into the client bundle.
  // A client-rendered app cannot hold a secret — anything defined here ships in
  // world-readable JavaScript. All Gemini calls run server-side in Cloud
  // Functions (functions/index.js) which hold the key as a secret; see
  // services/geminiService.ts.
});
