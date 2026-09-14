import { renderHook, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useGridKeyboardNav } from './useGridKeyboardNav';
import type { Seat } from '../../types';

const seats: Seat[] = [0, 1, 2].map(col => ({
  position: { row: 0, col, is_front_row: true, is_near_teacher: true },
  student_id: col === 1 ? undefined : `student-${col}`,
  is_empty: col === 1,
}));
function setup(selectedSeatKey: string | null, roster = seats) {
  const setSelectedSeat = vi.fn();
  const hook = renderHook(() => useGridKeyboardNav({
    seats: roster, selectedSeatKey, setSelectedSeat,
    setDetailsTarget: vi.fn(), gridContainerRef: { current: null },
    lockedSeats: [], toggleLockSeat: vi.fn(), announceLockChange: vi.fn(),
  }));
  return { ...hook, setSelectedSeat };
}
describe('occupied seat keyboard navigation', () => {
  it('starts at an occupied seat when nothing is selected', () => {
    const { setSelectedSeat, unmount } = setup(null);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(setSelectedSeat).toHaveBeenCalledWith('0-0');
    unmount();
  });
  it('skips empty seats between students', () => {
    const { setSelectedSeat, unmount } = setup('0-0');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(setSelectedSeat).toHaveBeenCalledWith('0-2');
    unmount();
  });
  it('does not select an empty classroom', () => {
    const { setSelectedSeat, unmount } = setup(null, seats.map(s => ({ ...s, student_id: undefined, is_empty: true })));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(setSelectedSeat).not.toHaveBeenCalled();
    unmount();
  });
});
