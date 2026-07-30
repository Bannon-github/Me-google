import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['three'],
  },
  server: {
    // Allow LAN access for on-device testing (Quest Browser)
    host: true,
  },
});
