import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Menu, Home, Printer, Undo2, Redo2, BookOpenCheck, GitCompare, MoreVertical } from 'lucide-react';
import { useStore } from '../core/store';
import { useLanguage } from '../hooks/useLanguage';
import { getDisplayScorePct, getScoreRating } from '../utils/seatingUtils';
import ExportButton from '../features/export/ExportButton';
import LanguageSelector from '../components/LanguageSelector';
import TextSizeToggle from '../components/TextSizeToggle';
import ThemeToggle from '../components/ThemeToggle';

const PrivacyHub = lazy(() => import('../features/privacy/PrivacyHub'));

interface TopBarProps {
  onShowCompare: () => void;
  onShowPrint: () => void;
  onShowGuide: () => void;
}

/** Separate navigation from chart actions so neither crowds a phone header. */
export default function TopBar({ onShowCompare, onShowPrint, onShowGuide }: TopBarProps) {
  const students = useStore(s => s.students);
  const result = useStore(s => s.result);
  const sidebarOpen = useStore(s => s.sidebarOpen);
  const setSidebarOpen = useStore(s => s.setSidebarOpen);
  const homeView = useStore(s => s.homeView);
  const setHomeView = useStore(s => s.setHomeView);
  const wizardActive = useStore(s => s.wizardActive);
  const hasSavedProjects = useStore(s => s.projects.length > 0);
  const canUndo = useStore(s => s.history.length > 0);
  const canRedo = useStore(s => s.historyFuture.length > 0);
  const undo = useStore(s => s.undo);
  const redo = useStore(s => s.redo);
  const { t } = useLanguage();
  const workspace = students.length > 0 && !homeView && !wizardActive;
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const prefsRef = useRef<HTMLDivElement>(null);
  const prefsTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!prefsOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!prefsRef.current?.contains(event.target as Node)) setPrefsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPrefsOpen(false);
        prefsTriggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [prefsOpen]);

  return <header className="app-topbar relative z-20 shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
    <div className="topbar-navigation flex min-h-16 items-center gap-1 px-3 sm:gap-2 sm:px-5">
      {!wizardActive && (workspace || hasSavedProjects) && !sidebarOpen && <button type="button" onClick={() => setSidebarOpen(true)} className="topbar-icon" aria-label={t('app.open_sidebar')} title={workspace ? t('quickGuide.settings') : t('projects.title')}><Menu size={21} aria-hidden="true" /></button>}
      {workspace && <button type="button" onClick={() => setHomeView(true)} className="topbar-icon" aria-label={t('app.home')} title={t('app.home')}><Home size={19} aria-hidden="true" /></button>}
      <span className="flex min-w-0 items-center gap-2 font-bold tracking-tight text-gray-900 dark:text-gray-100">
        <img src="/seatai-logo.svg" width={28} height={28} className="topbar-logo h-7 w-7 rounded-lg" alt="" aria-hidden="true" />SeatAI
      </span>
      <div className="flex-1" />
      {!workspace && !wizardActive && <a className="entry-nav-link" href="#school">{t('entry.teamLogin')}</a>}
      {!workspace && <LanguageSelector />}
      <button type="button" onClick={onShowGuide} className="topbar-guide flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold text-primary-700 dark:text-primary-300" aria-label={t('guide.title')} title={t('guide.title')}><BookOpenCheck size={20} aria-hidden="true" /><span className="hidden sm:inline">{t('quickGuide.short_label')}</span></button>
      <div ref={prefsRef} className="relative">
        <button type="button" ref={prefsTriggerRef} onClick={() => setPrefsOpen(value => !value)} className="topbar-icon" aria-label={t('app.preferences')} aria-expanded={prefsOpen} aria-controls="display-preferences" title={t('app.preferences')}><MoreVertical size={20} aria-hidden="true" /></button>
        {prefsOpen && <div id="display-preferences" className="preferences-popover absolute end-0 top-full z-40 mt-2 flex w-64 flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <a href="#school" className="flex min-h-11 items-center rounded-xl px-3 text-start text-sm font-semibold text-primary-700 dark:text-primary-300">{t('school.entry')}</a>
          <button type="button" onClick={() => { setPrefsOpen(false); onShowGuide(); }} className="min-h-11 rounded-xl px-3 text-start text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">{t('guide.title')}</button>
          {workspace && result && <>
            <button type="button" onClick={() => { setPrefsOpen(false); onShowCompare(); }} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-start text-sm text-gray-700 dark:text-gray-200 sm:hidden"><GitCompare size={17} aria-hidden="true" />{t('compare.button')}</button>
            <button type="button" onClick={() => { setPrefsOpen(false); onShowPrint(); }} data-testid="mobile-print-button" className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-start text-sm text-gray-700 dark:text-gray-200 sm:hidden"><Printer size={17} aria-hidden="true" />{t('app.print')}</button>
          </>}
          <button type="button" onClick={() => { setPrefsOpen(false); setPrivacyOpen(true); }} className="min-h-11 rounded-xl px-3 text-start text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700">{t('privacyHub.title')}</button>
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700"><ThemeToggle /><TextSizeToggle /></div>
          {workspace && <LanguageSelector />}
        </div>}
      </div>
    </div>
    {workspace && <div className="topbar-chart-actions flex min-h-14 items-center gap-2 border-t border-gray-100 px-3 sm:px-5 dark:border-gray-700">
      <div className="flex items-center" role="group" aria-label={t('app.history_controls')}>
        <button type="button" onClick={undo} disabled={!canUndo} className="topbar-icon disabled:cursor-not-allowed disabled:opacity-40" aria-label={t('app.undo')} title={t('app.undo')}><Undo2 size={19} aria-hidden="true" /></button>
        <button type="button" onClick={redo} disabled={!canRedo} className="topbar-icon disabled:cursor-not-allowed disabled:opacity-40" aria-label={t('app.redo')} title={t('app.redo')}><Redo2 size={19} aria-hidden="true" /></button>
      </div>
      {result && <span className="hidden rounded-lg bg-primary-50 px-3 py-1.5 text-xs text-primary-800 dark:bg-primary-900/30 dark:text-primary-200 md:inline" role="status">{t(`score.${getScoreRating(result)}`)} · {getDisplayScorePct(result)}%</span>}
      <div className="flex-1" />
      {result && <>
        <button type="button" onClick={onShowCompare} className="hidden min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-gray-700 dark:text-gray-200 sm:flex" title={t('compare.title')}><GitCompare size={16} aria-hidden="true" />{t('compare.button')}</button>
        <button type="button" onClick={onShowPrint} data-testid="print-button" className="hidden min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-gray-700 dark:text-gray-200 sm:flex" title={t('app.print_title')}><Printer size={16} aria-hidden="true" />{t('app.print')}</button>
      </>}
      <ExportButton />
    </div>}
    {privacyOpen && <Suspense fallback={null}><PrivacyHub onClose={() => setPrivacyOpen(false)} /></Suspense>}
  </header>;
}
