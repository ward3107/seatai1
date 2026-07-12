import { useEffect, Suspense, lazy, useState } from 'react';
import { useStore } from '../core/store';
import { useOptimizer } from '../hooks/useOptimizer';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import ClassroomGrid from '../features/classroom/ClassroomGrid';
import MetricsPanel from '../features/optimization/MetricsPanel';
import ExplanationPanel from '../features/results/ExplanationPanel';
import QuestionnaireModal from '../features/questionnaire/QuestionnaireModal';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

// PrintView pulls in html2canvas indirectly (the user only sees it after
// clicking Print), so defer its load.
const PrintView = lazy(() => import('../features/print/PrintView'));
// Interaction-gated views — none are on the first-paint path, so splitting them
// out of the entry chunk cuts initial load. Each renders null when closed, so
// mounting only when open loses no exit animation.
const ComparePanel = lazy(() => import('../features/compare/ComparePanel'));
const UserGuide = lazy(() => import('../components/UserGuide'));
const SetupWizard = lazy(() => import('../features/wizard/SetupWizard'));
import OnboardingView from '../features/onboarding/OnboardingView';
import StudentDetailPanel from '../features/students/StudentDetailPanel';
import WelcomeTipsModal from '../components/WelcomeTipsModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { useLtiImport } from '../hooks/useLtiImport';
import { getDisplayScorePct } from '../utils/seatingUtils';
import { slotCount } from '../core/layouts';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

const SCALE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

