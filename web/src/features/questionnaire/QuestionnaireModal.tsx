import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Users2 } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  emptyAnswers,
  answersFromStudent,
  surveyToStudentPatch,
  applyWindowPreference,
  MAX_SEATMATES,
  type SurveyAnswers,
} from './surveyMapping';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Guided, student-friendly Step-1 survey. The teacher (or the student at the
 * teacher's device) walks the roster one student at a time; answers are
 * mapped to the optimizer's fields via the pure helpers in surveyMapping.
 */
export default function QuestionnaireModal({ open, onClose }: Props) {
  const { t } = useLanguage();
  const students = useStore((s) => s.students);
  const constraints = useStore((s) => s.constraints);
  const skipPeers = useStore((s) => s.questionnaire.skipPeers);
  const surveyedIds = useStore((s) => s.questionnaire.surveyedIds);
  const updateStudent = useStore((s) => s.updateStudent);
  const setConstraints = useStore((s) => s.setConstraints);
  const markStudentSurveyed = useStore((s) => s.markStudentSurveyed);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>(emptyAnswers());

  const dialogRef = useFocusTrap<HTMLDivElement>(open);

  // When the modal opens, jump to the first not-yet-surveyed student.
  useEffect(() => {
    if (!open) return;
    const firstUnsurveyed = students.findIndex((s) => !surveyedIds.includes(s.id));
    setIdx(firstUnsurveyed === -1 ? 0 : firstUnsurveyed);
    // surveyedIds intentionally omitted — only recompute the entry point on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = students[idx];

  // Pre-fill answers from the current student's saved profile.
  useEffect(() => {
    if (!open || !current) return;
    setAnswers(answersFromStudent(current, constraints));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, open, current?.id]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !current) return null;

  const isLast = idx >= students.length - 1;
  const others = students.filter((s) => s.id !== current.id);

  const toggleSeatmate = (id: string) => {
    setAnswers((a) => {
      if (a.seatmates.includes(id)) {
        return { ...a, seatmates: a.seatmates.filter((x) => x !== id) };
      }
      if (a.seatmates.length >= MAX_SEATMATES) return a;
      return { ...a, seatmates: [...a.seatmates, id] };
    });
  };

  const save = () => {
    updateStudent(current.id, surveyToStudentPatch(current.id, answers));
    const nextConstraints = applyWindowPreference(constraints, current.id, answers.preferWindow);
    if (nextConstraints !== constraints) setConstraints(nextConstraints);
    markStudentSurveyed(current.id);
    if (isLast) {
      onClose();
    } else {
      setIdx((i) => Math.min(students.length - 1, i + 1));
    }
  };

  const choiceBtn = (selected: boolean) =>
    clsx(
      'px-3 py-2 rounded-lg text-sm font-medium border transition-all',
      selected
        ? 'bg-primary-100 text-primary-700 border-primary-300'
        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-200',
    );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('questionnaire.title')}
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-primary-500 font-semibold">
                {t('questionnaire.student_of', { current: idx + 1, total: students.length })}
              </p>
              <h2 className="text-lg font-bold text-gray-800">{current.name}</h2>
            </div>
            <button
              onClick={onClose}
              aria-label={t('questionnaire.close')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* B1 — seatmates */}
            {!skipPeers && (
              <div>
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Users2 size={15} className="text-primary-500" />
                  {t('questionnaire.q_seatmates')}
                </p>
                <p className="text-[11px] text-gray-500 mb-2">
                  {t('questionnaire.q_seatmates_hint', { max: MAX_SEATMATES })}
                </p>
                {others.length === 0 ? (
                  <p className="text-xs text-gray-400">{t('questionnaire.no_other_students')}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto">
                    {others.map((s) => {
                      const selected = answers.seatmates.includes(s.id);
                      const atMax = answers.seatmates.length >= MAX_SEATMATES;
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleSeatmate(s.id)}
                          disabled={!selected && atMax}
                          aria-pressed={selected}
                          className={clsx(
                            'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                            selected
                              ? 'bg-primary-500 text-white border-primary-500'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 disabled:opacity-40 disabled:cursor-not-allowed',
                          )}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* B3 — focus zone */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{t('questionnaire.q_focus')}</p>
              <div className="flex gap-2">
                {(['front', 'middle', 'back'] as const).map((z) => (
                  <button
                    key={z}
                    onClick={() => setAnswers((a) => ({ ...a, focusZone: a.focusZone === z ? null : z }))}
                    className={choiceBtn(answers.focusZone === z)}
                  >
                    {t(`questionnaire.focus_${z}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* B4 — noise */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{t('questionnaire.q_noise')}</p>
              <div className="flex gap-2">
                {(['yes', 'somewhat', 'no'] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setAnswers((a) => ({ ...a, noise: a.noise === n ? null : n }))}
                    className={choiceBtn(answers.noise === n)}
                  >
                    {t(`questionnaire.noise_${n}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* B5 / B6 — window + board (yes/no) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">{t('questionnaire.q_window')}</p>
                <div className="flex gap-2">
                  <button onClick={() => setAnswers((a) => ({ ...a, preferWindow: a.preferWindow === true ? null : true }))} className={choiceBtn(answers.preferWindow === true)}>
                    {t('questionnaire.yes')}
                  </button>
                  <button onClick={() => setAnswers((a) => ({ ...a, preferWindow: a.preferWindow === false ? null : false }))} className={choiceBtn(answers.preferWindow === false)}>
                    {t('questionnaire.no')}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">{t('questionnaire.q_board')}</p>
                <div className="flex gap-2">
                  <button onClick={() => setAnswers((a) => ({ ...a, needBoardClear: a.needBoardClear === true ? null : true }))} className={choiceBtn(answers.needBoardClear === true)}>
                    {t('questionnaire.yes')}
                  </button>
                  <button onClick={() => setAnswers((a) => ({ ...a, needBoardClear: a.needBoardClear === false ? null : false }))} className={choiceBtn(answers.needBoardClear === false)}>
                    {t('questionnaire.no')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 p-4 border-t border-gray-100 sticky bottom-0 bg-white">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              {t('questionnaire.back')}
            </button>

            <div className="flex items-center gap-2">
              {!isLast && (
                <button
                  onClick={() => setIdx((i) => Math.min(students.length - 1, i + 1))}
                  className="px-3 py-2 text-sm text-gray-500 rounded-lg hover:bg-gray-100"
                >
                  {t('questionnaire.skip')}
                </button>
              )}
              <button
                onClick={save}
                className="px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 flex items-center gap-1.5"
              >
                {isLast ? <Check size={16} /> : <ChevronRight size={16} />}
                {isLast ? t('questionnaire.finish') : t('questionnaire.save_next')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
