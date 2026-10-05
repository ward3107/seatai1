import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useReducedMotion } from 'framer-motion';
import StudentList from '../features/students/StudentList';
import AddStudentsPanel from '../features/import/AddStudentsPanel';
import ConstraintsPanel from '../features/constraints/ConstraintsPanel';
import QuestionnairePanel from '../features/questionnaire/QuestionnairePanel';
import ConstraintWarnings from '../features/constraints/ConstraintWarnings';
import LayoutPanel from '../features/layout/LayoutPanel';
import ErrorBoundary from '../components/ErrorBoundary';
import { useLanguage } from '../hooks/useLanguage';
import { useStore } from '../core/store';
import clsx from 'clsx';
import { X, ShieldCheck, ChevronDown, Users, LayoutGrid, ListChecks } from 'lucide-react';

const AdvancedPanels = lazy(() => import('./AdvancedPanels'));

/** Classroom settings dock on desktop and open as a drawer on smaller screens. */
export default function Sidebar() {
  const hasStudents = useStore(s => s.students.length > 0);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const setHomeView = useStore((s) => s.setHomeView);
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  // Load once on demand, then retain mounted panels to preserve edits when
  // the teacher collapses and reopens the group.
  const [advancedLoaded, setAdvancedLoaded] = useState(false);
  const [tab, setTab] = useState<'students' | 'room' | 'rules'>('students');

  // When the sidebar is collapsed it's still in the DOM (translated off-screen
  // on mobile, width:0 on desktop), so `aria-hidden` alone leaves all its
  // controls in the Tab order — keyboard users tab into invisible buttons.
  // `inert` removes the whole subtree from focus and the a11y tree. Applied
  // imperatively so it works regardless of the React version's prop typings.
  const [drawer, setDrawer] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const change = () => setDrawer(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  const asideRef = useFocusTrap<HTMLElement>(sidebarOpen && drawer);
  useLayoutEffect(() => {
    asideRef.current?.toggleAttribute('inert', !sidebarOpen);
  }, [sidebarOpen, asideRef]);

  return (
    <>
      {/* Backdrop — visible only when the sidebar is open on small screens. */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label={t('app.close_sidebar')}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Sidebar — overlay drawer on small viewports, push-style from lg+.
          Animation strategy:
            - Small: position fixed, slide via translate-x. Width fixed at
              340px (capped to 92vw). Main content is full-width
              underneath; backdrop dismisses.
            - lg+:   position relative inside flex layout. Width
              transitions 0 ↔ 340 so main content reflows. */}
      <aside
        ref={asideRef}
        className={clsx(
          'workspace-sidebar bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col shrink-0',
          sidebarOpen && 'border-e',
          'fixed inset-y-0 start-0 z-40 max-w-[92vw] w-[340px]',
          'transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full',
          // lg+: switch to flow-layout push-style. Translate becomes a
          // no-op (we're always in-flow), and width animates instead.
          'lg:relative lg:z-0 lg:translate-x-0 lg:max-w-none',
          'lg:transition-[width] lg:duration-200',
          sidebarOpen ? 'lg:w-[340px]' : 'lg:w-0',
          shouldReduceMotion && 'transition-none lg:transition-none',
        )}
        role={drawer && sidebarOpen ? 'dialog' : undefined}
        aria-modal={drawer && sidebarOpen ? true : undefined}
        onKeyDown={event => { if (event.key === 'Escape') setSidebarOpen(false); }}
        aria-label={t('app.title')}
        aria-hidden={!sidebarOpen}
      >
        <div className="w-[340px] max-w-[92vw] h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setHomeView(true);
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
              className="flex items-center gap-3 text-start rounded-lg -m-1 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={t('app.home')}
              title={t('app.home')}
            >
              <img src="/seatai-logo.svg" alt="" aria-hidden="true" className="w-10 h-10 rounded-xl" width={40} height={40} />

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

          <div role="tablist" aria-label={t('app.group_class')} className="grid grid-cols-3 gap-1 border-b border-gray-200 p-2 dark:border-gray-700">
            {(['students', 'room', 'rules'] as const).map(key => {
              const Icon = key === 'students' ? Users : key === 'room' ? LayoutGrid : ListChecks;
              return <button key={key} type="button" role="tab" id={`setup-tab-${key}`} tabIndex={tab === key ? 0 : -1} aria-selected={tab === key} aria-controls={`setup-panel-${key}`} onClick={() => setTab(key)} onKeyDown={event => {
                const keys = ['students', 'room', 'rules'] as const;
                const index = keys.indexOf(key);
                const rtl = document.documentElement.dir === 'rtl';
                const step = event.key === 'ArrowRight' ? (rtl ? -1 : 1) : event.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
                if (!step && event.key !== 'Home' && event.key !== 'End') return;
                event.preventDefault();
                const next = keys[event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + step + 3) % 3];
                setTab(next); document.getElementById(`setup-tab-${next}`)?.focus();
              }} className={clsx('flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors', tab === key ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700')}><Icon size={15} aria-hidden="true" />{t(`workspace.${key}`)}</button>;
            })}
          </div>
          <div className="flex-1 min-h-0 overflow-auto overscroll-contain p-3 space-y-4">
            <section role="tabpanel" id="setup-panel-students" aria-labelledby="setup-tab-students" hidden={tab !== 'students'} className="space-y-3">
              <ErrorBoundary name="Add Students" inline><AddStudentsPanel key={hasStudents ? 'loaded' : 'empty'} /></ErrorBoundary>
              <ErrorBoundary name="Student List" inline><StudentList /></ErrorBoundary>
              <ErrorBoundary name="Questionnaire" inline><QuestionnairePanel /></ErrorBoundary>
            </section>
            <section role="tabpanel" id="setup-panel-room" aria-labelledby="setup-tab-room" hidden={tab !== 'room'}>
              <ErrorBoundary name="Layout" inline><LayoutPanel /></ErrorBoundary>
            </section>
            <section role="tabpanel" id="setup-panel-rules" aria-labelledby="setup-tab-rules" hidden={tab !== 'rules'} className="space-y-3">
              <ErrorBoundary name="Seating Rules" inline><ConstraintsPanel /></ErrorBoundary>
              <ErrorBoundary name="Constraint Warnings" inline><ConstraintWarnings /></ErrorBoundary>
            </section>

            {/* 3 · Advanced — native <details> collapses the whole group
                so first-time teachers aren't confronted by rotation planners
                and algorithm settings. The chevron rotates via the `open`
                attribute, no JS state. */}
            <section aria-labelledby="sidebar-group-advanced">
              <details className="group" onToggle={(event) => {
                if (event.currentTarget.open) setAdvancedLoaded(true);
              }}>
                <summary
                  id="sidebar-group-advanced"
                  className="px-1 pb-2 text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 cursor-pointer list-none flex items-center justify-between hover:text-gray-700 dark:hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                >
                  <span>{t('app.group_advanced')}</span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className="transition-transform group-open:rotate-180"
                  />
                </summary>
                {advancedLoaded && (
                  <ErrorBoundary name="Advanced tools" inline>
                    <Suspense fallback={<p role="status">{t('common.loading')}</p>}>
                      <AdvancedPanels />
                    </Suspense>
                  </ErrorBoundary>
                )}
              </details>
            </section>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden w-full min-h-11 rounded-xl bg-primary-600 px-3 text-sm font-semibold text-white">{t('app.back_to_chart')}</button>
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
