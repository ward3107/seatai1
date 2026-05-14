import { useEffect, useCallback } from 'react';
import { useStore } from '../core/store';
import { type UILanguage } from '../lib/i18n';
import en from '../locales/en.json';
import he from '../locales/he.json';
import ar from '../locales/ar.json';
import ru from '../locales/ru.json';

const translations: Record<UILanguage, any> = { en, he, ar, ru };

// Simple interpolation for {{variable}} placeholders
function interpolate(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key]?.toString() || match;
  });
}

// Get translation by key path for a specific locale
function getTranslation(locale: UILanguage, key: string, values?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: any = translations[locale];

  for (const k of keys) {
    value = value?.[k];
  }

  if (typeof value !== 'string') {
    console.warn(`Translation not found: ${key}`);
    return key;
  }

  return values ? interpolate(value, values) : value;
}

const RTL_LANGS: UILanguage[] = ['he', 'ar'];

export const LANG_LABELS: Record<UILanguage, string> = {
  en: 'EN',
  he: 'עב',
  ar: 'عر',
  ru: 'RU',
};

export const LANG_FONTS: Record<UILanguage, string> = {
  en: 'Inter, system-ui, sans-serif',
  he: '"Heebo", "Arial Hebrew", "David", system-ui, sans-serif',
  ar: '"Cairo", "Arabic Typesetting", "Simplified Arabic", system-ui, sans-serif',
  ru: 'Inter, system-ui, sans-serif',
};

/** Applies dir/lang to <html> and returns isRTL and translation helper */
export function useLanguage() {
  const uiLanguage = useStore((s) => s.uiLanguage);
  const setUiLanguage = useStore((s) => s.setUiLanguage);
  const isRTL = RTL_LANGS.includes(uiLanguage);

  // Create a reactive translation function that depends on uiLanguage
  const t = useCallback((key: string, values?: Record<string, string | number>) => {
    return getTranslation(uiLanguage, key, values);
  }, [uiLanguage]);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = uiLanguage;
    html.dir = isRTL ? 'rtl' : 'ltr';
    document.body.style.fontFamily = LANG_FONTS[uiLanguage];
  }, [uiLanguage, isRTL]);

  return {
    uiLanguage,
    setUiLanguage,
    isRTL,
    t,
  };
}

// Re-export types
export type { UILanguage };
