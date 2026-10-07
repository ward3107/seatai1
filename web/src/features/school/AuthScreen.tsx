import { useState, type FormEvent } from 'react';
import { LockKeyhole, Users } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { Action, Field, Panel } from './SchoolComponents';
import { schoolRequest, SchoolApiError } from './api';

export function schoolError(error: unknown, t: (key: string) => string) {
  const code = error instanceof SchoolApiError ? error.code : 'unavailable';
  return t(`school.error_${['unauthorized', 'forbidden', 'invalid_request', 'rate_limited', 'demo_only'].includes(code) ? code : 'unavailable'}`);
}
export default function AuthScreen({ available, signedIn, onReady, onDemo }: { available: boolean; signedIn: boolean; onReady: () => Promise<void>; onDemo: () => void }) {
  const { t } = useLanguage();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [create, setCreate] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      if (signedIn) {
        await schoolRequest('create_school', { payload: { name: data.get('schoolName'), displayName: data.get('displayName'), notice: data.get('notice'), noticeAcknowledged: data.get('noticeAcknowledged') === 'on' } });
        await onReady();
      } else {
        await schoolRequest(register ? 'register' : 'login', { email: data.get('email'), password: data.get('password') });
        if (register) { setMessage(t('school.registered')); setRegister(false); }
        else await onReady();
      }
    } catch (e) { setError(schoolError(e, t)); } finally { setBusy(false); }
  }
  return <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2">
    <Panel title={t('school.entry')} hint={t('school.entryHint')}><div className="space-y-4">{(['teacher', 'counselor', 'principal'] as const).map(role => <div key={role} className={`school-role-preview school-preview-${role}`}><span className="font-bold">{t(`school.${role}`)}</span><p className="mt-1 text-sm">{t(`school.${role}Title`)}</p></div>)}<Action onClick={onDemo}><Users size={18} aria-hidden="true" />{t('school.tryDemo')}</Action><p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t('school.demoHint')}</p></div></Panel>
    <Panel title={t(signedIn ? 'school.createSchool' : 'school.login')}>
      {!available ? <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800"><LockKeyhole className="mb-3 text-slate-500" size={25} aria-hidden="true" /><p className="text-sm leading-7">{t('school.notReady')}</p></div> : signedIn && !create ? <div className="space-y-4"><p className="text-sm leading-7">{t('school.noMembership')}</p><Action onClick={() => setCreate(true)}>{t('school.createSchool')}</Action><Action secondary onClick={onReady}>{t('school.refresh')}</Action></div> : <form key={signedIn ? 'school' : register ? 'register' : 'login'} onSubmit={submit} className="space-y-4">
        {signedIn ? <><p className="text-sm leading-7">{t('school.ownerSetup')}</p><Field label={t('school.schoolName')}><input name="schoolName" className="school-input" required maxLength={100} /></Field><Field label={t('school.displayName')}><input name="displayName" className="school-input" required maxLength={100} /></Field><Field label={t('school.notice')}><textarea name="notice" className="school-input" required minLength={10} maxLength={2000} rows={4} /></Field><label className="school-check"><input name="noticeAcknowledged" type="checkbox" required />{t('school.noticeAck')}</label></> : <><Field label={t('school.email')}><input name="email" type="email" className="school-input" required maxLength={254} autoComplete="email" dir="ltr" /></Field><Field label={t('school.password')}><input name="password" type="password" className="school-input" required minLength={12} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} dir="ltr" /></Field></>}
        {error && <p role="alert" className="school-error">{error}</p>}{message && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">{message}</p>}
        <button type="submit" disabled={busy} className="school-button w-full">{t(busy ? 'school.loading' : signedIn ? 'school.createSchool' : register ? 'school.register' : 'school.login')}</button>{!signedIn && <button type="button" disabled={busy} className="school-button-secondary w-full" onClick={() => { setRegister(v => !v); setError(''); }}>{t(register ? 'school.login' : 'school.register')}</button>}
      </form>}
    </Panel>
  </div>;
}
