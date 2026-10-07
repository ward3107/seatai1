import { useState, useEffect } from 'react';
import { Download, FileImage, FileText, FileSpreadsheet, FileJson, Loader2 } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { getDisplayScorePct } from '../../utils/seatingUtils';

type Loading = 'pdf' | 'png' | 'csv' | 'json' | null;

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// CSV cell quoting — only quote when necessary and escape embedded quotes.
// Also neutralize spreadsheet formula (DDE) injection: a cell that begins with
// = + - @ (or a tab/CR that Excel strips back to one of those) is treated as a
// formula when the file is opened in Excel / Google Sheets. Student names flow
// in from Google Classroom / LTI rosters where the student controls their own
// name, so a payload like `=HYPERLINK(...)` or `=cmd|...` would execute in the
// teacher's spreadsheet. Prefix such cells with a single quote to force text.
export function csvCell(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function ExportButton() {
  const result = useStore((s) => s.result);
  const students = useStore((s) => s.students);
  const layoutDef = useStore((s) => s.layoutDef);
  const constraints = useStore((s) => s.constraints);
  const weights = useStore((s) => s.weights);
  const config = useStore((s) => s.config);
  const { t, uiLanguage } = useLanguage();
  const projectName = useStore(s => s.projects.find(project => project.id === s.currentProjectId)?.name ?? '');
  const viewMode = useStore(s => s.viewMode);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<Loading>(null);
  const [error, setError] = useState('');

  // Escape closes the menu (matching LanguageSelector), so keyboard users
  // aren't stuck with only the click-backdrop to dismiss it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Without a roster there's nothing to export at all. A seating chart
  // (PNG / PDF) additionally needs an optimization result to render, but
  // the roster itself (CSV / JSON) can be exported any time — useful for
  // backing up or sharing a class list before optimizing.
  if (students.length === 0) return null;



  const exportCsv = () => {
    setLoading('csv');
    setOpen(false);
    try {
      const studentMap = new Map(students.map(student => [student.id, student]));
      // Share seating positions without exporting pupil profiles or health needs.
      const rows = result
        ? ['row,col,name', ...result.layout.seats.map(seat => [
            seat.position.row + 1, seat.position.col + 1,
            seat.student_id ? studentMap.get(seat.student_id)?.name : '',
          ].map(csvCell).join(','))]
        : ['name', ...students.map(student => csvCell(student.name))];
      const prefix = result ? 'seating-chart' : 'roster';
      downloadBlob(
        `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`,
        rows.join('\n'),
        'text/csv;charset=utf-8',
      );
    } finally {
      setLoading(null);
    }
  };

  const exportJson = () => {
    setLoading('json');
    setOpen(false);
    try {
      // Full serializable snapshot. Seat positions + run stats are only
      // present once an optimization has produced a result.
      const payload = {
        meta: {
          exportedAt: new Date().toISOString(),
          ...(result
            ? {
                scorePct: getDisplayScorePct(result),
                generations: result.generations,
                computationMs: result.computation_time_ms,
              }
            : {}),
        },
        layoutDef,
        students,
        // The rules and tuning that produced this chart. Without them the
        // export can't be reproduced or re-imported faithfully.
        constraints,
        weights,
        config,
        seats: result ? result.layout.seats : null,
        warnings: result ? result.warnings : [],
      };
      const prefix = result ? 'seating-chart' : 'roster';
      downloadBlob(
        `${prefix}-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(payload, null, 2),
        'application/json',
      );
    } finally {
      setLoading(null);
    }
  };

  const exportChart = async (format: 'png' | 'pdf') => {
    if (!result) return;
    setLoading(format); setOpen(false); setError('');
    try {
      const [{ createClassroomChart, browserTextMeasure }, exporters] = await Promise.all([
        import('../print/classroomChart'), import('../print/chartExport'),
      ]);
      const chart = createClassroomChart({ seats: result.layout.seats, students,
        layout: layoutDef, language: uiLanguage, title: projectName,
        paired: viewMode === 'pairs', measure: browserTextMeasure() });
      if (chart.unseatedCount > 0) {
        setError(t('print.unseated', { count: chart.unseatedCount })); return;
      }
      if (format === 'pdf') await exporters.downloadChartPdf(chart);
      else await exporters.downloadChartPng(chart);
    } catch { setError(t('print.export_error')); }
    finally { setLoading(null); }
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setError(''); setOpen(v => !v); }}
        disabled={!!loading}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 transition-colors disabled:opacity-50"
        title={t('export.title')}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin text-gray-500 dark:text-gray-400" />
        ) : (
          <Download size={16} className="text-gray-500 dark:text-gray-400" />
        )}
        {t('export.button')}
      </button>

      {error && <p role="alert" className="absolute end-0 top-full z-50 mt-2 w-64 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-800 shadow-lg">{error}</p>}

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div role="menu" aria-label={t('export.title')} className="absolute end-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
            <p className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 border-b">{t('privacyHub.export_hint')}</p>
            {/* PNG / PDF render a standalone chart, so they only appear once an
                optimization result exists. CSV / JSON always work. */}
            {result && (
              <>
                <button
                  onClick={() => exportChart('png')}
                  role="menuitem"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileImage size={16} className="text-blue-500 dark:text-blue-400" />
                  {t('export.save_png')}
                </button>
                <button
                  onClick={() => exportChart('pdf')}
                  role="menuitem"
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileText size={16} className="text-red-500 dark:text-red-400" />
                  {t('export.save_pdf')}
                </button>
                <div className="border-t border-gray-100 dark:border-gray-700" />
              </>
            )}
            <button
              onClick={exportCsv}
                  role="menuitem"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileSpreadsheet size={16} className="text-emerald-500 dark:text-emerald-400" />
              {t('export.save_csv')}
            </button>
            <button
              onClick={exportJson}
                  role="menuitem"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileJson size={16} className="text-amber-500 dark:text-amber-400" />
              {t('export.save_json')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
