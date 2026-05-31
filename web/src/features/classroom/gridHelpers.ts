import { generateSlots, type LayoutDef } from '../../core/layouts';
import type { Seat } from '../../types';

/** Cheap empty rectangular grid for the plain `rows` layout. */
export function createEmptyGrid(rows: number, cols: number): Seat[] {
  const seats: Seat[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      seats.push({
        position: { row, col, is_front_row: row === 0, is_near_teacher: row < 2 },
        student_id: undefined,
        is_empty: true,
      });
    }
  }
  return seats;
}

/**
 * Build an empty seat list from any LayoutDef, so non-grid layouts still
 * show the room shape before optimization runs. Each seat carries the
 * slot's normalized (x,y) so the absolute renderer can place them.
 */
export function emptySeatsFromLayout(def: LayoutDef): Seat[] {
  return generateSlots(def).map((slot) => ({
    position: {
      row: slot.row,
      col: slot.col,
      is_front_row: slot.isFront,
      is_near_teacher: slot.isFront,
      x: slot.x,
      y: slot.y,
    },
    student_id: undefined,
    is_empty: true,
  }));
}

/** Group a row's seats into 2-seat desk units (for the "pairs" view). */
export function groupIntoDesks(rowSeats: Seat[]): Seat[][] {
  const sorted = [...rowSeats].sort((a, b) => a.position.col - b.position.col);
  const desks: Seat[][] = [];
  for (let i = 0; i < sorted.length; i += 2) {
    desks.push(sorted.slice(i, i + 2));
  }
  return desks;
}
