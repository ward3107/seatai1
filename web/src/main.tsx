import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import ErrorBoundary from './components/ErrorBoundary'
import { migrateFromLocalStorage } from './core/db'
import { detectDefaultLocale } from './lib/i18n'
import './index.css'

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
