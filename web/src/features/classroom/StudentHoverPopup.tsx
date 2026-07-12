import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Users, Accessibility, Heart, AlertTriangle, Globe } from 'lucide-react';
import clsx from 'clsx';
import { useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import type { Student } from '../../types';

/**
 * Floating card summarising a hovered/tapped student: scores, special needs
 * and social ties. Pinned bottom-right and width-capped so it never clips on
 * phones. Renders nothing when no student is active.
 */
export default function StudentHoverPopup({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();

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
          key="popup"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className="fixed bottom-4 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow',
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
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{student.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
              <X size={15} className="text-gray-400 dark:text-gray-400" />
            </button>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-300 text-xs mb-1">
                <BookOpen size={11} /> {t('classroom.popup_academic')}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {t(`students.level_${student.academic_level}`)}
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-300">
                  {student.academic_score}%
                </span>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-2">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-300 text-xs mb-1">
                <Users size={11} /> {t('classroom.popup_behavior')}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {t(`students.behavior_${student.behavior_level}`)}
                </span>
                <span className="font-bold text-green-600 dark:text-green-300">
                  {student.behavior_score}%
                </span>
              </div>
            </div>
          </div>

          {/* Special needs */}
          {(student.requires_front_row ||
            student.requires_quiet_area ||
            student.has_mobility_issues ||
            student.special_needs.length > 0) && (
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-2 mb-3">
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-300 text-xs font-medium mb-1.5">
                <Accessibility size={11} /> {t('classroom.popup_special')}
              </div>
              <div className="flex flex-wrap gap-1">
                {student.requires_front_row && (
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-xs rounded-full">
                    {t('classroom.popup_front_row')}
                  </span>
                )}
                {student.requires_quiet_area && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs rounded-full">
                    {t('classroom.popup_quiet')}
                  </span>
                )}
                {student.has_mobility_issues && (
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-xs rounded-full">
                    {t('classroom.popup_mobility')}
                  </span>
                )}
                {student.special_needs.map((need: { type: string }) => (
                  <span
                    key={need.type}
                    className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 text-xs rounded-full"
                  >
                    {need.type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social */}
          <div className="flex gap-2">
            {student.friends_ids.length > 0 && (
              <div className="flex-1 bg-green-50 dark:bg-green-900/30 rounded-lg p-2">
                <div className="flex items-center gap-1 text-green-600 dark:text-green-300 text-xs mb-1">
                  <Heart size={11} /> {t('classroom.popup_friends')}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {student.friends_ids.length} {student.friends_ids.length === 1 ? t('classroom.popup_friend') : t('classroom.popup_friends')}
                </p>
              </div>
            )}
            {student.incompatible_ids.length > 0 && (
              <div className="flex-1 bg-red-50 dark:bg-red-900/30 rounded-lg p-2">
                <div className="flex items-center gap-1 text-red-600 dark:text-red-300 text-xs mb-1">
                  <AlertTriangle size={11} /> {t('classroom.popup_conflicts')}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {student.incompatible_ids.length} {student.incompatible_ids.length === 1 ? t('classroom.popup_conflict') : t('classroom.popup_conflicts')}
                </p>
              </div>
            )}
            {student.is_bilingual && (
              <div className="flex-1 bg-purple-50 dark:bg-purple-900/30 rounded-lg p-2">
                <div className="flex items-center gap-1 text-purple-600 dark:text-purple-300 text-xs mb-1">
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
