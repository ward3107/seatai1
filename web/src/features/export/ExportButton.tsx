import { useState } from 'react';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';

export default function ExportButton() {
  const result = useStore((s) => s.result);
  const students = useStore((s) => s.students);
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<'pdf' | 'png' | null>(null);

  if (!result) return null;

  const getGrid = () => document.getElementById('seating-grid-export');

  const exportPng = async () => {
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
        `${students.length} students  |  Score: ${(result.fitness_score * 100).toFixed(1)}%  |  Generated: ${new Date().toLocaleDateString()}`,
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
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
        title={t('export.title')}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin text-gray-500" />
        ) : (
          <Download size={16} className="text-gray-500" />
        )}
        {t('export.button')}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
            <button
              onClick={exportPng}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FileImage size={16} className="text-blue-500" />
              {t('export.save_png')}
            </button>
            <button
              onClick={exportPdf}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FileText size={16} className="text-red-500" />
              {t('export.save_pdf')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
