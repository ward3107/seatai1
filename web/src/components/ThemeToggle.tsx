import { Sun, Moon, Monitor } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../core/store';
import { useLanguage } from '../hooks/useLanguage';

const OPTIONS = [
  { value: 'light' as const, Icon: Sun, key: 'theme.light' },
  { value: 'system' as const, Icon: Monitor, key: 'theme.system' },
  { value: 'dark' as const, Icon: Moon, key: 'theme.dark' },
];

export default function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const { t } = useLanguage();

  return (
    <div
      className="flex items-center rounded-lg bg-gray-100 dark:bg-slate-700 p-0.5"
      role="group"
      aria-label={t('theme.label')}
    >
      {OPTIONS.map(({ value, Icon, key }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            aria-label={t(key)}
            title={t(key)}
            className={clsx(
              'p-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
              active
                ? 'bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-slate-200',
            )}
          >
            <Icon size={13} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
