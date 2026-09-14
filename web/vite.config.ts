import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['seatai-logo.svg'],
      manifest: {
        name: 'SeatAI — Classroom Seating Optimizer',
        short_name: 'SeatAI',
        description:
          'Classroom seating arrangements. Local by default, with optional online integrations.',
        theme_color: '#3b82f6',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'landscape',
        icons: [
          {
            src: 'seatai-logo.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache the core app for offline use. External AI and roster services
        // still require connectivity; browser storage can be evicted.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        // Never let the SPA shell hijack the LTI serverless endpoints — those
        // navigations must reach the functions, not be served index.html.
        navigateFallbackDenylist: [/^\/api\//],
      },
      // Auto-skip waiting so the user picks up the latest version
      // without having to manually refresh after a deploy.
      injectRegister: 'auto',
    }),
  ],
  build: {
    // Locked to es2022 so the output stays predictable across Vite/esbuild
    // upgrades. Anything newer (top-level await, decorators) is unsupported.
    // The corresponding browser floor lives in package.json `browserslist`.
    target: 'es2022',
    // A hidden source map is still public when dist/ is deployed. Keep source
    // maps out of the production artifact; generate/upload them only inside a
    // private error-tracking CI step if one is added later.
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split large, independently-versioned vendor libraries into their
        // own chunks. They change far less often than app code, so browsers
        // keep them cached across deploys, and the initial parse cost drops.
        // Split large, independently-versioned vendor libraries into their own
        // chunks by node_modules path — the function form matches subpath
        // imports (react-dom/client, dexie-react-hooks) that the object form
        // misses. These change far less often than app code, so browsers keep
        // them cached across deploys and the entry chunk parses faster.
        // jspdf / html2canvas are intentionally absent — already dynamic-imported
        // on demand from the export path.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/](zustand|immer)[\\/]/.test(id)) return 'vendor-state';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          if (id.includes('dexie')) return 'vendor-db';
        },
      },
    },
  },
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  worker: {
    format: 'es',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', 'playwright-report/**', 'test-results/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/wasm/',  // Don't cover WASM files
        'src/locales/' // Don't cover translation files
      ]
    }
  }
})
