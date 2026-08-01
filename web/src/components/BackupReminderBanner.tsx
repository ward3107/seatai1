import { DownloadCloud, X } from 'lucide-react';
import { useStore } from '../core/store';
import { useLanguage } from '../hooks/useLanguage';
import { downloadBackup } from '../features/projects/downloadBackup';

/**
 * Threshold of "meaningful changes since last backup" that fires the banner.
 * Chosen empirically: a teacher who has made 20 edits (added students, run a
 * few optimizations, saved an arrangement) has enough state that losing it
 * to a cleared browser cache would sting, but not so few that we nag them on
 * a first-day pilot.
 *
 * If we ever add UI to tune this, expose it here — do NOT make it a per-user
 * store field, because "how noisy should the reminder be" is not something a
 * teacher opens the app to configure.
 */
const REMINDER_THRESHOLD = 20;

function isSnoozed(snoozedUntil: string | null): boolean {
  if (!snoozedUntil) return false;
  const t = Date.parse(snoozedUntil);
  if (Number.isNaN(t)) return false;
  return Date.now() < t;
}

export default function BackupReminderBanner() {
  const changesSinceBackup = useStore((s) => s.changesSinceBackup);
  const snoozedUntil = useStore((s) => s.backupReminderSnoozedUntil);
  const lastBackupAt = useStore((s) => s.lastBackupAt);
  const snooze = useStore((s) => s.snoozeBackupReminder);
  const { t } = useLanguage();

  if (changesSinceBackup < REMINDER_THRESHOLD) return null;
  if (isSnoozed(snoozedUntil)) return null;

  const messageKey = lastBackupAt
    ? 'backup_reminder.message_since_last'
    : 'backup_reminder.message_never';

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 text-sm text-amber-900 dark:text-amber-100"
    >
      <p className="flex-1 min-w-[240px]">
        {t(messageKey, { count: String(changesSinceBackup) })}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => downloadBackup()}
          className="inline-flex items-center gap-1 rounded-md bg-amber-600 text-white px-3 py-1 text-xs font-medium hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <DownloadCloud size={14} aria-hidden="true" />
          {t('backup_reminder.download_now')}
        </button>
        <button
          type="button"
          onClick={() => snooze(24)}
          className="inline-flex items-center gap-1 rounded-md border border-amber-400 dark:border-amber-700 px-2 py-1 text-xs hover:bg-amber-100 dark:hover:bg-amber-900/40 focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label={t('backup_reminder.later_aria')}
        >
          <X size={14} aria-hidden="true" />
          {t('backup_reminder.later')}
        </button>
      </div>
    </div>
  );
}
