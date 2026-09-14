import { useEffect, useCallback } from 'react';
import { useStore } from '../core/store';
import { translate, type UILanguage } from '../lib/i18n';

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
    return translate(uiLanguage, key, values);
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
