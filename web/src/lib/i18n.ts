// Translation system for SeatAI

import en from '../locales/en.json';
import he from '../locales/he.json';
import ar from '../locales/ar.json';
import ru from '../locales/ru.json';

type Translations = typeof en;
type UILanguage = 'en' | 'he' | 'ar' | 'ru';

const translations: Record<UILanguage, Translations> = {
  en,
  he,
  ar,
  ru,
};

const SUPPORTED: UILanguage[] = ['en', 'he', 'ar', 'ru'];

/**
 * Best supported UI language for a fresh visitor, derived from the browser's
 * language preferences. Falls back to English when nothing matches (so the
 * app no longer defaults everyone to Hebrew). Matches on the primary subtag,
 * e.g. `en-US` → `en`, `he-IL` → `he`.
 */
export function detectDefaultLocale(): UILanguage {
  if (typeof navigator === 'undefined') return 'en';
  const prefs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const pref of prefs) {
    const primary = pref?.toLowerCase().split('-')[0] as UILanguage | undefined;
    if (primary && SUPPORTED.includes(primary)) return primary;
  }
  return 'en';
}

// Initialized to the detected language so the static `t` below is correct
// from first paint, before the persisted store hydrates (which then calls
// setLocale with the saved choice).
let currentLocale: UILanguage = detectDefaultLocale();

// Simple interpolation for {{variable}} placeholders
function interpolate(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key]?.toString() || match;
  });
}

// Get translation by key path (e.g., 'students.add')
export function t(key: string, values?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: any = translations[currentLocale];

  for (const k of keys) {
    value = value?.[k];
  }

  if (typeof value !== 'string') {
    console.warn(`Translation not found: ${key}`);
    return key;
  }

  return values ? interpolate(value, values) : value;
}

// Set current locale
export function setLocale(locale: UILanguage): void {
  if (translations[locale]) {
    currentLocale = locale;
  } else {
    console.warn(`Locale not found: ${locale}`);
  }
}

// Get current locale
export function getLocale(): UILanguage {
  return currentLocale;
}

// Export type for use in components
export type { Translations, UILanguage };
