import { useEffect, useRef } from 'react';

/**
 * Focus management for modal dialogs:
 * - On open: focus the dialog (or a specific child) so screen readers
 *   announce it and keyboard users land inside.
 * - While open: trap Tab navigation so focus can't escape behind the
 *   backdrop.
 * - On close: restore focus to whatever was focused before the modal
 *   opened (typically the trigger button).
 *
 * Apply to a container element that wraps the modal content. The hook
 * is no-op when `open` is false.
 */
export function useFocusTrap<T extends HTMLElement>(open: boolean) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the container itself if nothing inside is auto-focusable;
    // making the container `tabIndex=-1` lets it accept focus without
    // joining the tab order.
    const focusables = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('inert') && el.offsetParent !== null);

    const first = focusables()[0];
    (first ?? container).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      // Restore focus to whatever was focused before the modal opened.
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return containerRef;
}
