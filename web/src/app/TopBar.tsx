import { useStore } from '../core/store';
import { useLanguage } from '../hooks/useLanguage';
import { getDisplayScorePct } from '../utils/seatingUtils';
import ExportButton from '../features/export/ExportButton';
import LanguageSelector from '../components/LanguageSelector';
import TextSizeToggle from '../components/TextSizeToggle';
import ThemeToggle from '../components/ThemeToggle';
import { Menu, Home, Users, Printer, Undo2, Redo2, HelpCircle, GitCompare } from 'lucide-react';

interface TopBarProps {
  onShowCompare: () => void;
  onShowPrint: () => void;
  onShowGuide: () => void;
}

/**
 * App header: sidebar toggle, undo/redo, score chip, and the
 * compare / print / help / theme / language / export controls.
 * Wraps onto a second line on narrow phones instead of overflowing.
 */
export default function TopBar({ onShowCompare, onShowPrint, onShowGuide }: TopBarProps) {
  const students = useStore((s) => s.students);
  const result = useStore((s) => s.result);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const homeView = useStore((s) => s.homeView);
  const setHomeView = useStore((s) => s.setHomeView);
  const history = useStore((s) => s.history);
  const historyFuture = useStore((s) => s.historyFuture);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const { t } = useLanguage();

  const canUndo = history.length > 0;
  const canRedo = historyFuture.length > 0;

  return (
    <header className="min-h-14 bg-white/90 backdrop-blur-sm shadow-sm flex flex-wrap items-center px-2 sm:px-4 gap-x-2 sm:gap-x-4 gap-y-1 py-1.5 sm:py-0">
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={t('app.open_sidebar')}
        >
          <Menu size={20} className="text-gray-600" aria-hidden="true" />
        </button>
      )}

      {/* Home — return to the welcome/landing screen without clearing the
          class. Only meaningful once a class is loaded and we're not already
          on it. */}
      {students.length > 0 && !homeView && (
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
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t('app.undo')}
          title={t('app.undo')}
        >
          <Undo2 size={18} className="text-gray-600" aria-hidden="true" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t('app.redo')}
          title={t('app.redo')}
        >
          <Redo2 size={18} className="text-gray-600" aria-hidden="true" />
        </button>
      </div>

      {/* Spacer only grows once everything fits on one row (sm+). On
          phones it collapses so the controls sit right after undo/redo
          and wrap naturally. */}
      <div className="hidden sm:block sm:flex-1" />

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Student count is also shown in the sidebar, so hide the chip
            on the narrowest screens to save header space. */}
        <div className="hidden xs:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
          <Users size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-600">
            {students.length} {t('app.students')}
          </span>
        </div>

        {result && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-lg"
            role="status"
            aria-label={`${t('app.score')}: ${getDisplayScorePct(result)}%`}
          >
            <span className="text-sm font-medium text-green-700">
              {t('app.score')}: {getDisplayScorePct(result)}%
            </span>
          </div>
        )}

        {result && (
          <button
            onClick={onShowCompare}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            title={t('compare.title')}
          >
            <GitCompare size={15} className="text-gray-500" />
            <span className="hidden sm:inline">{t('compare.button')}</span>
          </button>
        )}

        {result && (
          <button
            onClick={onShowPrint}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            title={t('app.print_title')}
          >
            <Printer size={15} className="text-gray-500" />
            <span className="hidden sm:inline">{t('app.print')}</span>
          </button>
        )}
        <button
          onClick={onShowGuide}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label={t('guide.title')}
          title={t('guide.title')}
        >
          <HelpCircle size={18} className="text-gray-500 dark:text-slate-400" aria-hidden="true" />
        </button>
        <ThemeToggle />
        <TextSizeToggle />
        <LanguageSelector />
        <ExportButton />
      </div>
    </header>
  );
}
