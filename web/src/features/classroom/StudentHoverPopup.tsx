import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Users, Accessibility, Heart, AlertTriangle, Globe } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useStore } from '../../core/store';
import { explainPlacement } from '../../utils/explainPlacement';
import type { Student } from '../../types';

/**
 * Mouse preview next to its seat, bounded by the viewport. The pointer can
 * enter its controls; leaving both the seat and preview dismisses it.
 */
export default function StudentHoverPopup({
  student,
  onClose,
  anchor,
  onPointerEnter,
  onPointerLeave,
}: {
  student: Student | null;
  onClose: () => void;
  anchor: DOMRect | null;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useLayoutEffect(() => {
    if (!student || !anchor || !popupRef.current) return;
    const { width, height } = popupRef.current.getBoundingClientRect();
    const left = anchor.right + 8 + width <= innerWidth - 8 ? anchor.right + 8 : anchor.left - width - 8;
    setPosition({left: Math.max(8, Math.min(left, innerWidth - width - 8)), top: Math.max(8, Math.min(anchor.top, innerHeight - height - 8))});
  }, [student, anchor]);
  const { t } = useLanguage();
  const result = useStore((s) => s.result);
  const layoutDef = useStore((s) => s.layoutDef);
  const students = useStore((s) => s.students);
  const constraints = useStore((s) => s.constraints);
  const strategy = useStore((s) => s.config.seatingStrategy ?? 'mixed');
  const setDetailsTarget = useStore((s) => s.setDetailsTarget);
  const explanation = student && result
    ? explainPlacement(student, result, layoutDef, students, constraints, strategy)
    : null;
  const reasons = explanation
    ? [...explanation.reasons, ...explanation.weaknesses, ...explanation.strengths].slice(0, 4)
    : [];

  // Escape closes the popup — keyboard users would otherwise be stuck
  // with it (the popup only disappears on mouse-leave or the X button).
  useEffect(() => {
    if (!student) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [student, onClose]);

  return (
    <AnimatePresence>
      {student && (
        <motion.div
          ref={popupRef}
          data-testid="student-hover-popup"
          style={position}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onFocusCapture={onPointerEnter}
          onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onPointerLeave(); }}
          key="popup"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className="fixed w-72 max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-50"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow',
                  student.gender === 'male'
                    ? 'bg-blue-400'
                    : student.gender === 'female'
                    ? 'bg-pink-400'
                    : 'bg-purple-400'
                )}
              >
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{student.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t(`students.gender_${student.gender}`)}
                  {student.age ? `, ${t('classroom.age_years', { age: student.age })}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={t('classroom.close_popup')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X size={14} className="text-gray-400 dark:text-gray-400" />
            </button>
          </div>

          {explanation && (
            <div data-testid="placement-preview" className="mb-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 p-2.5 text-xs">
              <h4 className="font-bold mb-1">{t('placementPreview.title')}</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-2">{t('placementPreview.context')}</p>
              <ul className="space-y-1">
                {reasons.map((reason, index) => (
                  <li key={index} className={reason.tone === 'negative' ? 'text-rose-700 dark:text-rose-300' : ''}>
                    {t(reason.key, reason.vars)}
                  </li>
                ))}
              </ul>
              <button className="mt-2 font-semibold text-primary-700 dark:text-primary-300 underline" onClick={() => { setDetailsTarget(student.id); onClose(); }}>
                {t('placementPreview.details')}
              </button>
              <details className="mt-2">
                <summary className="cursor-pointer font-semibold">{t('placementPreview.research')}</summary>
                <p className="mt-1">{t('placementPreview.evidence')}</p>
                <a className="block underline mt-1" href="https://doi.org/10.1111/j.1467-9604.2008.00375.x" target="_blank" rel="noreferrer">Wannarka &amp; Ruhl (2008)</a>
                <a className="block underline mt-1" href="https://doi.org/10.1371/journal.pone.0255097" target="_blank" rel="noreferrer">Rohrer et al. (2021)</a>
              </details>
            </div>
          )}

          {/* Scores — both in the same sage family, distinguished by
              icon and label rather than by two competing hues. */}
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <div className="bg-primary-50 dark:bg-primary-900/30 rounded-lg p-2">
              <div className="flex items-center gap-1 text-primary-700 dark:text-primary-300 text-xs mb-1">
                <BookOpen size={11} /> {t('classroom.popup_academic')}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {t(`students.level_${student.academic_level}`)}
                </span>
                <span className="font-bold text-primary-700 dark:text-primary-300 tabular-nums">
                  {student.academic_score}%
                </span>
              </div>
            </div>
            <div className="bg-primary-50 dark:bg-primary-900/30 rounded-lg p-2">
              <div className="flex items-center gap-1 text-primary-700 dark:text-primary-300 text-xs mb-1">
                <Users size={11} /> {t('classroom.popup_behavior')}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {t(`students.behavior_${student.behavior_level}`)}
                </span>
                <span className="font-bold text-primary-700 dark:text-primary-300 tabular-nums">
                  {student.behavior_score}%
                </span>
              </div>
            </div>
          </div>

          {/* Special needs — the whole block reads as one accent-tinted
              note. Individual needs collapse to matching chips instead of
              four different pastels. */}
          {(student.requires_front_row ||
            student.requires_quiet_area ||
            student.has_mobility_issues ||
            student.special_needs.length > 0) && (
            <div className="bg-accent-50 dark:bg-accent-900/20 rounded-lg p-2 mb-2.5">
              <div className="flex items-center gap-1 text-accent-800 dark:text-accent-300 text-xs font-medium mb-1.5">
                <Accessibility size={11} /> {t('classroom.popup_special')}
              </div>
              <div className="flex flex-wrap gap-1">
                {student.requires_front_row && (
                  <span className="px-2 py-0.5 bg-accent-100 dark:bg-accent-900/40 text-accent-800 dark:text-accent-200 text-xs rounded-full">
                    {t('classroom.popup_front_row')}
                  </span>
                )}
                {student.requires_quiet_area && (
                  <span className="px-2 py-0.5 bg-accent-100 dark:bg-accent-900/40 text-accent-800 dark:text-accent-200 text-xs rounded-full">
                    {t('classroom.popup_quiet')}
                  </span>
                )}
                {student.has_mobility_issues && (
                  <span className="px-2 py-0.5 bg-accent-100 dark:bg-accent-900/40 text-accent-800 dark:text-accent-200 text-xs rounded-full">
                    {t('classroom.popup_mobility')}
                  </span>
                )}
                {student.special_needs.map((need: { type: string }) => (
                  <span
                    key={need.type}
                    className="px-2 py-0.5 bg-accent-100 dark:bg-accent-900/40 text-accent-800 dark:text-accent-200 text-xs rounded-full"
                  >
                    {need.type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social — friends stay sage (positive), conflicts stay in the
              rose family (semantic warning), bilingual reads neutral. */}
          <div className="flex gap-2">
            {student.friends_ids.length > 0 && (
              <div className="flex-1 bg-primary-50 dark:bg-primary-900/30 rounded-lg p-2">
                <div className="flex items-center gap-1 text-primary-700 dark:text-primary-300 text-xs mb-1">
                  <Heart size={11} /> {t('classroom.popup_friends')}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {student.friends_ids.length} {student.friends_ids.length === 1 ? t('classroom.popup_friend') : t('classroom.popup_friends')}
                </p>
              </div>
            )}
            {student.incompatible_ids.length > 0 && (
              <div className="flex-1 bg-rose-50 dark:bg-rose-900/30 rounded-lg p-2">
                <div className="flex items-center gap-1 text-rose-700 dark:text-rose-300 text-xs mb-1">
                  <AlertTriangle size={11} /> {t('classroom.popup_conflicts')}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {student.incompatible_ids.length} {student.incompatible_ids.length === 1 ? t('classroom.popup_conflict') : t('classroom.popup_conflicts')}
                </p>
              </div>
            )}
            {student.is_bilingual && (
              <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 text-xs mb-1">
                  <Globe size={11} /> {t('classroom.popup_language')}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                  {student.primary_language ?? t('classroom.popup_bilingual')}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
