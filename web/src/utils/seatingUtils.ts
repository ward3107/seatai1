import type { Student, OptimizationResult, Seat } from '../types';
import type { HeatMapMode } from '../core/store';
import { generateSlots, type LayoutDef } from '../core/layouts';

/**
 * Returns the set of seat keys ("row-col") that have active constraint violations.
 * A violation is:
 *   - A student who requires the front row but is not in row 0
 *   - A student who has mobility issues but is not in row 0
 *   - A student seated adjacent to an incompatible student
 *
 * Adjacency: when `layoutDef` is supplied the exact same `slot.neighbors`
 * the optimizer scored against are used, so the violation highlighting always
 * agrees with the algorithm — including pod-based (clusters) and
 * distance-based (u-shape, custom-rows) neighbourhoods where reconstructing
 * grid offsets would be wrong. Without `layoutDef` it falls back to a grid /
 * ring heuristic (grid ±1, or ring neighbours for the circle layout).
 * Candidate positions are validated against the seats that actually exist
 * in the result's layout — never against assumed rows×cols grid bounds.
 */
export function getViolations(
  result: OptimizationResult,
  students: Student[],
  layoutDef?: LayoutDef
): Set<string> {
  const violations = new Set<string>();
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const seats = result.layout.seats;

  // Preferred path: derive neighbours from the very slots the optimizer used.
  // `buildLayout` maps `this.slots` 1:1 to `seats`, so seats[i] shares
  // slot i's neighbour indices. Generate once (not twice) and reuse.
  let neighboursOf: (i: number) => Seat[];
  const generated = layoutDef ? generateSlots(layoutDef) : null;
  const slots = generated && generated.length === seats.length ? generated : null;

  if (slots) {
    neighboursOf = (i) => slots[i].neighbors.map((n) => seats[n]).filter(Boolean);
  } else {
    // Fallback heuristic (no layout def, or a mismatched seat count).
    const seatAt = new Map<string, Seat>();
    for (const seat of seats) seatAt.set(`${seat.position.row}-${seat.position.col}`, seat);
    const isCircle = result.layout.layout_type === 'circle';
    const seatAtRingIndex = new Map<number, Seat>();
    if (isCircle) for (const seat of seats) seatAtRingIndex.set(seat.position.col, seat);
    const ringSize = seats.length;
    neighboursOf = (i) => {
      const seat = seats[i];
      const cands: (Seat | undefined)[] = isCircle
        ? [
            seatAtRingIndex.get((seat.position.col - 1 + ringSize) % ringSize),
            seatAtRingIndex.get((seat.position.col + 1) % ringSize),
          ]
        : [
            seatAt.get(`${seat.position.row}-${seat.position.col - 1}`),
            seatAt.get(`${seat.position.row}-${seat.position.col + 1}`),
            seatAt.get(`${seat.position.row - 1}-${seat.position.col}`),
            seatAt.get(`${seat.position.row + 1}-${seat.position.col}`),
          ];
      return cands.filter((s): s is Seat => !!s);
    };
  }

  for (let i = 0; i < seats.length; i++) {
    const seat = seats[i];
    if (!seat.student_id) continue;
    const student = studentMap.get(seat.student_id);
    if (!student) continue;

    const seatKey = `${seat.position.row}-${seat.position.col}`;

    // Front-row / mobility violation. Use the layout's real front flag when we
    // have the slots (the front row isn't always row 0 — e.g. a large circle's
    // front seats sit at row ≥ 1); fall back to row 0 only without a layout.
    const atFront = slots ? slots[i].isFront : seat.position.row === 0;
    if ((student.requires_front_row || student.has_mobility_issues) && !atFront) {
      violations.add(seatKey);
    }

    // Incompatible adjacency
    for (const neighbour of neighboursOf(i)) {
      if (!neighbour.student_id || neighbour === seat) continue;
      if (student.incompatible_ids.includes(neighbour.student_id)) {
        violations.add(seatKey);
        violations.add(`${neighbour.position.row}-${neighbour.position.col}`);
      }
    }
  }

  return violations;
}

/**
 * Returns Tailwind bg + border colour classes for a seat based on the
 * active heat-map mode and whether the seat has a violation.
 */
export function getHeatMapColor(
  mode: HeatMapMode,
  student: Student | null | undefined,
  isViolated: boolean
): string {
  if (!student) return '';

  switch (mode) {
    case 'academic': {
      const s = student.academic_score;
      if (s >= 85) return 'bg-emerald-100 border-emerald-400';
      if (s >= 70) return 'bg-green-100 border-green-400';
      if (s >= 55) return 'bg-yellow-100 border-yellow-400';
      if (s >= 40) return 'bg-orange-100 border-orange-400';
      return 'bg-red-100 border-red-400';
    }
    case 'behavior': {
      const s = student.behavior_score;
      if (s >= 85) return 'bg-emerald-100 border-emerald-400';
      if (s >= 70) return 'bg-green-100 border-green-400';
      if (s >= 55) return 'bg-yellow-100 border-yellow-400';
      if (s >= 40) return 'bg-orange-100 border-orange-400';
      return 'bg-red-100 border-red-400';
    }
    case 'gender': {
      if (student.gender === 'male') return 'bg-blue-100 border-blue-400';
      if (student.gender === 'female') return 'bg-pink-100 border-pink-400';
      return 'bg-purple-100 border-purple-400';
    }
    case 'conflicts': {
      return isViolated
        ? 'bg-red-100 border-red-400'
        : 'bg-emerald-50 border-emerald-300';
    }
    default:
      return '';
  }
}

/**
 * Builds a map of studentId → seatKey for all occupied seats.
 */
export function buildStudentToSeatMap(result: OptimizationResult): Map<string, string> {
  const map = new Map<string, string>();
  for (const seat of result.layout.seats) {
    if (seat.student_id) {
      map.set(seat.student_id, `${seat.position.row}-${seat.position.col}`);
    }
  }
  return map;
}

/**
 * The optimizer's `fitness_score` is an unbounded sum of per-seat scores —
 * it can easily exceed 100 for a normal classroom, so showing it as a
 * percentage produced absurd values (e.g. "Score: 8500%"). For the
 * user-facing headline we instead compute the unweighted average of the
 * four normalized objective scores, which are each guaranteed to be in
 * the [0, 100] range. Result is rounded to 1 decimal.
 */
export function getDisplayScorePct(result: OptimizationResult): number {
  const o = result.objective_scores;
  const avg =
    (o.academic_balance + o.behavioral_balance + o.diversity + o.special_needs) / 4;
  return Math.round(avg * 10) / 10;
}
