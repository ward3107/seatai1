import { useEffect } from 'react';
import {
  X,
  Sparkles,
  MousePointer2,
  LayoutGrid,
  KeyboardIcon,
  Lock,
  Lightbulb,
} from 'lucide-react';
import { useStore } from '../core/store';
import { useLanguage } from '../hooks/useLanguage';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * One-time welcome tour for new users. Auto-pops the first time the
 * teacher has students loaded; can also be reopened from the header
 * help button.
 *
 * Six tips that cover the highest-value, least-discoverable features.
 */
export default function WelcomeTipsModal({ open, onClose }: Props) {
  const setWelcomeTipsDismissed = useStore((s) => s.setWelcomeTipsDismissed);
  const { t } = useLanguage();
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const tips = [
    { Icon: Sparkles, key: 'tips.optimize' },
    { Icon: MousePointer2, key: 'tips.click_student' },
    { Icon: LayoutGrid, key: 'tips.layouts' },
    { Icon: Lock, key: 'tips.lock_seat' },
    { Icon: KeyboardIcon, key: 'tips.keyboard' },
    { Icon: Lightbulb, key: 'tips.constraints' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-tips-title"
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary-500" />
            <h2 id="welcome-tips-title" className="font-bold text-gray-900 dark:text-slate-100">
              {t('tips.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
            aria-label={t('detail.close')}
          >
            <X size={18} className="text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        <ul className="p-5 space-y-3">
          {tips.map(({ Icon, key }) => (
            <li
              key={key}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 flex items-center justify-center flex-shrink-0">
                <Icon size={14} />
              </div>
              <p className="text-sm text-gray-700 dark:text-slate-200 leading-snug">
                {t(key)}
              </p>
            </li>
          ))}
        </ul>

        <div className="p-5 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
          <button
            onClick={() => {
              setWelcomeTipsDismissed(true);
              onClose();
            }}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium"
          >
            {t('tips.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
