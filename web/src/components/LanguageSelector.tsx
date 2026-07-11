import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, LANG_LABELS, type UILanguage } from '../hooks/useLanguage';

const LANGUAGES: UILanguage[] = ['en', 'he', 'ar', 'ru'];

export default function LanguageSelector() {
  // Use the reactive `t` from the hook (not the module-level import) so the
  // picker's own labels re-render the instant the language changes.
  const { uiLanguage, setUiLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title={t('language.title')}
        aria-label={t('language.title')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
      >
        <Globe size={15} className="text-gray-500 dark:text-gray-400" />
        <span>{LANG_LABELS[uiLanguage]}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute end-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden"
          >
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                role="menuitemradio"
                aria-checked={lang === uiLanguage}
                onClick={() => { setUiLanguage(lang); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  lang === uiLanguage
                    ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                dir={lang === 'he' || lang === 'ar' ? 'rtl' : 'ltr'}
              >
                <span>{LANG_LABELS[lang]}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {t(`language.${lang}`)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
