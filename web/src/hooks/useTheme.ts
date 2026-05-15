import { useEffect } from 'react';
import { useStore } from '../core/store';

/**
 * Applies the active color theme to the document root.
 *
 * Adds/removes the `dark` class on `<html>` based on the store's
 * `theme` setting:
 *   - 'light'  → never dark
 *   - 'dark'   → always dark
 *   - 'system' → follows `prefers-color-scheme: dark` and updates
 *                live when the OS toggles.
 *
 * The Tailwind config is class-based (see `darkMode: 'class'`), so
 * every `dark:*` variant in the codebase keys off this class.
 */
export function useTheme() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
      root.classList.toggle('dark', isDark);
    };

    apply();

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    return undefined;
  }, [theme]);
}
