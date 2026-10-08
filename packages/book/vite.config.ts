import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import remarkGfm from 'remark-gfm';
import { defineConfig } from 'vitest/config';
import { contentMetadata } from './contentMetadata.ts';

export default defineConfig({
  plugins: [contentMetadata(), { enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm] }) }, react(), tailwindcss()],
  worker: { format: 'es' },
  // Allow the dev and preview servers to be reached through `tailscale serve`.
  server: { allowedHosts: ['.ts.net'] },
  preview: { allowedHosts: ['.ts.net'] },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
