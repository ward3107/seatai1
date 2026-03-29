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

let currentLocale: UILanguage = 'en';

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
