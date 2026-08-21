import { defineConfig } from 'vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const API_PORT = process.env.API_PORT || 3001;

export default defineConfig({
  plugins: [
    // Tailwind v4 via the official Vite plugin.
    tailwindcss(),
    // File-based routing codegen (src/routes/** -> src/routeTree.gen.ts).
    // NOTE: must come before the React plugin.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    viteReact(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
    // Radix UI peers must share one React instance or hooks crash with:
    // Cannot read properties of null (reading 'useRef')
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Pre-bundle every real runtime dependency up front. Anything missing here
    // gets discovered lazily by Vite the first time a route imports it — which
    // triggers a re-optimize + full page reload mid-session (feels like the app
    // "freezes" when you click into Financeiro/Relatorios for the first time,
    // since recharts is large). Listing them all avoids that surprise reload.
    include: [
      'react', 'react-dom', 'react/jsx-runtime',
      '@tanstack/react-query', '@tanstack/react-router',
      'lucide-react', 'recharts', 'papaparse', 'sonner',
      'clsx', 'tailwind-merge', 'class-variance-authority',
      '@radix-ui/react-avatar', '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu', '@radix-ui/react-label',
      '@radix-ui/react-slot', '@radix-ui/react-tooltip',
    ],
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: true,
    // The Express API server (server/index.mjs) runs separately in dev;
    // forward /api so the browser can talk to it same-origin.
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
    },
  },
});
