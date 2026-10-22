import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' => the built site works from any folder or sub-path (static hosting, demo links).
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    // When USE_MOCK=false in src/config.js, requests to /api are forwarded to your backend:
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
});
