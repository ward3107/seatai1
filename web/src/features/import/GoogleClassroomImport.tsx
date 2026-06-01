import { useState } from 'react';
import { GraduationCap, AlertCircle, CheckCircle2, X, Loader2, ShieldCheck } from 'lucide-react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { isGoogleConfigured, getAccessToken } from '../../core/roster/googleAuth';
import { fetchCourses, fetchRoster, type GoogleCourse } from '../../core/roster/googleClassroom';
import { MAX_ROSTER } from '../../utils/csvParser';

/**
 * Import a class roster directly from Google Classroom — the lowest-friction
 * way to get students in without typing or CSVs. Entirely client-side: the
 * OAuth token and student names go Google → this browser → IndexedDB, never
 * through a SeatAI server.
 *
 * Gated behind VITE_GOOGLE_CLIENT_ID; without it we show setup instructions
 * rather than a dead button.
 */
export default function GoogleClassroomImport() {
  const { t } = useLanguage();
  const addStudent = useStore((s) => s.addStudent);
  const setStudents = useStore((s) => s.setStudents);

  const configured = isGoogleConfigured();
  const [token, setToken] = useState<string | null>(null);
  const [courses, setCourses] = useState<GoogleCourse[]>([]);
  const [courseId, setCourseId] = useState<string>('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [busy, setBusy] = useState<null | 'connect' | 'import'>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ count: number; className: string } | null>(null);

  const connect = async () => {
    setError(null);
    setDone(null);
    setBusy('connect');
    try {
      const accessToken = await getAccessToken();
      const list = await fetchCourses(accessToken);
      setToken(accessToken);
      setCourses(list);
      setCourseId(list[0]?.id ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('googleImport.error'));
    } finally {
      setBusy(null);
    }
  };

  const importRoster = async () => {
    const course = courses.find((c) => c.id === courseId);
    if (!token || !course) return;
    setError(null);
    setDone(null);
    setBusy('import');
    try {
      const roster = await fetchRoster(token, course);
      const students = roster.students.slice(0, MAX_ROSTER);
      if (mode === 'replace') setStudents([]);
      students.forEach((s) => addStudent(s));
      setDone({ count: students.length, className: roster.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('googleImport.error'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
      <div className="flex items-center gap-2">
        <GraduationCap size={18} className="text-emerald-600" />
        <span className="font-medium text-gray-700 text-sm">{t('googleImport.title')}</span>
      </div>

      {!configured ? (
        <p className="text-[11px] text-gray-500 leading-snug">
          {t('googleImport.not_configured')}
        </p>
      ) : (
        <>
          {/* Privacy reassurance — this is the whole reason teachers trust it. */}
          <p className="flex items-start gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 leading-snug">
            <ShieldCheck size={13} className="shrink-0 mt-0.5" />
            {t('googleImport.privacy_note')}
          </p>

          {token === null ? (
            <button
              onClick={connect}
              disabled={busy === 'connect'}
              className="w-full py-2 px-4 bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-600 disabled:opacity-60 transition-colors"
            >
              {busy === 'connect' ? <Loader2 size={15} className="animate-spin" /> : <GraduationCap size={15} />}
              {busy === 'connect' ? t('googleImport.connecting') : t('googleImport.connect')}
            </button>
          ) : courses.length === 0 ? (
            <p className="text-xs text-gray-500">{t('googleImport.no_courses')}</p>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">{t('googleImport.choose_course')}</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Append / replace, mirroring the CSV importer. */}
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

              <button
                onClick={importRoster}
                disabled={busy === 'import' || !courseId}
                className="w-full py-2 px-4 bg-primary-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary-600 disabled:opacity-60 transition-colors"
              >
                {busy === 'import' ? <Loader2 size={15} className="animate-spin" /> : null}
                {busy === 'import' ? t('googleImport.importing') : t('googleImport.import_roster')}
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="rounded-lg p-2.5 flex items-start gap-2 bg-red-50 border border-red-200">
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="flex-1 text-xs text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="shrink-0 p-0.5 hover:bg-black/5 rounded">
            <X size={12} className="text-gray-500" />
          </button>
        </div>
      )}

      {done && (
        <div className="rounded-lg p-2.5 flex items-start gap-2 bg-green-50 border border-green-200">
          <CheckCircle2 size={15} className="text-green-500 shrink-0 mt-0.5" />
          <p className="flex-1 text-xs text-gray-700">
            {t('googleImport.imported_from', { count: done.count, class: done.className })}
          </p>
          <button onClick={() => setDone(null)} className="shrink-0 p-0.5 hover:bg-black/5 rounded">
            <X size={12} className="text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
}
