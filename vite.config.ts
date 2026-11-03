import tailwindcss from '@tailwindcss/vite';
import { cpSync, mkdirSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    publicDir: false as const,
    build: { outDir: 'public' },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-agropulse-images',
        apply: 'build',
        closeBundle() {
          const source = path.resolve(__dirname, 'src/assets/images');
          const destination = path.resolve(__dirname, 'public/src/assets/images');
          mkdirSync(path.dirname(destination), { recursive: true });
          cpSync(source, destination, { recursive: true });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});