function App() {
  // Individual selectors (not a bulk `useStore()`) so App only re-renders on
  // the slices it uses — otherwise every seat swap / lock / weight change
  // re-rendered the whole tree.
  const students = useStore((s) => s.students);
  const layoutDef = useStore((s) => s.layoutDef);
  const homeView = useStore((s) => s.homeView);
  const setHomeView = useStore((s) => s.setHomeView);
  const wizardActive = useStore((s) => s.wizardActive);
  const result = useStore((s) => s.result);
  const previousPositions = useStore((s) => s.previousPositions);
  const showMovementDiff = useStore((s) => s.showMovementDiff);
  const setShowMovementDiff = useStore((s) => s.setShowMovementDiff);
  const history = useStore((s) => s.history);
  const historyFuture = useStore((s) => s.historyFuture);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const uiScale = useStore((s) => s.uiScale);
  const resultsCollapsed = useStore((s) => s.resultsCollapsed);
  const setResultsCollapsed = useStore((s) => s.setResultsCollapsed);
  const questionnaireOpen = useStore((s) => s.questionnaireOpen);
  const setQuestionnaireOpen = useStore((s) => s.setQuestionnaireOpen);

  const { wasmReady, isOptimizing, error, optimize, progress, cancel } = useOptimizer();
  const { t } = useLanguage();
  useTheme();
  // Import a roster handed over by the LTI launch (URL fragment), if any.
  useLtiImport();

  // Off-screen live region: announces the optimization lifecycle to
  // screen-reader users. The visible button + score chip already convey
  // the same info to sighted users.
  const [a11yAnnouncement, setA11yAnnouncement] = useState('');
  useEffect(() => {
    if (isOptimizing) setA11yAnnouncement(t('a11y.optimization_started'));
  }, [isOptimizing, t]);
  useEffect(() => {
    if (result && !isOptimizing) {
      setA11yAnnouncement(
        t('a11y.optimization_complete', { score: getDisplayScorePct(result) }),
      );
    }
  }, [result, isOptimizing, t]);
  useEffect(() => {
    if (error) setA11yAnnouncement(t('a11y.optimization_failed', { error }));
  }, [error, t]);

  const [showPrint, setShowPrint] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const welcomeTipsDismissed = useStore((s) => s.welcomeTipsDismissed);
  const [showTips, setShowTips] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // Auto-show the tips modal once: when the user has students loaded
  // for the first time AND hasn't dismissed before. Skipped on small
  // screens, where a full-screen modal over a phone is intrusive and the
  // seating map matters more — the Help button still opens the full guide.
  useEffect(() => {
    const roomy = typeof window === 'undefined' || window.innerWidth >= 768;
    // Don't interrupt the guided setup wizard with the tips modal — it pops
    // once the teacher lands in the actual workspace.
    if (roomy && !welcomeTipsDismissed && students.length > 0 && !wizardActive)
      setShowTips(true);
  }, [welcomeTipsDismissed, students.length, wizardActive]);

  // On small viewports, default the sidebar to closed so the user sees
  // the seating area first. Run once on mount only — afterwards the
  // user's toggle wins.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      useStore.setState({ sidebarOpen: false });
    }
  }, []);

  // The optimizer worker is initialized by useOptimizer's own mount effect,
  // so no separate initWasm() call is needed here.

  useKeyboardShortcuts({
    canUndo: history.length > 0,
    canRedo: historyFuture.length > 0,
    undo,
    redo,
    canOptimize:
      wasmReady && !isOptimizing && students.length >= 2 && students.length <= slotCount(layoutDef),
    optimize,
  });

  return (
    <div className={clsx('h-screen overflow-hidden flex relative', SCALE_CLASS[uiScale])}>
      {/* Skip link — first focusable element, so keyboard users can jump past
          the header/sidebar straight to the seating area. Visually hidden
          until focused. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-2 focus:left-2 focus:px-3 focus:py-2 focus:bg-white focus:text-gray-900 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-primary-500"
      >
        {t('app.skip_to_content')}
      </a>

      {/* Screen-reader-only live region for optimization lifecycle events. */}
      <div role="status" aria-live="polite" className="sr-only">
        {a11yAnnouncement}
      </div>

      {/* The setup wizard takes over the whole screen, so the sidebar
          (which is where students would otherwise be added) is hidden to
          avoid two competing entry points. */}
      {!wizardActive && (
        <Sidebar
          wasmReady={wasmReady}
          isOptimizing={isOptimizing}
          error={error}
          optimize={optimize}
          progress={progress}
          cancel={cancel}
        />
      )}

      {/* Main Content — min-w-0 lets this flex child shrink below its
          content width so the seating grid's horizontal scroll stays
          inside the content area instead of widening the whole page. */}
      <main id="main-content" className="flex-1 flex flex-col min-w-0">
        {/* Reachable page heading for assistive tech. The visible brand H1
            lives in the sidebar, which is hidden/inert when collapsed (the
            mobile default), so expose a stable one here too. */}
        <h1 className="sr-only">{t('app.title')}</h1>
        <TopBar
          onShowCompare={() => setShowCompare(true)}
          onShowPrint={() => setShowPrint(true)}
          onShowGuide={() => setShowGuide(true)}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          {wizardActive ? (
            /* ── Guided setup wizard ── */
            <Suspense fallback={null}>
              <SetupWizard
                wasmReady={wasmReady}
                isOptimizing={isOptimizing}
                optimize={optimize}
                progress={progress}
                cancel={cancel}
              />
            </Suspense>
          ) : students.length === 0 || homeView ? (
            /* ── Welcome / home landing ──
               Shown automatically when the class is empty, or on demand when
               the teacher clicks Home / the logo (homeView). When a class is
               already loaded, offer a way straight back to the seating chart
               so the home screen is a detour, never a dead end. */
            <>
              {homeView && students.length > 0 && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setHomeView(false)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <ArrowLeft size={15} className="text-gray-500 dark:text-gray-400 rtl:rotate-180" aria-hidden="true" />
                    {t('app.back_to_chart')}
                  </button>
                </div>
              )}
              <OnboardingView />
            </>
          ) : (
            <>
              {/* Results disclosure: metrics + per-student explanations
                  collapse into a single bar by default so the seating map
                  dominates the viewport. Score stays visible in the header
                  for at-a-glance feedback. */}
              {result && (
                <div className="mb-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-sm">
                  <button
                    type="button"
                    onClick={() => setResultsCollapsed(!resultsCollapsed)}
                    aria-expanded={!resultsCollapsed}
                    aria-controls="results-disclosure-body"
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                  >
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">{t('optimization.results_title')}</span>
                      <span className="text-gray-400 dark:text-gray-400">·</span>
                      <span>
                        {t('app.score')}: <strong>{getDisplayScorePct(result)}%</strong>
                      </span>
                      <span className="text-gray-400 dark:text-gray-400 hidden sm:inline">·</span>
                      <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">
                        {Math.round(result.computation_time_ms)}ms · {result.generations}{' '}
                        {t('optimization.generations')}
                      </span>
                    </div>
                    {resultsCollapsed ? (
                      <ChevronDown size={18} className="text-gray-400 dark:text-gray-400" aria-hidden="true" />
                    ) : (
                      <ChevronUp size={18} className="text-gray-400 dark:text-gray-400" aria-hidden="true" />
                    )}
                  </button>

                  {!resultsCollapsed && (
                    <div id="results-disclosure-body" className="px-2 pb-2 space-y-2">
                      {/* Movement-diff toggle — only meaningful when a
                          previous run is available to compare against. */}
                      {previousPositions && (
                        <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                          <input
                            type="checkbox"
                            checked={showMovementDiff}
                            onChange={(e) => setShowMovementDiff(e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-700 text-primary-500 focus:ring-primary-500"
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

      {showCompare && (
        <Suspense fallback={null}>
          <ComparePanel open={showCompare} onClose={() => setShowCompare(false)} />
        </Suspense>
      )}

      <QuestionnaireModal open={questionnaireOpen} onClose={() => setQuestionnaireOpen(false)} />

      {/* Student detail drawer — opens when a student is clicked from
          the grid or the sidebar student list. */}
      <StudentDetailPanel />

      {/* Welcome tips — auto-pops on first roster load (one time only). */}
      <WelcomeTipsModal open={showTips} onClose={() => setShowTips(false)} />

      {/* Comprehensive user guide — opens from the help button in the header. */}
      {showGuide && (
        <Suspense fallback={null}>
          <UserGuide open={showGuide} onClose={() => setShowGuide(false)} />
        </Suspense>
      )}
    </div>
  );
}

export default App;
