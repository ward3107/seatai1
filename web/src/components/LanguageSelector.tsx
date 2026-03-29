import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, LANG_LABELS, type UILanguage } from '../hooks/useLanguage';

const LANGUAGES: UILanguage[] = ['en', 'he', 'ar', 'ru'];

export default function LanguageSelector() {
  const { uiLanguage, setUiLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        title="Change language / שנה שפה / تغيير اللغة"
      >
        <Globe size={15} className="text-gray-500" />
        <span>{LANG_LABELS[uiLanguage]}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute end-0 mt-1 w-28 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => { setUiLanguage(lang); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  lang === uiLanguage
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                dir={lang === 'he' || lang === 'ar' ? 'rtl' : 'ltr'}
              >
                <span>{LANG_LABELS[lang]}</span>
                <span className="text-xs text-gray-400">
                  {lang === 'en' ? 'English' : lang === 'he' ? 'עברית' : lang === 'ar' ? 'عربية' : 'Русский'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
