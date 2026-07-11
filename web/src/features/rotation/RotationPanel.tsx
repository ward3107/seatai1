import { useState } from 'react';
import { CalendarRange, ChevronDown, ChevronUp, RefreshCw, Trash2, Minus, Plus } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { useRotationPlanner, MIN_PERIODS, MAX_PERIODS } from '../../hooks/useRotationPlanner';
import { getRotationStats } from '../../utils/rotationHistory';
import { getDisplayScorePct } from '../../utils/seatingUtils';
import clsx from 'clsx';

/**
 * Term Rotation Planner — generates a sequence of seating charts so
 * students rotate neighbours across a term, then lets the teacher flip
 * between periods (each one drives the grid / export / print like any
 * normal result).
 */
export default function RotationPanel() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(4);

  const students = useStore((s) => s.students);
  const layoutDef = useStore((s) => s.layoutDef);
  const rotationPlan = useStore((s) => s.rotationPlan);
  const activePeriodId = useStore((s) => s.activeRotationPeriodId);
  const viewRotationPeriod = useStore((s) => s.viewRotationPeriod);
  const setRotationPlan = useStore((s) => s.setRotationPlan);

  const { generating, progress, error, generatePlan } = useRotationPlanner();

  const canGenerate = students.length >= 2 && !generating;

  const handleGenerate = () => {
    void generatePlan(count, t('rotation.period_label'));
  };

  const stats =
    rotationPlan && rotationPlan.periods.length > 0
      ? getRotationStats(
          layoutDef,
          rotationPlan.periods.map((p) => {
            const positions: Record<string, { row: number; col: number }> = {};
            for (const [id, pos] of Object.entries(p.result.student_positions)) {
              positions[id] = { row: pos.row, col: pos.col };
            }
            return { positions };
          }),
        )
      : null;

  const errorText = error
    ? t(
        error === 'need-students'
          ? 'rotation.need_students'
          : error === 'too-many-students'
            ? 'rotation.too_many_students'
            : 'rotation.generate_failed',
      )
    : null;

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <CalendarRange size={18} className="text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300">{t('rotation.title')}</span>
          {rotationPlan && rotationPlan.periods.length > 0 && (
            <span className="ml-1.5 text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
              {rotationPlan.periods.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-3">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{t('rotation.description')}</p>

          {/* Period count stepper */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t('rotation.periods_label')}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCount((c) => Math.max(MIN_PERIODS, c - 1))}
                disabled={count <= MIN_PERIODS || generating}
                className="p-1 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t('rotation.fewer')}
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-sm font-semibold text-gray-700 dark:text-gray-300" aria-live="polite">
                {count}
              </span>
              <button
                onClick={() => setCount((c) => Math.min(MAX_PERIODS, c + 1))}
                disabled={count >= MAX_PERIODS || generating}
                className="p-1 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t('rotation.more')}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            aria-busy={generating}
            className="w-full py-2 px-3 bg-primary-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                {progress
                  ? t('rotation.generating_progress', { current: progress.current, total: progress.total })
                  : t('rotation.generating')}
              </>
            ) : (
              <>
                <CalendarRange size={15} />
                {rotationPlan ? t('rotation.regenerate') : t('rotation.generate')}
              </>
            )}
          </button>

          {errorText && (
            <div role="alert" className="p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 text-xs">
              {errorText}
            </div>
          )}

          {/* Generated plan */}
          {rotationPlan && rotationPlan.periods.length > 0 && !generating && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                {rotationPlan.periods.map((p) => {
                  const isActive = p.id === activePeriodId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => viewRotationPeriod(p.id)}
                      aria-pressed={isActive}
                      className={clsx(
                        'px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-1 transition-all border',
                        isActive
                          ? 'bg-primary-100 text-primary-700 border-primary-300'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-200',
                      )}
                    >
                      <span className="truncate">{p.label}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-400">{getDisplayScorePct(p.result)}%</span>
                    </button>
                  );
                })}
              </div>

              {stats && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t('rotation.coverage', { unique: stats.uniquePairs, repeats: stats.repeatPairings })}
                </p>
              )}

              <button
                onClick={() => setRotationPlan(null)}
                className="w-full py-1.5 px-3 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} />
                {t('rotation.clear')}
              </button>
            </div>
          )}

          {students.length < 2 && (
            <p className="text-[10px] text-gray-400 dark:text-gray-400">{t('rotation.need_students')}</p>
          )}
        </div>
      )}
    </div>
  );
}
