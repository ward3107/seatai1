import { getConstraintStatus } from './seatStatus';
import type { LayoutDef } from './layouts';
import type { HardRuleCategory, OptimizationResult, SeatingConstraints, Student } from '../types';

const categories: Record<string, HardRuleCategory> = {
  'seatstatus.apart_violated': 'separate_pairs',
  'seatstatus.together_violated': 'keep_together_pairs',
  'seatstatus.mentor_violated': 'peer_mentor_pairs',
  'seatstatus.front_violated': 'front_row_ids',
  'seatstatus.back_violated': 'back_row_ids',
  'seatstatus.aisle_violated': 'aisle_ids',
  'seatstatus.window_violated': 'near_window_ids',
};

/** Counts students needing attention, not rules (a pair affects two students).
 * Uses actual rendered seats so manual moves are reflected immediately. */
export function reviewClassroom(result: OptimizationResult, students: Student[], constraints: SeatingConstraints, layout: LayoutDef) {
  const status = getConstraintStatus(result, students, constraints, layout);
  const placed = new Set(result.layout.seats.map((seat) => seat.student_id).filter(Boolean));
  const missing = students.filter((student) => !placed.has(student.id));
  const affected = result.layout.seats.flatMap((seat) => {
    const reasons = status.get(`${seat.position.row}-${seat.position.col}`)?.reasons ?? [];
    if (!reasons.length) return [];
    const student = students.find((s) => s.id === seat.student_id);
    const unique = [...new Map(reasons.map((reason) => [JSON.stringify(reason), reason])).values()];
    return [{ studentId: student?.id, name: student?.name ?? seat.student_id ?? '', reasons: unique.map((reason) => ({
      ...reason,
      required: Boolean(categories[reason.key] && constraints.hard?.[categories[reason.key]]),
    })) }];
  });
  return { affected, missing, requiredStudents: affected.filter((student) => student.reasons.some((reason) => reason.required)).length };
}
