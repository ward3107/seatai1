import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SeatAI — Classroom Seating Optimizer',
        short_name: 'SeatAI',
        description:
          'AI-powered classroom seating arrangements. Runs entirely in your browser.',
        theme_color: '#3b82f6',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'landscape',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // The app loads everything statically — once cached, it works
        // offline forever (no API calls, no remote fonts). Bump cache
        // limit so jsPDF + html2canvas chunks fit.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
      // Auto-skip waiting so the user picks up the latest version
      // without having to manually refresh after a deploy.
      injectRegister: 'auto',
    }),
  ],
  build: {
    target: 'esnext',
    sourcemap: true,
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
  optimizeDeps: {
    exclude: ['seatai-core'],
  },
  worker: {
    // ES module workers support dynamic imports (needed for WASM)
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
