import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Apply persisted language direction before first render
const stored = localStorage.getItem('seatai-storage');
if (stored) {
  try {
    const { state } = JSON.parse(stored);
    const lang: string = state?.uiLanguage ?? 'en';
    document.documentElement.lang = lang;
    document.documentElement.dir = ['he', 'ar'].includes(lang) ? 'rtl' : 'ltr';
  } catch { /* ignore parse errors */ }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary name="Application">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
