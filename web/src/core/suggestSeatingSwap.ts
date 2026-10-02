import { reviewClassroom } from './classroomReview';
import type { LayoutDef } from './layouts';
import type { OptimizationResult, SeatingConstraints, Student } from '../types';

function requiredRequests(review: ReturnType<typeof reviewClassroom>) {
  return new Set(review.affected.flatMap((student) => student.reasons.filter((reason) => reason.required)
    .map((reason) => JSON.stringify([student.studentId, reason.key, reason.params]))));
}

/** A bounded, local suggestion: at most two seats move, locked seats stay put,
 * no new required violation is introduced and fewer students need review.
 * This is not a claim about overall academic/behavioral fitness. */
export function suggestSeatingSwap(result: OptimizationResult, students: Student[], constraints: SeatingConstraints, layout: LayoutDef, lockedSeats: string[]) {
  const before = reviewClassroom(result, students, constraints, layout);
  if (before.missing.length || !before.affected.length) return null;
  const requiredBefore = requiredRequests(before);
  const affectedIds = new Set(before.affected.map((s) => s.studentId));
  const key = (index: number) => {
    const p = result.layout.seats[index].position;
    return `${p.row}-${p.col}`;
  };
  let attempts = 0;
  const tried = new Set<string>();
  for (let a = 0; a < result.layout.seats.length; a++) {
    if (!affectedIds.has(result.layout.seats[a].student_id) || lockedSeats.includes(key(a))) continue;
    for (let b = 0; b < result.layout.seats.length; b++) {
      if (a === b || lockedSeats.includes(key(b))) continue;
      const pair = [a, b].sort((x, y) => x - y).join('-');
      if (tried.has(pair)) continue;
      tried.add(pair);
      if (++attempts > 1000) return null;
      const seats = result.layout.seats.map((seat) => ({ ...seat }));
      [seats[a].student_id, seats[b].student_id] = [seats[b].student_id, seats[a].student_id];
      seats[a].is_empty = !seats[a].student_id;
      seats[b].is_empty = !seats[b].student_id;
      const after = reviewClassroom({ ...result, layout: { ...result.layout, seats } }, students, constraints, layout);
      if (after.affected.length >= before.affected.length) continue;
      if ([...requiredRequests(after)].some((request) => !requiredBefore.has(request))) continue;
      return { seatA: key(a), seatB: key(b), studentA: result.layout.seats[a].student_id,
        studentB: result.layout.seats[b].student_id, before: before.affected.length, after: after.affected.length };
    }
  }
  return null;
}
