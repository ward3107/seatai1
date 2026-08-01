/**
 * Trigger a browser download of the current app state as a backup JSON.
 *
 * Shared between the ProjectManager panel (its "Backup" button) and the
 * BackupReminderBanner. Both must call this exact function so the reminder's
 * change-counter reset stays in sync with what the panel does — otherwise
 * the banner would linger after the user clicks its own Download button.
 *
 * Side effects:
 *   - Reads a fresh snapshot from the store (not from stale hook values)
 *   - Downloads a `seatai-backup-YYYY-MM-DD.json` file
 *   - Calls `markBackedUp()` so the reminder banner hides and the counter
 *     resets
 */
import { useStore } from '../../core/store';
import { buildBackup } from './backup';

export function downloadBackup(): void {
  const s = useStore.getState();
  const file = buildBackup({
    students: s.students,
    rows: s.rows,
    cols: s.cols,
    layoutDef: s.layoutDef,
    weights: s.weights,
    config: s.config,
    constraints: s.constraints,
    avoidRecentNeighbors: s.avoidRecentNeighbors,
    projects: s.projects,
    currentProjectId: s.currentProjectId,
    result: s.result,
    resultHistory: s.resultHistory,
    rotationPlan: s.rotationPlan,
    savedArrangements: s.savedArrangements,
    questionnaire: s.questionnaire,
    uiLanguage: s.uiLanguage,
    uiScale: s.uiScale,
    theme: s.theme,
    aiSettings: { enabled: s.aiSettings.enabled, model: s.aiSettings.model },
  });
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seatai-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  s.markBackedUp();
}
