import { generateSlots, type LayoutDef } from '../core/layouts';
import type { ClassroomLayout } from '../types';

/**
 * Turn the teacher's locked seats into optimizer pins. A lock means "the
 * student currently sitting here stays here"; we resolve each locked seat
 * key ("row-col") to its slot index in the current layout and the student
 * the previous result placed there. Locked-but-empty seats yield no pin.
 */
export function buildPinned(
  lockedSeats: string[],
  result: { layout: ClassroomLayout } | null,
  layoutDef: LayoutDef,
): [number, string][] {
  if (!result || lockedSeats.length === 0) return [];
  const slotIndexByPos = new Map<string, number>();
  for (const slot of generateSlots(layoutDef)) {
    slotIndexByPos.set(`${slot.row}-${slot.col}`, slot.index);
  }
  const studentByPos = new Map<string, string>();
  for (const seat of result.layout.seats) {
    if (seat.student_id) {
      studentByPos.set(`${seat.position.row}-${seat.position.col}`, seat.student_id);
    }
  }
  const pins: [number, string][] = [];
  for (const key of lockedSeats) {
    const slotIdx = slotIndexByPos.get(key);
    const sid = studentByPos.get(key);
    if (slotIdx !== undefined && sid) pins.push([slotIdx, sid]);
  }
  return pins;
}

