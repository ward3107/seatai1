import { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, X, Download } from 'lucide-react';
import { useStore } from '../../core/store';
import { generateId } from '../../utils/sampleData';
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
];

const TEMPLATE_EXAMPLE = [
  ['Alice Cohen', 'female', 'advanced', '92', 'excellent', '90', 'Hebrew', 'true', 'false', 'false', 'false'],
  ['Yossi Levi', 'male', 'basic', '55', 'challenging', '48', 'Hebrew', 'false', 'true', 'false', 'false'],
  ['Mariam Hassan', 'female', 'proficient', '75', 'good', '80', 'Arabic', 'true', 'false', 'false', 'false'],
];

function parseBool(v: string): boolean {
  return v.trim().toLowerCase() === 'true' || v.trim() === '1' || v.trim().toLowerCase() === 'yes';
}

function parseStudent(row: Record<string, string>): Student | null {
  const name = row['name']?.trim();
  if (!name) return null;

  const gender = (['male', 'female', 'other'].includes(row['gender']?.toLowerCase())
    ? row['gender'].toLowerCase()
    : 'other') as Gender;

  const academic_level = (['advanced', 'proficient', 'basic', 'below_basic'].includes(row['academic_level']?.toLowerCase())
    ? row['academic_level'].toLowerCase()
    : 'proficient') as AcademicLevel;

  const behavior_level = (['excellent', 'good', 'average', 'challenging'].includes(row['behavior_level']?.toLowerCase())
    ? row['behavior_level'].toLowerCase()
    : 'good') as BehaviorLevel;

  return {
    id: generateId(),
    name,
    gender,
    academic_level,
    academic_score: Math.min(100, Math.max(0, Number(row['academic_score']) || 70)),
    behavior_level,
    behavior_score: Math.min(100, Math.max(0, Number(row['behavior_score']) || 70)),
    primary_language: row['primary_language']?.trim() || undefined,
    is_bilingual: parseBool(row['is_bilingual'] ?? ''),
    requires_front_row: parseBool(row['requires_front_row'] ?? ''),
    has_mobility_issues: parseBool(row['has_mobility_issues'] ?? ''),
    requires_quiet_area: parseBool(row['requires_quiet_area'] ?? ''),
    friends_ids: [],
    incompatible_ids: [],
    special_needs: [],
  };
}

function parseCsv(text: string): { students: Student[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { students: [], errors: ['CSV must have a header row and at least one data row.'] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  if (!headers.includes('name')) {
    return { students: [], errors: ['Missing required column: "name"'] };
  }

  const students: Student[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

    const student = parseStudent(row);
    if (student) {
      students.push(student);
    } else {
      errors.push(`Row ${i + 1}: missing name — skipped`);
    }
  }

  return { students, errors };
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
}

export default function CsvImport() {
  const { addStudent } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<'replace' | 'append'>('append');

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { students, errors } = parseCsv(text);

      if (mode === 'replace') {
        useStore.getState().setStudents([]);
      }

      students.forEach(s => addStudent(s));
      setResult({ added: students.length, errors });
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
        <span>Import mode:</span>
        <button
          onClick={() => setMode('append')}
          className={`px-2 py-0.5 rounded-full border transition-colors ${
            mode === 'append' ? 'bg-primary-100 border-primary-400 text-primary-700' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          Add to class
        </button>
        <button
          onClick={() => setMode('replace')}
          className={`px-2 py-0.5 rounded-full border transition-colors ${
            mode === 'replace' ? 'bg-orange-100 border-orange-400 text-orange-700' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          Replace class
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
          Drop a CSV file here or <span className="text-primary-500 underline">browse</span>
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
        Download template CSV
      </button>

      {/* Result banner */}
      {result && (
        <div className={`rounded-lg p-3 flex items-start gap-2 ${result.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
          {result.errors.length > 0 ? (
            <AlertCircle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <p className="font-medium text-gray-700">{result.added} student{result.added !== 1 ? 's' : ''} imported</p>
            {result.errors.map((err, i) => (
              <p key={i} className="text-yellow-700 mt-0.5">{err}</p>
            ))}
          </div>
          <button onClick={() => setResult(null)} className="shrink-0 p-0.5 hover:bg-yellow-100 rounded">
            <X size={12} className="text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
}
