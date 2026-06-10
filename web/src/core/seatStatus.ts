import { generateSlots, type LayoutDef } from './layouts';
import type { OptimizationResult, SeatingConstraints, Student } from '../types';

/**
 * Per-seat constraint satisfaction for the *current* arrangement (after the
 * optimiser ran and after any manual drag/swap edits). This is the live
 * "is this seat happy?" signal behind the green ✓ / red ⚠ seat badges and
 * the drop-target tinting while dragging.
 *
 * Unlike `getViolations` (which only knows front-row + incompatible
 * adjacency), this evaluates the full set of teacher rules and walks the
 * layout's real neighbour graph, so it's correct for clusters / U-shape /
 * circle as well as plain rows. Pure and deterministic.
 */

export interface SeatStatus {
  violated: boolean;
  /** i18n keys (+ params) describing each broken rule, for tooltips. */
  reasons: { key: string; params?: Record<string, string | number> }[];
}

const seatKeyOf = (row: number, col: number) => `${row}-${col}`;

export function getConstraintStatus(
  result: OptimizationResult,
  students: Student[],
  constraints: SeatingConstraints,
  layoutDef: LayoutDef,
): Map<string, SeatStatus> {
  const status = new Map<string, SeatStatus>();
  const byId = new Map(students.map((s) => [s.id, s]));
  const nm = (id: string) => byId.get(id)?.name ?? id;

  // Map "row-col" → studentId from the rendered seats.
  const occupant = new Map<string, string>();
  for (const seat of result.layout.seats) {
    if (seat.student_id) {
      occupant.set(seatKeyOf(seat.position.row, seat.position.col), seat.student_id);
    }
  }

  // Walk the layout slots so adjacency uses the same neighbour graph the
  // optimiser used. Each slot → the student sitting in it (if any).
  const slots = generateSlots(layoutDef);
  const studentAtSlot: (string | undefined)[] = slots.map(
    (s) => occupant.get(seatKeyOf(s.row, s.col)),
  );
  const slotOfStudent = new Map<string, number>();
  studentAtSlot.forEach((sid, idx) => {
    if (sid) slotOfStudent.set(sid, idx);
  });

  const ensure = (key: string): SeatStatus => {
    let s = status.get(key);
    if (!s) {
      s = { violated: false, reasons: [] };
      status.set(key, s);
    }
    return s;
  };
  const flag = (
    row: number,
    col: number,
    key: string,
    params?: Record<string, string | number>,
  ) => {
    const s = ensure(seatKeyOf(row, col));
    s.violated = true;
    s.reasons.push({ key, params });
  };

  const areAdjacent = (slotA: number, slotB: number) =>
    slots[slotA]?.neighbors.includes(slotB) ?? false;

  // Seed every occupied seat as OK so the badge renders ✓ where clean.
  for (const slot of slots) {
    const sid = studentAtSlot[slot.index];
    if (sid) ensure(seatKeyOf(slot.row, slot.col));
  }

  // Per-student positional rules (front-row, mobility, back/front, aisle).
  for (const slot of slots) {
    const sid = studentAtSlot[slot.index];
    if (!sid) continue;
    const student = byId.get(sid);
    if (!student) {
      // Stale assignment: the seat references a student who is no longer
      // on the roster (e.g. removed after the arrangement was computed).
      flag(slot.row, slot.col, 'seatstatus.student_not_found', { id: sid });
      continue;
    }

    if ((student.requires_front_row || student.has_mobility_issues) && !slot.isFront) {
      flag(slot.row, slot.col, 'seatstatus.needs_front', { name: student.name });
    }
  }

  // Incompatible adjacency (symmetric) using the neighbour graph.
  for (const slot of slots) {
    const sid = studentAtSlot[slot.index];
    if (!sid) continue;
    const student = byId.get(sid);
    if (!student?.incompatible_ids.length) continue;
    for (const nIdx of slot.neighbors) {
      const nid = studentAtSlot[nIdx];
      if (nid && student.incompatible_ids.includes(nid)) {
        // Flag both seats — the rule is mutual even if only one student
        // lists the other as incompatible.
        flag(slot.row, slot.col, 'seatstatus.incompatible_near', {
          name: student.name,
          other: nm(nid),
        });
        const nb = slots[nIdx];
        flag(nb.row, nb.col, 'seatstatus.incompatible_near', {
          name: nm(nid),
          other: student.name,
        });
      }
    }
  }

  // Pair rule: keep-apart but seated adjacent.
  for (const [a, b] of constraints.separate_pairs ?? []) {
    const sa = slotOfStudent.get(a);
    const sb = slotOfStudent.get(b);
    if (sa === undefined || sb === undefined) continue;
    if (areAdjacent(sa, sb)) {
      flag(slots[sa].row, slots[sa].col, 'seatstatus.apart_violated', { a: nm(a), b: nm(b) });
      flag(slots[sb].row, slots[sb].col, 'seatstatus.apart_violated', { a: nm(a), b: nm(b) });
    }
  }

  // Pair rule: keep-together but NOT seated adjacent.
  for (const [a, b] of constraints.keep_together_pairs ?? []) {
    const sa = slotOfStudent.get(a);
    const sb = slotOfStudent.get(b);
    if (sa === undefined || sb === undefined) continue;
    if (!areAdjacent(sa, sb)) {
      flag(slots[sa].row, slots[sa].col, 'seatstatus.together_violated', { a: nm(a), b: nm(b) });
      flag(slots[sb].row, slots[sb].col, 'seatstatus.together_violated', { a: nm(a), b: nm(b) });
    }
  }

  // Mentor → mentee must be adjacent.
  for (const [mentor, mentee] of constraints.peer_mentor_pairs ?? []) {
    const sa = slotOfStudent.get(mentor);
    const sb = slotOfStudent.get(mentee);
    if (sa === undefined || sb === undefined) continue;
    if (!areAdjacent(sa, sb)) {
      flag(slots[sa].row, slots[sa].col, 'seatstatus.mentor_violated', {
        mentor: nm(mentor),
        mentee: nm(mentee),
      });
      flag(slots[sb].row, slots[sb].col, 'seatstatus.mentor_violated', {
        mentor: nm(mentor),
        mentee: nm(mentee),
      });
    }
  }

  // Front/back row assignment rules.
  const maxRow = slots.reduce((m, s) => Math.max(m, s.row), 0);
  for (const id of constraints.front_row_ids ?? []) {
    const idx = slotOfStudent.get(id);
    if (idx === undefined) continue;
    if (!slots[idx].isFront) {
      flag(slots[idx].row, slots[idx].col, 'seatstatus.front_violated', { name: nm(id) });
    }
  }
  for (const id of constraints.back_row_ids ?? []) {
    const idx = slotOfStudent.get(id);
    if (idx === undefined) continue;
    const isBack = slots[idx].isBack || slots[idx].row === maxRow;
    if (!isBack) {
      flag(slots[idx].row, slots[idx].col, 'seatstatus.back_violated', { name: nm(id) });
    }
  }

  return status;
}
