import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { getDisplayScorePct, getScoreRating } from '../../utils/seatingUtils';
import { aiSummarizeClass } from '../../utils/aiSummary';
import { BookOpen, Users, Globe, Accessibility, Clock, Zap, Sparkles, RefreshCw } from 'lucide-react';

export default function MetricsPanel() {
  const result = useStore((s) => s.result);
  const students = useStore((s) => s.students);
  const constraints = useStore((s) => s.constraints);
  const layoutDef = useStore((s) => s.layoutDef);
  const aiSettings = useStore((s) => s.aiSettings);
  const { t, uiLanguage } = useLanguage();

  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!result) return null;

  const generateSummary = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiText('');
    try {
      const text = await aiSummarizeClass(
        { apiKey: aiSettings.apiKey, model: aiSettings.model },
        {
          studentCount: students.length,
          layoutType: layoutDef.type,
          scorePct: getDisplayScorePct(result),
          objectives: result.objective_scores,
          constraintCounts: {
            separate_pairs: constraints.separate_pairs.length,
            keep_together_pairs: constraints.keep_together_pairs.length,
            front_row: constraints.front_row_ids.length,
            back_row: constraints.back_row_ids.length,
          },
          warnings: result.warnings,
          generations: result.generations,
          stopReason: result.stop_reason ?? 'generations',
        },
        uiLanguage,
        // Stream the paragraph in as it's generated instead of
        // spinner-then-wall-of-text.
        (chunk) => setAiText((prev) => (prev ?? '') + chunk),
      );
      setAiText(text);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI request failed');
      setAiText(null);
    } finally {
      setAiLoading(false);
    }
  };

  const metrics = [
    {
      label: t('optimization.academic_balance'),
      value: result.objective_scores.academic_balance,
      icon: BookOpen,
      color: 'blue',
    },
    {
      label: t('optimization.behavioral_fit'),
      value: result.objective_scores.behavioral_balance,
      icon: Users,
      color: 'green',
    },
    {
      label: t('optimization.diversity'),
      value: result.objective_scores.diversity,
      icon: Globe,
      color: 'purple',
    },
    {
      label: t('optimization.special_needs'),
      value: result.objective_scores.special_needs,
      icon: Accessibility,
      color: 'orange',
    },
  ];

  // Metric swatches map into the sage/ochre family — same visual system as
  // the rest of the app, tuned so the four tiles read as related-not-identical.
  const colorClasses = {
    blue: 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
    green: 'bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300',
    purple: 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300',
    orange: 'bg-accent-50 dark:bg-accent-900/20 text-accent-800 dark:text-accent-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/90 dark:bg-gray-800 backdrop-blur-sm rounded-2xl p-4"
    >
      {/* Header — the score already appears in the TopBar and the disclosure
          summary, so keep this row tight and let the metric tiles carry the
          weight. */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('optimization.results_title')}</h2>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock size={13} />
            <span>{Math.round(result.computation_time_ms)}ms</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap size={13} />
            <span>{result.generations} {t('optimization.generations')}</span>
          </div>
        </div>
      </div>

      {/* Overall Score — lead with the verbal rating; the percentage is
          available underneath for teachers who want the number. */}
      <div className="text-center mb-4">
        <div className="text-xl font-semibold text-primary-700 dark:text-primary-300 leading-none">
          {t(`score.${getScoreRating(result)}`)}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 tabular-nums">
          {getDisplayScorePct(result)}% · {t('optimization.overall_fitness_score')}
        </p>
        {/* Honest framing — the GA finds a strong (near-optimal) plan via a
            heuristic search; it isn't a proven mathematical optimum. We say so
            plainly and show how the search actually terminated. */}
        <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-1.5 max-w-md mx-auto">
          {t('optimization.near_optimal_note', {
            reason: t(`optimization.stop_${result.stop_reason ?? 'generations'}`),
            generations: result.generations,
            ms: Math.round(result.computation_time_ms),
          })}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          // objective_scores are already in [0, 100] — don't multiply again.
          const percentage = Math.max(0, Math.min(100, Math.round(metric.value)));

          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div
                className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                  colorClasses[metric.color as keyof typeof colorClasses]
                }`}
              >
                <Icon size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{percentage}%</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</p>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                  className={`h-full rounded-full ${
                    metric.color === 'blue'
                      ? 'bg-primary-600'
                      : metric.color === 'green'
                      ? 'bg-primary-500'
                      : metric.color === 'purple'
                      ? 'bg-accent-600'
                      : 'bg-accent-500'
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Unmet required (hard) rules — surfaced prominently because it means
          the teacher's required rules were contradictory or impossible. */}
      {result.unmet_hard_rules ? (
        <div role="alert" className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg">
          <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
            {t('optimization.unmet_hard_rules', { count: result.unmet_hard_rules })}
          </p>
        </div>
      ) : null}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">{t('optimization.notes')}:</p>
          <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
            {result.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Whole-class AI summary — only when the teacher has opted in to AI
          features in Settings. Sends aggregate facts, not the roster. */}
      {aiSettings.enabled && aiSettings.apiKey && (
        <div className="mt-4 p-3 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-accent-800 dark:text-accent-300 flex items-center gap-1.5">
              <Sparkles size={14} aria-hidden="true" />
              {t('optimization.ai_summary_title')}
            </p>
            <button
              type="button"
              onClick={generateSummary}
              disabled={aiLoading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
            >
              {aiLoading ? (
                <>
                  <RefreshCw size={12} className="animate-spin" aria-hidden="true" />
                  {t('students.ai_loading')}
                </>
              ) : (
                t(aiText ? 'students.ai_try_again' : 'optimization.ai_summary_generate')
              )}
            </button>
          </div>
          {!aiText && !aiError && (
            <p className="mt-1 text-xs text-accent-700 dark:text-accent-300">{t('optimization.ai_summary_hint')}</p>
          )}
          {aiError && (
            <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-300">{aiError}</p>
          )}
          {aiText && (
            <p className="mt-2 text-sm text-accent-900 dark:text-accent-100 whitespace-pre-wrap">{aiText}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
