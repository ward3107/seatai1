import { Play, RefreshCw, Square, Users, LayoutGrid, ShieldCheck } from 'lucide-react';
import { useStore } from '../core/store';
import { slotCount } from '../core/layouts';
import { useLanguage } from '../hooks/useLanguage';
import type { OptimizerProgress } from '../hooks/useOptimizer';

interface Props {
  ready: boolean;
  busy: boolean;
  error: string | null;
  progress: OptimizerProgress | null;
  optimize: () => void;
  cancel: () => void;
}

/** Primary classroom action stays reachable even when the setup drawer is closed. */
export default function WorkspaceHeader({ ready, busy, error, progress, optimize, cancel }: Props) {
  const students = useStore(s => s.students);
  const hasResult = useStore(s => s.result !== null);
  const layout = useStore(s => s.layoutDef);
  const { t } = useLanguage();
  const capacity = slotCount(layout);
  const percent = progress ? Math.min(100, progress.generation / Math.max(1, progress.totalGenerations) * 100) : 0;
  return (
    <section className="workspace-heading" aria-label={t('workspace.title')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary-700 dark:text-primary-300"><ShieldCheck size={14} aria-hidden="true" />{t('app.privacy_badge')}</p>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{t('workspace.title')}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t(hasResult ? 'quickGuide.next_review' : 'quickGuide.next_generate')}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5"><Users size={14} />{students.length} {t('app.students')}</span>
            <span className="flex items-center gap-1.5"><LayoutGrid size={14} />{t('workspace.capacity', { count: capacity })}</span>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button type="button" onClick={() => useStore.getState().setSidebarOpen(true)} className="min-h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">{t('quickGuide.settings')}</button>
          <button type="button" data-testid="optimize-button" disabled={!ready || busy || students.length < 2 || students.length > capacity} aria-busy={busy} onClick={optimize}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <RefreshCw size={18} className="animate-spin" aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            {t(busy ? 'app.optimizing' : 'app.optimize_seating')}
          </button>
          {busy && <button type="button" onClick={cancel} className="flex min-h-12 items-center gap-1.5 rounded-xl border border-gray-300 px-3 text-sm text-gray-700 dark:text-gray-200"><Square size={14} />{t('optimization.cancel')}</button>}
        </div>
      </div>
      {busy && <div className="mt-3">
        <div role="progressbar" aria-label={t('app.optimizing')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} className="h-1.5 overflow-hidden rounded-full bg-primary-100 dark:bg-primary-900">
          <div className="h-full rounded-full bg-primary-600 transition-[width]" style={{ width: `${percent}%` }} />
        </div>
        <p role="status" className="mt-1 text-xs text-gray-500">{progress ? t('optimization.progress', { generation: progress.generation, total: progress.totalGenerations }) : t('app.loading_optimizer')}</p>
      </div>}
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
      {students.length > capacity && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{t('app.too_many_students', { students: students.length, seats: capacity })}</p>}
    </section>
  );
}
