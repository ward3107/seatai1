import App from './App';
import { migrateFromLocalStorage } from '../core/db';
import { useStore } from '../core/store';
import { detectDefaultLocale } from '../lib/i18n';

// Expose the Zustand store to E2E tests (dev server only — never in a
// production bundle). Browser storage is still accessible to someone with
// access to the device. Playwright helpers seed a class and read state through
// `window.__ZUSTAND_STORE__` instead of clicking through slow setup flows.
if (import.meta.env.DEV) {
  (window as unknown as { __ZUSTAND_STORE__?: typeof useStore }).__ZUSTAND_STORE__ = useStore;
}

// Apply the language direction before first render so there's no RTL flash.
// Prefer any persisted choice (fast sync localStorage read; the full Dexie
// hydration lands slightly later); otherwise fall back to the browser's
// default Hebrew locale — matching the store's default.
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


export default App;
