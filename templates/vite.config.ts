import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'ui',
  build: {
    outDir: '../dist/ui',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
