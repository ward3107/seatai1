import { useEffect } from 'react';
import { useStore } from '../core/store';

/**
 * Registers Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z keyboard shortcuts
 * for undo and redo on the seating map.
 * Mount this once inside ClassroomGrid.
 */
export function useSeatingHistory() {
  const { undo, redo } = useStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing inside an input / textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);
}
