import { useEffect, useState } from 'react';
import { useStore } from '../../core/store';
import { useLanguage } from '../../hooks/useLanguage';
import { validSurveyAnswers } from './validateAnswers';
interface Session { sessionId: string; adminToken: string; expiresAt: number; invitations: { studentId: string; cloudId?: string; token: string }[] }
const STORAGE = 'seatai-phone-survey';
function readSession(key: string): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null') as Session | null;
    if (!value || value.expiresAt <= Date.now()) return null;
    const capability = (token: unknown) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
    return capability(value.sessionId) && capability(value.adminToken) && Number.isFinite(value.expiresAt) &&
      Array.isArray(value.invitations) && value.invitations.every(i => typeof i.studentId === 'string' && capability(i.token)) ? value : null;
  } catch { return null; }
}
export default function PhoneSurveyPanel() {
  const students = useStore(s => s.students);
  const updateStudent = useStore(s => s.updateStudent);
  const markSurveyed = useStore(s => s.markStudentSurveyed);
  const consent = useStore(s => s.questionnaire.consentAck);
  const { t, uiLanguage } = useLanguage();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const storageKey = `${STORAGE}:${students.map(s => s.id).sort().join('.')}`;
  const [session, setSession] = useState<Session | null>(() => readSession(storageKey));
  useEffect(() => { setSession(readSession(storageKey)); }, [storageKey]);
  const matching = session && session.expiresAt > Date.now() && session.invitations.length === students.length && session.invitations.every(i => students.some(s => s.id === i.studentId));
  async function request(path: string, auth: string, method = 'GET', body?: unknown) {
    const response = await fetch(path, { method, headers: { Authorization: `Bearer ${auth}`, 'Content-Type':'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) throw new Error('unavailable');
    return response.json();
  }
  async function create() {
    setBusy(true); setMessage('');
    try {
      // Do not send stable roster identifiers (which can contain a pupil name).
      const aliases = new Map<string, string>(students.map(s => [crypto.randomUUID(), s.id]));
      const next = await request('/api/surveys',code,'POST',{ studentIds:[...aliases.keys()], language:uiLanguage }) as Session;
      next.invitations = next.invitations.map(invite => {
        const studentId = aliases.get(invite.studentId);
        if (!studentId) throw new Error('Invalid invitation');
        return { ...invite, cloudId:invite.studentId, studentId };
      });
      localStorage.setItem(storageKey,JSON.stringify(next)); setSession(next); setCode('');
    } catch { setMessage(t('phoneSurvey.unavailable')); } finally { setBusy(false); }
  }
  async function collect() {
    if (!session) return;
    setBusy(true); setMessage('');
    try {
      const data = await request(`/api/surveys?sessionId=${session.sessionId}`,session.adminToken);
      let count = 0;
      for (const response of data.responses) {
        const studentId = session.invitations.find(invite => (invite.cloudId ?? invite.studentId) === response.studentId)?.studentId;
        if (students.some(s => s.id === studentId) && validSurveyAnswers(response.answers)) {
          const current = useStore.getState().students.find(s => s.id === studentId);
          if (JSON.stringify(current?.surveyAnswers) !== JSON.stringify(response.answers)) {
            updateStudent(studentId!, { surveyAnswers: response.answers, surveyReviewed:false, surveyIncludesPeers:false });
            markSurveyed(studentId!);
          }
          count++;
        }
      }
      setMessage(t('phoneSurvey.collected',{ count }));
    } catch { setMessage(t('phoneSurvey.unavailable')); } finally { setBusy(false); }
  }
  async function close() {
    if (!session) return;
    setBusy(true);
    try {
      await request(`/api/surveys?sessionId=${session.sessionId}`,session.adminToken,'DELETE');
      localStorage.removeItem(storageKey); setSession(null); setMessage(t('phoneSurvey.closed'));
    } catch { setMessage(t('phoneSurvey.unavailable')); } finally { setBusy(false); }
  }
  return <details className="rounded-xl border border-sky-200 bg-sky-50 dark:bg-gray-800 p-3">
    <summary className="font-semibold cursor-pointer">{t('phoneSurvey.title')}</summary>
    <p className="text-xs my-3">{t('phoneSurvey.intro')}</p>
    {!matching ? <>
      <label className="block text-xs mb-2">{t('phoneSurvey.schoolCode')}<input type="password" autoComplete="off" value={code} onChange={e => setCode(e.target.value)} className="block w-full border rounded-lg p-2 mt-1 dark:bg-gray-900" /></label>
      <button disabled={busy || !consent || !code || !students.length || students.length > 50 || !!session} onClick={create} className="bg-sky-700 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50">{t('phoneSurvey.create')}</button>
    </> : <>
      <p className="text-xs mb-2">{t('phoneSurvey.expires',{ date:new Date(session.expiresAt).toLocaleDateString(uiLanguage) })}</p>
      <ul className="max-h-52 overflow-auto space-y-2">
        {session.invitations.map(invite => {
          const url = `${location.origin}/#survey=${invite.token}`;
          return <li key={invite.studentId} className="flex items-center justify-between gap-2 text-xs">
            <span>{students.find(s => s.id === invite.studentId)?.name}</span>
            <button className="border rounded-lg bg-white dark:bg-gray-900 px-2 py-2" onClick={async () => {
              try { await navigator.clipboard.writeText(url); setMessage(t('phoneSurvey.copied')); }
              catch { setMessage(t('phoneSurvey.copyFailed')); }
            }}>{t('phoneSurvey.copy')}</button>
          </li>;
        })}
      </ul>
      <button disabled={busy} onClick={collect} className="mt-3 rounded-lg bg-sky-700 text-white px-3 py-2 text-sm">{t('phoneSurvey.collect')}</button>
    </>}
    {session && <button disabled={busy} onClick={close} className="mt-3 ms-2 text-xs text-rose-700 underline">{t('phoneSurvey.close')}</button>}
    <p role="status" className="text-xs mt-2">{message}</p>
  </details>;
}
