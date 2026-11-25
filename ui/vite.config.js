import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Forge serves Custom UI from a sub-path, so assets must be relative.
// `vite build --mode shots` builds a local preview for Marketplace screenshots, with
// @forge/bridge replaced by a stub that serves real engine output.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  resolve:
    mode === 'shots'
      ? { alias: { '@forge/bridge': fileURLToPath(new URL('./src/bridge-stub.js', import.meta.url)) } }
      : {},
  build: { outDir: mode === 'shots' ? '../marketing/preview' : 'dist', emptyOutDir: true, sourcemap: false },
}));
