import { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, X, Download } from 'lucide-react';
import { useStore } from '../../core/store';
import { generateId } from '../../utils/sampleData';
import { useLanguage } from '../../hooks/useLanguage';
import type { Student, Gender, AcademicLevel, BehaviorLevel } from '../../types';

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

const VALID_GENDERS = ['male', 'female', 'other'];
const VALID_ACADEMIC = ['advanced', 'proficient', 'basic', 'below_basic'];
const VALID_BEHAVIOR = ['excellent', 'good', 'average', 'challenging'];
const MAX_ROSTER = 200;

function parseBool(v: string): boolean {
  return v.trim().toLowerCase() === 'true' || v.trim() === '1' || v.trim().toLowerCase() === 'yes';
}

function parseStudent(
  row: Record<string, string>,
  rowNum: number,
  warnings: string[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): Student | null {
  const name = row['name']?.trim();
  if (!name) return null;

  // Track silently-corrected values so the teacher can fix them upstream.
  const rawGender = (row['gender'] ?? '').trim().toLowerCase();
  const gender: Gender = (
    VALID_GENDERS.includes(rawGender) ? rawGender : 'other'
  ) as Gender;
  if (rawGender && !VALID_GENDERS.includes(rawGender)) {
    warnings.push(t('csvImport.warn_invalid_value', { row: rowNum, column: 'gender', value: rawGender, fallback: 'other' }));
  }

  const rawAcad = (row['academic_level'] ?? '').trim().toLowerCase();
  const academic_level: AcademicLevel = (
    VALID_ACADEMIC.includes(rawAcad) ? rawAcad : 'proficient'
  ) as AcademicLevel;
  if (rawAcad && !VALID_ACADEMIC.includes(rawAcad)) {
    warnings.push(t('csvImport.warn_invalid_value', { row: rowNum, column: 'academic_level', value: rawAcad, fallback: 'proficient' }));
  }

  const rawBeh = (row['behavior_level'] ?? '').trim().toLowerCase();
  const behavior_level: BehaviorLevel = (
    VALID_BEHAVIOR.includes(rawBeh) ? rawBeh : 'good'
  ) as BehaviorLevel;
  if (rawBeh && !VALID_BEHAVIOR.includes(rawBeh)) {
    warnings.push(t('csvImport.warn_invalid_value', { row: rowNum, column: 'behavior_level', value: rawBeh, fallback: 'good' }));
  }

  // Score ranges — flag any out-of-range value before we clamp it.
  const parseScore = (col: string, fallback: number): number => {
    const raw = row[col]?.trim();
    if (!raw) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      warnings.push(t('csvImport.warn_invalid_score', { row: rowNum, column: col, value: raw }));
      return fallback;
    }
    if (n < 0 || n > 100) {
      warnings.push(t('csvImport.warn_score_clamped', { row: rowNum, column: col, value: n }));
      return Math.min(100, Math.max(0, n));
    }
    return n;
  };

  return {
    id: generateId(),
    name,
    gender,
    academic_level,
    academic_score: parseScore('academic_score', 70),
    behavior_level,
    behavior_score: parseScore('behavior_score', 70),
    primary_language: row['primary_language']?.trim() || undefined,
    is_bilingual: parseBool(row['is_bilingual'] ?? ''),
    requires_front_row: parseBool(row['requires_front_row'] ?? ''),
    has_mobility_issues: parseBool(row['has_mobility_issues'] ?? ''),
    requires_quiet_area: parseBool(row['requires_quiet_area'] ?? ''),
    friends_ids: [],
    incompatible_ids: [],
    special_needs: [],
    notes: row['notes']?.trim() || undefined,
  };
}

function parseCsv(
  text: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): { students: Student[]; errors: string[]; warnings: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { students: [], errors: [t('csvImport.error_no_header')], warnings: [] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  if (!headers.includes('name')) {
    return { students: [], errors: [t('csvImport.error_missing_name')], warnings: [] };
  }

  const students: Student[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenNames = new Map<string, number>();

  // Cap the import — anything beyond MAX_ROSTER is almost certainly a
  // malformed file (or someone trying to DOS IndexedDB).
  const dataLines = lines.slice(1, 1 + MAX_ROSTER);
  if (lines.length - 1 > MAX_ROSTER) {
    warnings.push(t('csvImport.warn_too_many_rows', { max: MAX_ROSTER }));
  }

  dataLines.forEach((line, i) => {
    const rowNum = i + 2; // 1-indexed + header
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

    const student = parseStudent(row, rowNum, warnings, t);
    if (!student) {
      errors.push(t('csvImport.error_missing_name_row', { row: rowNum }));
      return;
    }

    // Duplicate-name detection — names should normally be unique within a
    // single class. Not a hard error (siblings can share a surname or
    // teachers can have two "Ali"s), but worth a warning.
    const key = student.name.toLowerCase();
    const seenAt = seenNames.get(key);
    if (seenAt) {
      warnings.push(t('csvImport.warn_duplicate_name', { name: student.name, first: seenAt, second: rowNum }));
    } else {
      seenNames.set(key, rowNum);
    }

    students.push(student);
  });

  return { students, errors, warnings };
}

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
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span>{t('csvImport.import_mode')}</span>
        <button
          onClick={() => setMode('append')}
          className={`px-2 py-0.5 rounded-full border transition-colors ${
            mode === 'append' ? 'bg-primary-100 border-primary-400 text-primary-700' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {t('csvImport.add_to_class')}
        </button>
        <button
          onClick={() => setMode('replace')}
          className={`px-2 py-0.5 rounded-full border transition-colors ${
            mode === 'replace' ? 'bg-orange-100 border-orange-400 text-orange-700' : 'border-gray-300 hover:border-gray-400'
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
        className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
      >
        <Upload size={20} className="text-gray-400" />
        <p className="text-sm text-gray-500 text-center">
          {t('csvImport.drop_here').replace('<span>', '<span className="text-primary-500 underline">')}
        </p>
        <p className="text-xs text-gray-400">Columns: name, gender, academic_level, score…</p>
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
          ? 'bg-red-50 border border-red-200'
          : hasWarnings
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-green-50 border border-green-200';
        const Icon = hasErrors || hasWarnings ? AlertCircle : CheckCircle2;
        const iconCls = hasErrors ? 'text-red-500' : hasWarnings ? 'text-amber-500' : 'text-green-500';
        return (
          <div className={`rounded-lg p-3 flex items-start gap-2 ${bannerCls}`}>
            <Icon size={16} className={`${iconCls} shrink-0 mt-0.5`} />
            <div className="flex-1 text-xs">
              <p className="font-medium text-gray-700">
                {result.added} {t('csvImport.imported')}
              </p>
              {result.errors.map((err, i) => (
                <p key={`e-${i}`} className="text-red-700 mt-0.5">• {err}</p>
              ))}
              {result.warnings.map((warn, i) => (
                <p key={`w-${i}`} className="text-amber-700 mt-0.5">• {warn}</p>
              ))}
            </div>
            <button onClick={() => setResult(null)} className="shrink-0 p-0.5 hover:bg-black/5 rounded">
              <X size={12} className="text-gray-500" />
            </button>
          </div>
        );
      })()}
    </div>
  );
}
