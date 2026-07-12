import { useEffect, type RefObject } from 'react';
import type { Seat } from '../../types';

interface Options {
  seats: Seat[];
  selectedSeatKey: string | null;
  setSelectedSeat: (key: string | null) => void;
  setDetailsTarget: (id: string | null) => void;
  gridContainerRef: RefObject<HTMLDivElement>;
  /** Current locked seat keys — read to decide the new state when toggling. */
  lockedSeats: string[];
  /** Toggle the lock on a seat ("row-col"). */
  toggleLockSeat: (seatKey: string) => void;
  /** Announce a lock change to assistive tech (nowLocked = the resulting state). */
  announceLockChange: (seatKey: string, nowLocked: boolean) => void;
}

/**
 * Grid-wide keyboard navigation.
 *
 * Arrow keys move the selected seat (or pick the top-left seat if
 * nothing is selected yet). Enter opens the detail drawer for the
 * student in the selected seat. `L` locks/unlocks the selected occupied
 * seat (the only lock affordance was previously mouse-right-click / touch
 * long-press). Escape clears the selection. Disabled when focus is in a
 * text input so we don't fight typing.
 *
 * When the selection moves, real DOM focus follows it onto the seat's
 * button (via its data-seat-key attribute) so screen readers announce
 * the newly selected seat.
 */
export function useGridKeyboardNav({
  seats,
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
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) return;

      // L: lock / unlock the selected occupied seat.
      if (e.key === 'l' || e.key === 'L') {
        if (!selectedSeatKey) return;
        const seat = seats.find(
          (s) => `${s.position.row}-${s.position.col}` === selectedSeatKey,
        );
        if (!seat?.student_id) return; // locking an empty seat has no effect
        e.preventDefault();
        const nowLocked = !lockedSeats.includes(selectedSeatKey);
        toggleLockSeat(selectedSeatKey);
        announceLockChange(selectedSeatKey, nowLocked);
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

      // Find current row/col, or default to (0,0).
      let row = 0, col = 0;
      if (selectedSeatKey) {
        const [r, c] = selectedSeatKey.split('-').map(Number);
        row = r;
        col = c;
      }

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

      // Arrow keys: find the closest occupied seat in the requested
      // direction. Works for rectangular AND non-grid layouts because
      // we search by candidates that exist in `seats`.
      const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      if (dr === 0 && dc === 0) return;

      e.preventDefault();

      // Start from current position and walk until we find an existing
      // seat or run out of rows/cols (3 attempts is enough for normal
      // grids; for irregular layouts we try harder).
      let nextSeat: Seat | undefined;
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
        const candidates = seats.filter((s) =>
          dr !== 0
            ? Math.sign(s.position.row - row) === dr
            : Math.sign(s.position.col - col) === dc,
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
        setSelectedSeat(nextKey);
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
  }, [selectedSeatKey, seats, setSelectedSeat, setDetailsTarget, gridContainerRef, lockedSeats, toggleLockSeat, announceLockChange]);
}
