import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { browserTextMeasure, createClassroomChart } from './classroomChart';
import { downloadChartPdf } from './chartExport';
import './print.css';

export default function PrintView({ onClose }: { onClose: () => void }) {
  const result = useStore(s => s.result);
  const students = useStore(s => s.students);
  const layout = useStore(s => s.layoutDef);
  const viewMode = useStore(s => s.viewMode);
  const projectName = useStore(s => s.projects.find(project => project.id === s.currentProjectId)?.name ?? '');
  const { t, uiLanguage } = useLanguage();
  const [title, setTitle] = useState(projectName);
  const [anonymize, setAnonymize] = useState(false);
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const measure = useMemo(browserTextMeasure, []);
  const chart = useMemo(() => result ? createClassroomChart({
    seats: result.layout.seats, students, layout, language: uiLanguage, title,
    paired: viewMode === 'pairs', anonymize, includeSensitive, measure,
  }) : null, [result, students, layout, uiLanguage, title, viewMode, anonymize, includeSensitive, measure]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, busy]);

  useEffect(() => {
    document.documentElement.classList.add('seating-print-open');
    document.body.classList.add('seating-print-open');
    return () => {
      document.documentElement.classList.remove('seating-print-open');
      document.body.classList.remove('seating-print-open');
    };
  }, []);

  if (!chart) return null;
  const ready = !busy && chart.unseatedCount === 0;
  const download = async () => {
    setBusy(true); setError(false);
    try { await downloadChartPdf(chart); } catch { setError(true); }
    finally { setBusy(false); }
  };

  // A body-level portal lets print CSS remove the whole workspace, including
  // its fixed heights and scrolling ancestors. Only this complete page prints.
  return createPortal(<div className="seating-print-portal" onClick={() => { if (!busy) onClose(); }}>
    <style>{'@media print { @page { size:A4 landscape; margin:0; } }'}</style>
    <div className="seating-print-dialog" role="dialog" aria-modal="true" aria-labelledby="print-title"
      ref={trapRef} tabIndex={-1} onClick={event => event.stopPropagation()}>
      <header className="seating-print-controls">
        <div className="seating-print-heading">
          <div><h2 id="print-title">{t('print.title')}</h2><p>{t('print.preview_hint')}</p></div>
          <button type="button" className="seating-print-close" onClick={onClose} disabled={busy} aria-label={t('common.close')}><X size={21} /></button>
        </div>
        <label className="seating-print-title-label">{t('print.class_name')}
          <input value={title} onChange={event => setTitle(event.target.value)} maxLength={100} placeholder={t('print.class_name_placeholder')} />
        </label>
        <div className="seating-print-actions">
          <button type="button" onClick={() => window.print()} disabled={!ready}><Printer size={18} />{t('print.print_button')}</button>
          <button type="button" className="seating-print-download" onClick={download} disabled={!ready}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{t('export.save_pdf')}</button>
        </div>
        <details className="seating-print-options"><summary>{t('print.options')}</summary>
          <label><input type="checkbox" checked={anonymize} onChange={event => setAnonymize(event.target.checked)} />{t('print.anonymize')}</label>
          <label><input type="checkbox" checked={includeSensitive} disabled={anonymize} onChange={event => setIncludeSensitive(event.target.checked)} />{t('privacyHub.printSensitive')}</label>
        </details>
        {chart.unseatedCount > 0 && <p role="alert">{t('print.unseated', { count: chart.unseatedCount })}</p>}
        {error && <p role="alert">{t('print.export_error')}</p>}
      </header>
      <div className="seating-print-preview">
        <div id="print-content" className="seating-print-page" dangerouslySetInnerHTML={{ __html: chart.svg }} />
      </div>
    </div>
  </div>, document.body);
}
