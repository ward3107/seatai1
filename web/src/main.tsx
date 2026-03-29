import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import ErrorBoundary from './components/ErrorBoundary'
import { migrateFromLocalStorage } from './core/db'
import './index.css'

// Apply persisted language direction before first render.
// Check both localStorage (legacy) and a fast sync read; the full Dexie
// hydration is async and happens slightly later, but direction must be set
// before paint to avoid RTL flash.
const stored = localStorage.getItem('seatai-storage');
if (stored) {
  try {
    const { state } = JSON.parse(stored);
    const lang: string = state?.uiLanguage ?? 'en';
    document.documentElement.lang = lang;
    document.documentElement.dir = ['he', 'ar'].includes(lang) ? 'rtl' : 'ltr';
  } catch { /* ignore parse errors */ }
}

// Migrate existing localStorage data to IndexedDB (runs once, silently)
migrateFromLocalStorage('seatai-storage');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary name="Application">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
