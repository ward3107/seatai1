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
import ComparePanel from '../features/compare/ComparePanel';
import OnboardingView from '../features/onboarding/OnboardingView';
import StudentDetailPanel from '../features/students/StudentDetailPanel';
import WelcomeTipsModal from '../components/WelcomeTipsModal';
import UserGuide from '../components/UserGuide';
import ErrorBoundary from '../components/ErrorBoundary';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';
import { useLtiImport } from '../hooks/useLtiImport';
import { getDisplayScorePct } from '../utils/seatingUtils';
import { slotCount } from '../core/layouts';
import clsx from 'clsx';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SCALE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

function App() {
  const {
    students,
    layoutDef,
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
    questionnaireOpen,
    setQuestionnaireOpen,
  } = useStore();

  const { wasmReady, isOptimizing, error, initWasm, optimize, progress, cancel } = useOptimizer();
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
    if (roomy && !welcomeTipsDismissed && students.length > 0) setShowTips(true);
  }, [welcomeTipsDismissed, students.length]);

  // On small viewports, default the sidebar to closed so the user sees
  // the seating area first. Run once on mount only — afterwards the
  // user's toggle wins.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      useStore.setState({ sidebarOpen: false });
    }
  }, []);

  // Initialize WASM on mount
  useEffect(() => {
    initWasm();
  }, [initWasm]);

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
    <div className={clsx('min-h-screen flex relative', SCALE_CLASS[uiScale])}>
      {/* Screen-reader-only live region for optimization lifecycle events. */}
      <div role="status" aria-live="polite" className="sr-only">
        {a11yAnnouncement}
      </div>

      <Sidebar
        wasmReady={wasmReady}
        isOptimizing={isOptimizing}
        error={error}
        optimize={optimize}
        progress={progress}
        cancel={cancel}
      />

      {/* Main Content — min-w-0 lets this flex child shrink below its
          content width so the seating grid's horizontal scroll stays
          inside the content area instead of widening the whole page. */}
      <main className="flex-1 flex flex-col min-w-0">
        <TopBar
          onShowCompare={() => setShowCompare(true)}
          onShowPrint={() => setShowPrint(true)}
          onShowGuide={() => setShowGuide(true)}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
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
                        {Math.round(result.computation_time_ms)}ms · {result.generations}{' '}
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

      <ComparePanel open={showCompare} onClose={() => setShowCompare(false)} />

      <QuestionnaireModal open={questionnaireOpen} onClose={() => setQuestionnaireOpen(false)} />

      {/* Student detail drawer — opens when a student is clicked from
          the grid or the sidebar student list. */}
      <StudentDetailPanel />

      {/* Welcome tips — auto-pops on first roster load (one time only). */}
      <WelcomeTipsModal open={showTips} onClose={() => setShowTips(false)} />

      {/* Comprehensive user guide — opens from the help button in the header. */}
      <UserGuide open={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}

export default App;
