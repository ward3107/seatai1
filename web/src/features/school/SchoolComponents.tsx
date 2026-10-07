import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useLanguage } from '../../hooks/useLanguage';
import type { CaseStatus } from './types';

export function Panel({ title, hint, children, action }: { title: string; hint?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="school-panel"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{title}</h2>{hint && <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{hint}</p>}</div>{action}</div>{children}</section>;
}
export function Action({ children, onClick, secondary = false, disabled = false }: { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={secondary ? 'school-button-secondary' : 'school-button'}>{children}</button>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2 text-sm font-semibold"><span>{label}</span>{children}</label>;
}
export function Status({ status }: { status: CaseStatus }) {
  const { t } = useLanguage();
  return <span className={`school-status school-status-${status}`}>{t(`school.${status}`)}</span>;
}
export function SchoolDialog({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(true);
  const { t } = useLanguage();
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [onClose, busy]);
  return <div className="school-dialog-backdrop" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="school-dialog-title" tabIndex={-1} className="school-dialog">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900"><h2 id="school-dialog-title" className="text-lg font-bold">{title}</h2><button type="button" className="school-close" aria-label={t('school.close')} onClick={onClose} disabled={busy}><X size={22} aria-hidden="true" /></button></header>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  </div>;
}
