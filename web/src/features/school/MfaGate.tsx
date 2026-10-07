import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { schoolRequest } from './api';
import { schoolError } from './AuthScreen';
import { Action, Field, Panel } from './SchoolComponents';

export default function MfaGate({ onReady }: { onReady: () => Promise<void> }) {
  const { t } = useLanguage();
  const [factor, setFactor] = useState<{ factorId: string; qrCode?: string; secret?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function setup() {
    setBusy(true); setError('');
    try { setFactor(await schoolRequest('mfa_setup')); }
    catch (e) { setError(schoolError(e, t)); } finally { setBusy(false); }
  }
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !factor) return;
    const code = String(new FormData(event.currentTarget).get('code') ?? '');
    setBusy(true); setError('');
    try { await schoolRequest('mfa_verify', { factorId: factor.factorId, code }); setFactor(null); await onReady(); }
    catch (e) { setError(schoolError(e, t)); } finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-lg"><Panel title={t('school.mfaTitle')} hint={t('school.mfaHint')}><ShieldCheck size={32} className="school-accent mb-5" aria-hidden="true" />
    {!factor ? <Action disabled={busy} onClick={() => void setup()}>{t('school.mfaStart')}</Action> : <form onSubmit={verify} className="space-y-4">
      {factor.qrCode && <><p className="text-sm leading-relaxed">{t('school.mfaScan')}</p><img width={220} height={220} className="mx-auto rounded-xl bg-white p-3" alt={t('school.mfaScan')} src={`data:image/svg+xml,${encodeURIComponent(factor.qrCode)}`} />{factor.secret && <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><summary className="cursor-pointer text-sm font-semibold">{t('school.mfaManual')}</summary><code dir="ltr" className="mt-3 block break-all text-center text-sm">{factor.secret}</code></details>}</>}
      <Field label={t('school.mfaCode')}><input name="code" className="school-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required dir="ltr" /></Field><button type="submit" disabled={busy} className="school-button w-full">{t('school.mfaVerify')}</button>
    </form>}{error && <p role="alert" className="school-error mt-4">{error}</p>}
  </Panel></div>;
}
