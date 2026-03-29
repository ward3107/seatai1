import { useEffect } from 'react';
import { useStore } from '../core/store';

export type UILanguage = 'en' | 'he' | 'ar' | 'ru';

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

/** Applies dir/lang to <html> and returns isRTL */
export function useLanguage() {
  const { uiLanguage, setUiLanguage } = useStore();
  const isRTL = RTL_LANGS.includes(uiLanguage);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = uiLanguage;
    html.dir = isRTL ? 'rtl' : 'ltr';
    document.body.style.fontFamily = LANG_FONTS[uiLanguage];
  }, [uiLanguage, isRTL]);

  return { uiLanguage, setUiLanguage, isRTL };
}
