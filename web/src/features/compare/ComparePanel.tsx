/**
 * Side-by-side A/B comparison of two optimization runs.
 *
 * "A" is the current active result. "B" is an alternative the teacher
 * generates on demand — a fresh optimizer run with the same settings, so
 * it explores a different local optimum. The alternative is computed on
 * the main thread (an explicit, one-off action) and kept in local state,
 * so the active result and rotation history are untouched until the
 * teacher explicitly accepts B.
 */

import { useEffect, useState } from 'react';
import { X, Wand2, ArrowRight, Check, Loader2, Minus } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { ClassroomOptimizer, ROTATION_STRENGTH } from '../../core/optimizer';
import { getRecentPairPenalties } from '../../utils/rotationHistory';
import { getDisplayScorePct } from '../../utils/seatingUtils';
import type { OptimizationResult, Student } from '../../types';
import {
  compareResults,
  type ObjectiveDelta,
} from './compareUtils';

const OBJECTIVE_LABEL_KEY: Record<ObjectiveDelta['key'], string> = {
  academic_balance: 'optimization.academic_balance',
  behavioral_balance: 'optimization.behavioral_fit',
  diversity: 'optimization.diversity',
  special_needs: 'optimization.special_needs',
};

/** Compact, layout-agnostic preview: drop each student's initial at its
 *  normalized x/y so every layout type (rows, circle, U, clusters) renders
 *  without special-casing. */
function MiniSeatPreview({
  result,
  students,
}: {
  result: OptimizationResult;
  students: Student[];
}) {
  const nameById = new Map(students.map((s) => [s.id, s.name]));
  return (
    <div className="relative w-full aspect-[4/3] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      {result.layout.seats.map((seat, i) => {
        if (seat.is_empty || !seat.student_id) return null;
        const x = seat.position.x ?? (result.layout.cols > 1 ? seat.position.col / (result.layout.cols - 1) : 0.5);
        const y = seat.position.y ?? (result.layout.rows > 1 ? seat.position.row / (result.layout.rows - 1) : 0.5);
        const name = nameById.get(seat.student_id) ?? '?';
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm"
            style={{ left: `${6 + x * 88}%`, top: `${8 + y * 84}%` }}
            title={name}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}

function DeltaBadge({ delta, t }: { delta: number; t: (k: string) => string }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-gray-400" title={t('compare.same')}>
        <Minus size={11} aria-hidden="true" />0
      </span>
    );
  }
  const better = delta > 0;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 font-medium',
        better ? 'text-emerald-600' : 'text-red-500',
      )}
      title={better ? t('compare.better') : t('compare.worse')}
    >
      {better ? '▲' : '▼'} {better ? '+' : ''}{delta}
    </span>
  );
}

export default function ComparePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const result = useStore((s) => s.result);
  const students = useStore((s) => s.students);
  const layoutDef = useStore((s) => s.layoutDef);
  const weights = useStore((s) => s.weights);
  const config = useStore((s) => s.config);
  const constraints = useStore((s) => s.constraints);
  const avoidRecentNeighbors = useStore((s) => s.avoidRecentNeighbors);
  const resultHistory = useStore((s) => s.resultHistory);
  const setResult = useStore((s) => s.setResult);
  const { t } = useLanguage();

  const [alternative, setAlternative] = useState<OptimizationResult | null>(null);
  const [generating, setGenerating] = useState(false);

  const trapRef = useFocusTrap<HTMLDivElement>(open);

  // Reset the alternative whenever the modal closes so a stale B never
  // flashes on the next open.
  useEffect(() => {
    if (!open) {
      setAlternative(null);
      setGenerating(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !result) return null;

  const handleGenerate = () => {
    setGenerating(true);
    // Defer one tick so the spinner paints before the synchronous GA run
    // briefly occupies the main thread.
    setTimeout(() => {
      try {
        const optimizer = new ClassroomOptimizer(students, layoutDef);
        optimizer.setWeights(weights);
        optimizer.setConfig(config);
        optimizer.setConstraints(constraints);
        if (avoidRecentNeighbors && resultHistory.length > 0) {
          optimizer.setRotationAvoidance(
            getRecentPairPenalties(layoutDef, resultHistory),
            ROTATION_STRENGTH,
          );
        }
        setAlternative(optimizer.optimize());
      } finally {
        setGenerating(false);
      }
    }, 30);
  };

  const acceptAlternative = () => {
    if (!alternative) return;
    setResult(alternative);
    onClose();
  };

  const comparison = alternative ? compareResults(result, alternative) : null;

  return (
    <>
      <button
        type="button"
        aria-label={t('compare.close')}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
      />
      <div
        ref={trapRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-title"
        className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(820px,94vw)] max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-2xl focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 id="compare-title" className="font-bold text-gray-900 flex items-center gap-2">
            <Wand2 size={18} className="text-primary-500" aria-hidden="true" />
            {t('compare.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
            aria-label={t('compare.close')}
          >
            <X size={18} className="text-gray-500" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500">{t('compare.hint')}</p>

          <div className="grid grid-cols-2 gap-4">
            {/* ── Plan A (current) ── */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t('compare.current')}
              </h3>
              <div className="text-3xl font-bold text-gray-800">
                {getDisplayScorePct(result)}%
              </div>
              <MiniSeatPreview result={result} students={students} />
            </section>

            {/* ── Plan B (alternative) ── */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t('compare.alternative')}
              </h3>
              {alternative ? (
                <>
                  <div className="text-3xl font-bold text-gray-800 flex items-baseline gap-2">
                    {getDisplayScorePct(alternative)}%
                    {comparison && <DeltaBadge delta={comparison.overallDelta} t={t} />}
                  </div>
                  <MiniSeatPreview result={alternative} students={students} />
                </>
              ) : (
                <div className="aspect-[4/3] border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-center p-4">
                  {generating ? (
                    <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      {t('compare.generating')}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">{t('compare.no_alternative')}</span>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ── Objective deltas ── */}
          {comparison && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="text-start font-medium px-3 py-2">{t('compare.metric')}</th>
                    <th className="text-end font-medium px-3 py-2">{t('compare.current')}</th>
                    <th className="text-end font-medium px-3 py-2">{t('compare.alternative')}</th>
                    <th className="text-end font-medium px-3 py-2">{t('compare.change')}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.objectives.map((o) => (
                    <tr key={o.key} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-700">{t(OBJECTIVE_LABEL_KEY[o.key])}</td>
                      <td className="px-3 py-2 text-end tabular-nums text-gray-600">{o.a}%</td>
                      <td className="px-3 py-2 text-end tabular-nums text-gray-800 font-medium">{o.b}%</td>
                      <td className="px-3 py-2 text-end tabular-nums"><DeltaBadge delta={o.delta} t={t} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Wand2 size={16} aria-hidden="true" />
            )}
            {alternative ? t('compare.regenerate') : t('compare.generate')}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {t('compare.keep_current')}
            </button>
            <button
              type="button"
              onClick={acceptAlternative}
              disabled={!alternative}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-40 transition-colors"
            >
              <Check size={16} aria-hidden="true" />
              {t('compare.use_alternative')}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
