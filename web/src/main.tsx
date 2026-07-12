import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import ErrorBoundary from './components/ErrorBoundary'
import { migrateFromLocalStorage } from './core/db'
import { useStore } from './core/store'
import { detectDefaultLocale } from './lib/i18n'
import './index.css'

// Expose the Zustand store to E2E tests (dev server only — never in a
// production bundle, so the in-browser AI key isn't reachable from the console
// of a deployed app). Playwright's helpers seed a class and read state through
// `window.__ZUSTAND_STORE__` instead of clicking through slow setup flows.
if (import.meta.env.DEV) {
  (window as unknown as { __ZUSTAND_STORE__?: typeof useStore }).__ZUSTAND_STORE__ = useStore;
}

// Apply the language direction before first render so there's no RTL flash.
// Prefer any persisted choice (fast sync localStorage read; the full Dexie
// hydration lands slightly later); otherwise fall back to the browser's
// detected language — matching the store's default.
(() => {
  let lang: string = detectDefaultLocale();
  const stored = localStorage.getItem('seatai-storage');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.uiLanguage) lang = state.uiLanguage;
    } catch { /* ignore parse errors */ }
  }
  document.documentElement.lang = lang;
  document.documentElement.dir = ['he', 'ar'].includes(lang) ? 'rtl' : 'ltr';
})();

// Migrate existing localStorage data to IndexedDB (runs once, silently)
migrateFromLocalStorage('seatai-storage');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary name="Application">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
