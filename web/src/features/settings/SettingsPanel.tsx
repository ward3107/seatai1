import { useState } from 'react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { Settings, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { sampleStudents } from '../../utils/sampleData';

// ─── Main SettingsPanel ────────────────────────────────────────────────────────
export default function SettingsPanel() {
  const {
    rows, cols, setRows, setCols,
    weights, setWeights,
    config, setConfig,
    setStudents, setResult,
  } = useStore();

  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const resetToDemo = () => {
    setStudents(sampleStudents);
    setResult(null);
    setRows(5);
    setCols(6);
  };

  return (
    <div className="bg-gray-50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-gray-500" />
          <span className="font-medium text-gray-700">{t('settings.title')}</span>
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isOpen && (
        <div className="p-4 pt-0 space-y-4">
          {/* Reset */}
          <button
            onClick={resetToDemo}
            className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-md transition-shadow"
          >
            <RotateCcw size={16} />
            {t('settings.load_demo')}
          </button>

          {/* Layout */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('settings.rows')}</label>
              <input
                type="number" min="1" max="20" value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('settings.columns')}</label>
              <input
                type="number" min="1" max="20" value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Objective Weights */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('settings.objective_weights')}</label>
            <div className="space-y-2">
              {[
                { key: 'academic_balance', label: t('settings.weight_academic') },
                { key: 'behavioral_balance', label: t('settings.weight_behavioral') },
                { key: 'diversity', label: t('settings.weight_diversity') },
                { key: 'special_needs', label: t('settings.weight_special_needs') },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24">{label}</span>
                  <input
                    type="range" min="0" max="100"
                    value={(weights[key as keyof typeof weights] || 0) * 100}
                    onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) / 100 })}
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-gray-600 w-10 text-right">
                    {Math.round((weights[key as keyof typeof weights] || 0) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Algorithm Config */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('settings.algorithm')}</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('settings.population')}</label>
                <input
                  type="number" min="10" max="500" value={config.populationSize}
                  onChange={(e) => setConfig({ ...config, populationSize: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('settings.generations')}</label>
                <input
                  type="number" min="10" max="500" value={config.maxGenerations}
                  onChange={(e) => setConfig({ ...config, maxGenerations: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Quality / speed tradeoff — multi-start GA */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              {t('settings.quality')}
            </label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('settings.quality')}>
              {[
                { starts: 1, key: 'settings.quality_fast' },
                { starts: 3, key: 'settings.quality_balanced' },
                { starts: 5, key: 'settings.quality_best' },
              ].map(({ starts, key }) => {
                const active = (config.multiStart ?? 1) === starts;
                return (
                  <button
                    key={starts}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setConfig({ ...config, multiStart: starts })}
                    className={
                      'px-2 py-1.5 text-xs rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ' +
                      (active
                        ? 'bg-primary-50 border-primary-400 text-primary-700 font-medium'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400')
                    }
                  >
                    {t(key)}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {t('settings.quality_hint')}
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
