import { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { reviewClassroom } from '../../core/classroomReview';
import { suggestSeatingSwap } from '../../core/suggestSeatingSwap';

export default function ClassroomReview() {
  const result = useStore((s) => s.result);
  const students = useStore((s) => s.students);
  const constraints = useStore((s) => s.constraints);
  const layout = useStore((s) => s.layoutDef);
  const setDetailsTarget = useStore((s) => s.setDetailsTarget);
  const lockedSeats = useStore((s) => s.lockedSeats);
  const swapStudents = useStore((s) => s.swapStudents);
  const isOptimizing = useStore((s) => s.isOptimizing);
  const [searched, setSearched] = useState<{ result: typeof result; students: typeof students; constraints: typeof constraints; layout: typeof layout; lockedSeats: typeof lockedSeats } | null>(null);
  const [proposal, setProposal] = useState<{
    suggestion: NonNullable<ReturnType<typeof suggestSeatingSwap>>;
    result: typeof result; students: typeof students; constraints: typeof constraints;
    layout: typeof layout; lockedSeats: typeof lockedSeats;
  } | null>(null);
  const { t } = useLanguage();
  const review = useMemo(() => result ? reviewClassroom(result, students, constraints, layout) : null,
    [result, students, constraints, layout]);
  if (!review) return null;
  const currentProposal = proposal && proposal.result === result && proposal.students === students
    && proposal.constraints === constraints && proposal.layout === layout && proposal.lockedSeats === lockedSeats ? proposal : null;
  function findSuggestion() {
    if (!result) return;
    const suggestion = suggestSeatingSwap(result, students, constraints, layout, lockedSeats);
    setSearched({ result, students, constraints, layout, lockedSeats });
    setProposal(suggestion ? { suggestion, result, students, constraints, layout, lockedSeats } : null);
  }
  const studentName = (id?: string) => students.find((s) => s.id === id)?.name ?? t('classroomReview.empty');
  const attention = review.affected.length > 0 || review.missing.length > 0;
  return (
    <section aria-label={t('classroomReview.title')} data-testid="classroom-review"
      className={`mb-4 rounded-xl border p-3 ${attention
        ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100'
        : 'border-primary-200 bg-primary-50 text-primary-900 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-100'}`}>
      <div role="status" className="flex items-start gap-2 text-sm font-medium">
        {attention ? <AlertTriangle size={18} className="shrink-0" aria-hidden="true" /> : <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />}
        <span>{attention ? t('classroomReview.attention', { count: review.affected.length + review.missing.length }) : t('classroomReview.clear')}</span>
      </div>
      {attention && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer rounded focus-visible:outline focus-visible:outline-2">{t('classroomReview.details')}</summary>
          <p className="mt-2">{t('classroomReview.hint')}</p>
          {review.requiredStudents > 0 && <p className="mt-1 font-semibold">{t('classroomReview.required', { count: review.requiredStudents })}</p>}
          <ul className="mt-2 space-y-3">
            {review.affected.map((student, index) => (
              <li key={`${student.studentId}-${index}`}>
                {student.studentId ? <button type="button" onClick={() => setDetailsTarget(student.studentId!)}
                  className="font-semibold underline underline-offset-2" dir="auto">{student.name}</button> : <span dir="auto">{student.name}</span>}
                <ul className="ms-4 list-disc">
                  {student.reasons.map((reason, i) => <li key={i}>{t(reason.key, reason.params)}{reason.required && <strong> · {t('constraints.required')}</strong>}</li>)}
                </ul>
              </li>
            ))}
            {review.missing.map((student) => <li key={student.id}>{t('classroomReview.missing', { name: student.name })}</li>)}
          </ul>
          {review.affected.length > 0 && review.missing.length === 0 && (
            <div className="mt-3 border-t border-amber-200 pt-3 dark:border-amber-700">
              <button type="button" disabled={isOptimizing} onClick={findSuggestion}
                className="rounded-lg border border-current px-3 py-2 font-medium disabled:opacity-40">{t('classroomReview.suggest')}</button>
              {currentProposal && <div className="mt-2 space-y-2">
                <p>{t('classroomReview.swap', { a: studentName(currentProposal.suggestion.studentA), b: studentName(currentProposal.suggestion.studentB), before: currentProposal.suggestion.before, after: currentProposal.suggestion.after })}</p>
                <p className="text-xs">{t('classroomReview.tradeoff')}</p>
                <button type="button" disabled={isOptimizing} onClick={() => {
                  swapStudents(currentProposal.suggestion.seatA, currentProposal.suggestion.seatB);
                  setProposal(null); setSearched(null);
                }} className="rounded-lg bg-primary-700 px-3 py-2 font-semibold text-white disabled:opacity-40">{t('classroomReview.apply')}</button>
              </div>}
              {searched && searched.result === result && searched.students === students && searched.constraints === constraints && searched.layout === layout && searched.lockedSeats === lockedSeats && !proposal && <p className="mt-2">{t('classroomReview.no_swap')}</p>}
            </div>
          )}
        </details>
      )}
    </section>
  );
}
