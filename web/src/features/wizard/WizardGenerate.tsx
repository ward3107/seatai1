import { Sparkles, Users, LayoutGrid, ListChecks, RefreshCw } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { slotCount } from '../../core/layouts';
import type { OptimizerProgress } from '../../hooks/useOptimizer';

interface Props {
  wasmReady: boolean;
  isOptimizing: boolean;
  optimize: () => void;
  progress: OptimizerProgress | null;
  cancel: () => void;
}

/** Count how many seating rules the teacher has configured, across all
 *  constraint categories, so the summary can say "3 rules". */
function countRules(c: ReturnType<typeof useStore.getState>['constraints']): number {
  return (
    c.separate_pairs.length +
    c.keep_together_pairs.length +
    c.front_row_ids.length +
    c.back_row_ids.length +
    (c.aisle_ids?.length ?? 0) +
    (c.near_window_ids?.length ?? 0) +
    (c.peer_mentor_pairs?.length ?? 0)
  );
}

export default function WizardGenerate({ wasmReady, isOptimizing, optimize, progress }: Props) {
  const { t } = useLanguage();
  const students = useStore((s) => s.students);
  const layoutDef = useStore((s) => s.layoutDef);
  const constraints = useStore((s) => s.constraints);
  const closeWizard = useStore((s) => s.closeWizard);

  const seats = slotCount(layoutDef);
  const rules = countRules(constraints);
  const canGenerate = wasmReady && !isOptimizing && students.length >= 2 && students.length <= seats;

  // Layout label keys use underscores (u_shape) while the type values use
  // hyphens (u-shape), so normalize before the lookup.
  const layoutLabel = t(`layout.${layoutDef.type.replace(/-/g, '_')}`);

  const handleGenerate = () => {
    optimize();
    // Hand off to the workspace immediately; the seating chart, score and
    // explanations render there as the run completes.
    closeWizard();
  };

  const summary = [
    { icon: Users, label: t('wizard.summary_students', { count: students.length }) },
    { icon: LayoutGrid, label: t('wizard.summary_layout', { layout: layoutLabel, seats }) },
    { icon: ListChecks, label: t('wizard.summary_rules', { count: rules }) },
  ];

  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('wizard.generate_title')}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('wizard.generate_desc')}</p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {summary.map(({ icon: Icon, label }, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700/60 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300"
          >
            <Icon size={15} className="text-gray-500 dark:text-gray-400" />
            {label}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        aria-busy={isOptimizing}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 px-8 py-3.5 text-base font-semibold text-white shadow hover:shadow-lg transition-shadow disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {isOptimizing ? (
          <>
            <RefreshCw size={20} className="animate-spin" />
            {t('app.optimizing')}
          </>
        ) : (
          <>
            <Sparkles size={20} />
            {t('wizard.generate')}
          </>
        )}
      </button>

      {isOptimizing && progress && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {progress.generation}/{progress.totalGenerations} {t('optimization.generations')}
        </p>
      )}
    </div>
  );
}
