import { useId, useState } from 'react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { Settings, ChevronDown, ChevronUp, RotateCcw, Sparkles, Eye, EyeOff, Trash2, ShieldAlert } from 'lucide-react';
import { sampleStudents } from '../../utils/sampleData';
import type { ObjectiveWeights } from '../../types';

// Quick-pick priority profiles. Each sets all four objective weights at once
// so teachers can pick an intent ("focus on behaviour") without reasoning
// about raw percentages; the sliders below still allow fine-tuning.
const WEIGHT_PRESETS: {
  key: string;
  labelKey: string;
  descKey: string;
  weights: ObjectiveWeights;
}[] = [
  {
    key: 'balanced',
    labelKey: 'settings.preset_balanced',
    descKey: 'settings.preset_balanced_desc',
    weights: { academic_balance: 0.3, behavioral_balance: 0.3, diversity: 0.2, special_needs: 0.2 },
  },
  {
    key: 'behavior',
    labelKey: 'settings.preset_behavior',
    descKey: 'settings.preset_behavior_desc',
    weights: { academic_balance: 0.2, behavioral_balance: 0.5, diversity: 0.15, special_needs: 0.15 },
  },
  {
    key: 'academic',
    labelKey: 'settings.preset_academic',
    descKey: 'settings.preset_academic_desc',
    weights: { academic_balance: 0.5, behavioral_balance: 0.2, diversity: 0.15, special_needs: 0.15 },
  },
  {
    key: 'inclusion',
    labelKey: 'settings.preset_inclusion',
    descKey: 'settings.preset_inclusion_desc',
    weights: { academic_balance: 0.2, behavioral_balance: 0.2, diversity: 0.15, special_needs: 0.45 },
  },
];

