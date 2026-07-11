import { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, X, Download } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { parseCsv } from '../../utils/csvParser';

// Expected CSV columns (case-insensitive, trimmed)
// Required: name
// Optional: gender, academic_level, academic_score, behavior_level, behavior_score,
//           primary_language, is_bilingual, requires_front_row, has_mobility_issues,
//           requires_quiet_area
const TEMPLATE_HEADERS = [
  'name', 'gender', 'academic_level', 'academic_score',
  'behavior_level', 'behavior_score', 'primary_language',
  'is_bilingual', 'requires_front_row', 'has_mobility_issues', 'requires_quiet_area',
  'notes',
];

const TEMPLATE_EXAMPLE = [
  ['Alice Cohen', 'female', 'advanced', '92', 'excellent', '90', 'Hebrew', 'true', 'false', 'false', 'false', 'Strong reader, helps neighbors'],
  ['Yossi Levi', 'male', 'basic', '55', 'challenging', '48', 'Hebrew', 'false', 'true', 'false', 'false', 'Needs frequent check-ins'],
  ['Mariam Hassan', 'female', 'proficient', '75', 'good', '80', 'Arabic', 'true', 'false', 'false', 'false', ''],
];

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLE];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'seatai-roster-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

interface ImportResult {
  added: number;
  errors: string[];
  warnings: string[];
}

export default function CsvImport() {
  const addStudent = useStore((s) => s.addStudent);
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<'replace' | 'append'>('append');

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { students, errors, warnings } = parseCsv(text, t);

      if (mode === 'replace') {
        useStore.getState().setStudents([]);
      }

      students.forEach(s => addStudent(s));
      setResult({ added: students.length, errors, warnings });
    };
    reader.onerror = () => {
      setResult({ added: 0, errors: [t('csvImport.error_read_file')], warnings: [] });
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
        <span>{t('csvImport.import_mode')}</span>
        <button
          onClick={() => setMode('append')}
          className={`px-2 py-0.5 rounded-full border transition-colors ${
            mode === 'append' ? 'bg-primary-100 border-primary-400 text-primary-700' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
          }`}
        >
          {t('csvImport.add_to_class')}
        </button>
        <button
          onClick={() => setMode('replace')}
          className={`px-2 py-0.5 rounded-full border transition-colors ${
            mode === 'replace' ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-400 text-orange-700 dark:text-orange-300' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
          }`}
        >
          {t('csvImport.replace_class')}
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
      >
        <Upload size={20} className="text-gray-400 dark:text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('csvImport.drop_here').replace('<span>', '<span className="text-primary-500 underline">')}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-400">Columns: name, gender, academic_level, score…</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* Download template */}
      <button
        onClick={downloadTemplate}
        className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700 transition-colors"
      >
        <Download size={12} />
        {t('csvImport.download_template')}
      </button>

      {/* Result banner — green when clean, amber when warnings, red when errors. */}
      {result && (() => {
        const hasErrors = result.errors.length > 0;
        const hasWarnings = result.warnings.length > 0;
        const bannerCls = hasErrors
          ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
          : hasWarnings
            ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800'
            : 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800';
        const Icon = hasErrors || hasWarnings ? AlertCircle : CheckCircle2;
        const iconCls = hasErrors ? 'text-red-500 dark:text-red-400' : hasWarnings ? 'text-amber-500 dark:text-amber-400' : 'text-green-500 dark:text-green-400';
        return (
          <div className={`rounded-lg p-3 flex items-start gap-2 ${bannerCls}`}>
            <Icon size={16} className={`${iconCls} shrink-0 mt-0.5`} />
            <div className="flex-1 text-xs">
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {result.added} {t('csvImport.imported')}
              </p>
              {result.errors.map((err, i) => (
                <p key={`e-${i}`} className="text-red-700 dark:text-red-300 mt-0.5">• {err}</p>
              ))}
              {result.warnings.map((warn, i) => (
                <p key={`w-${i}`} className="text-amber-700 dark:text-amber-300 mt-0.5">• {warn}</p>
              ))}
            </div>
            <button onClick={() => setResult(null)} className="shrink-0 p-0.5 hover:bg-black/5 rounded">
              <X size={12} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        );
      })()}
    </div>
  );
}
