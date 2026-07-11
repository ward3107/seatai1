import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Users2, HeartHandshake } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  emptyAnswers,
  answersFromStudent,
  surveyToStudentPatch,
  applyWindowPreference,
  applyMentorPreference,
  MAX_SEATMATES,
  type SurveyAnswers,
} from './surveyMapping';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Guided Step-1 survey. Two modes:
 *  - teacher: walk the roster one student at a time (pre-filled, X of N).
 *  - student (kiosk): pass the device around — each student picks their name,
 *    answers a blank survey, and is returned to the name picker without
 *    seeing anyone else's answers.
 */
export default function QuestionnaireModal({ open, onClose }: Props) {
  const { t } = useLanguage();
  const students = useStore((s) => s.students);
  const constraints = useStore((s) => s.constraints);
  const { skipPeers, peerSurveyEnabled, simpleMode } = useStore((s) => s.questionnaire);
  const surveyedIds = useStore((s) => s.questionnaire.surveyedIds);
  const studentMode = useStore((s) => s.questionnaireStudentMode);
  const updateStudent = useStore((s) => s.updateStudent);
  const setConstraints = useStore((s) => s.setConstraints);
  const markStudentSurveyed = useStore((s) => s.markStudentSurveyed);

  const peersOn = (peerSurveyEnabled ?? true) && !skipPeers;
  const sm = !!simpleMode;

  const [idx, setIdx] = useState(0);
  const [picking, setPicking] = useState(true); // student mode: name-picker screen
  const [answers, setAnswers] = useState<SurveyAnswers>(emptyAnswers());

  const dialogRef = useFocusTrap<HTMLDivElement>(open);

  // On open: teacher mode jumps to first unsurveyed student; student mode
  // starts on the name picker.
  useEffect(() => {
    if (!open) return;
    if (studentMode) {
      setPicking(true);
    } else {
      const first = students.findIndex((s) => !surveyedIds.includes(s.id));
      setIdx(first === -1 ? 0 : first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = students[idx];

  // Pre-fill from the student's profile (teacher mode); student mode starts blank.
  useEffect(() => {
    if (!open || !current) return;
    setAnswers(studentMode ? emptyAnswers() : answersFromStudent(current, constraints));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, open, current?.id, studentMode]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const isLast = idx >= students.length - 1;
  const others = current ? students.filter((s) => s.id !== current.id) : [];
  const showPicker = studentMode && picking;

  const toggleSeatmate = (id: string) => {
    setAnswers((a) => {
      if (a.seatmates.includes(id)) return { ...a, seatmates: a.seatmates.filter((x) => x !== id) };
      if (a.seatmates.length >= MAX_SEATMATES) return a;
      return { ...a, seatmates: [...a.seatmates, id] };
    });
  };

  const save = () => {
    if (!current) return;
    const patch = surveyToStudentPatch(current.id, answers);
    // When peer questions are off, don't let the survey overwrite any
    // teacher-set friendships with an empty list.
    if (!peersOn) delete patch.friends_ids;
    updateStudent(current.id, patch);

    let next = applyWindowPreference(constraints, current.id, answers.preferWindow);
    next = applyMentorPreference(next, current.id, peersOn ? answers.helper : null);
    if (next !== constraints) setConstraints(next);

    markStudentSurveyed(current.id);

    if (studentMode) {
      setPicking(true); // back to the name picker for the next student
    } else if (isLast) {
      onClose();
    } else {
      setIdx((i) => Math.min(students.length - 1, i + 1));
    }
  };

  const choiceBtn = (selected: boolean) =>
    clsx(
      'rounded-lg font-medium border transition-all',
      sm ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm',
      selected ? 'bg-primary-100 text-primary-700 border-primary-300' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-200',
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
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto"
        >
          {/* ── Student-mode name picker ── */}
          {showPicker ? (
            <>
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className={clsx('font-bold text-gray-800 dark:text-gray-100', sm ? 'text-xl' : 'text-lg')}>
                  {t('questionnaire.pick_your_name')}
                </h2>
                <button onClick={onClose} aria-label={t('questionnaire.close')} className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5">
                {students.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-400">{t('questionnaire.no_other_students')}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {students.map((s, i) => {
                      const done = surveyedIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setIdx(i);
                            setPicking(false);
                          }}
                          className={clsx(
                            'flex items-center justify-between gap-2 rounded-lg border px-3 text-left',
                            sm ? 'py-3 text-base' : 'py-2.5 text-sm',
                            done ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-gray-600 dark:text-gray-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-300',
                          )}
                        >
                          <span className="truncate font-medium">{s.name}</span>
                          {done && <Check size={15} className="text-green-500 dark:text-green-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button onClick={onClose} className="mt-4 w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700">
                  {t('questionnaire.done')}
                </button>
              </div>
            </>
          ) : current ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                <div>
                  {!studentMode && (
                    <p className="text-[11px] uppercase tracking-wide text-primary-500 font-semibold">
                      {t('questionnaire.student_of', { current: idx + 1, total: students.length })}
                    </p>
                  )}
                  <h2 className={clsx('font-bold text-gray-800 dark:text-gray-100', sm ? 'text-xl' : 'text-lg')}>{current.name}</h2>
                </div>
                <button onClick={onClose} aria-label={t('questionnaire.close')} className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <div className={clsx('p-5', sm ? 'space-y-6' : 'space-y-5')}>
                {/* B1 — seatmates */}
                {peersOn && (
                  <div>
                    <p className={clsx('font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5', sm ? 'text-base' : 'text-sm')}>
                      <Users2 size={sm ? 18 : 15} className="text-primary-500" />
                      {t('questionnaire.q_seatmates')}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">{t('questionnaire.q_seatmates_hint', { max: MAX_SEATMATES })}</p>
                    {others.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-400">{t('questionnaire.no_other_students')}</p>
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
                                'rounded-full font-medium border transition-all',
                                sm ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs',
                                selected ? 'bg-primary-500 text-white border-primary-500' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-300 disabled:opacity-40 disabled:cursor-not-allowed',
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

                {/* B2 — mentor / helper */}
                {peersOn && others.length > 0 && (
                  <div>
                    <p className={clsx('font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5', sm ? 'text-base' : 'text-sm')}>
                      <HeartHandshake size={sm ? 18 : 15} className="text-primary-500" />
                      {t('questionnaire.q_helper')}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">{t('questionnaire.q_helper_hint')}</p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto">
                      {others.map((s) => {
                        const selected = answers.helper === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setAnswers((a) => ({ ...a, helper: selected ? null : s.id }))}
                            aria-pressed={selected}
                            className={clsx(
                              'rounded-full font-medium border transition-all',
                              sm ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs',
                              selected ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-300',
                            )}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* B3 — focus zone */}
                <div>
                  <p className={clsx('font-semibold text-gray-700 dark:text-gray-300 mb-2', sm ? 'text-base' : 'text-sm')}>{t('questionnaire.q_focus')}</p>
                  <div className="flex gap-2">
                    {(['front', 'middle', 'back'] as const).map((z) => (
                      <button key={z} onClick={() => setAnswers((a) => ({ ...a, focusZone: a.focusZone === z ? null : z }))} className={choiceBtn(answers.focusZone === z)}>
                        {t(`questionnaire.focus_${z}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* B4 — noise */}
                <div>
                  <p className={clsx('font-semibold text-gray-700 dark:text-gray-300 mb-2', sm ? 'text-base' : 'text-sm')}>{t('questionnaire.q_noise')}</p>
                  <div className="flex gap-2">
                    {(['yes', 'somewhat', 'no'] as const).map((n) => (
                      <button key={n} onClick={() => setAnswers((a) => ({ ...a, noise: a.noise === n ? null : n }))} className={choiceBtn(answers.noise === n)}>
                        {t(`questionnaire.noise_${n}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* B5 / B6 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={clsx('font-semibold text-gray-700 dark:text-gray-300 mb-2', sm ? 'text-base' : 'text-sm')}>{t('questionnaire.q_window')}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setAnswers((a) => ({ ...a, preferWindow: a.preferWindow === true ? null : true }))} className={choiceBtn(answers.preferWindow === true)}>{t('questionnaire.yes')}</button>
                      <button onClick={() => setAnswers((a) => ({ ...a, preferWindow: a.preferWindow === false ? null : false }))} className={choiceBtn(answers.preferWindow === false)}>{t('questionnaire.no')}</button>
                    </div>
                  </div>
                  <div>
                    <p className={clsx('font-semibold text-gray-700 dark:text-gray-300 mb-2', sm ? 'text-base' : 'text-sm')}>{t('questionnaire.q_board')}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setAnswers((a) => ({ ...a, needBoardClear: a.needBoardClear === true ? null : true }))} className={choiceBtn(answers.needBoardClear === true)}>{t('questionnaire.yes')}</button>
                      <button onClick={() => setAnswers((a) => ({ ...a, needBoardClear: a.needBoardClear === false ? null : false }))} className={choiceBtn(answers.needBoardClear === false)}>{t('questionnaire.no')}</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 p-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
                {studentMode ? (
                  <button onClick={() => setPicking(true)} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1">
                    <ChevronLeft size={16} />
                    {t('questionnaire.back')}
                  </button>
                ) : (
                  <button
                    onClick={() => setIdx((i) => Math.max(0, i - 1))}
                    disabled={idx === 0}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronLeft size={16} />
                    {t('questionnaire.back')}
                  </button>
                )}

                <div className="flex items-center gap-2">
                  {!studentMode && !isLast && (
                    <button onClick={() => setIdx((i) => Math.min(students.length - 1, i + 1))} className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      {t('questionnaire.skip')}
                    </button>
                  )}
                  <button onClick={save} className="px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 flex items-center gap-1.5">
                    {studentMode ? <Check size={16} /> : isLast ? <Check size={16} /> : <ChevronRight size={16} />}
                    {studentMode ? t('questionnaire.submit') : isLast ? t('questionnaire.finish') : t('questionnaire.save_next')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-sm text-gray-400 dark:text-gray-400">{t('questionnaire.no_other_students')}</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