// ─── Main SettingsPanel ────────────────────────────────────────────────────────
export default function SettingsPanel() {
  const {
    rows, cols, setRows, setCols,
    weights, setWeights,
    config, setConfig,
    setStudents, setResult,
    avoidRecentNeighbors, setAvoidRecentNeighbors,
    aiSettings, setAiSettings, forgetApiKey,
  } = useStore();
  const [showApiKey, setShowApiKey] = useState(false);

  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const panelId = useId();
  const fieldId = (key: string) => `${panelId}-${key}`;

  const resetToDemo = () => {
    setStudents(sampleStudents);
    setResult(null);
    setRows(5);
    setCols(6);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('settings.title')}</span>
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
              <label htmlFor={fieldId('rows')} className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t('settings.rows')}</label>
              <input
                id={fieldId('rows')}
                type="number" min="1" max="20" value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor={fieldId('cols')} className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t('settings.columns')}</label>
              <input
                id={fieldId('cols')}
                type="number" min="1" max="20" value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Objective Weights */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t('settings.objective_weights')}</label>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">{t('settings.weights_hint')}</p>

            {/* Quick presets — set all four priorities at once. */}
            <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label={t('settings.presets_label')}>
              {WEIGHT_PRESETS.map((preset) => {
                const active = (Object.keys(preset.weights) as (keyof typeof weights)[])
                  .every((k) => Math.abs((weights[k] ?? 0) - preset.weights[k]) < 0.001);
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setWeights({ ...preset.weights })}
                    aria-pressed={active}
                    title={t(preset.descKey)}
                    className={
                      'px-2.5 py-1 text-[11px] rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ' +
                      (active
                        ? 'bg-primary-50 border-primary-400 text-primary-700 font-medium'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400')
                    }
                  >
                    {t(preset.labelKey)}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              {[
                { key: 'academic_balance', label: t('settings.weight_academic') },
                { key: 'behavioral_balance', label: t('settings.weight_behavioral') },
                { key: 'diversity', label: t('settings.weight_diversity') },
                { key: 'special_needs', label: t('settings.weight_special_needs') },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-24">{label}</span>
                  <input
                    type="range" min="0" max="100"
                    value={(weights[key as keyof typeof weights] || 0) * 100}
                    onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) / 100 })}
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-300 w-10 text-right">
                    {Math.round((weights[key as keyof typeof weights] || 0) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Algorithm Config */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">{t('settings.algorithm')}</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={fieldId('population')} className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.population')}</label>
                <input
                  id={fieldId('population')}
                  type="number" min="10" max="500" value={config.populationSize}
                  onChange={(e) => setConfig({ ...config, populationSize: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 text-sm"
                />
              </div>
              <div>
                <label htmlFor={fieldId('generations')} className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.generations')}</label>
                <input
                  id={fieldId('generations')}
                  type="number" min="10" max="500" value={config.maxGenerations}
                  onChange={(e) => setConfig({ ...config, maxGenerations: Number(e.target.value) })}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Stopping criteria — when the GA should give up searching */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              {t('settings.stopping')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={fieldId('patience')} className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('settings.patience')}
                </label>
                <input
                  id={fieldId('patience')}
                  type="number" min="3" max="200" value={config.earlyStopPatience}
                  onChange={(e) =>
                    setConfig({ ...config, earlyStopPatience: Math.max(3, Number(e.target.value)) })
                  }
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 text-sm"
                />
              </div>
              <div>
                <label htmlFor={fieldId('timelimit')} className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('settings.time_limit')}
                </label>
                <input
                  id={fieldId('timelimit')}
                  type="number" min="0" max="60" step="0.5"
                  value={config.timeLimitMs ? config.timeLimitMs / 1000 : 0}
                  onChange={(e) => {
                    const secs = Math.max(0, Number(e.target.value));
                    setConfig({ ...config, timeLimitMs: secs > 0 ? Math.round(secs * 1000) : undefined });
                  }}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 text-sm"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{t('settings.stopping_hint')}</p>
          </div>

          {/* Quality / speed tradeoff — multi-start GA */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
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
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400')
                    }
                  >
                    {t(key)}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.quality_hint')}
            </p>
          </div>

          {/* Exam / anti-cheating mode */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={!!config.examMode}
                onChange={(e) => setConfig({ ...config, examMode: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-700 text-primary-500 focus:ring-primary-500"
              />
              <ShieldAlert size={14} className="text-rose-500 dark:text-rose-400" />
              <span className="font-medium text-gray-600 dark:text-gray-300">{t('settings.exam_title')}</span>
            </label>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.exam_hint')}
            </p>
          </div>

          {/* Rotation — "freshen seating" between runs */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={avoidRecentNeighbors}
                onChange={(e) => setAvoidRecentNeighbors(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-700 text-primary-500 focus:ring-primary-500"
              />
              <span className="font-medium text-gray-600 dark:text-gray-300">{t('settings.rotation_title')}</span>
            </label>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.rotation_hint')}
            </p>
          </div>

          {/* AI explanation — opt-in, browser-only LLM integration */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              <Sparkles size={14} className="text-amber-500 dark:text-amber-400" />
              {t('settings.ai_title')}
            </label>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">{t('settings.ai_description')}</p>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aiSettings.enabled}
                onChange={(e) =>
                  setAiSettings({ ...aiSettings, enabled: e.target.checked })
                }
                className="rounded border-gray-300 dark:border-gray-700 text-primary-500 focus:ring-primary-500"
              />
              <span>{t('settings.ai_enable')}</span>
            </label>

            {aiSettings.enabled && (
              <div className="space-y-2">
                <div>
                  <label htmlFor={fieldId('api-key')} className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('settings.ai_api_key')}
                  </label>
                  <div className="relative">
                    <input
                      id={fieldId('api-key')}
                      type={showApiKey ? 'text' : 'password'}
                      value={aiSettings.apiKey}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) =>
                        setAiSettings({ ...aiSettings, apiKey: e.target.value.trim() })
                      }
                      placeholder="sk-ant-…"
                      className="w-full pr-8 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((v) => !v)}
                      className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 dark:text-gray-400 hover:text-gray-700"
                      aria-label={showApiKey ? t('settings.ai_hide_key') : t('settings.ai_show_key')}
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={forgetApiKey}
                      disabled={!aiSettings.apiKey}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 dark:text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400"
                      aria-label={t('settings.ai_forget_key')}
                      title={t('settings.ai_forget_key')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor={fieldId('model')} className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('settings.ai_model')}
                  </label>
                  <select
                    id={fieldId('model')}
                    value={aiSettings.model}
                    onChange={(e) =>
                      setAiSettings({ ...aiSettings, model: e.target.value })
                    }
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 text-sm"
                  >
                    <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 — fast & cheap</option>
                    <option value="claude-sonnet-4-6">Claude Sonnet 4.6 — best quality</option>
                  </select>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded p-2">
                  {t('settings.ai_security_note')}
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
