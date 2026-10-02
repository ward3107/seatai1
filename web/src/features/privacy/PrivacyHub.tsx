import { useEffect, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { eraseDeviceData } from '../../core/db';
import { closeDeviceSurveys } from '../questionnaire/closeDeviceSurveys';

export default function PrivacyHub({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const trap = useFocusTrap<HTMLDivElement>(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose,busy]);
  async function erase() {
    if (!window.confirm(t('privacyHub.eraseConfirm'))) return;
    setBusy(true); setFailed(false);
    try {
      await closeDeviceSurveys();
      await eraseDeviceData();
      location.reload();
    } catch { setFailed(true); setBusy(false); }
  }
  const contact = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL;
  const operator = import.meta.env.VITE_OPERATOR_NAME;
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
    <div ref={trap} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="privacy-title" className="max-h-[90dvh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 text-gray-800 shadow-xl dark:bg-gray-800 dark:text-gray-100">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="privacy-title" className="flex items-center gap-2 text-xl font-bold"><ShieldCheck aria-hidden="true" />{t('privacyHub.title')}</h2>
        <button disabled={busy} onClick={onClose} aria-label={t('common.close')} className="rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
      </div>
      <div className="space-y-5 text-sm leading-relaxed">
        {(['use','storage','sharing','rights','accessibility'] as const).map(section => <section key={section}>
          <h3 className="mb-1 font-bold">{t(`privacyHub.${section}Title`)}</h3>
          <p>{t(`privacyHub.${section}`)}</p>
        </section>)}
        <p>{operator ? `${operator} · ` : ''}{t('privacyHub.contact')} {typeof contact === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ? <a href={`mailto:${contact}`} className="underline">{contact}</a> : t('privacyHub.schoolContact')}</p>
        <section className="rounded-xl border border-rose-200 p-4 dark:border-rose-900">
          <h3 className="font-bold">{t('privacyHub.eraseTitle')}</h3>
          <p className="mt-2">{t('privacyHub.eraseHint')}</p>
          <button disabled={busy} onClick={() => void erase()} className="mt-3 min-h-11 rounded-lg border border-rose-600 px-4 py-2 text-rose-800 disabled:opacity-50 dark:text-rose-200">{t(busy ? 'privacyHub.erasing' : 'privacyHub.erase')}</button>
          {failed && <p role="alert" className="mt-2 text-rose-700 dark:text-rose-200">{t('privacyHub.eraseError')}</p>}
        </section>
      </div>
    </div>
  </div>, document.body);
}
