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

/** Fresh visitors start in Hebrew. Persisted user choices still take precedence. */
export function detectDefaultLocale(): UILanguage {
  return 'he';
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

/** Resolve a translation for an explicit locale. Shared by the React hook and
 * the non-React helper so lookup and interpolation behave identically. */
export function translate(
  locale: UILanguage,
  key: string,
  values?: Record<string, string | number>,
): string {
  const keys = key.split('.');
  let value: unknown = translations[locale];

  for (const k of keys) {
    value = value && typeof value === 'object'
      ? (value as Record<string, unknown>)[k]
      : undefined;
  }

  if (typeof value !== 'string') {
    console.warn(`Translation not found: ${key}`);
    return key;
  }

  return values ? interpolate(value, values) : value;
}

// Get translation by key path (e.g., 'students.add')
export function t(key: string, values?: Record<string, string | number>): string {
  return translate(currentLocale, key, values);
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
