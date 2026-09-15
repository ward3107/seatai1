import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import type { SeatingStrategy } from '../../types';

const STRATEGIES: Array<{
  key: SeatingStrategy;
  labelKey: string;
  descKey: string;
}> = [
  { key: 'mixed', labelKey: 'settings.strategy_mixed', descKey: 'settings.strategy_mixed_desc' },
  { key: 'similar', labelKey: 'settings.strategy_similar', descKey: 'settings.strategy_similar_desc' },
  { key: 'peer_support', labelKey: 'settings.strategy_peer', descKey: 'settings.strategy_peer_desc' },
];

/** Shared strategy selector used in both onboarding and advanced settings. */
export default function SeatingStrategyPicker() {
  const config = useStore((state) => state.config);
  const setConfig = useStore((state) => state.setConfig);
  const { t } = useLanguage();

  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
        {t('settings.strategy_title')}
      </label>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
        {t('settings.strategy_hint')}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('settings.strategy_title')}>
        {STRATEGIES.map((strategy) => {
          const active =
            (config.seatingStrategy ?? 'mixed') === strategy.key &&
            !config.examMode;
          return (
            <button
              key={strategy.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() =>
                setConfig({
                  ...config,
                  seatingStrategy: strategy.key,
                  examMode: false,
                })
              }
              className={
                'rounded-lg border px-3 py-2 text-start transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ' +
                (active
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/30'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800')
              }
            >
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-200">
                {t(strategy.labelKey)}
              </span>
              <span className="block text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                {t(strategy.descKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
