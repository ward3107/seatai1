import { BookOpenCheck, Users, LayoutGrid, Sparkles, Download, ChevronDown } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

const STEPS = [
  { key: 'students', Icon: Users },
  { key: 'room', Icon: LayoutGrid },
  { key: 'arrange', Icon: Sparkles },
  { key: 'save', Icon: Download },
] as const;

/** A short, shared explanation of the actual teacher journey. */
export default function TeacherQuickGuide({ compact = false, onFullGuide }: {
  compact?: boolean;
  onFullGuide?: () => void;
}) {
  const { t } = useLanguage();
  const content = <>
    <ol className="quick-guide-steps">
      {STEPS.map(({ key, Icon }, index) => <li key={key} data-guide-step={key}>
        <span className="quick-guide-number" aria-hidden="true">{index + 1}</span>
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100"><Icon size={16} aria-hidden="true" />{t(`quickGuide.${key}_title`)}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{t(`quickGuide.${key}_body`)}</p>
        </div>
      </li>)}
    </ol>
    <p className="quick-guide-note">{t('quickGuide.device_tip')}</p>
    {onFullGuide && <button type="button" onClick={onFullGuide} className="mt-2 min-h-11 rounded-xl px-3 text-sm font-semibold text-primary-700 dark:text-primary-300">{t('quickGuide.full')}</button>}
  </>;
  if (compact) return <details className="quick-guide quick-guide-compact" data-testid="teacher-quick-guide">
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
      <BookOpenCheck size={18} className="shrink-0 text-primary-700 dark:text-primary-300" aria-hidden="true" />
      <span className="flex-1">{t('quickGuide.title')}</span>
      <ChevronDown size={16} className="quick-guide-chevron shrink-0" aria-hidden="true" />
    </summary>
    <div className="pt-3">{content}</div>
  </details>;
  return <section className="quick-guide w-full text-start" aria-label={t('quickGuide.title')} data-testid="teacher-quick-guide">
    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100"><BookOpenCheck size={20} className="text-primary-700 dark:text-primary-300" aria-hidden="true" />{t('quickGuide.title')}</h2>
    {content}
  </section>;
}
