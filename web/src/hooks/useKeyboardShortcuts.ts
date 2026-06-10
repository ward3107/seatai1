import { useEffect } from 'react';

interface ShortcutDeps {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  canOptimize: boolean;
  optimize: () => void;
}

/**
 * Global keyboard shortcuts: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z or Ctrl+Y
 * (redo), Ctrl/Cmd+Enter (run optimization). Skips text fields so we don't
 * fight the browser's native undo on inputs.
 */
export function useKeyboardShortcuts({
  canUndo,
  canRedo,
  undo,
  redo,
  canOptimize,
  optimize,
}: ShortcutDeps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable;
      if (isEditable) return;

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (key === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          undo();
        }
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      } else if (key === 'enter') {
        if (canOptimize) {
          e.preventDefault();
          optimize();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUndo, canRedo, undo, redo, canOptimize, optimize]);
}
