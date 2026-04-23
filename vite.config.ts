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
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || ''),
  },
});
