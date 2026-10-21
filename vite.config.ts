import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Development and ordinary builds are served from the domain root. The
// `pages` mode is for Codeberg Pages, which publishes this repository as a
// project site under /Guidebook/, so assets and the router need that prefix.
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/Guidebook/' : '/',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // React and the router change far less often than the app does, so they
        // get their own chunk: a new deploy then re-downloads only the app code,
        // and each chunk stays under Vite's 500 kB single-bundle warning.
        manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
}));
