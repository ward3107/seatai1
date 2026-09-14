import ErrorBoundary from '../components/ErrorBoundary';
import RotationPanel from '../features/rotation/RotationPanel';
import ArrangementsPanel from '../features/arrangements/ArrangementsPanel';
import ProjectManager from '../features/projects/ProjectManager';
import SettingsPanel from '../features/settings/SettingsPanel';

/** Loaded on the first opening of the sidebar's advanced group. */
export default function AdvancedPanels() {
  return (
    <div className="space-y-3 pt-1" data-testid="advanced-panels">
      <ErrorBoundary name="Rotation Planner" inline><RotationPanel /></ErrorBoundary>
      <ErrorBoundary name="Saved Arrangements" inline><ArrangementsPanel /></ErrorBoundary>
      <ErrorBoundary name="Projects" inline><ProjectManager /></ErrorBoundary>
      <ErrorBoundary name="Settings" inline><SettingsPanel /></ErrorBoundary>
    </div>
  );
}
