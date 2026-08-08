import { useEffect, useRef, useState } from 'react';
import { useStore } from '../core/store';
import { useLanguage } from '../hooks/useLanguage';
import { getDisplayScorePct, getScoreRating } from '../utils/seatingUtils';
import ExportButton from '../features/export/ExportButton';
import LanguageSelector from '../components/LanguageSelector';
import TextSizeToggle from '../components/TextSizeToggle';
import ThemeToggle from '../components/ThemeToggle';
import { Menu, Home, Users, Printer, Undo2, Redo2, HelpCircle, GitCompare, MoreVertical } from 'lucide-react';

interface TopBarProps {
  onShowCompare: () => void;
  onShowPrint: () => void;
  onShowGuide: () => void;
}

/**
 * App header. Structure — from the primary actions to the ambient ones:
 *   [Menu · Home] · [Undo · Redo] · Score · [Compare · Print · Export] · [⋮ display prefs]
 *
 * The four display prefs (theme / text size / language / help) live inside
 * one overflow menu so the bar has a single visual weight. They shipped
 * previously as separate top-level buttons and drowned out the primary
 * actions on small viewports.
 */
export default function TopBar({ onShowCompare, onShowPrint, onShowGuide }: TopBarProps) {
  const students = useStore((s) => s.students);
  const result = useStore((s) => s.result);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const homeView = useStore((s) => s.homeView);
  const setHomeView = useStore((s) => s.setHomeView);
  const wizardActive = useStore((s) => s.wizardActive);
  const history = useStore((s) => s.history);
  const historyFuture = useStore((s) => s.historyFuture);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const { t } = useLanguage();

  const canUndo = history.length > 0;
  const canRedo = historyFuture.length > 0;

  const [prefsOpen, setPrefsOpen] = useState(false);
  const prefsRef = useRef<HTMLDivElement>(null);

  // Dismiss the prefs menu on outside click or Escape. Only attached while
  // open so the listeners aren't always paying attention.
  useEffect(() => {
    if (!prefsOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (prefsRef.current && !prefsRef.current.contains(e.target as Node)) {
        setPrefsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPrefsOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [prefsOpen]);

  return (
    <header className="min-h-14 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center px-2 sm:px-4 gap-x-2 sm:gap-x-4 gap-y-1 py-1.5 sm:py-0">
      {!sidebarOpen && !wizardActive && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label={t('app.open_sidebar')}
        >
          <Menu size={20} className="text-gray-600 dark:text-gray-300" aria-hidden="true" />
        </button>
      )}

      {/* Home — return to the welcome/landing screen without clearing the
          class. Only meaningful once a class is loaded, we're not already
          on it, and not mid-setup. */}
      {students.length > 0 && !homeView && !wizardActive && (
        <button
          onClick={() => setHomeView(true)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label={t('app.home')}
          title={t('app.home')}
        >
          <Home size={18} className="text-gray-600 dark:text-gray-300" aria-hidden="true" />
        </button>
      )}

      <div className="flex items-center gap-1" aria-label={t('app.history_controls')} role="group">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t('app.undo')}
          title={t('app.undo')}
        >
          <Undo2 size={18} className="text-gray-600 dark:text-gray-300" aria-hidden="true" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t('app.redo')}
          title={t('app.redo')}
        >
          <Redo2 size={18} className="text-gray-600 dark:text-gray-300" aria-hidden="true" />
        </button>
      </div>

      {/* Spacer only grows once everything fits on one row (sm+). On
          phones it collapses so the controls sit right after undo/redo
          and wrap naturally. */}
      <div className="hidden sm:block sm:flex-1" />

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Student count is also shown in the sidebar header (visible on md+
            when the sidebar is docked), so surface the chip only on small
            screens where the sidebar is a hidden drawer. */}
        <div className="hidden xs:flex md:hidden items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <Users size={16} className="text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {students.length} {t('app.students')}
          </span>
        </div>

        {result && (
          <div
            className="flex items-center gap-2 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 rounded-lg"
            role="status"
            aria-label={`${t(`score.${getScoreRating(result)}`)} · ${getDisplayScorePct(result)}%`}
          >
            <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
              {t(`score.${getScoreRating(result)}`)}
            </span>
            <span className="text-xs text-primary-700/70 dark:text-primary-300/70 tabular-nums">
              {getDisplayScorePct(result)}%
            </span>
          </div>
        )}

        {result && (
          <button
            onClick={onShowCompare}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 transition-colors"
            title={t('compare.title')}
          >
            <GitCompare size={15} className="text-gray-500 dark:text-gray-400" />
            <span className="hidden sm:inline">{t('compare.button')}</span>
          </button>
        )}

        {result && (
          <button
            onClick={onShowPrint}
            data-testid="print-button"
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 transition-colors"
            title={t('app.print_title')}
          >
            <Printer size={15} className="text-gray-500 dark:text-gray-400" />
            <span className="hidden sm:inline">{t('app.print')}</span>
          </button>
        )}

        <ExportButton />

        {/* Display preferences — collapsed into a single overflow menu so
            theme / text size / language / help stop competing with the
            primary actions for visual weight. */}
        <div ref={prefsRef} className="relative">
          <button
            type="button"
            onClick={() => setPrefsOpen((v) => !v)}
            aria-label={t('app.preferences')}
            aria-expanded={prefsOpen}
            aria-haspopup="menu"
            title={t('app.preferences')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MoreVertical size={18} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </button>
          {prefsOpen && (
            <div
              role="menu"
              className="absolute top-full end-0 mt-1 min-w-[13rem] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-1.5 z-40 flex flex-col gap-0.5"
            >
              <button
                onClick={() => { setPrefsOpen(false); onShowGuide(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-start"
                role="menuitem"
              >
                <HelpCircle size={16} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
                {t('guide.title')}
              </button>
              <div className="flex items-center justify-between px-1 py-1 gap-2 border-t border-gray-100 dark:border-gray-700 mt-1 pt-2">
                <ThemeToggle />
                <TextSizeToggle />
                <LanguageSelector />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
