import { useStore } from '../core/store';
import { useLanguage } from '../hooks/useLanguage';
import { Type } from 'lucide-react';
import clsx from 'clsx';

const ORDER = ['sm', 'md', 'lg'] as const;
type Scale = (typeof ORDER)[number];

const LABEL: Record<Scale, string> = { sm: 'A−', md: 'A', lg: 'A+' };

export default function TextSizeToggle() {
  const { uiScale, setUiScale } = useStore();
  const { t } = useLanguage();

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-700/50 p-0.5"
      role="group"
      aria-label={t('app.text_size')}
    >
      <Type
        size={14}
        className="text-gray-500 dark:text-gray-400 mx-1"
        aria-hidden="true"
      />
      {ORDER.map((scale) => (
        <button
          key={scale}
          type="button"
          onClick={() => setUiScale(scale)}
          aria-pressed={uiScale === scale}
          aria-label={`${t('app.text_size')}: ${LABEL[scale]}`}
          title={`${t('app.text_size')}: ${LABEL[scale]}`}
          className={clsx(
            'px-1.5 py-0.5 text-xs font-medium rounded transition-colors min-w-[1.5rem]',
            'focus:outline-none focus:ring-2 focus:ring-primary-500',
            uiScale === scale
              ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800',
          )}
        >
          {LABEL[scale]}
        </button>
      ))}
    </div>
  );
}
