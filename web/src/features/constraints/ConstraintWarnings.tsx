import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { detectConstraintConflicts } from '../../core/constraintCheck';

/**
 * Shows, before the teacher optimises, any seating rules that can't all be
 * satisfied (contradictions) or that the chosen room can't fit (capacity).
 * Renders nothing when the rules are clean.
 */
export default function ConstraintWarnings() {
  const constraints = useStore((s) => s.constraints);
  const students = useStore((s) => s.students);
  const layoutDef = useStore((s) => s.layoutDef);
  const { t } = useLanguage();

  const conflicts = useMemo(
    () => detectConstraintConflicts(constraints, students, layoutDef),
    [constraints, students, layoutDef],
  );

  if (conflicts.length === 0) return null;

  const hasError = conflicts.some((c) => c.severity === 'error');

  return (
    <div
      role="alert"
      className={
        'rounded-lg border p-2.5 text-xs ' +
        (hasError
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-900')
      }
    >
      <div className="flex items-center gap-1.5 font-semibold mb-1">
        <AlertTriangle size={13} aria-hidden="true" />
        {t('conflicts.title')}
      </div>
      <ul className="space-y-1">
        {conflicts.map((c) => (
          <li key={c.id} className="flex items-start gap-1.5 leading-snug">
            <span aria-hidden="true">{c.severity === 'error' ? '⛔' : '⚠️'}</span>
            <span>{t(c.messageKey, c.params)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
