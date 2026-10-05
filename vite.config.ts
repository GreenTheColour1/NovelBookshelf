import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';

function copyManifest() {
  return {
    name: 'copy-manifest',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      copyFileSync(resolve(__dirname, 'manifest.json'), resolve(outDir, 'manifest.json'));
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [svelte(), copyManifest()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Extension CSP bans inline scripts; ensure no inline dynamic imports issues.
    minify: 'esbuild',
    target: 'esnext'
  },
  publicDir: 'public'
});
