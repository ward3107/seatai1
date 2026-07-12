import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import StudentList from '../features/students/StudentList';
import SettingsPanel from '../features/settings/SettingsPanel';
import AddStudentsPanel from '../features/import/AddStudentsPanel';
import ProjectManager from '../features/projects/ProjectManager';
import ConstraintsPanel from '../features/constraints/ConstraintsPanel';
import RotationPanel from '../features/rotation/RotationPanel';
import ArrangementsPanel from '../features/arrangements/ArrangementsPanel';
import QuestionnairePanel from '../features/questionnaire/QuestionnairePanel';
import ConstraintWarnings from '../features/constraints/ConstraintWarnings';
import LayoutPanel from '../features/layout/LayoutPanel';
import ErrorBoundary from '../components/ErrorBoundary';
import { useLanguage } from '../hooks/useLanguage';
import { useStore } from '../core/store';
import { slotCount } from '../core/layouts';
import type { OptimizerProgress } from '../hooks/useOptimizer';
import clsx from 'clsx';
import { X, Play, RefreshCw, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  wasmReady: boolean;
  isOptimizing: boolean;
  error: string | null;
  optimize: () => void;
  progress: OptimizerProgress | null;
  cancel: () => void;
}

/**
 * App sidebar: project / import / roster / rules panels plus the Optimize
 * button. Overlay drawer on small viewports, push-style from md+ —
 * see the className comments on <aside>.
 */
export default function Sidebar({ wasmReady, isOptimizing, error, optimize, progress, cancel }: SidebarProps) {
  const students = useStore((s) => s.students);
  const layoutDef = useStore((s) => s.layoutDef);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const setHomeView = useStore((s) => s.setHomeView);
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  // When the sidebar is collapsed it's still in the DOM (translated off-screen
  // on mobile, width:0 on desktop), so `aria-hidden` alone leaves all its
  // controls in the Tab order — keyboard users tab into invisible buttons.
  // `inert` removes the whole subtree from focus and the a11y tree. Applied
  // imperatively so it works regardless of the React version's prop typings.
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    asideRef.current?.toggleAttribute('inert', !sidebarOpen);
  }, [sidebarOpen]);

  return (
    <>
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
        ref={asideRef}
        className={clsx(
          'bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col',
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
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setHomeView(true);
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
              className="flex items-center gap-3 text-start rounded-lg -m-1 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={t('app.home')}
              title={t('app.home')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-800 dark:text-gray-100">{t('app.title')}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('app.subtitle')}</p>
              </div>
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={t('app.close_sidebar')}
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
            </button>
          </div>

          {/* Content — ordered by workflow: add students → review roster →
              survey → room → rules → rotation/arrangements → projects →
              settings. Each block is a self-collapsing card, collapsed by
              default, so the sidebar stays scannable. */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {/* 1 · Students — all four add-methods unified behind tabs. */}
            <ErrorBoundary name="Add Students" inline>
              <AddStudentsPanel />
            </ErrorBoundary>

            <ErrorBoundary name="Student List" inline>
              <StudentList />
            </ErrorBoundary>

            <ErrorBoundary name="Questionnaire" inline>
              <QuestionnairePanel />
            </ErrorBoundary>

            {/* 2 · Room */}
            <ErrorBoundary name="Layout" inline>
              <LayoutPanel />
            </ErrorBoundary>

            {/* 3 · Rules */}
            <ErrorBoundary name="Seating Rules" inline>
              <ConstraintsPanel />
            </ErrorBoundary>

            {/* 4 · Advanced / management */}
            <ErrorBoundary name="Rotation Planner" inline>
              <RotationPanel />
            </ErrorBoundary>

            <ErrorBoundary name="Saved Arrangements" inline>
              <ArrangementsPanel />
            </ErrorBoundary>

            <ErrorBoundary name="Projects" inline>
              <ProjectManager />
            </ErrorBoundary>

            <ErrorBoundary name="Settings" inline>
              <SettingsPanel />
            </ErrorBoundary>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {/* Surface impossible / contradictory rules before optimizing. */}
            <ErrorBoundary name="Constraint Warnings" inline>
              <ConstraintWarnings />
            </ErrorBoundary>

            <button
              onClick={optimize}
              data-testid="optimize-button"
              disabled={!wasmReady || isOptimizing || students.length < 2 || students.length > slotCount(layoutDef)}
              aria-busy={isOptimizing}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw size={20} className="animate-spin" aria-hidden="true" />
                  {t('app.optimizing')}
                </>
              ) : (
                <>
                  <Play size={20} aria-hidden="true" />
                  {t('app.optimize_seating')}
                </>
              )}
            </button>

            {/* Live progress + cancel — streamed from the worker. The bar
                tracks generations across all GA restarts; cancel returns the
                best plan found so far rather than discarding the run. */}
            {isOptimizing && progress && (
              <div className="space-y-1.5">
                <div
                  className="h-1.5 bg-gray-200 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={progress.totalGenerations}
                  aria-valuenow={progress.generation}
                  aria-label={t('optimization.progress', {
                    generation: progress.generation,
                    total: progress.totalGenerations,
                  })}
                >
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-[width] duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((progress.generation / Math.max(progress.totalGenerations, 1)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {t('optimization.progress', {
                      generation: progress.generation,
                      total: progress.totalGenerations,
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={cancel}
                    className="px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 transition-colors font-medium"
                  >
                    {t('optimization.cancel')}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {!wasmReady && !error && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-600 dark:text-blue-300 text-sm flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                {t('app.loading_optimizer')}
              </div>
            )}

            {/* Quiet privacy reassurance — always visible so IT and
                teachers know what they're trusting at a glance. */}
            <div
              className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300"
              title={t('app.privacy_local_only')}
            >
              <ShieldCheck size={11} aria-hidden="true" />
              <span>{t('app.privacy_badge')}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
