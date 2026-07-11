import { useRef, useState } from 'react';
import { Database, AlertCircle, CheckCircle2, X, Loader2, ShieldCheck } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { parseOneRoster } from '../../core/roster/oneRoster';
import type { RosterClass } from '../../core/roster/types';
import { MAX_ROSTER } from '../../utils/csvParser';

/**
 * Import a class roster from a SIS's OneRoster CSV export (ClassLink,
 * PowerSchool, Infinite Campus, …). The admin/teacher uploads the OneRoster
 * CSV files (users / classes / enrollments) and we join them in-browser —
 * no server, no upload of student data anywhere.
 */
export default function OneRosterImport() {
  const { t } = useLanguage();
  const addStudent = useStore((s) => s.addStudent);
  const setStudents = useStore((s) => s.setStudents);
  const inputRef = useRef<HTMLInputElement>(null);

  const [classes, setClasses] = useState<RosterClass[]>([]);
  const [classId, setClassId] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ warnings: string[]; errors: string[] }>({ warnings: [], errors: [] });
  const [done, setDone] = useState<{ count: number; className: string } | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setDone(null);
    try {
      const read = await Promise.all(
        Array.from(files).map(async (f) => ({ name: f.name, text: await f.text() })),
      );
      const result = parseOneRoster(read);
      setClasses(result.classes);
      setClassId(result.classes[0]?.sourceId ?? '');
      setMessages({
        // Translate the parser's i18n-key:param messages here.
        warnings: result.warnings.map((w) => translateMsg(w, t)),
        errors: result.errors.map((e) => translateMsg(e, t)),
      });
    } catch {
      setMessages({ warnings: [], errors: [t('oneRoster.error')] });
    } finally {
      setBusy(false);
    }
  };

  const importRoster = () => {
    const cls = classes.find((c) => c.sourceId === classId);
    if (!cls) return;
    const students = cls.students.slice(0, MAX_ROSTER);
    if (mode === 'replace') setStudents([]);
    students.forEach((s) => addStudent(s));
    setDone({ count: students.length, className: cls.name });
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Database size={18} className="text-sky-600 dark:text-sky-300" />
        <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">{t('oneRoster.title')}</span>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded p-2 leading-snug">
        <ShieldCheck size={13} className="shrink-0 mt-0.5" />
        {t('oneRoster.hint')}
      </p>

      {/* Drop / pick zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-sky-400 hover:bg-sky-50/30 dark:hover:bg-sky-900/40 transition-colors"
      >
        {busy ? <Loader2 size={20} className="text-gray-400 dark:text-gray-400 animate-spin" /> : <Database size={20} className="text-gray-400 dark:text-gray-400" />}
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{t('oneRoster.drop_here')}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-400">users.csv · classes.csv · enrollments.csv</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {messages.errors.map((e, i) => (
        <div key={`e-${i}`} className="rounded-lg p-2.5 flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <AlertCircle size={15} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="flex-1 text-xs text-red-700 dark:text-red-300">{e}</p>
        </div>
      ))}

      {classes.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs text-gray-500 dark:text-gray-400">{t('oneRoster.choose_class')}</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-900 dark:text-gray-100"
          >
            {classes.map((c) => (
              <option key={c.sourceId} value={c.sourceId}>{c.name} ({c.students.length})</option>
            ))}
          </select>

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

          <button
            onClick={importRoster}
            disabled={!classId}
            className="w-full py-2 px-4 bg-primary-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary-600 disabled:opacity-60 transition-colors"
          >
            {t('oneRoster.import_roster')}
          </button>
        </div>
      )}

      {messages.warnings.length > 0 && (
        <div className="rounded-lg p-2.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
          {messages.warnings.map((w, i) => <p key={`w-${i}`}>• {w}</p>)}
        </div>
      )}

      {done && (
        <div className="rounded-lg p-2.5 flex items-start gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
          <CheckCircle2 size={15} className="text-green-500 dark:text-green-400 shrink-0 mt-0.5" />
          <p className="flex-1 text-xs text-gray-700 dark:text-gray-300">
            {t('oneRoster.imported_from', { count: done.count, class: done.className })}
          </p>
          <button onClick={() => setDone(null)} className="shrink-0 p-0.5 hover:bg-black/5 rounded">
            <X size={12} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
}

/** The parser emits "key:param" message tokens so it can stay pure/i18n-free.
 *  Expand them here where the translator is available. */
function translateMsg(token: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  const [key, param] = token.split(/:(.+)/);
  return param ? t(key, { file: param }) : t(key);
}
