import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { flushPendingWrites } from '../core/db';
import { useLanguage } from '../hooks/useLanguage';
import { useStore } from '../core/store';

/** Open tabs keep their loaded React code after deployment. Offer a safe
 * refresh instead of silently leaving the teacher on an older interface. */
export default function AppUpdateBanner() {
  const { t } = useLanguage();
  const wizardActive = useStore(s => s.wizardActive);
  const isOptimizing = useStore(s => s.isOptimizing);
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const [updating, setUpdating] = useState(false);
  const [failed, setFailed] = useState(false);
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, value) { registration.current = value; },
  });
  useEffect(() => {
    const check = () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        void registration.current?.update().catch(() => { /* Offline use remains available. */ });
      }
    };
    const timer = window.setInterval(check, 60_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  if (!needRefresh || wizardActive) return null;
  return <div role="status" data-testid="app-update-banner" className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-900 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-100">
    <p>{t(failed ? 'appUpdate.failed' : 'appUpdate.available')}</p>
    <button type="button" disabled={updating || isOptimizing} className="min-h-11 rounded-lg bg-primary-700 px-3 font-medium text-white disabled:opacity-60" onClick={async () => {
      setUpdating(true); setFailed(false);
      try {
        await flushPendingWrites();
        await updateServiceWorker(true);
      } catch {
        setFailed(true); setUpdating(false);
      }
    }}>{t(updating ? 'appUpdate.updating' : 'appUpdate.refresh')}</button>
  </div>;
}
