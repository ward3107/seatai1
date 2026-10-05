import { useEffect, type RefObject } from 'react';
import type { Seat } from '../../types';

interface Options {
  seats: Seat[];
  isDragging?: boolean;
  selectedSeatKey: string | null;
  setSelectedSeat: (key: string | null) => void;
  setDetailsTarget: (id: string | null) => void;
  gridContainerRef: RefObject<HTMLDivElement>;
  lockedSeats: string[];
  toggleLockSeat: (seatKey: string) => void;
  announceLockChange: (seatKey: string, nowLocked: boolean) => void;
}

/** Arrows move DOM focus inside the map while preserving the chosen source.
 * Native Space/Enter selects or moves; L locks the focused seat; Escape clears
 * selection. Shortcuts do not act on forms, dialogs or an active pointer drag. */
export function useGridKeyboardNav({
  seats,
  isDragging = false,
  selectedSeatKey,
  setSelectedSeat,
  setDetailsTarget,
  gridContainerRef,
  lockedSeats,
  toggleLockSeat,
  announceLockChange,
}: Options) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isDragging || e.defaultPrevented) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      // Classroom shortcuts must never hijack a dialog or the setup forms.
      if (target?.closest('[role="dialog"]')) return;
      if (gridContainerRef.current && (!target || !gridContainerRef.current.contains(target))) return;
      const focusedKey = target?.closest('[data-seat-key]')?.getAttribute('data-seat-key');
      const currentKey = focusedKey ?? selectedSeatKey;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) return;

      // L: lock / unlock the selected occupied seat.
      if (e.key === 'l' || e.key === 'L') {
        if (!currentKey) return;
        const seat = seats.find(
          (s) => `${s.position.row}-${s.position.col}` === currentKey,
        );
        if (!seat?.student_id) return; // locking an empty seat has no effect
        e.preventDefault();
        const nowLocked = !lockedSeats.includes(currentKey);
        toggleLockSeat(currentKey);
        announceLockChange(currentKey, nowLocked);
        return;
      }

      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(e.key)) return;

      if (e.key === 'Escape') {
        if (selectedSeatKey) {
          e.preventDefault();
          setSelectedSeat(null);
        }
        return;
      }

      if (!currentKey && !seats.some(seat => !!seat.student_id)) return;

      // Find current row/col, or default to (0,0).
      let row = 0, col = 0;
      if (currentKey) {
        const [r, c] = currentKey.split('-').map(Number);
        row = r;
        col = c;
      }

      if (e.key === 'Enter' && focusedKey) return; // native button selects/drops
      if (e.key === 'Enter') {
        const seat = seats.find(
          (s) => s.position.row === row && s.position.col === col,
        );
        if (seat?.student_id) {
          e.preventDefault();
          setDetailsTarget(seat.student_id);
        }
        return;
      }

      // Arrow keys: find the closest seat in the requested
      // direction. Works for rectangular AND non-grid layouts because
      // we search by candidates that exist in `seats`.
      const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      if (dr === 0 && dc === 0) return;

      e.preventDefault();

      // Start from current position and walk until we find an existing
      // seat or run out of rows/cols (3 attempts is enough for normal
      // grids; for irregular layouts we try harder).
      let nextSeat: Seat | undefined = !currentKey
        ? seats.find((seat) => !!seat.student_id)
        : undefined;
      for (let step = 1; step < 20 && !nextSeat; step++) {
        nextSeat = seats.find(
          (s) =>
            s.position.row === row + dr * step &&
            s.position.col === col + dc * step,
        );
      }
      // Fallback: if no seat in that exact line (common in non-grid
      // layouts), jump to the seat with the closest row/col in that
      // half-plane.
      if (!nextSeat) {
        const candidates = seats.filter((s) => (
          dr !== 0
            ? Math.sign(s.position.row - row) === dr
            : Math.sign(s.position.col - col) === dc),
        );
        if (candidates.length > 0) {
          nextSeat = candidates.reduce((closest, s) => {
            const d = Math.hypot(
              s.position.row - row,
              s.position.col - col,
            );
            const dCl = Math.hypot(
              closest.position.row - row,
              closest.position.col - col,
            );
            return d < dCl ? s : closest;
          });
        }
      }

      if (nextSeat) {
        const nextKey = `${nextSeat.position.row}-${nextSeat.position.col}`;
        if (!gridContainerRef.current) setSelectedSeat(nextKey);
        // Move real DOM focus to the seat's button so screen readers
        // announce the selection change (the buttons always exist; only
        // the selection state changed, so we can focus synchronously).
        const el = gridContainerRef.current?.querySelector<HTMLElement>(
          `[data-seat-key="${nextKey}"]`,
        );
        el?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDragging, selectedSeatKey, seats, setSelectedSeat, setDetailsTarget, gridContainerRef, lockedSeats, toggleLockSeat, announceLockChange]);
}
