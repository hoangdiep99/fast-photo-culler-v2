import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [
      react(),
      tailwindcss(),
      electron([
        {
          entry: 'electron/main.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              minify: isProd,
              sourcemap: !isProd,
              rollupOptions: {
                external: ['sharp', 'exiftool-vendored', 'canvas', 'node:sqlite', 'better-sqlite3', 'sql.js', /^node:/],
                output: {
                  entryFileNames: 'main.js',
                  format: 'es',
                },
              },
            },
          },
        },
        {
          entry: 'electron/preload.ts',
          onstart(options) {
            options.reload();
          },
          vite: {
            build: {
              outDir: 'dist-electron',
              minify: isProd,
              sourcemap: !isProd,
              rollupOptions: {
                external: ['electron'],
                output: {
                  entryFileNames: 'preload.js',
                  format: 'cjs',
                },
              },
            },
          },
        },
      ]),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      target: 'chrome122',
      outDir: 'dist',
      sourcemap: !isProd,
      minify: isProd ? 'esbuild' : false,
      chunkSizeWarningLimit: 1200,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('@mediapipe')) return 'vendor-mediapipe';
              return 'vendor-core';
            }
          },
        },
      },
    },
  };
});
