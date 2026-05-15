import { useEffect, Suspense, lazy } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useStore } from '../core/store';
import { useOptimizer } from '../hooks/useOptimizer';
import { useState } from 'react';
import ClassroomGrid from '../features/classroom/ClassroomGrid';
import StudentList from '../features/students/StudentList';
import StudentForm from '../features/students/StudentForm';
import MetricsPanel from '../features/optimization/MetricsPanel';
import ExplanationPanel from '../features/results/ExplanationPanel';
import SettingsPanel from '../features/settings/SettingsPanel';
import ExportButton from '../features/export/ExportButton';
import CsvImport from '../features/import/CsvImport';
import ProjectManager from '../features/projects/ProjectManager';
import ConstraintsPanel from '../features/constraints/ConstraintsPanel';
import LayoutPanel from '../features/layout/LayoutPanel';

// PrintView pulls in html2canvas indirectly (the user only sees it after
// clicking Print), so defer its load.
const PrintView = lazy(() => import('../features/print/PrintView'));
import OnboardingView from '../features/onboarding/OnboardingView';
import StudentDetailPanel from '../features/students/StudentDetailPanel';
import WelcomeTipsModal from '../components/WelcomeTipsModal';
import UserGuide from '../components/UserGuide';
import LanguageSelector from '../components/LanguageSelector';
import ErrorBoundary from '../components/ErrorBoundary';
import MobileBlockScreen from '../components/MobileBlockScreen';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { useDeviceCheck } from '../hooks/useDeviceCheck';
import { getDisplayScorePct } from '../utils/seatingUtils';
import TextSizeToggle from '../components/TextSizeToggle';
import ThemeToggle from '../components/ThemeToggle';
import clsx from 'clsx';
import { Menu, X, Play, RefreshCw, Users, Printer, Undo2, Redo2, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const SCALE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

function App() {
  const {
    students,
    sidebarOpen,
    setSidebarOpen,
    result,
    previousPositions,
    showMovementDiff,
    setShowMovementDiff,
    history,
    historyFuture,
    undo,
    redo,
    uiScale,
    resultsCollapsed,
    setResultsCollapsed,
  } = useStore();

  const { wasmReady, isOptimizing, error, initWasm, optimize } = useOptimizer();
  const { t } = useLanguage();
  useTheme();
  const { isPhone } = useDeviceCheck();
  const shouldReduceMotion = useReducedMotion();
  const [showPrint, setShowPrint] = useState(false);
  const welcomeTipsDismissed = useStore((s) => s.welcomeTipsDismissed);
  const [showTips, setShowTips] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // Auto-show the tips modal once: when the user has students loaded
  // for the first time AND hasn't dismissed before.
  useEffect(() => {
    if (!welcomeTipsDismissed && students.length > 0) setShowTips(true);
  }, [welcomeTipsDismissed, students.length]);

  const canUndo = history.length > 0;
  const canRedo = historyFuture.length > 0;

  // On small viewports, default the sidebar to closed so the user sees
  // the seating area first. Run once on mount only — afterwards the
  // user's toggle wins.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      useStore.setState({ sidebarOpen: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize WASM on mount
  useEffect(() => {
    if (isPhone) return;
    initWasm();
  }, [initWasm, isPhone]);

  // Keyboard shortcuts: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z or Ctrl+Y (redo),
  // Ctrl/Cmd+Enter (run optimization). Skip when focus is in a text field so
  // we don't fight the browser's native undo on inputs.
  useEffect(() => {
    if (isPhone) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable;
      if (isEditable) return;

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (key === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          undo();
        }
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      } else if (key === 'enter') {
        if (wasmReady && !isOptimizing && students.length >= 2) {
          e.preventDefault();
          optimize();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPhone, canUndo, canRedo, undo, redo, wasmReady, isOptimizing, students.length, optimize]);

  if (isPhone) {
    return <MobileBlockScreen />;
  }

  return (
    <div className={clsx('min-h-screen flex relative', SCALE_CLASS[uiScale])}>
      {/* Backdrop — visible only when the sidebar is open on small screens. */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label={t('app.close_sidebar')}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Sidebar — overlay drawer on small viewports, push-style from md+.
          Animation strategy:
            - Small: position fixed, slide via translate-x. Width fixed at
              400px (capped to 85vw). Main content is full-width
              underneath; backdrop dismisses.
            - md+:   position relative inside flex layout. Width
              transitions 0 ↔ 400 so main content reflows. */}
      <aside
        className={clsx(
          'bg-white/95 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col',
          'fixed inset-y-0 left-0 z-40 max-w-[85vw] w-[400px]',
          'transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // md+: switch to flow-layout push-style. Translate becomes a
          // no-op (we're always in-flow), and width animates instead.
          'md:relative md:z-0 md:translate-x-0 md:max-w-none',
          'md:transition-[width] md:duration-200',
          sidebarOpen ? 'md:w-[400px]' : 'md:w-0',
          shouldReduceMotion && 'transition-none md:transition-none',
        )}
        aria-label={t('app.title')}
        aria-hidden={!sidebarOpen}
      >
        <div className="w-[400px] max-w-[85vw] h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-800">{t('app.title')}</h1>
                <p className="text-xs text-gray-500">{t('app.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t('app.close_sidebar')}
            >
              <X size={20} className="text-gray-500" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <ErrorBoundary name="Projects" inline>
              <ProjectManager />
            </ErrorBoundary>

            <ErrorBoundary name="CSV Import" inline>
              <CsvImport />
            </ErrorBoundary>

            <ErrorBoundary name="Student List" inline>
              <StudentList />
            </ErrorBoundary>

            <ErrorBoundary name="Student Form" inline>
              <StudentForm />
            </ErrorBoundary>

            <ErrorBoundary name="Layout" inline>
              <LayoutPanel />
            </ErrorBoundary>

            <ErrorBoundary name="Seating Rules" inline>
              <ConstraintsPanel />
            </ErrorBoundary>

            <ErrorBoundary name="Settings" inline>
              <SettingsPanel />
            </ErrorBoundary>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <button
              onClick={optimize}
              disabled={!wasmReady || isOptimizing || students.length < 2}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  {t('app.optimizing')}
                </>
              ) : (
                <>
                  <Play size={20} />
                  {t('app.optimize_seating')}
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {!wasmReady && !error && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-600 text-sm flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                {t('app.loading_optimizer')}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 bg-white/90 backdrop-blur-sm shadow-sm flex items-center px-4 gap-4">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t('app.open_sidebar')}
            >
              <Menu size={20} className="text-gray-600" aria-hidden="true" />
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

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
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
                onClick={() => setShowPrint(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                title={t('app.print_title')}
              >
                <Printer size={15} className="text-gray-500" />
                {t('app.print')}
              </button>
            )}
            <button
              onClick={() => setShowGuide(true)}
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

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {students.length === 0 ? (
            /* ── Onboarding empty state ── */
            <OnboardingView onOpenSidebar={() => setSidebarOpen(true)} />
          ) : (
            <>
              {/* Results disclosure: metrics + per-student explanations
                  collapse into a single bar by default so the seating map
                  dominates the viewport. Score stays visible in the header
                  for at-a-glance feedback. */}
              {result && (
                <div className="mb-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm">
                  <button
                    type="button"
                    onClick={() => setResultsCollapsed(!resultsCollapsed)}
                    aria-expanded={!resultsCollapsed}
                    aria-controls="results-disclosure-body"
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                  >
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <span className="font-semibold">{t('optimization.results_title')}</span>
                      <span className="text-gray-400">·</span>
                      <span>
                        {t('app.score')}: <strong>{getDisplayScorePct(result)}%</strong>
                      </span>
                      <span className="text-gray-400 hidden sm:inline">·</span>
                      <span className="text-gray-500 hidden sm:inline">
                        {result.computation_time_ms}ms · {result.generations}{' '}
                        {t('optimization.generations')}
                      </span>
                    </div>
                    {resultsCollapsed ? (
                      <ChevronDown size={18} className="text-gray-400" aria-hidden="true" />
                    ) : (
                      <ChevronUp size={18} className="text-gray-400" aria-hidden="true" />
                    )}
                  </button>

                  {!resultsCollapsed && (
                    <div id="results-disclosure-body" className="px-2 pb-2 space-y-2">
                      {/* Movement-diff toggle — only meaningful when a
                          previous run is available to compare against. */}
                      {previousPositions && (
                        <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 cursor-pointer hover:bg-gray-50 rounded-lg">
                          <input
                            type="checkbox"
                            checked={showMovementDiff}
                            onChange={(e) => setShowMovementDiff(e.target.checked)}
                            className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                          />
                          <span>{t('optimization.show_movement_diff')}</span>
                        </label>
                      )}
                      <ErrorBoundary name="Metrics Panel" inline>
                        <MetricsPanel />
                      </ErrorBoundary>
                      <ErrorBoundary name="Explanation Panel" inline>
                        <ExplanationPanel />
                      </ErrorBoundary>
                    </div>
                  )}
                </div>
              )}

              {/* Classroom Grid — main attraction */}
              <ErrorBoundary name="Seating Grid">
                <ClassroomGrid />
              </ErrorBoundary>
            </>
          )}
        </div>
      </main>
      {showPrint && (
        <Suspense fallback={null}>
          <PrintView onClose={() => setShowPrint(false)} />
        </Suspense>
      )}

      {/* Student detail drawer — opens when a student is clicked from
          the grid, the 3D view, or the sidebar student list. */}
      <StudentDetailPanel />

      {/* Welcome tips — auto-pops on first roster load (one time only). */}
      <WelcomeTipsModal open={showTips} onClose={() => setShowTips(false)} />

      {/* Comprehensive user guide — opens from the help button in the header. */}
      <UserGuide open={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}

export default App;
