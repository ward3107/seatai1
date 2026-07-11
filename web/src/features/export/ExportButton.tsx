import { useState } from 'react';
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
function csvCell(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function ExportButton() {
  const result = useStore((s) => s.result);
  const students = useStore((s) => s.students);
  const layoutDef = useStore((s) => s.layoutDef);
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<Loading>(null);

  // Without a roster there's nothing to export at all. A seating chart
  // (PNG / PDF) additionally needs an optimization result to render, but
  // the roster itself (CSV / JSON) can be exported any time — useful for
  // backing up or sharing a class list before optimizing.
  if (students.length === 0) return null;

  const getGrid = () => document.getElementById('seating-grid-export');

  const exportCsv = () => {
    setLoading('csv');
    setOpen(false);
    try {
      let rows: string[];
      if (result) {
        const studentMap = new Map(students.map((s) => [s.id, s]));
        // One row per seat. Empty seats included so the export reflects the
        // full classroom shape (especially for circle / cluster layouts).
        rows = [
          [
            'row', 'col', 'student_name', 'gender', 'age', 'academic_level',
            'academic_score', 'behavior_level', 'behavior_score',
            'requires_front_row', 'requires_quiet_area', 'has_mobility_issues',
            'special_needs', 'primary_language', 'is_bilingual',
          ].map(csvCell).join(','),
        ];
        for (const seat of result.layout.seats) {
          const s = seat.student_id ? studentMap.get(seat.student_id) : undefined;
          rows.push(
            [
              seat.position.row + 1,
              seat.position.col + 1,
              s?.name,
              s?.gender,
              s?.age,
              s?.academic_level,
              s?.academic_score,
              s?.behavior_level,
              s?.behavior_score,
              s?.requires_front_row ? 'yes' : '',
              s?.requires_quiet_area ? 'yes' : '',
              s?.has_mobility_issues ? 'yes' : '',
              s?.special_needs.map((n) => n.type).join('; '),
              s?.primary_language,
              s?.is_bilingual ? 'yes' : '',
            ].map(csvCell).join(','),
          );
        }
      } else {
        // Roster-only export — no seat positions yet. One row per student.
        rows = [
          [
            'student_name', 'gender', 'age', 'academic_level', 'academic_score',
            'behavior_level', 'behavior_score', 'requires_front_row',
            'requires_quiet_area', 'has_mobility_issues', 'special_needs',
            'primary_language', 'is_bilingual',
          ].map(csvCell).join(','),
        ];
        for (const s of students) {
          rows.push(
            [
              s.name,
              s.gender,
              s.age,
              s.academic_level,
              s.academic_score,
              s.behavior_level,
              s.behavior_score,
              s.requires_front_row ? 'yes' : '',
              s.requires_quiet_area ? 'yes' : '',
              s.has_mobility_issues ? 'yes' : '',
              s.special_needs.map((n) => n.type).join('; '),
              s.primary_language,
              s.is_bilingual ? 'yes' : '',
            ].map(csvCell).join(','),
          );
        }
      }
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

  const exportPng = async () => {
    if (!result) return;
    const el = getGrid();
    if (!el) return;
    setLoading('png');
    setOpen(false);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `seating-chart-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    } finally {
      setLoading(null);
    }
  };

  const exportPdf = async () => {
    if (!result) return;
    const el = getGrid();
    if (!el) return;
    setLoading('pdf');
    setOpen(false);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png');

      // A4 landscape
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Title and metadata
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('SeatAI — Classroom Seating Chart', pageW / 2, 12, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(
        `${students.length} students  |  Score: ${getDisplayScorePct(result)}%  |  Generated: ${new Date().toLocaleDateString()}`,
        pageW / 2, 18, { align: 'center' }
      );

      // Fit image below header
      const imgH = pageH - 28;
      const imgW = (canvas.width / canvas.height) * imgH;
      const imgX = (pageW - imgW) / 2;
      pdf.addImage(imgData, 'PNG', imgX, 22, imgW, imgH);

      // Warnings footer
      if (result.warnings.length > 0) {
        pdf.addPage();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Warnings', 15, 20);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        result.warnings.forEach((w, i) => {
          pdf.text(`• ${w}`, 15, 30 + i * 7);
        });
      }

      pdf.save(`seating-chart-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={!!loading}
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

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute end-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
            {/* PNG / PDF render the seating grid, so they only appear once an
                optimization result exists. CSV / JSON always work. */}
            {result && (
              <>
                <button
                  onClick={exportPng}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileImage size={16} className="text-blue-500 dark:text-blue-400" />
                  {t('export.save_png')}
                </button>
                <button
                  onClick={exportPdf}
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileSpreadsheet size={16} className="text-emerald-500 dark:text-emerald-400" />
              {t('export.save_csv')}
            </button>
            <button
              onClick={exportJson}
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
