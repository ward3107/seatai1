/**
 * Comprehensive in-app User Guide.
 *
 * Each feature gets a numbered step-by-step walkthrough. Sections
 * collapse by default so the modal isn't overwhelming; clicking a
 * section title expands it.
 *
 * The structure (sections, icons, order) is held in code; the
 * teacher-facing copy lives in the locale files so it can be
 * translated. Each section's `body` locale string is a multi-line
 * block — newlines are rendered as paragraph breaks so the JSON
 * stays readable.
 */

import { useEffect, useState } from 'react';
import {
  X,
  BookOpenCheck,
  UserPlus,
  LayoutGrid,
  Sparkles,
  ListChecks,
  MousePointer2,
  ArrowLeftRight,
  Box,
  Download,
  Image as ImageIcon,
  Wand2,
  FolderOpen,
  Sun,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '../hooks/useLanguage';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Section {
  id: string;
  Icon: LucideIcon;
}

const SECTIONS: Section[] = [
  { id: 'getting_started', Icon: UserPlus },
  { id: 'layouts', Icon: LayoutGrid },
  { id: 'optimize', Icon: Sparkles },
  { id: 'constraints', Icon: ListChecks },
  { id: 'editing', Icon: MousePointer2 },
  { id: 'understanding', Icon: ArrowLeftRight },
  { id: 'view_3d', Icon: Box },
  { id: 'export', Icon: Download },
  { id: 'personalize', Icon: ImageIcon },
  { id: 'ai', Icon: Wand2 },
  { id: 'projects', Icon: FolderOpen },
  { id: 'accessibility', Icon: Sun },
];

export default function UserGuide({ open, onClose }: Props) {
  const { t } = useLanguage();
  // Track which sections are expanded. Default: first one open so the
  // user immediately sees the structure.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['getting_started']));
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-guide-title"
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpenCheck size={20} className="text-primary-500" />
            <h2 id="user-guide-title" className="font-bold text-gray-900 dark:text-slate-100 text-lg">
              {t('guide.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
            aria-label={t('detail.close')}
          >
            <X size={18} className="text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 px-1">
            {t('guide.intro')}
          </p>
          {SECTIONS.map(({ id, Icon }) => {
            const isOpen = expanded.has(id);
            return (
              <div
                key={id}
                className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-expanded={isOpen}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} />
                  </div>
                  <span className="flex-1 font-medium text-sm text-gray-800 dark:text-slate-200">
                    {t(`guide.section_${id}_title`)}
                  </span>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 text-sm text-gray-700 dark:text-slate-300 leading-relaxed space-y-2">
                    {t(`guide.section_${id}_body`)
                      .split('\n')
                      .filter((line) => line.trim().length > 0)
                      .map((line, i) => (
                        <p key={i} className={clsx(/^\d+\./.test(line.trim()) && 'pl-1')}>
                          {line}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium"
          >
            {t('guide.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
