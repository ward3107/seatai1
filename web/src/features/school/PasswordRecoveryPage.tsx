import { useEffect, useRef, useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import LanguageSelector from '../../components/LanguageSelector';
import { schoolRequest, SchoolApiError } from './api';
import PasswordField from './PasswordField';
import { schoolError } from './AuthScreen';
import { Field } from './SchoolComponents';
import './school.css';

export default function PasswordRecoveryPage({ callback }: { callback: { code?: string; failed: boolean } | null }) {
  const { t } = useLanguage();
  useTheme();
  const [phase, setPhase] = useState<'checking' | 'mfa' | 'ready' | 'invalid' | 'unavailable' | 'done'>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const verification = useRef<Promise<{ mfaRequired?: boolean }>>();
  useEffect(() => {
    if (callback?.failed) { setPhase('invalid'); return; }
    // React StrictMode must not exchange a one-use code twice.
    verification.current ??= callback?.code ? schoolRequest('exchange_recovery', { code: callback.code }) : schoolRequest('recovery_status');
    let current = true;
    verification.current.then(result => { if (current) setPhase(result.mfaRequired ? 'mfa' : 'ready'); }).catch(e => {
      if (current) setPhase(e instanceof SchoolApiError && ['unauthorized', 'invalid_request'].includes(e.code) ? 'invalid' : 'unavailable');
    });
    return () => { current = false; };
  }, [callback]);
  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const code = new FormData(event.currentTarget).get('code');
    setBusy(true); setError('');
    try { await schoolRequest('recovery_verify', { code }); setPhase('ready'); }
    catch (e) { setError(schoolError(e, t)); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    if (values.get('password') !== values.get('confirmPassword')) { setError(t('school.passwordMismatch')); return; }
    setBusy(true); setError('');
    try {
      await schoolRequest('reset_password', { password: values.get('password') });
      form.reset(); setPhase('done');
    } catch (e) {
      if (e instanceof SchoolApiError && e.code === 'mfa_required') setPhase('mfa');
      else if (e instanceof SchoolApiError && e.code === 'unauthorized') setPhase('invalid');
      else setError(schoolError(e, t));
    } finally { setBusy(false); }
  }
  return <div className="school-shell">
    <header className="school-header"><a href="#home" className="font-bold">SeatAI</a><LanguageSelector /></header>
    <main className="school-main school-recovery-main">
      <section className="school-panel school-recovery-panel" aria-labelledby="recovery-title">
        <KeyRound size={28} aria-hidden="true" className="mb-4" />
        <h1 id="recovery-title" className="mb-4 text-2xl font-bold">{t('school.resetPassword')}</h1>
        {phase === 'checking' && <p role="status">{t('school.loading')}</p>}
        {(phase === 'invalid' || phase === 'unavailable') && <p role="alert" className="school-error mb-4">{t(phase === 'invalid' ? 'school.recoveryInvalid' : 'school.error_unavailable')}</p>}
        {phase === 'done' && <p role="status" className="mb-6 leading-7">{t('school.passwordChanged')}</p>}
        {phase === 'mfa' && <form onSubmit={verifyMfa} className="space-y-4">
          <p className="text-sm leading-7">{t('school.recoveryMfaHint')}</p>
          <Field label={t('school.mfaCode')}><input name="code" className="school-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required dir="ltr" /></Field>
          {error && <p role="alert" className="school-error">{error}</p>}
          <button type="submit" disabled={busy} className="school-button w-full">{t(busy ? 'school.loading' : 'school.mfaVerify')}</button>
        </form>}
        {phase === 'ready' && <form onSubmit={submit} className="space-y-4">
          <p className="text-sm leading-7">{t('school.newPasswordHint')}</p>
          <PasswordField label={t('school.newPassword')} autoComplete="new-password" />
          <PasswordField label={t('school.confirmPassword')} name="confirmPassword" autoComplete="new-password" />
          {error && <p role="alert" className="school-error">{error}</p>}
          <button type="submit" disabled={busy} className="school-button w-full">{t(busy ? 'school.loading' : 'school.savePassword')}</button>
        </form>}
        {phase !== 'checking' && <a href="#school" className="school-button-secondary mt-4 w-full">{t('school.backToLogin')}</a>}
      </section>
    </main>
  </div>;
}
