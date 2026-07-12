import clsx from 'clsx';
import { Presentation, Lightbulb } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import type { LayoutDef } from '../../core/layouts';

/**
 * Class-level teacher input: "What are your lessons usually like?"
 * Evidence base:
 *   - Bicard 2012 (JABA) & Wheldall & Lam 1987 — rows outperform clusters for
 *     INDEPENDENT seat-work (~2–3× less off-task behaviour).
 *   - Johnson & Johnson (Cooperative Learning) — clusters/U-shape support
 *     discussion, group tasks, and inter-student learning.
 *   - Sommer / Adams & Biddle — semicircular / U-shape layouts increase
 *     participation in whole-class discussion.
 *
 * The teacher's answer is used to SUGGEST a layout (a non-blocking banner) —
 * not to auto-change one, so the teacher's own preference always wins. The
 * suggestion only shows when the chosen layout doesn't match the recommendation.
 */

export type LessonStyle = 'solo' | 'mixed' | 'group';

/** Best-fit layout for a given lesson-style, from the seating-arrangement
 *  literature (see file header for citations). */
export function recommendedLayoutFor(style: LessonStyle): LayoutDef['type'] {
  switch (style) {
    case 'solo': return 'rows';
    case 'group': return 'clusters';
    case 'mixed': return 'u-shape';
  }
}

export default function LessonStyleCard() {
  const { t } = useLanguage();
  const lessonStyle = useStore((s) => s.questionnaire.lessonStyle ?? null);
  const setLessonStyle = useStore((s) => s.setLessonStyle);
  const layoutDef = useStore((s) => s.layoutDef);
  const setLayoutDef = useStore((s) => s.setLayoutDef);

  const options: { id: LessonStyle; label: string }[] = [
    { id: 'solo', label: t('lessonStyle.solo') },
    { id: 'mixed', label: t('lessonStyle.mixed') },
    { id: 'group', label: t('lessonStyle.group') },
  ];

  const recommendation = lessonStyle ? recommendedLayoutFor(lessonStyle) : null;
  const showSuggestion = recommendation !== null && recommendation !== layoutDef.type;

  return (
    <div className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/60 dark:bg-primary-900/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Presentation size={16} className="text-primary-600 dark:text-primary-300 shrink-0" aria-hidden="true" />
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
          {t('lessonStyle.title')}
        </p>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        {t('lessonStyle.hint')}
      </p>
      <div role="radiogroup" aria-label={t('lessonStyle.title')} className="flex flex-wrap gap-1.5">
        {options.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={lessonStyle === id}
            onClick={() => setLessonStyle(lessonStyle === id ? null : id)}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
              lessonStyle === id
                ? 'bg-primary-100 dark:bg-primary-900/50 border-primary-400 text-primary-700 dark:text-primary-200'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {showSuggestion && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-2 flex items-start gap-2">
          <Lightbulb size={13} className="text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
            <p>
              {t('lessonStyle.recommendation', { layout: t(`layout.${recommendation.replace('-', '_')}`) })}
            </p>
            <button
              type="button"
              onClick={() => setLayoutDef({ ...layoutDef, type: recommendation })}
              className="underline font-medium hover:no-underline"
            >
              {t('lessonStyle.apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
